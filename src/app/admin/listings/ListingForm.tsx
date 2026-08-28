/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { saveListing } from "@/actions/admin";
import { uploadImage, UPLOAD_CONFIGURED } from "@/lib/upload";
import {
  pgPublishIssueList,
  PG_MIN_PHOTOS,
  GENDER_PREFERENCES,
  FOOD_TYPES,
  OCCUPANCY_TYPES,
  PG_SHOT_LIST,
  KOLHAPUR_LOCALITIES,
  PG_AMENITIES,
  type PublishIssueField,
} from "@/lib/property-options";
import { looksLikeKolhapur } from "@/lib/maps";
import { cn } from "@/lib/utils";
import { FormSection } from "./FormSection";
import { MapPin, Crosshair, ArrowLeft, ArrowRight, AlertTriangle, Check, Star } from "lucide-react";

/** Shared field chrome, so 40-odd inputs cannot drift apart one edit at a time. */
const FIELD = "w-full min-h-11 rounded-lg border border-border bg-white px-3 text-text-main";
const LABEL = "mb-1 block text-sm font-medium text-text-main";

/**
 * Which section each publish blocker lives in, and which control to focus.
 *
 * Keyed by `PublishIssueField` from the guard itself, so a new rule that forgets
 * an entry here is a TypeScript error rather than a button that scrolls nowhere.
 */
const ISSUE_TARGET: Record<PublishIssueField, { section: number; anchor: string }> = {
  ownerPhone: { section: 6, anchor: "field-ownerPhone" },
  images: { section: 7, anchor: "field-photos" },
  bathroomPhoto: { section: 7, anchor: "field-photos" },
  wardenName: { section: 5, anchor: "field-wardenName" },
  gateClosingTime: { section: 5, anchor: "field-gateClosingTime" },
};

