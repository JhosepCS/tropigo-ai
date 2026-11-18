import { prisma } from "../prisma";
import { normalizePaymentMethodCode } from "../payments/types";

export interface RiderAuditDetail {
  rider: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    plateNumber: string;
    status: string;
    isActive: boolean;
  };
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  totalOrdersCount: number;
  totalRidesCount: number;
  totalServicesCount: number;
  // Ganancias del conductor
  ordersDeliveryFeeTotal: number;
  ridesFareTotal: number;
  grossEarned: number;
  platformCommission: number;
  netEarned: number;
  // Flujo de dinero físico y digital
  cashOrdersTotalAmount: number;
  cashRidesTotalAmount: number;
  totalCashCollectedInHand: number;
  cashRestaurantSubtotalOwed: number;
  digitalOrdersDeliveryFee: number;
  digitalRidesFare: number;
  totalDigitalOwedToRider: number;
  // Balance neto
  // Si balance > 0: El rider cobró de más (comida en efectivo) y debe entregar a Central
  // Si balance < 0: Central cobró QR y le debe transferir/pagar al rider
  balanceDifference: number;
  direction: "RIDER_OWES_CENTRAL" | "CENTRAL_OWES_RIDER" | "SETTLED";
  directionLabel: string;
  orders: {
    id: string;
    orderNumber: string;
    customerName: string;
    merchantName: string;
    subtotal: number;
    deliveryFee: number;
    totalAmount: number;
    paymentMethod: string;
    isCash: boolean;
    createdAt: string;
  }[];
  rides: {
    id: string;
    tripNumber: string;
    customerName: string;
    origin: string;
    destination: string;
    fareAmount: number;
    paymentMethod: string;
    isCash: boolean;
    createdAt: string;
  }[];
}

export interface FleetAuditSummary {
  periodLabel: string;
  totalServicesCount: number;
  totalOrdersCount: number;
  totalRidesCount: number;
  totalGrossEarnedByRiders: number;
  totalCashCollectedInHand: number;
  totalRestaurantSubtotals: number;
  totalCentralOwedToRiders: number;
  totalRidersOwedToCentral: number;
  ridersAudits: RiderAuditDetail[];
}

/**
 * Normaliza las fechas para inicio y fin de periodo en zona horaria de Bolivia (UTC-4).
 */
