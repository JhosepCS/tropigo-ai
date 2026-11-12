import { prisma } from "../../prisma";
import { IAssistantTool } from "./types";
import { findActiveZoneForQuery, OrderToolContext } from "../../orders/order-service";
import { calculateRideFare, getRideFareConfig } from "../../rides/fare";
import {
  estimarTiempoMinutos,
} from "../../geo/distance";
import { calcularDeliveryDesdeCentro } from "../../geo/delivery-center";
import { getEnabledPaymentMethods } from "../../payments/service";

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
      latitud: {
        type: "number",
        description:
          "Latitud GPS del cliente, si la compartió por WhatsApp. Permite calcular distancia real estimada.",
      },
      longitud: {
        type: "number",
        description:
          "Longitud GPS del cliente, si la compartió por WhatsApp. Permite calcular distancia real estimada.",
      },
    },
    required: ["tipo", "destino"],
  },
  async execute(
    args: {
      tipo: "DELIVERY" | "MOTOTAXI";
      destino: string;
      vehiculo?: "MOTO" | "TORITO";
      comercio?: string;
      latitud?: number;
      longitud?: number;
    },
    context?: OrderToolContext
  ) {
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
      let distanciaKm: number | null = null;
      let recargoDistancia = 0;
      let centroNombre = "Plaza Principal de Ivirgarzama";
      let kmIncluidos = 2;
      let recargoPorKm = 0;
      let tipoDistancia: "real por Google Maps" | "estimada línea recta × 1.3" =
        "estimada línea recta × 1.3";

      // Distancia real estimada desde la Plaza Principal de Ivirgarzama hasta
      // la ubicación del cliente. Si no compartió GPS en este mensaje, se usa
      // la última ubicación guardada en su perfil. Nunca se inventan datos.
      if (args.tipo === "DELIVERY") {
        const deliveryDistance = await calcularDeliveryDesdeCentro({
          latitud: args.latitud,
          longitud: args.longitud,
          customerId: context?.customerId,
        });

        if (deliveryDistance) {
          distanciaKm = deliveryDistance.distanceKm;
          recargoDistancia = deliveryDistance.surcharge;
          centroNombre = deliveryDistance.centerName;
          kmIncluidos = deliveryDistance.includedKm;
          recargoPorKm = deliveryDistance.perKmFee;
          tipoDistancia =
            deliveryDistance.tipoDistancia === "real_maps"
              ? "real por Google Maps"
              : "estimada línea recta × 1.3";
        }
      } else if (
        typeof args.latitud === "number" &&
        typeof args.longitud === "number" &&
        args.comercio
      ) {
        // Para mototaxi (fuera del alcance actual) se conserva el ETA desde el
        // comercio si hay coordenadas configuradas.
        const merchants = await prisma.merchant.findMany({
          select: { name: true, latitude: true, longitude: true },
        });
        const normalized = args.comercio
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();
        const merchant = merchants.find((item) =>
          item.name
            .replace(/^\[DEMO\]\s*/i, "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .includes(normalized)
        );

        if (merchant?.latitude != null && merchant?.longitude != null) {
          const { estimarDistanciaRutaKm } = await import("../../geo/distance");
          distanciaKm = estimarDistanciaRutaKm(
            { latitude: merchant.latitude, longitude: merchant.longitude },
            { latitude: args.latitud, longitude: args.longitud }
          );
        }
      }

      if (args.tipo === "MOTOTAXI") {
        const breakdown = calculateRideFare({
          zoneFare: zone.baseRideCost,
          vehicleType: args.vehiculo,
          config: fareConfig,
        });
        tarifaFinal = breakdown.fare;
        tiempoEstimado = Math.max(
          10,
          distanciaKm != null
            ? estimarTiempoMinutos(distanciaKm)
            : zone.estimatedMinutes - 5
        );
        detalleTarifa = {
          tarifaBaseZonaBs: breakdown.baseFare,
          tarifaMinimaBs: breakdown.minimumFare,
          recargoToritoBs: breakdown.toritoSurcharge,
          minimoAplicado: breakdown.minimumApplied,
        };
      } else {
        tarifaFinal = Math.round((zone.baseDeliveryCost + recargoDistancia) * 100) / 100;
        tiempoEstimado =
          distanciaKm != null
            ? Math.max(zone.estimatedMinutes, estimarTiempoMinutos(distanciaKm))
            : zone.estimatedMinutes;

        detalleTarifa = {
          tarifaBaseZonaBs: zone.baseDeliveryCost,
          centroDistancia: centroNombre,
          kmIncluidos,
          recargoPorKmBs: recargoPorKm,
          recargoDistanciaBs: recargoDistancia,
        };
      }

      const enabledMethods = await getEnabledPaymentMethods();
      const paymentModes = enabledMethods.map((method) =>
        method.type === "CASH"
          ? "Efectivo contra entrega"
          : method.accountNumber
          ? `${method.label} (${method.accountNumber})`
          : method.label
      );

      return {
        tipoServicio: args.tipo,
        vehiculo: args.tipo === "MOTOTAXI" ? args.vehiculo || "MOTO" : undefined,
        destinoConsultado: args.destino,
        zonaAsignada: zone.name,
        zonaId: zone.id,
        tarifaBs: tarifaFinal,
        tarifaFormateada: `${tarifaFinal.toFixed(2)} Bs.`,
        detalleTarifa,
        distanciaKm,
        tipoDistancia: distanciaKm != null ? tipoDistancia : undefined,
        centroDistancia: args.tipo === "DELIVERY" ? centroNombre : null,
        recargoDistanciaBs: recargoDistancia,
        tiempoEstimadoMinutos: tiempoEstimado,
        metodosPagoPermitidos: paymentModes,
        mensajeOficial:
          args.tipo === "MOTOTAXI"
            ? `🛵 Tarifa oficial de mototaxi hacia ${args.destino} (${zone.name}): ${tarifaFinal.toFixed(
                2
              )} Bs. (${args.vehiculo === "TORITO" ? "Torito Trimóvil" : "Moto individual"}). Tiempo aprox.: ${tiempoEstimado} min.`
            : `📦 Tarifa oficial de delivery hacia ${args.destino} (${zone.name}): ${tarifaFinal.toFixed(
                2
              )} Bs.` +
              (distanciaKm != null
                ? ` Distancia desde ${centroNombre}: ${distanciaKm.toFixed(
                    1
                  )} km por ruta.`
                : "") +
              ` Tiempo estimado de entrega: ${tiempoEstimado} min.`,
      };
    } catch (err: any) {
      console.error("[Tool: cotizar_tarifa] Error:", err);
      return {
        error: `Error al cotizar tarifa en la base de datos: ${err.message}`,
      };
    }
  },
};
