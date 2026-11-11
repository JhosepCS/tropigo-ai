import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireRole,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth/rbac";
import { ABSOLUTE_MIN_RIDE_FARE } from "@/lib/rides/fare";
import {
  MAX_STAMPS_REQUIRED,
  MIN_STAMPS_REQUIRED,
} from "@/lib/loyalty/service";

export const dynamic = "force-dynamic";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function optionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN", "OPERATOR"]);

    const body = await req.json();
    const {
      businessName,
      timezone,
      agencyName,
      agencyLogo,
      defaultModel,
      rideMinFare,
      baseRideFee,
      rideToritoSurcharge,
      loyaltyEnabled,
      loyaltyStampsRequired,
      loyaltyRewardFreeDelivery,
      loyaltyRewardDescription,
    } = body;

    const biz = await prisma.businessProfile.findFirst();

    const businessData: Record<string, unknown> = {};
    if (typeof businessName === "string" && businessName.trim()) {
      businessData.name = businessName.trim().slice(0, 120);
    }
    if (typeof timezone === "string" && timezone.trim()) {
      businessData.timezone = timezone.trim().slice(0, 80);
    }

    const requestedMinFare = optionalNumber(rideMinFare);
    if (requestedMinFare !== null) {
      businessData.rideMinFare = Math.max(
        ABSOLUTE_MIN_RIDE_FARE,
        round2(requestedMinFare)
      );
    }

    const requestedBaseFare = optionalNumber(baseRideFee);
    if (requestedBaseFare !== null) {
      const currentMinFare = Number(
        businessData.rideMinFare ?? biz?.rideMinFare ?? ABSOLUTE_MIN_RIDE_FARE
      );
      businessData.baseRideFee = Math.max(
        currentMinFare,
        round2(requestedBaseFare)
      );
    }

    const requestedToritoSurcharge = optionalNumber(rideToritoSurcharge);
    if (requestedToritoSurcharge !== null) {
      businessData.rideToritoSurcharge = Math.min(
        50,
        Math.max(0, round2(requestedToritoSurcharge))
      );
    }

    const requestedLoyaltyEnabled = optionalBoolean(loyaltyEnabled);
    if (requestedLoyaltyEnabled !== null) {
      businessData.loyaltyEnabled = requestedLoyaltyEnabled;
    }

    const requestedStamps = optionalNumber(loyaltyStampsRequired);
    if (requestedStamps !== null) {
      businessData.loyaltyStampsRequired = Math.min(
        MAX_STAMPS_REQUIRED,
        Math.max(MIN_STAMPS_REQUIRED, Math.floor(requestedStamps))
      );
    }

    const requestedFreeDelivery = optionalBoolean(loyaltyRewardFreeDelivery);
    if (requestedFreeDelivery !== null) {
      businessData.loyaltyRewardFreeDelivery = requestedFreeDelivery;
    }

    if (
      typeof loyaltyRewardDescription === "string" &&
      loyaltyRewardDescription.trim()
    ) {
      businessData.loyaltyRewardDescription = loyaltyRewardDescription
        .trim()
        .slice(0, 120);
    }

    let business = biz;
    if (Object.keys(businessData).length > 0) {
      business = biz
        ? await prisma.businessProfile.update({
            where: { id: biz.id },
            data: businessData,
          })
        : await prisma.businessProfile.create({ data: businessData as any });
    }

    if (
      agencyName !== undefined ||
      agencyLogo !== undefined ||
      defaultModel !== undefined
    ) {
      const ag = await prisma.agencyProfile.findFirst();
      if (ag) {
        await prisma.agencyProfile.update({
          where: { id: ag.id },
          data: {
            ...(typeof agencyName === "string" && agencyName.trim()
              ? { name: agencyName.trim().slice(0, 120) }
              : {}),
            ...(agencyLogo !== undefined
              ? {
                  logoUrl:
                    typeof agencyLogo === "string" && agencyLogo.trim()
                      ? agencyLogo.trim()
                      : null,
                }
              : {}),
          },
        });
      }
    }

    return NextResponse.json({ success: true, business });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Settings] Error al guardar ajustes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
