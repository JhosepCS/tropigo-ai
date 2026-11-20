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
  ChevronDown,
  ShieldCheck,
  Sparkles,
  QrCode,
  DollarSign,
  Bell,
  Star,
  Flame,
  Truck,
  Heart,
  Store,
  Tag,
  Package,
  Layers,
  Info,
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

type PortalTab = "inicio" | "delivery" | "mototaxi" | "rastreo" | "promos";

// Imágenes reales de comida de alta calidad
function getProductPhoto(product: Product): string {
  if (product.imageUrl && product.imageUrl.startsWith("http")) {
    return product.imageUrl;
  }
  const name = product.name.toLowerCase();
  if (name.includes("pollo") || name.includes("broaster") || name.includes("alitas") || name.includes("pechuga")) {
    return "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=500&q=80";
  }
  if (name.includes("hamburguesa") || name.includes("burger") || name.includes("lomito")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80";
  }
  if (name.includes("majadito") || name.includes("pique") || name.includes("silpancho") || name.includes("arroz")) {
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80";
  }
  if (name.includes("salteña") || name.includes("empanada") || name.includes("tucumana")) {
    return "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=500&q=80";
  }
  if (name.includes("helado") || name.includes("postre") || name.includes("torta") || name.includes("dulce")) {
    return "https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=500&q=80";
  }
  if (name.includes("pizza")) {
    return "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80";
  }
  if (name.includes("jugo") || name.includes("soda") || name.includes("bebida") || name.includes("gaseosa")) {
    return "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80";
  }
  return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=80";
}

function getMerchantCover(merchant: Merchant): string {
  const cat = merchant.category?.toLowerCase() || "";
  const name = merchant.name.toLowerCase();
  if (name.includes("pollo") || name.includes("broaster")) {
    return "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80";
  }
  if (cat.includes("farmacia") || name.includes("farmacia")) {
    return "https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=800&q=80";
  }
  if (cat.includes("mandado") || name.includes("mercado")) {
    return "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80";
  }
  return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80";
}

