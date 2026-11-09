"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Bot,
  UserCheck,
  Send,
  Sparkles,
  Phone,
  ChevronDown,
  ChevronUp,
  Cpu,
  MapPin,
  Mic,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Wifi,
  Radio,
  FileText,
} from "lucide-react";

interface MessageItem {
  id: string;
  sender: "customer" | "assistant" | "human" | "CUSTOMER" | "ASSISTANT" | "OPERATOR" | string;
  content: string;
  createdAt: string;
  type?: "text" | "audio" | "image" | "location" | "document" | string;
  mediaType?: string;
  audioDuration?: string;
  audioTranscript?: string;
  imageUrl?: string;
  imageCaption?: string;
  locationData?: { name: string; address: string; zone: string };
  toolCallsJson?: string;
  deliveryStatus?: "SENT" | "DELIVERED" | "READ" | "FAILED" | string;
  wamid?: string;
  isDemo?: boolean;
}

interface ConversationItem {
  id: string;
  status: "ai_active" | "human_takeover" | "AI_ACTIVE" | "HUMAN_TAKEOVER" | string;
  channel: string;
  lastMessageAt: string;
  customer?: {
    id?: string;
    name: string;
    phone: string;
    address?: string;
    zone?: string;
  };
  contact?: {
    name?: string;
    phone?: string;
  };
  messages: MessageItem[];
  isDemo?: boolean;
}

interface ConversacionesClientProps {
  initialConversations: any[];
}

