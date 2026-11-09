import { prisma } from "../../prisma";
import { IAssistantTool } from "./types";

export const merchantsTool: IAssistantTool = {
  name: "consultar_comercios",
  description:
    "Consulta los comercios y restaurantes oficiales registrados en TropiGO Ivirgarzama (nombre, categoría, teléfono, dirección, estado abierto/cerrado y calificación).",
  parameters: {
    type: "object",
    properties: {
      categoria: {
        type: "string",
        description: "Filtrar por categoría (ej: 'Pollería', 'Restaurante', 'Farmacia', 'Abarrotes', 'Mandados').",
      },
      soloAbiertos: {
        type: "boolean",
        description: "Si es true, muestra únicamente los comercios actualmente abiertos. Por defecto false para permitir consultar comercios cerrados.",
      },
      buscar: {
        type: "string",
        description: "Término de búsqueda para el nombre del comercio (ej: 'Pahuichi', 'Julia', 'Bolivia').",
      },
    },
  },
  async execute(args: { categoria?: string; soloAbiertos?: boolean; buscar?: string }) {
    try {
      const whereClause: any = {};

      if (args.soloAbiertos === true) {
        whereClause.isOpen = true;
      }

      if (args.categoria && args.categoria.trim()) {
        const catClean = args.categoria.trim();
        whereClause.OR = [
          { category: { contains: catClean, mode: "insensitive" } },
          { commercialCategory: { name: { contains: catClean, mode: "insensitive" } } },
        ];
      }

      if (args.buscar && args.buscar.trim()) {
        const term = args.buscar.trim();
        whereClause.AND = [
          {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { description: { contains: term, mode: "insensitive" } },
            ],
          },
        ];
      }

      const merchants = await prisma.merchant.findMany({
        where: whereClause,
        include: {
          commercialCategory: true,
          city: true,
          schedules: true,
          _count: {
            select: { products: { where: { isAvailable: true } } },
          },
        },
        orderBy: [{ isOpen: "desc" }, { rating: "desc" }],
        take: 10,
      });

      if (merchants.length === 0) {
        return {
          encontrados: 0,
          mensaje: "No se encontraron comercios registrados en Ivirgarzama que coincidan con los criterios.",
          comercios: [],
        };
      }

      const formatted = merchants.map((m) => {
        // Limpiar etiqueta de demo si existe para que la respuesta sea profesional
        const cleanName = m.name.replace(/^\[DEMO\]\s*/i, "");
        return {
          id: m.id,
          nombre: cleanName,
          categoria: m.commercialCategory?.name || m.category,
          abierto: m.isOpen,
          calificacion: m.rating,
          direccion: m.address,
          telefono: m.phone,
          platosDisponibles: m._count.products,
          descripcion: m.description,
        };
      });

      return {
        encontrados: formatted.length,
        mensaje: `Se encontraron ${formatted.length} comercios registrados en TropiGO Ivirgarzama:`,
        comercios: formatted,
      };
    } catch (err: any) {
      console.error("[Tool: consultar_comercios] Error al consultar base de datos:", err);
      return {
        error: `Error interno al consultar comercios: ${err.message}`,
        comercios: [],
      };
    }
  },
};
