import { prisma } from "../../prisma";
import { IAssistantTool } from "./types";

export const pricingTool: IAssistantTool = {
  name: "consultar_precios_disponibilidad",
  description:
    "Verifica el precio oficial exacto en Bolivianos (Bs.), disponibilidad en cocina y opciones o variantes de un plato o producto específico.",
  parameters: {
    type: "object",
    properties: {
      producto: {
        type: "string",
        description: "Nombre del producto o plato a verificar (ej: 'Cuarto de Pollo a la Broaster', 'Majadito', 'Pique Macho').",
      },
      comercio: {
        type: "string",
        description: "Nombre del restaurante o comercio opcional (ej: 'El Pahuichi', 'Doña Julia').",
      },
    },
    required: ["producto"],
  },
  async execute(args: { producto: string; comercio?: string }) {
    try {
      if (!args.producto || !args.producto.trim()) {
        return {
          error: "Debe especificar el nombre del producto o plato para consultar su precio y disponibilidad.",
        };
      }

      const prodTerm = args.producto.trim();
      const whereClause: any = {
        OR: [
          { name: { contains: prodTerm, mode: "insensitive" } },
          { description: { contains: prodTerm, mode: "insensitive" } },
        ],
      };

      if (args.comercio && args.comercio.trim()) {
        whereClause.merchant = {
          name: { contains: args.comercio.trim(), mode: "insensitive" },
        };
      }

      const products = await prisma.product.findMany({
        where: whereClause,
        include: {
          merchant: true,
          variants: true,
          optionGroups: { include: { items: true } },
        },
        take: 5,
      });

      if (products.length === 0) {
        return {
          encontrado: false,
          productoBuscado: args.producto,
          mensaje: `El producto o plato "${args.producto}" no fue encontrado en la base de datos oficial de TropiGO Ivirgarzama. No inventes precios ni confirmes pedidos de este ítem.`,
        };
      }

      const resultados = products.map((p) => {
        const cleanProductName = p.name.replace(/^\[DEMO\]\s*/i, "");
        const cleanMerchantName = p.merchant.name.replace(/^\[DEMO\]\s*/i, "");

        return {
          id: p.id,
          producto: cleanProductName,
          comercio: cleanMerchantName,
          comercioAbierto: p.merchant.isOpen,
          precioBaseBs: p.price,
          precioFormateado: `${p.price.toFixed(2)} Bs.`,
          disponibleEnCocina: p.isAvailable,
          tiempoEstimadoMinutos: p.preparationMinutes || 15,
          variantes: p.variants.map((v) => ({
            nombre: v.name,
            precioBs: v.finalPrice,
            disponible: v.isAvailable,
          })),
          guarnicionesOpciones: p.optionGroups.map((og) => ({
            nombreGrupo: og.name,
            esObligatorio: og.isRequired,
            adicionales: og.items.map((it) => ({
              nombre: it.name,
              precioBs: it.additionalPrice,
            })),
          })),
        };
      });

      return {
        encontrado: true,
        total: resultados.length,
        resultados,
        instruccionIA:
          "Utiliza exclusivamente estos precios en Bolivianos (Bs.) y advierte al cliente si el producto o comercio no están disponibles en este momento.",
      };
    } catch (err: any) {
      console.error("[Tool: consultar_precios_disponibilidad] Error:", err);
      return {
        error: `Error al consultar precio y disponibilidad: ${err.message}`,
      };
    }
  },
};
