"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UserPlus, Camera } from "lucide-react";
import { saveStudent } from "@/actions/mess";
import { uploadImage, UPLOAD_CONFIGURED, UPLOAD_UNAVAILABLE } from "@/lib/upload";

export function StudentForm({ messId }: { messId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [issues, setIssues] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  // Uploaded before the form is submitted, so the row is written with a URL
  // rather than a file. Cleared on reset with everything else.
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  async function onPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setIssues([]);
    try {
      setPhotoUrl(await uploadImage(file));
    } catch {
      setIssues([UPLOAD_UNAVAILABLE]);
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(formData: FormData) {
    setIssues([]);
    setSaved(false);

    startTransition(async () => {
      const result = await saveStudent(null, formData);
      if (!result.ok) {
        setIssues(result.issues);
        return;
      }
      formRef.current?.reset();
      setPhotoUrl("");
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form
      ref={formRef}
      action={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4"
    >
      <input type="hidden" name="messId" value={messId} />
      <input type="hidden" name="photoUrl" value={photoUrl} />

      <h2 className="font-heading text-base font-semibold text-text-main">Add a student</h2>

      <div className="flex items-center gap-4">
        {photoUrl ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border">
            <Image src={photoUrl} alt="" fill sizes="80px" className="object-cover" />
          </div>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-text-muted">
            <Camera className="h-6 w-6" aria-hidden />
          </div>
        )}

        <div className="min-w-0">
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-main hover:bg-muted">
            {/*
              * `capture` opens the camera straight away on a phone, which is how
              * this is actually used — staff is standing in front of the student,
              * not browsing a gallery.
              */}
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={onPhoto}
              disabled={uploading || !UPLOAD_CONFIGURED}
              className="sr-only"
            />
            {uploading ? "Uploading…" : photoUrl ? "Retake photo" : "Take photo"}
          </label>
          <p className="mt-1 text-xs text-text-muted">
            {UPLOAD_CONFIGURED
              ? "Shown on their meal receipt, so the counter can check it is them."
              : UPLOAD_UNAVAILABLE}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="name" label="Name" required autoComplete="off" />
        <Field
          name="email"
          label="Google email"
          type="email"
          autoComplete="off"
          placeholder="name@gmail.com"
        />
        <Field name="parentName" label="Parent name" autoComplete="off" />
        <Field
          name="parentPhone"
          label="Parent phone"
          type="tel"
          inputMode="numeric"
          autoComplete="off"
        />
        <Field
          name="monthlyFee"
          label="Monthly fee (₹)"
          type="text"
          inputMode="numeric"
          autoComplete="off"
        />
      </div>

      {issues.length > 0 && (
        <ul role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-900">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}

      {saved && (
        <p role="status" className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-900">
          Student added.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || uploading}
        className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-primary-strong px-4 py-2.5 font-medium text-white hover:bg-primary-hover disabled:opacity-60"
      >
        <UserPlus className="h-4 w-4" aria-hidden />
        {pending ? "Saving…" : "Add student"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  ...props
}: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-text-main">{label}</span>
      <input
        name={name}
        className="rounded-lg border border-border bg-white px-3 py-2.5 text-base outline-none focus:border-primary-strong"
        {...props}
      />
    </label>
  );
}
