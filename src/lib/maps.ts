/**
 * Google Maps integration utilities.
 */

/**
 * Returns a Google Maps directions link for the given coordinates.
 * 
 * Uses the Maps URLs cross-platform scheme, which reliably opens the native
 * app on iOS/Android, with navigation ready to start.
 * 
 * Returns null if either coordinate is missing.
 */
export function directionsUrl(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Rough bounding box for Kolhapur.
 * Used as a sanity check to prevent swapped lat/lng pairs or missing minus signs.
 * 
 * Lat: 16.4 - 17.0
 * Lng: 73.9 - 74.6
 */
export function looksLikeKolhapur(lat: number, lng: number): boolean {
  if (lat < 16.4 || lat > 17.0) return false;
  if (lng < 73.9 || lng > 74.6) return false;
  return true;
}
