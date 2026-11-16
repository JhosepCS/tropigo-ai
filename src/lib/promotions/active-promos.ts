import { prisma } from "../prisma";

export interface ActivePromotionInfo {
  code: string;
  title: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  announceMessage: string | null;
  merchantName?: string | null;
}

const DAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

/**
 * Consulta las promociones vigentes en el instante exacto según el horario de Bolivia (UTC-4)
 */
export async function getActivePromotionsNow(): Promise<ActivePromotionInfo[]> {
  const now = new Date();
  const boliviaOffsetMinutes = -4 * 60;
  const boliviaTime = new Date(
    now.getTime() + (boliviaOffsetMinutes - now.getTimezoneOffset()) * 60000
  );

  const currentDayName = DAY_NAMES[boliviaTime.getDay()];
  const currentHour = boliviaTime.getHours();
  const currentMinute = boliviaTime.getMinutes();
  const currentTimeStr = `${currentHour.toString().padStart(2, "0")}:${currentMinute
    .toString()
    .padStart(2, "0")}`;

  const promos = await prisma.promotion.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      expiresAt: { gte: now },
    },
    include: {
      merchant: {
        select: { name: true },
      },
    },
  });

  const matching = promos.filter((p) => {
    if (p.scheduleDays) {
      try {
        const allowedDays: string[] = JSON.parse(p.scheduleDays);
        if (Array.isArray(allowedDays) && allowedDays.length > 0) {
          if (!allowedDays.includes(currentDayName)) {
            return false;
          }
        }
      } catch {}
    }

    if (p.scheduleStart && currentTimeStr < p.scheduleStart) {
      return false;
    }
    if (p.scheduleEnd && currentTimeStr > p.scheduleEnd) {
      return false;
    }

    return true;
  });

  return matching.map((p) => ({
    code: p.code,
    title: p.title,
    discountType: p.discountType,
    discountValue: p.discountValue,
    minOrderAmount: p.minOrderAmount,
    announceMessage: p.announceMessage,
    merchantName: p.merchant?.name || null,
  }));
}
