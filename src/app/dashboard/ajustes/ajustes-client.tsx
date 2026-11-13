"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings,
  Cpu,
  Search,
  RefreshCw,
  Sparkles,
  Calculator,
  Key,
  ShieldCheck,
  Building,
  Users,
  Check,
  Save,
  DollarSign,
  UserPlus,
  Smartphone,
  Bike,
  Gift,
  ExternalLink,
  AlertCircle,
  QrCode,
  Wallet,
  Upload,
  Trash2,
  CreditCard,
  MapPinned,
} from "lucide-react";
import { WhatsAppMetaConnect } from "@/components/whatsapp-meta-connect";
import { MaskedWhatsAppStatus } from "@/lib/whatsapp/meta-manager";
import {
  PaymentMethodConfig,
  parsePaymentMethods,
} from "@/lib/payments/types";

interface AjustesClientProps {
  initialBusiness: any;
  initialAgency: any;
  users: any[];
  initialWhatsAppStatus?: MaskedWhatsAppStatus;
}

export function AjustesClient({
  initialBusiness,
  initialAgency,
  users,
  initialWhatsAppStatus,
}: AjustesClientProps) {
  // Pestañas de Ajustes: "whatsapp" (por defecto), "general", "users"
  const [activeTab, setActiveTab] = useState<"whatsapp" | "general" | "users">("whatsapp");

  // 1. Datos Generales
  const [businessName, setBusinessName] = useState(initialBusiness?.name || "TropiGO Ivirgarzama");
  const [timezone, setTimezone] = useState(initialBusiness?.timezone || "America/La_Paz");

  // 1.1 Tarifas de carreras (mínimo absoluto: 10 Bs.)
  const [rideMinFare, setRideMinFare] = useState(
    Number(initialBusiness?.rideMinFare ?? 10)
  );
  const [baseRideFee, setBaseRideFee] = useState(
    Number(initialBusiness?.baseRideFee ?? 10)
  );
  const [rideToritoSurcharge, setRideToritoSurcharge] = useState(
    Number(initialBusiness?.rideToritoSurcharge ?? 1)
  );

  // 1.2 Programa de fidelidad
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(
    initialBusiness?.loyaltyEnabled ?? true
  );
  const [loyaltyStampsRequired, setLoyaltyStampsRequired] = useState(
    Number(initialBusiness?.loyaltyStampsRequired ?? 10)
  );
  const [loyaltyRewardFreeDelivery, setLoyaltyRewardFreeDelivery] = useState(
    initialBusiness?.loyaltyRewardFreeDelivery ?? false
  );
  const [loyaltyRewardDescription, setLoyaltyRewardDescription] = useState(
    initialBusiness?.loyaltyRewardDescription || "10mo pedido gratis"
  );
  const [loyaltyCountRides, setLoyaltyCountRides] = useState(
    initialBusiness?.loyaltyCountRides ?? true
  );
  const [loyaltyDoubleStampsUntil, setLoyaltyDoubleStampsUntil] = useState(
    initialBusiness?.loyaltyDoubleStampsUntil
      ? new Date(initialBusiness.loyaltyDoubleStampsUntil)
          .toISOString()
          .slice(0, 10)
      : ""
  );

  // 1.3 Delivery por distancia real
  const [deliveryIncludedKm, setDeliveryIncludedKm] = useState(
    Number(initialBusiness?.deliveryIncludedKm ?? 3)
  );
  const [deliveryPerKmFee, setDeliveryPerKmFee] = useState(
    Number(initialBusiness?.deliveryPerKmFee ?? 2)
  );
  const [deliveryCenterName, setDeliveryCenterName] = useState(
    initialBusiness?.deliveryCenterName || "Plaza Principal de Ivirgarzama"
  );
  const [deliveryCenterLatitude, setDeliveryCenterLatitude] = useState(
    Number(initialBusiness?.deliveryCenterLatitude ?? -17.0315)
  );
  const [deliveryCenterLongitude, setDeliveryCenterLongitude] = useState(
    Number(initialBusiness?.deliveryCenterLongitude ?? -64.8615)
  );
  const [autoAssignRiders, setAutoAssignRiders] = useState(
    initialBusiness?.autoAssignRiders ?? true
  );

  // 1.4 Métodos de pago (Altoke, Yape, ZAS, QR Simple, Tigo Money, etc.)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(
    () => parsePaymentMethods(initialBusiness?.paymentMethodsJson)
  );
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 2. Marca de la Agencia
  const [agencyName, setAgencyName] = useState(initialAgency?.name || "TropiGO Tecnologías");
  const [agencyLogo, setAgencyLogo] = useState(initialAgency?.logoUrl || "");

  // 3. Modelo de IA (Groq / OpenRouter)
  const [models, setModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("openrouter/free");
  const [modelSearch, setModelSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<"ALL" | "free" | "anthropic" | "google" | "openai">("ALL");
  const [sortBy, setSortBy] = useState<"price" | "name">("price");

  // Calculadora de Costes (20.000 entrada, 2.000 salida)
  const [inputTokensPerChat, setInputTokensPerChat] = useState<number>(20000);
  const [outputTokensPerChat, setOutputTokensPerChat] = useState<number>(2000);

  // Estado de la clave de OpenRouter
  const [keyInfo, setKeyInfo] = useState<{ configured: boolean; balance: any; message?: string }>({
    configured: false,
    balance: null,
  });

  const [saved, setSaved] = useState(false);

  // Cargar modelos y saldo de OpenRouter
  const loadOpenRouterData = async (forceRefresh = false) => {
    setLoadingModels(true);
    try {
      const [modelsRes, keyRes] = await Promise.all([
        fetch(`/api/openrouter/models?refresh=${forceRefresh}`),
        fetch("/api/openrouter/key-status"),
      ]);

      const modelsData = await modelsRes.json();
      if (modelsData.models) {
        setModels(modelsData.models);
      }

      const keyData = await keyRes.json();
      setKeyInfo(keyData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    loadOpenRouterData(false);
  }, []);

  const selectedModel = models.find((m) => m.id === selectedModelId) || {
    id: "openrouter/free",
    name: "OpenRouter Free Router",
    provider: "meta",
    promptPricePer1M: 0,
    completionPricePer1M: 0,
    contextLength: 128000,
  };

  const totalInputTokensMonthly = 1000 * inputTokensPerChat;
  const totalOutputTokensMonthly = 1000 * outputTokensPerChat;
  const totalCostMonthly =
    (totalInputTokensMonthly / 1000000) * selectedModel.promptPricePer1M +
    (totalOutputTokensMonthly / 1000000) * selectedModel.completionPricePer1M;

  const handleSave = async () => {
    setSaveError(null);
    try {
      const res = await fetch("/api/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          timezone,
          agencyName,
          agencyLogo,
          defaultModel: selectedModelId,
          rideMinFare,
          baseRideFee,
          rideToritoSurcharge,
          loyaltyEnabled,
          loyaltyStampsRequired,
          loyaltyRewardFreeDelivery,
          loyaltyRewardDescription,
          loyaltyCountRides,
          loyaltyDoubleStampsUntil: loyaltyDoubleStampsUntil || null,
          deliveryIncludedKm,
          deliveryPerKmFee,
          deliveryCenterName,
          deliveryCenterLatitude,
          deliveryCenterLongitude,
          autoAssignRiders,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "No se pudieron guardar los ajustes.");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      console.error(e);
      setSaveError(e.message || "No se pudieron guardar los ajustes.");
    }
  };

  const isWpConnected = initialWhatsAppStatus?.status === "CONNECTED";

  const updatePaymentMethod = (
    id: string,
    patch: Partial<PaymentMethodConfig>
  ) => {
    setPaymentMethods((current) =>
      current.map((method) =>
        method.id === id ? { ...method, ...patch } : method
      )
    );
  };

  const handleQrUpload = (id: string, file: File | null) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      setPaymentError("El QR debe ser una imagen PNG, JPG, WEBP o GIF.");
      return;
    }
    if (file.size > 450_000) {
      setPaymentError("El QR es muy pesado. Usa una imagen menor a 450 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updatePaymentMethod(id, { qrImage: String(reader.result || "") });
      setPaymentError(null);
    };
    reader.onerror = () => setPaymentError("No se pudo leer la imagen del QR.");
    reader.readAsDataURL(file);
  };

  const handleSavePayments = async () => {
    setPaymentError(null);
    setPaymentSaved(false);
    try {
      const res = await fetch("/api/settings/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methods: paymentMethods }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "No se pudieron guardar los métodos de pago.");
      }
      if (Array.isArray(data?.methods)) {
        setPaymentMethods(data.methods);
      }
      setPaymentSaved(true);
      setTimeout(() => setPaymentSaved(false), 2500);
    } catch (error: any) {
      setPaymentError(error?.message || "No se pudieron guardar los métodos de pago.");
    }
  };

  const enabledPaymentCount = paymentMethods.filter((method) => method.enabled).length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Navegación por pestañas de Ajustes */}
      <div className="flex border-b border-[#EAECF0] gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("whatsapp")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "whatsapp"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-[#667085] hover:text-[#101828]"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Conectar WhatsApp (Meta Cloud API)</span>
          {isWpConnected && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "general"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-[#667085] hover:text-[#101828]"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Datos Generales & Empresa</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "users"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-[#667085] hover:text-[#101828]"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuarios del Sistema ({users.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN: CONECTAR WHATSAPP (OFICIAL META CLOUD API)                       */}
      {/* ========================================================================= */}
      {activeTab === "whatsapp" && (
        <WhatsAppMetaConnect initialStatus={initialWhatsAppStatus} />
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN: DATOS GENERALES, MARCA Y CALCULADORA                            */}
      {/* ========================================================================= */}
      {activeTab === "general" && (
        <div className="space-y-6">
          {/* 1. Datos Generales y Zona Horaria */}
          <div className="bg-white rounded-3xl border border-[#EAECF0] p-6 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-[#EAECF0]">
              <Settings className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-sm text-[#101828]">Datos de TropiGO en Ivirgarzama</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-medium text-[#344054]">Nombre del negocio / Servicio</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[#344054]">Zona Horaria Oficial</label>
                <input
                  type="text"
                  readOnly
                  value="America/La_Paz (UTC-4, Bolivia)"
                  className="w-full bg-[#F2F4F7] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#475467] cursor-not-allowed font-mono"
                />
                <p className="text-[10px] text-[#667085]">
                  Zona horaria de Bolivia para el registro de pedidos, entregas y turnos.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Marca de la Agencia (White-label) */}
          <div className="bg-white rounded-3xl border border-[#EAECF0] p-6 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-[#EAECF0]">
              <Building className="w-4 h-4 text-emerald-600" />
              <div>
                <h3 className="font-semibold text-sm text-[#101828]">Marca y Logotipo</h3>
                <p className="text-[11px] text-[#667085]">
                  Identidad visual que se muestra en el CRM y mensajes del sistema.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-medium text-[#344054]">Nombre corporativo</label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[#344054]">URL del logotipo</label>
                <input
                  type="text"
                  value={agencyLogo}
                  onChange={(e) => setAgencyLogo(e.target.value)}
                  placeholder="/logo-tropigo.png"
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                />
              </div>
            </div>
          </div>

          {/* 3. Tarifas de carreras */}
          <div className="bg-white rounded-3xl border border-[#EAECF0] p-6 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#EAECF0]">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-emerald-600" />
                <div>
                  <h3 className="font-semibold text-sm text-[#101828]">
                    Tarifas de carreras de mototaxi
                  </h3>
                  <p className="text-[11px] text-[#667085]">
                    La carrera mínima es de 10 Bs. El asistente y el formulario público
                    calculan la tarifa con estos valores.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/zonas"
                className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Tarifas por zona
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="font-medium text-[#344054]">
                  Tarifa mínima de carrera (Bs.)
                </label>
                <input
                  type="number"
                  min={10}
                  step={0.5}
                  value={rideMinFare}
                  onChange={(e) => setRideMinFare(Number(e.target.value) || 0)}
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                />
                <p className="text-[10px] text-[#667085]">
                  No puede ser menor a 10 Bs. Se aplica a todas las zonas.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[#344054]">
                  Tarifa base si no hay zona (Bs.)
                </label>
                <input
                  type="number"
                  min={10}
                  step={0.5}
                  value={baseRideFee}
                  onChange={(e) => setBaseRideFee(Number(e.target.value) || 0)}
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                />
                <p className="text-[10px] text-[#667085]">
                  Se usa cuando el destino no coincide con una zona registrada.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[#344054]">
                  Recargo Torito / trimóvil (Bs.)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={rideToritoSurcharge}
                  onChange={(e) =>
                    setRideToritoSurcharge(Number(e.target.value) || 0)
                  }
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                />
                <p className="text-[10px] text-[#667085]">
                  Se suma al precio de la carrera en torito.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">
              Carrera en moto desde <b>{Math.max(10, rideMinFare).toFixed(2)} Bs.</b> ·
              Torito desde{" "}
              <b>
                {(Math.max(10, rideMinFare) + Math.max(0, rideToritoSurcharge)).toFixed(2)} Bs.
              </b>{" "}
              (más la tarifa de la zona si es mayor).
            </div>
          </div>

          {/* 4. Delivery por distancia real */}
          <div className="bg-white rounded-3xl border border-[#EAECF0] p-6 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-[#EAECF0]">
              <MapPinned className="w-4 h-4 text-emerald-600" />
              <div>
                <h3 className="font-semibold text-sm text-[#101828]">
                  Delivery por distancia real
                </h3>
                <p className="text-[11px] text-[#667085]">
                  El delivery se cobra por la zona del cliente más un recargo
                  por km desde la Plaza Principal de Ivirgarzama: a mayor
                  distancia, mayor cobro. Si el cliente comparte su ubicación
                  GPS, TropiGO calcula la distancia por ruta.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-medium text-[#344054]">
                  Nombre del centro de reparto
                </label>
                <input
                  type="text"
                  value={deliveryCenterName}
                  onChange={(e) => setDeliveryCenterName(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                  placeholder="Plaza Principal de Ivirgarzama"
                />
                <p className="text-[10px] text-[#667085]">
                  Referencia visible para los clientes al explicar el cobro.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[#344054]">
                  Coordenadas del centro (latitud, longitud)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={deliveryCenterLatitude}
                    onChange={(e) =>
                      setDeliveryCenterLatitude(Number(e.target.value) || 0)
                    }
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                    placeholder="-17.0315"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={deliveryCenterLongitude}
                    onChange={(e) =>
                      setDeliveryCenterLongitude(Number(e.target.value) || 0)
                    }
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                    placeholder="-64.8615"
                  />
                </div>
                <p className="text-[10px] text-[#667085]">
                  Por defecto: Plaza Principal de Ivirgarzama.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[#344054]">
                  Kilómetros incluidos en la tarifa de zona
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={deliveryIncludedKm}
                  onChange={(e) =>
                    setDeliveryIncludedKm(Number(e.target.value) || 0)
                  }
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                />
                <p className="text-[10px] text-[#667085]">
                  Ejemplo: 2 km incluidos. Solo se cobra el excedente.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[#344054]">
                  Recargo por km adicional (Bs.)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={deliveryPerKmFee}
                  onChange={(e) =>
                    setDeliveryPerKmFee(Number(e.target.value) || 0)
                  }
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                />
                <p className="text-[10px] text-[#667085]">
                  0 Bs. = sin recargo por distancia. La tarifa de la zona no cambia.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-[#EAECF0] bg-[#F9FAFB] px-3 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoAssignRiders}
                onChange={(e) => setAutoAssignRiders(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-600"
              />
              <span>
                <span className="block font-semibold text-[#344054]">
                  Asignar repartidor automáticamente al estar LISTO_RECOJO
                </span>
                <span className="block text-[10px] text-[#667085]">
                  Se elige el rider activo y disponible con menos entregas. Si
                  no hay ninguno, el pedido queda listo para asignación manual.
                </span>
              </span>
            </label>

            <div className="rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-[11px] text-sky-800">
              La distancia se muestra siempre como <b>estimada por ruta</b>. Si no
              hay GPS, se usa la zona y el tiempo configurado, sin inventar km.
            </div>
          </div>

          {/* 5. Fidelidad */}
          <div className="bg-white rounded-3xl border border-[#EAECF0] p-6 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#EAECF0]">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-emerald-600" />
                <div>
                  <h3 className="font-semibold text-sm text-[#101828]">
                    Tarjeta de fidelidad y premio del 10.º pedido
                  </h3>
                  <p className="text-[11px] text-[#667085]">
                    Un sello por pedido entregado y, si lo activas, también por
                    cada carrera de mototaxi finalizada. Al completar la tarjeta,
                    el siguiente pedido es gratis.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/fidelidad"
                className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Tarjetas y QR
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-[#EAECF0] bg-[#F9FAFB] px-3 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={loyaltyEnabled}
                onChange={(e) => setLoyaltyEnabled(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-600"
              />
              <span>
                <span className="block font-semibold text-[#344054]">
                  Programa de fidelidad activo
                </span>
                <span className="block text-[10px] text-[#667085]">
                  Si lo desactivas, no se entregan sellos ni se aplican premios en nuevos pedidos.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-medium text-[#344054]">
                  Pedidos para obtener el premio
                </label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  step={1}
                  value={loyaltyStampsRequired}
                  onChange={(e) =>
                    setLoyaltyStampsRequired(Number(e.target.value) || 10)
                  }
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                />
                <p className="text-[10px] text-[#667085]">
                  Con 10, el pedido número 10 es gratis. El cliente recibe 9 sellos
                  antes del premio.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[#344054]">
                  Texto del premio
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={loyaltyRewardDescription}
                  onChange={(e) => setLoyaltyRewardDescription(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                />
                <p className="text-[10px] text-[#667085]">
                  Se muestra en la tarjeta pública y en el resumen del pedido.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-[#EAECF0] px-3 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={loyaltyRewardFreeDelivery}
                onChange={(e) => setLoyaltyRewardFreeDelivery(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-600"
              />
              <span>
                <span className="block font-semibold text-[#344054]">
                  El premio también cubre el costo de envío
                </span>
                <span className="block text-[10px] text-[#667085]">
                  Si está desmarcado, el 10.º pedido es gratis en productos y el envío se
                  cobra aparte.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-[#EAECF0] px-3 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={loyaltyCountRides}
                onChange={(e) => setLoyaltyCountRides(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-600"
              />
              <span>
                <span className="block font-semibold text-[#344054]">
                  Las carreras de mototaxi también suman sellos
                </span>
                <span className="block text-[10px] text-[#667085]">
                  Si está marcado, cada carrera FINALIZADA suma 1 sello. Si lo
                  desmarcas, las carreras solo se muestran como dato adicional y
                  la tarjeta avanza únicamente con pedidos entregados.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-medium text-[#344054]">
                  Promoción de sellos dobles hasta
                </label>
                <input
                  type="date"
                  value={loyaltyDoubleStampsUntil}
                  onChange={(e) => setLoyaltyDoubleStampsUntil(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                />
                <p className="text-[10px] text-[#667085]">
                  Déjalo vacío para desactivar. Mientras esté vigente, cada pedido
                  entregado o carrera finalizada suma 2 sellos.
                </p>
              </div>
              <div className="rounded-xl bg-[#F9FAFB] border border-[#EAECF0] px-3 py-3">
                <p className="text-[10px] font-bold uppercase text-[#667085]">
                  Niveles de fidelidad
                </p>
                <p className="mt-1 text-[11px] text-[#344054]">
                  🥉 Bronce: 0-9 servicios · 🥈 Plata: 10-29 · 🥇 Oro: 30+
                </p>
                <p className="mt-1 text-[10px] text-[#667085]">
                  Los niveles son informativos y se muestran en la tarjeta y en el
                  contexto del asistente.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-800">
              Tarjeta configurada: <b>{Math.max(2, loyaltyStampsRequired - 1)} sellos</b> para
              el premio. El pedido <b>número {Math.max(2, loyaltyStampsRequired)}</b> se
              aplica automáticamente como gratis al confirmar
              {loyaltyCountRides ? " (los pedidos y las carreras finalizadas suman sellos)" : " (solo pedidos entregados)"}.
            </div>
          </div>

          {/* 6. Métodos de pago y QR */}
          <div className="bg-white rounded-3xl border border-[#EAECF0] p-6 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#EAECF0]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <div>
                  <h3 className="font-semibold text-sm text-[#101828]">
                    Pagos por QR y billeteras digitales
                  </h3>
                  <p className="text-[11px] text-[#667085]">
                    Activa los métodos que acepta TropiGO y carga el QR o los datos
                    de cuenta. El cliente paga desde el enlace público y reporta el
                    pago; un operador lo verifica.
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                {enabledPaymentCount} activos
              </span>
            </div>

            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`rounded-2xl border p-3 space-y-3 ${
                    method.enabled
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-[#EAECF0] bg-[#F9FAFB]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={method.enabled}
                        onChange={(e) =>
                          updatePaymentMethod(method.id, {
                            enabled: e.target.checked,
                          })
                        }
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <span className="text-base">{method.emoji}</span>
                      <span className="font-bold text-[#101828]">
                        {method.label}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase text-[#667085] border border-[#EAECF0]">
                        {method.type === "CASH"
                          ? "Efectivo"
                          : method.type === "QR"
                          ? "QR"
                          : method.type === "BANK"
                          ? "Banco"
                          : "Billetera"}
                      </span>
                    </label>

                    {method.qrImage ? (
                      <button
                        type="button"
                        onClick={() => updatePaymentMethod(method.id, { qrImage: "" })}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-[10px] font-bold text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                        Quitar QR
                      </button>
                    ) : (
                      <label
                        htmlFor={`qr-upload-${method.id}`}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#D0D5DD] bg-white px-2 py-1 text-[10px] font-bold text-[#344054]"
                      >
                        <Upload className="w-3 h-3" />
                        Subir QR
                        <input
                          id={`qr-upload-${method.id}`}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) =>
                            handleQrUpload(method.id, e.target.files?.[0] || null)
                          }
                        />
                      </label>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-[#667085]">
                        Nombre visible
                      </label>
                      <input
                        type="text"
                        maxLength={80}
                        value={method.label}
                        onChange={(e) =>
                          updatePaymentMethod(method.id, {
                            label: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-[#D0D5DD] bg-white px-2.5 py-1.5 text-[11px] text-[#101828]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-[#667085]">
                        Titular
                      </label>
                      <input
                        type="text"
                        maxLength={120}
                        value={method.accountName}
                        onChange={(e) =>
                          updatePaymentMethod(method.id, {
                            accountName: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-[#D0D5DD] bg-white px-2.5 py-1.5 text-[11px] text-[#101828]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-[#667085]">
                        Cuenta / celular
                      </label>
                      <input
                        type="text"
                        maxLength={80}
                        value={method.accountNumber}
                        onChange={(e) =>
                          updatePaymentMethod(method.id, {
                            accountNumber: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-[#D0D5DD] bg-white px-2.5 py-1.5 text-[11px] text-[#101828]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-[#667085]">
                        Instrucciones
                      </label>
                      <input
                        type="text"
                        maxLength={500}
                        value={method.instructions}
                        onChange={(e) =>
                          updatePaymentMethod(method.id, {
                            instructions: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-[#D0D5DD] bg-white px-2.5 py-1.5 text-[11px] text-[#101828]"
                      />
                    </div>
                  </div>

                  {method.qrImage && (
                    <div className="flex items-center gap-3 rounded-xl border border-[#EAECF0] bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={method.qrImage}
                        alt={`QR de ${method.label}`}
                        className="h-16 w-16 rounded-lg object-contain"
                      />
                      <div>
                        <p className="text-[10px] font-bold text-emerald-700">
                          QR cargado
                        </p>
                        <p className="text-[9px] text-[#667085]">
                          Se muestra en la página pública de pago.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {paymentError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{paymentError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] text-[#667085]">
                Los QRs se guardan en la base de datos del negocio. No se envían a
                servicios externos.
              </p>
              <button
                type="button"
                onClick={handleSavePayments}
                className="inline-flex items-center gap-2 rounded-xl bg-[#101828] px-4 py-2 text-xs font-bold text-white hover:bg-[#1D2939]"
              >
                {paymentSaved ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Wallet className="w-4 h-4" />
                )}
                {paymentSaved ? "Métodos guardados" : "Guardar métodos de pago"}
              </button>
            </div>
          </div>

          {saveError && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Botón Guardar */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saved ? "Guardado con éxito!" : "Guardar Ajustes"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN: USUARIOS DEL EQUIPO                                             */}
      {/* ========================================================================= */}
      {activeTab === "users" && (
        <div className="bg-white rounded-3xl border border-[#EAECF0] p-6 shadow-2xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-sm text-[#101828]">Usuarios del Equipo TropiGO</h3>
            </div>
            <span className="text-xs bg-[#F2F4F7] text-[#475467] px-2.5 py-1 rounded-full font-medium">
              {users.length} usuario(s)
            </span>
          </div>

          <div className="divide-y divide-[#EAECF0]">
            {users.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#101828]">{u.name}</p>
                  <p className="text-[11px] text-[#667085]">{u.email}</p>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold uppercase">
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
