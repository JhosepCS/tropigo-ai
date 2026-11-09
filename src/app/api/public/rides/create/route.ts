import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      passengerName,
      passengerPhone,
      originAddress,
      destinationAddress,
      vehicleType,
      fareAmount,
    } = body;

    if (!passengerPhone || !originAddress || !destinationAddress) {
      return NextResponse.json(
        { error: "Datos incompletos para solicitar mototaxi" },
        { status: 400 }
      );
    }

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
        vehicleType: vehicleType || "MOTO",
        originAddress,
        destinationAddress,
        fareAmount: Number(fareAmount) || (vehicleType === "TORITO" ? 5.0 : 4.0),
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
          tarifa: fareAmount,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      tripNumber: trip.tripNumber,
      tripId: trip.id,
    });
  } catch (error: any) {
    console.error("Error al crear carrera de mototaxi:", error);
    return NextResponse.json(
      { error: "Error interno al solicitar mototaxi" },
      { status: 500 }
    );
  }
}
