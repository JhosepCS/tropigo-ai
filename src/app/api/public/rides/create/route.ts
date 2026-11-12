import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findActiveZoneForQuery } from "@/lib/orders/order-service";
import {
  calculateRideFare,
  getRideFareConfig,
  normalizeVehicleType,
} from "@/lib/rides/fare";
import { getAppUrl } from "@/lib/app-url";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      passengerName,
      passengerPhone,
      originAddress,
      destinationAddress,
      vehicleType,
    } = body;

    if (!passengerPhone || !originAddress || !destinationAddress) {
      return NextResponse.json(
        { error: "Datos incompletos para solicitar mototaxi" },
        { status: 400 }
      );
    }

    // La tarifa SIEMPRE se calcula en el servidor. El navegador no puede
    // imponer un precio inferior al tarifario oficial ni a la carrera mínima.
    const normalizedVehicle = normalizeVehicleType(vehicleType);
    const fareConfig = await getRideFareConfig();
    const [destinationZone, originZone] = await Promise.all([
      findActiveZoneForQuery(destinationAddress),
      findActiveZoneForQuery(originAddress),
    ]);
    const fareBreakdown = calculateRideFare({
      zoneFare: destinationZone.zone?.baseRideCost,
      vehicleType: normalizedVehicle,
      config: fareConfig,
    });

    // 1. Obtener o crear cliente
    let customer = await prisma.customer.findUnique({
      where: { phone: passengerPhone },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          phone: passengerPhone,
          name: passengerName,
          defaultAddress: originAddress,
          totalRides: 1,
        },
      });
    } else {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: passengerName || customer.name,
          totalRides: { increment: 1 },
        },
      });
    }

    // 2. Generar correlativo VIAJE-XXXX
    const count = await prisma.rideTrip.count();
    const tripNumber = `VIAJE-${2000 + count + 1}`;

    // 3. Crear carrera en base de datos
    const trip = await prisma.rideTrip.create({
      data: {
        tripNumber,
        customerId: customer.id,
        cityId: destinationZone.zone?.cityId || originZone.zone?.cityId || null,
        originZoneId: originZone.zone?.id || null,
        destZoneId: destinationZone.zone?.id || null,
        vehicleType: normalizedVehicle,
        originAddress,
        destinationAddress,
        fareAmount: fareBreakdown.fare,
        status: "SOLICITADO",
        paymentMethod: "EFECTIVO",
        paymentStatus: "PENDIENTE",
      },
    });

    // 4. Registrar en ActivityLog
    await prisma.activityLog.create({
      data: {
        action: `Nueva carrera mototaxi solicitada: ${tripNumber}`,
        provider: "mototaxi_dispatch",
        channel: "webchat",
        status: "success",
        detailsJson: JSON.stringify({
          tripNumber,
          pasajero: passengerName,
          origen: originAddress,
          destino: destinationAddress,
          tarifa: fareBreakdown.fare,
          tarifaMinima: fareBreakdown.minimumFare,
          minimoAplicado: fareBreakdown.minimumApplied,
          zonaDestino: destinationZone.zone?.name || null,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      tripNumber: trip.tripNumber,
      tripId: trip.id,
      fareAmount: trip.fareAmount,
      fareFormatted: `${trip.fareAmount.toFixed(2)} Bs.`,
      vehicleType: normalizedVehicle,
      destinationZone: destinationZone.zone?.name || null,
      urlSeguimiento: `${getAppUrl()}/seguimiento/${trip.id}`,
      urlPago: `${getAppUrl()}/pagar/${trip.id}`,
    });
  } catch (error: any) {
    console.error("Error al crear carrera de mototaxi:", error);
    return NextResponse.json(
      { error: "Error interno al solicitar mototaxi" },
      { status: 500 }
    );
  }
}
