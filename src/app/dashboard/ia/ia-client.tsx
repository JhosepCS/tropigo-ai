"use client";

import { useState } from "react";
import {
  Sparkles,
  Bot,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Lock,
  Key,
  HelpCircle,
  ExternalLink,
  Cpu,
  Zap,
  Save,
  RotateCcw,
  Sliders,
  MessageSquare,
  Compass,
  FileText,
  DollarSign,
  AlertOctagon,
  UserCheck,
  Check,
  Image as ImageIcon,
  Smile,
  Info,
  Activity,
  RefreshCw,
  Server,
  Layers,
  ArrowRight,
} from "lucide-react";
import { AIProviderStatus, ConnectionTestResult, VERIFIED_MODELS_CATALOG } from "@/lib/ai/types";
import { AssistantIdentityConfig } from "@/lib/ai/config-manager";
import {
  DEFAULT_CEREBRAS_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GROQ_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  DEFAULT_SIMULATOR_MODEL,
} from "@/lib/ai/model-defaults";

interface IAClientProps {
  initialProviders: AIProviderStatus[];
  initialAssistantConfig: AssistantIdentityConfig;
}

// Avatares predefinidos temáticos para TropiGO Ivirgarzama
const PRESET_AVATARS = [
  { id: "tropibot", label: "TropiBot Clásico", url: "/avatar-tropigo.png", icon: "🌴" },
  { id: "rider", label: "Rider Mototaxi", url: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=150&auto=format&fit=crop&q=80", icon: "🛵" },
  { id: "chef", label: "Chef Ivirgarzama", url: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&auto=format&fit=crop&q=80", icon: "🍗" },
  { id: "toucan", label: "Tucán del Trópico", url: "https://images.unsplash.com/photo-1550853024-fae8dd4be47f?w=150&auto=format&fit=crop&q=80", icon: "🦜" },
  { id: "ai-smart", label: "AI Tech", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80", icon: "🤖" },
];

export function IAClient({ initialProviders, initialAssistantConfig }: IAClientProps) {
  // Pestaña activa: "studio" (Personalización) vs "providers" (API Keys & Modelos)
  const [activeTab, setActiveTab] = useState<"studio" | "providers">("studio");

  // Estado del Asistente en AI Studio
  const [config, setConfig] = useState<AssistantIdentityConfig>(initialAssistantConfig);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estado de Reglas de Pase a Humano
  const [newHandoffTag, setNewHandoffTag] = useState("");

  // Estado de Prueba en Vivo (Simulador Interactivo)
  const [testPrompt, setTestPrompt] = useState("Hola, ¿qué tienen de almuerzo en Doña Julia hoy?");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // Estado de Claves y Modelos de Proveedores
  const [providers, setProviders] = useState(initialProviders);
  const [groqKeyInput, setGroqKeyInput] = useState("");
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [openRouterKeyInput, setOpenRouterKeyInput] = useState("");
  const [cerebrasKeyInput, setCerebrasKeyInput] = useState("");
  const [savingKeys, setSavingKeys] = useState(false);
  const [keysStatus, setKeysStatus] = useState<string | null>(null);

  // Pruebas individuales de conexión contra las APIs
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [providerTestResults, setProviderTestResults] = useState<
    Record<string, ConnectionTestResult>
  >({});

  // 1. Guardar Configuración en Base de Datos Supabase
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setSaveStatus(null);

    try {
      const res = await fetch("/api/settings/assistant-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar la configuración.");

      setConfig(data.config);
      setSaveStatus({
        type: "success",
        text: "✅ Configuración de IA guardada y sincronizada en base de datos. Los cambios ya están activos.",
      });
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (err: any) {
      setSaveStatus({ type: "error", text: `❌ Error: ${err.message}` });
    } finally {
      setSavingConfig(false);
    }
  };

  // 2. Restaurar Valores Predeterminados
  const handleResetDefaults = async () => {
    if (!confirm("¿Deseas restaurar la personalidad, instrucciones y reglas predeterminadas de TropiGO Ivirgarzama?")) {
      return;
    }

    setSavingConfig(true);
    setSaveStatus(null);

    try {
      const res = await fetch("/api/settings/assistant-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo restaurar la configuración.");

      setConfig(data.config);
      setSaveStatus({
        type: "success",
        text: "🔄 Configuración restaurada a los valores predeterminados de fábrica de Ivirgarzama.",
      });
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (err: any) {
      setSaveStatus({ type: "error", text: `❌ Error: ${err.message}` });
    } finally {
      setSavingConfig(false);
    }
  };

  // 3. Probar en el Simulador en Tiempo Real con las opciones actuales
  const handleTestChat = async (promptToSend?: string) => {
    const text = promptToSend || testPrompt;
    if (!text.trim() || testing) return;

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text.trim() }],
          draftConfig: config, // Enviar configuración en borrador para simulación instantánea
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al invocar el asistente.");

      setTestResult(data.result);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setTesting(false);
    }
  };

  // 4. Probar conexión en vivo de un proveedor específico
  const handleTestProvider = async (providerId: string) => {
    setTestingProvider(providerId);

    // Obtener clave si está en el input temporal
    let keyToSend: string | undefined = undefined;
    if (providerId === "groq" && groqKeyInput.trim()) keyToSend = groqKeyInput.trim();
    if (providerId === "gemini" && geminiKeyInput.trim()) keyToSend = geminiKeyInput.trim();
    if (providerId === "openrouter" && openRouterKeyInput.trim()) keyToSend = openRouterKeyInput.trim();
    if (providerId === "cerebras" && cerebrasKeyInput.trim()) keyToSend = cerebrasKeyInput.trim();

    try {
      const res = await fetch("/api/settings/ai-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: providerId,
          key: keyToSend,
          model: config.providerModels?.[providerId] || undefined,
        }),
      });

      const data = await res.json();
      if (data.testResult) {
        setProviderTestResults((prev) => ({
          ...prev,
          [providerId]: data.testResult,
        }));
      } else {
        setProviderTestResults((prev) => ({
          ...prev,
          [providerId]: {
            success: false,
            provider: providerId as any,
            model: "unknown",
            latencyMs: 0,
            error: data.error || "Error desconocido en la prueba.",
          },
        }));
      }
    } catch (err: any) {
      setProviderTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: false,
          provider: providerId as any,
          model: "unknown",
          latencyMs: 0,
          error: `Error de red: ${err.message}`,
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  // 5. Guardar Claves de Proveedores y Configuración de Modelos
  const handleSaveKeysAndModels = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKeys(true);
    setKeysStatus(null);

    try {
      const res = await fetch("/api/settings/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groqKey: groqKeyInput.trim() || undefined,
          geminiKey: geminiKeyInput.trim() || undefined,
          openRouterKey: openRouterKeyInput.trim() || undefined,
          cerebrasKey: cerebrasKeyInput.trim() || undefined,
          activeProvider: config.activeProvider,
          activeModel: config.activeModel,
          fallbackProviders: config.fallbackProviders,
          providerModels: config.providerModels,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar claves.");

      setProviders(data.providers);
      if (data.assistantConfig) {
        setConfig(data.assistantConfig);
      }
      setKeysStatus("✅ Proveedores y credenciales cifradas con AES-256-GCM guardados en Supabase.");
      setGroqKeyInput("");
      setGeminiKeyInput("");
      setOpenRouterKeyInput("");
      setCerebrasKeyInput("");
      setTimeout(() => setKeysStatus(null), 6000);
    } catch (err: any) {
      setKeysStatus(`❌ Error: ${err.message}`);
    } finally {
      setSavingKeys(false);
    }
  };

  // Manejo de etiquetas de traspaso a humano
  const addHandoffTag = () => {
    if (!newHandoffTag.trim()) return;
    const tag = newHandoffTag.trim().toLowerCase();
    if (!config.handoffRules.includes(tag)) {
      setConfig({ ...config, handoffRules: [...config.handoffRules, tag] });
    }
    setNewHandoffTag("");
  };

  const removeHandoffTag = (tagToRemove: string) => {
    setConfig({
      ...config,
      handoffRules: config.handoffRules.filter((t) => t !== tagToRemove),
    });
  };

  return (
    <div className="space-y-6">
      {/* Pestañas de Navegación del Módulo */}
      <div className="flex border-b border-[#EAECF0] gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("studio")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "studio"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-[#667085] hover:text-[#101828]"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Studio (Personalización del Asistente)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("providers")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "providers"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-[#667085] hover:text-[#101828]"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Motor Multimodelo & Claves API (Groq / Gemini / OpenRouter)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: AI STUDIO (PERSONALIZACIÓN COMPLETA DEL ASISTENTE)              */}
      {/* ========================================================================= */}
      {activeTab === "studio" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Formulario de Personalización (7 columnas) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Barra superior de acciones de guardado */}
            <div className="bg-white p-4 rounded-3xl border border-[#EAECF0] shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={config.avatarUrl || "/avatar-tropigo.png"}
                  alt={config.name}
                  className="w-10 h-10 rounded-2xl object-cover border border-emerald-300 shadow-xs bg-emerald-50"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/avatar-tropigo.png";
                  }}
                />
                <div>
                  <h3 className="text-sm font-black text-[#101828] flex items-center gap-1.5">
                    {config.name}
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Tono: {config.tone.toUpperCase()}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#667085]">
                    Proveedor activo: <span className="font-semibold text-emerald-800 font-mono">{config.activeProvider}</span> ({config.activeModel})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  disabled={savingConfig}
                  className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl font-bold flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="text-xs text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#D0D5DD] px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingConfig ? "Guardando..." : "Guardar Cambios"}</span>
                </button>
              </div>
            </div>

            {/* Notificación de estado de guardado */}
            {saveStatus && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  saveStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                    : "bg-red-50 text-red-900 border border-red-200"
                }`}
              >
                {saveStatus.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{saveStatus.text}</span>
              </div>
            )}

            {/* SECCIÓN 1: IDENTIDAD DEL ASISTENTE */}
            <div className="bg-white p-5 rounded-3xl border border-[#EAECF0] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#EAECF0] pb-2.5">
                <Bot className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-[#101828]">
                  1. Identidad del Asistente
                </h4>
              </div>

              {/* Nombre */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">Nombre Oficial del Asistente</label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  placeholder="Ej: TropiBot, Asistente TropiGO..."
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Selector de Avatar */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Avatar o Imagen de Perfil</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Selecciona un preset o escribe una URL
                  </span>
                </label>

                {/* Preset Avatars */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected = config.avatarUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setConfig({ ...config, avatarUrl: preset.url })}
                        className={`p-2 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 shadow-xs"
                            : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-xl">{preset.icon}</span>
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* URL personalizada */}
                <div className="pt-1">
                  <input
                    type="text"
                    value={config.avatarUrl}
                    onChange={(e) => setConfig({ ...config, avatarUrl: e.target.value })}
                    placeholder="O pega una URL de imagen (https://...)"
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2 text-xs font-mono text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Aclaración WhatsApp */}
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Aviso importante:</strong> Cambiar el avatar interno en el CRM personaliza la identidad y el simulador de TropiGO, pero <u>no</u> modifica automáticamente la foto de perfil en WhatsApp Business (ésta debe actualizarse en el panel de Meta Business Suite).
                  </p>
                </div>
              </div>

              {/* Descripción y Función */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">Descripción y Función Principal</label>
                <input
                  type="text"
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  placeholder="Ej: Asistente virtual de pedidos, delivery y atención en Ivirgarzama"
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* SECCIÓN 2: PERSONALIDAD Y TONO */}
            <div className="bg-white p-5 rounded-3xl border border-[#EAECF0] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#EAECF0] pb-2.5">
                <Smile className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-[#101828]">
                  2. Personalidad y Tono de Comunicación
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: "cercano",
                    title: "Cercano / Tropical",
                    desc: "Cálido, empático y hospitalario con la esencia del Trópico de Cochabamba.",
                    recommended: true,
                  },
                  {
                    id: "amable",
                    title: "Amable",
                    desc: "Paciente, cordial y muy atento a cada detalle que el cliente solicita.",
                  },
                  {
                    id: "profesional",
                    title: "Profesional",
                    desc: "Directo, ágil, ejecutivo y enfocado en despachar pedidos con rapidez.",
                  },
                  {
                    id: "formal",
                    title: "Formal",
                    desc: "Estructurado, sumamente respetuoso y con trato de 'usted'.",
                  },
                  {
                    id: "personalizado",
                    title: "Personalizado",
                    desc: "Regido al 100% por lo que redactes en las instrucciones personalizadas.",
                  },
                ].map((item) => {
                  const isSelected = config.tone === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setConfig({ ...config, tone: item.id as any })}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/70 shadow-xs"
                          : "border-slate-200 bg-slate-50/40 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{item.title}</span>
                        {item.recommended && (
                          <span className="text-[9px] bg-emerald-200 text-emerald-900 font-extrabold px-1.5 py-0.2 rounded">
                            Ivirgarzama
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN 3: CONFIGURACIÓN DE LENGUAJE Y LOCALISMOS */}
            <div className="bg-white p-5 rounded-3xl border border-[#EAECF0] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#EAECF0] pb-2.5">
                <Compass className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-[#101828]">
                  3. Lenguaje, Regionalismos y Precios (Bolivia)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: "bolivian_tropical",
                    title: "Boliviano Tropical (Recomendado)",
                    desc: "Reconoce platos locales (broaster, majadito, pique macho), barrios de Ivirgarzama y precios en Bs.",
                  },
                  {
                    id: "standard_spanish",
                    title: "Español Estándar",
                    desc: "Español neutro claro y universal, con precios en moneda nacional Bs.",
                  },
                  {
                    id: "formal",
                    title: "Español Formal",
                    desc: "Vocabulario formal y protocolar.",
                  },
                ].map((item) => {
                  const isSelected = config.languageStyle === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setConfig({ ...config, languageStyle: item.id as any })}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/70 shadow-xs"
                          : "border-slate-200 bg-slate-50/40 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900 block mb-1">
                        {item.title}
                      </span>
                      <p className="text-[11px] text-slate-600 leading-snug">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN 4: SALUDO INICIAL Y DESPEDIDA */}
            <div className="bg-white p-5 rounded-3xl border border-[#EAECF0] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#EAECF0] pb-2.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-[#101828]">
                  4. Mensajes de Bienvenida y Despedida
                </h4>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Mensaje de Saludo Inicial (Al recibir el primer mensaje)
                  </label>
                  <textarea
                    rows={2}
                    value={config.welcomeMessage}
                    onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl p-3 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Mensaje de Despedida (Al concluir pedido o atención)
                  </label>
                  <textarea
                    rows={2}
                    value={config.goodbyeMessage}
                    onChange={(e) => setConfig({ ...config, goodbyeMessage: e.target.value })}
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl p-3 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 5: INSTRUCCIONES PERSONALIZADAS (EDITOR DEL SYSTEM PROMPT) */}
            <div className="bg-white p-5 rounded-3xl border border-[#EAECF0] shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EAECF0] pb-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#101828]">
                    5. Instrucciones Personalizadas (Prompt Editor)
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {config.instructions.length} caracteres
                </span>
              </div>

              <p className="text-xs text-[#667085]">
                Escribe aquí exactamente cómo quieres que actúe el asistente. Estas instrucciones se compilan dinámicamente en el System Prompt de cada llamada a Groq, Gemini o el Simulador.
              </p>

              <textarea
                rows={5}
                value={config.instructions}
                onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
                className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-2xl p-3.5 text-xs text-[#101828] font-mono leading-relaxed focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* SECCIÓN 6: REGLAS COMERCIALES, TRANSFERENCIA HUMANA Y SEGURIDAD */}
            <div className="bg-white p-5 rounded-3xl border border-[#EAECF0] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#EAECF0] pb-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-[#101828]">
                  6. Reglas Comerciales y Transferencia a Operador
                </h4>
              </div>

              {/* Política de Cotización */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Política de Cotización de Tarifas
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, quotePolicy: "require_zone" })}
                    className={`p-2.5 rounded-xl border text-left text-xs ${
                      config.quotePolicy === "require_zone"
                        ? "border-emerald-600 bg-emerald-50 font-bold text-emerald-950"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    Exigir zona o referencia de Ivirgarzama
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, quotePolicy: "flexible" })}
                    className={`p-2.5 rounded-xl border text-left text-xs ${
                      config.quotePolicy === "flexible"
                        ? "border-emerald-600 bg-emerald-50 font-bold text-emerald-950"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    Cotización orientativa flexible
                  </button>
                </div>
              </div>

              {/* Confirmación de Pedidos */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-800">
                  Confirmación de Pedidos
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, orderPolicy: "strict_confirmation" })}
                    className={`p-2.5 rounded-xl border text-left text-xs ${
                      config.orderPolicy === "strict_confirmation"
                        ? "border-emerald-600 bg-emerald-50 font-bold text-emerald-950"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    Confirmación obligatoria con resumen y precio en Bs.
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, orderPolicy: "standard" })}
                    className={`p-2.5 rounded-xl border text-left text-xs ${
                      config.orderPolicy === "standard"
                        ? "border-emerald-600 bg-emerald-50 font-bold text-emerald-950"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    Confirmación estándar
                  </button>
                </div>
              </div>

              {/* Palabras clave de pase a humano */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Palabras Clave para Transferir a Operador Humano (Handoff)</span>
                  <span className="text-[10px] text-slate-400">Pausa la IA y notifica</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {config.handoffRules.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-lg text-xs font-bold"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeHandoffTag(tag)}
                        className="hover:text-red-700 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newHandoffTag}
                    onChange={(e) => setNewHandoffTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHandoffTag())}
                    placeholder="Agregar palabra clave (ej: queja, lluvia, factura)..."
                    className="flex-1 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-1.5 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={addHandoffTag}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* Prohibiciones */}
              <div className="space-y-1 pt-2">
                <label className="text-xs font-bold text-slate-800">Prohibiciones Estrictas de Seguridad</label>
                <textarea
                  rows={3}
                  value={config.prohibitedActions}
                  onChange={(e) => setConfig({ ...config, prohibitedActions: e.target.value })}
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl p-3 text-xs text-red-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-400"
                />
              </div>
            </div>
          </div>

          {/* Columna Derecha: Vista Previa y Simulador en Tiempo Real (5 columnas) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-6 bg-white p-5 rounded-3xl border border-[#EAECF0] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-black text-[#101828]">Simulador de Vista Previa</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded-md">
                    {config.activeProvider}
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    En Vivo
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#667085]">
                Prueba preguntas reales de Ivirgarzama para verificar cómo responde el asistente con tu configuración actual antes o después de guardar.
              </p>

              {/* Botones rápidos de prueba de Ivirgarzama */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Pruebas Rápidas de Ivirgarzama
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Hola, buenas tardes",
                    "¿Qué platos tienen en Doña Julia?",
                    "¿Cuánto cuesta el envío a Barrio Magisterio?",
                    "Quiero un pollo al spiedo con arroz",
                    "Tengo un reclamo, mi pedido no llegó",
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setTestPrompt(preset);
                        handleTestChat(preset);
                      }}
                      className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-left transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entrada de Prueba Interactiva */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleTestChat())}
                    placeholder="Escribe una pregunta para probar..."
                    className="flex-1 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleTestChat()}
                    disabled={testing || !testPrompt.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#D0D5DD] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1"
                  >
                    {testing ? "..." : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Salida del Simulador */}
              {testResult && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2.5 max-h-[360px] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-emerald-600" />
                      {config.name} responde:
                    </span>
                    {testResult.latencyMs && (
                      <span className="text-[10px] text-slate-500">
                        {testResult.latencyMs} ms • {testResult.provider?.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Indicador de pase a humano */}
                  {testResult.operatorHandoff && (
                    <div className="bg-amber-100 border border-amber-300 text-amber-900 p-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>🚨 Transferencia a Operador Humano activada</span>
                    </div>
                  )}

                  {/* Alerta de contingencia */}
                  {testResult.alertAdmin && (
                    <div className="bg-red-100 border border-red-300 text-red-900 p-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-700 shrink-0" />
                      <span>⚠️ Proveedores externos no disponibles; contingencia local activa.</span>
                    </div>
                  )}

                  {testResult.error ? (
                    <p className="text-red-600 font-medium">{testResult.error}</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-slate-800 whitespace-pre-wrap leading-relaxed text-[11px]">
                        {testResult.content}
                      </p>

                      {/* Herramientas invocadas */}
                      {testResult.toolCalls && testResult.toolCalls.length > 0 && (
                        <div className="bg-white p-2 rounded-xl border border-slate-200 text-[10px] space-y-1">
                          <span className="font-bold text-emerald-800 flex items-center gap-1">
                            <Cpu className="w-3 h-3" />
                            Herramientas Backend Utilizadas:
                          </span>
                          {testResult.toolCalls.map((tc: any, i: number) => (
                            <div key={i} className="font-mono text-slate-700">
                              {tc.tool}({JSON.stringify(tc.args)})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: CONECTORES DE MODELOS & GESTIÓN DE API KEYS                    */}
      {/* ========================================================================= */}
      {activeTab === "providers" && (
        <div className="space-y-6">
          {/* Banner de Garantía 0 Bs. */}
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 rounded-3xl text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Garantía de Presupuesto 0 Bs. y Modelos Gratuitos Verificados</span>
            </div>
            <p className="text-emerald-800 leading-relaxed">
              El motor multimodelo de TropiGO AI está configurado para operar exclusivamente con proveedores que ofrecen capas gratuitas verificadas (Groq Cloud, Google Gemini AI Studio, OpenRouter :free). Si un proveedor falla o agota sus cuotas de solicitudes por minuto (RPM), el sistema conmuta automáticamente al siguiente proveedor gratuito o al Simulador Local de Ivirgarzama. <strong>Bajo ninguna circunstancia se conmutará a modelos ni servicios de pago.</strong>
            </p>
          </div>

          {/* SELECTOR DE PROVEEDOR PRINCIPAL Y MODELO */}
          <div className="bg-white p-6 rounded-3xl border border-[#EAECF0] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-[#101828]">
                  Selección de Proveedor y Modelo Activo
                </h3>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                Prioridad Activa: {config.activeProvider}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Proveedor Principal */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Proveedor Principal</label>
                <select
                  value={config.activeProvider}
                  onChange={(e) => {
                    const newProvider = e.target.value;
                    let defaultModel = DEFAULT_GROQ_MODEL;
                    if (newProvider === "GEMINI") defaultModel = DEFAULT_GEMINI_MODEL;
                    if (newProvider === "OPENROUTER") defaultModel = DEFAULT_OPENROUTER_MODEL;
                    if (newProvider === "CEREBRAS") defaultModel = DEFAULT_CEREBRAS_MODEL;
                    if (newProvider === "LOCAL") defaultModel = DEFAULT_SIMULATOR_MODEL;

                    setConfig({
                      ...config,
                      activeProvider: newProvider,
                      activeModel: defaultModel,
                    });
                  }}
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#101828] font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="GROQ">Groq Cloud (GPT-OSS 120B & 20B) - Recomendado</option>
                  <option value="GEMINI">Google Gemini (3.x Flash Lite)</option>
                  <option value="OPENROUTER">OpenRouter (Capa Libre :free)</option>
                  <option value="CEREBRAS">Cerebras Cloud (Developer Trial)</option>
                  <option value="LOCAL">Simulador Local Ivirgarzama (Sin Internet/0 Bs.)</option>
                </select>
              </div>

              {/* Modelo Principal */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Modelo Principal Asociado</label>
                <select
                  value={config.activeModel}
                  onChange={(e) => setConfig({ ...config, activeModel: e.target.value })}
                  className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#101828] font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {config.activeProvider === "GROQ" &&
                    VERIFIED_MODELS_CATALOG.groq.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                  {config.activeProvider === "GEMINI" &&
                    VERIFIED_MODELS_CATALOG.gemini.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                  {config.activeProvider === "OPENROUTER" &&
                    VERIFIED_MODELS_CATALOG.openrouter.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                  {config.activeProvider === "CEREBRAS" &&
                    VERIFIED_MODELS_CATALOG.cerebras.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                  {config.activeProvider === "LOCAL" &&
                    VERIFIED_MODELS_CATALOG.simulator.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Cascada de Respaldo */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Cascada de Respaldo Automática</label>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-700 flex items-center gap-1 flex-wrap">
                  <span className="font-bold text-emerald-800">1. {config.activeProvider}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>2. GEMINI</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>3. OPENROUTER</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="font-bold text-slate-900">4. SIMULADOR</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de Estado de Proveedores y Pruebas en Vivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((p) => {
              const isActive = p.status === "ACTIVE";
              const isTrial = p.status === "TRIAL";
              const test = providerTestResults[p.provider];
              const isTestingThis = testingProvider === p.provider;

              return (
                <div
                  key={p.provider}
                  className="bg-white p-5 rounded-3xl border border-[#EAECF0] shadow-2xs space-y-3 relative hover:border-emerald-300 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#EAECF0] pb-2.5">
                      <span className="font-bold text-xs text-[#101828] flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-emerald-600" />
                        {p.name}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isTrial
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {isActive ? "Conectado" : isTrial ? "Prueba 30d" : "En espera de Key"}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>Modelo configurado:</span>
                        <span className="font-mono font-bold text-slate-900">{p.configuredModel}</span>
                      </div>

                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>Clave cifrada:</span>
                        <span className="font-mono text-slate-500">
                          {p.maskedKey || "Sin configurar (usa simulador)"}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#667085] bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                      {p.notes}
                    </p>

                    {p.isFreeVerified && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Capa gratuita permanente verificada</span>
                      </div>
                    )}

                    {/* Resultado de la prueba en vivo */}
                    {test && (
                      <div
                        className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                          test.success
                            ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                            : "bg-red-50 border-red-200 text-red-950"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{test.success ? "✅ Conexión Exitosa" : "❌ Error de Conexión"}</span>
                          <span className="font-mono text-[10px]">{test.latencyMs} ms</span>
                        </div>
                        {test.success ? (
                          <p className="text-[10px] text-emerald-800">
                            Respuesta de prueba: &ldquo;{test.sampleResponse}&rdquo;
                          </p>
                        ) : (
                          <p className="text-[10px] text-red-700 font-mono break-words">
                            {test.error}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Botón de prueba de conexión en vivo */}
                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <button
                      type="button"
                      onClick={() => handleTestProvider(p.provider)}
                      disabled={isTestingThis}
                      className="w-full bg-slate-50 hover:bg-slate-100 disabled:bg-slate-100 text-slate-800 border border-slate-200 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Activity className={`w-3.5 h-3.5 text-emerald-600 ${isTestingThis ? "animate-spin" : ""}`} />
                      <span>{isTestingThis ? "Probando conexión..." : "Probar Conexión"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formulario de Configuración Segura de API Keys */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-[#EAECF0] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#EAECF0] pb-3">
                <Key className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-[#101828]">
                  Cargar o Actualizar API Keys Cifradas en el Servidor
                </h3>
              </div>

              <form onSubmit={handleSaveKeysAndModels} className="space-y-4 text-xs">
                {/* Groq Key */}
                <div className="space-y-1">
                  <label className="font-bold text-[#101828] flex items-center justify-between">
                    <span>Groq API Key (Llama 3.3)</span>
                    <span className="text-[10px] text-emerald-700 font-normal">Recomendada (Ultra rápida)</span>
                  </label>
                  <input
                    type="password"
                    value={groqKeyInput}
                    onChange={(e) => setGroqKeyInput(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2 text-xs font-mono text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-[#667085]">
                    Cifrada con AES-256-GCM. 30 RPM y 1,000 req/día gratis.
                  </p>
                </div>

                {/* Gemini Key */}
                <div className="space-y-1">
                  <label className="font-bold text-[#101828] flex items-center justify-between">
                    <span>Google Gemini API Key (AI Studio)</span>
                    <span className="text-[10px] text-teal-700 font-normal">Para visión y fallback</span>
                  </label>
                  <input
                    type="password"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2 text-xs font-mono text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* OpenRouter Key */}
                <div className="space-y-1">
                  <label className="font-bold text-[#101828] flex items-center justify-between">
                    <span>OpenRouter API Key (:free tier)</span>
                    <span className="text-[10px] text-blue-700 font-normal">Garantía estricta 0 Bs.</span>
                  </label>
                  <input
                    type="password"
                    value={openRouterKeyInput}
                    onChange={(e) => setOpenRouterKeyInput(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2 text-xs font-mono text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Cerebras Key */}
                <div className="space-y-1">
                  <label className="font-bold text-[#101828] flex items-center justify-between">
                    <span>Cerebras API Key (Developer Trial)</span>
                    <span className="text-[10px] text-amber-700 font-normal">Inferencia Wafer-Scale</span>
                  </label>
                  <input
                    type="password"
                    value={cerebrasKeyInput}
                    onChange={(e) => setCerebrasKeyInput(e.target.value)}
                    placeholder="csk-..."
                    className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3.5 py-2 text-xs font-mono text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {keysStatus && (
                  <p className="text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    {keysStatus}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={savingKeys}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-[#D0D5DD] text-white py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{savingKeys ? "Cifrando y Guardando..." : "Guardar Selección y Claves Cifradas"}</span>
                </button>
              </form>
            </div>

            {/* Guía Rápida para Obtener Credenciales Gratuitas */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-3.5 text-xs text-slate-700">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm border-b border-slate-200 pb-2.5">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <span>¿Cómo obtener tus claves gratuitas? (0 Bs.)</span>
              </div>

              <div className="space-y-2">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900 flex items-center justify-between">
                    <span>1. Groq Cloud (Ultra Rápido)</span>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:underline flex items-center gap-0.5 text-[11px]"
                    >
                      console.groq.com <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Ingresa con tu correo, haz clic en &ldquo;API Keys&rdquo; &gt; &ldquo;Create API Key&rdquo; y cópiala aquí. Sin ingresar tarjeta.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900 flex items-center justify-between">
                    <span>2. Google AI Studio (Gemini Flash)</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-700 hover:underline flex items-center gap-0.5 text-[11px]"
                    >
                      aistudio.google.com <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Inicia sesión con tu cuenta de Google, haz clic en &ldquo;Get API key&rdquo; y pégala aquí. Admite fotos y audios en el plan gratis.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900 flex items-center justify-between">
                    <span>3. OpenRouter (:free tier)</span>
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:underline flex items-center gap-0.5 text-[11px]"
                    >
                      openrouter.ai/keys <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Crea una cuenta gratuita y genera tu clave. Solo se ejecutarán modelos comunitarios con sufijo :free.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900 flex items-center justify-between">
                    <span>4. Cerebras Cloud (Developer)</span>
                    <a
                      href="https://cloud.cerebras.ai"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-700 hover:underline flex items-center gap-0.5 text-[11px]"
                    >
                      cloud.cerebras.ai <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Inscríbete en el programa developer de Cerebras para obtener acceso por hardware Wafer-Scale Engine.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
