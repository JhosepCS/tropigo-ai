"use client";

import { useState } from "react";
import { Utensils, Plus, Check, X, Store, Tag } from "lucide-react";

interface CatalogoClientProps {
  initialMerchants: any[];
}

export function CatalogoClient({ initialMerchants }: CatalogoClientProps) {
  const [merchants, setMerchants] = useState(initialMerchants);
  const [selectedMerchantId, setSelectedMerchantId] = useState(
    initialMerchants[0]?.id || null
  );

  const activeMerchant = merchants.find((m) => m.id === selectedMerchantId);

  const handleToggleProductAvailability = async (productId: string, current: boolean) => {
    const nextVal = !current;
    setMerchants((prev) =>
      prev.map((m) => ({
        ...m,
        products: m.products.map((p: any) =>
          p.id === productId ? { ...p, isAvailable: nextVal } : p
        ),
      }))
    );

    try {
      await fetch("/api/catalog/toggle-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, isAvailable: nextVal }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Lista de Comercios Afiliados */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-[#EAECF0] p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#EAECF0]">
          <h3 className="font-semibold text-xs text-[#101828]">Comercios Afiliados</h3>
          <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
            {merchants.length} locales
          </span>
        </div>

        <div className="space-y-2">
          {merchants.map((m) => {
            const isSelected = m.id === selectedMerchantId;

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMerchantId(m.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-emerald-50/50 border-emerald-500 shadow-xs"
                    : "bg-white border-[#EAECF0] hover:border-[#D0D5DD]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-[#101828]">{m.name}</h4>
                  <span className="text-[10px] bg-[#F2F4F7] text-[#344054] px-1.5 py-0.5 rounded-md font-medium">
                    {m.category}
                  </span>
                </div>
                <p className="text-[11px] text-[#667085] mt-1">{m.address}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#667085]">
                  <span>{m.products.length} productos</span>
                  <span className="text-emerald-700 font-medium">
                    Comisión: {(m.commissionRate * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Menú y Productos del Comercio Seleccionado */}
      {activeMerchant ? (
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#EAECF0]">
            <div>
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-[#101828]">
                  {activeMerchant.name}
                </h3>
              </div>
              <p className="text-xs text-[#667085] mt-0.5">
                {activeMerchant.category} • {activeMerchant.address} • Tel: {activeMerchant.phone}
              </p>
            </div>
          </div>

          {/* Tabla de Productos */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAECF0] text-[#667085] text-[11px] uppercase tracking-wider bg-[#F9FAFB]">
                  <th className="py-2.5 px-3 rounded-l-lg">Producto / Plato</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-right">Precio</th>
                  <th className="py-2.5 px-3 text-center rounded-r-lg">Disponibilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {activeMerchant.products.map((p: any) => (
                  <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-semibold text-xs text-[#101828]">{p.name}</p>
                      {p.description && (
                        <p className="text-[11px] text-[#667085] line-clamp-1">
                          {p.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#475467]">{p.category || "General"}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      {p.price.toFixed(2)} Bs.
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() =>
                          handleToggleProductAvailability(p.id, p.isAvailable)
                        }
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                          p.isAvailable
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {p.isAvailable ? "Disponible" : "Agotado"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
