import { prisma } from "../../prisma";
import { IAssistantTool } from "./types";
import { getOrderForCustomer, OrderToolContext } from "../../orders/order-service";

const ADMIN_ROLES = ["SUPERADMIN", "ADMIN", "OPERATOR"];

export const ordersTool: IAssistantTool = {
  name: "consultar_estado_pedido",
  description:
    "Consulta el estado en vivo de un pedido de delivery (código TRP-XXXX) o carrera de mototaxi (código VIAJE-XXXX). " +
    "Para pedidos de delivery, la consulta se limita estrictamente al cliente de la conversación; un cliente no puede ver pedidos de otro. " +
    "Si no se indica código, devuelve los pedidos recientes del cliente identificado en el canal.",
  parameters: {
    type: "object",
    properties: {
      codigo: {
        type: "string",
        description: "Código de orden o viaje (ej: 'TRP-1041', 'VIAJE-2001').",
      },
    },
  },
  async execute(args: { codigo?: string }, context?: OrderToolContext) {
    try {
      const ctx = context || {};

      if (args.codigo && args.codigo.trim()) {
        const cleanCode = args.codigo.trim().toUpperCase();

        // 1. Pedido de delivery: siempre pasa por el servicio central, que
        // aplica el filtro por cliente y evita búsquedas difusas.
        if (!cleanCode.startsWith("VIAJE-")) {
          const result = await getOrderForCustomer(cleanCode, ctx);
          if (result.encontrado || cleanCode.startsWith("TRP-")) {
            return result;
          }
        }

        // 2. Carrera de mototaxi: también se limita al cliente de la conversación.
        const rideWhere: any = { tripNumber: cleanCode };
        if (ctx.customerId) {
          rideWhere.customerId = ctx.customerId;
        } else if (!ADMIN_ROLES.includes(ctx.actorRole || "")) {
          return {
            encontrado: false,
            error:
              "No se pudo identificar al cliente para consultar esta carrera. Solicita el código y que escriba desde su WhatsApp registrado.",
          };
        }

        const ride = await prisma.rideTrip.findFirst({
          where: rideWhere,
          include: { assignedRider: true },
        });

        if (ride) {
          const cleanRiderName =
            ride.assignedRider?.name.replace(/^\[DEMO\]\s*/i, "") || "Buscando conductor cercano";
          const rideStatusTranslations: Record<string, string> = {
            SOLICITADO: "Solicitado (buscando mototaxi más cercana)",
            CONDUCTOR_ASIGNADO: "Conductor asignado en camino al punto de partida",
            EN_CURSO: "En curso hacia el destino",
            FINALIZADO: "Carrera finalizada",
            CANCELADO: "Cancelado",
          };

          return {
            tipo: "MOTOTAXI",
            encontrado: true,
            codigo: ride.tripNumber,
            vehiculo: ride.vehicleType === "TORITO_TRIMOVIL" ? "Torito Trimóvil" : "Mototaxi",
            estadoInterno: ride.status,
            estadoLegible: rideStatusTranslations[ride.status] || ride.status,
            tarifaBs: ride.fareAmount,
            origen: ride.originAddress,
            destino: ride.destinationAddress,
            conductor: cleanRiderName,
            telefonoConductor: ride.assignedRider?.phone || null,
            mensaje: `🛵 Tu viaje ${ride.tripNumber} se encuentra: *${
              rideStatusTranslations[ride.status] || ride.status
            }*. Conductor: ${cleanRiderName}. Tarifa: ${ride.fareAmount.toFixed(2)} Bs.`,
          };
        }

        return {
          encontrado: false,
          codigoBuscado: cleanCode,
          mensaje: `No se encontró ningún pedido o carrera con el código "${cleanCode}" para este cliente. Verifica el código o solicita ayuda a un operador.`,
        };
      }

      // 3. Sin código: solo pedidos recientes del cliente identificado.
      if (!ctx.customerId) {
        return {
          encontrado: false,
          error:
            "Para consultar pedidos recientes necesito identificar al cliente. Solicita el código TRP-XXXX o que escriba desde su WhatsApp registrado.",
        };
      }

      const customer = await prisma.customer.findUnique({
        where: { id: ctx.customerId },
        include: {
          orders: {
            orderBy: { createdAt: "desc" },
            take: 3,
            include: { merchant: true, assignedRider: true },
          },
        },
      });

      if (customer && customer.orders.length > 0) {
        const latest = customer.orders[0];
        const cleanMerchantName =
          latest.merchant?.name.replace(/^\[DEMO\]\s*/i, "") || "Comercio";

        return {
          encontrado: true,
          busquedaPorCliente: true,
          pedidosRecientes: customer.orders.map((order) => ({
            codigo: order.orderNumber,
            comercio: order.merchant?.name.replace(/^\[DEMO\]\s*/i, "") || "Comercio",
            estado: order.status,
            totalBs: order.totalAmount,
            creadoEn: order.createdAt.toISOString(),
          })),
          mensaje: `Encontramos tu último pedido ${latest.orderNumber} (${cleanMerchantName}) en estado: *${latest.status}*.`,
        };
      }

      return {
        encontrado: false,
        mensaje: "No se encontraron pedidos recientes para este cliente.",
      };
    } catch (err: any) {
      console.error("[Tool: consultar_estado_pedido] Error:", err);
      return {
        error: `Error al consultar estado de pedido en base de datos: ${err.message}`,
      };
    }
  },
};
