"use client";

import { useState, useEffect } from "react";
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
    try {
      await fetch("/api/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          timezone,
          agencyName,
          agencyLogo,
          defaultModel: selectedModelId,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
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
