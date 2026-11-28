"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Bot,
  UserCheck,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Cpu,
  MapPin,
  Image as ImageIcon,
  Play,
  RotateCcw,
  FileText,
  MessageSquare,
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
  /** Historial completo. Solo viene en la carga inicial (SSR). */
  messages?: MessageItem[];
  /** Último mensaje, para la vista previa de la lista. */
  lastMessage?: {
    sender: string;
    content: string;
    mediaType?: string;
    createdAt: string;
  } | null;
  messageCount?: number;
  isDemo?: boolean;
}

interface ConversacionesClientProps {
  initialConversations: any[];
}

/**
 * Zona horaria fija: evita que el HTML del servidor y el del navegador
 * muestren horas distintas (eso rompía la hidratación de React).
 */
const BOLIVIA_TIME_ZONE = "America/La_Paz";

const clockFormatter = new Intl.DateTimeFormat("es-BO", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: BOLIVIA_TIME_ZONE,
});

function formatClock(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return clockFormatter.format(date);
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
  // ---------------------------------------------------------------------
  // Normalización de datos iniciales (SSR) para pintar el panel al instante
  // sin esperar la primera petición al API.
  // ---------------------------------------------------------------------
  const normalizedInitial = (initialConversations || []).map(normalizeConversation);

  const [useDemoMode, setUseDemoMode] = useState<boolean>(false);
  const [conversations, setConversations] =
    useState<ConversationItem[]>(normalizedInitial);
  const [selectedId, setSelectedId] = useState<string>(
    normalizedInitial[0]?.id || ""
  );
  const [messagesByConv, setMessagesByConv] = useState<
    Record<string, MessageItem[]>
  >(() => buildInitialMessages(initialConversations));
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [workerOnline, setWorkerOnline] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "ATTENTION" | "CLOSED">(
    "ALL"
  );
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ConversationItem[] | null>(
    null
  );
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>(
    {}
  );
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isTriggeringAi, setIsTriggeringAi] = useState(false);
  const [keepAiActive, setKeepAiActive] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [loadedChats, setLoadedChats] = useState<Record<string, boolean>>({});

  const scrollRef = useRef<HTMLDivElement>(null);

  const quickActions = [
    {
      label: "🍔 Menú y Precios",
      text: "🍔 Menú de hoy: Broaster 18 Bs, Hamburguesa 25 Bs, Silpancho 20 Bs, Pique macho 45 Bs. ¿Cuál quieres?",
    },
    {
      label: "🛒 TropiGO Market",
      text: "🛒 TropiGO Market: abarrotes, bebidas, lácteos y carnes frescas. Catálogo: https://tropigo-ai.vercel.app/pedir",
    },
    {
      label: "🛵 Pedir TropiTaxi (10 Bs.)",
      text: "🛵 TropiTaxi: Moto 10 Bs · Torito 15 Bs. ¿Desde dónde y hacia dónde vas?",
    },
    {
      label: "📍 Pedir Ubicación GPS",
      text: "📍 Abre el clip 📎 o el (+), elige Ubicación y toca Enviar mi ubicación actual. Así te encontramos rápido.",
    },
    {
      label: "💳 QR de Pago",
      text: "💳 Puedes pagar en efectivo contra entrega o por QR Simple. ¿Cuál prefieres?",
    },
    {
      label: "📦 Rastrear Pedido",
      text: "📦 Sigue tu pedido en vivo con tu código en: https://tropigo-ai.vercel.app/seguimiento",
    },
  ];

  const activeConversation =
    conversations.find((c) => c.id === selectedId) || conversations[0];
  const activeMessages = activeConversation
    ? messagesByConv[activeConversation.id] || []
    : [];

  const visibleConversations = search.trim()
    ? searchResults || []
    : conversations;

  // ---------------------------------------------------------------------
  // Marca de montaje: evita diferencias entre el HTML del servidor y el
  // navegador al mostrar horas (causaban el error de hidratación de React).
  // ---------------------------------------------------------------------
  useEffect(() => {
    setMounted(true);
  }, []);

  // ---------------------------------------------------------------------
  // Lista de chats (ligera): solo metadatos y último mensaje.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (useDemoMode) return;

    let alive = true;
    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/conversations/list?take=50", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`El servidor respondió ${res.status}`);
        const data = await res.json();
        if (!alive) return;

        const list: ConversationItem[] = (data.conversations || []).map(
          normalizeConversation
        );
        setConversations(list);
        setHasMore(Boolean(data.hasMore));
        setNextCursor(data.nextCursor || null);
        setListError(null);
        setLastSync(new Date());
        setSelectedId((prev) => prev || list[0]?.id || "");
      } catch (error: any) {
        if (alive) setListError(error?.message || "Error de conexión");
      }
    };

    load();
    const interval = window.setInterval(load, 4000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [useDemoMode]);

  // ---------------------------------------------------------------------
  // Mensajes del chat seleccionado (solo ese chat).
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (useDemoMode || !selectedId) return;

    let alive = true;
    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch(
          `/api/conversations/${selectedId}/messages?take=100`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`El servidor respondió ${res.status}`);
        const data = await res.json();
        if (!alive) return;

        setMessagesByConv((prev) => ({
          ...prev,
          [selectedId]: data.messages || [],
        }));
        setLoadedChats((prev) => ({ ...prev, [selectedId]: true }));
        setMessagesError(null);
      } catch (error: any) {
        if (alive) setMessagesError(error?.message || "Error de conexión");
      }
    };

    load();
    const interval = window.setInterval(load, 3000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [selectedId, useDemoMode]);

  // ---------------------------------------------------------------------
  // Búsqueda en el servidor (con retardo para no saturar).
  // ---------------------------------------------------------------------
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }

    let alive = true;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/conversations/list?take=50&q=${encodeURIComponent(q)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (alive) {
          setSearchResults(
            (data.conversations || []).map(normalizeConversation)
          );
        }
      } catch {
        if (alive) setSearchResults([]);
      }
    }, 250);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [search]);

  // ---------------------------------------------------------------------
  // Estado real del worker de WhatsApp (Baileys) para el banner del CRM.
  // ---------------------------------------------------------------------
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/channels/whatsapp/worker-status", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setWorkerOnline(Boolean(data.connected));
      } catch {
        if (alive) setWorkerOnline(false);
      }
    };

    load();
    const interval = window.setInterval(load, 15000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, []);

  // Auto-scroll solo si el operador está mirando el final del chat.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (stickToBottom) el.scrollTop = el.scrollHeight;
  }, [activeMessages.length, selectedId, stickToBottom]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickToBottom(distance < 90);
  };

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setMobileChatOpen(true);
    setStickToBottom(true);
    setMessagesError(null);
  };

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore || useDemoMode) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/conversations/list?take=50&cursor=${encodeURIComponent(nextCursor)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      const extra: ConversationItem[] = (data.conversations || []).map(
        normalizeConversation
      );
      setConversations((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...extra.filter((c) => !seen.has(c.id))];
      });
      setHasMore(Boolean(data.hasMore));
      setNextCursor(data.nextCursor || null);
    } catch (error: any) {
      setListError(error?.message || "No se pudieron cargar más chats");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleToggleDemoMode = (enabled: boolean) => {
    setUseDemoMode(enabled);
    setMobileChatOpen(false);
    setSendError(null);

    if (enabled) {
      const demo = DEMO_CONVERSATIONS.map(normalizeConversation);
      setConversations(demo);
      setMessagesByConv(buildInitialMessages(DEMO_CONVERSATIONS));
      setLoadedChats(
        Object.fromEntries(demo.map((d) => [d.id, true])) as Record<string, boolean>
      );
      setSelectedId(demo[0]?.id || "");
      setHasMore(false);
      setNextCursor(null);
    } else {
      const real = (initialConversations || []).map(normalizeConversation);
      setConversations(real);
      setMessagesByConv(buildInitialMessages(initialConversations));
      setLoadedChats({});
      setSelectedId(real[0]?.id || "");
    }
  };

  // Filtros por estado (se aplican sobre la lista ya cargada).
  const filtered = visibleConversations.filter((c) => {
    const status = (c.status || "").toLowerCase();
    const isTakeover = status.includes("takeover");
    const isClosed = status.includes("closed") || status.includes("cerrad");

    if (filter === "ATTENTION" && !isTakeover) return false;
    if (filter === "ACTIVE" && (isTakeover || isClosed)) return false;
    if (filter === "CLOSED" && !isClosed) return false;
    return true;
  });

  const counts = visibleConversations.reduce(
    (acc, c) => {
      const status = (c.status || "").toLowerCase();
      if (status.includes("takeover")) acc.attention += 1;
      else if (status.includes("closed") || status.includes("cerrad"))
        acc.closed += 1;
      else acc.active += 1;
      return acc;
    },
    { active: 0, attention: 0, closed: 0 }
  );

  const handleToggleTakeover = async () => {
    if (!activeConversation) return;
    const currentIsTakeover = (activeConversation.status || "")
      .toLowerCase()
      .includes("takeover");
    const nextStatus = currentIsTakeover ? "AI_ACTIVE" : "HUMAN_TAKEOVER";
    const nextStatusUi = currentIsTakeover ? "ai_active" : "human_takeover";

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id ? { ...c, status: nextStatusUi } : c
      )
    );

    if (!activeConversation.isDemo) {
      try {
        await fetch("/api/conversations/toggle-takeover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeConversation.id,
            status: nextStatus,
          }),
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const appendMessage = (conversationId: string, message: MessageItem) => {
    setMessagesByConv((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), message],
    }));
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessageAt: message.createdAt,
              lastMessage: {
                sender: message.sender,
                content: message.content,
                mediaType: message.mediaType || message.type || "text",
                createdAt: message.createdAt,
              },
            }
          : c
      )
    );
  };

  const replaceMessage = (
    conversationId: string,
    tempId: string,
    message: MessageItem
  ) => {
    setMessagesByConv((prev) => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map((m) =>
        m.id === tempId ? { ...m, ...message } : m
      ),
    }));
  };

  const sendOperatorMessage = async (rawText: string) => {
    const textToSend = rawText.trim();
    if (!textToSend || !activeConversation || isSending) return;

    setIsSending(true);
    setSendError(null);

    const conversationId = activeConversation.id;
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

    const targetStatus = keepAiActive ? "ai_active" : "human_takeover";
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, status: targetStatus } : c
      )
    );
    appendMessage(conversationId, newMsg);

    if (activeConversation.isDemo) {
      setIsSending(false);
      return;
    }

    try {
      const res = await fetch("/api/conversations/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          recipientPhone: (activeConversation.customer || activeConversation.contact)
            ?.phone,
          content: textToSend,
          keepAiActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setSendError(data.error || "No se pudo entregar a WhatsApp.");
      } else if (data.warning) {
        setSendError(data.warning);
      } else if (data.message) {
        replaceMessage(conversationId, tempId, {
          ...data.message,
          deliveryStatus: "SENT",
        });
      }
    } catch (e: any) {
      setSendError(e.message || "Error al conectar con el servidor.");
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickSend = async (text: string) => {
    await sendOperatorMessage(text);
  };

  const handleTriggerAi = async () => {
    if (!activeConversation || isTriggeringAi) return;
    const conversationId = activeConversation.id;
    setIsTriggeringAi(true);
    setSendError(null);
    try {
      const res = await fetch("/api/conversations/trigger-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, status: "ai_active" } : c
          )
        );
        appendMessage(conversationId, data.message);
        if (data.warning) setSendError(data.warning);
      } else if (data.error) {
        setSendError(data.error);
      }
    } catch (err: any) {
      setSendError(err.message || "Error al forzar respuesta de IA");
    } finally {
      setIsTriggeringAi(false);
    }
  };

  const handleSendHumanReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    const text = replyText;
    setReplyText("");
    await sendOperatorMessage(text);
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
          title="Check simple: Enviado a WhatsApp"
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

  const statusLower = (activeConversation?.status || "").toLowerCase();
  const isTakeover = statusLower.includes("takeover");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* =============================================================== */}
      {/* BARRA COMPACTA: estado del asistente y acciones del operador     */}
      {/* =============================================================== */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-600/30 bg-gradient-to-r from-emerald-950 via-[#074423] to-[#0D7B46] px-3 py-2.5 text-white shadow-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10">
            <Bot className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-black tracking-tight">TropiBot</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  workerOnline === false
                    ? "border-amber-400/40 bg-amber-400/20 text-amber-200"
                    : "border-emerald-400/40 bg-emerald-400/20 text-emerald-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    workerOnline === false
                      ? "bg-amber-400"
                      : "bg-emerald-400 animate-pulse"
                  }`}
                />
                {workerOnline === null
                  ? "Verificando…"
                  : workerOnline
                  ? "WhatsApp conectado"
                  : "Worker apagado"}
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                {useDemoMode ? "Modo demo" : `${conversations.length} chats`}
              </span>
              {!useDemoMode && (
                <span className="hidden text-[10px] text-emerald-200/80 sm:inline">
                  {mounted && lastSync
                    ? `Actualizado ${formatClock(lastSync.toISOString())}`
                    : "Sincronizando…"}
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-emerald-100/90">
              {workerOnline === false
                ? "⚠️ Enciende el worker para recibir y enviar mensajes."
                : isTakeover
                ? "🟠 Control humano: si no respondes en 17 s, TropiBot retoma."
                : "🟢 TropiBot respondiendo. Elige un chat para intervenir."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {activeConversation && (
            <button
              onClick={handleToggleTakeover}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black shadow-sm transition active:scale-95 ${
                isTakeover
                  ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  : "bg-amber-400 text-slate-950 hover:bg-amber-300"
              }`}
              title="Cambiar entre IA y operador para el chat seleccionado"
            >
              {isTakeover ? (
                <>
                  <Bot className="h-3.5 w-3.5" />
                  <span>Reanudar IA</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Tomar control</span>
                </>
              )}
            </button>
          )}

          {activeConversation && (
            <button
              onClick={handleTriggerAi}
              disabled={isTriggeringAi}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-[11px] font-black text-[#074423] shadow-sm transition hover:bg-emerald-50 active:scale-95 disabled:opacity-50"
              title="Pedir a TropiBot que responda ahora mismo"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>{isTriggeringAi ? "Generando…" : "Forzar IA"}</span>
            </button>
          )}

          <button
            onClick={() => handleToggleDemoMode(!useDemoMode)}
            className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-white/20"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{useDemoMode ? "Datos reales" : "Demo"}</span>
          </button>
        </div>
      </div>

      {/* =============================================================== */}
      {/* PANEL PRINCIPAL: lista de chats + conversación                   */}
      {/* =============================================================== */}
      <div
        className="grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#EAECF0] bg-white shadow-sm lg:grid-cols-[minmax(250px,320px)_minmax(0,1fr)]"
      >
        {/* ---------------- Lista de conversaciones ---------------- */}
        <aside
          className={`min-h-0 flex-col border-r border-[#EAECF0] bg-[#FAFAFA] ${
            mobileChatOpen ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="shrink-0 space-y-2 border-b border-[#EAECF0] bg-white p-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#98A2B3]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, teléfono o mensaje…"
                className="w-full rounded-xl border border-[#D0D5DD] bg-[#F9FAFB] py-2 pl-8 pr-8 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1.5 rounded-lg px-1.5 py-0.5 text-xs font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {[
                { id: "ALL", label: `Todas (${visibleConversations.length})` },
                { id: "ACTIVE", label: `IA (${counts.active})` },
                { id: "ATTENTION", label: `Humano (${counts.attention})` },
                { id: "CLOSED", label: `Cerradas (${counts.closed})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id as any)}
                  className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold transition-colors ${
                    filter === tab.id
                      ? "bg-slate-900 text-white"
                      : "border border-[#D0D5DD] bg-white text-[#475467] hover:bg-[#F2F4F7]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {listError && (
            <div className="shrink-0 border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-semibold text-rose-700">
              ⚠️ {listError}. Reintentando…
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[#EAECF0]">
            {filtered.length === 0 ? (
              <div className="space-y-2 p-8 text-center text-xs text-[#667085]">
                <Bot className="mx-auto h-8 w-8 text-slate-300" />
                <p className="font-semibold text-slate-700">
                  {search.trim()
                    ? "Sin resultados"
                    : "No hay conversaciones en este filtro"}
                </p>
                <p className="text-[11px] text-slate-400">
                  {search.trim()
                    ? "Prueba con otro nombre o número."
                    : "Escribe al +591 57770679 y el chat aparecerá en segundos."}
                </p>
              </div>
            ) : (
              filtered.map((c) => {
                const isSelected = c.id === activeConversation?.id;
                const cStatus = (c.status || "").toLowerCase();
                const cTakeover = cStatus.includes("takeover");
                const cClosed = cStatus.includes("closed") || cStatus.includes("cerrad");
                const last = c.lastMessage;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectConversation(c.id)}
                    className={`flex w-full items-start gap-2.5 p-2.5 text-left transition-colors ${
                      isSelected
                        ? "border-l-4 border-l-emerald-600 bg-emerald-50/70"
                        : "border-l-4 border-l-transparent hover:bg-[#F2F4F7]"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold ${
                        cTakeover
                          ? "border-amber-300 bg-amber-100 text-amber-800"
                          : "border-emerald-200 bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {(c.customer || c.contact)?.name?.[0] || "C"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-xs font-bold text-[#101828]">
                          {(c.customer || c.contact)?.name || "Cliente WhatsApp"}
                        </p>
                        <span className="shrink-0 text-[10px] text-[#98A2B3]">
                          {formatClock(c.lastMessageAt)}
                        </span>
                      </div>

                      <p className="truncate text-[10px] text-[#667085]">
                        {(c.customer || c.contact)?.phone}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-[#475467]">
                        {lastPreview(last)}
                      </p>

                      <div className="mt-1 flex items-center gap-1">
                        {cClosed ? (
                          <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                            📁 Cerrado
                          </span>
                        ) : cTakeover ? (
                          <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                            ⚠️ Humano
                          </span>
                        ) : (
                          <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                            🤖 IA
                          </span>
                        )}
                        {typeof c.messageCount === "number" && (
                          <span className="text-[9px] text-[#98A2B3]">
                            {c.messageCount} msj
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {hasMore && !search.trim() && !useDemoMode && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="shrink-0 border-t border-[#EAECF0] bg-white py-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              {loadingMore ? "Cargando…" : "Cargar chats anteriores"}
            </button>
          )}
        </aside>

        {/* ---------------- Conversación abierta ---------------- */}
        {activeConversation ? (
          <section
            className={`min-h-0 flex-col bg-[#F0F2F5] ${
              mobileChatOpen ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Encabezado del chat */}
            <div className="shrink-0 border-b border-[#EAECF0] bg-white px-3 py-2">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setMobileChatOpen(false)}
                  className="-ml-1 rounded-xl p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
                  title="Volver a la lista"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white">
                  {(activeConversation.customer || activeConversation.contact)
                    ?.name?.[0] || "C"}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-xs font-bold text-[#101828] sm:text-sm">
                      {(activeConversation.customer || activeConversation.contact)
                        ?.name || "Cliente WhatsApp"}
                    </h4>
                    {activeConversation.isDemo && (
                      <span className="rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                        [DEMO]
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        isTakeover
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isTakeover ? "Humano" : "IA activa"}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-[#667085]">
                    <span className="font-mono">
                      {(activeConversation.customer || activeConversation.contact)
                        ?.phone}
                    </span>
                    {activeConversation.customer?.zone && (
                      <>
                        {" "}
                        • <span className="font-semibold text-emerald-800">
                          {activeConversation.customer.zone}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <button
                  onClick={handleToggleTakeover}
                  className={`hidden shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-bold transition sm:flex sm:items-center sm:gap-1.5 ${
                    isTakeover
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  {isTakeover ? (
                    <>
                      <Bot className="h-3.5 w-3.5" />
                      Reanudar IA
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3.5 w-3.5" />
                      Tomar control
                    </>
                  )}
                </button>
              </div>
            </div>

            {messagesError && (
              <div className="shrink-0 border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-semibold text-rose-700">
                ⚠️ No se pudo actualizar el chat ({messagesError}). Reintentando…
              </div>
            )}

            {/* Hilo de mensajes */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4"
            >
              {activeMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-[#667085]">
                  <MessageSquare className="h-8 w-8 text-slate-300" />
                  <p>
                    {loadedChats[activeConversation.id]
                      ? "Este chat todavía no tiene mensajes."
                      : "Cargando mensajes…"}
                  </p>
                </div>
              ) : (
                activeMessages.map((m) => {
                  const senderLower = (m.sender || "").toLowerCase();
                  const isCustomer = senderLower === "customer";
                  const isHuman =
                    senderLower === "human" || senderLower === "operator";
                  const isAssistant = !isCustomer && !isHuman;

                  let tools: any[] = [];
                  try {
                    if (m.toolCallsJson) tools = JSON.parse(m.toolCallsJson);
                  } catch (e) {}

                  return (
                    <div
                      key={m.id}
                      className={`flex max-w-[88%] gap-2 ${
                        isCustomer ? "mr-auto" : "ml-auto flex-row-reverse"
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold ${
                          isCustomer
                            ? "bg-slate-700 text-white"
                            : isHuman
                            ? "bg-amber-600 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {isCustomer ? "CLI" : isHuman ? "OPER" : "IA"}
                      </div>

                      <div className="max-w-full space-y-1">
                        <div
                          className={`whitespace-pre-wrap break-words rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                            isCustomer
                              ? "rounded-tl-none border border-slate-200 bg-white text-slate-900"
                              : isHuman
                              ? "rounded-tr-none border border-amber-300 bg-amber-100 font-medium text-amber-950"
                              : "rounded-tr-none border border-emerald-200 bg-[#DCF8C6] text-slate-900"
                          }`}
                        >
                          {(m.type === "audio" || m.mediaType === "audio") && (
                            <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 p-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                                <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                              </div>
                              <div className="flex-1">
                                <div className="h-1 w-full rounded-full bg-slate-300">
                                  <div className="h-1 w-1/3 rounded-full bg-emerald-600" />
                                </div>
                              </div>
                              <span className="font-mono text-[10px] font-bold text-slate-600">
                                {m.audioDuration || "0:08"}
                              </span>
                            </div>
                          )}

                          {(m.type === "location" ||
                            m.mediaType === "location") && (
                            <div className="mb-1 space-y-1 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                                <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
                                <span>
                                  {m.locationData?.address || m.content}
                                </span>
                              </div>
                            </div>
                          )}

                          {(m.type === "image" || m.mediaType === "image") && (
                            <div className="mb-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 p-2">
                              <ImageIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                              <span className="text-[11px] font-semibold text-slate-700">
                                Foto recibida
                              </span>
                            </div>
                          )}

                          {(m.type === "document" ||
                            m.mediaType === "document") && (
                            <div className="mb-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 p-2">
                              <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
                              <span className="text-[11px] font-semibold text-slate-800">
                                Documento
                              </span>
                            </div>
                          )}

                          {m.type !== "audio" && m.mediaType !== "audio" && m.content}
                        </div>

                        {isAssistant && tools.length > 0 && (
                          <div>
                            <button
                              onClick={() => toggleTools(m.id)}
                              className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 transition-colors hover:bg-emerald-100"
                            >
                              <Cpu className="h-3 w-3 text-emerald-600" />
                              <span>Herramientas ({tools.length})</span>
                              {expandedTools[m.id] ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>

                            {expandedTools[m.id] && (
                              <div className="mt-1 space-y-1.5 rounded-xl border border-[#EAECF0] bg-white p-2.5 text-[10px] shadow-xs">
                                {tools.map((t, idx) => (
                                  <div
                                    key={idx}
                                    className="border-b border-slate-100 pb-1.5 last:border-none last:pb-0"
                                  >
                                    <span className="font-mono font-bold text-emerald-700">
                                      {t.tool}()
                                    </span>
                                    <pre className="mt-0.5 overflow-x-auto rounded bg-slate-50 p-1 font-mono text-[9px] text-slate-700">
                                      {JSON.stringify(t.args, null, 2)}
                                    </pre>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div
                          className={`flex items-center gap-1 text-[9px] text-[#98A2B3] ${
                            isCustomer ? "justify-start" : "justify-end"
                          }`}
                        >
                          <span>
                            {isCustomer
                              ? "Cliente"
                              : isHuman
                              ? "Operador"
                              : "TropiBot"}
                          </span>
                          <span>•</span>
                          <span>{formatClock(m.createdAt)}</span>
                          {!isCustomer && renderDeliveryTicks(m.deliveryStatus)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Redacción y envío */}
            <div className="shrink-0 space-y-2 border-t border-[#EAECF0] bg-white p-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <span className="mr-1 flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <Sparkles className="h-3 w-3 text-[#0D7B46]" />
                  Rápidos
                </span>
                {quickActions.map((qa, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickSend(qa.text)}
                    disabled={isSending}
                    title="Enviar este mensaje ahora por WhatsApp"
                    className="shrink-0 rounded-lg border border-slate-200 bg-[#F4EEF2] px-2 py-1 text-[11px] font-bold text-[#1F0E1C] shadow-2xs transition-colors hover:bg-[#E6F4D7] hover:text-[#074423] disabled:opacity-50"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>

              {sendError && (
                <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                  <span className="min-w-0 truncate">⚠️ {sendError}</span>
                  <button
                    onClick={() => setSendError(null)}
                    className="ml-2 font-bold text-rose-500 hover:text-rose-700"
                  >
                    ✕
                  </button>
                </div>
              )}

              <form onSubmit={handleSendHumanReply} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escribe un mensaje para el cliente…"
                    className="min-w-0 flex-1 rounded-xl border border-[#D0D5DD] bg-[#F9FAFB] px-3 py-2 text-xs text-[#101828] shadow-inner focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSending}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 disabled:bg-[#D0D5DD]"
                  >
                    {isSending ? (
                      <span className="animate-spin text-xs">⏳</span>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">Enviar</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 text-[10px] text-[#475467]">
                  <label className="flex cursor-pointer select-none items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={keepAiActive}
                      onChange={(e) => setKeepAiActive(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-medium">
                      Mantener la IA activa después de enviar
                    </span>
                  </label>
                  <span className="hidden text-slate-400 sm:inline">
                    WhatsApp +591 57770679
                  </span>
                </div>
              </form>
            </div>
          </section>
        ) : (
          <section className="hidden min-h-0 items-center justify-center bg-[#F0F2F5] text-xs text-[#667085] lg:flex">
            Selecciona una conversación para abrir el chat
          </section>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// Utilidades de normalización y formato
// =====================================================================

function normalizeConversation(raw: any): ConversationItem {
  const messages: MessageItem[] = Array.isArray(raw?.messages)
    ? raw.messages
    : [];
  const last = raw?.lastMessage || messages[messages.length - 1] || null;

  return {
    id: raw.id,
    status: raw.status,
    channel: raw.channel || "WHATSAPP",
    lastMessageAt: raw.lastMessageAt,
    customer: raw.customer || undefined,
    contact: raw.contact || undefined,
    isDemo: raw.isDemo,
    messageCount: raw.messageCount ?? messages.length,
    lastMessage: last
      ? {
          sender: last.sender,
          content: last.content,
          mediaType: last.mediaType || last.type || "text",
          createdAt: last.createdAt,
        }
      : null,
  };
}

function buildInitialMessages(rawList: any[]): Record<string, MessageItem[]> {
  const map: Record<string, MessageItem[]> = {};
  for (const raw of rawList || []) {
    if (Array.isArray(raw?.messages)) map[raw.id] = raw.messages;
  }
  return map;
}

function lastPreview(last?: ConversationItem["lastMessage"]): string {
  if (!last) return "Sin mensajes";
  const type = last.mediaType || "text";
  if (type === "audio") return "🎤 Nota de voz";
  if (type === "image") return "📷 Foto";
  if (type === "location") return "📍 Ubicación";
  if (type === "document") return "📄 Documento";
  const prefix =
    last.sender === "CUSTOMER"
      ? ""
      : last.sender === "OPERATOR"
      ? "Tú: "
      : "IA: ";
  return `${prefix}${(last.content || "").replace(/\s+/g, " ").trim()}`;
}
