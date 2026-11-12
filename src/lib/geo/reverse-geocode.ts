/**
 * Geocodificación inversa gratuita con OpenStreetMap Nominatim.
 * Se usa solo cuando el cliente comparte una ubicación GPS sin dirección.
 * Nunca bloquea el flujo: si falla o tarda, devuelve null.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${encodeURIComponent(latitude)}` +
      `&lon=${encodeURIComponent(longitude)}` +
      `&zoom=18&addressdetails=1&accept-language=es`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "TropiGO-Ivirgarzama/1.0 (delivery assistant)",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data: any = await res.json().catch(() => null);
    if (!data) return null;

    const address = data.address || {};
    const parts = [
      address.road || address.pedestrian || address.footway,
      address.neighbourhood || address.suburb || address.hamlet,
      address.city || address.town || address.village || address.municipality,
    ]
      .map((part) => (typeof part === "string" ? part.trim() : ""))
      .filter(Boolean);

    if (parts.length > 0) {
      return Array.from(new Set(parts)).join(", ").slice(0, 180);
    }

    const displayName = typeof data.display_name === "string" ? data.display_name : "";
    return displayName ? displayName.slice(0, 180) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
