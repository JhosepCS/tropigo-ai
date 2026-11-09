import { prisma } from "../prisma";
import { findActiveZoneForQuery } from "../orders/order-service";

export interface LocationProcessingResult {
  zoneName: string | null;
  zoneId: string | null;
  deliveryFee: number | null;
  estimatedMinutes: number | null;
  status: "SUCCESS" | "AMBIGUOUS" | "NOT_FOUND" | "ERROR";
  message: string;
}

/**
 * Procesa coordenadas GPS reales enviadas por WhatsApp
 * y las vincula a la zonificación oficial de Ivirgarzama.
 */
export async function processWhatsAppLocation(
  latitude: number,
  longitude: number
): Promise<LocationProcessingResult> {
  try {
    // 1. Buscar zonas que tengan polígonos definidos o centros de zona
    // Para esta fase, si no hay polígonos complejos, buscamos la zona más cercana
    // o validamos contra la base de datos de zonas.

    const zones = await prisma.deliveryZone.findMany({
      where: { isActive: true },
    });

    if (zones.length === 0) {
      return {
        zoneName: null,
        zoneId: null,
        deliveryFee: null,
        estimatedMinutes: null,
        status: "ERROR",
        message: "No hay zonas de cobertura configuradas en el sistema.",
      };
    }

    // Lógica de asignación por proximidad o polígono
    // Mientras no se implementen PostGIS/Polígonos, usaremos un sistema de
    // "Centro de Zona" o delegaremos la validación al asistente si la zona es ambigua.

    // NOTA: En una implementación productiva aquí iría la validación de GeoJSON.
    // Por ahora, marcamos que recibimos la ubicación y pedimos confirmación de zona
    // para evitar "inventar" el domicilio.

    return {
      zoneName: null,
      zoneId: null,
      deliveryFee: null,
      estimatedMinutes: null,
      status: "AMBIGUOUS",
      message: "Ubicación GPS recibida. Por favor, confirma si perteneces a alguna de nuestras zonas oficiales.",
    };
  } catch (error: any) {
    console.error("[LocationProcessor] Error:", error);
    return {
      zoneName: null,
      zoneId: null,
      deliveryFee: null,
      estimatedMinutes: null,
      status: "ERROR",
      message: `Error procesando ubicación: ${error.message}`,
    };
  }
}
