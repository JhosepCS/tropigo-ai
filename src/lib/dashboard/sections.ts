import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bike,
  BookOpen,
  BrainCircuit,
  Compass,
  FlaskConical,
  Gift,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Plug,
  Radio,
  Settings2,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Users,
} from "lucide-react";

export type CrmSectionBadge = "orders" | "conversations";

export interface CrmSection {
  href: string;
  name: string;
  title: string;
  description: string;
  steps: string[];
  tip: string;
  icon: LucideIcon;
  group: string;
  badge?: CrmSectionBadge;
}

export const CRM_GROUPS = [
  "Operación diaria",
  "Negocio y logística",
  "IA y canales",
  "Sistema y ayuda",
] as const;

export const CRM_SECTIONS: CrmSection[] = [
  {
    href: "/dashboard",
    name: "Panel Principal",
    title: "Panel Principal",
    description:
      "Tu centro de mando: pedidos, conversaciones, clientes y estado de las conexiones en una sola vista.",
    steps: [
      "Revisa las tarjetas KPI para detectar pedidos pendientes y volumen del día.",
      "Usa los accesos rápidos para entrar a Conversaciones, Pedidos o AI Studio.",
      "Confirma que WhatsApp, la base de datos y los modelos de IA estén activos.",
    ],
    tip: "Empieza y termina el día aquí: es la foto más rápida de la operación.",
    icon: LayoutDashboard,
    group: "Operación diaria",
  },
  {
    href: "/dashboard/conversaciones",
    name: "Conversaciones",
    title: "Bandeja de Conversaciones",
    description:
      "Todos los chats de WhatsApp y web en una bandeja. TropiBot responde solo y tú puedes intervenir cuando haga falta.",
    steps: [
      "Filtra por estado o busca por cliente para encontrar el chat correcto.",
      "Activa el Takeover humano para responder personalmente.",
      "Devuelve la conversación a TropiBot cuando termines la atención manual.",
    ],
    tip: "Los audios se transcriben automáticamente; revisa el contexto antes de responder.",
    icon: MessageSquare,
    group: "Operación diaria",
    badge: "conversations",
  },
  {
    href: "/dashboard/pedidos",
    name: "Pedidos",
    title: "Pedidos WhatsApp",
    description:
      "Ciclo completo del pedido: recibido, preparación, recojo, en camino y entregado, con montos en bolivianos.",
    steps: [
      "Atiende primero los pedidos en estado RECIBIDO.",
      "Avanza el estado a medida que cocina y reparto confirman.",
      "Asigna un repartidor y verifica el pago antes de cerrar la entrega.",
    ],
    tip: "Un pedido ENTREGADO suma un sello de fidelidad automáticamente.",
    icon: ShoppingBag,
    group: "Operación diaria",
    badge: "orders",
  },
  {
    href: "/dashboard/clientes",
    name: "Clientes & Memoria",
    title: "Clientes y Memoria",
    description:
      "Ficha 360 de cada cliente: historial de pedidos, dirección guardada, preferencias y notas que la IA recuerda.",
    steps: [
      "Busca por nombre o teléfono para abrir la ficha completa.",
      "Revisa la memoria y las conversaciones recientes antes de contactar.",
      "Gestiona el opt-out si el cliente pide no recibir mensajes.",
    ],
    tip: "La IA usa esta memoria para no volver a preguntar dirección o preferencias.",
    icon: Users,
    group: "Operación diaria",
  },
  {
    href: "/dashboard/fidelidad",
    name: "Fidelidad & Sellos",
    title: "Fidelidad y Sellos",
    description:
      "Tarjetas de fidelidad con QR personal, sellos por pedido o carrera, niveles y canje de premios.",
    steps: [
      "Busca al cliente por nombre, teléfono o código TGO-XXXXXXXX.",
      "Agrega sellos o canjea un premio cuando corresponda.",
      "Comparte el QR personal para que el cliente consulte su tarjeta.",
    ],
    tip: "Con 10 sellos configurados, el pedido número 10 es gratis.",
    icon: Gift,
    group: "Operación diaria",
  },
  {
    href: "/dashboard/comercios",
    name: "Comercios",
    title: "Comercios",
    description:
      "Alta y administración de restaurantes, tiendas y socios: datos, categorías, horarios y sucursales.",
    steps: [
      "Crea el comercio con nombre, teléfono, dirección y categoría.",
      "Configura horarios de atención y sucursales si tiene varios puntos.",
      "Activa o pausa el comercio según su disponibilidad real.",
    ],
    tip: "Un comercio pausado deja de aparecer en las recomendaciones de la IA.",
    icon: Store,
    group: "Negocio y logística",
  },
  {
    href: "/dashboard/catalogo",
    name: "Catálogo & Menús",
    title: "Catálogo y Promociones",
    description:
      "Productos, precios, fotos, disponibilidad y promociones por horario que la IA ofrece a los clientes.",
    steps: [
      "Agrega productos con precio, categoría y foto.",
      "Marca como agotado lo que no esté disponible hoy.",
      "Programa promociones con día y hora para que la IA las anuncie.",
    ],
    tip: "Precios y disponibilidad desactualizados generan pedidos que no se pueden cumplir.",
    icon: UtensilsCrossed,
    group: "Negocio y logística",
  },
  {
    href: "/dashboard/zonas",
    name: "Zonas & Tarifas",
    title: "Zonas y Tarifas",
    description:
      "Cobertura de delivery y mototaxi, tarifa base por zona y recargo por kilómetro desde la Plaza Principal.",
    steps: [
      "Revisa la tarifa base de cada zona y el tiempo estimado.",
      "Ajusta los kilómetros incluidos y el costo por km adicional.",
      "Verifica que el centro de cálculo sea la Plaza Principal de Ivirgarzama.",
    ],
    tip: "Si una zona no aparece, revisa que esté activa y con coordenadas válidas.",
    icon: MapPin,
    group: "Negocio y logística",
  },
  {
    href: "/dashboard/movilidad",
    name: "Movilidad",
    title: "Movilidad y Mototaxi",
    description:
      "Carreras solicitadas por WhatsApp o web, asignación de conductores y cierre de viajes.",
    steps: [
      "Monitorea las solicitudes nuevas y su origen/destino.",
      "Asigna el conductor disponible más adecuado.",
      "Marca la carrera como finalizada para sellar fidelidad si está activo.",
    ],
    tip: "La tarifa mínima de mototaxi se configura en Ajustes y Zonas.",
    icon: Bike,
    group: "Negocio y logística",
  },
  {
    href: "/dashboard/repartidores",
    name: "Repartidores",
    title: "Repartidores y Flota",
    description:
      "Equipo de reparto: alta, disponibilidad, vehículo, placa y QR personal de cobro.",
    steps: [
      "Da de alta al repartidor con teléfono y vehículo.",
      "Activa su disponibilidad para recibir asignaciones.",
      "Carga su QR de cobro para mostrarlo en la página de pago del pedido.",
    ],
    tip: "La asignación automática elige al repartidor activo con menos entregas.",
    icon: Bike,
    group: "Negocio y logística",
  },
  {
    href: "/dashboard/ia",
    name: "AI Studio",
    title: "AI Studio",
    description:
      "Personalidad de TropiBot, horarios, mensaje fuera de turno, respuestas rápidas, modelos y métricas de tokens.",
    steps: [
      "Ajusta nombre, tono, bienvenida e instrucciones del asistente.",
      "Configura horarios y el mensaje que se envía fuera de turno.",
      "Revisa consumo de tokens, latencia y errores por modelo.",
    ],
    tip: "Los cambios se aplican a los mensajes nuevos; prueba el resultado en el Simulador.",
    icon: BrainCircuit,
    group: "IA y canales",
  },
  {
    href: "/dashboard/conocimiento",
    name: "Conocimiento",
    title: "Base de Conocimiento",
    description:
      "Información oficial que usa la IA: servicios, tarifas, políticas, preguntas frecuentes y texto libre.",
    steps: [
      "Actualiza servicios y precios cuando cambie el negocio.",
      "Agrega preguntas frecuentes con respuestas claras.",
      "Guarda los cambios y pruébalos en el Simulador.",
    ],
    tip: "Mientras más precisa sea esta base, menos inventará la IA.",
    icon: BookOpen,
    group: "IA y canales",
  },
  {
    href: "/dashboard/canales",
    name: "Canales",
    title: "Canales de Comunicación",
    description:
      "Conexión oficial de WhatsApp Cloud API de Meta y personalización del chat web de TropiGO.",
    steps: [
      "Carga Phone Number ID, WABA ID, token y App Secret de Meta.",
      "Verifica el webhook y el estado de la conexión.",
      "Personaliza el color y mensaje de bienvenida del chat web.",
    ],
    tip: "El webhook debe apuntar a /api/channels/whatsapp/webhook.",
    icon: Radio,
    group: "IA y canales",
  },
  {
    href: "/dashboard/integraciones",
    name: "Integraciones",
    title: "Integraciones",
    description:
      "Conecta Google Calendar, Gmail, Sheets, Slack, Stripe y webhooks para ampliar lo que puede hacer el asistente.",
    steps: [
      "Conecta la cuenta del servicio que quieras usar.",
      "Activa la integración y revisa sus permisos.",
      "Haz una prueba desde el Simulador o el flujo real.",
    ],
    tip: "Las integraciones fallidas quedan registradas en Actividad.",
    icon: Plug,
    group: "IA y canales",
  },
  {
    href: "/dashboard/ajustes",
    name: "Ajustes",
    title: "Ajustes Generales",
    description:
      "Datos del negocio, métodos de pago, tarifas, usuarios, seguridad y conexiones del sistema.",
    steps: [
      "Revisa nombre, teléfono, dirección y horarios del negocio.",
      "Configura métodos de pago y datos de cobro.",
      "Gestiona usuarios y cambia contraseñas cuando sea necesario.",
    ],
    tip: "Los cambios de tarifas afectan cotizaciones nuevas, no pedidos ya creados.",
    icon: Settings2,
    group: "Sistema y ayuda",
  },
  {
    href: "/dashboard/actividad",
    name: "Actividad",
    title: "Registro de Actividad",
    description:
      "Auditoría de acciones del sistema y de la IA: herramientas ejecutadas, citas, consultas y errores.",
    steps: [
      "Filtra por fecha o tipo de evento.",
      "Revisa los errores para detectar integraciones caídas.",
      "Usa el historial para explicar qué pasó en una conversación.",
    ],
    tip: "Es el primer lugar para investigar un comportamiento extraño del asistente.",
    icon: Activity,
    group: "Sistema y ayuda",
  },
  {
    href: "/dashboard/probar",
    name: "Simulador",
    title: "Simulador de TropiBot",
    description:
      "Prueba conversaciones como si fueras un cliente, sin usar WhatsApp, y observa qué herramientas ejecuta la IA.",
    steps: [
      "Escribe un pedido, una consulta de tarifa o una carrera.",
      "Observa las herramientas y datos que usa el asistente.",
      "Ajusta el prompt o la base de conocimiento y vuelve a probar.",
    ],
    tip: "Prueba siempre los cambios de AI Studio aquí antes de publicarlos.",
    icon: FlaskConical,
    group: "Sistema y ayuda",
  },
  {
    href: "/dashboard/guia",
    name: "Guía del CRM",
    title: "Guía del CRM",
    description:
      "Manual completo: flujo diario, mapa de módulos, glosario y buenas prácticas de operación.",
    steps: [
      "Lee el flujo diario recomendado.",
      "Explora la explicación de cada módulo.",
      "Consulta el glosario cuando aparezca un término nuevo.",
    ],
    tip: "Puedes volver a esta guía desde el botón Guía del menú superior.",
    icon: Compass,
    group: "Sistema y ayuda",
  },
];

export function getSectionByPath(pathname: string): CrmSection | undefined {
  if (pathname === "/dashboard") {
    return CRM_SECTIONS.find((section) => section.href === "/dashboard");
  }
  return CRM_SECTIONS.find(
    (section) => section.href !== "/dashboard" && pathname.startsWith(section.href)
  );
}

export function getSectionsByGroup(group: string): CrmSection[] {
  return CRM_SECTIONS.filter((section) => section.group === group);
}
