import { IAssistantTool } from "./types";

export const handoffTool: IAssistantTool = {
  name: "pasar_a_humano",
  description:
    "Transfiere la conversación a una operadora humana de TropiGO. Úsala cuando el cliente " +
    "presente una queja o reclamo, pida hablar con una persona, haya una urgencia, o el " +
    "asistente no pueda resolver la consulta con los datos oficiales.",
  parameters: {
    type: "object",
    properties: {
      motivo: {
        type: "string",
        description: "Motivo breve de la transferencia (ej: 'reclamo por pedido frío', 'solicita operadora', 'consulta fuera de cobertura').",
      },
    },
    required: ["motivo"],
  },
  async execute(args: { motivo?: string }) {
    return {
      derivado: true,
      operatorHandoff: true,
      motivo: args?.motivo || "Solicitud de atención humana",
      mensaje:
        "He avisado a nuestra operadora de despacho en Ivirgarzama para que tome la conversación y te atienda enseguida.",
    };
  },
};
