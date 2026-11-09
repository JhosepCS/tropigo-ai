import { prisma } from "@/lib/prisma";
import { getMaskedWhatsAppStatus } from "@/lib/whatsapp/meta-manager";
import { AjustesClient } from "./ajustes-client";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const [business, agency, users, whatsappStatus] = await Promise.all([
    prisma.businessProfile.findFirst(),
    prisma.agencyProfile.findFirst(),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    getMaskedWhatsAppStatus(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-[#101828]">
          Ajustes de TropiGO & Conexiones
        </h2>
        <p className="text-xs text-[#667085] mt-0.5">
          Conexión oficial de WhatsApp Business Cloud API de Meta, datos de la empresa en Ivirgarzama y gestión del sistema.
        </p>
      </div>

      <AjustesClient
        initialBusiness={business as any}
        initialAgency={agency as any}
        users={users as any}
        initialWhatsAppStatus={whatsappStatus}
      />
    </div>
  );
}
