import { prisma } from "@/lib/prisma";
import { CanalesClient } from "./canales-client";

export const dynamic = "force-dynamic";

export default async function CanalesPage() {
  const wpChannel = await prisma.channel.findUnique({ where: { type: "whatsapp" } });
  const webChannel = await prisma.channel.findUnique({ where: { type: "webchat" } });
  const business = await prisma.businessProfile.findFirst();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Canales de Comunicación</h2>
        <p className="text-sm text-[#475467]">
          Conecta el número de WhatsApp oficial del negocio con código QR y personaliza la burbuja de chat para tu sitio web.
        </p>
      </div>

      <CanalesClient
        initialWpChannel={wpChannel as any}
        initialWebChannel={webChannel as any}
        businessName={business?.name || "Clínica Dental Lumen"}
      />
    </div>
  );
}
