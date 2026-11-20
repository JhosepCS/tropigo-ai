import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Bike,
  Boxes,
  Car,
  CarTaxiFront,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Gift,
  LogIn,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
  Pill,
  QrCode,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  Star,
  Store,
  Truck,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { LandingHeader } from "@/components/landing/landing-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TropiGO | Delivery, mandados y mototaxi en Ivirgarzama",
  description:
    "Pide comida, farmacia y mandados en Ivirgarzama. Mototaxi, torito y próximamente autos, camionetas y furgones. Tarifa justa en bolivianos y seguimiento en vivo.",
};

const CATEGORY_TILES = [
  { label: "Pollo broaster", emoji: "🍗", query: "Pollo", tone: "from-amber-100 to-orange-50" },
  { label: "Majadito", emoji: "🍲", query: "Majadito", tone: "from-rose-100 to-orange-50" },
  { label: "Hamburguesas", emoji: "🍔", query: "Hamburguesa", tone: "from-amber-100 to-yellow-50" },
  { label: "Salteñas", emoji: "🥟", query: "Salteña", tone: "from-orange-100 to-amber-50" },
  { label: "Farmacia", emoji: "💊", query: "Farmacia", tone: "from-sky-100 to-cyan-50" },
  { label: "Mercado", emoji: "🛒", query: "Mercado", tone: "from-emerald-100 to-lime-50" },
  { label: "Bebidas", emoji: "🥤", query: "Bebida", tone: "from-violet-100 to-purple-50" },
  { label: "Postres", emoji: "🍰", query: "Postre", tone: "from-pink-100 to-rose-50" },
];

const SERVICES = [
  {
    title: "Delivery de comida",
    description: "Pollerías, restaurantes y cafés de Ivirgarzama en un solo lugar.",
    icon: UtensilsCrossed,
    href: "/pedir",
    tag: "Disponible",
    available: true,
  },
  {
    title: "Mandados y compras",
    description: "Compramos en el mercado, pagamos servicios o recogemos tu paquete.",
    icon: ShoppingBasket,
    href: "/pedir?cat=Mandados",
    tag: "Disponible",
    available: true,
  },
  {
    title: "Farmacia y salud",
    description: "Medicamentos y cuidado personal con entrega a domicilio.",
    icon: Pill,
    href: "/pedir?cat=Farmacia",
    tag: "Disponible",
    available: true,
  },
  {
    title: "Mototaxi y transporte",
    description: "Viaja o manda algo con moto, torito y nuevos vehículos en camino.",
    icon: Navigation,
    href: "/pedir?tab=mototaxi",
    tag: "Disponible",
    available: true,
  },
  {
    title: "Envíos de paquetes",
    description: "Mensajería express entre barrios y localidades del Trópico.",
    icon: Package,
    href: "/#transporte",
    tag: "Próximamente",
    available: false,
  },
];

