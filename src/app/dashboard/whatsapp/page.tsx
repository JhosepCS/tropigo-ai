import { prisma } from "@/lib/prisma";
import { WhatsAppClientView } from "./whatsapp-client";

export const dynamic = "force-dynamic";

export default async function WhatsAppPage() {
  const config = await prisma.whatsAppConfig.findFirst();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Configuración de WhatsApp (Dual-Engine)</h2>
        <p className="text-sm text-[#475467]">
          Cambia de proveedor en caliente sin reiniciar el negocio. Puedes utilizar la API Oficial de Meta o la conexión directa por código QR mediante Baileys.
        </p>
      </div>

      <WhatsAppClientView initialConfig={config as any} />
    </div>
  );
}
