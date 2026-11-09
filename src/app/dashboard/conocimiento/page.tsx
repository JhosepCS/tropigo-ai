import { prisma } from "@/lib/prisma";
import { ConocimientoClient } from "./conocimiento-client";

export const dynamic = "force-dynamic";

export default async function ConocimientoPage() {
  const [business, services, faqs, kb] = await Promise.all([
    prisma.businessProfile.findFirst(),
    prisma.service.findMany({ orderBy: { order: "asc" } }),
    prisma.faq.findMany({ orderBy: { order: "asc" } }),
    prisma.knowledgeBase.findFirst(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-[#101828]">
          Base de Conocimiento de TropiGO
        </h2>
        <p className="text-xs text-[#667085] mt-0.5">
          Toda la información con la que TropiBot atiende consultas: datos de Ivirgarzama, tarifas en Bs., políticas de lluvia y preguntas frecuentes.
        </p>
      </div>

      <ConocimientoClient
        initialBusiness={business as any}
        initialServices={services as any}
        initialFaqs={faqs as any}
        initialFreeText={kb?.freeText || ""}
      />
    </div>
  );
}
