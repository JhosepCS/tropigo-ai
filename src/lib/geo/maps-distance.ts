/**
 * Google Maps Distance Matrix API — distancia real por carretera.
 *
 * OPCIONAL: solo se activa si GOOGLE_MAPS_API_KEY está definido en el entorno.
 * Si la clave no existe o la llamada falla, retorna null y el sistema
 * cae back a Haversine × ROAD_DISTANCE_FACTOR (ver delivery-center.ts).
 */

interface MapsDistanceResult {
  distanceKm: number;
  durationMinutes: number;
}

interface DistanceMatrixResponse {
  status: string;
  rows: Array<{
    elements: Array<{
      status: string;
      distance: { value: number; text: string };
      duration: { value: number; text: string };
    }>;
  }>;
}

/**
 * Llama a la Distance Matrix API de Google Maps para obtener la distancia
 * real por carretera y el tiempo de viaje entre dos coordenadas.
 *
 * @param origin      Coordenadas de origen (centro de reparto / comercio)
 * @param destination Coordenadas de destino (cliente)
 * @returns Objeto con distanciaKm y durationMinutes, o null si no hay API key
 *          o si la llamada falla.
 */
export async function getRealRoadDistanceKm(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<MapsDistanceResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const originsParam = `${origin.latitude},${origin.longitude}`;
    const destinationsParam = `${destination.latitude},${destination.longitude}`;

    const url = new URL(
      "https://maps.googleapis.com/maps/api/distancematrix/json"
    );
    url.searchParams.set("origins", originsParam);
    url.searchParams.set("destinations", destinationsParam);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("language", "es");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      // Timeout de 5 segundos para no bloquear el flujo principal
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(
        `[maps-distance] HTTP error ${response.status}: ${response.statusText}`
      );
      return null;
    }

    const data: DistanceMatrixResponse = await response.json();

    if (data.status !== "OK") {
      console.error(`[maps-distance] API status: ${data.status}`);
      return null;
    }

    const element = data.rows?.[0]?.elements?.[0];

    if (!element || element.status !== "OK") {
      console.error(
        `[maps-distance] Element status: ${element?.status ?? "undefined"}`
      );
      return null;
    }

    const distanceKm =
      Math.round((element.distance.value / 1000) * 100) / 100;
    const durationMinutes =
      Math.round((element.duration.value / 60) * 10) / 10;

    return { distanceKm, durationMinutes };
  } catch (err) {
    console.error("[maps-distance] Error calling Distance Matrix API:", err);
    return null;
  }
}