// Conversaciones de demostración realistas para Ivirgarzama (claramente etiquetadas)
const DEMO_CONVERSATIONS: ConversationItem[] = [
  {
    id: "demo-conv-1",
    status: "ai_active",
    channel: "whatsapp",
    lastMessageAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    isDemo: true,
    customer: {
      name: "Doña Carmen (Barrio Magisterio)",
      phone: "+591 729 45120",
      address: "Calle Los Pinos #45, frente a la cancha",
      zone: "Barrio Magisterio",
    },
    messages: [
      {
        id: "msg-1",
        sender: "customer",
        content: "Buenas tardes, ¿qué tienen de almuerzo en Doña Julia hoy?",
        type: "text",
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        isDemo: true,
      },
      {
        id: "msg-2",
        sender: "assistant",
        content:
          "¡Buenas tardes doña Carmen! 🌴 En Restaurante Doña Julia hoy tienen disponible:\n\n1. Pollo al Spiedo con papas fritas, arroz y ensalada — 25 Bs.\n2. Majadito tostado con huevo y plátano frito — 20 Bs.\n3. Sopa de maní con costilla — 12 Bs.\n\n¿Le gustaría pedir alguno o cotizar el delivery a su domicilio?",
        type: "text",
        toolCallsJson: JSON.stringify([
          {
            tool: "consultar_catalogo",
            args: { comercio: "Doña Julia", categoria: "Almuerzos" },
          },
        ]),
        createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
        isDemo: true,
      },
      {
        id: "msg-3",
        sender: "customer",
        content: "Nota de voz recibida (0:08)",
        type: "audio",
        audioDuration: "0:08",
        audioTranscript:
          "Mándeme un pollo al spiedo por favor con ají aparte, a mi casa en Barrio Magisterio.",
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        isDemo: true,
      },
      {
        id: "msg-4",
        sender: "assistant",
        content:
          "¡Perfecto! 🍗 Aquí está el resumen de su pedido:\n\n• 1x Pollo al Spiedo (Doña Julia): 25.00 Bs.\n• Envío a Barrio Magisterio: 5.00 Bs.\n• Total a pagar: 30.00 Bs.\n• Método de pago: Efectivo contra entrega o QR Simple\n\n¿Me confirma para registrar y enviar su pedido a Doña Julia?",
        type: "text",
        toolCallsJson: JSON.stringify([
          {
            tool: "cotizar_tarifa",
            args: { destino: "Barrio Magisterio", tipo: "DELIVERY" },
          },
        ]),
        createdAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
        isDemo: true,
      },
      {
        id: "msg-5",
        sender: "customer",
        content: "Sí, confirmado por favor. Pago con QR.",
        type: "text",
        createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
        isDemo: true,
      },
      {
        id: "msg-6",
        sender: "assistant",
        content:
          "✅ ¡Su pedido ha sido registrado con éxito!\n\nCódigo: TRP-1042\nRestaurante: Doña Julia\nDestino: Calle Los Pinos #45, Barrio Magisterio\nTotal: 30.00 Bs.\n\nEl restaurante ya está preparando su comida. Enseguida le avisamos cuando el repartidor esté en camino.",
        type: "text",
        toolCallsJson: JSON.stringify([
          {
            tool: "crear_pedido_delivery",
            args: {
              codigo: "TRP-1042",
              comercio: "Doña Julia",
              totalBs: 30,
              metodoPago: "QR_BANCO",
            },
          },
        ]),
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        isDemo: true,
      },
    ],
  },
  {
    id: "demo-conv-2",
    status: "human_takeover",
    channel: "whatsapp",
    lastMessageAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    isDemo: true,
    customer: {
      name: "Juan Carlos Miranda (Terminal)",
      phone: "+591 714 88390",
      address: "Frente a la Terminal Terrestre de Ivirgarzama",
      zone: "Terminal / Panamericana",
    },
    messages: [
      {
        id: "msg-201",
        sender: "customer",
        content: "Hola, ¿atienden envíos hasta la Terminal a esta hora?",
        type: "text",
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        isDemo: true,
      },
      {
        id: "msg-202",
        sender: "assistant",
        content:
          "¡Hola Juan Carlos! 🌴 Sí, cubrimos toda la zona de la Terminal Terrestre de Ivirgarzama. La tarifa de delivery a la Terminal es de 5.00 Bs. fijas. ¿Qué te gustaría cenar?",
        type: "text",
        createdAt: new Date(Date.now() - 29 * 60 * 1000).toISOString(),
        isDemo: true,
      },
      {
        id: "msg-203",
        sender: "customer",
        content: "Tengo un reclamo del pedido de ayer que tardó mucho, quiero hablar con alguien.",
        type: "text",
        createdAt: new Date(Date.now() - 27 * 60 * 1000).toISOString(),
        isDemo: true,
      },
      {
        id: "msg-204",
        sender: "assistant",
        content:
          "Entendido Juan Carlos. Siento mucho la demora de ayer. En este momento estoy pausando mis respuestas y pasando tu caso a nuestra operadora humana de despacho para que te atienda personalmente.",
        type: "text",
        toolCallsJson: JSON.stringify([
          { tool: "pasar_a_humano", args: { motivo: "Reclamo demora pedido ayer" } },
        ]),
        createdAt: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
        isDemo: true,
      },
      {
        id: "msg-205",
        sender: "human",
        content:
          "Hola Juan Carlos, soy Laura de despacho TropiGO. Disculpa la molestia de ayer, tuvimos lluvia fuerte en la zona. Cuéntame con qué pedido tuviste problema para compensarte hoy.",
        type: "text",
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        isDemo: true,
      },
    ],
  },
  {
    id: "demo-conv-3",
    status: "ai_active",
    channel: "whatsapp",
    lastMessageAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    isDemo: true,
    customer: {
      name: "Mariana Flores (Zona Central)",
      phone: "+591 603 19445",
      address: "Av. Mortensen y Plaza Principal",
      zone: "Centro",
    },
    messages: [
      {
        id: "msg-301",
        sender: "customer",
        content: "📍 Ubicación compartida en WhatsApp",
        type: "location",
        locationData: {
          name: "Ubicación GPS",
          address: "Av. Mortensen esquina calle Sucre, Ivirgarzama",
          zone: "Zona Central (Centro)",
        },
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        isDemo: true,
      },
      {
        id: "msg-302",
        sender: "assistant",
        content:
          "📍 Ubicación recibida: Av. Mortensen y Sucre (Zona Central de Ivirgarzama).\n\nTarifa de envío para esta zona: 4.00 Bs.\n\n¿Deseas consultar el menú de Pollería El Pahuichi o Restaurante Doña Julia?",
        type: "text",
        createdAt: new Date(Date.now() - 44 * 60 * 1000).toISOString(),
        isDemo: true,
      },
    ],
  },
];

