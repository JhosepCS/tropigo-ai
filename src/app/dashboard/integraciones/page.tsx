import { prisma } from "@/lib/prisma";
import { IntegracionesClient } from "./integraciones-client";

export const dynamic = "force-dynamic";

export default async function IntegracionesPage() {
  const integrations = await prisma.integration.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Catálogo de Integraciones</h2>
        <p className="text-sm text-[#475467]">
          Conecta herramientas externas para dotar al asistente de superpoderes: agendar citas en Google Calendar, enviar correos con Gmail, guardar contactos en Sheets, avisar por Slack, cobrar señales con Stripe o disparar Webhooks.
        </p>
      </div>

      <IntegracionesClient initialIntegrations={integrations as any} />
    </div>
  );
}