export function PedirClient({
  merchants,
  zones,
  business,
  initialSearch = "",
  initialCategory = "TODOS",
  initialTab = "inicio",
  initialVehicle = "MOTO",
  initialAddress = "",
  rideFares,
}: {
  merchants: Merchant[];
  zones: Zone[];
  business: any;
  initialSearch?: string;
  initialCategory?: string;
  initialTab?: any;
  initialVehicle?: "MOTO" | "TORITO";
  initialAddress?: string;
  rideFares?: { MOTO: number; TORITO: number; currency: string };
}) {
  const motoFare = rideFares?.MOTO ?? 10;
  const toritoFare = rideFares?.TORITO ?? 11;
  const fareCurrency = rideFares?.currency || "Bs.";

  // Estado del Portal
  const [activeTab, setActiveTab] = useState<PortalTab>(
    initialTab === "mototaxi" ? "mototaxi" : initialTab === "rastreo" ? "rastreo" : "inicio"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [promoSlide, setPromoSlide] = useState(0);

  // Formulario Checkout
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState(
    initialAddress || "Ivirgarzama, Trópico Cochabamba"
  );
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
    "Av. Mortensen",
    "Sindicato San Salvador",
  ];

  // Formulario Mototaxi estilo Yango
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

  // Subcategorías estilo Chips circulares PedidosYa
  const quickCategories = [
    { label: "Todos", emoji: "✨", cat: "TODOS" },
    { label: "Restaurantes", emoji: "🍔", cat: "Restaurante" },
    { label: "Pollos", emoji: "🍗", query: "pollo" },
    { label: "Burgers", emoji: "🍔", query: "hamburguesa" },
    { label: "Majaditos", emoji: "🍲", query: "majadito" },
    { label: "Helados", emoji: "🍦", query: "helado" },
    { label: "Farmacia", emoji: "💊", cat: "Farmacia" },
    { label: "Mandados", emoji: "📦", cat: "Mandados" },
  ];

  // Marcas Aliadas Populares en Ivirgarzama
  const partnerBrands = [
    { name: "Pollos El Trópico", time: "20-30 min", rating: "4.9", logo: "🍗" },
    { name: "Burger King Ivirgarzama", time: "25-35 min", rating: "4.8", logo: "🍔" },
    { name: "Heladería Central", time: "15-20 min", rating: "5.0", logo: "🍦" },
    { name: "Sabor Chapaco Majaditos", time: "20-30 min", rating: "4.9", logo: "🍲" },
    { name: "Farmacia San Elías", time: "15-25 min", rating: "4.9", logo: "💊" },
  ];

  // Carrusel de Promociones estilo PedidosYa
  const promoBanners = [
    {
      title: "¡De antojo, Pollo Broaster!",
      desc: "Crujiente, con papas fritas y harta llajwa a tu puerta.",
      btnText: "Pedir comida",
      action: () => {
        setActiveTab("delivery");
        setSelectedCategory("Restaurante");
      },
      img: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80",
      tag: "🔥 Más pedido",
    },
    {
      title: "TropiTaxi: Moto Flash en 3 min",
      desc: "Viaja seguro por Ivirgarzama con tarifa fija desde 10 Bs.",
      btnText: "Pedir Moto",
      action: () => setActiveTab("mototaxi"),
      img: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80",
      tag: "🛵 Tarifa plana",
    },
    {
      title: "¿Lluvia o compras pesadas? Torito",
      desc: "Viaja techado con espacio para hasta 3 personas o bultos.",
      btnText: "Pedir Torito",
      action: () => {
        setRideVehicle("TORITO");
        setActiveTab("mototaxi");
      },
      img: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80",
      tag: "☔ Techo para lluvia",
    },
  ];

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
      `🌴 *NUEVO PEDIDO DESDE TROPIGO (APP / WEB)*\n\n` +
      `👤 *Cliente:* ${customerName.trim()}\n` +
      `📱 *WhatsApp:* ${customerPhone.trim()}\n` +
      `📍 *Dirección de entrega:* ${deliveryAddress.trim()}\n` +
      (referencePoint.trim() ? `🏠 *Referencia:* ${referencePoint.trim()}\n` : "") +
      `💳 *Forma de pago:* ${paymentMethod === "EFECTIVO" ? "💵 Efectivo al recibir" : "📲 QR Simple Bancario"}\n\n` +
      `📋 *DETALLE DEL PEDIDO:*\n${itemsDetail}\n\n` +
      `💰 *Subtotal Comida:* ${subtotal.toFixed(2)} Bs.\n` +
      `🛵 *Envío:* Cotizar según distancia en Ivirgarzama\n\n` +
      `¡Hola TropiBot! Por favor confirma mi pedido y asígname un repartidor.`;

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/59157770679?text=${encoded}`;
    window.open(waUrl, "_blank");
    setIsCheckoutOpen(false);
  };

  // Enviar Carrera de Mototaxi
  const handleRequestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ridePassengerName || !ridePassengerPhone || !rideOrigin || !rideDestination) return;

    setIsSubmittingRide(true);
    try {
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans pb-24 sm:pb-12">
      {/* ============================================================== */}
      {/* 1. HEADER ESTILO PEDIDOSYA (CURVO, MORADO OSCURO + VERDE ESMERALDA) */}
      {/* ============================================================== */}
      <header className="relative bg-gradient-to-b from-[#180A2B] via-[#220E3E] to-[#2B104F] text-white pt-4 pb-10 px-4 sm:px-6 rounded-b-[2.5rem] shadow-xl overflow-hidden">
        {/* Destellos decorativos verdes y morados */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#10B981]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 -left-20 w-72 h-72 bg-[#7C3AED]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl mx-auto space-y-4 relative z-10">
          {/* Fila 1: Selector de Dirección + Notificaciones + Carrito */}
          <div className="flex items-center justify-between gap-3">
            {/* Ubicación / Dirección activa */}
            <button
              onClick={() => setIsAddressModalOpen(true)}
              className="flex items-center gap-1.5 text-left group"
            >
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10 group-hover:bg-[#10B981]/20 transition-colors">
                <MapPin className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-medium text-emerald-300 uppercase tracking-wider">
                    Entregar en
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-300" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                  {deliveryAddress}
                </p>
              </div>
            </button>

            {/* Acciones derecha: Campanita y Carrito */}
            <div className="flex items-center gap-2">
              <Link
                href="https://wa.me/59157770679?text=Hola%20TropiBot%20necesito%20ayuda"
                target="_blank"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white border border-white/10 transition-colors"
                title="Atención al cliente"
              >
                <Bell className="w-4 h-4 text-emerald-300" />
              </Link>

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative w-10 h-10 rounded-full bg-[#10B981] hover:bg-[#059669] flex items-center justify-center text-white shadow-md shadow-emerald-900/40 transition-transform active:scale-95"
                title="Ver carrito"
              >
                <ShoppingBag className="w-4 h-4" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#180A2B] text-[#10B981] border-2 border-[#10B981] font-black text-[10px] flex items-center justify-center">
                    {totalItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Fila 2: Buscador tipo Píldora Blanca estilo PedidosYa */}
          <div className="relative pt-1">
            <div className="relative flex items-center">
              <input
                id="searchAppInput"
                name="searchAppInput"
                type="text"
                placeholder="Buscar locales, platos o mototaxis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-sm font-medium py-3.5 pl-4 pr-12 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
              <button
                onClick={() => {
                  if (activeTab !== "delivery") setActiveTab("delivery");
                }}
                className="absolute right-1.5 w-9 h-9 rounded-full bg-[#10B981] hover:bg-[#059669] text-white flex items-center justify-center shadow-sm transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Fila 3: Hero Banner / Carrusel Curvo estilo PedidosYa */}
          <div className="pt-2">
            <div className="relative rounded-3xl bg-gradient-to-r from-[#2A1149] to-[#144234] border border-white/10 p-5 overflow-hidden shadow-xl">
              <div className="relative z-10 max-w-[65%] space-y-2">
                <span className="inline-block bg-[#10B981] text-[#180A2B] font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {promoBanners[promoSlide].tag}
                </span>
                <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                  {promoBanners[promoSlide].title}
                </h2>
                <p className="text-[11px] text-slate-200 line-clamp-2">
                  {promoBanners[promoSlide].desc}
                </p>
                <button
                  onClick={promoBanners[promoSlide].action}
                  className="mt-1 bg-white hover:bg-emerald-50 text-[#180A2B] font-black text-xs px-4 py-2 rounded-full shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <span>{promoBanners[promoSlide].btnText}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#10B981]" />
                </button>
              </div>

              {/* Foto apetitosa recortada a la derecha */}
              <div className="absolute -right-4 -bottom-6 w-36 sm:w-44 h-36 sm:h-44 pointer-events-none">
                <img
                  src={promoBanners[promoSlide].img}
                  alt="Promo TropiGO"
                  className="w-full h-full object-cover rounded-full shadow-2xl border-4 border-white/10"
                />
              </div>

              {/* Indicadores de 3 puntos (Dots) */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                {promoBanners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPromoSlide(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      promoSlide === idx ? "w-5 bg-[#10B981]" : "w-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. CUERPO PRINCIPAL (ESTILO PEDIDOSYA CON VERDE & MORADO) */}
      {/* ============================================================== */}
      <main className="max-w-2xl mx-auto px-4 w-full -mt-3 space-y-6 relative z-20">
        {/* ========================================================== */}
        {/* VISTA 1: INICIO (HOME SUPER-APP ESTILO PEDIDOSYA) */}
        {/* ========================================================== */}
        {activeTab === "inicio" && (
          <div className="space-y-6">
            {/* 2 GRANDES TARJETAS PRINCIPALES (Restaurantes vs TropiTaxi) */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              {/* Tarjeta 1: Restaurantes */}
              <div
                onClick={() => {
                  setActiveTab("delivery");
                  setSelectedCategory("Restaurante");
                }}
                className="group cursor-pointer bg-white rounded-3xl p-4 shadow-sm hover:shadow-md border border-slate-100 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="w-full h-24 sm:h-28 rounded-2xl overflow-hidden mb-3 bg-amber-50">
                  <img
                    src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80"
                    alt="Restaurantes"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 group-hover:text-[#10B981] transition-colors">
                    Restaurantes
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    La comida que te gusta
                  </p>
                </div>
              </div>

              {/* Tarjeta 2: TropiTaxi (Viajes en Moto y Torito estilo Yango) */}
              <div
                onClick={() => setActiveTab("mototaxi")}
                className="group cursor-pointer bg-white rounded-3xl p-4 shadow-sm hover:shadow-md border border-slate-100 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="w-full h-24 sm:h-28 rounded-2xl overflow-hidden mb-3 bg-emerald-50">
                  <img
                    src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=400&q=80"
                    alt="TropiTaxi"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-sm sm:text-base text-slate-900 group-hover:text-[#10B981] transition-colors">
                      TropiTaxi
                    </h3>
                    <span className="text-[9px] bg-emerald-100 text-[#059669] font-black px-1.5 py-0.5 rounded-md">
                      10 Bs.
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Moto Flash & Toritos al instante
                  </p>
                </div>
              </div>

              {/* Tarjeta 3: Súper & Mercado */}
              <div
                onClick={() => {
                  setActiveTab("delivery");
                  setSelectedCategory("TODOS");
                  setSearchQuery("mercado");
                }}
                className="group cursor-pointer bg-white rounded-3xl p-3.5 shadow-sm hover:shadow-md border border-slate-100 flex items-center gap-3 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-rose-50 shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80"
                    alt="Súper"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-xs sm:text-sm text-slate-900">Súper & Mercado</h4>
                  <p className="text-[10px] text-slate-500 truncate">Tus compras desde casa</p>
                </div>
              </div>

              {/* Tarjeta 4: Mandados & Encomiendas */}
              <div
                onClick={() => {
                  setActiveTab("delivery");
                  setSelectedCategory("Mandados");
                }}
                className="group cursor-pointer bg-white rounded-3xl p-3.5 shadow-sm hover:shadow-md border border-slate-100 flex items-center gap-3 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-purple-50 shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=200&q=80"
                    alt="Mandados"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-xs sm:text-sm text-slate-900">Mandados</h4>
                  <p className="text-[10px] text-slate-500 truncate">Llevamos lo que sea</p>
                </div>
              </div>
            </div>

            {/* BARRA HORIZONTAL DE SUBCATEGORÍAS CIRCULARES */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-900">Categorías rápidas</h3>
                <button
                  onClick={() => setActiveTab("delivery")}
                  className="text-xs font-bold text-[#059669] hover:underline"
                >
                  Ver todo
                </button>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
                {quickCategories.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveTab("delivery");
                      if (item.cat) setSelectedCategory(item.cat);
                      if (item.query) setSearchQuery(item.query);
                    }}
                    className="flex flex-col items-center gap-1.5 shrink-0 group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white group-hover:bg-emerald-50 border border-slate-200/80 group-hover:border-[#10B981] shadow-xs flex items-center justify-center text-2xl transition-all group-active:scale-95">
                      {item.emoji}
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 group-hover:text-[#059669] whitespace-nowrap">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* MARCAS ALIADAS DESTACADAS EN IVIRGARZAMA */}
            <div className="space-y-2">
              <h3 className="font-black text-sm text-slate-900">Locales populares en Ivirgarzama</h3>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
                {partnerBrands.map((b, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setActiveTab("delivery");
                      setSearchQuery(b.name.split(" ")[0]);
                    }}
                    className="cursor-pointer bg-white rounded-2xl border border-slate-100 p-2.5 shadow-xs flex items-center gap-2.5 shrink-0 hover:border-[#10B981] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#180A2B] to-[#2B104F] text-white flex items-center justify-center text-lg shadow-xs">
                      {b.logo}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900 leading-tight">{b.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="text-amber-500 font-bold">★ {b.rating}</span>
                        <span>•</span>
                        <span>{b.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FEED DE PLATOS ESTRELLA (Acceso directo al modal de PedidosYa) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-slate-900">Platos destacados hoy</h3>
                  <p className="text-[11px] text-slate-500">Toca un plato para personalizarlo con notas</p>
                </div>
                <button
                  onClick={() => setActiveTab("delivery")}
                  className="text-xs font-bold text-[#059669]"
                >
                  Ver menú completo
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {merchants.flatMap((m) =>
                  m.products.slice(0, 2).map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => openProductModal(prod, m.name)}
                      className="cursor-pointer bg-white rounded-2xl border border-slate-100 p-3 shadow-xs hover:shadow-md hover:border-[#10B981] flex gap-3 transition-all"
                    >
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={getProductPhoto(prod)}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <span className="text-[9px] font-bold text-[#059669] uppercase tracking-wider">
                            {m.name}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 truncate">{prod.name}</h4>
                          <p className="text-[10px] text-slate-500 line-clamp-1">
                            {prod.description || "Plato estrella de Ivirgarzama"}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-black text-xs text-[#059669]">
                            {prod.price.toFixed(2)} Bs.
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openProductModal(prod, m.name);
                            }}
                            className="w-7 h-7 rounded-full bg-[#10B981] text-white flex items-center justify-center hover:bg-[#059669] shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* VISTA 2: DELIVERY (CATÁLOGO COMPLETO DE RESTAURANTES) */}
        {/* ========================================================== */}
        {activeTab === "delivery" && (
          <div className="space-y-5">
            {/* Filtros de Categorías horizontales */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
              {["TODOS", "Restaurante", "Farmacia", "Mandados"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSearchQuery("");
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat && !searchQuery
                      ? "bg-[#180A2B] text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {cat === "TODOS" ? "Todos los Comercios" : cat}
                </button>
              ))}
            </div>

            {/* Listado de Restaurantes y sus Productos */}
            {filteredMerchants.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-2">
                <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-sm text-slate-700">No encontramos resultados</p>
                <p className="text-xs text-slate-500">Prueba con otra palabra o categoría.</p>
                <button
                  onClick={() => {
                    setSelectedCategory("TODOS");
                    setSearchQuery("");
                  }}
                  className="mt-2 text-xs font-bold text-[#059669] underline"
                >
                  Ver todos los comercios
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredMerchants.map((merchant) => (
                  <div
                    key={merchant.id}
                    className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
                  >
                    {/* Portada amplia del Comercio estilo PedidosYa */}
                    <div className="relative h-32 sm:h-40 w-full overflow-hidden bg-slate-100">
                      <img
                        src={getMerchantCover(merchant)}
                        alt={merchant.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      
                      {/* Badges superiores */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <span className="bg-[#10B981] text-white font-black text-[10px] px-2.5 py-1 rounded-full shadow-sm">
                          🛵 Envío {(business?.baseDeliveryFee ?? 5).toFixed(0)} Bs.
                        </span>
                      </div>

                      {/* Info inferior sobre la foto */}
                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-base sm:text-lg drop-shadow-sm">
                            {merchant.name}
                          </h3>
                          <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            ★ {merchant.rating.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-200 drop-shadow-sm line-clamp-1 mt-0.5">
                          {merchant.description || "El sabor auténtico de Ivirgarzama"}
                        </p>
                      </div>
                    </div>

                    {/* Meta info del restaurante */}
                    <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        25-35 min aprox.
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#059669]" />
                        {merchant.address || "Ivirgarzama"}
                      </span>
                    </div>

                    {/* Grilla de Productos del Restaurante */}
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {merchant.products.map((product) => {
                        const inCart = cart.find((it) => it.product.id === product.id);

                        return (
                          <div
                            key={product.id}
                            onClick={() => openProductModal(product, merchant.name)}
                            className="cursor-pointer bg-slate-50/80 hover:bg-white rounded-2xl border border-slate-200/70 hover:border-[#10B981] p-3 flex gap-3 transition-all duration-150"
                          >
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                              <img
                                src={getProductPhoto(product)}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="flex-1 flex flex-col justify-between min-w-0">
                              <div>
                                <h4 className="font-bold text-xs text-slate-900 truncate">
                                  {product.name}
                                </h4>
                                {product.description && (
                                  <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                                    {product.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <span className="font-black text-xs text-[#059669]">
                                  {product.price.toFixed(2)} Bs.
                                </span>

                                {inCart ? (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1.5 bg-white border border-[#10B981] px-2 py-0.5 rounded-lg shadow-2xs"
                                  >
                                    <button
                                      onClick={() => updateQuantity(product.id, -1)}
                                      className="text-slate-600 hover:text-slate-900"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="font-bold text-xs text-[#059669]">
                                      {inCart.quantity}
                                    </span>
                                    <button
                                      onClick={() => updateQuantity(product.id, 1)}
                                      className="text-slate-600 hover:text-slate-900"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openProductModal(product, merchant.name);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-[#10B981] text-white font-bold text-[10px] flex items-center gap-1 hover:bg-[#059669] shadow-xs"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Pedir</span>
                                  </button>
                                )}
                              </div>
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

        {/* ========================================================== */}
        {/* VISTA 3: MOTOTAXI / TROPITAXI (INTEGRACIÓN ESTILO YANGO) */}
        {/* ========================================================== */}
        {activeTab === "mototaxi" && (
          <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-sm space-y-5">
            {/* Header del servicio */}
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#180A2B] text-[#10B981] flex items-center justify-center mx-auto mb-2 shadow-md">
                <Navigation className="w-6 h-6" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                TropiTaxi — Viajes en Ivirgarzama
              </h2>
              <p className="text-xs text-slate-500">
                Tarifa fija y justa en Bolivianos. Despacho inmediato al conductor más cercano.
              </p>
            </div>

            {createdRideCode ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[#059669] mx-auto" />
                <h3 className="text-base font-black text-slate-900">
                  ¡Conductor solicitado con éxito!
                </h3>
                <p className="text-xs text-slate-600">
                  Código de viaje:{" "}
                  <strong className="text-[#059669] font-mono text-sm">
                    {createdRideCode}
                  </strong>
                </p>
                <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2">
                  <Link
                    href={`https://wa.me/59157770679?text=Hola,%20acabo%20de%20pedir%20el%20viaje%20${createdRideCode}%20en%20TropiGO`}
                    target="_blank"
                    className="text-xs bg-[#10B981] text-white font-bold px-4 py-2.5 rounded-xl hover:bg-[#059669] flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Ver estado en WhatsApp</span>
                  </Link>
                  <button
                    onClick={() => setCreatedRideCode(null)}
                    className="text-xs bg-white text-slate-700 border border-slate-200 font-bold px-4 py-2.5 rounded-xl hover:bg-slate-50"
                  >
                    Pedir otro viaje
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestRide} className="space-y-4">
                {/* Radar estilo Yango */}
                <div className="bg-gradient-to-r from-[#180A2B] to-[#2B104F] text-white p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#10B981]" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">Radar activo en Ivirgarzama</p>
                      <p className="text-[10px] text-emerald-300">
                        Conductores listos • Despacho en 2 a 4 min
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-[#10B981] text-[#180A2B] px-2.5 py-1 rounded-full">
                    GPS Listo
                  </span>
                </div>

                {/* Selector de Vehículo estilo Yango (Moto Flash vs Torito) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Elige tu vehículo</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRideVehicle("MOTO")}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        rideVehicle === "MOTO"
                          ? "border-[#10B981] bg-emerald-50/70 text-slate-900 ring-2 ring-[#10B981] font-bold shadow-xs"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <span>🛵</span> Moto Flash
                        </span>
                        <span className="text-xs font-black text-[#059669]">
                          {motoFare.toFixed(2)} {fareCurrency}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        1 pasajero • Rápido y económico
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRideVehicle("TORITO")}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        rideVehicle === "TORITO"
                          ? "border-[#10B981] bg-emerald-50/70 text-slate-900 ring-2 ring-[#10B981] font-bold shadow-xs"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <span>🛺</span> Torito Trimóvil
                        </span>
                        <span className="text-xs font-black text-[#059669]">
                          {toritoFare.toFixed(2)} {fareCurrency}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Hasta 3 personas • Techo lluvia ☔
                      </p>
                    </button>
                  </div>
                </div>

                {/* Chips de Destinos Frecuentes estilo Yango */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500">
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
                            ? "bg-[#180A2B] text-white border-[#180A2B]"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        📍 {poi}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Origen y Destino */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="rideOrigin" className="text-xs font-bold text-slate-700">
                      Punto de partida (Origen)
                    </label>
                    <input
                      id="rideOrigin"
                      name="rideOrigin"
                      type="text"
                      required
                      placeholder="Ej: Mercado Central"
                      value={rideOrigin}
                      onChange={(e) => setRideOrigin(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="rideDestination" className="text-xs font-bold text-slate-700">
                      Punto de llegada (Destino)
                    </label>
                    <input
                      id="rideDestination"
                      name="rideDestination"
                      type="text"
                      required
                      placeholder="Ej: Terminal de Buses"
                      value={rideDestination}
                      onChange={(e) => setRideDestination(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Pasajero y WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="ridePassengerName" className="text-xs font-bold text-slate-700">
                      Tu nombre
                    </label>
                    <input
                      id="ridePassengerName"
                      name="ridePassengerName"
                      type="text"
                      required
                      placeholder="Ej: Jhosep Carrasco"
                      value={ridePassengerName}
                      onChange={(e) => setRidePassengerName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="ridePassengerPhone" className="text-xs font-bold text-slate-700">
                      Número de WhatsApp
                    </label>
                    <input
                      id="ridePassengerPhone"
                      name="ridePassengerPhone"
                      type="tel"
                      required
                      placeholder="Ej: 57770679"
                      value={ridePassengerPhone}
                      onChange={(e) => setRidePassengerPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Resumen Tarifa */}
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs border border-slate-200">
                  <span className="text-slate-600 font-medium">Tarifa fija estimada:</span>
                  <span className="font-black text-sm text-[#059669]">
                    {estimatedRideFare.toFixed(2)} {fareCurrency}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingRide}
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-black text-xs sm:text-sm py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{isSubmittingRide ? "Buscando conductor..." : "Pedir Conductor Ahora"}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* VISTA 4: RASTREO DE PEDIDO O VIAJE */}
        {/* ========================================================== */}
        {activeTab === "rastreo" && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#180A2B] text-[#10B981] flex items-center justify-center mx-auto mb-2 shadow-md">
                <Clock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Rastrear Pedido o Carrera</h2>
              <p className="text-xs text-slate-500">
                Ingresa tu código (ej: <strong>TRP-1041</strong> o <strong>VIAJE-2001</strong>).
              </p>
            </div>

            <form onSubmit={handleSearchTracking} className="flex gap-2">
              <input
                id="trackingCodeInput"
                name="trackingCodeInput"
                type="text"
                required
                placeholder="Código TRP-XXXX"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-2.5 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isTrackingLoading}
                className="bg-[#180A2B] hover:bg-[#2B104F] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
              >
                {isTrackingLoading ? "..." : "Consultar"}
              </button>
            </form>

            {trackingError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-center">
                {trackingError}
              </div>
            )}

            {trackingResult && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-mono font-bold text-slate-900">{trackingResult.code}</span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-[#059669]">
                    {trackingResult.statusLabel}
                  </span>
                </div>
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
                    <strong>Total:</strong>{" "}
                    <span className="font-bold text-[#059669]">
                      {trackingResult.totalAmount.toFixed(2)} Bs.
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* 3. MODAL DE PRODUCTO ESTILO PEDIDOSYA (FOTO + NOTAS AL CHEF + EXTRA) */}
      {/* ============================================================== */}
      {selectedProductForModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Foto grande superior con botón de cerrar */}
            <div className="relative h-48 sm:h-56 w-full bg-slate-900">
              <img
                src={getProductPhoto(selectedProductForModal.product)}
                alt={selectedProductForModal.product.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedProductForModal(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white font-black flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>
              <div className="absolute bottom-3 left-3">
                <span className="bg-[#180A2B] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {selectedProductForModal.merchantName}
                </span>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <h3 className="font-black text-lg text-slate-900 leading-tight">
                  {selectedProductForModal.product.name}
                </h3>
                <p className="font-black text-base text-[#059669] mt-1">
                  {selectedProductForModal.product.price.toFixed(2)} Bs.
                </p>
                {selectedProductForModal.product.description && (
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {selectedProductForModal.product.description}
                  </p>
                )}
              </div>

              {/* Instrucciones para la cocina */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label
                  htmlFor="modalNotes"
                  className="text-xs font-bold text-slate-700 flex items-center justify-between"
                >
                  <span>Notas especiales para el restaurante</span>
                  <span className="text-[10px] font-normal text-slate-400">Opcional</span>
                </label>
                <textarea
                  id="modalNotes"
                  name="modalNotes"
                  rows={2}
                  placeholder="Ej: Sin cebolla, bien tostado, con harto llajwa..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:bg-white focus:outline-none resize-none"
                />
              </div>

              {/* Selector de Cantidad */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700">Cantidad</span>
                <div className="flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                    disabled={modalQuantity <= 1}
                    className="text-slate-600 hover:text-slate-900 disabled:opacity-30"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-black text-sm text-slate-900 min-w-5 text-center">
                    {modalQuantity}
                  </span>
                  <button
                    onClick={() => setModalQuantity((q) => q + 1)}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer con Botón Verde Grande */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={handleAddFromModal}
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-black text-xs sm:text-sm py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-between px-5 active:scale-98"
              >
                <span>Agregar al Pedido</span>
                <span className="bg-black/15 px-2.5 py-1 rounded-lg text-xs font-black">
                  {(selectedProductForModal.product.price * modalQuantity).toFixed(2)} Bs.
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. BARRA DE PEDIDO FLOTANTE (STICKY CART BAR ESTILO PEDIDOSYA) */}
      {/* ============================================================== */}
      {cart.length > 0 && !isCartOpen && !isCheckoutOpen && !selectedProductForModal && (
        <div className="fixed bottom-16 sm:bottom-6 left-4 right-4 max-w-xl mx-auto z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            onClick={() => setIsCartOpen(true)}
            className="cursor-pointer bg-gradient-to-r from-[#180A2B] via-[#240E3E] to-[#10B981] text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border border-white/10 hover:scale-[1.01] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="relative bg-white/20 p-2 rounded-xl">
                <ShoppingBag className="w-5 h-5 text-white" />
                <span className="absolute -top-1.5 -right-1.5 bg-[#10B981] text-[#180A2B] font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {totalItemsCount}
                </span>
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm">Ver tu carrito</p>
                <p className="text-[11px] text-emerald-200">
                  {cart.length} {cart.length === 1 ? "ítem seleccionado" : "platos en orden"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-black text-sm sm:text-base text-white">
                {subtotal.toFixed(2)} Bs.
              </span>
              <div className="bg-white/20 p-1.5 rounded-lg">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. DRAWER / MODAL DEL CARRITO */}
      {/* ============================================================== */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl p-5 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#059669]" />
                <h3 className="font-black text-base text-slate-900">Tu Pedido TropiGO</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
                <ShoppingBag className="w-12 h-12 stroke-1" />
                <p className="text-xs font-bold text-slate-600">Tu carrito está vacío</p>
                <p className="text-[11px]">Agrega platos de los locales de Ivirgarzama para comenzar.</p>
              </div>
            ) : (
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{item.product.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{item.merchantName}</p>
                      {item.notes && (
                        <p className="text-[10px] text-purple-700 italic truncate">
                          Nota: {item.notes}
                        </p>
                      )}
                      <p className="font-black text-[#059669] mt-0.5">
                        {(item.product.price * item.quantity).toFixed(2)} Bs.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="text-slate-500 hover:text-slate-900"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="text-slate-500 hover:text-slate-900"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal platos:</span>
                    <span>{subtotal.toFixed(2)} Bs.</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Envío:</span>
                    <span className="text-[#059669] font-bold">Desde 5.00 Bs. (según zona)</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-100">
                    <span>Total a pagar:</span>
                    <span className="text-[#059669]">{totalAmount.toFixed(2)} Bs.</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-black text-xs sm:text-sm py-3.5 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <span>Continuar al Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. MODAL DE CHECKOUT FINAL */}
      {/* ============================================================== */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900">Finalizar Pedido en TropiGO</h3>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label htmlFor="customerName" className="font-bold text-slate-700">
                  Tu nombre completo
                </label>
                <input
                  id="customerName"
                  name="customerName"
                  type="text"
                  required
                  placeholder="Ej: Jhosep Carrasco"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="customerPhone" className="font-bold text-slate-700">
                  Número de WhatsApp
                </label>
                <input
                  id="customerPhone"
                  name="customerPhone"
                  type="tel"
                  required
                  placeholder="Ej: 57770679"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="deliveryAddressModal" className="font-bold text-slate-700">
                  Dirección exacta de entrega
                </label>
                <input
                  id="deliveryAddressModal"
                  name="deliveryAddressModal"
                  type="text"
                  required
                  placeholder="Ej: Av. Mortensen esq. Cochabamba"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="referencePoint" className="font-bold text-slate-700">
                  Referencia de tu casa o local
                </label>
                <input
                  id="referencePoint"
                  name="referencePoint"
                  type="text"
                  placeholder="Ej: Portón verde, al lado de la tienda Don Juan"
                  value={referencePoint}
                  onChange={(e) => setReferencePoint(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Forma de pago</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("EFECTIVO")}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentMethod === "EFECTIVO"
                        ? "border-[#10B981] bg-emerald-50 font-bold text-[#059669]"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    💵 Efectivo al recibir
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("QR_BANCO")}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentMethod === "QR_BANCO"
                        ? "border-[#10B981] bg-emerald-50 font-bold text-[#059669]"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    📲 QR Simple Bancario
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-sm text-slate-900">
                <span>Total platos:</span>
                <span className="text-[#059669]">{totalAmount.toFixed(2)} Bs.</span>
              </div>

              <button
                type="submit"
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-black text-xs sm:text-sm py-3.5 rounded-2xl shadow-md transition-all active:scale-98"
              >
                Enviar Pedido por WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. MODAL DE CAMBIO RÁPIDO DE DIRECCIÓN */}
      {/* ============================================================== */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900">Seleccionar Ubicación</h3>
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] text-slate-500">Puntos de referencia en Ivirgarzama:</p>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {ivirgarzamaPOIs.map((poi) => (
                  <button
                    key={poi}
                    onClick={() => {
                      setDeliveryAddress(poi);
                      setIsAddressModalOpen(false);
                    }}
                    className="w-full p-2.5 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#059669] flex items-center gap-2 border border-slate-100 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    <span>{poi}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. BARRA DE NAVEGACIÓN INFERIOR (BOTTOM APP BAR ESTILO PEDIDOSYA) */}
      {/* ============================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 px-3 py-2 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {/* 1. Inicio */}
          <button
            onClick={() => setActiveTab("inicio")}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
              activeTab === "inicio" ? "text-[#059669] font-black" : "text-slate-400 font-medium"
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-colors ${
                activeTab === "inicio" ? "bg-emerald-50" : ""
              }`}
            >
              <Store className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Inicio</span>
          </button>

          {/* 2. Restaurantes */}
          <button
            onClick={() => setActiveTab("delivery")}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
              activeTab === "delivery" ? "text-[#059669] font-black" : "text-slate-400 font-medium"
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-colors ${
                activeTab === "delivery" ? "bg-emerald-50" : ""
              }`}
            >
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Comida</span>
          </button>

          {/* 3. TropiTaxi (Viajes) */}
          <button
            onClick={() => setActiveTab("mototaxi")}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
              activeTab === "mototaxi" ? "text-[#059669] font-black" : "text-slate-400 font-medium"
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-colors ${
                activeTab === "mototaxi" ? "bg-emerald-50" : ""
              }`}
            >
              <Navigation className="w-5 h-5" />
            </div>
            <span className="text-[10px]">TropiTaxi</span>
          </button>

          {/* 4. Rastreo */}
          <button
            onClick={() => setActiveTab("rastreo")}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
              activeTab === "rastreo" ? "text-[#059669] font-black" : "text-slate-400 font-medium"
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-colors ${
                activeTab === "rastreo" ? "bg-emerald-50" : ""
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Rastreo</span>
          </button>

          {/* 5. TropiBot (WhatsApp) */}
          <Link
            href="https://wa.me/59157770679"
            target="_blank"
            className="flex flex-col items-center gap-0.5 py-1 px-3 text-slate-400 hover:text-[#059669] transition-colors"
          >
            <div className="p-1 rounded-xl">
              <MessageCircle className="w-5 h-5 text-[#10B981]" />
            </div>
            <span className="text-[10px]">TropiBot</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
