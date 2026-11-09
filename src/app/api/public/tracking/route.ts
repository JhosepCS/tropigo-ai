import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/tracking?code=TRP-XXXX
 *
 * Rastreo público minimizado: devuelve únicamente el estado operativo y los
 * datos mínimos del conductor. No expone nombre/teléfono del cliente,
 * dirección de entrega, montos ni método de pago. Los códigos TRP son
 * correlativos, por lo que cualquier dato adicional sería enumerable.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: "Código requerido" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: code },
      select: {
        orderNumber: true,
        status: true,
        assignedRider: {
          select: { name: true, plateNumber: true, vehicleType: true },
        },
      },
    });

    if (order) {
      const statusLabels: Record<string, string> = {
        RECIBIDO: "Recibido (En cola)",
        EN_PREPARACION: "En preparación en cocina",
        LISTO_RECOJO: "Listo para recojo",
        ASIGNADO: "Repartidor asignado",
        EN_CAMINO: "En camino a tu dirección",
        ENTREGADO: "Entregado con éxito",
        CANCELADO: "Cancelado",
      };

      return NextResponse.json({
        type: "Delivery de Comida / Compra",
        code: order.orderNumber,
        status: order.status,
        statusLabel: statusLabels[order.status] || order.status,
        rider: order.assignedRider
          ? {
              name: order.assignedRider.name.split(" ")[0],
              plateNumber: order.assignedRider.plateNumber,
              vehicleType: order.assignedRider.vehicleType,
            }
          : null,
      });
    }

    const trip = await prisma.rideTrip.findUnique({
      where: { tripNumber: code },
      select: {
        tripNumber: true,
        status: true,
        vehicleType: true,
        assignedRider: {
          select: { name: true, plateNumber: true, vehicleType: true },
        },
      },
    });

    if (trip) {
      const tripLabels: Record<string, string> = {
        SOLICITADO: "Buscando conductor libre",
        CONDUCTOR_ASIGNADO: "Conductor en camino a tu ubicación",
        EN_CURSO: "En viaje a destino",
        FINALIZADO: "Carrera finalizada",
        CANCELADO: "Cancelada",
      };

      return NextResponse.json({
        type: `Mototaxi (${trip.vehicleType})`,
        code: trip.tripNumber,
        status: trip.status,
        statusLabel: tripLabels[trip.status] || trip.status,
        rider: trip.assignedRider
          ? {
              name: trip.assignedRider.name.split(" ")[0],
              plateNumber: trip.assignedRider.plateNumber,
              vehicleType: trip.assignedRider.vehicleType,
            }
          : null,
      });
    }

    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  } catch (error: any) {
    console.error("Error en tracking:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
