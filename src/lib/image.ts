/**
 * Rewrites a Cloudinary URL to insert format, quality, and width parameters.
 * Passes non-Cloudinary URLs through untouched.
 */
export function cloudinaryUrl(url: string | null | undefined, width: number): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com')) return url;
  
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
}
