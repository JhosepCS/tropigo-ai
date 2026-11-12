import { IAssistantTool } from "./types";

/**
 * Herramienta que marca la respuesta para que el canal envíe el botón nativo
 * de "compartir ubicación" (WhatsApp Cloud API) en lugar de un texto plano.
 * El contenido de texto sigue siendo la respuesta del asistente.
 */
export const locationRequestTool: IAssistantTool = {
  name: "solicitar_ubicacion",
  description:
    "Solicita al cliente que comparta su ubicación GPS con el botón nativo de WhatsApp para calcular el delivery desde la Plaza Principal de Ivirgarzama. " +
    "Úsala cuando el cliente pida delivery y todavía no haya compartido una ubicación ni indicado un barrio/zona con claridad. " +
    "Después de llamarla, escribe un mensaje breve explicando que debe pulsar el botón para enviar su ubicación.",
  parameters: {
    type: "object",
    properties: {
      motivo: {
        type: "string",
        description:
          "Motivo breve, por ejemplo: 'calcular el costo de delivery' o 'confirmar el punto de entrega'.",
      },
    },
  },
  async execute(args: { motivo?: string }) {
    const motivo = String(args?.motivo || "calcular el costo de delivery").trim();
    return {
      solicitarUbicacion: true,
      motivo,
      mensaje:
        `📍 Para ${motivo}, comparte tu ubicación con el botón de abajo. ` +
        `También puedes escribir el nombre de tu barrio o una referencia (por ejemplo: "cerca de la plaza", "barrio Magisterio").`,
      instruccion:
        "El canal enviará el botón nativo de ubicación. No inventes coordenadas ni distancias.",
    };
  },
};