export default async function HomePage() {
  const [merchants, zones, business, deliveredOrders, customersCount, session] =
    await Promise.all([
      prisma.merchant.findMany({
        where: { isOpen: true },
        include: {
          products: {
            where: { isAvailable: true },
            orderBy: { createdAt: "asc" },
            take: 3,
          },
          _count: { select: { products: true } },
        },
        orderBy: [{ rating: "desc" }, { name: "asc" }],
        take: 6,
      }),
      prisma.deliveryZone.findMany({
        where: { isActive: true },
        orderBy: { baseDeliveryCost: "asc" },
      }),
      prisma.businessProfile.findFirst(),
      prisma.order.count({ where: { status: "ENTREGADO" } }).catch(() => 0),
      prisma.customer.count().catch(() => 0),
      getSession(),
    ]);

  const phone = business?.phone || "+59157770679";
  const whatsapp = `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;
  const currency = business?.currencySymbol || "Bs.";
  const deliveryFee = business?.baseDeliveryFee ?? 5;
  const minZoneFee = zones[0]?.baseDeliveryCost ?? deliveryFee;
  const minEta = zones[0]?.estimatedMinutes ?? 20;
  const rideMinFare = business?.rideMinFare ?? 10;
  const toritoSurcharge = business?.rideToritoSurcharge ?? 1;
  const loyaltyEnabled = business?.loyaltyEnabled ?? true;
  const stampsRequired = business?.loyaltyStampsRequired ?? 10;
  const centerName = business?.deliveryCenterName || "Plaza Principal de Ivirgarzama";
  const includedKm = business?.deliveryIncludedKm ?? 2;
  const perKmFee = business?.deliveryPerKmFee ?? 2;
  const isLoggedIn = Boolean(session);

  const vehicleTypes = [
    {
      id: "MOTO",
      name: "Moto / Mototaxi",
      capacity: "1 pasajero",
      description: "Viajes rápidos por el centro, barrios y sindicatos.",
      price: `Desde ${currency} ${rideMinFare.toFixed(0)}`,
      icon: Bike,
      status: "Disponible",
      href: "/pedir?tab=mototaxi&vehiculo=MOTO",
    },
    {
      id: "TORITO",
      name: "Torito / Trimóvil",
      capacity: "Hasta 3 pasajeros o carga",
      description: "Ideal para compras del mercado, bolsas o días de lluvia.",
      price: `Desde ${currency} ${(rideMinFare + toritoSurcharge).toFixed(0)}`,
      icon: CarTaxiFront,
      status: "Disponible",
      href: "/pedir?tab=mototaxi&vehiculo=TORITO",
    },
    {
      id: "AUTO",
      name: "Auto / Taxi",
      capacity: "Hasta 4 pasajeros",
      description: "Viajes con equipaje, compras grandes o varias personas.",
      price: "Tarifa por definir",
      icon: Car,
      status: "Próximamente",
      href: "",
    },
    {
      id: "CAMIONETA",
      name: "Camioneta 4x4",
      capacity: "Hasta 5 pasajeros",
      description: "Caminos rurales y zonas alejadas del Trópico de Cochabamba.",
      price: "Tarifa por definir",
      icon: Truck,
      status: "Próximamente",
      href: "",
    },
    {
      id: "FURGON",
      name: "Furgón de carga",
      capacity: "Mudanzas y paquetes",
      description: "Mudanzas pequeñas, insumos y delivery mayorista.",
      price: "Cotización",
      icon: Boxes,
      status: "Próximamente",
      href: "",
    },
    {
      id: "BICI",
      name: "Bicicleta / Eco",
      capacity: "Entregas cortas",
      description: "Entregas ecológicas dentro del casco central de Ivirgarzama.",
      price: "Tarifa por definir",
      icon: Bike,
      status: "Próximamente",
      href: "",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F4F9] text-[#1E1523]">
      <LandingHeader
        phone={phone}
        isLoggedIn={isLoggedIn}
        deliveryFee={deliveryFee}
      />

      <main>
        {/* HERO */}
        <section className="crm-hero-glow relative overflow-hidden bg-[#331E39] pb-16 pt-10 text-white sm:pb-20 sm:pt-14">
          <div className="crm-dot-grid pointer-events-none absolute inset-0 opacity-[0.18]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#C9A7D8]/30 bg-[#C9A7D8]/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#E6D2F0]">
                  Delivery · Mandados · Mototaxi
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-200">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Operando en Ivirgarzama
                </span>
              </div>

              <h1 className="max-w-xl text-3xl font-black leading-[1.08] tracking-tight sm:text-4xl lg:text-[2.75rem]">
                Todo Ivirgarzama,
                <br />
                <span className="text-[#D8B8E8]">a un mensaje de distancia.</span>
              </h1>

              <p className="max-w-lg text-sm leading-relaxed text-white/70">
                Comida, farmacia, mandados y mototaxi con tarifa justa en
                bolivianos. Pide por WhatsApp o desde la web y sigue tu entrega en
                vivo, sin llamadas ni vueltas.
              </p>

              {/* Buscador */}
              <form
                action="/pedir"
                method="get"
                className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-white p-2 shadow-2xl shadow-black/20 lg:flex-row lg:items-center"
              >
                <div className="flex flex-1 items-center gap-2 px-2">
                  <MapPin className="h-4 w-4 shrink-0 text-[#8E58A6]" />
                  <input
                    type="text"
                    name="dir"
                    placeholder="Tu dirección o barrio"
                    aria-label="Dirección de entrega"
                    className="w-full bg-transparent py-2.5 text-xs font-medium text-[#1E1523] placeholder:text-[#9C8AA4] focus:outline-none sm:text-sm"
                  />
                </div>
                <div className="hidden h-8 w-px shrink-0 bg-[#E8DFED] lg:block" />
                <div className="flex flex-1 items-center gap-2 px-2">
                  <Search className="h-4 w-4 shrink-0 text-[#8E58A6]" />
                  <input
                    type="search"
                    name="q"
                    placeholder="Busca pollo, farmacia…"
                    aria-label="Buscar comercios, platos o servicios"
                    className="w-full bg-transparent py-2.5 text-xs font-medium text-[#1E1523] placeholder:text-[#9C8AA4] focus:outline-none sm:text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#331E39] px-5 py-3 text-xs font-black text-white transition-colors hover:bg-[#482957]"
                >
                  Buscar
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Popular:
                </span>
                {["Pollo broaster", "Majadito", "Farmacia", "Mototaxi"].map(
                  (item) => (
                    <Link
                      key={item}
                      href={
                        item === "Mototaxi"
                          ? "/pedir?tab=mototaxi"
                          : `/pedir?q=${encodeURIComponent(item.split(" ")[0])}`
                      }
                      className="rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold text-white/75 transition-colors hover:border-[#C9A7D8]/50 hover:bg-white/15 hover:text-white"
                    >
                      {item}
                    </Link>
                  )
                )}
              </div>

              <div className="grid max-w-lg grid-cols-3 gap-3 border-t border-white/10 pt-4">
                {[
                  { icon: Wallet, label: "Efectivo o QR" },
                  { icon: Navigation, label: "Seguimiento en vivo" },
                  { icon: MessageCircle, label: "Atención por WhatsApp" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-[#C9A7D8]" />
                      <span className="text-[10px] font-semibold leading-tight text-white/60">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mockup de conversación */}
            <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:justify-self-end">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-[#C9A7D8]/10 blur-2xl" />
              <div className="relative rounded-[1.9rem] border border-white/15 bg-white/[0.07] p-2.5 shadow-2xl shadow-black/30 backdrop-blur">
                <div className="rounded-[1.4rem] bg-[#F7F4F9] p-3 text-[#1E1523]">
                  <div className="flex items-center gap-2 border-b border-[#E8DFED] pb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#8E58A6] to-[#5C3470] text-[11px] font-black text-white">
                      TG
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black leading-tight">TropiBot</p>
                      <p className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        En línea · responde al instante
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 space-y-2">
                    <div className="ml-8 rounded-2xl rounded-tr-sm bg-[#E6D2F0] px-2.5 py-2 text-[10px] leading-relaxed">
                      Hola, quiero 1 pollo broaster a la calle Bolívar 🙏
                    </div>
                    <div className="mr-6 rounded-2xl rounded-tl-sm bg-white px-2.5 py-2 text-[10px] leading-relaxed shadow-sm">
                      ¡Listo! 🍗 1 pollo broaster + papas ={" "}
                      <strong>25 {currency}</strong>. Envío a Barrio Magisterio{" "}
                      <strong>5 {currency}</strong>. Total{" "}
                      <strong>30 {currency}</strong>. ¿Confirmas?
                    </div>
                    <div className="ml-8 rounded-2xl rounded-tr-sm bg-[#E6D2F0] px-2.5 py-2 text-[10px] leading-relaxed">
                      Sí, pago con QR 📲
                    </div>
                    <div className="mr-6 rounded-2xl rounded-tl-sm bg-white px-2.5 py-2 text-[10px] leading-relaxed shadow-sm">
                      Pedido <strong>TRP-1042</strong> confirmado ✅ El restaurante
                      ya está preparando tu comida.
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5 rounded-xl border border-[#E8DFED] bg-white px-2.5 py-2">
                    <span className="text-[9px] text-[#9C8AA4]">
                      Escribe tu pedido…
                    </span>
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#331E39] text-white">
                      <ArrowRight className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-[10px] text-white/70">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Pedido TRP-1042 en camino
                  </span>
                  <span className="font-black text-white">12 min</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ESTADÍSTICAS */}
        <div className="relative z-10 mx-auto -mt-8 max-w-7xl px-4">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#E8DFED] bg-[#E8DFED] shadow-xl shadow-[#331E39]/10 md:grid-cols-4">
            {[
              { value: merchants.length, label: "Comercios activos" },
              { value: zones.length, label: "Zonas de cobertura" },
              { value: customersCount, label: "Clientes registrados" },
              deliveredOrders > 0
                ? { value: deliveredOrders, label: "Pedidos entregados" }
                : { value: "8–23", label: "Horario de atención" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white px-4 py-3.5 text-center">
                <p className="text-xl font-black tracking-tight text-[#331E39]">
                  {typeof stat.value === "number"
                    ? stat.value.toLocaleString("es-BO")
                    : stat.value}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E58A6]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* SERVICIOS */}
        <section id="servicios" className="mx-auto max-w-7xl px-4 py-12 sm:py-14">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6]">
                ¿Qué necesitas hoy?
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-[#1E1523] sm:text-2xl">
                Un solo lugar para todo lo que se mueve
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#6B5A72]">
                Delivery, mandados, farmacia y transporte. Cada servicio se atiende
                por WhatsApp con TropiBot o desde el portal web.
              </p>
            </div>
            <Link
              href="/pedir"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#5C3470] transition-colors hover:text-[#331E39]"
            >
              Ver el portal completo
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <Link
                  key={service.title}
                  href={service.href}
                  className="group relative flex flex-col rounded-2xl border border-[#E8DFED] bg-white p-4 shadow-[0_1px_2px_rgba(51,30,57,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#C9A7D8] hover:shadow-lg hover:shadow-[#331E39]/5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EAF7] text-[#5C3470]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        service.available
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-[#F3EAF7] text-[#8E58A6]"
                      }`}
                    >
                      {service.tag}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-[#1E1523]">
                    {service.title}
                  </h3>
                  <p className="mt-1 flex-1 text-[11px] leading-relaxed text-[#6B5A72]">
                    {service.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#8E58A6] group-hover:text-[#331E39]">
                    {service.available ? "Pedir ahora" : "Ver avance"}
                    <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* CATEGORÍAS */}
        <section className="border-y border-[#E8DFED] bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6]">
                  Antojos y necesidades
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-[#1E1523] sm:text-2xl">
                  ¿Qué se te antoja?
                </h2>
              </div>
              <p className="text-[11px] font-medium text-[#8E58A6]">
                Toca una categoría y la IA busca por ti
              </p>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2.5 sm:gap-3 lg:grid-cols-8">
              {CATEGORY_TILES.map((category) => (
                <Link
                  key={category.label}
                  href={`/pedir?q=${encodeURIComponent(category.query)}`}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-[#EFE6F4] bg-[#FBF8FC] p-3 text-center transition-all hover:-translate-y-0.5 hover:border-[#C9A7D8] hover:bg-white hover:shadow-md"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl ${category.tone} shadow-inner`}
                  >
                    {category.emoji}
                  </span>
                  <span className="text-[10px] font-bold leading-tight text-[#4A3A50] group-hover:text-[#331E39] sm:text-[11px]">
                    {category.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* COMERCIOS DESTACADOS */}
        <section id="comercios" className="mx-auto max-w-7xl px-4 py-12 sm:py-14">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6]">
                Los más pedidos
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-[#1E1523] sm:text-2xl">
                Comercios abiertos en Ivirgarzama
              </h2>
              <p className="mt-1 text-xs text-[#6B5A72]">
                Envío desde {currency} {minZoneFee.toFixed(0)} · entrega estimada{" "}
                {minEta}–{minEta + 15} min
              </p>
            </div>
            <Link
              href="/pedir"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#5C3470] transition-colors hover:text-[#331E39]"
            >
              Ver todos los comercios
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {merchants.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#D8B8E8] bg-white p-10 text-center">
              <Store className="mx-auto h-8 w-8 text-[#B58ACB]" />
              <p className="mt-2 text-sm font-bold text-[#331E39]">
                Estamos sumando comercios
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-[#6B5A72]">
                Escríbenos por WhatsApp y con gusto tomamos tu pedido de comida,
                farmacia o mandado mientras abrimos más tiendas.
              </p>
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#331E39] px-4 py-2.5 text-xs font-bold text-white"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Pedir por WhatsApp
              </a>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {merchants.map((merchant) => (
                <Link
                  key={merchant.id}
                  href={`/pedir?cat=${encodeURIComponent(merchant.category)}`}
                  className="group overflow-hidden rounded-2xl border border-[#E8DFED] bg-white shadow-[0_1px_2px_rgba(51,30,57,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#C9A7D8] hover:shadow-lg hover:shadow-[#331E39]/5"
                >
                  <div className="relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-[#331E39] via-[#482957] to-[#74438C]">
                    <div className="crm-dot-grid absolute inset-0 opacity-20" />
                    <MerchantVisual category={merchant.category} />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-black text-[#331E39] shadow-sm">
                      <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                      {merchant.rating.toFixed(1)}
                    </span>
                    <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                      Abierto
                    </span>
                    <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/80 backdrop-blur">
                      {merchant.category}
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-black text-[#1E1523]">
                      {merchant.name}
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-[#6B5A72]">
                      {merchant.description || "Disponible para delivery en Ivirgarzama"}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-[#8E58A6]">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {minEta}–{minEta + 15} min
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Bike className="h-3 w-3" />
                        Envío {currency} {minZoneFee.toFixed(0)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3" />
                        {merchant._count.products}{" "}
                        {merchant._count.products === 1 ? "producto" : "productos"}
                      </span>
                    </div>

                    {merchant.products.length > 0 && (
                      <div className="mt-2 rounded-lg bg-[#FBF8FC] px-2 py-1.5">
                        <p className="line-clamp-1 text-[10px] text-[#6B5A72]">
                          {merchant.products.map((product) => product.name).join(" · ")}
                        </p>
                      </div>
                    )}

                    <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-black text-[#331E39]">
                      Ver menú
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* TRANSPORTE Y VEHÍCULOS */}
        <section id="transporte" className="relative overflow-hidden bg-[#331E39] py-14 text-white">
          <div className="crm-dot-grid pointer-events-none absolute inset-0 opacity-10" />
          <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-[#8E58A6]/20 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#C9A7D8]">
                  Transporte y envíos
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                  Elige el vehículo según lo que necesitas mover
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                  Hoy operamos con moto y torito. Autos, camionetas, furgones y
                  bicicletas se irán habilitando con tarifas propias por tipo de
                  vehículo, capacidad y zona.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-white/55">
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1">
                  Tarifa mínima {currency} {rideMinFare.toFixed(0)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1">
                  Torito +{currency} {toritoSurcharge.toFixed(0)}
                </span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-200">
                  Conductores verificados
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {vehicleTypes.map((vehicle) => {
                const Icon = vehicle.icon;
                const available = vehicle.status === "Disponible";
                return (
                  <div
                    key={vehicle.id}
                    className={`group flex flex-col rounded-2xl border p-4 transition-colors ${
                      available
                        ? "border-white/15 bg-white/[0.07] hover:border-[#C9A7D8]/60 hover:bg-white/[0.1]"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          available
                            ? "bg-[#C9A7D8] text-[#331E39]"
                            : "bg-white/10 text-[#C9A7D8]"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          available
                            ? "bg-emerald-400/15 text-emerald-200"
                            : "bg-white/10 text-white/55"
                        }`}
                      >
                        {vehicle.status}
                      </span>
                    </div>

                    <h3 className="mt-3 text-sm font-black">{vehicle.name}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A7D8]">
                      {vehicle.capacity}
                    </p>
                    <p className="mt-1 flex-1 text-[11px] leading-relaxed text-white/55">
                      {vehicle.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                      <span className="text-[11px] font-black text-white">
                        {vehicle.price}
                      </span>
                      {available ? (
                        <Link
                          href={vehicle.href}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#C9A7D8] px-2.5 py-1.5 text-[10px] font-black text-[#331E39] transition-colors hover:bg-[#D8B8E8]"
                        >
                          Solicitar
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      ) : (
                        <a
                          href={`${whatsapp}?text=${encodeURIComponent(
                            `Hola TropiGO, quiero saber cuándo estará disponible ${vehicle.name} en Ivirgarzama.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-[10px] font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          Avísame
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A7D8]" />
                <p className="text-[11px] leading-relaxed text-white/65">
                  Cada tipo de vehículo tendrá su propia tarifa base, recargo por
                  distancia y capacidad de carga. Los conductores se validan antes
                  de recibir viajes.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-[11px] font-bold text-white transition-colors hover:bg-white/15"
              >
                Quiero conducir
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA + FIDELIDAD */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6]">
                Así de simple
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-[#1E1523] sm:text-2xl">
                De tu mensaje a la puerta de tu casa
              </h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    step: "01",
                    title: "Pide",
                    text: "Escríbenos por WhatsApp o usa el portal web. Aceptamos texto, audio, fotos y ubicación.",
                    icon: MessageCircle,
                  },
                  {
                    step: "02",
                    title: "TropiBot cotiza",
                    text: "Consulta catálogo, zonas y tarifas reales, confirma el pago y registra tu pedido.",
                    icon: Sparkles,
                  },
                  {
                    step: "03",
                    title: "Sigue y recibe",
                    text: "Mira el estado en vivo, coordina con el repartidor y recibe tu pedido en casa.",
                    icon: Navigation,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.step}
                      className="relative rounded-2xl border border-[#E8DFED] bg-white p-4"
                    >
                      <span className="text-[10px] font-black tracking-[0.18em] text-[#B58ACB]">
                        PASO {item.step}
                      </span>
                      <div className="mt-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#331E39] text-[#E6D2F0]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="mt-2 text-xs font-bold text-[#1E1523]">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-[10px] leading-relaxed text-[#6B5A72]">
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fidelidad */}
            <div className="relative overflow-hidden rounded-2xl border border-[#E0CCE9] bg-gradient-to-br from-[#F3EAF7] via-white to-[#FBF8FC] p-5">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#C9A7D8]/25 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#331E39] text-[#E6D2F0]">
                    <Gift className="h-4 w-4" />
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#5C3470] shadow-sm">
                    TropiGO Club
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-black leading-tight text-[#331E39]">
                  {loyaltyEnabled
                    ? `Tu pedido ${stampsRequired} es gratis.`
                    : "Tarjeta de fidelidad TropiGO"}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[#6B5A72]">
                  {loyaltyEnabled
                    ? `Cada pedido entregado suma un sello. Junta ${stampsRequired - 1} y el siguiente corre por nuestra cuenta. También suman las carreras de mototaxi.`
                    : "Cada pedido y carrera suma sellos para tu próximo beneficio."}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  {Array.from({ length: Math.min(stampsRequired - 1, 9) }).map(
                    (_, index) => (
                      <span
                        key={index}
                        className={`flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-black ${
                          index < 4
                            ? "border-[#8E58A6] bg-[#8E58A6] text-white"
                            : "border-[#D8B8E8] bg-white text-[#B58ACB]"
                        }`}
                      >
                        {index < 4 ? "✓" : index + 1}
                      </span>
                    )
                  )}
                  <QrCode className="ml-auto h-8 w-8 text-[#8E58A6]" />
                </div>

                <a
                  href={`${whatsapp}?text=${encodeURIComponent(
                    "Hola TropiGO, quiero mi tarjeta de fidelidad con QR."
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#331E39] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#482957]"
                >
                  <Gift className="h-3.5 w-3.5" />
                  Pedir mi tarjeta
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* COBERTURA */}
        <section id="cobertura" className="border-y border-[#E8DFED] bg-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6]">
                Cobertura y tarifas
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-[#1E1523] sm:text-2xl">
                Llegamos a tu barrio, con precio claro
              </h2>
              <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-[#6B5A72]">
                El delivery se calcula tomando como referencia {centerName}:
                incluye {includedKm} km y luego {currency} {perKmFee.toFixed(0)} por
                km adicional. La tarifa de la zona se suma al recargo por distancia.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {zones.slice(0, 10).map((zone) => (
                  <span
                    key={zone.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E8DFED] bg-[#FBF8FC] px-2.5 py-1 text-[10px] font-semibold text-[#4A3A50]"
                  >
                    <MapPin className="h-3 w-3 text-[#8E58A6]" />
                    {zone.name}
                    <span className="font-black text-[#5C3470]">
                      {currency} {zone.baseDeliveryCost.toFixed(0)}
                    </span>
                  </span>
                ))}
                {zones.length > 10 && (
                  <span className="inline-flex items-center rounded-full bg-[#F3EAF7] px-2.5 py-1 text-[10px] font-bold text-[#5C3470]">
                    +{zones.length - 10} zonas
                  </span>
                )}
                {zones.length === 0 && (
                  <span className="text-[11px] text-[#6B5A72]">
                    Consulta tu zona por WhatsApp.
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {[
                  {
                    icon: Clock,
                    title: `${minEta}–${minEta + 15} min`,
                    text: "Entrega estimada en el casco urbano",
                  },
                  {
                    icon: Wallet,
                    title: "Efectivo o QR",
                    text: "Paga al recibir o con QR Simple",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Repartidores validados",
                    text: "Seguimiento y soporte por WhatsApp",
                  },
                  {
                    icon: Compass,
                    title: "Cálculo desde la Plaza",
                    text: centerName,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex items-start gap-2.5 rounded-xl border border-[#EFE6F4] bg-[#FBF8FC] p-3"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#8E58A6]" />
                      <div>
                        <p className="text-[11px] font-bold text-[#1E1523]">
                          {item.title}
                        </p>
                        <p className="text-[10px] leading-relaxed text-[#6B5A72]">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E8DFED] bg-[#FBF8FC] shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E8DFED] bg-white px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#331E39]">
                  <MapPin className="h-3.5 w-3.5 text-[#8E58A6]" />
                  {centerName}
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                  Centro de cálculo
                </span>
              </div>
              <CoverageMap centerName={centerName} />
              <div className="flex items-center justify-between gap-2 border-t border-[#E8DFED] bg-white px-4 py-2.5 text-[10px] font-semibold text-[#6B5A72]">
                <span>{includedKm} km incluidos</span>
                <span>{currency} {perKmFee.toFixed(0)} / km adicional</span>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#5C3470] hover:text-[#331E39]"
                >
                  Consultar mi zona
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* SOCIOS */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:py-14">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-2xl border border-[#E0CCE9] bg-white p-5">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#F3EAF7]" />
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#331E39] text-[#E6D2F0]">
                  <Store className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-base font-black text-[#1E1523]">
                  Suma tu comercio
                </h3>
                <p className="mt-1 max-w-md text-[11px] leading-relaxed text-[#6B5A72]">
                  Publica tu menú, recibe pedidos por WhatsApp y controla tu cocina
                  desde el panel de comercios. Sin comisiones ocultas.
                </p>
                <Link
                  href="/login"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#331E39] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#482957]"
                >
                  Quiero vender
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-[#E0CCE9] bg-white p-5">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-50" />
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <Bike className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-base font-black text-[#1E1523]">
                  Sé repartidor o conductor
                </h3>
                <p className="mt-1 max-w-md text-[11px] leading-relaxed text-[#6B5A72]">
                  Recibe pedidos y carreras cerca de ti. Moto, torito y próximamente
                  autos, camionetas y furgones. Tú eliges cuándo conectarte.
                </p>
                <Link
                  href="/registro/repartidor"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                >
                  Registrarme como repartidor
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* PREGUNTAS FRECUENTES */}
        <section id="preguntas" className="border-y border-[#E8DFED] bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:py-14">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6]">
                  Ayuda
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-[#1E1523] sm:text-2xl">
                  Preguntas frecuentes
                </h2>
                <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[#6B5A72]">
                  Si no encuentras tu respuesta, escríbenos por WhatsApp. TropiBot
                  atiende pedidos, tarifas y consultas de fidelidad.
                </p>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#E0CCE9] bg-[#F8F4FA] px-4 py-2.5 text-xs font-bold text-[#5C3470] transition-colors hover:bg-[#F0E6F4]"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Escribir por WhatsApp
                </a>
              </div>

              <div className="space-y-2">
                {[
                  {
                    q: "¿Cómo hago un pedido?",
                    a: "Escríbenos al WhatsApp oficial o entra al portal y elige tu comercio. TropiBot te ayuda a armar el pedido, calcular el envío y confirmar el pago.",
                  },
                  {
                    q: "¿Cuánto cuesta el delivery?",
                    a: `Depende de tu zona. La tarifa base empieza en ${currency} ${minZoneFee.toFixed(0)} y se calcula desde ${centerName}, con ${includedKm} km incluidos y ${currency} ${perKmFee.toFixed(0)} por km adicional.`,
                  },
                  {
                    q: "¿Qué formas de pago aceptan?",
                    a: "Efectivo contra entrega, QR Simple, Tigo Money, transferencia y otras billeteras habilitadas. También puedes reportar tu comprobante desde la página de pago del pedido.",
                  },
                  {
                    q: "¿Cómo funciona la tarjeta de fidelidad?",
                    a: `Cada pedido entregado suma un sello y las carreras también suman. Con ${stampsRequired} sellos, el pedido ${stampsRequired} es gratis. Tu tarjeta tiene un QR personal para consultarla.`,
                  },
                  {
                    q: "¿Qué vehículos puedo pedir?",
                    a: "Hoy moto y torito. Estamos habilitando autos, camionetas 4x4, furgones de carga y bicicletas de reparto, cada uno con su tarifa y capacidad.",
                  },
                  {
                    q: "¿Atienden fuera de Ivirgarzama?",
                    a: "La operación principal está en Ivirgarzama. La expansión prevista incluye Shinahota, Chimoré, Puerto Villarroel y Villa Tunari.",
                  },
                ].map((faq) => (
                  <details
                    key={faq.q}
                    className="group rounded-xl border border-[#EFE6F4] bg-[#FBF8FC] px-4 py-3 open:border-[#C9A7D8]"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-bold text-[#1E1523]">
                      {faq.q}
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#8E58A6] transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="mt-2 border-t border-[#F0E6F4] pt-2 text-[10px] leading-relaxed text-[#6B5A72]">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:py-14">
          <div className="crm-hero-glow relative overflow-hidden rounded-[28px] border border-white/10 bg-[#331E39] p-6 text-white sm:p-8">
            <div className="crm-dot-grid pointer-events-none absolute inset-0 opacity-20" />
            <div className="relative flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[#C9A7D8]/30 bg-[#C9A7D8]/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#E6D2F0]">
                    TropiGO AI
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-200">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    TropiBot en línea
                  </span>
                </div>
                <h2 className="mt-2 max-w-xl text-xl font-black leading-tight tracking-tight sm:text-2xl">
                  Pide ahora y deja que TropiBot haga el resto.
                </h2>
                <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-white/65">
                  Comida, mandados, farmacia o un viaje en mototaxi. Un mensaje y
                  listo.
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-black text-white transition-colors hover:bg-emerald-600"
                >
                  <MessageCircle className="h-4 w-4" />
                  Pedir por WhatsApp
                </a>
                <Link
                  href="/pedir"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#C9A7D8] px-4 py-3 text-xs font-black text-[#331E39] transition-colors hover:bg-[#D8B8E8]"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Pedir en la web
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#E8DFED] bg-white pb-20 sm:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#8E58A6] to-[#5C3470] text-sm font-black text-white">
                  TG
                </div>
                <div>
                  <p className="text-sm font-black text-[#1E1523]">TropiGO AI</p>
                  <p className="text-[10px] font-semibold text-[#8E58A6]">
                    Movemos el Trópico 🌴
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[#6B5A72]">
                Delivery, mandados y mototaxi en Ivirgarzama. Atención por WhatsApp
                con inteligencia artificial y operadores reales.
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-[#5C3470]">
                <MapPin className="h-3 w-3 text-[#8E58A6]" />
                {business?.cityZone || "Ivirgarzama, Trópico de Cochabamba"}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-[#5C3470]">
                <Phone className="h-3 w-3 text-[#8E58A6]" />
                {phone}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6]">
                Servicios
              </p>
              <ul className="mt-3 space-y-2 text-[11px] font-medium text-[#4A3A50]">
                <li>
                  <Link href="/pedir" className="hover:text-[#331E39]">
                    Delivery de comida
                  </Link>
                </li>
                <li>
                  <Link href="/pedir?cat=Mandados" className="hover:text-[#331E39]">
                    Mandados y compras
                  </Link>
                </li>
                <li>
                  <Link href="/pedir?cat=Farmacia" className="hover:text-[#331E39]">
                    Farmacia a domicilio
                  </Link>
                </li>
                <li>
                  <Link href="/pedir?tab=mototaxi" className="hover:text-[#331E39]">
                    Mototaxi y torito
                  </Link>
                </li>
                <li>
                  <Link href="/#transporte" className="hover:text-[#331E39]">
                    Envíos y otros vehículos
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6]">
                TropiGO
              </p>
              <ul className="mt-3 space-y-2 text-[11px] font-medium text-[#4A3A50]">
                <li>
                  <Link href="/pedir" className="hover:text-[#331E39]">
                    Portal de pedidos
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-[#331E39]">
                    Panel de operaciones
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-[#331E39]">
                    Fidelidad y sellos
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-[#331E39]">
                    Guía del CRM
                  </Link>
                </li>
                <li>
                  <Link href="/registro/repartidor" className="hover:text-[#331E39]">
                    Trabaja con nosotros
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8E58A6]">
                Pagos y soporte
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["Efectivo", "QR Simple", "Tigo Money", "Transferencia"].map(
                  (method) => (
                    <span
                      key={method}
                      className="rounded-lg border border-[#EFE6F4] bg-[#FBF8FC] px-2 py-1 text-[9px] font-bold text-[#5C3470]"
                    >
                      {method}
                    </span>
                  )
                )}
              </div>
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white transition-colors hover:bg-emerald-700"
              >
                <MessageCircle className="h-3 w-3" />
                Atención por WhatsApp
              </a>
              <p className="mt-3 text-[10px] leading-relaxed text-[#8E58A6]">
                Lunes a domingo · 08:00 a 23:00
                <br />
                Ivirgarzama, Cochabamba, Bolivia
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-[#EFE6F4] pt-5 text-[10px] text-[#8E58A6] sm:flex-row">
            <p>
              © {new Date().getFullYear()} TropiGO AI · Hecho en Ivirgarzama con 🍃
            </p>
            <div className="flex items-center gap-3 font-semibold">
              <span>Bolivianos (Bs.)</span>
              <span className="h-1 w-1 rounded-full bg-[#D8B8E8]" />
              <Link href="/login" className="hover:text-[#331E39]">
                Ingresar
              </Link>
              <span className="h-1 w-1 rounded-full bg-[#D8B8E8]" />
              <span>Términos y privacidad</span>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp flotante */}
      <a
        href={whatsapp}
        target="_blank"
        rel="noreferrer"
        aria-label="Escribir a TropiGO por WhatsApp"
        className="fixed bottom-5 right-5 z-40 hidden h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-900/20 transition-transform hover:scale-105 sm:flex"
      >
        <MessageCircle className="h-5 w-5" />
      </a>

      {/* Barra inferior móvil */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-[#E8DFED] bg-white/95 px-2 py-1.5 backdrop-blur sm:hidden">
        <Link
          href="/"
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[#331E39]"
        >
          <Store className="h-4 w-4" />
          <span className="text-[9px] font-bold">Inicio</span>
        </Link>
        <Link
          href="/pedir"
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[#8E58A6]"
        >
          <ShoppingBag className="h-4 w-4" />
          <span className="text-[9px] font-bold">Pedir</span>
        </Link>
        <Link
          href="/pedir?tab=mototaxi"
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[#8E58A6]"
        >
          <Navigation className="h-4 w-4" />
          <span className="text-[9px] font-bold">Mototaxi</span>
        </Link>
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-emerald-600"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-[9px] font-bold">WhatsApp</span>
        </a>
        <Link
          href={isLoggedIn ? "/dashboard" : "/login"}
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[#8E58A6]"
        >
          {isLoggedIn ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          <span className="text-[9px] font-bold">
            {isLoggedIn ? "Panel" : "Ingresar"}
          </span>
        </Link>
      </nav>
    </div>
  );
}

function MerchantVisual({ category }: { category: string }) {
  const normalized = category.toLowerCase();
  const Icon = normalized.includes("farmacia")
    ? Pill
    : normalized.includes("mandado") || normalized.includes("mercado")
      ? ShoppingBasket
      : normalized.includes("restaurante") || normalized.includes("pollo")
        ? UtensilsCrossed
        : Store;

  return (
    <div className="relative flex flex-col items-center gap-1.5 text-white/85">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}

function CoverageMap({ centerName }: { centerName: string }) {
  const points = [
    { label: "Centro", top: "18%", left: "22%" },
    { label: "Mercado Central", top: "36%", left: "68%" },
    { label: "Terminal", top: "66%", left: "18%" },
    { label: "Barrio Magisterio", top: "74%", left: "60%" },
    { label: "Sindicatos", top: "48%", left: "40%" },
  ];

  return (
    <div className="relative h-[300px] overflow-hidden bg-[#F3EAF7] sm:h-[340px]">
      {/* Cuadrícula tipo mapa */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(#E0CCE9 1px, transparent 1px), linear-gradient(90deg, #E0CCE9 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />

      {/* Avenidas principales */}
      <div className="absolute left-[-10%] top-[46%] h-6 w-[120%] -rotate-6 rounded-full border-y border-white/80 bg-white/60" />
      <div className="absolute left-[38%] top-[-10%] h-[130%] w-5 rotate-12 rounded-full border-x border-white/80 bg-white/60" />
      <div className="absolute left-[-5%] top-[76%] h-3 w-[115%] rotate-3 rounded-full bg-white/45" />

      {/* Puntos de referencia */}
      {points.map((point) => (
        <div
          key={point.label}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1"
          style={{ top: point.top, left: point.left }}
        >
          <span className="flex h-2 w-2 rounded-full bg-[#8E58A6] ring-2 ring-white/70" />
          <span className="rounded-md bg-white/85 px-1.5 py-0.5 text-[8px] font-bold text-[#5C3470] shadow-sm">
            {point.label}
          </span>
        </div>
      ))}

      {/* Centro de cálculo */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <span className="absolute h-16 w-16 animate-ping rounded-full bg-[#8E58A6]/15" />
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-[#331E39] text-[#E6D2F0] shadow-lg">
          <MapPin className="h-5 w-5" />
        </span>
        <span className="relative mt-1 max-w-[180px] rounded-lg bg-[#331E39] px-2 py-1 text-center text-[8px] font-bold leading-tight text-white shadow-md">
          {centerName}
        </span>
      </div>

      <div className="absolute bottom-2 right-2 rounded-md bg-white/80 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-[#8E58A6]">
        Cobertura referencial
      </div>
    </div>
  );
}
