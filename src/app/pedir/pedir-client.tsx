"use client";

import { useState } from "react";
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
  User,
  Percent,
  Receipt,
  RotateCcw,
  CreditCard,
  HelpCircle,
  Share2,
  Check,
  X,
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

// Catálogo Real de Supermercado (TropiGO Market estilo PedidosYa Market)
interface MarketProduct {
  id: string;
  name: string;
  unit: string;
  price: number;
  originalPrice: number;
  discount: string;
  sales: string;
  image: string;
  category: string;
}

const MARKET_PRODUCTS: MarketProduct[] = [
  {
    id: "mkt-1",
    name: "Tomate Pera Fresco",
    unit: "/kg",
    price: 9.25,
    originalPrice: 18.5,
    discount: "50% OFF",
    sales: "+8mil ventas",
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=500&q=80",
    category: "Verduras",
  },
  {
    id: "mkt-2",
    name: "Coca-Cola Zero Azúcar 2L",
    unit: "Botella 2L",
    price: 11.76,
    originalPrice: 16.8,
    discount: "30% OFF",
    sales: "+12mil ventas",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80",
    category: "Bebidas",
  },
  {
    id: "mkt-3",
    name: "Huevos Sofía Marrón (Docena)",
    unit: "12 unidades",
    price: 8.5,
    originalPrice: 12.0,
    discount: "25% OFF",
    sales: "+5mil ventas",
    image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=500&q=80",
    category: "Abarrotes",
  },
  {
    id: "mkt-4",
    name: "Leche PIL Entera UHT 1 Litro",
    unit: "Bolsa 1000ml",
    price: 6.0,
    originalPrice: 7.5,
    discount: "20% OFF",
    sales: "+15mil ventas",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=500&q=80",
    category: "Lácteos",
  },
  {
    id: "mkt-5",
    name: "Pollo Sofía Entero Fresco",
    unit: "/kg",
    price: 28.0,
    originalPrice: 35.0,
    discount: "20% OFF",
    sales: "+7mil ventas",
    image: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=500&q=80",
    category: "Carnes",
  },
  {
    id: "mkt-6",
    name: "Arroz Grano de Oro Superior 1kg",
    unit: "Bolsa 1kg",
    price: 8.5,
    originalPrice: 10.0,
    discount: "15% OFF",
    sales: "+4mil ventas",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80",
    category: "Abarrotes",
  },
  {
    id: "mkt-7",
    name: "Aceite Fino Clásico 900ml",
    unit: "Botella 900ml",
    price: 12.0,
    originalPrice: 14.5,
    discount: "17% OFF",
    sales: "+6mil ventas",
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80",
    category: "Abarrotes",
  },
  {
    id: "mkt-8",
    name: "Cerveza Huari Tradicional 710ml",
    unit: "Botella 710ml",
    price: 14.0,
    originalPrice: 18.0,
    discount: "22% OFF",
    sales: "+3mil ventas",
    image: "https://images.unsplash.com/photo-1608270199920-534a7844005b?auto=format&fit=crop&w=500&q=80",
    category: "Bebidas",
  },
];

// Promociones Reales Destacadas
const PROMO_PRODUCTS = [
  {
    id: "prm-1",
    name: "Krunchy Bites 5 piezas + Papas Fritas",
    restaurant: "Pollos El Trópico",
    price: 46.8,
    originalPrice: 52.0,
    discount: "10% DTO",
    freeDelivery: true,
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "prm-2",
    name: "Silpancho Cochabambino Especial con Huevo y Carne",
    restaurant: "Palacio del Silpancho",
    price: 20.0,
    originalPrice: 28.0,
    discount: "29% DTO",
    exclusiveBadge: "Solo en TropiGO",
    freeDelivery: true,
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "prm-3",
    name: "Doble Smash Cheeseburger con Tocino y Papas",
    restaurant: "Burger King Ivirgarzama",
    price: 25.0,
    originalPrice: 35.0,
    discount: "30% OFF",
    freeDelivery: false,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "prm-4",
    name: "Pizza Familiar Pepperoni Suprema con Mozzarella",
    restaurant: "Pizzería Venecia",
    price: 50.0,
    originalPrice: 70.0,
    discount: "28% OFF",
    freeDelivery: true,
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "prm-5",
    name: "Sushi Roll Salmón Tropical (10 cortes)",
    restaurant: "Oishi Sushi Bar",
    price: 38.0,
    originalPrice: 45.0,
    discount: "15% DTO",
    freeDelivery: false,
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=500&q=80",
  },
];

