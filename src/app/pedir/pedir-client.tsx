"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Bike,
  Navigation,
  MapPin,
  ShoppingBag,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  Bell,
  Store,
  Tag,
  Percent,
  Receipt,
  RotateCcw,
  CreditCard,
  HelpCircle,
  Check,
  X,
  User,
  Pencil,
  Copy,
  QrCode,
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
  imageUrl?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
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

interface Promotion {
  id: string;
  code: string;
  title: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  expiresAt: string;
  merchantName: string | null;
}

interface SavedOrderItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  merchantName: string;
  quantity: number;
  notes?: string;
}

interface SavedOrder {
  code: string;
  createdAt: string;
  items: SavedOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  zoneName: string | null;
  status: "ENVIADO" | "CANCELADO";
}

interface TrackingResult {
  type: string;
  code: string;
  status: string;
  statusLabel: string;
  rider: {
    name: string;
    plateNumber: string;
    vehicleType: string;
  } | null;
}

const CUSTOMER_STORAGE_KEY = "tropigo.customer";
const ORDERS_STORAGE_KEY = "tropigo.orders";
const MAX_SAVED_ORDERS = 20;

function formatBs(value: number): string {
  return `${value.toFixed(2)} Bs.`;
}

function formatOrderDate(value: string): string {
  try {
    return new Date(value).toLocaleString("es-BO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function statusTone(status: string): string {
  if (status === "ENTREGADO" || status === "FINALIZADO") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (status === "CANCELADO") {
    return "bg-red-100 text-red-800 border-red-200";
  }
  if (status === "EN_CAMINO" || status === "EN_CURSO") {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  return "bg-sky-100 text-sky-800 border-sky-200";
}

function categoryEmoji(value: string): string {
  const key = value.toLowerCase();
  if (key.includes("bebida") || key.includes("gaseosa") || key.includes("jugo")) return "🥤";
  if (key.includes("carne") || key.includes("pollo") || key.includes("embutido")) return "🍖";
  if (key.includes("fruta") || key.includes("verdura")) return "🥬";
  if (key.includes("lácteo") || key.includes("lacteo") || key.includes("leche")) return "🥛";
  if (key.includes("limpieza") || key.includes("aseo")) return "🧼";
  if (key.includes("medic") || key.includes("farmacia") || key.includes("salud")) return "💊";
  if (key.includes("snack") || key.includes("galleta") || key.includes("dulce")) return "🍪";
  if (key.includes("abarrote") || key.includes("despensa")) return "🛒";
  if (key.includes("pan") || key.includes("panadería") || key.includes("panaderia")) return "🥖";
  return "📦";
}

function merchantEmoji(merchant: Merchant): string {
  const value = `${merchant.category} ${merchant.name}`.toLowerCase();
  if (value.includes("farmacia") || value.includes("salud")) return "💊";
  if (value.includes("pollo") || value.includes("broaster")) return "🍗";
  if (value.includes("burger") || value.includes("hamburg")) return "🍔";
  if (value.includes("helado") || value.includes("postre")) return "🍦";
  if (value.includes("mercado") || value.includes("market") || value.includes("super")) return "🛒";
  if (value.includes("mandado") || value.includes("envío") || value.includes("envio")) return "📦";
  return "🍲";
}

type PortalTab =
  | "inicio"
  | "mercados"
  | "promos"
  | "pedidos"
  | "perfil"
  | "delivery"
  | "mototaxi"
  | "rastreo";

// Componente Oficial Logo TropiGO (según branding oficial del proyecto)
function TropiGOLogo({
  size = 36,
  bg = "bg-[#0D7B46]",
  className = "",
}: {
  size?: number;
  bg?: string;
  className?: string;
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-2xl flex items-center justify-center shadow-sm select-none shrink-0 overflow-hidden ${bg} ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-1.5"
      >
        <path
          d="M20 28C20 23.58 23.58 20 28 20H72C76.42 20 80 23.58 80 28C80 32.42 76.42 36 72 36H57.5L50 82C49.3 86.42 45.4 89.6 40.9 89.1C36.48 88.6 33.3 84.7 34 80.2L41.5 36H28C23.58 36 20 32.42 20 28Z"
          fill="white"
        />
      </svg>
    </div>
  );
}

// Imágenes reales de comida de alta calidad
function getProductPhoto(product: Product): string {
  if (product.imageUrl && product.imageUrl.trim()) {
    return product.imageUrl;
  }
  const name = product.name.toLowerCase();
  if (name.includes("pollo") || name.includes("broaster") || name.includes("alitas") || name.includes("pechuga")) {
    return "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=500&q=80";
  }
  if (name.includes("hamburguesa") || name.includes("burger") || name.includes("lomito")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80";
  }
  if (name.includes("carne") || name.includes("bife") || name.includes("asado") || name.includes("parrilla") || name.includes("churrasco")) {
    return "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=500&q=80";
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
  if (name.includes("coca") || name.includes("cola") || name.includes("soda") || name.includes("gaseosa")) {
    return "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80";
  }
  if (name.includes("jugo") || name.includes("bebida") || name.includes("mocochinchi")) {
    return "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80";
  }
  return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=80";
}

function getMerchantCover(merchant: Merchant): string {
  if (merchant.bannerUrl && merchant.bannerUrl.trim()) return merchant.bannerUrl;
  if (merchant.imageUrl && merchant.imageUrl.trim()) return merchant.imageUrl;
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
  initialTrackingCode = "",
  promotions = [],
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
  initialTrackingCode?: string;
  promotions?: Promotion[];
  rideFares?: { MOTO: number; TORITO: number; currency: string };
}) {
  const motoFare = rideFares?.MOTO ?? 10;
  const toritoFare = rideFares?.TORITO ?? 11;
  const fareCurrency = rideFares?.currency || "Bs.";
  const defaultDeliveryFee = Number(business?.baseDeliveryFee ?? 5);

  // Estado del Portal
  const [activeTab, setActiveTab] = useState<PortalTab>(
    initialTab &&
      [
        "inicio",
        "mercados",
        "promos",
        "pedidos",
        "perfil",
        "delivery",
        "mototaxi",
        "rastreo",
      ].includes(initialTab)
      ? initialTab
      : "inicio"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [marketSearch, setMarketSearch] = useState("");
  const [marketCategory, setMarketCategory] = useState("TODOS");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [ordersFilter, setOrdersFilter] = useState<"ENVIADOS" | "CANCELADOS">("ENVIADOS");
  const [selectedZoneId, setSelectedZoneId] = useState("");

  // Formulario Checkout
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState(initialAddress);
  const [referencePoint, setReferencePoint] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"EFECTIVO" | "QR_BANCO">("EFECTIVO");

  // Historial local de pedidos enviados por WhatsApp
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>([]);
  const [lastSentOrder, setLastSentOrder] = useState<SavedOrder | null>(null);
  const [isOrderSentOpen, setIsOrderSentOpen] = useState(false);

  // Perfil editable
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileDraftName, setProfileDraftName] = useState("");
  const [profileDraftPhone, setProfileDraftPhone] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal de Detalle de Producto estilo PedidosYa
  const [selectedProductForModal, setSelectedProductForModal] = useState<{
    product: Product;
    merchantName: string;
  } | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNotes, setModalNotes] = useState("");

  // Puntos Frecuentes de Ivirgarzama (POIs estilo Yango)
  const ivirgarzamaPOIs = [
    "Plaza Principal de Ivirgarzama",
    "Hospital de Segundo Nivel Ivirgarzama",
    "Mercado Central de Ivirgarzama",
    "Mercado Campesino Ivirgarzama",
    "Terminal de Buses Ivirgarzama",
    "Cruce Mariposas, Trópico",
    "Av. Mortensen",
    "Sindicato San Salvador",
    "Av. Blanco Galindo, Cochabamba",
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
  const [createdRideUrl, setCreatedRideUrl] = useState<string | null>(null);
  const [createdRideFare, setCreatedRideFare] = useState<number | null>(null);

  // Rastrear Pedido
  const [trackingCode, setTrackingCode] = useState(initialTrackingCode);
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Hidratar datos guardados en el navegador (nombre, teléfono, dirección e historial)
  useEffect(() => {
    try {
      const rawCustomer = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
      if (rawCustomer) {
        const saved = JSON.parse(rawCustomer) as {
          name?: string;
          phone?: string;
          address?: string;
          reference?: string;
        };
        if (saved.name) {
          setCustomerName(saved.name);
          setRidePassengerName((current) => current || saved.name!);
        }
        if (saved.phone) {
          setCustomerPhone(saved.phone);
          setRidePassengerPhone((current) => current || saved.phone!);
        }
        if (saved.address) setDeliveryAddress(saved.address);
        if (saved.reference) setReferencePoint(saved.reference);
      }

      const rawOrders = window.localStorage.getItem(ORDERS_STORAGE_KEY);
      if (rawOrders) {
        const parsed = JSON.parse(rawOrders);
        if (Array.isArray(parsed)) {
          setSavedOrders(parsed.slice(0, MAX_SAVED_ORDERS) as SavedOrder[]);
        }
      }
    } catch {
      // localStorage puede estar bloqueado; el portal sigue funcionando.
    }
  }, []);

  // Si llega un código por la URL (/pedir?codigo=TRP-XXXX), buscarlo al abrir.
  useEffect(() => {
    const code = initialTrackingCode.trim();
    if (!code) return;
    void searchTracking(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTrackingCode]);

  const persistCustomer = (data: {
    name: string;
    phone: string;
    address: string;
    reference: string;
  }) => {
    try {
      window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Sin persistencia: no es crítico.
    }
  };

  const persistOrders = (orders: SavedOrder[]) => {
    try {
      window.localStorage.setItem(
        ORDERS_STORAGE_KEY,
        JSON.stringify(orders.slice(0, MAX_SAVED_ORDERS))
      );
    } catch {
      // Sin persistencia: no es crítico.
    }
  };

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

  // Locales reales cargados desde la base de datos
  const partnerBrands = useMemo(
    () =>
      merchants.slice(0, 6).map((merchant) => ({
        id: merchant.id,
        name: merchant.name.replace(/^\[DEMO\]\s*/i, ""),
        time: merchant.category?.toLowerCase().includes("farmacia")
          ? "15-25 min"
          : "25-35 min",
        rating: merchant.rating.toFixed(1),
        logo: merchantEmoji(merchant),
        category: merchant.category,
      })),
    [merchants]
  );

  // Categorías reales disponibles en el catálogo
  const categoryOptions = useMemo(() => {
    const values = new Set<string>();
    merchants.forEach((merchant) => {
      if (merchant.category) values.add(merchant.category);
    });
    return ["TODOS", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [merchants]);

  // Catálogo real del Market: primero comercios tipo mercado/farmacia/tienda
  const marketCatalog = useMemo(() => {
    const preferred = merchants.filter((merchant) =>
      /mercado|market|super|mini|farmacia|tienda|mandado|despensa/i.test(
        `${merchant.category} ${merchant.name}`
      )
    );
    const source = preferred.length > 0 ? preferred : merchants;
    return source.flatMap((merchant) =>
      merchant.products.map((product) => ({
        product,
        merchantName: merchant.name.replace(/^\[DEMO\]\s*/i, ""),
      }))
    );
  }, [merchants]);

  const filteredMarketCatalog = useMemo(() => {
    const query = marketSearch.trim().toLowerCase();
    return marketCatalog.filter(({ product, merchantName }) => {
      const haystack = `${product.category ?? ""} ${product.name} ${product.description ?? ""} ${merchantName}`.toLowerCase();
      if (marketCategory !== "TODOS" && !haystack.includes(marketCategory.toLowerCase())) {
        return false;
      }
      if (!query) return true;
      return haystack.includes(query);
    });
  }, [marketCatalog, marketCategory, marketSearch]);

  // Categorías reales disponibles dentro del catálogo de mercado
  const marketCategories = useMemo(() => {
    const counts = new Map<string, number>();
    marketCatalog.forEach(({ product }) => {
      const key = product.category?.trim();
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count]) => ({ label, count, emoji: categoryEmoji(label) }));
  }, [marketCatalog]);

  // Productos reales destacados para la vista de promociones
  const featuredProducts = useMemo(
    () =>
      merchants
        .flatMap((merchant) =>
          merchant.products.map((product) => ({
            product,
            merchantName: merchant.name.replace(/^\[DEMO\]\s*/i, ""),
          }))
        )
        .slice(0, 6),
    [merchants]
  );

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
    const matchCategory = m.category.toLowerCase().includes(query);
    const matchProduct = m.products.some((p) => p.name.toLowerCase().includes(query));
    return matchMerchant || matchCategory || matchProduct;
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

  // Agregar rápido al carrito desde TropiGO Market, Promos o un pedido repetido
  const addToCartQuick = (product: Product, merchantName: string, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity,
          merchantName,
        },
      ];
    });
  };

  // Repetir un pedido anterior: vuelve a llenar el carrito con los mismos ítems
  const handleRepeatOrder = (order: SavedOrder) => {
    if (!order.items.length) return;
    order.items.forEach((item) => {
      addToCartQuick(
        {
          id: item.id,
          name: item.name,
          price: item.price,
          description: null,
          category: "Repetido",
          merchantId: "repeat",
          imageUrl: item.image,
        },
        item.merchantName,
        item.quantity
      );
    });
    setIsCartOpen(true);
  };

  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? null;
  const deliveryFee = selectedZone ? selectedZone.baseDeliveryCost : defaultDeliveryFee;
  const grandTotal = subtotal + deliveryFee;
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Enviar el pedido a WhatsApp con TropiBot (único flujo de confirmación seguro)
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      alert("Por favor completa tu nombre, teléfono y dirección de entrega.");
      return;
    }
    if (zones.length > 0 && !selectedZoneId) {
      alert("Selecciona tu zona de entrega para calcular el costo de envío.");
      return;
    }
    if (cart.length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }

    const code = `WEB-${Date.now().toString(36).slice(-5).toUpperCase()}`;
    const itemsDetail = cart
      .map(
        (item) =>
          `• ${item.quantity}x ${item.product.name} (${formatBs(
            item.product.price * item.quantity
          )})${item.notes ? `\n   ↳ _Nota: ${item.notes}_` : ""}`
      )
      .join("\n");

    const zoneLabel = selectedZone?.name ?? "A confirmar por TropiBot";
    const message =
      `🌴 *NUEVO PEDIDO DESDE TROPIGO (APP / WEB)*\n\n` +
      `🧾 *Código web:* ${code}\n` +
      `👤 *Cliente:* ${customerName.trim()}\n` +
      `📱 *WhatsApp:* ${customerPhone.trim()}\n` +
      `📍 *Dirección de entrega:* ${deliveryAddress.trim()}\n` +
      (referencePoint.trim() ? `🏠 *Referencia:* ${referencePoint.trim()}\n` : "") +
      `🗺️ *Zona:* ${zoneLabel}\n` +
      `💳 *Forma de pago:* ${
        paymentMethod === "EFECTIVO" ? "💵 Efectivo al recibir" : "📲 QR Simple Bancario"
      }\n\n` +
      `📋 *DETALLE DEL PEDIDO:*\n${itemsDetail}\n\n` +
      `💰 *Subtotal productos:* ${formatBs(subtotal)}\n` +
      `🛵 *Envío estimado:* ${formatBs(deliveryFee)}\n` +
      `🧮 *Total estimado:* *${formatBs(grandTotal)}*\n\n` +
      `¡Hola TropiBot! Confirma mi pedido, valida el envío y asígname un repartidor.`;

    const waUrl = `https://wa.me/59157770679?text=${encodeURIComponent(message)}`;
    const opened = window.open(waUrl, "_blank");

    const orderItems: SavedOrderItem[] = cart.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      image: item.product.imageUrl ?? null,
      merchantName: item.merchantName,
      quantity: item.quantity,
      notes: item.notes,
    }));

    const savedOrder: SavedOrder = {
      code,
      createdAt: new Date().toISOString(),
      items: orderItems,
      subtotal,
      deliveryFee,
      total: grandTotal,
      zoneName: selectedZone?.name ?? null,
      status: "ENVIADO",
    };

    persistCustomer({
      name: customerName.trim(),
      phone: customerPhone.trim(),
      address: deliveryAddress.trim(),
      reference: referencePoint.trim(),
    });

    const nextOrders = [savedOrder, ...savedOrders].slice(0, MAX_SAVED_ORDERS);
    setSavedOrders(nextOrders);
    persistOrders(nextOrders);

    setLastSentOrder(savedOrder);
    setIsOrderSentOpen(true);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    setCart([]);

    if (!opened) {
      // Algunos navegadores bloquean window.open. El modal muestra el enlace directo.
      console.warn("El navegador bloqueó la apertura automática de WhatsApp.");
    }
  };

  // Enviar Carrera de Mototaxi (la tarifa siempre la calcula el servidor)
  const handleRequestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ridePassengerName || !ridePassengerPhone || !rideOrigin || !rideDestination) return;

    setIsSubmittingRide(true);
    try {
      const res = await fetch("/api/public/rides/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passengerName: ridePassengerName,
          passengerPhone: ridePassengerPhone,
          originAddress: rideOrigin,
          destinationAddress: rideDestination,
          vehicleType: rideVehicle,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedRideCode(data.tripNumber);
        setCreatedRideUrl(data.urlSeguimiento ?? null);
        setCreatedRideFare(typeof data.fareAmount === "number" ? data.fareAmount : null);
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Error al solicitar conductor.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al pedir mototaxi.");
    } finally {
      setIsSubmittingRide(false);
    }
  };

  // Buscar un pedido o carrera por su código TRP-XXXX / VIAJE-XXXX
  async function searchTracking(code: string) {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    setTrackingCode(cleanCode);
    setIsTrackingLoading(true);
    setTrackingError(null);
    setTrackingResult(null);

    try {
      const res = await fetch(
        `/api/public/tracking?code=${encodeURIComponent(cleanCode)}`
      );
      if (res.ok) {
        const data = (await res.json()) as TrackingResult;
        setTrackingResult(data);
      } else {
        setTrackingError("No encontramos ningún pedido o carrera con ese código.");
      }
    } catch {
      setTrackingError("Error al consultar el rastreo. Revisa tu conexión.");
    } finally {
      setIsTrackingLoading(false);
    }
  }

  const handleSearchTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    await searchTracking(trackingCode);
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    const name = profileDraftName.trim();
    const phone = profileDraftPhone.trim();
    setCustomerName(name);
    setCustomerPhone(phone);
    setRidePassengerName((current) => current || name);
    setRidePassengerPhone((current) => current || phone);
    persistCustomer({
      name,
      phone,
      address: deliveryAddress.trim(),
      reference: referencePoint.trim(),
    });
    setIsProfileModalOpen(false);
  };

  const copyPromoCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Si el navegador bloquea el portapapeles, igual mostramos el código.
    }
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(null), 1800);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans pb-24 sm:pb-12">
      {/* ============================================================== */}
      {/* 1. HEADER VERDE ESMERALDA (EXACTO AL MOCKUP Y BRANDING OFICIAL) */}
      {/* ============================================================== */}
      <header className="relative bg-[#0D7B46] text-white pt-4 pb-12 px-4 sm:px-6 rounded-b-[2.5rem] shadow-xl overflow-hidden">
        {/* Destellos sutiles y formas curvas */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 -left-20 w-72 h-72 bg-[#074423]/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl mx-auto space-y-3.5 relative z-10">
          {/* Fila 1: Selector de Dirección + Carrito estilo Mockup */}
          <div className="flex items-center justify-between gap-3">
            {/* Ubicación / Dirección activa */}
            <button
              onClick={() => setIsAddressModalOpen(true)}
              className="flex items-center gap-1.5 text-left group min-w-0"
            >
              <span className="text-sm sm:text-base font-extrabold text-white truncate max-w-[240px] sm:max-w-md">
                {deliveryAddress.trim() || "Elegir dirección de entrega"}
              </span>
              <ChevronDown className="w-4 h-4 text-emerald-200 shrink-0 group-hover:translate-y-0.5 transition-transform" />
            </button>

            {/* Acciones derecha: Notificación WhatsApp y Carrito de compras */}
            <div className="flex items-center gap-2">
              <Link
                href="https://wa.me/59157770679?text=Hola%20TropiBot%2C%20necesito%20ayuda"
                target="_blank"
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                title="Atención TropiBot WhatsApp 24/7"
              >
                <Bell className="w-4 h-4 text-white" />
              </Link>

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-transform active:scale-95"
                title="Ver carrito de compras"
              >
                <ShoppingCart className="w-5 h-5 text-white" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#F5C22B] text-slate-950 font-black text-[11px] flex items-center justify-center shadow-md">
                    {totalItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Fila 2: Buscador tipo Píldora Blanca: "Locales, platos y productos" */}
          <div className="relative pt-0.5">
            <div className="relative flex items-center">
              <input
                id="searchAppInput"
                name="searchAppInput"
                type="text"
                placeholder="Locales, platos y productos"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && activeTab !== "delivery") {
                    setActiveTab("delivery");
                  }
                }}
                className="w-full bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-sm font-semibold py-3.5 pl-5 pr-12 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                onClick={() => {
                  if (activeTab !== "delivery") setActiveTab("delivery");
                }}
                className="absolute right-1.5 w-9 h-9 rounded-full bg-[#0D7B46] hover:bg-[#074423] text-white flex items-center justify-center shadow-sm transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Fila 3: Hero Banner Verde Oscuro #074423 con Logo TropiGO y [XX]% OFF */}
          <div className="pt-1.5">
            <div className="relative rounded-3xl bg-[#074423] border border-white/10 p-5 sm:p-6 overflow-hidden shadow-2xl">
              <div className="relative z-10 max-w-[62%] sm:max-w-[65%] space-y-2">
                {/* Logo badge TropiGO con "T" */}
                <div className="flex items-center gap-2">
                  <TropiGOLogo size={32} bg="bg-[#0D7B46]" />
                  <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wider">
                    TropiGO
                  </span>
                </div>

                <h2 className="text-base sm:text-xl font-black text-white leading-tight">
                  Tus compras hasta
                </h2>

                <div className="inline-block bg-[#F5C22B] text-slate-950 font-black text-base sm:text-xl px-3 py-1 rounded-xl shadow-md tracking-tight">
                  50% OFF
                </div>

                <p className="text-[11px] text-emerald-100/90 font-medium line-clamp-1 pt-0.5">
                  Restaurantes, mercado y despensa fresca
                </p>

                <button
                  onClick={() => setActiveTab("mercados")}
                  className="mt-1 bg-white hover:bg-emerald-50 text-[#074423] font-black text-xs px-4 py-2 rounded-full shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <span>Ver TropiGO Market</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#0D7B46]" />
                </button>
              </div>

              {/* Foto apetitosa recortada a la derecha (Coca-Cola, vegetales, broaster) */}
              <div className="absolute -right-3 -bottom-3 sm:-right-4 sm:-bottom-4 w-36 sm:w-48 h-36 sm:h-48 pointer-events-none flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80"
                  alt="Mercado TropiGO"
                  className="w-full h-full object-cover rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-white/20 transform rotate-2"
                />
              </div>

              {/* Indicadores de 3 puntos (Dots) */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                <span className="w-5 h-1.5 rounded-full bg-[#F5C22B]" />
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. CUERPO PRINCIPAL */}
      {/* ============================================================== */}
      <main className="max-w-2xl mx-auto px-4 w-full -mt-3 space-y-6 relative z-20">
        {/* ========================================================== */}
        {/* VISTA 1: INICIO (HOME SUPER-APP EXACTA AL MOCKUP) */}
        {/* ========================================================== */}
        {activeTab === "inicio" && (
          <div className="space-y-6">
            {/* 2x2 GRID DE CATEGORÍAS PRINCIPALES (EXACTO AL MOCKUP) */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              {/* Card 1: Restaurantes */}
              <div
                onClick={() => {
                  setActiveTab("delivery");
                  setSelectedCategory("Restaurante");
                }}
                className="group cursor-pointer bg-[#F3F4F6] hover:bg-white rounded-3xl p-4 shadow-sm hover:shadow-md border border-slate-200/60 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="w-full h-28 sm:h-32 rounded-2xl overflow-hidden mb-3 bg-white shadow-inner">
                  <img
                    src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80"
                    alt="Restaurantes"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-[#0D7B46] transition-colors leading-tight">
                    Restaurantes
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hamburguesas, broaster y platos
                  </p>
                </div>
              </div>

              {/* Card 2: TropiGO Market (Fondo Menta Suave #E6F7ED) */}
              <div
                onClick={() => setActiveTab("mercados")}
                className="group cursor-pointer bg-[#E6F7ED] hover:bg-[#d8f2e2] rounded-3xl p-4 shadow-sm hover:shadow-md border border-emerald-200/60 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="w-full h-28 sm:h-32 rounded-2xl overflow-hidden mb-3 bg-white shadow-inner relative">
                  <img
                    src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80"
                    alt="TropiGO Market"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 left-2 bg-[#0D7B46] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs">
                    T Market
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[#074423] transition-colors leading-tight">
                    TropiGO Market
                  </h3>
                  <p className="text-[11px] text-emerald-800/80 mt-0.5">
                    Supermercado, Coca-Cola y despensa
                  </p>
                </div>
              </div>

              {/* Card 3: Farmacia y Salud */}
              <div
                onClick={() => {
                  setActiveTab("delivery");
                  setSearchQuery("");
                  setSelectedCategory("Farmacia");
                }}
                className="group cursor-pointer bg-[#F3F4F6] hover:bg-white rounded-3xl p-4 shadow-sm hover:shadow-md border border-slate-200/60 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="w-full h-28 sm:h-32 rounded-2xl overflow-hidden mb-3 bg-white shadow-inner">
                  <img
                    src="https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=500&q=80"
                    alt="Farmacia y Salud"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-[#0D7B46] transition-colors leading-tight">
                    Farmacia y Salud
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Medicamentos y cuidado personal
                  </p>
                </div>
              </div>

              {/* Card 4: Mandados Express */}
              <div
                onClick={() => {
                  setActiveTab("delivery");
                  setSearchQuery("");
                  setSelectedCategory("Mandados");
                }}
                className="group cursor-pointer bg-[#F3F4F6] hover:bg-white rounded-3xl p-4 shadow-sm hover:shadow-md border border-slate-200/60 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="w-full h-28 sm:h-32 rounded-2xl overflow-hidden mb-3 bg-white shadow-inner">
                  <img
                    src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=500&q=80"
                    alt="Mandados Express"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-[#0D7B46] transition-colors leading-tight">
                    Mandados Express
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Encomiendas y trámites en el pueblo
                  </p>
                </div>
              </div>
            </div>

            {/* BANNER TROPITAXI (Yango Style) */}
            <div
              onClick={() => setActiveTab("mototaxi")}
              className="cursor-pointer bg-gradient-to-r from-[#074423] to-[#0D7B46] text-white rounded-3xl p-4 shadow-lg flex items-center justify-between gap-4 transition-all hover:scale-[1.01]"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-[#F5C22B] text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase">
                    Yango Moto
                  </span>
                  <span className="text-xs font-bold text-emerald-200">Tarifa fija 10 Bs.</span>
                </div>
                <h3 className="font-black text-base sm:text-lg text-white">
                  TropiTaxi: Moto Flash & Torito
                </h3>
                <p className="text-[11px] text-emerald-100">
                  Llega a tu destino en 3 min o envía paquetes sin moverte
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                <Bike className="w-8 h-8 text-[#F5C22B]" />
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
                      setSelectedCategory(item.cat ?? "TODOS");
                      setSearchQuery(item.query ?? "");
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
                {partnerBrands.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      setActiveTab("delivery");
                      setSelectedCategory("TODOS");
                      setSearchQuery(b.name);
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
              {categoryOptions.map((cat) => (
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
                {createdRideFare != null && (
                  <p className="text-xs text-slate-600">
                    Tarifa calculada por el servidor:{" "}
                    <strong className="text-[#059669]">
                      {formatBs(createdRideFare)}
                    </strong>
                  </p>
                )}
                <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2">
                  {createdRideUrl && (
                    <Link
                      href={createdRideUrl}
                      className="text-xs bg-[#180A2B] text-white font-bold px-4 py-2.5 rounded-xl hover:bg-black flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Ver seguimiento en vivo</span>
                    </Link>
                  )}
                  <Link
                    href={`https://wa.me/59157770679?text=Hola,%20acabo%20de%20pedir%20el%20viaje%20${createdRideCode}%20en%20TropiGO`}
                    target="_blank"
                    className="text-xs bg-[#10B981] text-white font-bold px-4 py-2.5 rounded-xl hover:bg-[#059669] flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Ver estado en WhatsApp</span>
                  </Link>
                  <button
                    onClick={() => {
                      setCreatedRideCode(null);
                      setCreatedRideUrl(null);
                      setCreatedRideFare(null);
                    }}
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
        {/* VISTA 4: RASTREO DE PEDIDOS Y CARRERAS */}
        {/* ========================================================== */}
        {activeTab === "rastreo" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-[#E6F7ED] text-[#0D7B46] flex items-center justify-center mx-auto mb-2">
                  <MapPin className="w-6 h-6" />
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  Rastrea tu pedido o carrera
                </h2>
                <p className="text-xs text-slate-500">
                  Ingresa el código que te envió TropiBot por WhatsApp (ej: TRP-1045 o VIAJE-2001).
                </p>
              </div>

              <form onSubmit={handleSearchTracking} className="flex gap-2">
                <input
                  id="trackingCode"
                  name="trackingCode"
                  type="text"
                  placeholder="TRP-1045 o VIAJE-2001"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-3 text-xs sm:text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0D7B46] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isTrackingLoading || !trackingCode.trim()}
                  className="bg-[#0D7B46] hover:bg-[#074423] disabled:opacity-50 text-white font-bold text-xs px-4 py-3 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>{isTrackingLoading ? "Buscando..." : "Buscar"}</span>
                </button>
              </form>

              {trackingError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs font-semibold">
                  {trackingError}
                </div>
              )}

              {trackingResult && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {trackingResult.type}
                      </p>
                      <h3 className="font-mono text-base font-black text-slate-900">
                        {trackingResult.code}
                      </h3>
                    </div>
                    <span
                      className={`text-[11px] font-black px-3 py-1 rounded-full border ${statusTone(
                        trackingResult.status
                      )}`}
                    >
                      {trackingResult.statusLabel}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-[#0D7B46]" />
                      <span className="font-semibold">Estado actualizado por TropiGO</span>
                    </div>
                    {trackingResult.rider ? (
                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200">
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {trackingResult.rider.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {trackingResult.rider.vehicleType} • Placa{" "}
                            {trackingResult.rider.plateNumber}
                          </p>
                        </div>
                        <a
                          href={`https://wa.me/59157770679?text=${encodeURIComponent(
                            `Hola TropiBot, quiero consultar el estado de ${trackingResult.code}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-9 h-9 rounded-full bg-[#0D7B46] text-white flex items-center justify-center"
                          title="Consultar por WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        Aún no hay un repartidor asignado. Te avisaremos por WhatsApp en cuanto uno
                        acepte.
                      </p>
                    )}
                  </div>

                  <a
                    href={`https://wa.me/59157770679?text=${encodeURIComponent(
                      `Hola TropiBot, necesito ayuda con mi ${trackingResult.type.toLowerCase()} ${trackingResult.code}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-black text-xs sm:text-sm py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Consultar detalles por WhatsApp</span>
                  </a>
                </div>
              )}

              {!trackingResult && !trackingError && !isTrackingLoading && (
                <div className="bg-[#F8FAFC] border border-dashed border-slate-200 rounded-2xl p-4 text-center space-y-1">
                  <Clock className="w-6 h-6 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">
                    El mapa en vivo llega por WhatsApp
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Al confirmar tu pedido, TropiBot te envía un enlace privado con el mapa y el ETA.
                  </p>
                </div>
              )}
            </div>

            {savedOrders.length > 0 && (
              <button
                onClick={() => setActiveTab("pedidos")}
                className="w-full bg-white border border-slate-200 hover:border-[#10B981] rounded-2xl p-3 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Receipt className="w-4 h-4 text-[#0D7B46]" />
                <span>Ver mis {savedOrders.length} pedidos web enviados</span>
              </button>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* VISTA 5: TROPIGO MARKET / MERCADOS (ESTILO PDF PÁGINA 4) */}
        {/* ========================================================== */}
        {activeTab === "mercados" && (
          <div className="space-y-5">
            {/* Buscador de mercado estilo PDF Pág 4 */}
            <div className="relative">
              <input
                id="marketSearch"
                name="marketSearch"
                type="search"
                placeholder="¿Qué estás buscando?"
                value={marketSearch}
                onChange={(e) => setMarketSearch(e.target.value)}
                className="w-full bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-sm font-semibold py-3.5 pl-11 pr-4 rounded-full shadow-md border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#0D7B46]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            {/* Categorías reales del catálogo estilo PDF Pág 4 */}
            <div className="grid grid-cols-4 gap-2.5">
              <button
                onClick={() => setMarketCategory("TODOS")}
                className="flex flex-col items-center gap-1.5 group text-center"
              >
                <div
                  className={`w-full aspect-square rounded-2xl overflow-hidden p-1.5 border shadow-xs transition-all group-active:scale-95 flex items-center justify-center text-3xl ${
                    marketCategory === "TODOS"
                      ? "bg-emerald-50 border-[#0D7B46]"
                      : "bg-[#F4EEF2] border-slate-200/70 group-hover:border-[#0D7B46]"
                  }`}
                >
                  ✨
                </div>
                <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 leading-tight">
                  Todos
                </span>
              </button>

              {marketCategories.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setMarketCategory(item.label)}
                  className="flex flex-col items-center gap-1.5 group text-center"
                >
                  <div
                    className={`w-full aspect-square rounded-2xl overflow-hidden p-1.5 border shadow-xs transition-all group-active:scale-95 flex items-center justify-center text-3xl ${
                      marketCategory === item.label
                        ? "bg-emerald-50 border-[#0D7B46]"
                        : "bg-[#F4EEF2] border-slate-200/70 group-hover:border-[#0D7B46]"
                    }`}
                  >
                    {item.emoji}
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 leading-tight line-clamp-2">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Chip de % Promociones */}
            <div className="flex items-center gap-2">
              <span className="bg-[#F4EEF2] text-[#1F0E1C] font-extrabold text-xs px-3.5 py-1.5 rounded-full shadow-xs flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-[#0D7B46]" />
                <span>Promociones</span>
              </span>
            </div>

            {/* Banner Amarillo Envíos Gratis estilo PDF Pág 4 */}
            <div className="bg-[#F5C22B] text-slate-950 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-slate-900 shrink-0" />
                <p className="text-xs sm:text-sm font-black leading-snug">
                  Tienes 4 envíos sin costo, ¡aprovecha y pide!
                </p>
              </div>
              <button
                onClick={(e) => {
                  const target = e.currentTarget.parentElement;
                  if (target) target.style.display = "none";
                }}
                className="w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4 text-slate-900" />
              </button>
            </div>

            {/* Contenedor Verde Pastel TropiGO Market estilo PDF Pág 4 */}
            <div className="bg-[#E6F4D7] rounded-3xl p-4 sm:p-5 border border-emerald-200/80 shadow-sm space-y-4">
              <div>
                <span className="text-[11px] font-black text-[#0D7B46] uppercase tracking-wider">
                  TropiGO Market
                </span>
                <h3 className="text-base sm:text-lg font-black text-[#1F0E1C] leading-tight">
                  Ofertas del día con envío gratis
                </h3>
              </div>

              {/* Grid de productos reales del catálogo con botón "+" */}
              {filteredMarketCatalog.length === 0 ? (
                <div className="bg-white/70 border border-dashed border-emerald-300 rounded-2xl p-6 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-700">
                    No encontramos productos con ese filtro.
                  </p>
                  <button
                    onClick={() => {
                      setMarketCategory("TODOS");
                      setMarketSearch("");
                    }}
                    className="text-[11px] font-bold text-[#0D7B46] underline"
                  >
                    Ver todo el catálogo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {filteredMarketCatalog.map(({ product, merchantName }) => (
                    <div
                      key={`${product.merchantId}-${product.id}`}
                      className="bg-white rounded-2xl p-3 border border-emerald-100 shadow-xs flex flex-col justify-between group hover:shadow-md transition-shadow relative"
                    >
                      <div>
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-50 mb-2.5">
                          <img
                            src={getProductPhoto(product)}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {product.category && (
                            <span className="absolute top-1.5 left-1.5 bg-white/90 text-slate-700 font-bold text-[9px] px-1.5 py-0.5 rounded-md shadow-xs max-w-[85%] truncate">
                              {product.category}
                            </span>
                          )}
                        </div>

                        <h4 className="font-extrabold text-xs text-slate-900 line-clamp-2">
                          {product.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium truncate">
                          {merchantName}
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <div className="font-black text-xs sm:text-sm text-slate-900">
                          {formatBs(product.price)}
                        </div>

                        <button
                          onClick={() => addToCartQuick(product, merchantName)}
                          className="w-8 h-8 rounded-full bg-[#0D7B46] hover:bg-[#074423] text-white flex items-center justify-center shadow-md transition-transform active:scale-90"
                          title="Agregar al carrito"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* VISTA 6: PROMOCIONES (ESTILO PDF PÁGINA 5) */}
        {/* ========================================================== */}
        {activeTab === "promos" && (
          <div className="space-y-5">
            {/* Banner Amarillo Envíos Gratis estilo PDF Pág 5 */}
            <div className="bg-[#F5C22B] text-slate-950 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-slate-900 shrink-0" />
                <p className="text-xs sm:text-sm font-black leading-snug">
                  Tienes 4 envíos sin costo, ¡aprovecha y pide!
                </p>
              </div>
              <button
                onClick={(e) => {
                  const target = e.currentTarget.parentElement;
                  if (target) target.style.display = "none";
                }}
                className="w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4 text-slate-900" />
              </button>
            </div>

            {/* Cupones reales activos cargados desde la base de datos */}
            {promotions.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg sm:text-xl font-black text-[#1F0E1C]">
                  Cupones activos
                </h2>
                <div className="space-y-2.5">
                  {promotions.map((promotion) => (
                    <div
                      key={promotion.id}
                      className="bg-white rounded-2xl border border-dashed border-[#0D7B46]/40 p-3.5 flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-[#0D7B46] uppercase tracking-wider">
                          {promotion.merchantName ?? "TropiGO"}
                        </span>
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                          {promotion.title}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {promotion.discountType === "PERCENTAGE"
                            ? `${promotion.discountValue}% de descuento`
                            : `${formatBs(promotion.discountValue)} de descuento`}
                          {promotion.minOrderAmount > 0
                            ? ` • mínimo ${formatBs(promotion.minOrderAmount)}`
                            : ""}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Vence {formatOrderDate(promotion.expiresAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => copyPromoCode(promotion.code)}
                        className="shrink-0 bg-[#F4EEF2] hover:bg-[#e9dfe6] text-[#1F0E1C] font-black text-[11px] px-3 py-2 rounded-xl flex items-center gap-1.5"
                        title="Copiar código"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#0D7B46]" />
                        <span>{copiedCode === promotion.code ? "¡Copiado!" : promotion.code}</span>
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  Envía el código por WhatsApp al confirmar tu pedido para aplicarlo.
                </p>
              </div>
            )}

            {/* Sección Productos Destacados estilo PDF Pág 5 */}
            <div className="space-y-3">
              <h2 className="text-lg sm:text-xl font-black text-[#1F0E1C]">
                Productos destacados
              </h2>

              {featuredProducts.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                  Aún no hay productos publicados por los locales de Ivirgarzama.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {featuredProducts.map(({ product, merchantName }) => (
                    <div
                      key={`${product.merchantId}-${product.id}`}
                      className="bg-white rounded-3xl border border-slate-100 p-3.5 shadow-sm hover:shadow-md transition-shadow flex gap-3.5 items-center justify-between"
                    >
                      <div className="flex gap-3 items-center min-w-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 relative">
                          <img
                            src={getProductPhoto(product)}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <span className="text-[10px] font-bold text-[#0D7B46] uppercase truncate block">
                            {merchantName}
                          </span>
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 line-clamp-2">
                            {product.name}
                          </h4>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="font-black text-xs sm:text-sm text-slate-900">
                              {formatBs(product.price)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => addToCartQuick(product, merchantName)}
                        className="w-9 h-9 rounded-full bg-[#0D7B46] hover:bg-[#074423] text-white flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95"
                        title="Agregar al carrito"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sección Descubre las promos más buscadas estilo PDF Pág 5 */}
            <div className="space-y-3 pt-2">
              <h2 className="text-lg sm:text-xl font-black text-[#1F0E1C]">
                Descubre las promos más buscadas
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => {
                    setActiveTab("delivery");
                    setSelectedCategory("Restaurante");
                  }}
                  className="cursor-pointer bg-gradient-to-tr from-[#1F0E1C] to-[#3a1b35] text-white rounded-3xl p-4 shadow-md flex flex-col justify-between h-36"
                >
                  <span className="bg-[#F5C22B] text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full w-fit">
                    Almuerzos
                  </span>
                  <div>
                    <h3 className="font-black text-sm">Almuerzos Ejecutivos</h3>
                    <p className="text-[10px] text-slate-300">Desde 15 Bs. con sopa y segundo</p>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab("mercados")}
                  className="cursor-pointer bg-gradient-to-tr from-[#0D7B46] to-[#074423] text-white rounded-3xl p-4 shadow-md flex flex-col justify-between h-36"
                >
                  <span className="bg-[#F5C22B] text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full w-fit">
                    Mercado
                  </span>
                  <div>
                    <h3 className="font-black text-sm">Combos Despensa</h3>
                    <p className="text-[10px] text-emerald-100">Arroz, aceite, leche y gaseosa</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* VISTA 7: MIS PEDIDOS (ESTILO PDF PÁGINA 9) */}
        {/* ========================================================== */}
        {activeTab === "pedidos" && (
          <div className="space-y-5">
            {/* Header del módulo */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-black text-[#1F0E1C]">
                Mis pedidos
              </h2>
              <button
                onClick={() => setIsCartOpen(true)}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700"
              >
                <ShoppingCart className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle de Filtro: enviados vs cancelados */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOrdersFilter("ENVIADOS")}
                className={`px-5 py-2 rounded-full text-xs font-black transition-all ${
                  ordersFilter === "ENVIADOS"
                    ? "bg-[#1F0E1C] text-white shadow-sm"
                    : "bg-[#F4EEF2] text-slate-600 hover:bg-slate-200"
                }`}
              >
                Enviados
              </button>
              <button
                onClick={() => setOrdersFilter("CANCELADOS")}
                className={`px-5 py-2 rounded-full text-xs font-black transition-all ${
                  ordersFilter === "CANCELADOS"
                    ? "bg-[#1F0E1C] text-white shadow-sm"
                    : "bg-[#F4EEF2] text-slate-600 hover:bg-slate-200"
                }`}
              >
                Cancelados
              </button>
            </div>

            {/* Listado de pedidos web enviados por WhatsApp */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-slate-500 uppercase tracking-wider">
                Pedidos enviados desde tu dispositivo
              </h3>

              {(() => {
                const visibleOrders = savedOrders.filter((order) =>
                  ordersFilter === "ENVIADOS"
                    ? order.status === "ENVIADO"
                    : order.status === "CANCELADO"
                );

                if (visibleOrders.length === 0) {
                  return (
                    <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center space-y-2">
                      <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">
                        {ordersFilter === "ENVIADOS"
                          ? "Todavía no enviaste ningún pedido"
                          : "No tienes pedidos cancelados"}
                      </p>
                      {ordersFilter === "ENVIADOS" && (
                        <button
                          onClick={() => setActiveTab("delivery")}
                          className="text-[11px] font-bold text-[#0D7B46] underline"
                        >
                          Ver locales y pedir ahora
                        </button>
                      )}
                    </div>
                  );
                }

                return visibleOrders.map((order) => (
                  <div
                    key={order.code}
                    className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span
                          className={`text-[11px] font-bold ${
                            order.status === "CANCELADO" ? "text-rose-600" : "text-[#0D7B46]"
                          }`}
                        >
                          {order.status === "CANCELADO"
                            ? "Cancelado"
                            : "Enviado por WhatsApp"}{" "}
                          • {formatOrderDate(order.createdAt)}
                        </span>
                        <h4 className="font-mono font-black text-sm sm:text-base text-slate-900 leading-tight">
                          {order.code}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {order.zoneName ?? "Zona a confirmar"}
                        </p>
                      </div>
                      <span className="font-black text-sm sm:text-base text-slate-900 shrink-0">
                        {formatBs(order.total)}
                      </span>
                    </div>

                    {/* Fila de miniaturas de los productos enviados */}
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                      {order.items.map((item) => (
                        <div
                          key={`${order.code}-${item.id}`}
                          className="w-16 h-16 rounded-2xl bg-[#F4EEF2] overflow-hidden p-1 border border-slate-100 shrink-0 relative"
                        >
                          <img
                            src={
                              item.image && item.image.trim()
                                ? item.image
                                : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23F4EEF2'/%3E%3Ctext x='32' y='40' font-size='26' text-anchor='middle'%3E%F0%9F%8D%B2%3C/text%3E%3C/svg%3E"
                            }
                            alt={item.name}
                            className="w-full h-full object-cover rounded-xl"
                          />
                          <span className="absolute -bottom-1 -right-1 bg-[#1F0E1C] text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center">
                            {item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-500">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatBs(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Envío</span>
                        <span>{formatBs(order.deliveryFee)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleRepeatOrder(order)}
                        className="bg-[#F4EEF2] hover:bg-[#e9dfe6] text-[#1F0E1C] font-black text-xs py-2.5 rounded-full flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-[#0D7B46]" />
                        <span>Repetir</span>
                      </button>
                      <a
                        href={`https://wa.me/59157770679?text=${encodeURIComponent(
                          `Hola TropiBot, quiero consultar el estado de mi pedido ${order.code}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-[#0D7B46] hover:bg-[#074423] text-white font-black text-xs py-2.5 rounded-full flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Seguimiento</span>
                      </a>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {savedOrders.length > 0 && (
              <p className="text-[10px] text-slate-400 text-center">
                Este historial se guarda solo en este dispositivo. El estado final lo confirma
                TropiBot por WhatsApp.
              </p>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* VISTA 8: MI PERFIL (ESTILO PDF PÁGINA 10) */}
        {/* ========================================================== */}
        {activeTab === "perfil" && (
          <div className="space-y-5">
            <h2 className="text-xl sm:text-2xl font-black text-[#1F0E1C]">
              Mi perfil
            </h2>

            {/* Tarjeta de Usuario estilo PDF Pág 10 */}
            <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#F4EEF2] text-[#0D7B46] font-black text-xl flex items-center justify-center shrink-0 border border-slate-200">
                {customerName.trim()
                  ? customerName
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? "")
                      .join("")
                  : "TG"}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-base sm:text-lg text-[#1F0E1C] leading-tight truncate">
                  {customerName.trim() || "Cliente TropiGO"}
                </h3>
                <p className="text-xs text-slate-500 font-medium truncate">
                  {customerPhone.trim() || "Agrega tu número de WhatsApp"}
                </p>
                <span className="inline-block mt-1 bg-emerald-100 text-[#074423] font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                  Cliente TropiGO 🌴
                </span>
              </div>
              <button
                onClick={() => {
                  setProfileDraftName(customerName);
                  setProfileDraftPhone(customerPhone);
                  setIsProfileModalOpen(true);
                }}
                className="shrink-0 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
                title="Editar mis datos"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>

            {/* Lista de Opciones de Menú estilo PDF Pág 10 */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm divide-y divide-slate-100 overflow-hidden">
              <button
                onClick={() => setIsAddressModalOpen(true)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <MapPin className="w-5 h-5 text-[#0D7B46]" />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      Mis direcciones
                    </h4>
                    <p className="text-[11px] text-slate-500">{deliveryAddress}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <CreditCard className="w-5 h-5 text-[#0D7B46]" />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      Métodos de pago
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {paymentMethod === "EFECTIVO" ? "Efectivo al recibir" : "QR Simple Bancario"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setActiveTab("promos")}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <Tag className="w-5 h-5 text-[#0D7B46]" />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      Cupones
                    </h4>
                    <p className="text-[11px] text-slate-500">Tus descuentos disponibles</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <Link
                href="https://wa.me/59157770679?text=Hola%20TropiBot%2C%20necesito%20ayuda%20con%20mi%20cuenta"
                target="_blank"
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <HelpCircle className="w-5 h-5 text-[#0D7B46]" />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      Ayuda y soporte WhatsApp
                    </h4>
                    <p className="text-[11px] text-slate-500">Atención oficial con IA (+591 57770679)</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
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
                    <span className="text-[#059669] font-bold">
                      {selectedZone
                        ? `${formatBs(deliveryFee)} • ${selectedZone.name}`
                        : `Desde ${formatBs(defaultDeliveryFee)}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-100">
                    <span>Total estimado:</span>
                    <span className="text-[#059669]">{formatBs(grandTotal)}</span>
                  </div>
                </div>
                {!selectedZone && (
                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    Elige tu zona en el checkout para confirmar el costo de envío.
                  </p>
                )}

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

              {zones.length > 0 && (
                <div className="space-y-1">
                  <label htmlFor="deliveryZone" className="font-bold text-slate-700">
                    Zona de entrega
                  </label>
                  <select
                    id="deliveryZone"
                    name="deliveryZone"
                    required
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:bg-white focus:outline-none"
                  >
                    <option value="">Selecciona tu zona</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} — {formatBs(zone.baseDeliveryCost)}
                      </option>
                    ))}
                  </select>
                  {selectedZone && (
                    <p className="text-[10px] text-slate-500">
                      Tiempo estimado de entrega: {selectedZone.estimatedMinutes} min.
                    </p>
                  )}
                </div>
              )}

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

              <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal platos:</span>
                  <span>{formatBs(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Envío ({selectedZone?.name ?? "zona a confirmar"}):</span>
                  <span>{formatBs(deliveryFee)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
                  <span>Total estimado:</span>
                  <span className="text-[#059669]">{formatBs(grandTotal)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-black text-xs sm:text-sm py-3.5 rounded-2xl shadow-md transition-all active:scale-98"
              >
                Enviar Pedido por WhatsApp
              </button>
              <p className="text-[10px] text-slate-500 text-center leading-snug">
                TropiBot valida precios, envío y disponibilidad antes de confirmar tu pedido.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. MODAL DE PEDIDO ENVIADO (RESUMEN + WHATSAPP + RASTREO) */}
      {/* ============================================================== */}
      {isOrderSentOpen && lastSentOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#0D7B46] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-base text-slate-900">¡Pedido enviado!</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                TropiBot recibió tu resumen en WhatsApp. Confirma el mensaje para que el pedido
                quede registrado y te asigne un repartidor.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 text-left space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Código web
                </span>
                <button
                  onClick={() => copyPromoCode(lastSentOrder.code)}
                  className="text-[11px] font-black font-mono text-[#0D7B46] flex items-center gap-1"
                >
                  {lastSentOrder.code}
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal</span>
                <span>{formatBs(lastSentOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Envío</span>
                <span>{formatBs(lastSentOrder.deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                <span>Total estimado</span>
                <span className="text-[#0D7B46]">{formatBs(lastSentOrder.total)}</span>
              </div>
            </div>

            {copiedCode === lastSentOrder.code && (
              <p className="text-[11px] font-bold text-[#0D7B46]">Código copiado</p>
            )}

            <div className="space-y-2">
              <a
                href={`https://wa.me/59157770679?text=${encodeURIComponent(
                  `Hola TropiBot, acabo de enviar el pedido ${lastSentOrder.code}. ¿Me confirmas la cotización y el tiempo de entrega?`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-black text-xs sm:text-sm py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Abrir WhatsApp de nuevo</span>
              </a>
              <button
                onClick={() => {
                  setIsOrderSentOpen(false);
                  setActiveTab("pedidos");
                }}
                className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-2.5 rounded-2xl flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4 text-[#0D7B46]" />
                <span>Ver mis pedidos enviados</span>
              </button>
              <button
                onClick={() => setIsOrderSentOpen(false)}
                className="w-full text-[11px] font-bold text-slate-500 hover:text-slate-700 py-1"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. MODAL DE EDICIÓN DE PERFIL */}
      {/* ============================================================== */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900">Mis datos</h3>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label htmlFor="profileName" className="font-bold text-slate-700">
                  Nombre completo
                </label>
                <input
                  id="profileName"
                  name="profileName"
                  type="text"
                  value={profileDraftName}
                  onChange={(e) => setProfileDraftName(e.target.value)}
                  placeholder="Ej: María Fernández"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="profilePhone" className="font-bold text-slate-700">
                  WhatsApp
                </label>
                <input
                  id="profilePhone"
                  name="profilePhone"
                  type="tel"
                  value={profileDraftPhone}
                  onChange={(e) => setProfileDraftPhone(e.target.value)}
                  placeholder="Ej: 71234567"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:bg-white focus:outline-none"
                />
              </div>

              <p className="text-[10px] text-slate-500 leading-snug">
                Estos datos se guardan solo en este dispositivo y se completan automáticamente en
                tu próximo pedido.
              </p>

              <button
                type="submit"
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-black text-xs py-3 rounded-2xl shadow-md"
              >
                Guardar datos
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. MODAL DE CAMBIO RÁPIDO DE DIRECCIÓN */}
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
      {/* 8. BARRA DE NAVEGACIÓN INFERIOR (5 PESTAÑAS EXACTAS AL PDF) */}
      {/* ============================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 px-3 py-2 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {/* 1. Inicio (PDF Pág 2) */}
          <button
            onClick={() => setActiveTab("inicio")}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
              activeTab === "inicio" ? "text-[#0D7B46] font-black" : "text-slate-400 font-medium"
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

          {/* 2. Mercados (PDF Pág 4) */}
          <button
            onClick={() => setActiveTab("mercados")}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
              activeTab === "mercados" ? "text-[#0D7B46] font-black" : "text-slate-400 font-medium"
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-colors ${
                activeTab === "mercados" ? "bg-emerald-50" : ""
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Mercados</span>
          </button>

          {/* 3. Promos (PDF Pág 5) */}
          <button
            onClick={() => setActiveTab("promos")}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
              activeTab === "promos" ? "text-[#0D7B46] font-black" : "text-slate-400 font-medium"
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-colors ${
                activeTab === "promos" ? "bg-emerald-50" : ""
              }`}
            >
              <Percent className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Promos</span>
          </button>

          {/* 4. Pedidos (PDF Pág 9) */}
          <button
            onClick={() => setActiveTab("pedidos")}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
              activeTab === "pedidos" ? "text-[#0D7B46] font-black" : "text-slate-400 font-medium"
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-colors ${
                activeTab === "pedidos" ? "bg-emerald-50" : ""
              }`}
            >
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Pedidos</span>
          </button>

          {/* 5. Perfil (PDF Pág 10) */}
          <button
            onClick={() => setActiveTab("perfil")}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
              activeTab === "perfil" ? "text-[#0D7B46] font-black" : "text-slate-400 font-medium"
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-colors ${
                activeTab === "perfil" ? "bg-emerald-50" : ""
              }`}
            >
              <User className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
