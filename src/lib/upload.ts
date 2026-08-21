// Browser-direct upload to Cloudinary via an unsigned upload preset — no server
// round-trip needed. Configure the preset in the Cloudinary dashboard (Settings →
// Upload → Upload presets) with: signing mode "Unsigned", a fixed folder, a max
// file size, and allowed formats restricted to images.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET;

/**
 * Whether image uploads can work at all.
 *
 * Both values are NEXT_PUBLIC_, so this resolves at build time and the forms can
 * check it before a seller starts filling anything in. Without this the first
 * signal of a misconfigured deploy is an error thrown on the last step of the
 * wizard, after the seller has already done all the work.
 */
export const UPLOAD_CONFIGURED = Boolean(CLOUD_NAME && UPLOAD_PRESET);

/** Message shown when uploads are unavailable. Kept in one place so the wizard and
 *  the edit form say the same thing. */
export const UPLOAD_UNAVAILABLE =
  'Photo uploads are temporarily unavailable. Please try again later — we have been notified.';

export async function uploadImage(file: File): Promise<string> {
  if (!UPLOAD_CONFIGURED) {
    // Loud in development, because this only ever means the env vars are missing.
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        '[upload] Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and/or NEXT_PUBLIC_CLOUDINARY_PRESET. ' +
        'Create an unsigned upload preset in the Cloudinary dashboard and set both variables. See .env.example.'
      );
    }
    throw new Error(UPLOAD_UNAVAILABLE);
  }

  let uploadBlob: Blob = file;
  let filename = file.name;
  
  if (file.type.startsWith('image/')) {
    try {
      uploadBlob = await downscaleImage(file);
      filename = filename.replace(/\.[^/.]+$/, "") + ".jpg";
    } catch (e) {
      console.warn('[upload] Downscaling failed, falling back to original file:', e);
    }
  }

  const form = new FormData();
  form.append('file', uploadBlob, filename);
  form.append('upload_preset', UPLOAD_PRESET!);

  let res: Response | null = null;
  const retries = 2;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: form,
      });
      break; // Network success, proceed to check res.ok
    } catch {
      // Only throw on the final attempt
      if (attempt === retries - 1) {
        throw new Error('Could not reach the image server. Check your connection and try again.');
      }
      // Brief pause before retry
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  if (!res) {
    throw new Error('Could not reach the image server. Check your connection and try again.');
  }

  if (!res.ok) {
    // Cloudinary returns a useful reason (preset not found, file too large, format
    // not allowed); surfacing it turns a dead end into something actionable.
    let reason = '';
    try {
      const body = await res.json();
      reason = body?.error?.message ?? '';
    } catch {
      // Non-JSON error body — fall through to the generic message.
    }
    if (process.env.NODE_ENV !== 'production' && reason) {
      console.error(`[upload] Cloudinary rejected the upload: ${reason}`);
    }
    throw new Error(reason ? `Image upload failed: ${reason}` : 'Image upload failed. Please try again.');
  }

  const data = await res.json();
  if (!data?.secure_url) throw new Error('Image upload failed. Please try again.');
  return data.secure_url as string;
}

async function downscaleImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  
  let width = bitmap.width;
  let height = bitmap.height;
  const maxEdge = 1600;

  if (width > maxEdge || height > maxEdge) {
    if (width > height) {
      height = Math.round((height * maxEdge) / width);
      width = maxEdge;
    } else {
      width = Math.round((width * maxEdge) / height);
      height = maxEdge;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  ctx.drawImage(bitmap, 0, 0, width, height);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas to Blob failed'));
      },
      'image/jpeg',
      0.82
    );
  });
}