export default function ListingForm({
  initialData,
  colleges,
}: {
  initialData?: any;
  colleges: any[];
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [serverIssues, setServerIssues] = useState<string[]>([]);
  const [isRestored, setIsRestored] = useState(false);
  const [showCustomLocationInput, setShowCustomLocationInput] = useState(
    Boolean(initialData?.location && !KOLHAPUR_LOCALITIES.includes(initialData.location)),
  );

  /**
   * Which sections are folded open. A new listing starts on section 1 and
   * nothing else — the whole point is not to face 44 controls at once. An edit
   * starts fully closed, because you came to change one thing.
   */
  const [openSections, setOpenSections] = useState<Record<number, boolean>>(
    initialData?.id ? {} : { 1: true },
  );
  const [issuesOpen, setIssuesOpen] = useState(false);

  const setSectionOpen = (index: number, open: boolean) =>
    setOpenSections((prev) => (prev[index] === open ? prev : { ...prev, [index]: open }));

  const storageKey = `aangan-admin-form-${initialData?.id || "new"}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData((prev) => ({ ...prev, ...parsed }));
        if (parsed.location && !KOLHAPUR_LOCALITIES.includes(parsed.location)) {
          setShowCustomLocationInput(true);
        }
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

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("Geolocation is not supported by your browser.");
      return;
    }
    setGeoStatus("Finding location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          lat: position.coords.latitude.toString(),
          lng: position.coords.longitude.toString(),
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
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handlePasteMapUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Extract @lat,lng from URL. Also catches raw "16.702, 74.234"
    const match =
      val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || val.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/);
    if (match) {
      setFormData((prev) => ({ ...prev, lat: match[1], lng: match[2] }));
      e.target.value = ""; // clear input after successful paste
    }
  };

  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "Other") {
      setShowCustomLocationInput(true);
      setFormData({ ...formData, location: "" });
    } else {
      setShowCustomLocationInput(false);
      setFormData({ ...formData, location: val });
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData((prev) => {
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
    e.target.value = "";

    const failed: string[] = [];

    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Uploading ${i + 1} of ${files.length}...`);
      try {
        const url = await uploadImage(files[i]);
        setFormData((prev) => ({ ...prev, images: [...prev.images, { url, tag: null }] }));
      } catch {
        failed.push(files[i].name);
      }
    }

    if (failed.length > 0) {
      setError(`Failed to upload ${failed.length} image(s): ${failed.join(", ")}`);
    }
    setUploadProgress("");
    setUploadingImage(false);
  };

  const handleImageTag = (index: number, tag: string | null) => {
    setFormData((prev) => {
      const newImages = [...prev.images];
      newImages[index] = { ...newImages[index], tag };
      return { ...prev, images: newImages };
    });
  };

  const removeImage = (index: number) => {
    setFormData((prev) => {
      const newImages = [...prev.images];
      newImages.splice(index, 1);
      return { ...prev, images: newImages };
    });
  };

  const moveImage = (index: number, direction: "left" | "right") => {
    setFormData((prev) => {
      const newImages = [...prev.images];
      if (direction === "left" && index > 0) {
        [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
      } else if (direction === "right" && index < newImages.length - 1) {
        [newImages[index + 1], newImages[index]] = [newImages[index], newImages[index + 1]];
      }
      return { ...prev, images: newImages };
    });
  };

  /**
   * The first photo becomes `imageUrl`, the one every card and share preview
   * shows. Promoting the last of eight was seven taps on the ← button.
   */
  const makeCover = (index: number) => {
    setFormData((prev) => {
      if (index === 0) return prev;
      const newImages = [...prev.images];
      const [picked] = newImages.splice(index, 1);
      return { ...prev, images: [picked, ...newImages] };
    });
  };

  const hasBathroomPhoto = formData.images.some((img: any) => img.tag === "bathroom");

  const issues = pgPublishIssueList({ ...formData, hasBathroomPhoto });
  const blockedSections = new Set(issues.map((i) => ISSUE_TARGET[i.field].section));

  /** Open the section holding a blocker and put the cursor on the field. */
  const goToIssue = (field: PublishIssueField) => {
    const target = ISSUE_TARGET[field];
    setSectionOpen(target.section, true);
    setIssuesOpen(false);
    // After the <details> has actually opened, so the element has a position.
    requestAnimationFrame(() => {
      const el = document.getElementById(target.anchor);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
    });
  };

  const handleSubmit = async (publish: boolean) => {
    if (publish && issues.length > 0) {
      setError("Cannot publish. Fix the issues below.");
      setIssuesOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // The server runs the same guard and is the one that decides. This is the
      // authority; the disabled button above is only a courtesy.
      const result = await saveListing({ ...formData, images: formData.images }, publish);
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

  const amenityCount = (formData.amenities || []).length;
  const photoCount = formData.images.length;

  return (
    <div className="max-w-4xl space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 font-medium text-red-900">
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

      <FormSection
        index={1}
        title="The room"
        status={formData.title ? undefined : "Empty"}
        open={!!openSections[1]}
        onToggle={(o) => setSectionOpen(1, o)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="field-title">Title</label>
            <input id="field-title" name="title" value={formData.title} onChange={handleTextChange} className={FIELD} placeholder="e.g. 2 Bed Girls Hostel" />
          </div>
          <div>
            <label className={LABEL} htmlFor="field-price">Monthly rent (₹)</label>
            <input id="field-price" type="number" name="price" value={formData.price} onChange={handleTextChange} className={FIELD} />
          </div>
          <div>
            <label className={LABEL} htmlFor="field-yearlyPrice">Yearly rent (₹)</label>
            <input id="field-yearlyPrice" type="number" name="yearlyPrice" value={formData.yearlyPrice || ""} onChange={handleTextChange} className={FIELD} />
          </div>
          <div>
            <label className={LABEL} htmlFor="field-occupancyType">Occupancy</label>
            <select id="field-occupancyType" name="occupancyType" value={formData.occupancyType} onChange={handleTextChange} className={FIELD}>
              <option value="">Select...</option>
              {OCCUPANCY_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="field-deposit">Deposit (₹)</label>
            <input id="field-deposit" type="number" name="deposit" value={formData.deposit} onChange={handleTextChange} className={FIELD} />
          </div>
          <div>
            <label className={LABEL} htmlFor="field-vacantBeds">Vacant beds</label>
            <input id="field-vacantBeds" type="number" name="vacantBeds" value={formData.vacantBeds} onChange={handleTextChange} className={FIELD} />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor="field-description">Description</label>
            <textarea id="field-description" name="description" value={formData.description} onChange={handleTextChange} className="min-h-24 w-full resize-y rounded-lg border border-border bg-white p-3 text-text-main" />
          </div>
        </div>
      </FormSection>

      <FormSection
        index={2}
        title="College & walk"
        status={formData.collegeId ? undefined : "Not set"}
        open={!!openSections[2]}
        onToggle={(o) => setSectionOpen(2, o)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="field-collegeId">Nearest college</label>
            <select id="field-collegeId" name="collegeId" value={formData.collegeId} onChange={handleTextChange} className={FIELD}>
              <option value="">Select...</option>
              {colleges.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="field-walkMinutes">Walk minutes</label>
            <input id="field-walkMinutes" type="number" name="walkMinutes" value={formData.walkMinutes} onChange={handleTextChange} className={FIELD} />
          </div>
          <div>
            <label className={LABEL} htmlFor="field-location">Locality</label>
            {!showCustomLocationInput ? (
              <select id="field-location" value={formData.location} onChange={handleLocationSelect} className={FIELD}>
                <option value="">Select...</option>
                {KOLHAPUR_LOCALITIES.map((l) => <option key={l} value={l}>{l}</option>)}
                <option value="Other">Other...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input id="field-location" name="location" value={formData.location} onChange={handleTextChange} placeholder="Type custom locality..." className={cn(FIELD, "flex-1")} autoFocus />
                <button
                  type="button"
                  onClick={() => { setShowCustomLocationInput(false); setFormData({ ...formData, location: "" }); }}
                  className="min-h-11 shrink-0 rounded-lg border border-border bg-slate-50 px-4 text-sm font-medium text-text-muted hover:bg-slate-100"
                >
                  Back
                </button>
              </div>
            )}
          </div>
          <div>
            <label className={LABEL} htmlFor="field-landmark">Landmark</label>
            <input id="field-landmark" name="landmark" value={formData.landmark} onChange={handleTextChange} placeholder="Rajaram College समोर" className={FIELD} />
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-slate-50 p-4 sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-text-main">Map pin</span>
              {formData.lat && formData.lng && (
                <button type="button" onClick={() => setFormData((p) => ({ ...p, lat: "", lng: "" }))} className="min-h-11 px-1 text-sm font-medium text-red-700 hover:underline">
                  Clear pin
                </button>
              )}
            </div>

            {formData.lat && formData.lng ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded border border-green-200 bg-green-50 p-2 text-sm text-green-900">
                  <MapPin className="h-4 w-4 shrink-0" />
                  Pin captured: {formData.lat}, {formData.lng}
                </div>
                {!looksLikeKolhapur(Number(formData.lat), Number(formData.lng)) && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs font-medium text-amber-900">
                    Warning: These coordinates appear to be outside Kolhapur.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <button type="button" onClick={handleGetCurrentLocation} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 font-medium text-text-main hover:bg-slate-100 sm:w-auto">
                  <Crosshair className="h-4 w-4" /> Use my current location
                </button>
                {geoStatus && <p className="text-sm font-medium text-red-700">{geoStatus}</p>}

                <div>
                  <label className="mb-1 block text-xs text-text-muted" htmlFor="field-mapUrl">
                    Or paste a Google Maps URL (or direct coordinates)
                  </label>
                  <input id="field-mapUrl" type="text" onChange={handlePasteMapUrl} placeholder="https://www.google.com/maps/...@16.7,74.2,15z" className={cn(FIELD, "text-sm")} />
                  <p className="mt-1 text-xs text-text-muted">
                    Hint: Short links (maps.app.goo.gl) won&apos;t work until opened. Long-press the pin in the Maps app to copy coordinates directly.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection
        index={3}
        title="The mess"
        status={formData.foodType || "No mess"}
        open={!!openSections[3]}
        onToggle={(o) => setSectionOpen(3, o)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="field-foodType">Food provided</label>
            <select id="field-foodType" name="foodType" value={formData.foodType} onChange={handleTextChange} className={FIELD}>
              <option value="">No mess</option>
              {FOOD_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="field-messNote">What the mess serves</label>
            <input id="field-messNote" name="messNote" value={formData.messNote} onChange={handleTextChange} placeholder="2 chapati + bhaji + rice, Sunday mutton" className={FIELD} />
          </div>
        </div>
      </FormSection>

      <FormSection
        index={4}
        title="Amenities"
        status={`${amenityCount} set`}
        open={!!openSections[4]}
        onToggle={(o) => setSectionOpen(4, o)}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PG_AMENITIES.map((amenity) => (
            <label key={amenity} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-slate-50 px-3 py-2 hover:bg-slate-100 has-[:checked]:border-primary-strong has-[:checked]:bg-primary-strong/10">
              <input
                type="checkbox"
                checked={(formData.amenities || []).includes(amenity)}
                onChange={() => handleAmenityToggle(amenity)}
                className="h-5 w-5 shrink-0 rounded border-border accent-primary-strong"
              />
              <span className="select-none text-sm font-medium leading-tight text-text-main">{amenity}</span>
            </label>
          ))}
        </div>
      </FormSection>

      <FormSection
        index={5}
        title="Warden & gate"
        blocking={blockedSections.has(5)}
        status={formData.genderPreference || "Anyone"}
        open={!!openSections[5]}
        onToggle={(o) => setSectionOpen(5, o)}
      >
        {/* Stacked to `lg`. This was `sm:grid-cols-3`, i.e. three controls
            sharing ~600px the moment the viewport passed 640. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <label className={LABEL} htmlFor="field-genderPreference">Gender allowed</label>
            <select id="field-genderPreference" name="genderPreference" value={formData.genderPreference} onChange={handleTextChange} className={FIELD}>
              <option value="">Select...</option>
              {GENDER_PREFERENCES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="field-wardenName">Warden name</label>
            <input id="field-wardenName" name="wardenName" value={formData.wardenName} onChange={handleTextChange} className={FIELD} />
          </div>
          <div>
            <label className={LABEL} htmlFor="field-gateClosingTime">Gate closing time</label>
            <input id="field-gateClosingTime" name="gateClosingTime" value={formData.gateClosingTime} onChange={handleTextChange} className={FIELD} placeholder="e.g. 9:30 PM" />
          </div>
        </div>
      </FormSection>

      <FormSection
        index={6}
        title="Owner contact"
        blocking={blockedSections.has(6)}
        open={!!openSections[6]}
        onToggle={(o) => setSectionOpen(6, o)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="field-ownerName">Owner name</label>
            <input id="field-ownerName" name="ownerName" value={formData.ownerName} onChange={handleTextChange} className={FIELD} />
          </div>
          <div>
            <label className={LABEL} htmlFor="field-ownerPhone">Owner phone</label>
            <input id="field-ownerPhone" type="tel" name="ownerPhone" value={formData.ownerPhone} onChange={handleTextChange} className={FIELD} placeholder="e.g. 9876543210" />
          </div>
        </div>
      </FormSection>

      <FormSection
        index={7}
        title="Photos"
        blocking={blockedSections.has(7)}
        status={`${photoCount} of ${PG_MIN_PHOTOS}`}
        open={!!openSections[7]}
        onToggle={(o) => setSectionOpen(7, o)}
      >
        <div id="field-photos" className="space-y-4">
          <details className="rounded-lg border border-border bg-slate-50">
            <summary className="flex min-h-11 cursor-pointer list-none items-center px-3 text-sm font-semibold text-text-main marker:content-none [&::-webkit-details-marker]:hidden">
              The shot list — {PG_SHOT_LIST.length} photos to take
            </summary>
            <ul className="list-inside list-disc space-y-2 px-3 pb-3 text-sm text-text-muted">
              {PG_SHOT_LIST.map((shot, i) => <li key={i}>{shot}</li>)}
            </ul>
          </details>

          {!UPLOAD_CONFIGURED ? (
            <p className="text-sm text-red-700">Uploads not configured.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-border bg-slate-100 px-4 font-medium text-text-main hover:bg-slate-200">
                {uploadingImage ? uploadProgress || "Uploading..." : "Upload photos"}
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
              </label>
              <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 font-medium text-white hover:bg-slate-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
              </label>
            </div>
          )}

          {photoCount > 0 && (
            <ul className="space-y-3">
              {formData.images.map((img: any, idx: number) => (
                // One photo per row on a phone. As a 2-up grid each ~140px tile
                // carried a select plus three 44px buttons under a 128px thumb.
                <li key={idx} className="flex gap-3 rounded-lg border border-border bg-white p-3">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-border">
                    <Image src={img.url} alt="" fill className="object-cover" sizes="96px" />
                    {idx === 0 && (
                      <span className="absolute inset-x-0 bottom-0 bg-primary-strong py-0.5 text-center text-[10px] font-bold uppercase text-white">
                        Cover
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <select
                      value={img.tag || ""}
                      onChange={(e) => handleImageTag(idx, e.target.value || null)}
                      className={cn(FIELD, "text-sm")}
                      aria-label={`Tag for photo ${idx + 1}`}
                    >
                      <option value="">No tag</option>
                      <option value="bathroom">Bathroom</option>
                      <option value="thali">Thali / Mess</option>
                    </select>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => moveImage(idx, "left")} disabled={idx === 0} aria-label={`Move photo ${idx + 1} earlier`} className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-slate-50 text-text-main hover:bg-slate-100 disabled:opacity-40">
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => moveImage(idx, "right")} disabled={idx === photoCount - 1} aria-label={`Move photo ${idx + 1} later`} className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-slate-50 text-text-main hover:bg-slate-100 disabled:opacity-40">
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => makeCover(idx)} disabled={idx === 0} aria-label={`Make photo ${idx + 1} the cover`} className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-slate-50 text-text-main hover:bg-slate-100 disabled:opacity-40">
                        <Star className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => removeImage(idx)} className="min-h-11 flex-1 rounded-lg border border-red-200 bg-red-50 text-sm font-medium text-red-800 hover:bg-red-100">
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FormSection>

      {/*
        * Sticky, not a section at the bottom of a 40-control scroll. It sits at
        * `--admin-tabbar-h` on a phone so it lands above the tab bar rather than
        * under it, and at 0 from `lg` where there is no tab bar.
        */}
      <div className="sticky bottom-[var(--admin-tabbar-h)] z-20 -mx-4 border-t border-border bg-white px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.06)] sm:mx-0 sm:rounded-xl sm:border sm:px-4 lg:bottom-0">
        {issues.length > 0 ? (
          <details open={issuesOpen} onToggle={(e) => setIssuesOpen((e.currentTarget as HTMLDetailsElement).open)}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-bold text-red-900 marker:content-none [&::-webkit-details-marker]:hidden">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {issues.length} {issues.length === 1 ? "thing blocks" : "things block"} publishing
              <span className="ml-auto text-xs font-medium text-text-muted">tap to see</span>
            </summary>
            <ul className="mb-2 space-y-1 pt-2">
              {issues.map((issue) => (
                <li key={issue.field}>
                  {/* A button, not a bullet: the fix is one tap away rather than
                      a hunt back up the form for the field it means. */}
                  <button
                    type="button"
                    onClick={() => goToIssue(issue.field)}
                    className="w-full rounded-lg bg-red-50 px-3 py-2 text-left text-sm text-red-900 hover:bg-red-100"
                  >
                    {issue.message}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <p className="flex min-h-11 items-center gap-2 text-sm font-bold text-green-800">
            <Check className="h-4 w-4 shrink-0" />
            Ready to publish
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={loading}
            className="min-h-12 flex-1 rounded-lg border border-border bg-white font-medium text-text-main hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save draft"}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={loading || issues.length > 0}
            className="min-h-12 flex-1 rounded-lg bg-primary-strong font-bold text-white hover:bg-primary-hover disabled:bg-slate-300 disabled:text-slate-600"
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
