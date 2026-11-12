import { prisma } from "../prisma";
import {
  estimarDistanciaRutaKm,
  estimarTiempoMinutos,
} from "../geo/distance";

export interface TrackingRider {
  name: string;
  phone: string | null;
  plateNumber: string;
  vehicleType: string;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string | null;
}

export interface TrackingStep {
  status: string;
  comment: string | null;
  at: string;
}

export interface TrackingData {
  id: string;
  type: "DELIVERY" | "MOTOTAXI";
  code: string;
  status: string;
  statusLabel: string;
  destinationAddress: string;
  destinationLat: number | null;
  destinationLng: number | null;
  originAddress: string | null;
  originLat: number | null;
  originLng: number | null;
  rider: TrackingRider | null;
  distanceKm: number | null;
  etaMinutes: number | null;
  mapsUrl: string;
  embedUrl: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  steps: TrackingStep[];
  updatedAt: string;
}

const ORDER_STATUS: Record<string, string> = {
  RECIBIDO: "Recibido (en cola)",
  EN_PREPARACION: "En preparación en cocina",
  LISTO_RECOJO: "Listo para recojo",
  ASIGNADO: "Repartidor asignado",
  EN_CAMINO: "En camino a tu dirección",
  ENTREGADO: "Entregado con éxito",
  CANCELADO: "Cancelado",
};

const RIDE_STATUS: Record<string, string> = {
  SOLICITADO: "Buscando conductor libre",
  CONDUCTOR_ASIGNADO: "Conductor en camino",
  EN_CURSO: "En viaje a destino",
  FINALIZADO: "Carrera finalizada",
  CANCELADO: "Cancelada",
};

function buildMapUrls(input: {
  riderLat: number | null;
  riderLng: number | null;
  destLat: number | null;
  destLng: number | null;
  address: string;
}) {
  const { riderLat, riderLng, destLat, destLng, address } = input;

  if (riderLat != null && riderLng != null && destLat != null && destLng != null) {
    const origin = `${riderLat},${riderLng}`;
    const destination = `${destLat},${destLng}`;
    return {
      mapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        origin
      )}&destination=${encodeURIComponent(destination)}&travelmode=driving`,
      embedUrl: `https://maps.google.com/maps?saddr=${origin}&daddr=${destination}&z=15&output=embed`,
    };
  }

  if (destLat != null && destLng != null) {
    return {
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`,
      embedUrl: `https://maps.google.com/maps?q=${destLat},${destLng}&z=16&output=embed`,
    };
  }

  const query = encodeURIComponent(`${address}, Ivirgarzama, Bolivia`);
  return {
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${query}`,
    embedUrl: `https://maps.google.com/maps?q=${query}&z=15&output=embed`,
  };
}

/**
 * Datos de seguimiento para un pedido o carrera. El id es un CUID no
 * enumerable; no se acepta el código correlativo para la versión con mapa.
 */
