import { prisma } from "../../prisma";
import { IAssistantTool } from "./types";

export const catalogVisualTool: IAssistantTool = {
  name: "mostrar_catalogo_visual",
  description:
    "Consulta y devuelve las fotos y datos del menú visual de un restaurante de Ivirgarzama. " +
    "Úsala cuando el cliente solicite 'ver fotos de la comida', 'ver el menú con fotos', 'muéstrame fotos del plato' " +
    "o cuando quiera conocer la presentación de los productos de un comercio específico.",
  parameters: {
    type: "object",
    properties: {
      merchantNameOrId: {
        type: "string",
        description:
          "Nombre o ID del restaurante (ej: 'Pollos Don Mario', 'Pizzería Venecia', 'Comedor Doña Rosa').",
      },
      categoria: {
        type: "string",
        description:
          "Categoría opcional (ej: 'pollos', 'pizzas', 'bebidas', 'hamburguesas').",
      },
    },
    required: ["merchantNameOrId"],
  },
  execute: async (args: { merchantNameOrId: string; categoria?: string }) => {
    const term = (args.merchantNameOrId || "").trim();

    const merchant = await prisma.merchant.findFirst({
      where: {
        isOpen: true,
        OR: [
          { id: term },
          { name: { contains: term, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
      },
    });

    if (!merchant) {
      return {
        encontrado: false,
        error: `No se encontró un restaurante activo con el nombre o código '${term}'. Usa 'consultar_comercios_disponibles' para ver los restaurantes abiertos.`,
      };
    }

    const products = await prisma.product.findMany({
      where: {
        merchantId: merchant.id,
        isAvailable: true,
        ...(args.categoria
          ? {
              OR: [
                { category: { contains: args.categoria, mode: "insensitive" } },
                {
                  productCategory: {
                    name: { contains: args.categoria, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        images: {
          select: { imageUrl: true },
          take: 1,
        },
      },
      orderBy: { order: "asc" },
      take: 6,
    });

    if (products.length === 0) {
      return {
        encontrado: true,
        comercio: merchant.name,
        productos: [],
        mensaje: `El restaurante ${merchant.name} no tiene platos disponibles en este momento.`,
      };
    }

    const items = products.map((p) => {
      const img = p.images[0]?.imageUrl || p.imageUrl || null;
      return {
        id: p.id,
        nombre: p.name,
        precio: `${p.price.toFixed(2)} Bs.`,
        descripcion: p.description || "",
        fotoUrl: img,
        tieneFoto: Boolean(img),
      };
    });

    return {
      encontrado: true,
      comercio: merchant.name,
      cantidadProductos: items.length,
      productosConFoto: items.filter((i) => i.tieneFoto).length,
      menu: items,
      instruccionParaIA:
        `Presenta al cliente los platos de ${merchant.name} con sus precios en Bs. ` +
        `Si tienen imagen, el sistema enviará o describirá los platos destacados.`,
    };
  },
};
