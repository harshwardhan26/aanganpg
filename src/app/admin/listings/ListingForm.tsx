/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { saveListing } from "@/actions/admin";
import { uploadImage, UPLOAD_CONFIGURED } from "@/lib/upload";
import { pgPublishIssues, GENDER_PREFERENCES, FOOD_TYPES, OCCUPANCY_TYPES, PG_SHOT_LIST, KOLHAPUR_LOCALITIES, PG_AMENITIES } from "@/lib/property-options";
import { looksLikeKolhapur } from "@/lib/maps";
import { MapPin, Crosshair } from "lucide-react";

export default function ListingForm({ 
  initialData, 
  colleges 
}: { 
  initialData?: any; 
  colleges: any[] 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    id: initialData?.id || "",
    title: initialData?.title || "",
    price: initialData?.price?.toString() || "",
    yearlyPrice: initialData?.yearlyPrice?.toString() || "",
    location: initialData?.location || "",
    landmark: initialData?.landmark || "",
    collegeId: initialData?.collegeId || "",
    walkMinutes: initialData?.walkMinutes?.toString() || "",
    genderPreference: initialData?.genderPreference || "",
    occupancyType: initialData?.occupancyType || "",
    deposit: initialData?.deposit?.toString() || "",
    vacantBeds: initialData?.vacantBeds?.toString() || "",
    amenities: initialData?.amenities || [],
    rules: initialData?.rules || [],
    foodType: initialData?.foodType || "",
    messNote: initialData?.messNote || "",
    wardenName: initialData?.wardenName || "",
    gateClosingTime: initialData?.gateClosingTime || "",
    ownerName: initialData?.ownerName || "",
    ownerPhone: initialData?.ownerPhone || "",
    description: initialData?.description || "",
    images: initialData?.images || [],
    lat: initialData?.lat?.toString() || "",
    lng: initialData?.lng?.toString() || "",
  });

  const [geoStatus, setGeoStatus] = useState<string>("");

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("Geolocation is not supported by your browser.");
      return;
    }
    setGeoStatus("Finding location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          lat: position.coords.latitude.toString(),
          lng: position.coords.longitude.toString()
        }));
        setGeoStatus("");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoStatus("Permission denied. Ensure location is allowed.");
        } else if (error.code === error.TIMEOUT) {
          setGeoStatus("Location request timed out.");
        } else {
          setGeoStatus("Failed to get location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePasteMapUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Extract @lat,lng from URL. Also catches raw "16.702, 74.234"
    const match = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || val.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/);
    if (match) {
      setFormData(prev => ({
        ...prev,
        lat: match[1],
        lng: match[2]
      }));
      e.target.value = ''; // clear input after successful paste
    }
  };

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [serverIssues, setServerIssues] = useState<string[]>([]);
  const [isRestored, setIsRestored] = useState(false);

  const storageKey = `aangan-admin-form-${initialData?.id || "new"}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.warn("Failed to restore form data", err);
    } finally {
      setIsRestored(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (isRestored) {
      localStorage.setItem(storageKey, JSON.stringify(formData));
    }
  }, [formData, isRestored, storageKey]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => {
      const current = prev.amenities || [];
      const updated = current.includes(amenity)
        ? current.filter((a: string) => a !== amenity)
        : [...current, amenity];
      return { ...prev, amenities: updated };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploadingImage(true);
    setError(null);
    const files = Array.from(e.target.files);
    e.target.value = '';
    
    const failed: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Uploading ${i + 1} of ${files.length}...`);
      try {
        const url = await uploadImage(files[i]);
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, { url, tag: null }]
        }));
      } catch {
        failed.push(files[i].name);
      }
    }

    if (failed.length > 0) {
      setError(`Failed to upload ${failed.length} image(s): ${failed.join(', ')}`);
    }
    setUploadProgress("");
    setUploadingImage(false);
  };

  const handleImageTag = (index: number, tag: string | null) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      newImages[index] = { ...newImages[index], tag };
      return { ...prev, images: newImages };
    });
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      newImages.splice(index, 1);
      return { ...prev, images: newImages };
    });
  };

  const hasBathroomPhoto = formData.images.some((img: any) => img.tag === "bathroom");
  const hasThaliPhoto = formData.images.some((img: any) => img.tag === "thali");

  const currentIssues = pgPublishIssues({
    ...formData,
    hasBathroomPhoto,
    hasThaliPhoto,
  });

  const handleSubmit = async (publish: boolean) => {
    if (publish && currentIssues.length > 0) {
      setError("Cannot publish. Fix the issues below.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // The server runs the same guard and is the one that decides. This is the
      // authority; the disabled button above is only a courtesy.
      const result = await saveListing(
        { ...formData, images: formData.images },
        publish,
      );
      if (!result.ok) {
        setServerIssues(result.issues);
        setError("The server refused to publish this listing.");
        setLoading(false);
        return;
      }
      localStorage.removeItem(storageKey);
      router.push("/admin/listings");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save listing.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-border shadow-sm max-w-4xl space-y-10">
      
      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg font-medium">
          {error}
          {serverIssues.length > 0 && (
            <ul className="mt-2 list-disc pl-5 font-normal">
              {serverIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* The Room */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-text-main font-heading border-b pb-2">1. The Room</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input name="title" value={formData.title} onChange={handleTextChange} className="w-full border rounded-lg p-2 min-h-[44px]" placeholder="e.g. 2 Bed Girls PG" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Monthly Rent (₹)</label>
            <input type="number" name="price" value={formData.price} onChange={handleTextChange} className="w-full border rounded-lg p-2 min-h-[44px]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Yearly Rent (₹)</label>
            <input type="number" name="yearlyPrice" value={formData.yearlyPrice || ""} onChange={handleTextChange} className="w-full border rounded-lg p-2 min-h-[44px]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Occupancy</label>
            <select name="occupancyType" value={formData.occupancyType} onChange={handleTextChange} className="w-full border rounded-lg p-2 min-h-[44px]">
              <option value="">Select...</option>
              {OCCUPANCY_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deposit (₹)</label>
            <input type="number" name="deposit" value={formData.deposit} onChange={handleTextChange} className="w-full border rounded-lg p-2 min-h-[44px]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Vacant Beds</label>
            <input type="number" name="vacantBeds" value={formData.vacantBeds} onChange={handleTextChange} className="w-full border rounded-lg p-2 min-h-[44px]" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea name="description" value={formData.description} onChange={handleTextChange} className="w-full border rounded-lg p-2 h-24" />
          </div>
        </div>
      </section>

      {/* College & Walk */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-text-main font-heading border-b pb-2">2. College & Walk</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nearest College</label>
            <select name="collegeId" value={formData.collegeId} onChange={handleTextChange} className="w-full border rounded-lg p-2 min-h-[44px]">
              <option value="">Select...</option>
              {colleges.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Walk Minutes</label>
            <input type="number" name="walkMinutes" value={formData.walkMinutes} onChange={handleTextChange} className="w-full border rounded-lg p-2 min-h-[44px]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Locality</label>
            <select name="location" value={formData.location} onChange={handleTextChange} className="w-full border rounded-lg p-2 min-h-[44px]">
              <option value="">Select...</option>
              {KOLHAPUR_LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Landmark</label>
            <input name="landmark" value={formData.landmark} onChange={handleTextChange} placeholder="Rajaram College समोर" className="w-full border rounded-lg p-2 min-h-[44px]" />
          </div>
          
          <div className="sm:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 mt-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-bold">Map Pin</label>
              {(formData.lat && formData.lng) && (
                <button type="button" onClick={() => setFormData(p => ({...p, lat: "", lng: ""}))} className="text-sm text-red-600 font-medium hover:underline">Clear pin</button>
              )}
            </div>
            
            {(formData.lat && formData.lng) ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm bg-green-50 text-green-800 border border-green-200 p-2 rounded">
                  <MapPin className="h-4 w-4" />
                  Pin captured: {formData.lat}, {formData.lng}
                </div>
                {!looksLikeKolhapur(Number(formData.lat), Number(formData.lng)) && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded font-medium">
                    Warning: These coordinates appear to be outside Kolhapur.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <button type="button" onClick={handleGetCurrentLocation} className="flex items-center justify-center gap-2 w-full sm:w-auto bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium px-4 py-2 min-h-[44px] rounded-lg transition-colors">
                  <Crosshair className="h-4 w-4" /> Use my current location
                </button>
                {geoStatus && <p className="text-sm text-red-600 font-medium">{geoStatus}</p>}
                
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Or paste a Google Maps URL (or direct coordinates)</label>
                  <input type="text" onChange={handlePasteMapUrl} placeholder="https://www.google.com/maps/...@16.7,74.2,15z" className="w-full border border-slate-300 rounded-lg p-2 min-h-[44px] text-sm" />
                  <p className="text-[10px] text-slate-400 mt-1">Hint: Short links (maps.app.goo.gl) won&apos;t work until opened. Long-press the pin in the Maps app to copy coordinates directly.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* The Mess */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-text-main font-heading border-b pb-2">3. The Mess</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Food Provided</label>
            <select name="foodType" value={formData.foodType} onChange={handleTextChange} className="w-full border rounded-lg p-2 min-h-[44px]">
              <option value="">No mess</option>
              {FOOD_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">What the mess serves</label>
            <input name="messNote" value={formData.messNote} onChange={handleTextChange} placeholder="2 chapati + bhaji + rice, Sunday mutton" className="w-full border rounded-lg p-2 min-h-[44px]" />
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-text-main font-heading border-b pb-2">4. Amenities</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {PG_AMENITIES.map(amenity => (
            <label key={amenity} className="flex items-start gap-2 cursor-pointer bg-slate-50 border border-slate-200 p-3 rounded-lg hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={(formData.amenities || []).includes(amenity)}
                onChange={() => handleAmenityToggle(amenity)}
                className="w-4 h-4 mt-0.5 text-primary-strong rounded border-slate-300 focus:ring-primary-strong"
              />
              <span className="text-sm font-medium leading-tight select-none">{amenity}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Warden & Gate */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-text-main font-heading border-b pb-2">5. Warden & Gate</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Gender Allowed</label>
            <select name="genderPreference" value={formData.genderPreference} onChange={handleTextChange} className="w-full border rounded-lg p-2 min-h-[44px]">
              <option value="">Select...</option>
              {GENDER_PREFERENCES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Warden Name</label>
            <input name="wardenName" value={formData.wardenName} onChange={handleTextChange} className="w-full border rounded-lg p-2 min-h-[44px]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gate Closing Time</label>
            <input name="gateClosingTime" value={formData.gateClosingTime} onChange={handleTextChange} className="w-full border rounded-lg p-2 min-h-[44px]" placeholder="e.g. 9:30 PM" />
          </div>
        </div>
      </section>

      {/* Owner Contact */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-text-main font-heading border-b pb-2">6. Owner Contact</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Owner Name</label>
            <input name="ownerName" value={formData.ownerName} onChange={handleTextChange} className="w-full border rounded-lg p-2 min-h-[44px]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Owner Phone</label>
            <input name="ownerPhone" value={formData.ownerPhone} onChange={handleTextChange} className="w-full border rounded-lg p-2 min-h-[44px]" placeholder="e.g. 9876543210" />
          </div>
        </div>
      </section>

      {/* Photos */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-text-main font-heading border-b pb-2">7. Photos</h3>
        
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3 space-y-3 bg-slate-50 p-4 rounded-xl border border-border">
            <h4 className="font-semibold text-text-main">PG_SHOT_LIST</h4>
            <ul className="text-sm space-y-2 text-text-muted list-disc list-inside">
              {PG_SHOT_LIST.map((shot, i) => (
                <li key={i}>{shot}</li>
              ))}
            </ul>
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {formData.images.map((img: any, idx: number) => (
                <div key={idx} className="flex flex-col gap-2 p-2 border border-slate-200 rounded-lg bg-white shadow-sm">
                  <div className="relative rounded-md overflow-hidden h-32 border border-slate-100">
                    <Image src={img.url} alt="upload" width={300} height={300} className="w-full h-full object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
                    {img.tag && (
                      <span className="absolute top-2 left-2 bg-primary-strong text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold shadow-md">
                        {img.tag}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <select 
                      value={img.tag || ""} 
                      onChange={(e) => handleImageTag(idx, e.target.value || null)}
                      className="text-sm px-2 min-h-[44px] rounded bg-slate-50 border border-slate-200 text-slate-800 w-full focus:ring-2 focus:ring-primary-strong outline-none"
                    >
                      <option value="">No tag</option>
                      <option value="bathroom">Bathroom</option>
                      <option value="thali">Thali / Mess</option>
                    </select>
                    <button type="button" onClick={() => removeImage(idx)} className="text-red-600 border border-red-200 bg-red-50 text-sm font-medium px-4 py-2 min-h-[44px] w-full rounded hover:bg-red-100 transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {!UPLOAD_CONFIGURED ? (
              <p className="text-red-600 text-sm">Uploads not configured.</p>
            ) : (
              <div>
                <label className="inline-block bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors">
                  {uploadingImage ? (uploadProgress || "Uploading...") : "Upload Photos"}
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Publish Guard & Actions */}
      <section className="bg-slate-50 p-4 rounded-xl border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          {currentIssues.length > 0 ? (
            <div className="text-sm text-red-700 font-medium space-y-1">
              <p className="font-bold flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Cannot Publish Yet
              </p>
              <ul className="list-disc list-inside">
                {currentIssues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-green-700 font-bold flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Ready to Publish
            </p>
          )}
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            type="button" 
            onClick={() => handleSubmit(false)} 
            disabled={loading}
            className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Save Draft
          </button>
          <button 
            type="button" 
            onClick={() => handleSubmit(true)} 
            disabled={loading || currentIssues.length > 0}
            className="flex-1 sm:flex-none bg-primary-strong hover:bg-primary-hover disabled:bg-slate-300 disabled:text-slate-500 text-white px-6 py-2 rounded-lg font-bold transition-colors"
          >
            Publish
          </button>
        </div>
      </section>

    </div>
  );
}
