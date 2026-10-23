import { prisma } from "@/lib/prisma";
import { Bike, Phone, MessageSquare, CheckCircle2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RepartidoresPage() {
  const riders = await prisma.rider.findMany({
    include: {
      orders: {
        where: { status: { in: ["RECIBIDO", "EN_PREPARACION", "EN_CAMINO"] } },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Flota de Repartidores (Motos Tropigo)</h2>
        <p className="text-sm text-[#475467]">
          Control de la flota de motocicletas en Ivirgarzama, disponibilidad y despacho directo de comandas por WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {riders.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-2xl border border-[#EAECF0] p-5 shadow-xs space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#101828]">{r.name}</h3>
                  <p className="text-xs text-[#667085] font-mono">Placa: {r.plateNumber}</p>
                </div>
              </div>

              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  r.isAvailable
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {r.isAvailable ? "Disponible" : "En Entrega"}
              </span>
            </div>

            <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#EAECF0] text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[#475467]">
                <span>Teléfono:</span>
                <span className="font-mono text-[#101828] font-medium">{r.phone}</span>
              </div>
              <div className="flex items-center justify-between text-[#475467]">
                <span>Pedidos en curso:</span>
                <span className="font-bold text-emerald-700">{r.orders.length}</span>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={`https://wa.me/${r.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                  "Hola " + r.name + ", tienes un nuevo pedido asignado en Tropigo Delivery."
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white py-2 rounded-xl text-xs font-semibold transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Enviar Comanda por WhatsApp</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
