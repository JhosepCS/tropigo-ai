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
} from "lucide-react";
import { WhatsAppMetaConnect } from "@/components/whatsapp-meta-connect";
import { MaskedWhatsAppStatus } from "@/lib/whatsapp/meta-manager";

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
  const [saveError, setSaveError] = useState<string | null>(null);

  // 2. Marca de la Agencia
  const [agencyName, setAgencyName] = useState(initialAgency?.name || "TropiGO Tecnologías");
  const [agencyLogo, setAgencyLogo] = useState(initialAgency?.logoUrl || "");

  // 3. Modelo de IA (Groq / OpenRouter)
  const [models, setModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("llama-3.3-70b-versatile");
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
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
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

          {/* 4. Fidelidad */}
          <div className="bg-white rounded-3xl border border-[#EAECF0] p-6 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#EAECF0]">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-emerald-600" />
                <div>
                  <h3 className="font-semibold text-sm text-[#101828]">
                    Tarjeta de fidelidad y premio del 10.º pedido
                  </h3>
                  <p className="text-[11px] text-[#667085]">
                    Un sello por pedido entregado. Al completar la tarjeta, el siguiente
                    pedido es gratis.
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

            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-800">
              Tarjeta configurada: <b>{Math.max(2, loyaltyStampsRequired - 1)} sellos</b> para
              el premio. El pedido <b>número {Math.max(2, loyaltyStampsRequired)}</b> se
              aplica automáticamente como gratis al confirmar.
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
