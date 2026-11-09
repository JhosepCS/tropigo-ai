"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  UtensilsCrossed,
  Search,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  DollarSign,
  Tag,
} from "lucide-react";

export function CatalogoClient({
  merchants,
  products,
}: {
  merchants: any[];
  products: any[];
}) {
  const [activeTab, setActiveTab] = useState<"comercios" | "productos">("comercios");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMerchants = merchants.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.merchant?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Comercios & Catálogo de Productos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión de negocios afiliados en Ivirgarzama, cartas gastronómicas y precios oficiales en Bs.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Buscar comercio o producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("comercios")}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === "comercios"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Comercios Afiliados ({merchants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("productos")}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === "productos"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Productos & Platos ({products.length})</span>
        </button>
      </div>

      {/* Vista de Comercios */}
      {activeTab === "comercios" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMerchants.map((m) => (
            <Card key={m.id} className="hover:border-emerald-300 transition-all">
              <CardHeader className="bg-slate-50 pb-3 flex flex-row items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {m.category}
                  </span>
                  <CardTitle className="text-base text-slate-900">{m.name}</CardTitle>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    m.isOpen
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {m.isOpen ? "Abierto" : "Cerrado"}
                </span>
              </CardHeader>

              <CardContent className="p-4 space-y-2 text-xs text-slate-600">
                <p className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{m.address || "Ivirgarzama Centro"}</span>
                </p>
                {m.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{m.phone}</span>
                  </p>
                )}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-500">
                    {m.products?.length || 0} productos activos
                  </span>
                  <span className="text-amber-600 font-bold">
                    ★ {m.rating ? m.rating.toFixed(1) : "5.0"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Vista de Productos */}
      {activeTab === "productos" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Plato / Producto</th>
                  <th className="p-3.5">Comercio</th>
                  <th className="p-3.5">Categoría</th>
                  <th className="p-3.5">Precio (Bs.)</th>
                  <th className="p-3.5 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      <div>
                        <p>{p.name}</p>
                        {p.description && (
                          <p className="text-[11px] font-normal text-slate-400 truncate max-w-xs">
                            {p.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-700 font-medium">
                      {p.merchant?.name || "Sin comercio"}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold">
                        {p.category || "General"}
                      </span>
                    </td>
                    <td className="p-3.5 font-black text-slate-900 text-sm">
                      {p.price.toFixed(2)} Bs.
                    </td>
                    <td className="p-3.5 text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                          p.isAvailable
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {p.isAvailable ? "Disponible" : "Agotado"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