export async function getTrackingData(id: string): Promise<TrackingData | null> {
  const cleanId = String(id || "").trim();
  if (!cleanId) return null;

  const order = await prisma.order.findUnique({
    where: { id: cleanId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      deliveryAddressText: true,
      referencePoint: true,
      latitude: true,
      longitude: true,
      distanceKm: true,
      totalAmount: true,
      paymentMethod: true,
      paymentStatus: true,
      updatedAt: true,
      assignedRider: {
        select: {
          name: true,
          phone: true,
          plateNumber: true,
          vehicleType: true,
          currentLatitude: true,
          currentLongitude: true,
          lastLocationAt: true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { toStatus: true, comment: true, createdAt: true },
      },
    },
  });

  if (order) {
    const riderLat = order.assignedRider?.currentLatitude ?? null;
    const riderLng = order.assignedRider?.currentLongitude ?? null;
    const destLat = order.latitude;
    const destLng = order.longitude;

    const liveDistance =
      riderLat != null && riderLng != null && destLat != null && destLng != null
        ? estimarDistanciaRutaKm(
            { latitude: riderLat, longitude: riderLng },
            { latitude: destLat, longitude: destLng }
          )
        : order.distanceKm ?? null;

    const mapUrls = buildMapUrls({
      riderLat,
      riderLng,
      destLat,
      destLng,
      address: order.deliveryAddressText,
    });

    return {
      id: order.id,
      type: "DELIVERY",
      code: order.orderNumber,
      status: order.status,
      statusLabel: ORDER_STATUS[order.status] || order.status,
      destinationAddress: order.deliveryAddressText,
      destinationLat: destLat,
      destinationLng: destLng,
      originAddress: null,
      originLat: null,
      originLng: null,
      rider: order.assignedRider
        ? {
            name: order.assignedRider.name,
            phone: order.assignedRider.phone,
            plateNumber: order.assignedRider.plateNumber,
            vehicleType: order.assignedRider.vehicleType,
            latitude: riderLat,
            longitude: riderLng,
            locationUpdatedAt:
              order.assignedRider.lastLocationAt?.toISOString() || null,
          }
        : null,
      distanceKm: liveDistance,
      etaMinutes: liveDistance != null ? estimarTiempoMinutos(liveDistance) : null,
      mapsUrl: mapUrls.mapsUrl,
      embedUrl: mapUrls.embedUrl,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      steps: order.statusHistory.map((step) => ({
        status: step.toStatus,
        comment: step.comment,
        at: step.createdAt.toISOString(),
      })),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  const trip = await prisma.rideTrip.findUnique({
    where: { id: cleanId },
    select: {
      id: true,
      tripNumber: true,
      status: true,
      originAddress: true,
      destinationAddress: true,
      originLat: true,
      originLng: true,
      destLat: true,
      destLng: true,
      distanceKm: true,
      fareAmount: true,
      paymentMethod: true,
      paymentStatus: true,
      updatedAt: true,
      assignedRider: {
        select: {
          name: true,
          phone: true,
          plateNumber: true,
          vehicleType: true,
          currentLatitude: true,
          currentLongitude: true,
          lastLocationAt: true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { toStatus: true, comment: true, createdAt: true },
      },
    },
  });

  if (!trip) return null;

  const riderLat = trip.assignedRider?.currentLatitude ?? null;
  const riderLng = trip.assignedRider?.currentLongitude ?? null;
  const destLat = trip.destLat;
  const destLng = trip.destLng;

  const liveDistance =
    riderLat != null && riderLng != null && destLat != null && destLng != null
      ? estimarDistanciaRutaKm(
          { latitude: riderLat, longitude: riderLng },
          { latitude: destLat, longitude: destLng }
        )
      : trip.distanceKm ?? null;

  const mapUrls = buildMapUrls({
    riderLat,
    riderLng,
    destLat,
    destLng,
    address: trip.destinationAddress,
  });

  return {
    id: trip.id,
    type: "MOTOTAXI",
    code: trip.tripNumber,
    status: trip.status,
    statusLabel: RIDE_STATUS[trip.status] || trip.status,
    destinationAddress: trip.destinationAddress,
    destinationLat: destLat,
    destinationLng: destLng,
    originAddress: trip.originAddress,
    originLat: trip.originLat,
    originLng: trip.originLng,
    rider: trip.assignedRider
      ? {
          name: trip.assignedRider.name,
          phone: trip.assignedRider.phone,
          plateNumber: trip.assignedRider.plateNumber,
          vehicleType: trip.assignedRider.vehicleType,
          latitude: riderLat,
          longitude: riderLng,
          locationUpdatedAt:
            trip.assignedRider.lastLocationAt?.toISOString() || null,
        }
      : null,
    distanceKm: liveDistance,
    etaMinutes: liveDistance != null ? estimarTiempoMinutos(liveDistance) : null,
    mapsUrl: mapUrls.mapsUrl,
    embedUrl: mapUrls.embedUrl,
    totalAmount: trip.fareAmount,
    paymentMethod: trip.paymentMethod,
    paymentStatus: trip.paymentStatus,
    steps: trip.statusHistory.map((step) => ({
      status: step.toStatus,
      comment: step.comment,
      at: step.createdAt.toISOString(),
    })),
    updatedAt: trip.updatedAt.toISOString(),
  };
}