export function ConversacionesClient({ initialConversations }: ConversacionesClientProps) {
  // Si no hay conversaciones reales en BD, inicializamos con las de demostración
  const hasRealData = initialConversations && initialConversations.length > 0;
  const [useDemoMode, setUseDemoMode] = useState<boolean>(!hasRealData);
  const [conversations, setConversations] = useState<ConversationItem[]>(
    hasRealData ? initialConversations : DEMO_CONVERSATIONS
  );
  const [selectedId, setSelectedId] = useState<string>(
    hasRealData ? initialConversations[0]?.id : DEMO_CONVERSATIONS[0].id
  );
  const [filter, setFilter] = useState<"ALL" | "ATTENTION" | "WHATSAPP">("ALL");
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === selectedId) || conversations[0];

  // Auto-scroll al fondo al cambiar de conversación o recibir nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages?.length, selectedId]);

  // Polling en tiempo real cada 3 segundos si estamos en Modo Real (Supabase / WhatsApp Cloud API)
  useEffect(() => {
    if (useDemoMode || !isLiveSyncing) return;

    let isMounted = true;
    const fetchLatest = async () => {
      try {
        const res = await fetch("/api/conversations");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.conversations && Array.isArray(data.conversations)) {
            setConversations((prev) => {
              // Si no había selección previa o la conversación se mantiene, preservar ID
              return data.conversations;
            });
            setLastSync(new Date());
          }
        }
      } catch (err) {
        // Tolerancia a micro-interrupciones de red
      }
    };

    const interval = setInterval(fetchLatest, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [useDemoMode, isLiveSyncing]);

  const handleToggleDemoMode = async (enabled: boolean) => {
    setUseDemoMode(enabled);
    if (enabled) {
      setConversations(DEMO_CONVERSATIONS);
      setSelectedId(DEMO_CONVERSATIONS[0].id);
    } else {
      try {
        const res = await fetch("/api/conversations");
        if (res.ok) {
          const data = await res.json();
          if (data.conversations && data.conversations.length > 0) {
            setConversations(data.conversations);
            setSelectedId(data.conversations[0]?.id || "");
            return;
          }
        }
      } catch {}
      setConversations(initialConversations);
      setSelectedId(initialConversations[0]?.id || "");
    }
  };

  // Filtrado de conversaciones
  const filtered = conversations.filter((c) => {
    const isTakeover = (c.status || "").toLowerCase().includes("takeover");
    if (filter === "ATTENTION" && !isTakeover) return false;
    if (filter === "WHATSAPP" && (c.channel || "").toLowerCase() !== "whatsapp") return false;

    if (search) {
      const q = search.toLowerCase();
      const person = c.customer || c.contact;
      const name = person?.name?.toLowerCase() || "";
      const phone = person?.phone || "";
      return name.includes(q) || phone.includes(q);
    }
    return true;
  });

  const handleToggleTakeover = async () => {
    if (!activeConversation) return;
    const currentIsTakeover = (activeConversation.status || "").toLowerCase().includes("takeover");
    const nextStatus = currentIsTakeover ? "AI_ACTIVE" : "HUMAN_TAKEOVER";
    const nextStatusUi = currentIsTakeover ? "ai_active" : "human_takeover";

    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, status: nextStatusUi } : c))
    );

    if (!activeConversation.isDemo) {
      try {
        await fetch("/api/conversations/toggle-takeover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: activeConversation.id, status: nextStatus }),
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSendHumanReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConversation || isSending) return;

    setIsSending(true);
    setSendError(null);

    const textToSend = replyText.trim();
    const tempId = `temp-${Date.now()}`;

    const newMsg: MessageItem = {
      id: tempId,
      sender: "OPERATOR",
      content: textToSend,
      createdAt: new Date().toISOString(),
      type: "text",
      deliveryStatus: "SENT",
      isDemo: activeConversation.isDemo,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              status: "human_takeover",
              messages: [...c.messages, newMsg],
              lastMessageAt: new Date().toISOString(),
            }
          : c
      )
    );

    setReplyText("");

    if (!activeConversation.isDemo) {
      try {
        const res = await fetch("/api/conversations/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeConversation.id,
            recipientPhone: (activeConversation.customer || activeConversation.contact)?.phone,
            content: textToSend,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          setSendError(data.error || "No se pudo entregar a WhatsApp.");
        } else if (data.warning) {
          setSendError(data.warning);
        } else if (data.message) {
          // Reemplazar mensaje temporal con el real de BD
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversation.id
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === tempId ? { ...m, ...data.message, deliveryStatus: "SENT" } : m
                    ),
                  }
                : c
            )
          );
        }
      } catch (e: any) {
        setSendError(e.message || "Error al conectar con el servidor.");
      } finally {
        setIsSending(false);
      }
    } else {
      setIsSending(false);
    }
  };

  const toggleTools = (msgId: string) => {
    setExpandedTools((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  function renderDeliveryTicks(status?: string) {
    const s = (status || "").toUpperCase();
    if (s === "READ") {
      return (
        <span
          title="Doble check azul: Leído en WhatsApp"
          className="text-sky-500 font-bold text-[11px] tracking-tight inline-flex items-center ml-0.5"
        >
          ✓✓
        </span>
      );
    }
    if (s === "DELIVERED") {
      return (
        <span
          title="Doble check gris: Entregado al teléfono"
          className="text-slate-400 font-bold text-[11px] tracking-tight inline-flex items-center ml-0.5"
        >
          ✓✓
        </span>
      );
    }
    if (s === "SENT") {
      return (
        <span
          title="Check simple: Enviado a WhatsApp Cloud API"
          className="text-slate-400 font-semibold text-[11px] inline-flex items-center ml-0.5"
        >
          ✓
        </span>
      );
    }
    if (s === "FAILED") {
      return (
        <span
          title="Error en entrega de WhatsApp"
          className="text-rose-500 font-bold text-[11px] inline-flex items-center ml-0.5"
        >
          ⚠️
        </span>
      );
    }
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Barra de Modo de Demostración & Sincronización en Vivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#EAECF0] text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {useDemoMode ? (
            <span className="font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              [DEMO] Vista Previa de Atención IA en Ivirgarzama
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>WhatsApp Cloud API En Vivo</span>
              </span>
              <span className="text-[11px] text-[#667085] hidden md:inline">
                Sincronizado a las {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          )}
          <span className="text-[#667085] hidden lg:inline">
            {useDemoMode
              ? "Simulador visual de flujos de comida, carreras y audios en Ivirgarzama."
              : `${conversations.length} conversaciones activas en Supabase.`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleDemoMode(!useDemoMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border text-xs transition-colors bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>{useDemoMode ? "Cambiar a datos reales de BD" : "Ver conversaciones [DEMO]"}</span>
          </button>
        </div>
      </div>

      {/* Contenedor del Chat en Vivo estilo WhatsApp Web */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-[720px] bg-white rounded-3xl border border-[#EAECF0] shadow-sm overflow-hidden">
        {/* Columna Izquierda: Lista de Conversaciones */}
        <div className="lg:col-span-4 border-r border-[#EAECF0] flex flex-col h-full bg-[#FAFAFA]">
          {/* Buscador y Filtros */}
          <div className="p-3.5 border-b border-[#EAECF0] space-y-2.5 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente de Ivirgarzama o teléfono..."
                className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl pl-9 pr-3 py-2 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-1.5 text-xs">
              {[
                { id: "ALL", label: "Todas" },
                { id: "ATTENTION", label: "Pausadas / Humano" },
                { id: "WHATSAPP", label: "WhatsApp" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    filter === tab.id
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-[#D0D5DD] text-[#475467] hover:bg-[#F2F4F7]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Chats */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#EAECF0]">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#667085] space-y-2">
                <Bot className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">No hay conversaciones registradas</p>
                <p className="text-[11px] text-slate-400">
                  {useDemoMode
                    ? "No se encontraron coincidencias en el simulador."
                    : "Los mensajes entrantes de WhatsApp Cloud API aparecerán aquí en vivo."}
                </p>
              </div>
            ) : (
              filtered.map((c) => {
                const isSelected = c.id === activeConversation?.id;
                const lastMsg = c.messages?.[c.messages.length - 1];
                const isTakeover = (c.status || "").toLowerCase().includes("takeover");

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`p-3.5 cursor-pointer transition-colors flex items-start gap-3 ${
                      isSelected
                        ? "bg-emerald-50/70 border-l-4 border-l-emerald-600"
                        : "hover:bg-[#F2F4F7]"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isTakeover
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {(c.customer || c.contact)?.name?.[0] || "C"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-xs text-[#101828] truncate">
                          {(c.customer || c.contact)?.name || "Cliente WhatsApp"}
                        </p>
                        <span className="text-[10px] text-[#98A2B3]">
                          {c.lastMessageAt
                            ? new Date(c.lastMessageAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded font-bold border border-emerald-200">
                          WhatsApp
                        </span>
                        <span className="text-[11px] text-[#667085] truncate">
                          {(c.customer || c.contact)?.phone}
                        </span>
                      </div>

                      <p className="text-xs text-[#475467] truncate mt-1">
                        {lastMsg?.type === "audio" || lastMsg?.mediaType === "audio"
                          ? "🎤 Audio / Nota de voz"
                          : lastMsg?.type === "location" || lastMsg?.mediaType === "location"
                          ? "📍 Ubicación compartida"
                          : lastMsg?.type === "image" || lastMsg?.mediaType === "image"
                          ? "📷 Foto recibida"
                          : lastMsg?.type === "document" || lastMsg?.mediaType === "document"
                          ? "📄 Documento recibido"
                          : lastMsg?.content || "Sin mensajes"}
                      </p>

                      {isTakeover ? (
                        <span className="inline-block mt-1 text-[9px] bg-amber-50 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
                          ⚠️ Operador al mando (IA en pausa)
                        </span>
                      ) : (
                        <span className="inline-block mt-1 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                          🤖 IA Activa respondiendo
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Hilo de Conversación */}
        {activeConversation ? (
          <div className="lg:col-span-8 flex flex-col h-full bg-[#F0F2F5]">
            {/* Header de la Conversación */}
            <div className="p-3.5 border-b border-[#EAECF0] flex items-center justify-between bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {(activeConversation.customer || activeConversation.contact)?.name?.[0] || "C"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-[#101828] truncate">
                      {(activeConversation.customer || activeConversation.contact)?.name || "Cliente WhatsApp"}
                    </h4>
                    {activeConversation.isDemo && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
                        [DEMO]
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#667085]">
                    <span>{(activeConversation.customer || activeConversation.contact)?.phone}</span>
                    {activeConversation.customer?.zone && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-emerald-800">
                          Zona: {activeConversation.customer.zone}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Botón de Takeover Humano (Pausa de IA) */}
              <button
                onClick={handleToggleTakeover}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  (activeConversation.status || "").toLowerCase().includes("takeover")
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                }`}
              >
                {(activeConversation.status || "").toLowerCase().includes("takeover") ? (
                  <>
                    <Bot className="w-3.5 h-3.5" />
                    <span>Reanudar Asistente IA</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-amber-800" />
                    <span>Pausar IA & Tomar Control</span>
                  </>
                )}
              </button>
            </div>

            {/* Hilo de Mensajes */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
              {activeConversation.messages.map((m) => {
                const senderLower = (m.sender || "").toLowerCase();
                const isCustomer = senderLower === "customer";
                const isHuman = senderLower === "human" || senderLower === "operator";
                const isAssistant = !isCustomer && !isHuman;

                let tools: any[] = [];
                try {
                  if (m.toolCallsJson) tools = JSON.parse(m.toolCallsJson);
                } catch (e) {}

                return (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 max-w-[85%] ${
                      isCustomer ? "mr-auto" : "ml-auto flex-row-reverse"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-bold ${
                        isCustomer
                          ? "bg-slate-700 text-white"
                          : isHuman
                          ? "bg-amber-600 text-white"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {isCustomer ? "CLI" : isHuman ? "OPER" : "IA"}
                    </div>

                    <div className="space-y-1 max-w-full">
                      {/* Burbuja Principal */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          isCustomer
                            ? "bg-white text-slate-900 border border-slate-200 rounded-tl-none"
                            : isHuman
                            ? "bg-amber-100 text-amber-950 border border-amber-300 rounded-tr-none font-medium"
                            : "bg-[#DCF8C6] text-slate-900 border border-emerald-200 rounded-tr-none whitespace-pre-wrap"
                        }`}
                      >
                        {/* Mensaje de tipo Audio */}
                        {(m.type === "audio" || m.mediaType === "audio") && (
                          <div className="space-y-2 mb-1.5">
                            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200">
                              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              </div>
                              <div className="flex-1">
                                <div className="h-1 bg-slate-300 rounded-full w-full">
                                  <div className="h-1 bg-emerald-600 rounded-full w-1/3"></div>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-slate-600">
                                {m.audioDuration || "0:08"}
                              </span>
                            </div>
                            {m.audioTranscript && (
                              <div className="bg-white/90 p-2 rounded-lg border border-slate-200 text-[11px] text-slate-700">
                                <span className="font-bold text-[10px] text-emerald-800 uppercase tracking-wide block">
                                  Transcripción Whisper (Groq):
                                </span>
                                &ldquo;{m.audioTranscript}&rdquo;
                              </div>
                            )}
                          </div>
                        )}

                        {/* Mensaje de tipo Ubicación */}
                        {(m.type === "location" || m.mediaType === "location") && (
                          <div className="space-y-1 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 mb-1">
                            <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{m.locationData?.address || m.content}</span>
                            </div>
                            {m.locationData?.zone && (
                              <p className="text-[11px] text-emerald-700">
                                Zona detectada en Supabase: <strong>{m.locationData.zone}</strong>
                              </p>
                            )}
                          </div>
                        )}

                        {/* Mensaje de tipo Documento */}
                        {(m.type === "document" || m.mediaType === "document") && (
                          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200 mb-1">
                            <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span className="text-xs font-semibold text-slate-800">{m.content}</span>
                          </div>
                        )}

                        {/* Contenido en Texto */}
                        {m.type !== "audio" && m.mediaType !== "audio" && m.content}
                      </div>

                      {/* Herramientas de IA utilizadas */}
                      {isAssistant && tools.length > 0 && (
                        <div>
                          <button
                            onClick={() => toggleTools(m.id)}
                            className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition-colors"
                          >
                            <Cpu className="w-3 h-3 text-emerald-600" />
                            <span>Herramientas Supabase ({tools.length})</span>
                            {expandedTools[m.id] ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>

                          {expandedTools[m.id] && (
                            <div className="mt-1 p-2.5 bg-white border border-[#EAECF0] rounded-xl space-y-1.5 text-[10px] shadow-xs">
                              {tools.map((t, idx) => (
                                <div key={idx} className="border-b border-slate-100 pb-1.5 last:border-none last:pb-0">
                                  <span className="font-mono font-bold text-emerald-700">
                                    {t.tool}()
                                  </span>
                                  <pre className="bg-slate-50 p-1 rounded text-[9px] text-slate-700 font-mono mt-0.5 overflow-x-auto">
                                    {JSON.stringify(t.args, null, 2)}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className={`text-[9px] text-[#98A2B3] flex items-center gap-1 ${
                          isCustomer ? "justify-start" : "justify-end"
                        }`}
                      >
                        <span>
                          {isCustomer
                            ? "Cliente WhatsApp"
                            : isHuman
                            ? "Operador TropiGO"
                            : "TropiBot IA"}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {!isCustomer && renderDeliveryTicks(m.deliveryStatus)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de Respuesta de Operador Humano */}
            <div className="p-3.5 border-t border-[#EAECF0] bg-white">
              {sendError && (
                <div className="mb-2.5 bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl text-xs flex items-center justify-between">
                  <span>⚠️ {sendError}</span>
                  <button
                    onClick={() => setSendError(null)}
                    className="text-rose-500 hover:text-rose-700 font-bold ml-2 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              {!(activeConversation.status || "").toLowerCase().includes("takeover") ? (
                <div className="bg-[#F8F9FA] p-2.5 rounded-xl border border-[#EAECF0] flex items-center justify-between text-xs text-[#667085]">
                  <span className="flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-emerald-600" />
                    El agente de IA está atendiendo automáticamente por WhatsApp.
                  </span>
                  <button
                    onClick={handleToggleTakeover}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Tomar el control para responder
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendHumanReply} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escribe como operador de despacho... (se enviará a WhatsApp)"
                    className="flex-1 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-4 py-2.5 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSending}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#D0D5DD] text-white p-2.5 rounded-xl transition-colors shrink-0 shadow-xs flex items-center gap-1.5 text-xs font-bold"
                  >
                    {isSending ? (
                      <span className="animate-spin text-xs">⏳</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Enviar</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 flex items-center justify-center text-xs text-[#667085]">
            Selecciona una conversación para abrir el chat
          </div>
        )}
      </div>
    </div>
  );
}
