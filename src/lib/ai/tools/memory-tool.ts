import { IAssistantTool } from "./types";
import { upsertCustomerMemoryFact, MemoryCategory } from "../../memory/customer-memory";

export interface MemoryFactInput {
  category: string;
  key: string;
  value: string;
}

export const memoryTool: IAssistantTool = {
  name: "guardar_memoria_cliente",
  description:
    "Guarda un dato útil y duradero sobre el cliente en su expediente personal. " +
    "Usa esta herramienta solo para información que sea relevante para futuras conversaciones " +
    "(ej: preferencias de comida, direcciones habituales, observaciones importantes). " +
    "NUNCA guardes datos sensibles como contraseñas, números de tarjeta o documentos de identidad.",
  parameters: {
    type: "object",
    properties: {
      categoria: {
        type: "string",
        enum: ["PERFIL", "PREFERENCIA", "DIRECCION", "OBSERVACION"],
        description: "La categoría del dato: PERFIL (nombre, datos básicos), PREFERENCIA (gustos, alergias), DIRECCION (lugares habituales), OBSERVACION (notas generales).",
      },
      clave: {
        type: "string",
        description: "Una etiqueta corta y clara para el dato (ej: 'bebida_favorita', 'referencia_casa', 'alergia_maní').",
      },
      valor: {
        type: "string",
        description: "El valor o descripción del dato a guardar.",
      },
    },
    required: ["categoria", "clave", "valor"],
  },
  async execute(
    args: { categoria: string; clave: string; valor: string },
    context?: any
  ) {
    if (!context?.customerId) {
      return { error: "No se pudo identificar al cliente para guardar el dato de memoria." };
    }

    const result = await upsertCustomerMemoryFact(
      context.customerId,
      {
        category: args.categoria,
        key: args.clave,
        value: args.valor,
      },
      { source: "AI_WHATSAPP" }
    );

    if (result.error) {
      return { exitoso: false, error: result.error };
    }

    return {
      exitoso: true,
      mensaje: `Dato guardado exitosamente: ${args.clave} = ${args.valor}`,
    };
  },
};
