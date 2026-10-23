import { prisma } from "@/lib/prisma";
import { AjustesClient } from "./ajustes-client";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const business = await prisma.businessProfile.findFirst();
  const assistant = await prisma.assistantConfig.findFirst();
  const admin = await prisma.user.findFirst();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Ajustes del Sistema & Configuración</h2>
        <p className="text-sm text-[#475467]">
          Personaliza la empresa de delivery, los modelos de Inteligencia Artificial (OpenRouter), transcripción de notas de voz de WhatsApp y seguridad.
        </p>
      </div>

      <AjustesClient
        initialBusiness={business as any}
        initialAssistant={assistant as any}
        adminEmail={admin?.email || "admin@tropigo.bo"}
      />
    </div>
  );
}
