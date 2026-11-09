import { prisma } from "../../prisma";
import { IAssistantTool } from "./types";

export const zonesTool: IAssistantTool = {
  name: "consultar_zonas_cobertura",
  description:
    "Consulta las zonas de cobertura activas en Ivirgarzama para envíos de comida, compras y carreras en mototaxi, con sus tiempos estimados y costos base.",
  parameters: {
    type: "object",
    properties: {
      buscar: {
        type: "string",
        description: "Nombre del barrio, avenida o comunidad (ej: 'Centro', 'Av. Mortensen', 'Villa 14', 'Senda III', 'Mercado Central').",
      },
    },
  },
  async execute(args: { buscar?: string }) {
    try {
      const whereClause: any = { isActive: true };

      if (args.buscar && args.buscar.trim()) {
        const term = args.buscar.trim();
        whereClause.OR = [
          { name: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
        ];
      }

      const zones = await prisma.deliveryZone.findMany({
        where: whereClause,
        include: { city: true },
        orderBy: { baseDeliveryCost: "asc" },
      });

      if (zones.length === 0) {
        return {
          total: 0,
          mensaje:
            "No se encontró cobertura oficial para la zona consultada en Ivirgarzama. Consulta a la operadora humana si el cliente solicita un viaje especial fuera del radio urbano.",
          zonas: [],
        };
      }

      const formatted = zones.map((z) => ({
        id: z.id,
        nombre: z.name,
        localidad: z.city?.name || "Ivirgarzama",
        descripcion: z.description,
        tarifaBaseDeliveryBs: z.baseDeliveryCost,
        tarifaBaseMototaxiBs: z.baseRideCost,
        tiempoEstimadoMinutos: z.estimatedMinutes,
      }));

      return {
        total: formatted.length,
        mensaje: `Zonas de cobertura activas en Ivirgarzama (${formatted.length} zonas):`,
        zonas: formatted,
      };
    } catch (err: any) {
      console.error("[Tool: consultar_zonas_cobertura] Error:", err);
      return {
        error: `Error al consultar zonas de cobertura: ${err.message}`,
        zonas: [],
      };
    }
  },
};
