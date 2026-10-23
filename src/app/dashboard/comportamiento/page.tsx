import { prisma } from "@/lib/prisma";
import { ComportamientoClient } from "./comportamiento-client";

export const dynamic = "force-dynamic";

export default async function ComportamientoPage() {
  const assistant = await prisma.assistantConfig.findFirst();
  const business = await prisma.businessProfile.findFirst();
  const services = await prisma.service.findMany({ where: { isActive: true } });
  const faqs = await prisma.faq.findMany();
  const kb = await prisma.knowledgeBase.findFirst();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Comportamiento del Asistente</h2>
        <p className="text-sm text-[#475467]">
          Configura la personalidad, tono, mensajes, horario de atención y las reglas de escalado a personas.
        </p>
      </div>

      <ComportamientoClient
        initialAssistant={assistant as any}
        business={business as any}
        services={services as any}
        faqs={faqs as any}
        knowledgeBaseText={kb?.freeText || ""}
      />
    </div>
  );
}
