import { prisma } from "../../prisma";
import { IAssistantTool } from "./types";
import { findActiveZoneForQuery } from "../../orders/order-service";
import { calculateRideFare, getRideFareConfig } from "../../rides/fare";

export const deliveryFeesTool: IAssistantTool = {
  name: "cotizar_tarifa",
  description:
    "Cotiza la tarifa oficial en Bolivianos (Bs.) para delivery o mototaxi según una zona activa configurada en Ivirgarzama. " +
    "No aplica tarifas por defecto ni inventa zonas: si la zona no coincide exactamente o es ambigua, devuelve las zonas disponibles para que el cliente precise la suya.",
  parameters: {
    type: "object",
    properties: {
      tipo: {
        type: "string",
        enum: ["DELIVERY", "MOTOTAXI"],
        description: "Tipo de servicio: DELIVERY (comida/compras) o MOTOTAXI (transporte de pasajeros).",
      },
      destino: {
        type: "string",
        description: "Zona, barrio o dirección de destino en Ivirgarzama. Debe coincidir con una zona activa.",
      },
      vehiculo: {
        type: "string",
        enum: ["MOTO", "TORITO"],
        description: "Para mototaxis: MOTO (individual) o TORITO (trimóvil para más pasajeros o compras).",
      },
      comercio: {
        type: "string",
        description: "Restaurante o comercio de origen opcional para entregas de comida.",
      },
    },
    required: ["tipo", "destino"],
  },
  async execute(args: {
    tipo: "DELIVERY" | "MOTOTAXI";
    destino: string;
    vehiculo?: "MOTO" | "TORITO";
    comercio?: string;
  }) {
    try {
      if (!args.tipo || !args.destino || !args.destino.trim()) {
        return {
          error: "Debe especificar el tipo de servicio (DELIVERY o MOTOTAXI) y la zona de destino.",
        };
      }

      const fareConfig = await getRideFareConfig();
      const zoneLookup = await findActiveZoneForQuery(args.destino);
      const zone = zoneLookup.zone;

      if (!zone) {
        return {
          requiereZona: true,
          error: zoneLookup.ambiguous
            ? "La zona indicada coincide con más de una zona de cobertura. Pide al cliente que precise el barrio exacto."
            : "No se encontró una zona de cobertura oficial para ese destino. No inventes una tarifa.",
          tarifaMinimaCarreraBs: fareConfig.minFare,
          zonasDisponibles: zoneLookup.zones.map((z) => ({
            id: z.id,
            nombre: z.name,
            descripcion: z.description,
            tarifaDeliveryBs: z.baseDeliveryCost,
            tarifaMototaxiBs: calculateRideFare({
              zoneFare: z.baseRideCost,
              vehicleType: "MOTO",
              config: fareConfig,
            }).fare,
            tarifaMototaxiToritoBs: calculateRideFare({
              zoneFare: z.baseRideCost,
              vehicleType: "TORITO",
              config: fareConfig,
            }).fare,
            tiempoEstimadoMinutos: z.estimatedMinutes,
          })),
        };
      }

      let tarifaFinal: number;
      let tiempoEstimado: number;
      let detalleTarifa: Record<string, unknown> | null = null;

      if (args.tipo === "MOTOTAXI") {
        const breakdown = calculateRideFare({
          zoneFare: zone.baseRideCost,
          vehicleType: args.vehiculo,
          config: fareConfig,
        });
        tarifaFinal = breakdown.fare;
        tiempoEstimado = Math.max(10, zone.estimatedMinutes - 5);
        detalleTarifa = {
          tarifaBaseZonaBs: breakdown.baseFare,
          tarifaMinimaBs: breakdown.minimumFare,
          recargoToritoBs: breakdown.toritoSurcharge,
          minimoAplicado: breakdown.minimumApplied,
        };
      } else {
        tarifaFinal = zone.baseDeliveryCost;
        tiempoEstimado = zone.estimatedMinutes;
      }

      let paymentModes: string[] = [
        "Efectivo contra entrega",
        "QR Simple (cualquier banco boliviano o Tigo Money)",
      ];
      try {
        const business = await prisma.businessProfile.findFirst();
        if (business?.paymentModes) {
          const parsed = JSON.parse(business.paymentModes);
          if (Array.isArray(parsed)) {
            paymentModes = parsed.map((p: string) =>
              p === "EFECTIVO"
                ? "Efectivo contra entrega"
                : p === "QR_BANCO"
                ? "QR Simple Interbancario"
                : p === "TIGO_MONEY"
                ? "Tigo Money"
                : p
            );
          }
        }
      } catch {}

      return {
        tipoServicio: args.tipo,
        vehiculo: args.tipo === "MOTOTAXI" ? args.vehiculo || "MOTO" : undefined,
        destinoConsultado: args.destino,
        zonaAsignada: zone.name,
        zonaId: zone.id,
        tarifaBs: tarifaFinal,
        tarifaFormateada: `${tarifaFinal.toFixed(2)} Bs.`,
        detalleTarifa,
        tiempoEstimadoMinutos: tiempoEstimado,
        metodosPagoPermitidos: paymentModes,
        mensajeOficial:
          args.tipo === "MOTOTAXI"
            ? `🛵 Tarifa oficial de mototaxi hacia ${args.destino} (${zone.name}): ${tarifaFinal.toFixed(
                2
              )} Bs. (${args.vehiculo === "TORITO" ? "Torito Trimóvil" : "Moto individual"}). Tiempo aprox.: ${tiempoEstimado} min.`
            : `📦 Tarifa oficial de delivery hacia ${args.destino} (${zone.name}): ${tarifaFinal.toFixed(
                2
              )} Bs. Tiempo estimado de entrega: ${tiempoEstimado} min.`,
      };
    } catch (err: any) {
      console.error("[Tool: cotizar_tarifa] Error:", err);
      return {
        error: `Error al cotizar tarifa en la base de datos: ${err.message}`,
      };
    }
  },
};
