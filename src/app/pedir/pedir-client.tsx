"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Bike,
  Navigation,
  MapPin,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Clock,
  Phone,
  ArrowRight,
  Search,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  QrCode,
  DollarSign,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  merchantId: string;
  imageUrl?: string | null;
}

interface Merchant {
  id: string;
  name: string;
  category: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  rating: number;
  products: Product[];
}

interface Zone {
  id: string;
  name: string;
  baseDeliveryCost: number;
  baseRideCost: number;
  estimatedMinutes: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  merchantName: string;
  notes?: string;
}

type PortalTab = "delivery" | "mototaxi" | "rastreo";

export function PedirClient({
  merchants,
  zones,
  business,
  initialSearch = "",
  initialCategory = "TODOS",
  initialTab = "delivery",
  initialVehicle = "MOTO",
  initialAddress = "",
  rideFares,
}: {
  merchants: Merchant[];
  zones: Zone[];
  business: any;
  initialSearch?: string;
  initialCategory?: string;
  initialTab?: PortalTab;
  initialVehicle?: "MOTO" | "TORITO";
  initialAddress?: string;
  rideFares?: { MOTO: number; TORITO: number; currency: string };
}) {
  const motoFare = rideFares?.MOTO ?? 10;
  const toritoFare = rideFares?.TORITO ?? 11;
  const fareCurrency = rideFares?.currency || "Bs.";
  const [activeTab, setActiveTab] = useState<PortalTab>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Formulario Checkout
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState(initialAddress);
  const [referencePoint, setReferencePoint] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"EFECTIVO" | "QR_BANCO">("EFECTIVO");
  const [createdOrderCode, setCreatedOrderCode] = useState<string | null>(null);

  // Modal de Detalle de Producto estilo PedidosYa
  const [selectedProductForModal, setSelectedProductForModal] = useState<{
    product: Product;
    merchantName: string;
  } | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNotes, setModalNotes] = useState("");

  // Puntos Frecuentes Ivirgarzama (POIs estilo Yango)
  const ivirgarzamaPOIs = [
    "Plaza Principal de Ivirgarzama",
    "Hospital de Segundo Nivel",
    "Mercado Central",
    "Mercado Campesino",
    "Terminal de Buses",
    "Cruce Mariposas",
  ];

  // Formulario Mototaxi
  const [rideOrigin, setRideOrigin] = useState("Mercado Central de Ivirgarzama");
  const [rideDestination, setRideDestination] = useState("Terminal de Buses");
  const [rideVehicle, setRideVehicle] = useState<"MOTO" | "TORITO">(initialVehicle);
  const estimatedRideFare = rideVehicle === "MOTO" ? motoFare : toritoFare;
  const [ridePassengerName, setRidePassengerName] = useState("");
  const [ridePassengerPhone, setRidePassengerPhone] = useState("");
  const [isSubmittingRide, setIsSubmittingRide] = useState(false);
  const [createdRideCode, setCreatedRideCode] = useState<string | null>(null);

  // Rastrear Pedido
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingResult, setTrackingResult] = useState<any | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Categorías de comercios
  const categories = ["TODOS", "Restaurante", "Farmacia", "Mandados"];

  // Filtrado de comercios y productos
  const filteredMerchants = merchants.filter((m) => {
    if (selectedCategory !== "TODOS" && m.category !== selectedCategory) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchMerchant = m.name.toLowerCase().includes(query);
    const matchProduct = m.products.some((p) => p.name.toLowerCase().includes(query));
    return matchMerchant || matchProduct;
  });

  // Manejo de Carrito y Modal estilo PedidosYa
  const openProductModal = (product: Product, merchantName: string) => {
    setSelectedProductForModal({ product, merchantName });
    const existing = cart.find((item) => item.product.id === product.id);
    setModalQuantity(existing ? existing.quantity : 1);
    setModalNotes(existing?.notes || "");
  };

  const handleAddFromModal = () => {
    if (!selectedProductForModal) return;
    const { product, merchantName } = selectedProductForModal;
    setCart((prev) => {
      const filtered = prev.filter((item) => item.product.id !== product.id);
      return [
        ...filtered,
        {
          product,
          quantity: modalQuantity,
          merchantName,
          notes: modalNotes.trim() || undefined,
        },
      ];
    });
    setSelectedProductForModal(null);
    setIsCartOpen(true);
  };

  const addToCart = (product: Product, merchantName: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, merchantName }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const totalAmount = subtotal;
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Enviar Pedido formateado directamente a WhatsApp con TropiBot
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      alert("Por favor completa tu nombre, teléfono y dirección de entrega.");
      return;
    }

    const itemsDetail = cart
      .map(
        (it) =>
          `• ${it.quantity}x ${it.product.name} (${(it.product.price * it.quantity).toFixed(2)} Bs.)${
            it.notes ? `\n   ↳ _Nota: ${it.notes}_` : ""
          }`
      )
      .join("\n");

    const message =
      `🌴 *NUEVO PEDIDO DESDE TROPIGO WEB / APP*\n\n` +
      `👤 *Cliente:* ${customerName.trim()}\n` +
      `📱 *WhatsApp:* ${customerPhone.trim()}\n` +
      `📍 *Dirección de entrega:* ${deliveryAddress.trim()}\n` +
      (referencePoint.trim() ? `🏠 *Referencia:* ${referencePoint.trim()}\n` : "") +
      `💳 *Forma de pago:* ${paymentMethod === "EFECTIVO" ? "💵 Efectivo al recibir" : "📲 QR Simple Bancario"}\n\n` +
      `📋 *DETALLE DEL PEDIDO:*\n${itemsDetail}\n\n` +
      `💰 *Subtotal Comida:* ${subtotal.toFixed(2)} Bs.\n` +
      `🛵 *Envío:* Cotizar según distancia desde Plaza Principal\n\n` +
      `¡Hola TropiBot! Por favor confirma mi pedido y cotízame el envío exacto.`;

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/59174389012?text=${encoded}`;
    window.open(waUrl, "_blank");
    setIsCheckoutOpen(false);
  };

  // Enviar Carrera de Mototaxi
  const handleRequestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ridePassengerName || !ridePassengerPhone || !rideOrigin || !rideDestination) return;

    setIsSubmittingRide(true);
    try {
      // La tarifa real la calcula el servidor; aquí solo se envía la referencia.
      const fare = estimatedRideFare;

      const res = await fetch("/api/public/rides/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passengerName: ridePassengerName,
          passengerPhone: ridePassengerPhone,
          originAddress: rideOrigin,
          destinationAddress: rideDestination,
          vehicleType: rideVehicle,
          fareAmount: fare,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedRideCode(data.tripNumber);
      } else {
        alert("Error al solicitar conductor.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al pedir mototaxi.");
    } finally {
      setIsSubmittingRide(false);
    }
  };

  // Buscar Rastreo
  const handleSearchTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode.trim()) return;

    setIsTrackingLoading(true);
    setTrackingError(null);
    setTrackingResult(null);

    try {
      const res = await fetch(`/api/public/tracking?code=${encodeURIComponent(trackingCode.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setTrackingResult(data);
      } else {
        setTrackingError("No encontramos ningún pedido o carrera con ese código.");
      }
    } catch (err) {
      setTrackingError("Error al consultar el rastreo.");
    } finally {
      setIsTrackingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4F9] text-[#101828] flex flex-col">
      {/* 1. Header Público */}
      <header className="bg-white border-b border-[#EAECF0] sticky top-0 z-40 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo y Slogan */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8E58A6] to-[#5C3470] flex items-center justify-center text-white font-black text-xl shadow-xs transition-transform group-hover:scale-105">
              TG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-[#101828] tracking-tight">
                  TropiGO
                </span>
                <span className="text-[10px] bg-[#E6D2F0] text-[#482957] font-bold px-2 py-0.5 rounded-full">
                  Ivirgarzama
                </span>
              </div>
              <p className="text-[11px] text-[#5C3470] font-medium">
                Movemos el Trópico 🌴
              </p>
            </div>
          </Link>

          {/* Selector de Ciudad / Cobertura */}
          <div className="hidden md:flex items-center gap-2 bg-[#F2F4F7] px-3 py-1.5 rounded-full text-xs font-medium text-[#344054]">
            <MapPin className="w-3.5 h-3.5 text-[#8E58A6]" />
            <span>Zona Activa: <strong>Ivirgarzama (Centro & Sindicatos)</strong></span>
          </div>

          {/* Acciones Header */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden sm:inline-flex text-xs font-semibold text-[#475467] hover:text-[#101828] px-2 py-2 rounded-xl hover:bg-[#F2F4F7] transition-colors"
            >
              Inicio
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 bg-[#F3EAF7] hover:bg-[#E6D2F0] text-[#482957] font-bold text-xs px-3.5 py-2 rounded-xl border border-[#E0CCE9] transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-[#5C3470]" />
              <span className="hidden sm:inline">Mi Carrito</span>
              {totalItemsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#331E39] text-white font-bold text-[11px] flex items-center justify-center">
                  {totalItemsCount}
                </span>
              )}
            </button>

            <Link
              href="/login"
              className="text-xs font-semibold text-[#475467] hover:text-[#101828] px-3 py-2 rounded-xl hover:bg-[#F2F4F7] transition-colors"
            >
              Ingresar al Panel
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero y Tabs Principales */}
      <section className="bg-gradient-to-b from-white to-[#F8F9FA] border-b border-[#EAECF0] pt-8 pb-6 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#F3EAF7] text-[#482957] text-xs font-bold px-3 py-1 rounded-full border border-[#E0CCE9]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Delivery de Comida, Farmacia y Mototaxis en el Trópico de Cochabamba</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-[#101828] tracking-tight">
            Pide lo que quieras o viaja en segundos
          </h1>
          <p className="text-sm text-[#475467] max-w-xl mx-auto">
            Conectamos los mejores restaurantes de Ivirgarzama y conductores de mototaxi y toritos con tarifa justa en Bolivianos (Bs.).
          </p>

          {/* Selector de Pestañas */}
          <div className="flex justify-center pt-2">
            <div className="bg-[#F2F4F7] p-1.5 rounded-2xl inline-flex gap-1 border border-[#EAECF0]">
              <button
                onClick={() => setActiveTab("delivery")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "delivery"
                    ? "bg-white text-[#482957] shadow-xs border border-[#EAECF0]"
                    : "text-[#667085] hover:text-[#101828]"
                }`}
              >
                <UtensilsCrossed className="w-4 h-4 text-[#8E58A6]" />
                <span>Delivery de Comida & Tiendas</span>
              </button>

              <button
                onClick={() => setActiveTab("mototaxi")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "mototaxi"
                    ? "bg-white text-[#482957] shadow-xs border border-[#EAECF0]"
                    : "text-[#667085] hover:text-[#101828]"
                }`}
              >
                <Navigation className="w-4 h-4 text-[#8E58A6]" />
                <span>Pedir Mototaxi o Torito</span>
              </button>

              <button
                onClick={() => setActiveTab("rastreo")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "rastreo"
                    ? "bg-white text-[#482957] shadow-xs border border-[#EAECF0]"
                    : "text-[#667085] hover:text-[#101828]"
                }`}
              >
                <Clock className="w-4 h-4 text-[#8E58A6]" />
                <span>Rastrear Pedido</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Contenido según Tab */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        {/* TAB 1: DELIVERY DE COMIDA & TIENDAS */}
        {activeTab === "delivery" && (
          <div className="space-y-8">
            {/* Dirección que llega desde la portada */}
            {deliveryAddress.trim() && (
              <div className="flex flex-col gap-2 rounded-2xl border border-[#E0CCE9] bg-[#F3EAF7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-xs font-semibold text-[#482957]">
                  <MapPin className="w-4 h-4 shrink-0 text-[#8E58A6]" />
                  Entregar en: <span className="font-black">{deliveryAddress}</span>
                </p>
                <button
                  onClick={() => setDeliveryAddress("")}
                  className="self-start text-[11px] font-bold text-[#5C3470] underline-offset-2 hover:underline sm:self-auto"
                >
                  Cambiar dirección
                </button>
              </div>
            )}

            {/* Buscador y Filtros */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                      selectedCategory === cat
                        ? "bg-[#331E39] text-white"
                        : "bg-white text-[#475467] border border-[#EAECF0] hover:bg-[#F2F4F7]"
                    }`}
                  >
                    {cat === "TODOS" ? "Todos los Comercios" : cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-2.5" />
                <input
                  id="searchQuery"
                  name="searchQuery"
                  type="text"
                  placeholder="Buscar pollo, majadito, farmacia..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#D0D5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8E58A6]"
                />
              </div>
            </div>

            {/* Listado de Comercios y Productos */}
            {filteredMerchants.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#D0D5DD] p-12 text-center space-y-2">
                <UtensilsCrossed className="w-8 h-8 text-[#98A2B3] mx-auto" />
                <p className="font-bold text-sm text-[#344054]">No encontramos resultados</p>
                <p className="text-xs text-[#667085]">Prueba buscando por otra palabra o categoría.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {filteredMerchants.map((merchant) => (
                  <div
                    key={merchant.id}
                    className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-xs space-y-6"
                  >
                    {/* Header del Comercio */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#EAECF0]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-black text-[#101828]">
                            {merchant.name}
                          </h2>
                          <span className="text-[10px] bg-[#F3EAF7] text-[#482957] font-bold px-2 py-0.5 rounded-full border border-[#E0CCE9]">
                            ★ {merchant.rating.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-[#667085] mt-0.5">
                          {merchant.description}
                        </p>
                        <p className="text-[11px] text-[#98A2B3] flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-[#8E58A6]" />
                          <span>{merchant.address}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold text-[#5C3470] bg-[#F3EAF7] px-2.5 py-1 rounded-lg">
                          Envío desde {(business?.baseDeliveryFee ?? 5).toFixed(2)}{" "}
                          {business?.currencySymbol || "Bs."}
                        </span>
                      </div>
                    </div>

                    {/* Grilla de Productos estilo PedidosYa */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {merchant.products.map((product) => {
                        const inCart = cart.find((it) => it.product.id === product.id);

                        return (
                          <div
                            key={product.id}
                            onClick={() => openProductModal(product, merchant.name)}
                            className="group cursor-pointer bg-[#F8F9FA] hover:bg-white rounded-2xl border border-[#EAECF0] hover:border-[#8E58A6] p-4 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-md transition-all duration-200"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-bold text-xs text-[#101828] group-hover:text-[#482957] transition-colors">
                                  {product.name}
                                </h3>
                                <span className="font-black text-sm text-[#5C3470] whitespace-nowrap bg-[#F3EAF7] px-2 py-0.5 rounded-lg">
                                  {product.price.toFixed(2)} Bs.
                                </span>
                              </div>
                              {product.description && (
                                <p className="text-[11px] text-[#667085] line-clamp-2 mt-1">
                                  {product.description}
                                </p>
                              )}
                              {inCart?.notes && (
                                <p className="text-[10px] text-[#5C3470] bg-[#E6D2F0]/40 px-2 py-0.5 rounded-md mt-1.5 italic">
                                  Nota: {inCart.notes}
                                </p>
                              )}
                            </div>

                            <div className="pt-2 border-t border-[#EAECF0]/60 flex items-center justify-between">
                              <span className="text-[10px] text-[#98A2B3] font-medium">
                                {product.category || "Plato oficial"}
                              </span>

                              {inCart ? (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-[#C9A7D8]"
                                >
                                  <button
                                    onClick={() => updateQuantity(product.id, -1)}
                                    className="text-[#5C3470] hover:text-[#331E39]"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="font-bold text-xs text-[#482957]">
                                    {inCart.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(product.id, 1)}
                                    className="text-[#5C3470] hover:text-[#331E39]"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openProductModal(product, merchant.name);
                                  }}
                                  className="flex items-center gap-1 bg-[#331E39] hover:bg-[#482957] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Elegir</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MOTOTAXIS & TORITOS (MOVILIDAD) */}
        {activeTab === "mototaxi" && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#EAECF0] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#E6D2F0] text-[#482957] flex items-center justify-center mx-auto mb-2">
                <Navigation className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-[#101828]">
                Pedir Mototaxi o Torito en Ivirgarzama
              </h2>
              <p className="text-xs text-[#667085]">
                Tarifa justa garantizada en Bolivianos (Bs.). Despacho inmediato al conductor más cercano.
              </p>
            </div>

            {createdRideCode ? (
              <div className="bg-[#F3EAF7] border border-[#E0CCE9] rounded-2xl p-6 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-[#8E58A6] mx-auto" />
                <h3 className="text-base font-black text-[#331E39]">
                  ¡Carrera solicitada con éxito!
                </h3>
                <p className="text-xs text-[#5C3470]">
                  Tu código de viaje es:{" "}
                  <strong className="text-[#331E39] font-mono text-sm">
                    {createdRideCode}
                  </strong>
                </p>
                <p className="text-xs text-[#475467]">
                  Un despachador te ha asignado al conductor más cercano. También puedes confirmar o consultar por WhatsApp.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={() => setCreatedRideCode(null)}
                    className="text-xs bg-[#331E39] text-white font-bold px-4 py-2 rounded-xl hover:bg-[#482957]"
                  >
                    Pedir otro viaje
                  </button>
                  <Link
                    href={`https://wa.me/59174389012?text=Hola,%20acabo%20de%20pedir%20el%20viaje%20${createdRideCode}%20en%20TropiGO`}
                    target="_blank"
                    className="text-xs bg-white text-[#482957] border border-[#C9A7D8] font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Abrir en WhatsApp</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestRide} className="space-y-5">
                {/* Radar estilo Yango */}
                <div className="bg-gradient-to-r from-[#F3EAF7] to-[#E6D2F0] border border-[#E0CCE9] p-3.5 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8E58A6] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#5C3470]"></span>
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#331E39]">Radar activo en Ivirgarzama</p>
                      <p className="text-[10px] text-[#5C3470]">Conductores en línea • Despacho en 2 a 4 min</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-[#331E39] text-white px-2 py-0.5 rounded-full">
                    GPS Listo
                  </span>
                </div>

                {/* Selector de Vehículo estilo Yango */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#344054]">
                    Selecciona tu Vehículo
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRideVehicle("MOTO")}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        rideVehicle === "MOTO"
                          ? "border-[#8E58A6] bg-[#F3EAF7] text-[#331E39] ring-2 ring-[#8E58A6]/20 font-bold shadow-2xs"
                          : "border-[#EAECF0] hover:bg-[#F9FAFB] text-[#475467]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <span>🛵</span> Moto Flash
                        </span>
                        <span className="text-xs font-black text-[#5C3470]">
                          {motoFare.toFixed(2)} {fareCurrency}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#667085] mt-1">
                        1 pasajero • Rápido y ágil
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRideVehicle("TORITO")}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        rideVehicle === "TORITO"
                          ? "border-[#8E58A6] bg-[#F3EAF7] text-[#331E39] ring-2 ring-[#8E58A6]/20 font-bold shadow-2xs"
                          : "border-[#EAECF0] hover:bg-[#F9FAFB] text-[#475467]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <span>🛺</span> Torito / Trimóvil
                        </span>
                        <span className="text-xs font-black text-[#5C3470]">
                          {toritoFare.toFixed(2)} {fareCurrency}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#667085] mt-1">
                        Hasta 3 personas • Techo para lluvia ☔
                      </p>
                    </button>
                  </div>
                </div>

                {/* Destinos Frecuentes estilo Yango (POIs Ivirgarzama) */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-[#667085]">
                    Puntos rápidos de destino en Ivirgarzama:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ivirgarzamaPOIs.map((poi) => (
                      <button
                        key={poi}
                        type="button"
                        onClick={() => setRideDestination(poi)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                          rideDestination === poi
                            ? "bg-[#331E39] text-white border-[#331E39]"
                            : "bg-white text-[#475467] border-[#EAECF0] hover:bg-[#F2F4F7]"
                        }`}
                      >
                        📍 {poi}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Origen y Destino */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="rideOrigin" className="text-xs font-bold text-[#344054]">
                      Punto de Partida (Origen)
                    </label>
                    <input
                      id="rideOrigin"
                      name="rideOrigin"
                      type="text"
                      required
                      placeholder="Ej: Mercado Central, lado ferretería"
                      value={rideOrigin}
                      onChange={(e) => setRideOrigin(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D0D5DD] rounded-xl focus:ring-2 focus:ring-[#8E58A6] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="rideDestination" className="text-xs font-bold text-[#344054]">
                      Punto de Llegada (Destino)
                    </label>
                    <input
                      id="rideDestination"
                      name="rideDestination"
                      type="text"
                      required
                      placeholder="Ej: Terminal de Buses, Surtidor"
                      value={rideDestination}
                      onChange={(e) => setRideDestination(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D0D5DD] rounded-xl focus:ring-2 focus:ring-[#8E58A6] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Pasajero y Teléfono */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="ridePassengerName" className="text-xs font-bold text-[#344054]">
                      Tu Nombre
                    </label>
                    <input
                      id="ridePassengerName"
                      name="ridePassengerName"
                      type="text"
                      required
                      placeholder="Ej: Roberto Claure"
                      value={ridePassengerName}
                      onChange={(e) => setRidePassengerName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D0D5DD] rounded-xl focus:ring-2 focus:ring-[#8E58A6] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="ridePassengerPhone" className="text-xs font-bold text-[#344054]">
                      Número de WhatsApp
                    </label>
                    <input
                      id="ridePassengerPhone"
                      name="ridePassengerPhone"
                      type="tel"
                      required
                      placeholder="Ej: 78901234"
                      value={ridePassengerPhone}
                      onChange={(e) => setRidePassengerPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D0D5DD] rounded-xl focus:ring-2 focus:ring-[#8E58A6] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Resumen Tarifa */}
                <div className="p-3 bg-[#F2F4F7] rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#344054]">
                    <ShieldCheck className="w-4 h-4 text-[#8E58A6]" />
                    <span>Tarifa estimada (Urbano Ivirgarzama):</span>
                  </div>
                  <span className="font-black text-sm text-[#482957]">
                    {estimatedRideFare.toFixed(2)} {fareCurrency}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingRide}
                  className="w-full bg-[#331E39] hover:bg-[#482957] text-white font-bold text-xs py-3 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  <span>
                    {isSubmittingRide ? "Solicitando conductor..." : "Pedir Conductor Ahora"}
                  </span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: RASTREAR PEDIDO */}
        {activeTab === "rastreo" && (
          <div className="max-w-xl mx-auto bg-white rounded-2xl border border-[#EAECF0] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#E6D2F0] text-[#482957] flex items-center justify-center mx-auto mb-2">
                <Clock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-[#101828]">
                Rastreo de Pedido o Carrera
              </h2>
              <p className="text-xs text-[#667085]">
                Ingresa tu código (ejemplo: <strong>TRP-1041</strong> o <strong>VIAJE-2001</strong>) para conocer el estado en vivo.
              </p>
            </div>

            <form onSubmit={handleSearchTracking} className="flex gap-2">
              <input
                id="trackingCode"
                name="trackingCode"
                type="text"
                required
                placeholder="Código TRP-XXXX o VIAJE-XXXX"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-2.5 text-xs font-mono uppercase bg-white border border-[#D0D5DD] rounded-xl focus:ring-2 focus:ring-[#8E58A6] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isTrackingLoading}
                className="bg-[#331E39] hover:bg-[#482957] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shrink-0"
              >
                {isTrackingLoading ? "Consultando..." : "Consultar"}
              </button>
            </form>

            {trackingError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-center">
                {trackingError}
              </div>
            )}

            {trackingResult && (
              <div className="bg-[#F8F9FA] rounded-xl border border-[#EAECF0] p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#EAECF0]">
                  <span className="font-mono font-bold text-[#482957]">
                    {trackingResult.code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-[#E6D2F0] text-[#482957]">
                    {trackingResult.statusLabel}
                  </span>
                </div>

                <div className="space-y-1 text-[#344054]">
                  <p>
                    <strong>Servicio:</strong> {trackingResult.type}
                  </p>
                  {trackingResult.destination && (
                    <p>
                      <strong>Destino:</strong> {trackingResult.destination}
                    </p>
                  )}
                  {typeof trackingResult.totalAmount === "number" && (
                    <p>
                      <strong>Monto:</strong>{" "}
                      <span className="font-bold text-[#5C3470]">
                        {trackingResult.totalAmount.toFixed(2)} Bs.
                      </span>{" "}
                      {trackingResult.paymentMethod ? `(${trackingResult.paymentMethod})` : ""}
                    </p>
                  )}
                  {trackingResult.rider && (
                    <p>
                      <strong>Conductor / Moto:</strong> {trackingResult.rider.name} (
                      {trackingResult.rider.plateNumber})
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. Drawer / Modal de Carrito Flotante */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#8E58A6]" />
                <h3 className="font-black text-base text-[#101828]">Mi Carrito TropiGO</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-[#667085] hover:text-[#101828] text-sm font-bold p-1 rounded-lg hover:bg-[#F2F4F7]"
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 text-[#98A2B3]">
                <ShoppingBag className="w-12 h-12 stroke-1" />
                <p className="text-xs font-semibold text-[#475467]">Tu carrito está vacío</p>
                <p className="text-[11px]">Agrega platos de los restaurantes de Ivirgarzama para comenzar.</p>
              </div>
            ) : (
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3 bg-[#F8F9FA] rounded-xl border border-[#EAECF0] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#101828] truncate">{item.product.name}</p>
                      <p className="text-[10px] text-[#667085] truncate">{item.merchantName}</p>
                      <p className="font-black text-[#5C3470] mt-0.5">
                        {(item.product.price * item.quantity).toFixed(2)} Bs.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-white border border-[#D0D5DD] px-2 py-0.5 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="text-[#667085] hover:text-[#101828]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="text-[#667085] hover:text-[#101828]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="pt-3 border-t border-[#EAECF0] space-y-3">
                <div className="space-y-1.5 text-xs text-[#475467]">
                  <div className="flex justify-between">
                    <span>Subtotal productos:</span>
                    <span>{subtotal.toFixed(2)} Bs.</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Envío:</span>
                    <span>Se cotiza por zona en WhatsApp</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-[#101828] pt-1 border-t border-[#EAECF0]">
                    <span>Total productos:</span>
                    <span className="text-[#5C3470]">{totalAmount.toFixed(2)} Bs.</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full bg-[#331E39] hover:bg-[#482957] text-white font-bold text-xs py-3 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <span>Pedir por WhatsApp</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Modal de Checkout / Confirmación de Pedido */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EAECF0] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#EAECF0]">
              <h3 className="font-black text-base text-[#101828]">
                Finalizar Pedido en TropiGO
              </h3>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-[#667085] hover:text-[#101828] font-bold"
              >
                ✕
              </button>
            </div>

            {createdOrderCode ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="w-12 h-12 text-[#8E58A6] mx-auto" />
                <h4 className="font-black text-base text-[#331E39]">
                  ¡Pedido registrado con éxito!
                </h4>
                <p className="text-xs text-[#475467]">
                  Tu número de orden es:{" "}
                  <strong className="text-[#482957] font-mono text-sm">
                    {createdOrderCode}
                  </strong>
                </p>
                <p className="text-xs text-[#667085]">
                  Total a pagar: <strong>{totalAmount.toFixed(2)} Bs.</strong> ({paymentMethod})
                </p>
                <div className="pt-2 flex flex-col gap-2">
                  <Link
                    href={`https://wa.me/59174389012?text=Hola,%20acabo%20de%20hacer%20el%20pedido%20${createdOrderCode}%20por%20la%20web%20de%20TropiGO`}
                    target="_blank"
                    className="w-full bg-[#331E39] hover:bg-[#482957] text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Confirmar por WhatsApp</span>
                  </Link>
                  <button
                    onClick={() => {
                      setCreatedOrderCode(null);
                      setIsCheckoutOpen(false);
                    }}
                    className="w-full border border-[#D0D5DD] text-[#344054] font-bold text-xs py-2 rounded-xl"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitOrder} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label htmlFor="customerName" className="font-bold text-[#344054]">Nombre Completo</label>
                  <input
                    id="customerName"
                    name="customerName"
                    type="text"
                    required
                    placeholder="Ej: Sandra Mamani"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-xl focus:ring-2 focus:ring-[#8E58A6] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="customerPhone" className="font-bold text-[#344054]">Número de WhatsApp</label>
                  <input
                    id="customerPhone"
                    name="customerPhone"
                    type="tel"
                    required
                    placeholder="Ej: 78901234"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-xl focus:ring-2 focus:ring-[#8E58A6] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="deliveryAddress" className="font-bold text-[#344054]">Dirección de Entrega</label>
                  <input
                    id="deliveryAddress"
                    name="deliveryAddress"
                    type="text"
                    required
                    placeholder="Ej: Av. Mortensen esq. Cochabamba"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-xl focus:ring-2 focus:ring-[#8E58A6] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="referencePoint" className="font-bold text-[#344054]">Punto de Referencia</label>
                  <input
                    id="referencePoint"
                    name="referencePoint"
                    type="text"
                    placeholder="Ej: Frente al surtidor central, portón verde"
                    value={referencePoint}
                    onChange={(e) => setReferencePoint(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-xl focus:ring-2 focus:ring-[#8E58A6] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#344054]">Método de Pago</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("EFECTIVO")}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        paymentMethod === "EFECTIVO"
                          ? "border-[#8E58A6] bg-[#F3EAF7] font-bold text-[#331E39]"
                          : "border-[#EAECF0] text-[#667085]"
                      }`}
                    >
                      💵 Efectivo al recibir
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("QR_BANCO")}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        paymentMethod === "QR_BANCO"
                          ? "border-[#8E58A6] bg-[#F3EAF7] font-bold text-[#331E39]"
                          : "border-[#EAECF0] text-[#667085]"
                      }`}
                    >
                      📲 QR Simple Bancario
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#EAECF0] flex justify-between font-bold text-sm text-[#101828]">
                  <span>Total productos:</span>
                  <span className="text-[#5C3470]">{totalAmount.toFixed(2)} Bs.</span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#331E39] hover:bg-[#482957] text-white font-bold text-xs py-3 rounded-xl transition-colors shadow-xs"
                >
                  Continuar por WhatsApp
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 5.5 Modal de Detalle y Personalización de Plato estilo PedidosYa */}
      {selectedProductForModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#EAECF0] flex flex-col max-h-[90vh]">
            {/* Header del Modal */}
            <div className="relative bg-gradient-to-br from-[#F3EAF7] via-[#E6D2F0] to-[#D5B8E3] p-6 pb-4">
              <button
                onClick={() => setSelectedProductForModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#331E39] font-black flex items-center justify-center text-sm shadow-xs transition-colors"
              >
                ✕
              </button>
              <span className="text-[10px] uppercase tracking-wider font-extrabold bg-[#331E39] text-white px-2.5 py-0.5 rounded-full inline-block mb-2">
                {selectedProductForModal.merchantName}
              </span>
              <h3 className="font-black text-xl text-[#101828] leading-tight">
                {selectedProductForModal.product.name}
              </h3>
              <p className="font-black text-lg text-[#5C3470] mt-1">
                {selectedProductForModal.product.price.toFixed(2)} Bs.
              </p>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {selectedProductForModal.product.description && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#344054]">Descripción</h4>
                  <p className="text-xs text-[#667085] leading-relaxed">
                    {selectedProductForModal.product.description}
                  </p>
                </div>
              )}

              {/* Notas e instrucciones especiales para el restaurante */}
              <div className="space-y-1.5">
                <label htmlFor="modalNotes" className="text-xs font-bold text-[#344054] flex items-center justify-between">
                  <span>Notas especiales para el restaurante</span>
                  <span className="text-[10px] font-normal text-[#98A2B3]">Opcional</span>
                </label>
                <textarea
                  id="modalNotes"
                  name="modalNotes"
                  rows={2}
                  placeholder="Ej: Sin cebolla, bastante llajwa, extra mayonesa..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F9FA] border border-[#D0D5DD] rounded-xl focus:ring-2 focus:ring-[#8E58A6] focus:outline-none focus:bg-white resize-none"
                />
              </div>

              {/* Selector de Cantidad */}
              <div className="flex items-center justify-between pt-2 border-t border-[#EAECF0]">
                <span className="text-xs font-bold text-[#344054]">Cantidad</span>
                <div className="flex items-center gap-3 bg-[#F2F4F7] px-3 py-1 rounded-xl border border-[#D0D5DD]">
                  <button
                    onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                    disabled={modalQuantity <= 1}
                    className="text-[#5C3470] hover:text-[#331E39] disabled:opacity-30 p-1"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-black text-sm text-[#101828] min-w-5 text-center">
                    {modalQuantity}
                  </span>
                  <button
                    onClick={() => setModalQuantity((q) => q + 1)}
                    className="text-[#5C3470] hover:text-[#331E39] p-1"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer con Botón de Confirmación */}
            <div className="p-4 bg-[#F8F9FA] border-t border-[#EAECF0]">
              <button
                onClick={handleAddFromModal}
                className="w-full bg-[#331E39] hover:bg-[#482957] text-white font-bold text-xs sm:text-sm py-3.5 rounded-2xl shadow-sm transition-all flex items-center justify-between px-5"
              >
                <span>Agregar al Pedido</span>
                <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs font-black">
                  {(selectedProductForModal.product.price * modalQuantity).toFixed(2)} Bs.
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.6 Sticky Cart Bar estilo PedidosYa (Barra flotante visible cuando hay productos) */}
      {cart.length > 0 && !isCartOpen && !isCheckoutOpen && !selectedProductForModal && (
        <div className="fixed bottom-14 sm:bottom-6 left-4 right-4 max-w-2xl mx-auto z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            onClick={() => setIsCartOpen(true)}
            className="cursor-pointer bg-gradient-to-r from-[#331E39] via-[#482957] to-[#5C3470] text-white p-3.5 sm:p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-white/10 hover:scale-[1.01] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="relative bg-white/20 p-2 rounded-xl">
                <ShoppingBag className="w-5 h-5 text-white" />
                <span className="absolute -top-1.5 -right-1.5 bg-[#FFD700] text-[#331E39] font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {totalItemsCount}
                </span>
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm">Ver tu pedido</p>
                <p className="text-[11px] text-white/80">
                  {cart.length} {cart.length === 1 ? "comercio / ítem" : "platos seleccionados"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-black text-sm sm:text-base text-[#FFD700]">
                {subtotal.toFixed(2)} Bs.
              </span>
              <div className="bg-white/20 p-1.5 rounded-lg">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Footer Público */}
      <footer className="bg-white border-t border-[#EAECF0] py-8 px-4 text-xs text-[#667085] mt-12 pb-24 sm:pb-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="font-bold text-sm text-[#101828]">TropiGO — Movemos el Trópico 🌴</p>
              <p className="text-[11px] mt-0.5">
                Ivirgarzama (Centro de operaciones) • Expansión: Shinahota, Puerto Villarroel, Chimoré y Villa Tunari.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <span>WhatsApp Central: <strong>+591 74389012</strong></span>
              <span>Moneda oficial: <strong>Bolivianos (Bs.)</strong></span>
            </div>
          </div>

          {/* Accesos Rápidos a Portales de TropiGO */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center sm:justify-between gap-3 text-[11px]">
            <span className="font-bold text-slate-400 uppercase tracking-wider">
              Portales Especializados:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/comercio"
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
              >
                🍳 Cocina & Comercios
              </Link>
              <Link
                href="/repartidor"
                className="px-2.5 py-1 rounded-lg bg-[#F3EAF7] hover:bg-[#E6D2F0] text-[#482957] font-bold transition-colors"
              >
                🛵 Repartidores & Mototaxis
              </Link>
              <Link
                href="/dashboard"
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
              >
                📊 Central de Despacho
              </Link>
              <Link
                href="/design-system"
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 font-medium transition-colors"
              >
                🎨 Sistema Visual
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* 7. Barra Inferior Móvil para Clientes (Fixed Bottom Bar en Smartphones) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab("delivery")}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
            activeTab === "delivery" ? "text-[#5C3470] font-bold" : "text-slate-500"
          }`}
        >
          <UtensilsCrossed className="w-5 h-5" />
          <span className="text-[10px]">Delivery</span>
        </button>

        <button
          onClick={() => setActiveTab("mototaxi")}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
            activeTab === "mototaxi" ? "text-[#5C3470] font-bold" : "text-slate-500"
          }`}
        >
          <Navigation className="w-5 h-5" />
          <span className="text-[10px]">Mototaxi</span>
        </button>

        <button
          onClick={() => setActiveTab("rastreo")}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
            activeTab === "rastreo" ? "text-[#5C3470] font-bold" : "text-slate-500"
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px]">Rastrear</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center gap-1 py-1 px-3 text-slate-500 hover:text-[#5C3470]"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-[#8E58A6]" />
            {totalItemsCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#331E39] text-white text-[9px] font-black flex items-center justify-center">
                {totalItemsCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Carrito</span>
        </button>
      </nav>
    </div>
  );
}
