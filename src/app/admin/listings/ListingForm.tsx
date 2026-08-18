/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { saveListing } from "@/actions/admin";
import { uploadImage, UPLOAD_CONFIGURED } from "@/lib/upload";
import { pgPublishIssues, GENDER_PREFERENCES, FOOD_TYPES, OCCUPANCY_TYPES, PG_SHOT_LIST, KOLHAPUR_LOCALITIES } from "@/lib/property-options";

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
  });

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
        setFormData(JSON.parse(saved));
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
    const newImages = [...formData.images];
    newImages[index].tag = tag;
    setFormData({ ...formData, images: newImages });
  };

  const removeImage = (index: number) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
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
            <input name="title" value={formData.title} onChange={handleTextChange} className="w-full border rounded-lg p-2" placeholder="e.g. 2 Bed Girls PG" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Monthly Rent (₹)</label>
            <input type="number" name="price" value={formData.price} onChange={handleTextChange} className="w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Occupancy</label>
            <select name="occupancyType" value={formData.occupancyType} onChange={handleTextChange} className="w-full border rounded-lg p-2">
              <option value="">Select...</option>
              {OCCUPANCY_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deposit (₹)</label>
            <input type="number" name="deposit" value={formData.deposit} onChange={handleTextChange} className="w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Vacant Beds</label>
            <input type="number" name="vacantBeds" value={formData.vacantBeds} onChange={handleTextChange} className="w-full border rounded-lg p-2" />
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
            <select name="collegeId" value={formData.collegeId} onChange={handleTextChange} className="w-full border rounded-lg p-2">
              <option value="">Select...</option>
              {colleges.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Walk Minutes</label>
            <input type="number" name="walkMinutes" value={formData.walkMinutes} onChange={handleTextChange} className="w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Locality</label>
            <select name="location" value={formData.location} onChange={handleTextChange} className="w-full border rounded-lg p-2">
              <option value="">Select...</option>
              {KOLHAPUR_LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Landmark</label>
            <input name="landmark" value={formData.landmark} onChange={handleTextChange} placeholder="Rajaram College समोर" className="w-full border rounded-lg p-2" />
          </div>
        </div>
      </section>

      {/* The Mess */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-text-main font-heading border-b pb-2">3. The Mess</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Food Provided</label>
            <select name="foodType" value={formData.foodType} onChange={handleTextChange} className="w-full border rounded-lg p-2">
              <option value="">No mess</option>
              {FOOD_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">What the mess serves</label>
            <input name="messNote" value={formData.messNote} onChange={handleTextChange} placeholder="2 chapati + bhaji + rice, Sunday mutton" className="w-full border rounded-lg p-2" />
          </div>
        </div>
      </section>

      {/* Warden & Gate */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-text-main font-heading border-b pb-2">4. Warden & Gate</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Gender Allowed</label>
            <select name="genderPreference" value={formData.genderPreference} onChange={handleTextChange} className="w-full border rounded-lg p-2">
              <option value="">Select...</option>
              {GENDER_PREFERENCES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Warden Name</label>
            <input name="wardenName" value={formData.wardenName} onChange={handleTextChange} className="w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gate Closing Time</label>
            <input name="gateClosingTime" value={formData.gateClosingTime} onChange={handleTextChange} className="w-full border rounded-lg p-2" placeholder="e.g. 9:30 PM" />
          </div>
        </div>
      </section>

      {/* Owner Contact */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-text-main font-heading border-b pb-2">5. Owner Contact</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Owner Name</label>
            <input name="ownerName" value={formData.ownerName} onChange={handleTextChange} className="w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Owner Phone</label>
            <input name="ownerPhone" value={formData.ownerPhone} onChange={handleTextChange} className="w-full border rounded-lg p-2" placeholder="e.g. 9876543210" />
          </div>
        </div>
      </section>

      {/* Photos */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-text-main font-heading border-b pb-2">6. Photos</h3>
        
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
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-border h-32">
                  <Image src={img.url} alt="upload" width={300} height={300} className="w-full h-full object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
                  <div className="absolute inset-0 bg-black/50 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-2">
                    <select 
                      value={img.tag || ""} 
                      onChange={(e) => handleImageTag(idx, e.target.value || null)}
                      className="text-sm px-2 min-h-[44px] rounded bg-white text-black w-full border-none focus:ring-2 focus:ring-primary-strong"
                    >
                      <option value="">No tag</option>
                      <option value="bathroom">Bathroom</option>
                      <option value="thali">Thali / Mess</option>
                    </select>
                    <button type="button" onClick={() => removeImage(idx)} className="text-white text-sm font-medium bg-red-600 px-4 py-2 min-h-[44px] w-full rounded hover:bg-red-700">Remove</button>
                  </div>
                  {img.tag && (
                    <span className="absolute top-1 left-1 bg-primary-strong text-white text-[10px] px-1.5 py-0.5 rounded-full uppercase font-bold">
                      {img.tag}
                    </span>
                  )}
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
