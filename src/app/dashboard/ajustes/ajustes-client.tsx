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
} from "lucide-react";

interface AjustesClientProps {
  initialBusiness: any;
  initialAgency: any;
  users: any[];
}

export function AjustesClient({
  initialBusiness,
  initialAgency,
  users,
}: AjustesClientProps) {
  // 1. Datos Generales
  const [businessName, setBusinessName] = useState(initialBusiness?.name || "Clínica Dental Lumen");
  const [timezone, setTimezone] = useState(initialBusiness?.timezone || "Europe/Madrid");

  // 2. Marca de la Agencia
  const [agencyName, setAgencyName] = useState(initialAgency?.name || "Lumina Digital Agency");
  const [agencyLogo, setAgencyLogo] = useState(initialAgency?.logoUrl || "");

  // 3. Modelo de IA (OpenRouter)
  const [models, setModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("anthropic/claude-haiku-5.5");
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

  // Modelo seleccionado actualmente
  const selectedModel = models.find((m) => m.id === selectedModelId) || {
    id: "anthropic/claude-haiku-5.5",
    name: "Claude Haiku 5.5",
    provider: "anthropic",
    promptPricePer1M: 0.8,
    completionPricePer1M: 4.0,
    contextLength: 200000,
  };

  // Cálculo del estimador para 1.000 conversaciones
  // Coste = 1000 * (tokens_in/1M * promptPrice + tokens_out/1M * completionPrice)
  const totalInputTokensMonthly = 1000 * inputTokensPerChat;
  const totalOutputTokensMonthly = 1000 * outputTokensPerChat;
  const inputCostMonthly = (totalInputTokensMonthly / 1000000) * (selectedModel.promptPricePer1M || 0);
  const outputCostMonthly = (totalOutputTokensMonthly / 1000000) * (selectedModel.completionPricePer1M || 0);
  const totalCostMonthly = inputCostMonthly + outputCostMonthly;

  // Filtrado y orden de modelos
  const filteredModels = models
    .filter((m) => {
      if (providerFilter === "free" && !m.isFree) return false;
      if (providerFilter !== "ALL" && providerFilter !== "free" && m.provider !== providerFilter) return false;
      if (modelSearch) {
        const q = modelSearch.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price") {
        return (a.promptPricePer1M + a.completionPricePer1M) - (b.promptPricePer1M + b.completionPricePer1M);
      }
      return a.name.localeCompare(b.name);
    });

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

  return (
    <div className="space-y-8 max-w-4xl">
      {/* 1. Datos Generales y Zona Horaria */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-2xs space-y-4 text-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-[#EAECF0]">
          <Settings className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-sm text-[#101828]">Datos Generales</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">Nombre del negocio</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">Zona Horaria</label>
            <input
              type="text"
              readOnly
              value={timezone}
              className="w-full bg-[#F2F4F7] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#475467] cursor-not-allowed font-mono"
            />
            <p className="text-[10px] text-[#667085]">
              Fijada en Europe/Madrid para todas las citas y horarios del asistente.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Modelo de IA (OpenRouter) */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#EAECF0]">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="font-semibold text-sm text-[#101828]">Modelo de Inteligencia Artificial</h3>
              <p className="text-xs text-[#667085]">
                Catálogo en vivo de OpenRouter. Solo se muestran modelos compatibles con llamadas a herramientas (tools).
              </p>
            </div>
          </div>

          <button
            onClick={() => loadOpenRouterData(true)}
            disabled={loadingModels}
            className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-xl transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingModels ? "animate-spin" : ""}`} />
            <span>Actualizar catálogo</span>
          </button>
        </div>

        {/* Indicador de Clave y Saldo */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#EAECF0] bg-[#FAFAFA] text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-[#101828]">
                Clave OPENROUTER_API_KEY:{" "}
                <span className={keyInfo.configured ? "text-emerald-700" : "text-amber-700"}>
                  {keyInfo.configured ? "Configurada (Oculta por seguridad)" : "No configurada"}
                </span>
              </p>
              <p className="text-[11px] text-[#667085]">
                La clave se gestiona en variables de entorno del servidor y nunca se expone al navegador.
              </p>
            </div>
          </div>

          {keyInfo.balance !== null && (
            <div className="bg-white px-3 py-1.5 rounded-lg border border-[#EAECF0] font-mono font-semibold text-emerald-800">
              Saldo restante: ${typeof keyInfo.balance === "number" ? keyInfo.balance.toFixed(2) : keyInfo.balance}
            </div>
          )}
        </div>

        {/* Buscador y Filtros Rápidos */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-3" />
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="Buscar por nombre, proveedor o identificador (ej: haiku, gpt-4o, gemini)..."
                className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl pl-9 pr-3 py-2 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-xs text-[#101828]"
            >
              <option value="price">Ordenar por precio</option>
              <option value="name">Ordenar por nombre</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: "ALL", label: "Todos" },
              { id: "free", label: "Gratis" },
              { id: "anthropic", label: "Anthropic" },
              { id: "google", label: "Google" },
              { id: "openai", label: "OpenAI" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setProviderFilter(f.id as any)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  providerFilter === f.id
                    ? "bg-[#101828] text-white"
                    : "bg-[#F2F4F7] text-[#475467] hover:bg-[#E4E7EC]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista Seleccionable de Modelos */}
        <div className="border border-[#EAECF0] rounded-xl max-h-64 overflow-y-auto divide-y divide-[#EAECF0] text-xs">
          {filteredModels.map((m) => {
            const isSelected = m.id === selectedModelId;
            const isRecommended = m.id === "anthropic/claude-haiku-5.5";

            return (
              <div
                key={m.id}
                onClick={() => setSelectedModelId(m.id)}
                className={`p-3.5 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                  isSelected ? "bg-teal-50/60 border-l-4 border-l-teal-600" : "hover:bg-[#F9FAFB]"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#101828]">{m.name}</span>
                    <span className="text-[10px] bg-[#F2F4F7] text-[#475467] px-1.5 py-0.5 rounded uppercase font-medium">
                      {m.provider}
                    </span>
                    {isRecommended && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                        ⭐ Recomendado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#667085] font-mono truncate mt-0.5">{m.id}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-semibold text-[#101828]">
                    {m.isFree
                      ? "Gratis"
                      : `$${m.promptPricePer1M.toFixed(2)} in / $${m.completionPricePer1M.toFixed(2)} out`}
                  </p>
                  <p className="text-[10px] text-[#667085]">
                    Contexto: {(m.contextLength / 1000).toFixed(0)}k tokens
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Estimador de Coste para 1.000 conversaciones al mes */}
        <div className="bg-gradient-to-r from-teal-50/60 to-emerald-50/60 p-5 rounded-2xl border border-teal-200/80 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-700" />
            <h4 className="font-bold text-xs text-teal-950">
              Estimación de coste mensual (1.000 conversaciones)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-teal-900">
                Tokens entrada / conv:
              </label>
              <input
                type="number"
                value={inputTokensPerChat}
                onChange={(e) => setInputTokensPerChat(Number(e.target.value))}
                className="w-full bg-white border border-teal-300 rounded-lg px-2.5 py-1.5 text-xs text-[#101828]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-teal-900">
                Tokens salida / conv:
              </label>
              <input
                type="number"
                value={outputTokensPerChat}
                onChange={(e) => setOutputTokensPerChat(Number(e.target.value))}
                className="w-full bg-white border border-teal-300 rounded-lg px-2.5 py-1.5 text-xs text-[#101828]"
              />
            </div>

            <div className="space-y-1 text-right">
              <p className="text-[11px] font-medium text-teal-900">Coste estimado mes:</p>
              <p className="text-2xl font-black text-teal-900">
                {totalCostMonthly === 0 ? "0.00 $ (Gratis)" : `$${totalCostMonthly.toFixed(2)} USD`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Marca de la Agencia (White-label) */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-2xs space-y-4 text-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-[#EAECF0]">
          <Building className="w-5 h-5 text-teal-600" />
          <div>
            <h3 className="font-semibold text-sm text-[#101828]">Marca de la Agencia (Marca Blanca)</h3>
            <p className="text-[11px] text-[#667085]">
              El nombre y logo de tu agencia que verán tus clientes en el menú lateral y pantalla de acceso.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">Nombre de la agencia</label>
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">URL del logo de la agencia</label>
            <input
              type="text"
              value={agencyLogo}
              onChange={(e) => setAgencyLogo(e.target.value)}
              placeholder="/agency-logo.png"
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
            />
          </div>
        </div>
      </div>

      {/* 4. Usuarios */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-2xs space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <h3 className="font-semibold text-sm text-[#101828]">Usuarios del Equipo</h3>
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
              <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-md font-bold uppercase">
                {u.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saved ? "Guardado con éxito!" : "Guardar Ajustes"}</span>
        </button>
      </div>
    </div>
  );
}
