/**
 * Utilidades de cálculo geográfico y vial para TropiGO (Ivirgarzama, Trópico de Cochabamba)
 *
 * REGLA ESTRICTA DE INTEGRIDAD:
 * - No inventar tarifas ni distancias.
 * - Distinguir explícitamente entre distancia en línea recta (geodésica/Haversine)
 *   y recorrido real por carretera o vía urbana.
 * - Utilizar únicamente datos disponibles (coordenadas GPS si existen, o zonificación oficial).
 */

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface DistanceCalculationResult {
  distanciaLineaRectaKm: number | null;
  tipoCalculo: "linea_recta_gps" | "zonificacion_territorial";
  zonaNombre: string;
  tiempoEstimadoMinutos: number;
  explicacionVial: string;
}

// Coordenadas oficiales de referencia de Ivirgarzama
export const IVIRGARZAMA_COORDS = {
  CASCO_CENTRAL: { latitude: -17.0315, longitude: -64.8615 },
  MERCADO_CENTRAL: { latitude: -17.0322, longitude: -64.8610 },
  AV_MORTENSEN: { latitude: -17.0305, longitude: -64.8625 },
  VILLA_14: { latitude: -17.0050, longitude: -64.8850 },
  SENDA_III: { latitude: -17.0650, longitude: -64.8350 },
};

/**
 * Calcula la distancia en línea recta (geodésica) entre dos puntos GPS usando la fórmula de Haversine.
 * Retorna la distancia en kilómetros con 2 decimales.
 */
export function calcularDistanciaLineaRectaKm(
  origen: GeoCoordinate,
  destino: GeoCoordinate
): number {
  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = toRad(destino.latitude - origen.latitude);
  const dLon = toRad(destino.longitude - origen.longitude);

  const lat1 = toRad(origen.latitude);
  const lat2 = toRad(destino.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Math.round(d * 100) / 100;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Evalúa la distancia y tiempo de recorrido distinguiendo claramente:
 * 1. Distancia en línea recta (si hay coordenadas GPS).
 * 2. Recorrido real por carretera/calle (la distancia vial suele ser entre 20% y 40% mayor debido a la traza urbana).
 * 3. Tarifa fija por zona reglamentada en la base de datos (para evitar cobros arbitrarios).
 */
export function evaluarDistanciaYRecorrido(params: {
  origenCoords?: GeoCoordinate | null;
  destinoCoords?: GeoCoordinate | null;
  zonaNombre: string;
  tiempoBaseMinutos: number;
}): DistanceCalculationResult {
  const { origenCoords, destinoCoords, zonaNombre, tiempoBaseMinutos } = params;

  if (
    origenCoords &&
    typeof origenCoords.latitude === "number" &&
    typeof origenCoords.longitude === "number" &&
    destinoCoords &&
    typeof destinoCoords.latitude === "number" &&
    typeof destinoCoords.longitude === "number"
  ) {
    const dLineaRecta = calcularDistanciaLineaRectaKm(origenCoords, destinoCoords);
    // Factor de ruta vial típico en la red de caminos del Trópico de Cochabamba (1.25x - 1.35x en carretera/calles)
    const dCarreteraEstimada = Math.round(dLineaRecta * 1.3 * 10) / 10;

    return {
      distanciaLineaRectaKm: dLineaRecta,
      tipoCalculo: "linea_recta_gps",
      zonaNombre,
      tiempoEstimadoMinutos: tiempoBaseMinutos,
      explicacionVial:
        `Distancia en línea recta (geodésica): ${dLineaRecta.toFixed(2)} km. ` +
        `Recorrido por carretera/red vial estimado: ~${dCarreteraEstimada.toFixed(1)} km. ` +
        `Tiempo de traslado estimado: ${tiempoBaseMinutos} min. ` +
        `Se aplica la tarifa reglamentada de la zona '${zonaNombre}' para garantizar precio justo sin cobros arbitrarios.`,
    };
  }

  // Sin coordenadas GPS exactas: basado exclusivamente en zonificación territorial disponible
  return {
    distanciaLineaRectaKm: null,
    tipoCalculo: "zonificacion_territorial",
    zonaNombre,
    tiempoEstimadoMinutos: tiempoBaseMinutos,
    explicacionVial:
      `Ubicación en zona '${zonaNombre}' determinada por dirección de entrega. ` +
      `Tiempo de entrega estimado en la red vial local: ${tiempoBaseMinutos} min. ` +
      `Tarifa aplicada conforme a la zonificación oficial de Ivirgarzama registrada en el sistema.`,
  };
}
