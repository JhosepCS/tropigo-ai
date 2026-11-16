"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
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
  Plus,
  Image as ImageIcon,
  Clock,
  ExternalLink,
  Power,
} from "lucide-react";

export function CatalogoClient({
  merchants,
  products: initialProducts,
}: {
  merchants: any[];
  products: any[];
}) {
  const [activeTab, setActiveTab] = useState<"comercios" | "productos">("comercios");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);

  // Formulario nuevo producto
  const [selectedMerchantId, setSelectedMerchantId] = useState(merchants[0]?.id || "");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Platos Fuertes");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [preparationMinutes, setPreparationMinutes] = useState("15");
  const [isAvailable, setIsAvailable] = useState(true);

  const filteredMerchants = merchants.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.merchant?.name && p.merchant.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleToggleProductAvailability = async (productId: string, current: boolean) => {
    setTogglingProductId(productId);
    const nextVal = !current;

    // Optimistic UI
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isAvailable: nextVal } : p))
    );

    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId, isAvailable: nextVal }),
      });
      if (!res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, isAvailable: current } : p))
        );
        alert("Error al actualizar disponibilidad.");
      }
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isAvailable: current } : p))
      );
    } finally {
      setTogglingProductId(null);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: selectedMerchantId,
          name,
          price: Number(price),
          category,
          description,
          imageUrl: imageUrl.trim() || null,
          preparationMinutes: Number(preparationMinutes) || 15,
          isAvailable,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear producto");

      setProducts((prev) => [data.product, ...prev]);
      setIsModalOpen(false);
      setName("");
      setPrice("");
      setDescription("");
      setImageUrl("");
      setActiveTab("productos");
    } catch (err: any) {
      alert(err.message || "Error al registrar producto");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            Catálogo & Gastronomía
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5">
            Comercios & Catálogo de Productos
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestión de negocios afiliados en Ivirgarzama, cartas gastronómicas con fotos y precios oficiales en Bs.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Buscar comercio o producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto shadow-sm shrink-0"
          >
            Añadir Producto
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("comercios")}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === "comercios"
              ? "border-emerald-600 text-emerald-800 dark:text-emerald-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Comercios Afiliados ({merchants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("productos")}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === "productos"
              ? "border-emerald-600 text-emerald-800 dark:text-emerald-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
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
            <Card key={m.id} className="hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between">
              {m.imageUrl && (
                <div className="h-32 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
                </div>
              )}
              <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 pb-3 flex flex-row items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    {m.category}
                  </span>
                  <CardTitle className="text-base text-slate-900 dark:text-white">{m.name}</CardTitle>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    m.isOpen
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {m.isOpen ? "Abierto" : "Cerrado"}
                </span>
              </CardHeader>

              <CardContent className="p-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
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
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    {m.products?.length || 0} productos activos
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Foto</th>
                  <th className="p-3.5">Plato / Producto</th>
                  <th className="p-3.5">Comercio</th>
                  <th className="p-3.5">Categoría</th>
                  <th className="p-3.5">Precio (Bs.)</th>
                  <th className="p-3.5 text-right">Estado / Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((p) => {
                  const isToggling = togglingProductId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        {p.imageUrl ? (
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400">
                            <UtensilsCrossed className="w-5 h-5" />
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        <div>
                          <p>{p.name}</p>
                          {p.description && (
                            <p className="text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate max-w-xs">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {p.merchant?.name || "Sin comercio"}
                      </td>
                      <td className="p-3.5 text-slate-500 dark:text-slate-400">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
                          {p.category || "General"}
                        </span>
                      </td>
                      <td className="p-3.5 font-black text-slate-900 dark:text-white text-sm">
                        {p.price.toFixed(2)} Bs.
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleToggleProductAvailability(p.id, p.isAvailable)}
                          disabled={isToggling}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-all ${
                            p.isAvailable
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200"
                              : "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 hover:bg-red-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.isAvailable ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          <span>{p.isAvailable ? "Disponible" : "Agotado"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para Añadir Producto */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Añadir Producto o Plato al Menú"
        description="Ingresa los datos del plato, precio oficial en Bs. y foto para que la IA lo recomiende a los clientes."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-200">Comercio Afiliado *</label>
            <select
              value={selectedMerchantId}
              onChange={(e) => setSelectedMerchantId(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.category})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Nombre del Plato / Producto *</label>
              <input
                type="text"
                required
                placeholder="Ej: Cuarto de Pollo a la Broaster"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Precio Oficial (Bs.) *</label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                placeholder="Ej: 25.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Categoría del Plato</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Platos Fuertes">Platos Fuertes</option>
                <option value="Pollos & Broaster">Pollos & Broaster</option>
                <option value="Parrilladas & Carnes">Parrilladas & Carnes</option>
                <option value="Pizzas & Pastas">Pizzas & Pastas</option>
                <option value="Hamburguesas & Snacks">Hamburguesas & Snacks</option>
                <option value="Bebidas & Refrescos">Bebidas & Refrescos</option>
                <option value="Postres & Helados">Postres & Helados</option>
                <option value="General">General</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Tiempo de Preparación (min)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={preparationMinutes}
                onChange={(e) => setPreparationMinutes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* URL de la Foto del Producto */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Foto del Producto (URL)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://images.unsplash.com/... o enlace de imagen"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              {imageUrl && (
                <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 bg-slate-100">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Esta foto se enviará automáticamente por WhatsApp con la herramienta del Catálogo Visual (Mejora A6).
            </p>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-200">Descripción o Guarnición</label>
            <textarea
              rows={2}
              placeholder="Ej: Acompañado de papas fritas, arroz, ensalada fresca y salsas tropicales..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isAvailableCheckbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="isAvailableCheckbox" className="font-semibold text-slate-700 dark:text-slate-200 select-none">
              Marcar como disponible para pedidos inmediatos
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Guardar en Catálogo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