export function parsePeriodDates(startDateStr?: string, endDateStr?: string): {
  start: Date;
  end: Date;
  label: string;
} {
  const now = new Date();

  let start: Date;
  let end: Date;

  if (startDateStr) {
    start = new Date(startDateStr);
  } else {
    // Hoy a las 00:00:00 local
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  if (endDateStr) {
    end = new Date(endDateStr);
  } else {
    // Fin de hoy a las 23:59:59 local
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  const formatDay = (d: Date) =>
    d.toLocaleDateString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const label =
    formatDay(start) === formatDay(end)
      ? `Hoy (${formatDay(start)})`
      : `${formatDay(start)} al ${formatDay(end)}`;

  return { start, end, label };
}

/**
 * Calcula la auditoría y conciliación de caja de un repartidor específico.
 */
export async function calculateRiderAudit(
  riderId: string,
  startDate?: Date,
  endDate?: Date,
  platformCommissionRate = 0.0 // 0% por defecto en lanzamiento
): Promise<RiderAuditDetail | null> {
  const rider = await prisma.rider.findUnique({
    where: { id: riderId },
    select: {
      id: true,
      name: true,
      phone: true,
      vehicleType: true,
      plateNumber: true,
      status: true,
      isActive: true,
    },
  });

  if (!rider) return null;

  const { start, end, label } = parsePeriodDates(
    startDate?.toISOString(),
    endDate?.toISOString()
  );

  const [completedOrders, completedRides] = await Promise.all([
    prisma.order.findMany({
      where: {
        assignedRiderId: riderId,
        status: "ENTREGADO",
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        customer: { select: { name: true } },
        merchant: { select: { name: true, commissionRate: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.rideTrip.findMany({
      where: {
        assignedRiderId: riderId,
        status: "FINALIZADO",
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  let ordersDeliveryFeeTotal = 0;
  let cashOrdersTotalAmount = 0;
  let cashRestaurantSubtotalOwed = 0;
  let digitalOrdersDeliveryFee = 0;

  const orders = completedOrders.map((o) => {
    const isCash = normalizePaymentMethodCode(o.paymentMethod) === "EFECTIVO";
    const deliveryFee = Number(o.deliveryFee || 5.0);
    const subtotal = Number(o.subtotal || 0);
    const totalAmount = Number(o.totalAmount || subtotal + deliveryFee);

    ordersDeliveryFeeTotal += deliveryFee;

    if (isCash) {
      cashOrdersTotalAmount += totalAmount;
      cashRestaurantSubtotalOwed += subtotal;
    } else {
      digitalOrdersDeliveryFee += deliveryFee;
    }

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customer?.name || "Cliente TropiGO",
      merchantName: o.merchant?.name || "Comercio Asociado",
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod: o.paymentMethod,
      isCash,
      createdAt: o.createdAt.toISOString(),
    };
  });

  let ridesFareTotal = 0;
  let cashRidesTotalAmount = 0;
  let digitalRidesFare = 0;

  const rides = completedRides.map((r) => {
    const isCash = normalizePaymentMethodCode(r.paymentMethod) === "EFECTIVO";
    const fareAmount = Number(r.fareAmount || 10.0);

    ridesFareTotal += fareAmount;

    if (isCash) {
      cashRidesTotalAmount += fareAmount;
    } else {
      digitalRidesFare += fareAmount;
    }

    return {
      id: r.id,
      tripNumber: r.tripNumber,
      customerName: r.customer?.name || "Pasajero",
      origin: r.originAddress,
      destination: r.destinationAddress,
      fareAmount,
      paymentMethod: r.paymentMethod,
      isCash,
      createdAt: r.createdAt.toISOString(),
    };
  });

  const grossEarned = ordersDeliveryFeeTotal + ridesFareTotal;
  const platformCommission = Number((grossEarned * platformCommissionRate).toFixed(2));
  const netEarned = Number((grossEarned - platformCommission).toFixed(2));

  const totalCashCollectedInHand = Number(
    (cashOrdersTotalAmount + cashRidesTotalAmount).toFixed(2)
  );
  const totalDigitalOwedToRider = Number(
    (digitalOrdersDeliveryFee + digitalRidesFare).toFixed(2)
  );

  // Balance exacto: Dinero retenido en mano vs ganancia neta correspondiente
  // Diferencia = (Efectivo en mano) - (Ganancia neta)
  // Que es equivalente a: (Comida en efectivo cobrada) - (Tarifas digitales pendientes de cobro) + (comisión)
  const diffRaw = totalCashCollectedInHand - netEarned;
  const balanceDifference = Math.abs(Number(diffRaw.toFixed(2)));

  let direction: "RIDER_OWES_CENTRAL" | "CENTRAL_OWES_RIDER" | "SETTLED" = "SETTLED";
  let directionLabel = "Cuentas saldadas (0.00 Bs.)";

  if (diffRaw > 0.05) {
    direction = "RIDER_OWES_CENTRAL";
    directionLabel = `Rider debe rendir a Central: ${balanceDifference.toFixed(2)} Bs.`;
  } else if (diffRaw < -0.05) {
    direction = "CENTRAL_OWES_RIDER";
    directionLabel = `Central debe pagar al Rider: ${balanceDifference.toFixed(2)} Bs.`;
  }

  return {
    rider,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    periodLabel: label,
    totalOrdersCount: orders.length,
    totalRidesCount: rides.length,
    totalServicesCount: orders.length + rides.length,
    ordersDeliveryFeeTotal: Number(ordersDeliveryFeeTotal.toFixed(2)),
    ridesFareTotal: Number(ridesFareTotal.toFixed(2)),
    grossEarned: Number(grossEarned.toFixed(2)),
    platformCommission,
    netEarned,
    cashOrdersTotalAmount: Number(cashOrdersTotalAmount.toFixed(2)),
    cashRidesTotalAmount: Number(cashRidesTotalAmount.toFixed(2)),
    totalCashCollectedInHand,
    cashRestaurantSubtotalOwed: Number(cashRestaurantSubtotalOwed.toFixed(2)),
    digitalOrdersDeliveryFee: Number(digitalOrdersDeliveryFee.toFixed(2)),
    digitalRidesFare: Number(digitalRidesFare.toFixed(2)),
    totalDigitalOwedToRider,
    balanceDifference,
    direction,
    directionLabel,
    orders,
    rides,
  };
}

/**
 * Obtiene la auditoría de toda la flota activa o con actividad en el periodo.
 */
export async function getFleetLiveAudit(
  startDate?: Date,
  endDate?: Date
): Promise<FleetAuditSummary> {
  const { start, end, label } = parsePeriodDates(
    startDate?.toISOString(),
    endDate?.toISOString()
  );

  const riders = await prisma.rider.findMany({
    where: {
      OR: [{ isActive: true }, { status: "ACTIVO" }],
    },
    orderBy: { name: "asc" },
  });

  const audits = (
    await Promise.all(
      riders.map((r) => calculateRiderAudit(r.id, start, end))
    )
  ).filter((a): a is RiderAuditDetail => a !== null);

  let totalServicesCount = 0;
  let totalOrdersCount = 0;
  let totalRidesCount = 0;
  let totalGrossEarnedByRiders = 0;
  let totalCashCollectedInHand = 0;
  let totalRestaurantSubtotals = 0;
  let totalCentralOwedToRiders = 0;
  let totalRidersOwedToCentral = 0;

  for (const a of audits) {
    totalServicesCount += a.totalServicesCount;
    totalOrdersCount += a.totalOrdersCount;
    totalRidesCount += a.totalRidesCount;
    totalGrossEarnedByRiders += a.grossEarned;
    totalCashCollectedInHand += a.totalCashCollectedInHand;
    totalRestaurantSubtotals += a.cashRestaurantSubtotalOwed;

    if (a.direction === "CENTRAL_OWES_RIDER") {
      totalCentralOwedToRiders += a.balanceDifference;
    } else if (a.direction === "RIDER_OWES_CENTRAL") {
      totalRidersOwedToCentral += a.balanceDifference;
    }
  }

  return {
    periodLabel: label,
    totalServicesCount,
    totalOrdersCount,
    totalRidesCount,
    totalGrossEarnedByRiders: Number(totalGrossEarnedByRiders.toFixed(2)),
    totalCashCollectedInHand: Number(totalCashCollectedInHand.toFixed(2)),
    totalRestaurantSubtotals: Number(totalRestaurantSubtotals.toFixed(2)),
    totalCentralOwedToRiders: Number(totalCentralOwedToRiders.toFixed(2)),
    totalRidersOwedToCentral: Number(totalRidersOwedToCentral.toFixed(2)),
    ridersAudits: audits,
  };
}

/**
 * Genera el texto formal y ordenado para enviar el cierre de caja por WhatsApp al conductor.
 */
export function generateSettlementWhatsAppText(audit: RiderAuditDetail): string {
  const { rider, periodLabel } = audit;
  const balanceText =
    audit.direction === "RIDER_OWES_CENTRAL"
      ? `👉 *Monto a rendir a Central:* ${audit.balanceDifference.toFixed(2)} Bs.\n(Conserva tus ${audit.netEarned.toFixed(2)} Bs. de ganancia neta en mano)`
      : audit.direction === "CENTRAL_OWES_RIDER"
      ? `👉 *Central te debe pagar:* ${audit.balanceDifference.toFixed(2)} Bs.\n(Por servicios pagados con QR)`
      : `👉 *Cuentas saldadas:* 0.00 Bs.`;

  return encodeURIComponent(
    `🛵 *CIERRE DE CAJA — TROPIGO AI*
📅 *Periodo:* ${periodLabel}
👤 *Conductor:* ${rider.name} (${rider.vehicleType} • ${rider.plateNumber})

📊 *SERVICIOS COMPLETADOS:*
📦 Pedidos delivery: ${audit.totalOrdersCount}
🏍️ Carreras mototaxi: ${audit.totalRidesCount}
✨ Total servicios: ${audit.totalServicesCount}

💰 *TUS GANANCIAS:*
• Tarifa delivery: ${audit.ordersDeliveryFeeTotal.toFixed(2)} Bs.
• Tarifa mototaxi: ${audit.ridesFareTotal.toFixed(2)} Bs.
*Total Ganado: ${audit.netEarned.toFixed(2)} Bs.*

💵 *MOVIMIENTO DE DINERO:*
• Efectivo cobrado en mano: ${audit.totalCashCollectedInHand.toFixed(2)} Bs.
• Comida restaurante a rendir: ${audit.cashRestaurantSubtotalOwed.toFixed(2)} Bs.
• Servicios QR a tu favor: ${audit.totalDigitalOwedToRider.toFixed(2)} Bs.

⚖️ *BALANCE DE CIERRE:*
${balanceText}

📍 _TropiGO AI • Ivirgarzama, Trópico de Cochabamba_`
  );
}