// Historial de Pedidos Realistas estilo PedidosYa
const ORDER_HISTORY_MOCK = [
  {
    id: "ord-1",
    store: "Tropical Chicken - Hipermaxi Av Juan De L...",
    date: "mar 29 de sept",
    status: "Entregado",
    total: 143,
    items: [
      { name: "Combo Broaster Familiar", img: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=200&q=80" },
      { name: "Porción de Arroz Especial", img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=200&q=80" },
      { name: "Mocochinchi Helado 1L", img: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ord-2",
    store: "Burger King Ivirgarzama",
    date: "Ayer 20:15",
    status: "Entregado",
    total: 55,
    items: [
      { name: "Doble Bacon Burger", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80" },
      { name: "Coca-Cola 2L", img: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=200&q=80" },
    ],
  },
];

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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [promoSlide, setPromoSlide] = useState(0);
  const [ordersFilter, setOrdersFilter] = useState<"ENTREGADOS" | "CANCELADOS">("ENTREGADOS");

  // Formulario Checkout
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState(
    initialAddress || "Av. Blanco Galindo, Cochabamba"
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

  // Puntos Frecuentes Cochabamba e Ivirgarzama (POIs estilo Yango)
  const ivirgarzamaPOIs = [
    "Av. Blanco Galindo, Cochabamba",
    "Plaza Colón, Cochabamba",
    "Quillacollo Centro, Cochabamba",
    "Cala Cala, Cochabamba",
    "Plaza Principal de Ivirgarzama",
    "Hospital de Segundo Nivel Ivirgarzama",
    "Mercado Central de Ivirgarzama",
    "Mercado Campesino Ivirgarzama",
    "Terminal de Buses Ivirgarzama",
    "Cruce Mariposas, Trópico",
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

  // Agregar rápido al carrito desde TropiGO Market o Promos (botón "+")
  const addToCartQuick = (
    item: { id: string; name: string; price: number; image?: string },
    merchantName: string
  ) => {
    const prod: Product = {
      id: item.id,
      name: item.name,
      price: item.price,
      description: "",
      imageUrl: item.image || null,
      merchantId: "mkt-main",
      category: "Mercado",
    };
    setCart((prev) => {
      const existing = prev.find((it) => it.product.id === prod.id);
      if (existing) {
        return prev.map((it) =>
          it.product.id === prod.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [
        ...prev,
        {
          product: prod,
          quantity: 1,
          merchantName,
        },
      ];
    });
  };

  // Repetir pedido anterior al instante
  const handleRepeatOrder = (order: (typeof ORDER_HISTORY_MOCK)[0]) => {
    order.items.forEach((item, idx) => {
      addToCartQuick(
        {
          id: `repeat-${order.id}-${idx}`,
          name: item.name,
          price: idx === 0 ? order.total - 15 : 15,
          image: item.img,
        },
        order.store
      );
    });
    setIsCartOpen(true);
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
                {deliveryAddress}
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

              {/* Card 3: Tiendas */}
              <div
                onClick={() => {
                  setActiveTab("delivery");
                  setSelectedCategory("Tiendas");
                }}
                className="group cursor-pointer bg-[#F3F4F6] hover:bg-white rounded-3xl p-4 shadow-sm hover:shadow-md border border-slate-200/60 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="w-full h-28 sm:h-32 rounded-2xl overflow-hidden mb-3 bg-white shadow-inner">
                  <img
                    src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=500&q=80"
                    alt="Tiendas"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-[#0D7B46] transition-colors leading-tight">
                    Tiendas
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Regalos, bazar, librería y hogar
                  </p>
                </div>
              </div>

              {/* Card 4: Carnicerías */}
              <div
                onClick={() => {
                  setActiveTab("delivery");
                  setSelectedCategory("Carnicerías");
                }}
                className="group cursor-pointer bg-[#F3F4F6] hover:bg-white rounded-3xl p-4 shadow-sm hover:shadow-md border border-slate-200/60 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="w-full h-28 sm:h-32 rounded-2xl overflow-hidden mb-3 bg-white shadow-inner">
                  <img
                    src="https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=500&q=80"
                    alt="Carnicerías"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-[#0D7B46] transition-colors leading-tight">
                    Carnicerías
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cortes frescos de res, pollo y cerdo
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
        {/* VISTA 4: RASTREO EN VIVO (ESTILO PDF PÁGINA 8) */}
        {/* ========================================================== */}
        {activeTab === "rastreo" && (
          <div className="space-y-4">
            {/* Mapa simulado con ruta y puntos de entrega */}
            <div className="relative h-64 sm:h-72 w-full rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm flex items-center justify-center">
              {/* Cuadrícula de calles simulada */}
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px]" />
              
              {/* Calles SVG */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <line x1="20%" y1="0%" x2="20%" y2="100%" stroke="#e2e8f0" strokeWidth="8" />
                <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="#e2e8f0" strokeWidth="10" />
                <line x1="80%" y1="0%" x2="80%" y2="100%" stroke="#e2e8f0" strokeWidth="8" />
                <line x1="0%" y1="30%" x2="100%" y2="30%" stroke="#e2e8f0" strokeWidth="8" />
                <line x1="0%" y1="65%" x2="100%" y2="65%" stroke="#e2e8f0" strokeWidth="12" />
                
                {/* Ruta de entrega punteada */}
                <path
                  d="M 120 220 L 120 120 L 280 120 L 280 40"
                  fill="none"
                  stroke="#1F0E1C"
                  strokeWidth="4"
                  strokeDasharray="6 6"
                />
              </svg>

              {/* Punto de origen (Local / Restaurante) */}
              <div className="absolute left-[108px] top-[208px] flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-[#0D7B46] border-2 border-white shadow-md flex items-center justify-center text-[10px] text-white font-bold">
                  ●
                </div>
              </div>

              {/* Moto en camino (animada) */}
              <div className="absolute left-[180px] top-[106px] -translate-x-1/2 -translate-y-1/2 bg-[#0D7B46] text-white p-2 rounded-full shadow-lg border-2 border-white animate-pulse">
                <Bike className="w-5 h-5" />
              </div>

              {/* Punto de destino (Casa del cliente) */}
              <div className="absolute left-[268px] top-[28px] flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-[#1F0E1C] border-2 border-white shadow-md flex items-center justify-center text-[10px] text-white font-bold">
                  ●
                </div>
              </div>

              {/* Botón Volver */}
              <button
                onClick={() => setActiveTab("inicio")}
                className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center z-10 transition-transform active:scale-95"
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>
            </div>

            {/* Tarjeta de Estado del Pedido estilo PDF Pág 8 */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    Llega en 18 min
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Destino: {deliveryAddress}
                  </p>
                </div>
                <span className="bg-emerald-100 text-[#059669] text-xs font-black px-3 py-1 rounded-full">
                  En tiempo
                </span>
              </div>

              {/* Pasos del pedido con checks */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0D7B46] text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    Pedido confirmado
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0D7B46] text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    Preparando tu pedido
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-500">
                    En camino a tu dirección
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-400">
                    Entregado
                  </span>
                </div>
              </div>

              {/* Tarjeta del Repartidor estilo PDF Pág 8 */}
              <div className="pt-2">
                <div className="bg-[#F4EEF2] rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white overflow-hidden shadow-xs border border-white">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                        alt="Repartidor"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">
                        Carlos Mendoza
                      </h4>
                      <p className="text-[11px] text-slate-600">Tu repartidor TropiGO (Moto)</p>
                    </div>
                  </div>

                  <Link
                    href="https://wa.me/59157770679?text=Hola%20Carlos%2C%20sobre%20mi%20pedido%20TropiGO"
                    target="_blank"
                    className="w-10 h-10 rounded-full bg-[#0D7B46] hover:bg-[#074423] text-white flex items-center justify-center shadow-md transition-transform active:scale-95"
                    title="Llamar o escribir al repartidor"
                  >
                    <Phone className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Buscador de otro código */}
              <div className="pt-2 border-t border-slate-100">
                <form onSubmit={handleSearchTracking} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Consultar otro código TRP-XXXX"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-2.5 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0D7B46] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isTrackingLoading}
                    className="bg-[#1F0E1C] hover:bg-black text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
                  >
                    {isTrackingLoading ? "..." : "Buscar"}
                  </button>
                </form>
              </div>
            </div>
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
                type="text"
                placeholder="¿Qué estás buscando?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-sm font-semibold py-3.5 pl-11 pr-4 rounded-full shadow-md border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#0D7B46]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            {/* 4 Categorías Cuadradas estilo PDF Pág 4 */}
            <div className="grid grid-cols-4 gap-2.5">
              {[
                {
                  label: "Supermercados",
                  img: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80",
                  cat: "Abarrotes",
                },
                {
                  label: "Bebidas",
                  img: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80",
                  cat: "Bebidas",
                },
                {
                  label: "Minimarkets",
                  img: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=300&q=80",
                  cat: "Minimarket",
                },
                {
                  label: "Carnes",
                  img: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=300&q=80",
                  cat: "Carnes",
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSearchQuery(item.cat)}
                  className="flex flex-col items-center gap-1.5 group text-center"
                >
                  <div className="w-full aspect-square rounded-2xl bg-[#F4EEF2] overflow-hidden p-1.5 border border-slate-200/70 group-hover:border-[#0D7B46] shadow-xs transition-all group-active:scale-95">
                    <img
                      src={item.img}
                      alt={item.label}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 leading-tight">
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

              {/* Grid de Productos Reales de Supermercado con botón "+" */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {MARKET_PRODUCTS.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-white rounded-2xl p-3 border border-emerald-100 shadow-xs flex flex-col justify-between group hover:shadow-md transition-shadow relative"
                  >
                    <div>
                      {/* Foto del Producto con badge de descuento */}
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-50 mb-2.5">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-1.5 left-1.5 bg-[#F5C22B] text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-md shadow-xs">
                          {prod.discount}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1">
                        {prod.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">{prod.unit}</p>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <div>
                        <div className="font-black text-xs sm:text-sm text-slate-900">
                          Bs {prod.price.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 line-through">
                          Bs {prod.originalPrice.toFixed(2)}
                        </div>
                      </div>

                      {/* Botón "+" para agregar al carrito al instante */}
                      <button
                        onClick={() => addToCartQuick(prod, "TropiGO Market")}
                        className="w-8 h-8 rounded-full bg-[#0D7B46] hover:bg-[#074423] text-white flex items-center justify-center shadow-md transition-transform active:scale-90"
                        title="Agregar al carrito"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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

            {/* Sección Productos Destacados estilo PDF Pág 5 */}
            <div className="space-y-3">
              <h2 className="text-lg sm:text-xl font-black text-[#1F0E1C]">
                Productos destacados
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {PROMO_PRODUCTS.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl border border-slate-100 p-3.5 shadow-sm hover:shadow-md transition-shadow flex gap-3.5 items-center justify-between"
                  >
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 relative">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-1 left-1 bg-[#F5C22B] text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-md shadow-xs">
                          {item.discount}
                        </span>
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[10px] font-bold text-[#0D7B46] uppercase">
                          {item.restaurant}
                        </span>
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 line-clamp-2">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="font-black text-xs sm:text-sm text-slate-900">
                            Bs {item.price.toFixed(2)}
                          </span>
                          <span className="text-[11px] text-slate-400 line-through">
                            Bs {item.originalPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => addToCartQuick(item, item.restaurant)}
                      className="w-9 h-9 rounded-full bg-[#0D7B46] hover:bg-[#074423] text-white flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95"
                      title="Agregar al carrito"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                ))}
              </div>
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

            {/* Toggle de Filtro: Entregados vs Cancelados estilo PDF Pág 9 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOrdersFilter("ENTREGADOS")}
                className={`px-5 py-2 rounded-full text-xs font-black transition-all ${
                  ordersFilter === "ENTREGADOS"
                    ? "bg-[#1F0E1C] text-white shadow-sm"
                    : "bg-[#F4EEF2] text-slate-600 hover:bg-slate-200"
                }`}
              >
                Entregados
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

            {/* Listado de Pedidos por Mes */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-slate-500 uppercase tracking-wider">
                Noviembre 2026
              </h3>

              {ordersFilter === "ENTREGADOS" ? (
                ORDER_HISTORY_MOCK.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-[#0D7B46]">
                          Entregado {order.date}
                        </span>
                        <h4 className="font-black text-sm sm:text-base text-slate-900 leading-tight">
                          {order.store}
                        </h4>
                      </div>
                      <span className="font-black text-sm sm:text-base text-slate-900">
                        Bs {order.total}
                      </span>
                    </div>

                    {/* Fila de miniaturas de fotos reales estilo PDF Pág 9 */}
                    <div className="flex items-center gap-2.5">
                      {order.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="w-16 h-16 rounded-2xl bg-[#F4EEF2] overflow-hidden p-1 border border-slate-100"
                        >
                          <img
                            src={it.img}
                            alt={it.name}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Botón Píldora Ancha "Repetir" estilo PDF Pág 9 */}
                    <button
                      onClick={() => handleRepeatOrder(order)}
                      className="w-full bg-[#F4EEF2] hover:bg-[#e9dfe6] text-[#1F0E1C] font-black text-xs sm:text-sm py-3 rounded-full flex items-center justify-center gap-2 transition-colors active:scale-98"
                    >
                      <RotateCcw className="w-4 h-4 text-[#0D7B46]" />
                      <span>Repetir</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                  No tienes pedidos cancelados.
                </div>
              )}
            </div>
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
                JC
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-base sm:text-lg text-[#1F0E1C] leading-tight">
                  Jhosep Carrasco
                </h3>
                <p className="text-xs text-slate-500 font-medium truncate">
                  jhosep@tropigo.bo • +591 77769199
                </p>
                <span className="inline-block mt-1 bg-emerald-100 text-[#074423] font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                  Cliente TropiGO 🌴
                </span>
              </div>
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
