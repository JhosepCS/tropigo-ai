import { IAssistantTool } from "./types";
import { getActivePromotionsNow } from "../../promotions/active-promos";

export const promotionsTool: IAssistantTool = {
  name: "consultar_promociones",
  description:
    "Consulta las promociones, cupones y descuentos vigentes en este momento en TropiGO. " +
    "Úsala cuando el cliente pregunte si hay ofertas, descuentos, rebajas del día o promociones activas.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async () => {
    const promos = await getActivePromotionsNow();

    if (promos.length === 0) {
      return {
        hayPromociones: false,
        mensaje: "En este momento no hay promociones activas registradas en el sistema.",
      };
    }

    return {
      hayPromociones: true,
      promocionesActivas: promos.map((p) => ({
        codigo: p.code,
        titulo: p.title,
        descuento:
          p.discountType === "PERCENTAGE"
            ? `${p.discountValue}%`
            : `${p.discountValue.toFixed(2)} Bs.`,
        pedidoMinimo: `${p.minOrderAmount.toFixed(2)} Bs.`,
        comercio: p.merchantName || "Aplica a pedidos generales",
        mensajeAnuncio: p.announceMessage,
      })),
      instruccion:
        "Presenta las promociones amablemente al cliente e indícale su código o beneficio.",
    };
  },
};
