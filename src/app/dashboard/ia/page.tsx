import { ModelRouter } from "@/lib/ai/model-router";
import { getAssistantConfig } from "@/lib/ai/config-manager";
import { IAClient } from "./ia-client";

export const dynamic = "force-dynamic";

export default async function IAPage() {
  const [providers, assistantConfig] = await Promise.all([
    ModelRouter.getProvidersStatus(),
    getAssistantConfig(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black text-[#101828]">
            AI Studio — Personalización del Asistente
          </h2>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
            TropiGO AI • Ivirgarzama
          </span>
        </div>
        <p className="text-xs text-[#667085] mt-0.5">
          Configura la identidad, tono de voz, instrucciones personalizadas, reglas comerciales de delivery y modelos de IA sin escribir código.
        </p>
      </div>

      <IAClient
        initialProviders={providers}
        initialAssistantConfig={assistantConfig}
      />
    </div>
  );
}
