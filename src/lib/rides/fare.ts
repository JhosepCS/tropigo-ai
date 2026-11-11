import { prisma } from "../prisma";

/**
 * Tarifa mínima absoluta de una carrera de mototaxi en TropiGO.
 * El CRM puede subir la tarifa mínima, pero nunca bajarla de 10 Bs.
 */
export const ABSOLUTE_MIN_RIDE_FARE = 10;
export const DEFAULT_TORITO_SURCHARGE = 1;

export interface RideFareConfig {
  minFare: number;
  baseFare: number;
  toritoSurcharge: number;
  currencySymbol: string;
}

export interface RideFareBreakdown {
  fare: number;
  baseFare: number;
  minimumFare: number;
  toritoSurcharge: number;
  minimumApplied: boolean;
  vehicleType: "MOTO" | "TORITO";
  currencySymbol: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeVehicleType(value?: string | null): "MOTO" | "TORITO" {
  const normalized = String(value || "").toUpperCase();
  return normalized.includes("TORITO") || normalized.includes("TRIMOVIL")
    ? "TORITO"
    : "MOTO";
}

export function normalizeRideFareConfig(input?: {
  minFare?: unknown;
  baseFare?: unknown;
  toritoSurcharge?: unknown;
  currencySymbol?: string | null;
} | null): RideFareConfig {
  const minFare = Math.max(
    ABSOLUTE_MIN_RIDE_FARE,
    round2(finiteNumber(input?.minFare, ABSOLUTE_MIN_RIDE_FARE))
  );
  const baseFare = Math.max(
    minFare,
    round2(finiteNumber(input?.baseFare, minFare))
  );
  const toritoSurcharge = Math.max(
    0,
    round2(finiteNumber(input?.toritoSurcharge, DEFAULT_TORITO_SURCHARGE))
  );

  return {
    minFare,
    baseFare,
    toritoSurcharge,
    currencySymbol: input?.currencySymbol || "Bs.",
  };
}

export async function getRideFareConfig(): Promise<RideFareConfig> {
  const business = await prisma.businessProfile.findFirst({
    select: {
      baseRideFee: true,
      rideMinFare: true,
      rideToritoSurcharge: true,
      currencySymbol: true,
    },
  });

  return normalizeRideFareConfig({
    minFare: business?.rideMinFare,
    baseFare: business?.baseRideFee,
    toritoSurcharge: business?.rideToritoSurcharge,
    currencySymbol: business?.currencySymbol,
  });
}

/**
 * Calcula la tarifa oficial de una carrera:
 * - Parte de la tarifa de la zona (o de la tarifa base si no hay zona).
 * - Nunca queda por debajo de la tarifa mínima configurada (10 Bs. mínimo).
 * - Suma el recargo de torito/trimóvil cuando corresponde.
 */
export function calculateRideFare(input: {
  zoneFare?: number | null;
  vehicleType?: string | null;
  config: RideFareConfig;
}): RideFareBreakdown {
  const vehicleType = normalizeVehicleType(input.vehicleType);
  const rawZoneFare = Number(input.zoneFare);
  const baseFare =
    Number.isFinite(rawZoneFare) && rawZoneFare > 0
      ? round2(rawZoneFare)
      : input.config.baseFare;

  const fareWithMinimum = Math.max(baseFare, input.config.minFare);
  const surcharge =
    vehicleType === "TORITO" ? input.config.toritoSurcharge : 0;

  return {
    fare: round2(fareWithMinimum + surcharge),
    baseFare,
    minimumFare: input.config.minFare,
    toritoSurcharge: round2(surcharge),
    minimumApplied: fareWithMinimum > baseFare,
    vehicleType,
    currencySymbol: input.config.currencySymbol,
  };
}
