import { prisma } from "@/lib/prisma";
import { ConocimientoClient } from "./conocimiento-client";

export const dynamic = "force-dynamic";

export default async function ConocimientoPage() {
  const business = await prisma.businessProfile.findFirst();
  const services = await prisma.service.findMany({
    orderBy: { order: "asc" },
  });
  const faqs = await prisma.faq.findMany({
    orderBy: { order: "asc" },
  });
  const kb = await prisma.knowledgeBase.findFirst();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Conocimiento del Negocio</h2>
        <p className="text-sm text-[#475467]">
          Toda la información con la que el asistente responde a los clientes: datos de la clínica, catálogo de servicios, precios y preguntas frecuentes.
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
