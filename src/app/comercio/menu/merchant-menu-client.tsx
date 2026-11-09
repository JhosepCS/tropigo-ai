"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import {
  UtensilsCrossed,
  Search,
  CheckCircle,
  XCircle,
  DollarSign,
  Power,
  Sparkles,
} from "lucide-react";

export function MerchantMenuClient({
  initialProducts,
  merchantName,
}: {
  initialProducts: any[];
  merchantName: string;
}) {
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggle = async (productId: string, currentStatus: boolean) => {
    setUpdatingId(productId);
    const newStatus = !currentStatus;

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isAvailable: newStatus } : p))
    );

    try {
      const res = await fetch("/api/comercio/toggle-product-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, isAvailable: newStatus }),
      });

      if (!res.ok) {
        // Revert
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, isAvailable: currentStatus } : p))
        );
        alert("Error al actualizar disponibilidad.");
      }
    } catch (e) {
      console.error(e);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isAvailable: currentStatus } : p))
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Control de Platos y Stock
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5">
            Carta de {merchantName}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Activa o desactiva platos con 1 clic si se terminan los insumos en cocina.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Buscar plato o bebida..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Grid de Platos */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="w-8 h-8 text-emerald-600" />}
          title="No se encontraron platos"
          description="Intenta buscar con otro término o agrega nuevos platos a tu menú."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const isUpdating = updatingId === p.id;

            return (
              <Card
                key={p.id}
                className={`transition-all ${
                  p.isAvailable
                    ? "border-slate-200 hover:border-emerald-300"
                    : "border-slate-200 bg-slate-50/70 opacity-75"
                }`}
              >
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {p.category || "Plato Principal"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.isAvailable
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {p.isAvailable ? "Disponible" : "Agotado hoy"}
                      </span>
                    </div>

                    <h3 className="font-black text-slate-900 text-base mt-1">
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {p.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-base font-black text-emerald-700">
                      {p.price.toFixed(2)} Bs.
                    </span>

                    <button
                      onClick={() => handleToggle(p.id, p.isAvailable)}
                      disabled={isUpdating}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        p.isAvailable
                          ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                          : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{p.isAvailable ? "Marcar Agotado" : "Activar Plato"}</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
