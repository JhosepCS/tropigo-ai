import { prisma } from "@/lib/prisma";
import { ActividadClient } from "./actividad-client";

export const dynamic = "force-dynamic";

export default async function ActividadPage() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Registro de Actividad</h2>
        <p className="text-sm text-[#475467]">
          Historial completo de cada llamada a herramientas, citas creadas, consultas atendidas y eventos de integraciones con fecha, canal y resultado.
        </p>
      </div>

      <ActividadClient initialLogs={logs as any} />
    </div>
  );
}
