import { prisma } from "../prisma";
import {
  calcularDistanciaLineaRectaKm,
  estimarDistanciaRutaKm,
  estimarTiempoMinutos,
  formatoDistanciaKm,
  GeoCoordinate,
} from "./distance";
import { getRealRoadDistanceKm } from "./maps-distance";

/**
 * Centro oficial de reparto de TropiGO en Ivirgarzama. El cobro de delivery
 * parte de la Plaza Principal: a mayor distancia, mayor recargo por km.
 */
export const DEFAULT_DELIVERY_CENTER = {
  name: "Plaza Principal de Ivirgarzama",
  // Coordenadas del casco central de Ivirgarzama (mismas referencias que
  // usa el módulo de distancias del proyecto).
  latitude: -17.0315,
  longitude: -64.8615,
};

export interface DeliveryPricingConfig {
  centerName: string;
  center: GeoCoordinate;
  includedKm: number;
  perKmFee: number;
  autoAssignRiders: boolean;
}

export interface CustomerSavedLocation {
  latitude: number;
  longitude: number;
  label: string | null;
}

export interface DeliveryDistanceResult {
  distanceKm: number;
  straightKm: number;
  etaMinutes: number;
  source: "gps_cliente" | "ubicacion_guardada";
  customerLocation: CustomerSavedLocation;
  center: GeoCoordinate;
  centerName: string;
  includedKm: number;
  perKmFee: number;
  extraKm: number;
  surcharge: number;
  /** Indica si la distancia se obtuvo de Google Maps o se estimó con Haversine */
  tipoDistancia: "real_maps" | "estimado_haversine";
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function getDeliveryPricingConfig(): Promise<DeliveryPricingConfig> {
  const business = await prisma.businessProfile.findFirst({
    select: {
      deliveryCenterName: true,
      deliveryCenterLatitude: true,
      deliveryCenterLongitude: true,
      deliveryIncludedKm: true,
      deliveryPerKmFee: true,
      autoAssignRiders: true,
    },
  });

  return {
    centerName:
      business?.deliveryCenterName?.trim() || DEFAULT_DELIVERY_CENTER.name,
    center: {
      latitude: finiteNumber(
        business?.deliveryCenterLatitude,
        DEFAULT_DELIVERY_CENTER.latitude
      ),
      longitude: finiteNumber(
        business?.deliveryCenterLongitude,
        DEFAULT_DELIVERY_CENTER.longitude
      ),
    },
    includedKm: Math.max(0, finiteNumber(business?.deliveryIncludedKm, 2)),
    perKmFee: Math.max(0, finiteNumber(business?.deliveryPerKmFee, 2)),
    autoAssignRiders: business?.autoAssignRiders ?? true,
  };
}

export async function getCustomerSavedLocation(
  customerId: string
): Promise<CustomerSavedLocation | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      savedLatitude: true,
      savedLongitude: true,
      lastLocationLabel: true,
    },
  });

  if (
    !customer ||
    customer.savedLatitude == null ||
    customer.savedLongitude == null
  ) {
    return null;
  }

  return {
    latitude: customer.savedLatitude,
    longitude: customer.savedLongitude,
    label: customer.lastLocationLabel || null,
  };
}

/**
 * Calcula el delivery desde el centro de la ciudad (Plaza Principal) hasta la
 * ubicación del cliente. Si el cliente no compartió GPS, devuelve null: nunca
 * se inventan coordenadas ni distancias.
 */
export async function calcularDeliveryDesdeCentro(input: {
  latitud?: number | null;
  longitud?: number | null;
  customerId?: string | null;
}): Promise<DeliveryDistanceResult | null> {
  const config = await getDeliveryPricingConfig();

  let customerLocation: CustomerSavedLocation | null = null;
  let source: DeliveryDistanceResult["source"] = "gps_cliente";

  if (
    typeof input.latitud === "number" &&
    Number.isFinite(input.latitud) &&
    typeof input.longitud === "number" &&
    Number.isFinite(input.longitud)
  ) {
    customerLocation = {
      latitude: input.latitud,
      longitude: input.longitud,
      label: null,
    };
  } else if (input.customerId) {
    customerLocation = await getCustomerSavedLocation(input.customerId);
    source = "ubicacion_guardada";
  }

  if (!customerLocation) return null;

  const straightKm = calcularDistanciaLineaRectaKm(
    config.center,
    customerLocation
  );

  // Intentar primero distancia real por carretera (Google Maps Distance Matrix).
  // Si la API key no está configurada o la llamada falla, cae back a Haversine × 1.3.
  let distanceKm: number;
  let etaMinutes: number;
  let tipoDistancia: DeliveryDistanceResult["tipoDistancia"];

  const mapsResult = await getRealRoadDistanceKm(config.center, customerLocation);

  if (mapsResult) {
    distanceKm = mapsResult.distanceKm;
    etaMinutes = Math.max(2, Math.round(mapsResult.durationMinutes));
    tipoDistancia = "real_maps";
  } else {
    distanceKm = estimarDistanciaRutaKm(config.center, customerLocation);
    etaMinutes = estimarTiempoMinutos(distanceKm);
    tipoDistancia = "estimado_haversine";
  }

  const extraKm = Math.max(0, distanceKm - config.includedKm);
  const surcharge = round2(extraKm * config.perKmFee);

  return {
    distanceKm,
    straightKm,
    etaMinutes,
    source,
    customerLocation,
    center: config.center,
    centerName: config.centerName,
    includedKm: config.includedKm,
    perKmFee: config.perKmFee,
    extraKm,
    surcharge,
    tipoDistancia,
  };
}

export async function buildCustomerLocationPrompt(
  customerId: string
): Promise<string> {
  const location = await getCustomerSavedLocation(customerId);
  if (!location) return "";

  const config = await getDeliveryPricingConfig();
  const distanceKm = estimarDistanciaRutaKm(config.center, location);

  return (
    `[UBICACIÓN GUARDADA DEL CLIENTE]\n` +
    `Latitud ${location.latitude.toFixed(5)}, longitud ${location.longitude.toFixed(5)}` +
    (location.label ? ` (referencia: ${location.label})` : "") +
    `.\nDistancia estimada desde ${config.centerName}: ${formatoDistanciaKm(
      distanceKm
    )} por ruta. Km incluidos: ${config.includedKm.toFixed(1)}; recargo por km adicional: ${config.perKmFee.toFixed(
      2
    )} Bs.\nUsa estas coordenadas al cotizar el delivery sin pedirlas de nuevo, salvo que el cliente indique otra ubicación.`
  );
}
