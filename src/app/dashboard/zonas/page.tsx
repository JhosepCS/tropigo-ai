import { prisma } from "@/lib/prisma";
import { MapPin, Plus, Clock, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ZonasPage() {
  const zones = await prisma.deliveryZone.findMany({
    orderBy: { baseCost: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Zonas y Tarifario de Ivirgarzama</h2>
        <p className="text-sm text-[#475467]">
          Tarifas de envío fijadas por barrio o sindicato en el Trópico de Cochabamba. TropiBot utiliza esta tabla para cotizar el delivery automáticamente al recibir la ubicación del cliente.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
          <h3 className="font-semibold text-sm text-[#101828]">Tarifas Geográficas Vigentes</h3>
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium border border-emerald-200">
            Moneda: Bolivianos (Bs.)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((z) => (
            <div
              key={z.id}
              className="p-4 rounded-xl border border-[#EAECF0] hover:border-emerald-300 transition-colors bg-[#FAFAFA] space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-xs text-[#101828]">{z.name}</h4>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {z.baseCost.toFixed(2)} Bs.
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-[#667085] pt-2 border-t border-[#EAECF0]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#98A2B3]" />
                  <span>~{z.estimatedMinutes} minutos</span>
                </div>
                <span className="text-[11px] font-medium text-emerald-700">Activo</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
