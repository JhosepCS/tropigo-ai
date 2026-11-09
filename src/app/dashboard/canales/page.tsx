import { prisma } from "@/lib/prisma";
import { getMaskedWhatsAppStatus } from "@/lib/whatsapp/meta-manager";
import { CanalesClient } from "./canales-client";

export const dynamic = "force-dynamic";

export default async function CanalesPage() {
  const [wpChannel, webChannel, business, wpStatus] = await Promise.all([
    prisma.channel.findUnique({ where: { type: "whatsapp" } }),
    prisma.channel.findUnique({ where: { type: "webchat" } }),
    prisma.businessProfile.findFirst(),
    getMaskedWhatsAppStatus(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-[#101828]">Canales de Comunicación</h2>
        <p className="text-xs text-[#667085] mt-0.5">
          Conexión oficial de WhatsApp Business Cloud API de Meta y personalización de la burbuja web para TropiGO AI.
        </p>
      </div>

      <CanalesClient
        initialWpChannel={wpChannel as any}
        initialWebChannel={webChannel as any}
        initialWhatsAppStatus={wpStatus}
        businessName={business?.name || "TropiGO Ivirgarzama"}
      />
    </div>
  );
}
