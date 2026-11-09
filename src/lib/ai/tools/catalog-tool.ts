import { prisma } from "../../prisma";
import { IAssistantTool } from "./types";

export const catalogTool: IAssistantTool = {
  name: "consultar_catalogo",
  description:
    "Consulta el catálogo oficial de productos y platos disponibles en los comercios de Ivirgarzama con precios en Bolivianos (Bs.).",
  parameters: {
    type: "object",
    properties: {
      comercio: {
        type: "string",
        description: "Nombre del comercio o restaurante a consultar (ej: 'El Pahuichi', 'Doña Julia', 'Farmacia Bolivia').",
      },
      categoria: {
        type: "string",
        description: "Categoría de producto (ej: 'Platos Broaster', 'Almuerzos y Platos Típicos', 'Bebidas').",
      },
      buscar: {
        type: "string",
        description: "Término de búsqueda de producto (ej: 'pollo', 'pique', 'majadito', 'paracetamol').",
      },
      soloDisponibles: {
        type: "boolean",
        description: "Si es true, solo retorna platos con disponibilidad activa en cocina. Por defecto true.",
      },
    },
  },
  async execute(args: {
    comercio?: string;
    categoria?: string;
    buscar?: string;
    soloDisponibles?: boolean;
  }) {
    try {
      const whereClause: any = {};

      if (args.soloDisponibles !== false) {
        whereClause.isAvailable = true;
      }

      if (args.comercio && args.comercio.trim()) {
        const comTerm = args.comercio.trim();
        whereClause.merchant = {
          name: { contains: comTerm, mode: "insensitive" },
        };
      }

      if (args.categoria && args.categoria.trim()) {
        const catTerm = args.categoria.trim();
        whereClause.OR = [
          { category: { contains: catTerm, mode: "insensitive" } },
          { productCategory: { name: { contains: catTerm, mode: "insensitive" } } },
        ];
      }

      if (args.buscar && args.buscar.trim()) {
        const search = args.buscar.trim();
        whereClause.AND = [
          {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          },
        ];
      }

      const products = await prisma.product.findMany({
        where: whereClause,
        include: {
          merchant: true,
          productCategory: true,
          variants: { where: { isAvailable: true } },
          optionGroups: { include: { items: true } },
        },
        orderBy: [{ merchant: { name: "asc" } }, { price: "asc" }],
        take: 15,
      });

      if (products.length === 0) {
        return {
          total: 0,
          mensaje:
            "No se encontraron platos o productos disponibles que coincidan con la búsqueda en los comercios de Ivirgarzama.",
          productos: [],
        };
      }

      const formatted = products.map((p) => {
        const cleanProductName = p.name.replace(/^\[DEMO\]\s*/i, "");
        const cleanMerchantName = p.merchant.name.replace(/^\[DEMO\]\s*/i, "");

        return {
          id: p.id,
          nombre: cleanProductName,
          comercio: cleanMerchantName,
          comercioAbierto: p.merchant.isOpen,
          categoria: p.productCategory?.name || p.category || "General",
          precioBs: p.price,
          precioTexto: `${p.price.toFixed(2)} Bs.`,
          disponible: p.isAvailable,
          tiempoPreparacionMinutos: p.preparationMinutes || 15,
          descripcion: p.description,
          variantes: p.variants.map((v) => ({
            nombre: v.name,
            precioBs: v.finalPrice,
          })),
          opciones: p.optionGroups.map((og) => ({
            grupo: og.name,
            opciones: og.items.map((it) => ({
              nombre: it.name,
              precioAdicionalBs: it.additionalPrice,
            })),
          })),
        };
      });

      return {
        total: formatted.length,
        mensaje: `Se encontraron ${formatted.length} productos en el catálogo oficial de TropiGO:`,
        productos: formatted,
      };
    } catch (err: any) {
      console.error("[Tool: consultar_catalogo] Error:", err);
      return {
        error: `Error al consultar catálogo de productos: ${err.message}`,
        productos: [],
      };
    }
  },
};
