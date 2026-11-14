# Mejoras del asistente TropiGO AI — Guía validada para OpenCode

> **Validada contra:** commit `b343a80` (noviembre 2026), producción
> `https://tropigo-ai.vercel.app`. Si el repositorio avanzó, revisa primero
> `prisma/schema.prisma` y el webhook antes de aplicar los fragmentos.

> **Para quién es este documento:** para un agente (OpenCode, Cursor, Claude Code)
> o para un desarrollador que continúe el proyecto. Se validó **contra el código
> real** del repositorio, no contra supuestos. Si algo de este documento no
> coincide con el código al momento de implementar, **detente y repórtalo**; no
> inventes campos ni métodos.

> **Regla de oro:** este documento tiene dos fases.
> - **Fase A:** se implementa **ahora**, sin credenciales nuevas de Meta.
> - **Fase B:** requiere el panel de Meta Business, plantillas aprobadas y el
>   número real. Se hace en la otra laptop (Ivirgarzama).
>
> Cuando aparece "Fase C" se refiere a trabajo fuera de este alcance (aplicar
> descuentos al total, encuestas diferidas, etc.); no lo implementes sin una
> decisión explícita del negocio.

> **Prioridad del negocio:** delivery de comida primero; mototaxi y mandados
> después. Todo el texto visible va en español.

---

## 0. Resumen ejecutivo

| # | Mejora | Fase | Estado real en el código | Qué falta realmente |
|---|--------|------|--------------------------|---------------------|
| 1 | Botones interactivos | **A** | Adaptador Meta ya envía botones y listas; el webhook **ignora** `interactiveResponseId` | Mapa de IDs → texto, menús, botones de confirmación/pago |
| 2 | Catálogo visual | **A** | `sendImage`, `Product.imageUrl`, `ProductImage` existen | Helper de envío + herramienta que devuelva imágenes |
| 3 | Encuesta post-entrega | **A** | Notificación `ENTREGADO` existe | Tabla `OrderRating`, envío de encuesta, handler de respuesta |
| 4 | Plantillas de Meta | **B** | No existe `sendTemplate` | Método en el adaptador + plantillas aprobadas + ventana 24 h |
| 5 | Horario inteligente | **A** | Columnas `operatingHours` y `offHoursPolicy` existen pero **nunca se leen ni se guardan** | Persistencia primero, luego lógica y UI |
| 6 | Historial y recomendaciones | **A** | Memoria de cliente ya existe | Herramienta de pedidos anteriores + política de prompt |
| 7 | Promociones por día/hora | **A** | `Promotion` existe pero **no se usa en ninguna parte** | Campos de horario, lector, tool, contexto y UI |
| 8 | Panel de métricas | **A** | `ActivityLog` registra `TOOL_*`; `CompletionResult.latencyMs` existe | Columna `Message.latencyMs`, servicio, API y página |
| 9 | Notificaciones proactivas | **B** | Solo existen avisos de estado dentro de la ventana de 24 h | Plantillas + cron + opt-in + límite de frecuencia |

**Datos duros del proyecto (no cambiar):**
- Producción: `https://tropigo-ai.vercel.app`
- Repo: `https://github.com/JhosepCS/tropigo-ai`
- IA activa en BD: `GEMINI` / `gemini-3.1-flash-lite`
- Groq free: 8 000 TPM; el router cae a Gemini solo. No agregues herramientas
  pesadas al prompt sin medir tokens.

---

## 1. Correcciones a la guía original (leer antes de codificar)

La guía que se pegó tenía errores que **romperían la compilación** o la lógica.
Esta tabla es la fuente de verdad:

| La guía decía | El código real dice | Corrección obligatoria |
|---|---|---|
| `merchant.isActive` | `Merchant.isOpen` | Usar `isOpen` |
| `product.isActive` | `Product.isAvailable` | Usar `isAvailable` |
| `item.merchant.name` | `OrderItem` **no** tiene relación `merchant` | Usar `order.merchant?.name` |
| `Message.role` | `Message.sender` (`CUSTOMER`, `ASSISTANT`, `OPERATOR`, `SYSTEM`) | Usar `sender` |
| `Message.latencyMs` ya existe | **No existe** | Agregar columna nullable (migración aditiva) |
| `config.operatingHours` ya tiene los horarios | La columna existe, pero `getAssistantConfig`/`saveAssistantConfig` la ignoran. `operatingHoursJson` guarda **otra cosa** (description, políticas, modelos) | Persistir `operatingHours` y `offHoursPolicy` antes de usarlos |
| `offHoursPolicy` ya está configurado | Nunca se guarda ni se lee | Incluirlo en `AssistantIdentityConfig` |
| Encuesta con 3 botones (5 estrellas) | Meta permite **máx. 3 botones** por mensaje | Usar **lista interactiva** con 5 filas |
| `setTimeout(..., 5000)` en Vercel | Serverless no garantiza timers tras la respuesta | Enviar la encuesta **inmediatamente** tras el mensaje de entregado, o con cron |
| `sendInteractiveList` con 10 ítems por sección | Meta permite **10 filas en total** (no por sección) | Limitar el total a 10 |
| Títulos de botón largos | Meta corta a **20 caracteres** (el adaptador hace `slice(0, 20)`) | Títulos ≤ 20 caracteres, sin truncar |
| `recharts` "ya disponible" | **No está instalado** | Tablas/CSS simple, o `npm install recharts` como paso explícito |
| `groupBy({ by: ["createdAt"] })` para agrupar por día | No agrupa por día | Bucket en JS (o SQL con `date_trunc`) |
| `/dashboard/comportamiento` tiene la UI de horarios | Esa página **redirige** a `/dashboard/ia`; su client es código muerto | Mover los controles a IA Studio |
| Promociones se aplican solas al total | `Promotion` no se usa en `order-service` | Fase A: **solo informar**. Aplicar descuentos es Fase C |
| `checkOperatingHours` con `getTimezoneOffset()` | En Vercel el server corre en UTC; esa resta da mal la hora | Usar `Intl.DateTimeFormat` con `America/La_Paz` |
| `Product.images[0]` | Existe, pero también `Product.imageUrl` | Usar `images[0]?.imageUrl ?? product.imageUrl` |
| Imágenes en base64 | Meta exige **URL HTTPS pública** | Validar `https://` y omitir las demás |

**Otras trampas verificadas:**
- `MetaCloudApiAdapter.parseWebhookMessages` ya rellena `interactiveResponseId` y
  pone el **título** del botón en `text`. Por eso "✅ Sí, confirmo" funciona hoy
  para confirmar, pero los IDs de menú (`menu_delivery`) llegan como texto
  inútil ("Pedir comida") y la IA no sabe qué hacer.
- `isSafeExplicitConfirmation` exige ≤ 8 palabras, sin números y sin palabras
  como "cambiar", "pero", "agregar", "pago", "qr", "zona". Los textos canónicos
  de los botones deben respetar eso.
- Para confirmar un pedido, el webhook exige **tres** cosas: `safeConfirmation`,
  una cotización `PENDIENTE` vigente, que el resumen se haya mostrado y que el
  **último mensaje del asistente contenga "confirm"**. Si agregas un mensaje de
  botones después del resumen, ese mensaje debe contener "¿Confirmas…?" y
  guardarse en `Message`, o la confirmación se bloqueará.
- `getRealDataContextPrompt()` se ejecuta en **cada** mensaje de WhatsApp. Cada
  consulta extra que agregues se paga en latencia y tokens.
- `Promotion` no tiene UI ni API. Si quieres administrarla, hay que crearla.

---

## 2. Fase A — implementable ahora

### A0. Preparación segura (hacer primero)

```bash
git checkout -b feat/mejoras-asistente-fase-a
npx tsc --noEmit          # debe pasar antes de tocar nada
```

**Reglas inquebrantables:**

1. **NUNCA** `npx prisma migrate reset`.
2. **NUNCA** `npm run db:seed` contra Supabase.
3. Migraciones **solo aditivas**: columnas nullable o con `@default`, tablas
   nuevas, índices nuevos. Nada de borrar/renombrar columnas.
4. Crear la migración con `--create-only`, revisar el SQL y aplicarla con
   `migrate deploy`.
5. No commitear `.env` ni credenciales.

Si `prisma migrate dev --create-only` detecta *drift* y ofrece resetear:
**cancela** y usa el plan B del apartado A0.1.

#### A0.1 Plan B para migraciones (si hay drift)

```powershell
# Genera el SQL sin tocar la base:
npx prisma migrate diff `
  --from-url "$env:DATABASE_URL" `
  --to-schema-datamodel prisma/schema.prisma `
  --script > prisma/migrations/20261113000000_mejoras_asistente/migration.sql
```

Crea la carpeta con su `migration.sql`, revisa que solo tenga `CREATE TABLE`,
`ALTER TABLE ... ADD COLUMN` y `CREATE INDEX`, y aplica:

```bash
npx prisma migrate deploy
npx prisma generate
```

> Vercel **no** ejecuta migraciones en el build (`prisma generate && next build`).
> Aplica las migraciones desde tu laptop **antes** de hacer push/deploy.

#### A0.2 Migraciones de la Fase A (tres, separadas)

1. `add_order_rating`
2. `add_promotion_schedule`
3. `add_message_latency`

Al final del documento está el SQL esperado de cada una.

---

### A1. Horario inteligente con respuesta fuera de horario

**Problema real:** las columnas `AssistantConfig.operatingHours` y
`offHoursPolicy` existen, pero el código nunca las lee ni las escribe. La UI que
las editaba vive en `/dashboard/comportamiento`, que redirige a `/dashboard/ia`.
Sin persistencia, cualquier lógica de horario sería decorativa.

#### A1.1 Extender la configuración (`src/lib/ai/config-manager.ts`)

Agregar a `AssistantIdentityConfig`:

```ts
export type WeekdayKey =
  | "domingo" | "lunes" | "martes" | "miercoles"
  | "jueves" | "viernes" | "sabado";

export interface DaySchedule {
  open: string;   // "08:00"
  close: string;  // "23:00"
  closed?: boolean;
}

export type OperatingHours = Partial<Record<WeekdayKey, DaySchedule | null>>;
export type OffHoursPolicy = "TAKE_MESSAGE" | "CONTINUE_AND_BOOK";

export interface AssistantIdentityConfig {
  // ...campos existentes...
  operatingHours?: OperatingHours;
  offHoursPolicy?: OffHoursPolicy;
}
```

En `DEFAULT_ASSISTANT_CONFIG`:

```ts
operatingHours: {},              // vacío = 24/7 (no rompe producción)
offHoursPolicy: "TAKE_MESSAGE",
```

**Importante:** `{}` debe significar **abierto siempre**. Si el valor por
defecto fuera "cerrado", el bot dejaría de responder en producción en cuanto se
despliegue.

En `getAssistantConfig()` (después de `extraData`):

```ts
let parsedHours: OperatingHours = {};
try {
  parsedHours = record.operatingHours ? JSON.parse(record.operatingHours) : {};
} catch {
  parsedHours = {};
}

// en el return:
operatingHours: parsedHours,
offHoursPolicy: (record.offHoursPolicy as OffHoursPolicy) || "TAKE_MESSAGE",
```

En `saveAssistantConfig()`, dentro de `data` (en **ambas** ramas, update y create):

```ts
operatingHours: JSON.stringify(merged.operatingHours || {}),
offHoursPolicy: merged.offHoursPolicy || "TAKE_MESSAGE",
```

> No toques `operatingHoursJson`: ese campo guarda `description`,
> `languageStyle`, `quotePolicy`, `orderPolicy`, `fallbackProviders` y
> `providerModels`. Mezclarlos rompe la configuración.

#### A1.2 Nuevo módulo `src/lib/schedule/operating-hours.ts`

```ts
import { getAssistantConfig } from "../ai/config-manager";
import type {
  DaySchedule,
  OffHoursPolicy,
  OperatingHours,
  WeekdayKey,
} from "../ai/config-manager";

const WEEKDAYS: WeekdayKey[] = [
  "domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado",
];

const EN_TO_KEY: Record<string, WeekdayKey> = {
  Sunday: "domingo", Monday: "lunes", Tuesday: "martes", Wednesday: "miercoles",
  Thursday: "jueves", Friday: "viernes", Saturday: "sabado",
};

export interface BoliviaClock {
  day: WeekdayKey;
  time: string;    // "14:35"
  minutes: number; // 875
}

/** Hora real de Bolivia (America/La_Paz), sin depender del TZ del servidor. */
export function getBoliviaClock(date = new Date()): BoliviaClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/La_Paz",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const day = EN_TO_KEY[get("weekday")] || "lunes";
  const hour = get("hour") === "24" ? "00" : get("hour").padStart(2, "0");
  const minute = get("minute").padStart(2, "0");

  return {
    day,
    time: `${hour}:${minute}`,
    minutes: Number(hour) * 60 + Number(minute),
  };
}

function toMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Normaliza el JSON guardado y descarta días inválidos. */
export function parseOperatingHours(raw: unknown): OperatingHours {
  if (!raw || typeof raw !== "object") return {};
  const result: OperatingHours = {};

  for (const day of WEEKDAYS) {
    const value = (raw as Record<string, unknown>)[day];
    if (!value || typeof value !== "object") continue;
    const schedule = value as Partial<DaySchedule>;
    if (schedule.closed) {
      result[day] = { open: "00:00", close: "00:00", closed: true };
      continue;
    }
    if (isValidTime(schedule.open) && isValidTime(schedule.close)) {
      result[day] = { open: schedule.open, close: schedule.close };
    }
  }
  return result;
}

/** ¿La hora actual cae dentro del horario del día? Soporta cruce de medianoche. */
export function isWithinSchedule(nowMinutes: number, day: DaySchedule): boolean {
  if (day.closed) return false;
  const open = toMinutes(day.open);
  const close = toMinutes(day.close);
  if (open === close) return true;            // 24 horas
  if (open < close) return nowMinutes >= open && nowMinutes < close;
  return nowMinutes >= open || nowMinutes < close; // ej. 18:00 → 01:00
}

export interface ScheduleStatus {
  isOpen: boolean;
  policy: OffHoursPolicy;
  currentDay: WeekdayKey;
  currentTime: string;
  today: DaySchedule | null;
  nextOpenDay?: WeekdayKey;
  nextOpenTime?: string;
  message: string;
}

export async function checkOperatingHours(at = new Date()): Promise<ScheduleStatus> {
  const config = await getAssistantConfig();
  const hours = parseOperatingHours(config.operatingHours);
  const policy: OffHoursPolicy = config.offHoursPolicy || "TAKE_MESSAGE";
  const clock = getBoliviaClock(at);

  const configuredDays = WEEKDAYS.filter((d) => hours[d] && !hours[d]!.closed);

  // Sin horario configurado ⇒ el asistente atiende 24/7.
  if (configuredDays.length === 0) {
    return {
      isOpen: true, policy, currentDay: clock.day, currentTime: clock.time,
      today: null, message: "",
    };
  }

  const today = hours[clock.day] || null;
  if (today && isWithinSchedule(clock.minutes, today)) {
    return {
      isOpen: true, policy, currentDay: clock.day, currentTime: clock.time,
      today, message: "",
    };
  }

  // Buscar la próxima apertura: hoy más tarde o en los siguientes 7 días.
  let nextOpenDay: WeekdayKey | undefined;
  let nextOpenTime: string | undefined;

  if (today && !today.closed) {
    const openMin = toMinutes(today.open);
    const closeMin = toMinutes(today.close);
    const crossesMidnight = closeMin <= openMin;
    if (!crossesMidnight && clock.minutes < openMin) {
      nextOpenDay = clock.day;
      nextOpenTime = today.open;
    }
  }

  if (!nextOpenDay) {
    for (let i = 1; i <= 7; i++) {
      const day = WEEKDAYS[(WEEKDAYS.indexOf(clock.day) + i) % 7];
      const schedule = hours[day];
      if (schedule && !schedule.closed) {
        nextOpenDay = day;
        nextOpenTime = schedule.open;
        break;
      }
    }
  }

  const when =
    nextOpenDay === clock.day ? "hoy"
    : nextOpenDay === WEEKDAYS[(WEEKDAYS.indexOf(clock.day) + 1) % 7] ? "mañana"
    : `el ${nextOpenDay}`;

  return {
    isOpen: false,
    policy,
    currentDay: clock.day,
    currentTime: clock.time,
    today,
    nextOpenDay,
    nextOpenTime,
    message:
      `🌙 *TropiGO:* Ahora estamos fuera de horario.\n\n` +
      (nextOpenTime
        ? `⏰ Abrimos ${when} a las *${nextOpenTime}*.\n\n`
        : `⏰ Pronto confirmaremos nuestro próximo horario.\n\n`) +
      `Tu mensaje quedó guardado y te responderemos apenas abramos. ` +
      `¡Gracias por tu paciencia! 🙏`,
  };
}
```

#### A1.3 Integrar en el webhook

En `src/app/api/channels/whatsapp/webhook/route.ts`, **después** del bloque de
confirmación de pedido y **antes** de construir el prompt de IA:

```ts
import { checkOperatingHours } from "@/lib/schedule/operating-hours";

// ...después de la confirmación atómica del pedido...

const schedule = await checkOperatingHours();

if (!schedule.isOpen && schedule.policy === "TAKE_MESSAGE") {
  const offHoursWamid = await metaAdapter.sendMessage(customerPhone, schedule.message)
    .catch(() => null);

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      sender: "ASSISTANT",
      content: schedule.message,
      rawPayload: JSON.stringify({
        wamid: offHoursWamid,
        deliveryStatus: "SENT",
        direction: "outbound",
        offHours: true,
      }),
    },
  });

  await prisma.activityLog.create({
    data: {
      action: "OFF_HOURS_REPLY",
      entityName: "Conversation",
      entityId: conversation.id,
      channel: "whatsapp",
      status: "success",
      detailsJson: JSON.stringify({
        day: schedule.currentDay,
        time: schedule.currentTime,
        nextOpenDay: schedule.nextOpenDay,
        nextOpenTime: schedule.nextOpenTime,
      }),
    },
  });

  recentWamids.set(msg.id, { timestamp: Date.now(), state: "COMPLETED" });
  continue;
}
```

Si la política es `CONTINUE_AND_BOOK`, **no** bloquees: agrega un bloque al
system prompt para que la IA pueda tomar el pedido para después:

```ts
const offHoursContext =
  !schedule.isOpen && schedule.policy === "CONTINUE_AND_BOOK"
    ? `[FUERA DE HORARIO]\nAhora son las ${schedule.currentTime} del ${schedule.currentDay}. ` +
      `El local está cerrado${schedule.nextOpenTime ? ` y abre ${schedule.nextOpenDay} a las ${schedule.nextOpenTime}` : ""}. ` +
      `Puedes tomar el pedido y dejarlo agendado, pero avisa con claridad que se preparará al abrir.`
    : "";
```

Y súmalo al `buildSystemPrompt` junto a `locationContext`.

**Orden correcto dentro del bucle de mensajes:**
1. idempotencia,
2. identificación del cliente,
3. conversación + guardar mensaje entrante,
4. **encuesta** (A2),
5. **confirmación de pedido** (ya existe),
6. **horario** (A1),
7. IA,
8. respuesta + **botones** (A3) + **catálogo** (A6).

No pongas el horario antes de la confirmación: un cliente que confirma a las
23:30 debe poder cerrar su pedido.

#### A1.4 UI en IA Studio

Archivo: `src/app/dashboard/ia/ia-client.tsx`.

Agregar una tarjeta "Horario de atención" con:
- 7 filas (domingo a sábado), cada una con switch "Abierto" y dos `<input type="time">`.
- Selector de política: "Solo guardar mensaje" (`TAKE_MESSAGE`) / "Seguir tomando pedidos" (`CONTINUE_AND_BOOK`).
- Texto de ayuda: "Si no configuras ningún día, el asistente responde 24/7".

El guardado ya funciona con el `POST /api/settings/assistant-config` existente,
siempre que A1.1 esté hecho. No hace falta endpoint nuevo.

#### A1.5 Pruebas

- Sin horario configurado → responde normal.
- Día cerrado → responde el mensaje y **no** llama a la IA (verifica que no haya
  `Message` con `toolCallsJson` ni consumo de tokens).
- `CONTINUE_AND_BOOK` → la IA responde y menciona el horario.
- Cambia la hora del sistema o prueba `checkOperatingHours(new Date("..."))` con
  fechas fijas; no esperes a que sea de noche.

---

### A2. Encuesta de satisfacción post-entrega

#### A2.1 Migración `add_order_rating`

En `prisma/schema.prisma`:

```prisma
model OrderRating {
  id        String   @id @default(cuid())
  orderId   String   @unique
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  rating    Int      // 1 a 5
  comment   String?
  channel   String   @default("WHATSAPP")
  createdAt DateTime @default(now())

  @@index([rating, createdAt])
}
```

En `model Order`, agregar la relación inversa:

```prisma
rating OrderRating?
```

> `orderId` ya es `@unique`; no agregues un `@@index([orderId])` extra, es
> redundante.

#### A2.2 Nuevo módulo `src/lib/whatsapp/survey.ts`

```ts
import { prisma } from "../prisma";
import { IWhatsAppProvider } from "./types";

/** Envía la encuesta de 5 niveles como lista (Meta permite 3 botones, no 5). */
export async function sendDeliverySurvey(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });
    if (!order?.customer?.phone) return;

    // Idempotencia: si el rider marca ENTREGADO dos veces, no repetir encuesta.
    const alreadySent = await prisma.activityLog.findFirst({
      where: { action: "SURVEY_SENT", entityId: order.id },
      select: { id: true },
    });
    if (alreadySent) return;

    const { WhatsAppAdapterFactory } = await import("./adapter-factory");
    const adapter = await WhatsAppAdapterFactory.getAdapter().catch(() => null);
    if (!adapter) return;

    await adapter.sendInteractiveList(
      order.customer.phone,
      "TropiGO — Encuesta",
      `¿Cómo calificas tu pedido *${order.orderNumber}*? Tu opinión nos ayuda a mejorar.`,
      [
        {
          title: "Califica tu experiencia",
          rows: [
            { id: `rate_5_${order.id}`, title: "⭐⭐⭐⭐⭐ Excelente", description: "Todo perfecto" },
            { id: `rate_4_${order.id}`, title: "⭐⭐⭐⭐ Muy bueno", description: "Casi perfecto" },
            { id: `rate_3_${order.id}`, title: "⭐⭐⭐ Regular", description: "Pudo ser mejor" },
            { id: `rate_2_${order.id}`, title: "⭐⭐ Malo", description: "Tuve problemas" },
            { id: `rate_1_${order.id}`, title: "⭐ Muy malo", description: "Mala experiencia" },
          ],
        },
      ]
    );

    await prisma.activityLog.create({
      data: {
        action: "SURVEY_SENT",
        entityName: "Order",
        entityId: order.id,
        channel: "whatsapp",
        status: "success",
        detailsJson: JSON.stringify({ orderNumber: order.orderNumber }),
      },
    });
  } catch (error: any) {
    console.warn("[sendDeliverySurvey] No se pudo enviar la encuesta:", error?.message || error);
  }
}

/**
 * Procesa una respuesta `rate_<n>_<orderId>`.
 * Devuelve true si el mensaje fue consumido (no debe pasar a la IA).
 */
export async function handleSurveyResponse(input: {
  responseId: string;
  customerId: string;
  conversationId: string;
  phone: string;
  adapter: IWhatsAppProvider;
}): Promise<boolean> {
  if (!input.responseId.startsWith("rate_")) return false;

  const [, ratingRaw, ...rest] = input.responseId.split("_");
  const rating = Number(ratingRaw);
  const orderId = rest.join("_");

  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !orderId) {
    return false;
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId: input.customerId },
    select: { id: true, orderNumber: true, status: true },
  });

  // Solo se califica un pedido propio y ya entregado.
  if (!order || order.status !== "ENTREGADO") {
    await input.adapter.sendMessage(
      input.phone,
      "No encontramos ese pedido para calificar. Si necesitas ayuda, escribe a un operador."
    );
    return true;
  }

  await prisma.orderRating.upsert({
    where: { orderId: order.id },
    create: { orderId: order.id, rating, channel: "WHATSAPP" },
    update: { rating },
  });

  const stars = "⭐".repeat(rating);
  const reply =
    `¡Gracias por calificar tu pedido *${order.orderNumber}* con ${stars}!\n\n` +
    (rating <= 3
      ? `Lamentamos que no haya sido perfecto. Si quieres contarnos qué pasó, responde a este mensaje y un operador lo revisará. 🙏`
      : `Nos alegra que te haya gustado. ¡Te esperamos en tu próximo pedido! 🛵💨`);

  const wamid = await input.adapter.sendMessage(input.phone, reply).catch(() => null);

  await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      sender: "ASSISTANT",
      content: reply,
      rawPayload: JSON.stringify({
        wamid,
        deliveryStatus: "SENT",
        direction: "outbound",
        survey: true,
      }),
    },
  });

  await prisma.activityLog.create({
    data: {
      action: "SURVEY_RATING",
      entityName: "Order",
      entityId: order.id,
      channel: "whatsapp",
      status: "success",
      detailsJson: JSON.stringify({ rating }),
    },
  });

  return true;
}
```

#### A2.3 Disparar la encuesta al entregar

En `src/lib/whatsapp/notifications.ts`, en el `case "ENTREGADO"`, **después** del
envío del texto (no uses `setTimeout`):

```ts
case "ENTREGADO":
  messageText =
    `🎉 *TropiGO:* ¡Tu pedido *${orderNum}* fue entregado!\n\n` +
    `Muchas gracias por confiar en TropiGO. ¡Buen provecho! Recuerda que tus pedidos acumulan sellos en tu tarjeta de fidelidad. 🛵💨`;
  break;
```

Y al final de la función, junto al envío del QR del repartidor:

```ts
if (newStatus === "ENTREGADO") {
  const { sendDeliverySurvey } = await import("./survey");
  await sendDeliverySurvey(order.id);
}
```

> ¿Por qué inmediato y no a los 5 minutos? En Vercel la función puede congelarse
> al responder; un `setTimeout` no es confiable. Si más adelante quieres
> preguntar 10 minutos después, usa Vercel Cron + una columna
> `surveyScheduledAt`/`surveySentAt`. Eso es Fase C.

#### A2.4 Handler en el webhook

Dentro del bloque `try` que empieza después del guard `if (!metaAdapter)`
(aprox. línea 456), **después** de `markAsRead` y **antes** del bloque de
confirmación de pedido. No lo pongas antes del guard o TypeScript se quejará de
que `metaAdapter` puede ser `null`:

```ts
import { handleSurveyResponse } from "@/lib/whatsapp/survey";

if (msg.type === "interactive" && msg.interactiveResponseId?.startsWith("rate_")) {
  try {
    const consumed = await handleSurveyResponse({
      responseId: msg.interactiveResponseId,
      customerId: customer.id,
      conversationId: conversation.id,
      phone: customerPhone,
      adapter: metaAdapter,
    });
    if (consumed) {
      recentWamids.set(msg.id, { timestamp: Date.now(), state: "COMPLETED" });
      continue;
    }
  } catch (surveyError: any) {
    console.error("[Meta Webhook] Error al procesar encuesta:", surveyError?.message || surveyError);
  }
}
```

> El bloque de `HUMAN_TAKEOVER` (aprox. línea 439) corta antes: si un operador
> tomó la conversación, la encuesta la gestiona el operador y el bot no responde.

#### A2.5 Pruebas

- Pedido a `ENTREGADO` → llega texto + lista de 5 estrellas.
- Pulsar 5 → se guarda `OrderRating`, responde agradecimiento y **no** llama a la IA.
- Pulsar 2 → agradece y ofrece hablar con operador.
- Reintentar la misma encuesta → `upsert` actualiza, no duplica.
- Intentar calificar un pedido de otro cliente → rechazo.

---

### A3. Botones interactivos y menús

**Objetivo:** que el cliente pueda tocar opciones sin escribir, y que el servidor
entienda el ID sin depender de la IA.

#### A3.1 Nuevo módulo `src/lib/whatsapp/interactive.ts`

```ts
import { InteractiveButton } from "./types";

/**
 * Traducción determinística de IDs interactivos a texto canónico.
 * El texto debe ser compatible con isSafeExplicitConfirmation:
 * corto, sin números y sin palabras de cambio.
 */
export const INTERACTIVE_TEXT: Record<string, string> = {
  menu_delivery: "Quiero pedir comida",
  menu_mototaxi: "Quiero pedir un mototaxi",
  menu_mandado: "Quiero hacer un mandado",
  menu_catalog: "Muéstrame el menú y los precios",
  menu_hours: "¿Cuál es el horario de atención?",
  menu_loyalty: "¿Cuántos sellos tengo?",
  menu_tracking: "¿Dónde está mi pedido?",
  menu_human: "Quiero hablar con una persona",

  confirm_order_yes: "Sí, confirmo mi pedido",
  confirm_order_no: "No, quiero cambiar algo",

  pay_cash: "Pago en efectivo",
  pay_qr: "Pago con QR o billetera",
  pay_transfer: "Pago por transferencia",
};

export function interactiveIdToText(id: string): string | null {
  if (INTERACTIVE_TEXT[id]) return INTERACTIVE_TEXT[id];
  // Los IDs `merchant_<id>` se resuelven en el webhook con el nombre real
  // del comercio; este fallback solo evita perder el mensaje.
  if (id.startsWith("merchant_")) return "Quiero ver el menú de ese restaurante";
  return null;
}

export interface QuickReply {
  body: string;
  buttons: InteractiveButton[];
}

/**
 * Decide botones según el texto que ya respondió la IA.
 * No inventa conversación: solo acelera el siguiente paso.
 */
export function buildQuickReply(replyText: string): QuickReply | null {
  const text = replyText || "";
  // El saludo suele venir como "¡Hola!"; se limpia la puntuación inicial.
  const normalized = text.trim().replace(/^[¡!¿?.\s]+/, "");

  if (/resumen de tu pedido/i.test(text) || /confirmas (tu|el) pedido/i.test(text)) {
    return {
      body: "¿Confirmas tu pedido?",
      buttons: [
        { id: "confirm_order_yes", title: "Sí, confirmo" },
        { id: "confirm_order_no", title: "Cambiar algo" },
      ],
    };
  }

  if (/c[oó]mo quieres pagar|m[eé]todo de pago|pago en efectivo/i.test(text)) {
    return {
      body: "¿Cómo prefieres pagar?",
      buttons: [
        { id: "pay_cash", title: "Efectivo" },
        { id: "pay_qr", title: "QR o billetera" },
        { id: "pay_transfer", title: "Transferencia" },
      ],
    };
  }

  if (/^(hola|holi|buenas|buenos d[ií]as|buenas tardes|buenas noches)\b/i.test(normalized)) {
    return {
      body: "¿Qué necesitas hoy?",
      buttons: [
        { id: "menu_delivery", title: "Pedir comida" },
        { id: "menu_mototaxi", title: "Mototaxi" },
        { id: "menu_mandado", title: "Mandado" },
      ],
    };
  }

  return null;
}
```

> Los títulos tienen ≤ 20 caracteres a propósito. Meta trunca en 20 y el
> adaptador hace `slice(0, 20)`. No pongas emojis largos en los títulos.

#### A3.2 Traducir el ID antes de la IA

En el webhook, justo antes de `const resolved = await resolveIncomingText(...)`:

```ts
import { interactiveIdToText } from "@/lib/whatsapp/interactive";

if (msg.type === "interactive" && msg.interactiveResponseId) {
  if (msg.interactiveResponseId.startsWith("merchant_")) {
    // La lista de comercios usa IDs con el ID real. Se resuelve el nombre
    // para que la IA sepa de qué restaurante habla el cliente.
    const merchantId = msg.interactiveResponseId.slice("merchant_".length);
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { name: true, isOpen: true },
    });
    msg.text = merchant
      ? `Quiero ver el menú de ${merchant.name}${merchant.isOpen ? "" : " (está cerrado)"}`
      : "Quiero ver el menú";
  } else {
    const mapped = interactiveIdToText(msg.interactiveResponseId);
    if (mapped) msg.text = mapped;
  }
}
```

Así, "Sí, confirmo" llega como texto real y `isSafeExplicitConfirmation` sigue
autorizando el pedido en el servidor. **Nunca** confíes en el título del botón
para autorizar dinero; el ID se traduce a texto y el texto se valida con las
reglas existentes.

#### A3.3 Enviar botones después de la respuesta

Después de guardar el mensaje del asistente:

```ts
import { buildQuickReply } from "@/lib/whatsapp/interactive";

const quickReply = wantsLocation ? null : buildQuickReply(replyText);

if (quickReply) {
  const buttonWamid = await metaAdapter
    .sendInteractiveButtons(customerPhone, quickReply.body, quickReply.buttons)
    .catch(() => null);

  if (buttonWamid) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "ASSISTANT",
        content: quickReply.body,
        rawPayload: JSON.stringify({
          wamid: buttonWamid,
          deliveryStatus: "SENT",
          direction: "outbound",
          interactive: quickReply.buttons.map((b) => b.id),
        }),
      },
    });
  }
}
```

**Cuidado con la confirmación:** `buildQuickReply` devuelve
`body = "¿Confirmas tu pedido?"`, que contiene "confirm". Al guardarse como
último mensaje del asistente, `lastAssistantAskedConfirmation` sigue siendo
`true`. Si cambias ese texto, la confirmación automática se bloqueará.

#### A3.4 Menú de restaurantes (opcional, recomendado)

Cuando el cliente pulsa `menu_delivery`, en lugar de dejar que la IA improvise,
puedes enviar una lista con los comercios abiertos. Colócalo **dentro del
bloque `try`**, después de `markAsRead` y antes de la confirmación de pedido:

```ts
if (msg.interactiveResponseId === "menu_delivery") {
  const merchants = await prisma.merchant.findMany({
    where: { isOpen: true },
    select: { id: true, name: true, category: true },
    orderBy: { rating: "desc" },
    take: 8,
  });

  await metaAdapter.sendInteractiveList(
    customerPhone,
    "Restaurantes disponibles 🍽️",
    "Elige uno para ver su menú:",
    [{
      title: "Comercios en Ivirgarzama",
      rows: merchants.map((m) => ({
        id: `merchant_${m.id}`,
        title: m.name.slice(0, 24),
        description: (m.category || "").slice(0, 72),
      })),
    }]
  );

  recentWamids.set(msg.id, { timestamp: Date.now(), state: "COMPLETED" });
  continue;
}
```

Si lo implementas, guarda también el mensaje saliente en `Message` y registra
`ActivityLog` con `action: "INTERACTIVE_MENU_SENT"`. Recuerda: **máximo 10 filas
en total**, no por sección.

#### A3.5 Pruebas

- "Hola" → llegan 3 botones.
- Pulsar "Pedir comida" → la IA recibe "Quiero pedir comida" (verifícalo en
  `/dashboard/conversaciones`).
- Resumen de pedido → botones "Sí, confirmo" / "Cambiar algo".
- Pulsar "Sí, confirmo" → se crea el pedido (misma lógica de siempre).
- Pulsar "Cambiar algo" → la IA pide el cambio, no crea nada.
- Fuera de la ventana de 24 h, Meta rechazará el envío: eso es normal y se
  resuelve en Fase B con plantillas.

---

### A4. Historial y recomendaciones personalizadas

#### A4.1 Nueva herramienta `src/lib/ai/tools/recommendation-tool.ts`

```ts
import { prisma } from "../../prisma";
import { IAssistantTool } from "./types";

export const recommendationTool: IAssistantTool = {
  name: "sugerir_pedido_anterior",
  description:
    "Consulta los últimos pedidos ENTREGADOS del cliente actual y sus productos más repetidos. " +
    "Úsala cuando diga 'lo mismo de siempre', 'repetir', 'qué pedí antes' o cuando quieras " +
    "personalizar la atención de un cliente recurrente. No crea pedidos: solo sugiere.",
  parameters: { type: "object", properties: {}, required: [] },
  execute: async (_args, context) => {
    if (!context?.customerId) {
      return { error: "No se identificó al cliente actual." };
    }

    const orders = await prisma.order.findMany({
      where: { customerId: context.customerId, status: "ENTREGADO" },
      include: {
        merchant: { select: { name: true } },
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPrice: true,
            variantName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (orders.length === 0) {
      return {
        mensaje: "El cliente no tiene pedidos entregados todavía.",
        pedidosAnteriores: [],
        frecuentes: [],
      };
    }

    const counter = new Map<string, { cantidad: number; precio: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const key = item.productName;
        const prev = counter.get(key) || { cantidad: 0, precio: item.unitPrice };
        counter.set(key, {
          cantidad: prev.cantidad + item.quantity,
          precio: prev.precio,
        });
      }
    }

    const frecuentes = [...counter.entries()]
      .sort((a, b) => b[1].cantidad - a[1].cantidad)
      .slice(0, 5)
      .map(([nombre, data]) => ({
        producto: nombre,
        veces: data.cantidad,
        precioUnitario: Number(data.precio.toFixed(2)),
      }));

    return {
      mensaje: `El cliente tiene ${orders.length} pedido(s) entregado(s) reciente(s).`,
      pedidosAnteriores: orders.map((order) => ({
        numero: order.orderNumber,
        fecha: order.createdAt.toISOString().slice(0, 10),
        total: Number(order.totalAmount.toFixed(2)),
        comercio: order.merchant?.name || null,
        items: order.items.map((item) => ({
          producto: item.productName,
          cantidad: item.quantity,
          variante: item.variantName,
        })),
      })),
      frecuentes,
      sugerencia:
        frecuentes.length > 0
          ? `Puedes ofrecerle: "¿Te preparo otra vez ${frecuentes[0].producto}?" y confirmar antes de cotizar.`
          : "Ofrécele el menú del día y pídele su preferencia.",
    };
  },
};
```

> `OrderItem` **no** tiene `merchant`; el comercio vive en `Order.merchant`.
> `totalAmount` sí existe en `Order`.

#### A4.2 Registrar la herramienta

En `src/lib/ai/tools/index.ts`:

```ts
import { recommendationTool } from "./recommendation-tool";

export const TROPIGO_TOOLS: IAssistantTool[] = [
  // ...existentes...
  recommendationTool,
];
```

#### A4.3 Política en el system prompt

En `buildSystemPrompt()` (`src/lib/ai/config-manager.ts`), después de
`memoryPolicyText`:

```ts
const recommendationPolicyText =
  "• HISTORIAL Y RECOMENDACIONES:\n" +
  "  - Si el cliente es recurrente, ofrécele de forma natural su pedido habitual.\n" +
  "  - Usa 'sugerir_pedido_anterior' cuando diga 'lo mismo', 'lo de siempre', 'repetir' o pregunte qué pidió antes.\n" +
  "  - Nunca inventes pedidos, precios ni fechas: usa solo lo que devuelve la herramienta.\n" +
  "  - Antes de registrar, confirma el pedido exacto y pasa por 'preparar_resumen_pedido'.";
```

Súmalo a la lista de bloques que se concatenan al final de `buildSystemPrompt`.

#### A4.4 Pruebas

- Cliente con 2 pedidos entregados dice "lo mismo de siempre" → la IA llama a la
  herramienta y repite el pedido correcto.
- Cliente nuevo → la herramienta responde "sin pedidos" y la IA ofrece el menú.
- Verifica que la herramienta **no** cree cotizaciones ni pedidos.

---

### A5. Promociones automáticas por día/hora

> **Alcance de la Fase A:** las promociones se **informan** (contexto + tool +
> anuncio). **No** se aplican automáticamente al total, porque `Promotion` nunca
> se usó en `order-service` y un descuento mal aplicado es un problema de dinero.
> La aplicación real queda como Fase C, con validación explícita.

#### A5.1 Migración `add_promotion_schedule`

En `model Promotion`:

```prisma
  // Programación por día y hora (hora de Bolivia)
  scheduleDays    String?  // JSON: ["lunes","martes"]
  scheduleStart   String?  // "11:00"
  scheduleEnd     String?  // "14:00"
  autoAnnounce    Boolean  @default(false)
  announceMessage String?
```

#### A5.2 Nuevo módulo `src/lib/promotions/active.ts`

```ts
import { prisma } from "../prisma";
import { getBoliviaClock } from "../schedule/operating-hours";
import type { WeekdayKey } from "../ai/config-manager";

export interface ActivePromotion {
  id: string;
  code: string;
  title: string;
  merchantName: string | null;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  announceMessage: string | null;
}

function parseDays(raw: string | null): WeekdayKey[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null; // vacío = todos los días
    return parsed as WeekdayKey[];
  } catch {
    return null;
  }
}

export async function getActivePromotionsNow(at = new Date()): Promise<ActivePromotion[]> {
  const clock = getBoliviaClock(at);

  const promos = await prisma.promotion.findMany({
    where: {
      isActive: true,
      startsAt: { lte: at },
      expiresAt: { gte: at },
    },
    include: { merchant: { select: { name: true } } },
  });

  return promos
    .filter((promo) => {
      const days = parseDays(promo.scheduleDays);
      if (days && !days.includes(clock.day)) return false;

      if (promo.scheduleStart && clock.time < promo.scheduleStart) return false;
      if (promo.scheduleEnd && clock.time > promo.scheduleEnd) return false;

      return true;
    })
    .map((promo) => ({
      id: promo.id,
      code: promo.code,
      title: promo.title,
      merchantName: promo.merchant?.name || null,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minOrderAmount: promo.minOrderAmount,
      announceMessage: promo.announceMessage,
    }));
}
```

#### A5.3 Herramienta `src/lib/ai/tools/promotions-tool.ts`

```ts
import { IAssistantTool } from "./types";
import { getActivePromotionsNow } from "../../promotions/active";

export const promotionsTool: IAssistantTool = {
  name: "consultar_promociones",
  description:
    "Consulta las promociones vigentes AHORA según día y hora de Bolivia. " +
    "Úsala cuando pregunten por ofertas, descuentos, 2x1 o promociones del día. " +
    "No inventes promociones ni apliques descuentos por tu cuenta.",
  parameters: { type: "object", properties: {}, required: [] },
  execute: async () => {
    const promociones = await getActivePromotionsNow();
    return {
      mensaje:
        promociones.length > 0
          ? `Hay ${promociones.length} promoción(es) vigente(s) ahora.`
          : "No hay promociones vigentes en este momento.",
      promociones,
      nota: "El descuento se aplica cuando un operador confirma el pedido.",
    };
  },
};
```

Regístrala en `TROPIGO_TOOLS`.

#### A5.4 Contexto proactivo

En `getRealDataContextPrompt()` (`src/lib/ai/tools/index.ts`), agrega
`getActivePromotionsNow()` al `Promise.all` existente. Ojo: hoy el destructuring
es de 4 elementos (`merchants, products, zones, business`); debes pasar a 5:

```ts
const [merchants, products, zones, business, activePromos] = await Promise.all([
  // ...las 4 consultas existentes...
  getActivePromotionsNow(),
]);
```

Y construye un bloque antes del `return` (la función devuelve un template
literal, no una variable `context`):

```ts
const promotionsBlock =
  activePromos.length > 0
    ? "\n[PROMOCIONES VIGENTES AHORA]\n" +
      activePromos
        .slice(0, 5)
        .map((promo) => {
          const benefit =
            promo.discountType === "PERCENTAGE"
              ? `${promo.discountValue}% de descuento`
              : `${promo.discountValue} Bs. de descuento`;
          let line = `• ${promo.title} (código ${promo.code}): ${benefit}`;
          if (promo.merchantName) line += ` en ${promo.merchantName}`;
          if (promo.minOrderAmount > 0) line += `, mínimo ${promo.minOrderAmount} Bs.`;
          if (promo.announceMessage) line += ` — "${promo.announceMessage}"`;
          return line;
        })
        .join("\n") +
      "\nMenciónalas de forma natural cuando aporten. No prometas el descuento como aplicado: " +
      "un operador lo confirma al cerrar el pedido.\n"
    : "";
```

E interpólalo en el `return`, justo antes de `REGLA DE INTEGRIDAD ESTRICTA`:

```ts
${promotionsBlock}
REGLA DE INTEGRIDAD ESTRICTA Y PROTOCOLO DE PEDIDOS:
```

**Cuida los tokens:** este bloque va en cada mensaje. Limita a 5 promociones
(`.slice(0, 5)`) y frases cortas.

#### A5.5 UI mínima de promociones (recomendada)

Sin UI, las promociones solo se pueden crear por SQL. Crea:

- `src/app/api/admin/promotions/route.ts` → `GET` (lista), `POST` (crear).
- `src/app/api/admin/promotions/[id]/route.ts` → `PATCH`, `DELETE` (soft: `isActive=false`).
- `src/app/dashboard/promociones/page.tsx` + `promotions-client.tsx`.

Protege con `requireRole(["SUPERADMIN", "ADMIN"])`.

Campos del formulario: título, código, tipo (`FIXED_AMOUNT`/`PERCENTAGE`),
valor, mínimo, comercio (opcional), días (checkboxes), hora inicio/fin,
`autoAnnounce`, `announceMessage`, vigencia (`startsAt`/`expiresAt`).

Agrega el ítem al sidebar en el grupo "Inteligencia Artificial" o
"Negocio & Logística":

```tsx
{ name: "Promociones", href: "/dashboard/promociones", icon: Tag }
```

#### A5.6 Pruebas

- Promo sin `scheduleDays` → aparece siempre dentro de su vigencia.
- Promo solo lunes 11:00–14:00 → aparece el lunes a las 12:00 y no el martes.
- Promo vencida → no aparece.
- La IA menciona la promo pero **no** descuenta el total.
- Revisa que el bloque de contexto no supere ~5 promociones.

---

### A6. Catálogo visual con imágenes

**Requisito de Meta:** las imágenes deben ser **URLs HTTPS públicas**. No sirven
base64, `data:` ni rutas locales `/uploads/...`. Si la URL no empieza con
`https://`, se omite y se envía solo texto.

#### A6.1 Nuevo módulo `src/lib/catalog/visual.ts`

```ts
import { prisma } from "../prisma";
import { IWhatsAppProvider } from "../whatsapp/types";

export interface CatalogItem {
  nombre: string;
  precio: number;
  imagen: string | null;
  descripcion: string | null;
}

export async function buildVisualCatalog(
  merchantId: string,
  limit = 4
): Promise<CatalogItem[]> {
  const products = await prisma.product.findMany({
    where: { merchantId, isAvailable: true },
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { order: "asc" },
    take: limit,
  });

  return products.map((product) => {
    const candidate = product.images[0]?.imageUrl || product.imageUrl || null;
    return {
      nombre: product.name,
      precio: Number(product.price.toFixed(2)),
      imagen: candidate && candidate.startsWith("https://") ? candidate : null,
      descripcion: product.description,
    };
  });
}

/** Envía hasta 4 productos. Devuelve cuántas imágenes se enviaron. */
export async function sendVisualCatalog(
  adapter: IWhatsAppProvider,
  to: string,
  items: CatalogItem[]
): Promise<number> {
  let sent = 0;

  for (const item of items) {
    const caption =
      `*${item.nombre}*\n` +
      (item.descripcion ? `${item.descripcion.slice(0, 200)}\n` : "") +
      `💰 ${item.precio.toFixed(2)} Bs.`;

    try {
      if (item.imagen) {
        await adapter.sendImage(to, item.imagen, caption);
        sent++;
      } else {
        await adapter.sendMessage(to, caption);
      }
    } catch (error: any) {
      console.warn(`[sendVisualCatalog] No se pudo enviar "${item.nombre}":`, error?.message || error);
    }
  }

  return sent;
}
```

#### A6.2 Herramienta `mostrar_catalogo_visual`

```ts
// src/lib/ai/tools/catalog-visual-tool.ts
import { prisma } from "../../prisma";
import { IAssistantTool } from "./types";
import { buildVisualCatalog } from "../../catalog/visual";

export const catalogVisualTool: IAssistantTool = {
  name: "mostrar_catalogo_visual",
  description:
    "Devuelve los productos con foto y precio de un comercio para que el sistema envíe " +
    "las imágenes por WhatsApp. Úsala cuando pidan 'ver el menú', 'fotos' o 'qué tienen'. " +
    "No inventes productos ni precios.",
  parameters: {
    type: "object",
    properties: {
      comercio: {
        type: "string",
        description: "Nombre o ID del comercio cuyo menú se quiere mostrar.",
      },
    },
    required: ["comercio"],
  },
  execute: async (args, context) => {
    const comercio = String(args?.comercio || "").trim();
    if (!comercio) return { error: "Indica el comercio." };

    const merchant = await prisma.merchant.findFirst({
      where: {
        OR: [{ id: comercio }, { name: { contains: comercio, mode: "insensitive" } }],
      },
      select: { id: true, name: true, isOpen: true },
    });

    if (!merchant) return { error: `No encontré el comercio "${comercio}".` };
    if (!merchant.isOpen) {
      return { error: `${merchant.name} está cerrado en este momento.` };
    }

    const productos = await buildVisualCatalog(merchant.id);
    return {
      comercio: merchant.name,
      productos,
      mensaje:
        productos.length > 0
          ? `Enviando ${productos.length} producto(s) de ${merchant.name}.`
          : `${merchant.name} no tiene productos disponibles con foto.`,
    };
  },
};
```

> Importa `prisma` en el archivo. `mode: "insensitive"` funciona en PostgreSQL
> (Supabase); en la BD local PGlite también.

#### A6.3 Enviar las imágenes desde el webhook

Después de `runAgentChat` y de enviar el texto:

```ts
import { sendVisualCatalog } from "@/lib/catalog/visual";

const catalogCall = aiResponse.toolCalls?.find(
  (call) => call.tool === "mostrar_catalogo_visual" && call.result?.productos?.length
);

if (catalogCall) {
  const sent = await sendVisualCatalog(metaAdapter, customerPhone, catalogCall.result.productos);
  await prisma.activityLog.create({
    data: {
      action: "VISUAL_CATALOG_SENT",
      entityName: "Merchant",
      channel: "whatsapp",
      status: "success",
      detailsJson: JSON.stringify({ imagesSent: sent }),
    },
  });
}
```

#### A6.4 Pruebas

- Producto con `https://...` → llega imagen + pie con precio.
- Producto sin imagen → llega solo texto.
- URL `http://` o `data:` → se omite la imagen, no rompe el flujo.
- Comercio cerrado → la herramienta responde error y la IA ofrece alternativas.
- No envíes más de 4–5 imágenes por ráfaga.

---

### A7. Panel de métricas de la IA

**Problema real:** `Message` no tiene latencia. `CompletionResult.latencyMs` sí
existe, pero no se persiste. Además `Message.sender` es el campo correcto (no
`role`).

#### A7.1 Migración `add_message_latency`

En `model Message`:

```prisma
  latencyMs Int? // Latencia de inferencia en ms (solo mensajes ASSISTANT)
```

#### A7.2 Persistir la latencia

En `src/app/api/channels/whatsapp/webhook/route.ts`, en el `prisma.message.create`
del mensaje del asistente:

```ts
latencyMs: aiResponse.latencyMs || null,
```

En `src/app/api/webchat/chat/route.ts`, igual:

```ts
latencyMs: aiResponse.latencyMs || null,
```

#### A7.3 Servicio `src/lib/metrics/service.ts`

```ts
import { prisma } from "../prisma";

export interface AssistantMetrics {
  periodDays: number;
  totals: {
    messages: number;
    customerMessages: number;
    assistantMessages: number;
    tokens: number;
    conversations: number;
    handoffs: number;
    handoffRate: number;
    avgRating: number | null;
    ratingsCount: number;
  };
  byDay: Array<{ day: string; customer: number; assistant: number }>;
  byProvider: Array<{ providerModel: string; messages: number }>;
  latencyByProvider: Array<{ providerModel: string; avgLatencyMs: number; samples: number }>;
  topTools: Array<{ action: string; count: number }>;
  ratingDistribution: Array<{ rating: number; count: number }>;
}

const dayKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date); // YYYY-MM-DD

export async function getAssistantMetrics(periodDays = 7): Promise<AssistantMetrics> {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const [messages, conversations, handoffs, tools, ratings] = await Promise.all([
    prisma.message.findMany({
      where: { createdAt: { gte: since } },
      select: {
        createdAt: true,
        sender: true,
        providerModel: true,
        tokensUsed: true,
        latencyMs: true,
      },
    }),
    prisma.conversation.count({ where: { createdAt: { gte: since } } }),
    prisma.handoffHistory.count({ where: { createdAt: { gte: since } } }),
    prisma.activityLog.groupBy({
      by: ["action"],
      _count: { action: true },
      where: { action: { startsWith: "TOOL_" }, createdAt: { gte: since } },
      orderBy: { _count: { action: "desc" } },
      take: 10,
    }),
    prisma.orderRating.findMany({
      where: { createdAt: { gte: since } },
      select: { rating: true },
    }),
  ]);

  const customerMessages = messages.filter((m) => m.sender === "CUSTOMER").length;
  const assistantMessages = messages.filter((m) => m.sender === "ASSISTANT").length;
  const tokens = messages.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);

  // Agrupación por día en JS (Prisma no agrupa por fecha truncada).
  const dayMap = new Map<string, { customer: number; assistant: number }>();
  for (let i = periodDays - 1; i >= 0; i--) {
    const key = dayKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
    dayMap.set(key, { customer: 0, assistant: 0 });
  }
  for (const message of messages) {
    const key = dayKey(message.createdAt);
    const bucket = dayMap.get(key);
    if (!bucket) continue;
    if (message.sender === "CUSTOMER") bucket.customer++;
    if (message.sender === "ASSISTANT") bucket.assistant++;
  }

  const providerMap = new Map<string, { messages: number; latencySum: number; samples: number }>();
  for (const message of messages) {
    if (message.sender !== "ASSISTANT") continue;
    const key = message.providerModel || "desconocido";
    const entry = providerMap.get(key) || { messages: 0, latencySum: 0, samples: 0 };
    entry.messages++;
    if (message.latencyMs && message.latencyMs > 0) {
      entry.latencySum += message.latencyMs;
      entry.samples++;
    }
    providerMap.set(key, entry);
  }

  const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: ratings.filter((r) => r.rating === rating).length,
  }));
  const ratingsCount = ratings.length;
  const avgRating = ratingsCount
    ? Number((ratings.reduce((sum, r) => sum + r.rating, 0) / ratingsCount).toFixed(2))
    : null;

  return {
    periodDays,
    totals: {
      messages: messages.length,
      customerMessages,
      assistantMessages,
      tokens,
      conversations,
      handoffs,
      handoffRate: conversations > 0 ? Number(((handoffs / conversations) * 100).toFixed(1)) : 0,
      avgRating,
      ratingsCount,
    },
    byDay: [...dayMap.entries()].map(([day, counts]) => ({ day, ...counts })),
    byProvider: [...providerMap.entries()]
      .map(([providerModel, data]) => ({ providerModel, messages: data.messages }))
      .sort((a, b) => b.messages - a.messages),
    latencyByProvider: [...providerMap.entries()]
      .filter(([, data]) => data.samples > 0)
      .map(([providerModel, data]) => ({
        providerModel,
        avgLatencyMs: Math.round(data.latencySum / data.samples),
        samples: data.samples,
      })),
    topTools: tools.map((tool) => ({ action: tool.action, count: tool._count.action })),
    ratingDistribution,
  };
}
```

#### A7.4 API `src/app/api/admin/metrics/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { getAssistantMetrics } from "@/lib/metrics/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN"]);
    const days = Number(req.nextUrl.searchParams.get("days") || 7);
    const periodDays = [7, 30, 90].includes(days) ? days : 7;
    return NextResponse.json({ success: true, ...(await getAssistantMetrics(periodDays)) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "No se pudieron calcular las métricas." },
      { status: error?.statusCode || 500 }
    );
  }
}
```

#### A7.5 Página `src/app/dashboard/metricas/page.tsx`

Server component, sin librerías nuevas:

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAssistantMetrics } from "@/lib/metrics/service";

export const dynamic = "force-dynamic";

export default async function MetricasPage() {
  // El middleware ya protege /dashboard; aquí solo limitamos por rol sin
  // lanzar un error 500 a los operadores.
  const session = await getSession();
  if (!session || !["SUPERADMIN", "ADMIN"].includes(session.role)) {
    redirect("/dashboard");
  }

  const metrics = await getAssistantMetrics(7);

  const maxDay = Math.max(
    1,
    ...metrics.byDay.map((d) => d.customer + d.assistant)
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-black text-[#101828]">Métricas de la IA</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Mensajes", value: metrics.totals.messages },
          { label: "Conversaciones", value: metrics.totals.conversations },
          { label: "Transferencias", value: `${metrics.totals.handoffRate}%` },
          { label: "Calificación", value: metrics.totals.avgRating ?? "—" },
          { label: "Tokens", value: metrics.totals.tokens },
          { label: "Encuestas", value: metrics.totals.ratingsCount },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-[#EAECF0] bg-white p-4">
            <p className="text-[11px] font-semibold text-[#667085]">{card.label}</p>
            <p className="text-2xl font-black text-[#101828]">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Barras por día con CSS puro */}
      <section className="rounded-2xl border border-[#EAECF0] bg-white p-5">
        <h2 className="text-sm font-bold text-[#101828] mb-4">Mensajes por día</h2>
        <div className="flex items-end gap-2 h-40">
          {metrics.byDay.map((day) => {
            const total = day.customer + day.assistant;
            return (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-emerald-500/80"
                  style={{ height: `${(total / maxDay) * 100}%` }}
                  title={`${day.day}: ${total}`}
                />
                <span className="text-[9px] text-[#98A2B3]">{day.day.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-[#EAECF0] bg-white p-5">
          <h2 className="text-sm font-bold text-[#101828] mb-3">Uso por proveedor</h2>
          <table className="w-full text-xs">
            <thead className="text-[#667085]">
              <tr><th className="text-left py-1">Modelo</th><th className="text-right">Mensajes</th></tr>
            </thead>
            <tbody>
              {metrics.byProvider.map((row) => (
                <tr key={row.providerModel} className="border-t border-[#F2F4F7]">
                  <td className="py-1.5">{row.providerModel}</td>
                  <td className="text-right">{row.messages}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-[#EAECF0] bg-white p-5">
          <h2 className="text-sm font-bold text-[#101828] mb-3">Latencia promedio</h2>
          <table className="w-full text-xs">
            <thead className="text-[#667085]">
              <tr><th className="text-left py-1">Modelo</th><th className="text-right">ms</th><th className="text-right">Muestras</th></tr>
            </thead>
            <tbody>
              {metrics.latencyByProvider.map((row) => (
                <tr key={row.providerModel} className="border-t border-[#F2F4F7]">
                  <td className="py-1.5">{row.providerModel}</td>
                  <td className="text-right">{row.avgLatencyMs}</td>
                  <td className="text-right">{row.samples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="rounded-2xl border border-[#EAECF0] bg-white p-5">
        <h2 className="text-sm font-bold text-[#101828] mb-3">Herramientas más usadas</h2>
        <ul className="space-y-1 text-xs">
          {metrics.topTools.map((tool) => (
            <li key={tool.action} className="flex justify-between border-t border-[#F2F4F7] py-1.5">
              <span>{tool.action.replace(/^TOOL_/, "").toLowerCase()}</span>
              <span className="font-bold">{tool.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

Agrega al sidebar:

```tsx
{ name: "Métricas de la IA", href: "/dashboard/metricas", icon: BarChart3 }
```

#### A7.6 Pruebas

- Envía 3 mensajes por WhatsApp y refresca `/dashboard/metricas`.
- La latencia solo aparece en mensajes `ASSISTANT` nuevos (los viejos quedan en `null`).
- Un usuario `OPERATOR` recibe 403 (la página es solo ADMIN/SUPERADMIN).
- La tasa de transferencia no divide por cero.

---

## 3. Fase B — requiere Meta (otra laptop)

Nada de esta fase se puede probar sin credenciales oficiales y plantillas
aprobadas. **No la implementes a ciegas**: primero el panel.

### B1. Método `sendTemplate`

En `src/lib/whatsapp/types.ts`, dentro de `IWhatsAppProvider`, como **opcional**
para no romper el fallback:

```ts
sendTemplate?(
  to: string,
  templateName: string,
  languageCode?: string,
  components?: any[]
): Promise<string>;
```

En `MetaCloudApiAdapter`:

```ts
async sendTemplate(
  to: string,
  templateName: string,
  languageCode = "es",
  components?: any[]
): Promise<string> {
  const recipient = this.cleanPhone(to);
  const response = await this.request("messages", {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components ? { components } : {}),
    },
  });
  return response.messages?.[0]?.id || "meta_sent";
}
```

### B2. Plantillas a crear en Meta Business Manager

Ruta: <https://business.facebook.com> → WhatsApp Manager → Message Templates →
Create template. Idioma: **Spanish (es)**.

| Nombre | Categoría | Cuerpo | Parámetros |
|---|---|---|---|
| `tropigo_pedido_confirmado` | UTILITY | `✅ Hola {{1}}, tu pedido #{{2}} por {{3}} Bs. fue confirmado. Sigue tu entrega aquí: {{4}}. ¡Gracias por elegirnos!` | nombre, número, total, URL |
| `tropigo_pedido_entregado` | UTILITY | `🎉 {{1}}, tu pedido #{{2}} fue entregado. ¡Buen provecho! Califica tu experiencia aquí: {{3}}. ¡Gracias!` | nombre, número, URL |
| `tropigo_fidelidad_recordatorio` | MARKETING | `🎁 {{1}}, te faltan {{2}} sellos para tu pedido gratis en TropiGO. ¡Pide hoy y sigue sumando!` | nombre, sellos |
| `tropigo_promo_dia` | MARKETING | `🔥 {{1}}, hoy en TropiGO: {{2}}. Responde "pedir" para aprovechar. Ivirgarzama.` | nombre, promo |
| `tropigo_fuera_horario` | UTILITY | `🌙 Gracias por escribir a TropiGO. Estamos fuera de horario ({{1}}). Te respondemos al abrir: {{2}}.` | horario, próximo horario |

Reglas de Meta que debes respetar:
- No pongas variables al inicio ni al final del cuerpo sin texto alrededor.
- No uses dos variables seguidas.
- Las plantillas MARKETING requieren opt-in del cliente; no las uses para
  notificaciones de pedido.
- La aprobación tarda entre minutos y 24 h. Si rechazan una, corrige el texto y
  reenvía.

### B3. Ventana de 24 horas

Fuera de la ventana, Meta rechaza texto libre con error **131047**. Helper:

```ts
// src/lib/whatsapp/window.ts
import { prisma } from "../prisma";

export async function isWithinCustomerServiceWindow(
  conversationId: string
): Promise<boolean> {
  const lastCustomerMessage = await prisma.message.findFirst({
    where: { conversationId, sender: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (!lastCustomerMessage) return false;
  return Date.now() - lastCustomerMessage.createdAt.getTime() < 24 * 60 * 60 * 1000;
}
```

En `sendOrderStatusNotification`, antes de enviar:

```ts
const conversation = await prisma.conversation.findFirst({
  where: { customerId: order.customerId, channel: "WHATSAPP" },
  orderBy: { lastMessageAt: "desc" },
  select: { id: true },
});

const windowOpen = conversation
  ? await isWithinCustomerServiceWindow(conversation.id)
  : false;

if (!windowOpen && adapter.sendTemplate) {
  // elegir plantilla según newStatus y enviar con parámetros
  return;
}
```

Si no hay plantilla configurada y la ventana está cerrada: **no envíes** texto
libre; registra `ActivityLog` con `action: "WHATSAPP_WINDOW_EXPIRED"` y sigue.
Es mejor no notificar que generar errores 131047 en cadena.

### B4. Notificaciones proactivas (recordatorios y promociones)

Los avisos de estado (`RECIBIDO`, `ASIGNADO`, `EN_CAMINO`, `ENTREGADO`) ya son
proactivos, pero **solo funcionan dentro de la ventana de 24 h**. Para escribir
días después hacen falta plantillas aprobadas y opt-in.

Casos de uso, en orden de valor:

1. **Recordatorio de fidelidad:** clientes a 1–2 sellos del premio.
2. **Promo del día:** clientes con al menos un pedido entregado en los últimos
   30 días.
3. **Recuperación:** cliente que no pide hace 21 días (máximo 1 vez al mes).

Implementación recomendada:

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/proactive", "schedule": "0 14 * * *" }
  ]
}
```

> En Vercel Hobby los cron jobs corren como máximo **una vez al día** y la hora
> es aproximada. Si necesitas más frecuencia, es plan Pro.

`src/app/api/cron/proactive/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WhatsAppAdapterFactory } from "@/lib/whatsapp/adapter-factory";
import { getBoliviaClock } from "@/lib/schedule/operating-hours";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const clock = getBoliviaClock();
  // No despertar a nadie: solo entre 09:00 y 20:00 de Bolivia.
  if (clock.minutes < 9 * 60 || clock.minutes > 20 * 60) {
    return NextResponse.json({ skipped: "quiet_hours" });
  }

  const adapter = await WhatsAppAdapterFactory.getAdapter().catch(() => null);
  if (!adapter?.sendTemplate) {
    return NextResponse.json({ skipped: "no_template_support" });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const candidates = await prisma.customer.findMany({
    where: {
      loyaltyStamps: { gte: 1 },
      orders: { some: { status: "ENTREGADO", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
    },
    select: { id: true, name: true, phone: true, loyaltyStamps: true },
    take: 50,
  });

  let sent = 0;
  for (const customer of candidates) {
    const recentlyContacted = await prisma.activityLog.findFirst({
      where: { action: "PROACTIVE_SENT", entityId: customer.id, createdAt: { gte: since } },
      select: { id: true },
    });
    if (recentlyContacted) continue;

    try {
      await adapter.sendTemplate(
        customer.phone,
        "tropigo_fidelidad_recordatorio",
        "es",
        [{
          type: "body",
          parameters: [
            { type: "text", text: customer.name || "cliente" },
            { type: "text", text: String(Math.max(0, 10 - customer.loyaltyStamps)) },
          ],
        }]
      );
      await prisma.activityLog.create({
        data: {
          action: "PROACTIVE_SENT",
          entityName: "Customer",
          entityId: customer.id,
          channel: "whatsapp",
          status: "success",
          detailsJson: JSON.stringify({ template: "tropigo_fidelidad_recordatorio" }),
        },
      });
      sent++;
    } catch (error: any) {
      await prisma.activityLog.create({
        data: {
          action: "PROACTIVE_FAILED",
          entityName: "Customer",
          entityId: customer.id,
          channel: "whatsapp",
          status: "error",
          errorText: String(error?.message || error).slice(0, 500),
        },
      });
    }
  }

  return NextResponse.json({ sent, candidates: candidates.length });
}
```

Reglas de oro para no quemar el número:
- **Opt-in:** agrega `marketingOptOut Boolean @default(false)` a `Customer` y
  excluye a quien lo pida. No uses `memoryOptOut` para esto: son cosas distintas.
- **Frecuencia:** máximo 1 mensaje proactivo por cliente cada 7 días
  (el chequeo de `PROACTIVE_SENT` ya lo hace).
- **Horario:** nada de marketing fuera de 09:00–20:00 de Bolivia.
- **Contenido:** solo clientes con pedido entregado; nunca a quien solo preguntó.
- **Métrica:** registra `PROACTIVE_SENT`/`PROACTIVE_FAILED` para poder medir.

Variable de entorno nueva: `CRON_SECRET` (Vercel → Settings → Environment
Variables). Es la única que agrega la Fase B; el resto sigue igual.

### B5. Checklist en la otra laptop (Ivirgarzama)

1. Crear la app de Meta con el caso "Connect with customers through WhatsApp".
2. Guardar en **Canales → Credenciales Oficiales Cloud API**: `Phone Number ID`,
   `WABA ID`, token y App Secret.
3. Webhook:
   - URL: `https://tropigo-ai.vercel.app/api/channels/whatsapp/webhook`
   - Verify token: `tropigo_verify_token_2025`
   - Campo: `messages`
4. Verificar el webhook (Meta envía el challenge) y confirmar que el canal pase a
   `CONNECTED`.
5. Crear las 5 plantillas de B2 y esperar aprobación.
6. Agregar los 5 números de prueba verificados.
7. Configurar `CRON_SECRET` en Vercel y desplegar `vercel.json` + la ruta del cron
   (B4). Probar el cron manualmente con el header `Authorization: Bearer ...`.
8. Probar en vivo:
   - "hola" → 3 botones → tocar "Pedir comida" → lista de comercios.
   - Pedido completo → resumen → botones → "Sí, confirmo" → pedido creado.
   - `ENTREGADO` → encuesta de 5 estrellas → calificar → se guarda.
   - Foto de producto → llega imagen con precio.
   - Dejar pasar 24 h (o usar un número sin mensajes) → cambio de estado →
     verificar que se use plantilla y no falle.
   - Cron proactivo → solo envía a clientes con pedido entregado y sin mensaje
     en los últimos 7 días.
9. Revisar `/dashboard/actividad` y `/dashboard/metricas`.

**Cuando Meta entregue el chip nuevo:** actualizar solo el `Phone Number ID` en
Canales. El webhook y el token se mantienen.

---

## 4. Orden de implementación y verificación

```text
A0 preparación
 └─ A1 horario (persistencia primero)
     └─ A2 encuesta
         └─ A3 botones
             └─ A4 recomendaciones
                 └─ A5 promociones
                     └─ A6 catálogo visual
                         └─ A7 métricas
                             └─ Fase B (otra laptop)
```

Después de **cada** bloque:

```bash
npx tsc --noEmit
npm run build
```

Y si tocaste el esquema:

```bash
npx prisma migrate deploy
npx prisma generate
```

**No** ejecutes `npm run dev` con `dev:db` si tu `.env` apunta a Supabase: el
script `dev` levanta una BD local (PGlite) y puedes confundirte de datos. Para
probar contra Supabase usa `npm run dev:web`.

---

## 5. Criterios de aceptación (Definition of Done)

| Mejora | Criterio mínimo |
|---|---|
| A1 Horario | Sin horario → 24/7. Con horario → mensaje fuera de horario y **cero** llamadas a IA. `CONTINUE_AND_BOOK` permite agendar. |
| A2 Encuesta | Se envía al entregar, se guarda 1–5, no duplica, no califica pedidos ajenos. |
| A3 Botones | "Hola" muestra 3 botones; "Sí, confirmo" crea el pedido; "Cambiar algo" no crea nada. |
| A4 Recomendaciones | "Lo de siempre" repite el pedido correcto; cliente nuevo recibe menú. |
| A5 Promociones | Solo aparecen las vigentes por día/hora; la IA no altera totales. |
| A6 Catálogo | Solo imágenes HTTPS; sin imagen envía texto; máximo 4–5 por ráfaga. |
| A7 Métricas | Panel con mensajes/día, proveedor, latencia, top tools, handoff y rating. |
| Global | `npx tsc --noEmit` y `npm run build` pasan. Sin `migrate reset` ni `db:seed`. |

---

## 6. Prompt para copiar y pegar en OpenCode

```text
Lee AGENTS.md y docs/MEJORAS-OPENCODE.md completos antes de tocar código.
Implementa SOLO la FASE A (A1 a A7) en este repositorio.

Reglas obligatorias:
1. NO ejecutes `prisma migrate reset` ni `npm run db:seed`. Hay datos reales en Supabase.
2. Migraciones solo aditivas: `npx prisma migrate dev --create-only --name <nombre>`,
   revisa el SQL y aplica con `npx prisma migrate deploy` + `npx prisma generate`.
3. No uses `setTimeout` para tareas diferidas en Vercel.
4. Usa `Message.sender` (no `role`) y `Merchant.isOpen` / `Product.isAvailable`.
5. Títulos de botones ≤ 20 caracteres; listas ≤ 10 filas en total.
6. Imágenes solo con URL `https://` pública.
7. No apliques descuentos de promociones al total en esta fase: solo informarlas.
8. Mantén el flujo de confirmación de pedidos existente: el texto del botón debe
   pasar por `isSafeExplicitConfirmation` y el último mensaje del asistente debe
   contener "¿Confirmas…?".
9. Todo el texto visible en español, con tono cercano boliviano.
10. Al terminar cada bloque ejecuta `npx tsc --noEmit`. Al final, `npm run build`.

Orden: A1 horario → A2 encuesta → A3 botones → A4 recomendaciones →
A5 promociones → A6 catálogo → A7 métricas.

Si algún campo, relación o método del documento no coincide con el código real,
DETENTE y repórtalo antes de improvisar.

Entrega final:
- lista de archivos creados y modificados,
- migraciones creadas con su SQL,
- resultado de `npx tsc --noEmit` y `npm run build`,
- checklist de pruebas manuales por cada mejora,
- riesgos o pendientes para la Fase B.
```

Si prefieres ir por partes, usa este prompt corto por cada bloque:

```text
Implementa solo A1 (horario inteligente) de docs/MEJORAS-OPENCODE.md.
Incluye persistencia en AssistantIdentityConfig, el módulo
src/lib/schedule/operating-hours.ts, la integración en el webhook y la UI en
IA Studio. No toques nada más. Verifica con npx tsc --noEmit.
```

---

## 7. Anexo — SQL esperado de las migraciones

Revisa que el SQL generado sea equivalente a esto (nombres y tipos pueden variar
levemente según Prisma, pero **no** debe haber `DROP`).

### 7.1 `add_order_rating`

```sql
CREATE TABLE "OrderRating" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderRating_orderId_key" ON "OrderRating"("orderId");
CREATE INDEX "OrderRating_rating_createdAt_idx" ON "OrderRating"("rating", "createdAt");

ALTER TABLE "OrderRating"
  ADD CONSTRAINT "OrderRating_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

### 7.2 `add_promotion_schedule`

```sql
ALTER TABLE "Promotion" ADD COLUMN "scheduleDays" TEXT;
ALTER TABLE "Promotion" ADD COLUMN "scheduleStart" TEXT;
ALTER TABLE "Promotion" ADD COLUMN "scheduleEnd" TEXT;
ALTER TABLE "Promotion" ADD COLUMN "autoAnnounce" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Promotion" ADD COLUMN "announceMessage" TEXT;
```

### 7.3 `add_message_latency`

```sql
ALTER TABLE "Message" ADD COLUMN "latencyMs" INTEGER;
```

---

## 8. Lo que **no** se hace en esta fase

Para evitar promesas falsas:

- **No** se aplican descuentos automáticos de `Promotion` al total del pedido.
  Eso requiere tocar `createOrderQuote`, `OrderDiscount` y validar topes. Fase C.
- **No** se envían mensajes proactivos fuera de la ventana de 24 h sin plantillas
  aprobadas. Fase B.
- **No** se agenda la encuesta para “10 minutos después” con `setTimeout`. Si se
  quiere, Vercel Cron + columnas de control. Fase C.
- **No** se agregan librerías de gráficos. El panel usa CSS y tablas.
- **No** se toca el modo Baileys ni el worker de Render.
- **No** se cambia el modelo de IA ni las credenciales.

---

## 9. Archivos de referencia rápida

| Archivo | Para qué |
|---|---|
| `prisma/schema.prisma` | Modelos y migraciones |
| `src/app/api/channels/whatsapp/webhook/route.ts` | Flujo principal de WhatsApp |
| `src/lib/whatsapp/types.ts` | Contratos de botones, listas, imágenes |
| `src/lib/whatsapp/meta-cloud-adapter.ts` | Implementación Meta |
| `src/lib/whatsapp/adapter-factory.ts` | Adaptador activo y fallback |
| `src/lib/whatsapp/notifications.ts` | Mensajes por estado del pedido |
| `src/lib/orders/confirmation.ts` | Reglas de confirmación segura |
| `src/lib/orders/order-service.ts` | Cotización, pedido y contexto de tools |
| `src/lib/ai/config-manager.ts` | Configuración y system prompt |
| `src/lib/ai/tools/index.ts` | Registro de herramientas y contexto vivo |
| `src/lib/ai/agent.ts` | Orquestador y `toolCalls` |
| `src/lib/ai/types.ts` | `CompletionResult` con `latencyMs` |
| `src/lib/memory/customer-memory.ts` | Memoria del cliente |
| `src/app/dashboard/ia/ia-client.tsx` | IA Studio |
| `src/components/sidebar.tsx` | Navegación |
| `src/app/api/webchat/chat/route.ts` | Chat web |

**Archivos nuevos de la Fase A:**

| Archivo | Mejora |
|---|---|
| `src/lib/schedule/operating-hours.ts` | A1 |
| `src/lib/whatsapp/interactive.ts` | A3 |
| `src/lib/whatsapp/survey.ts` | A2 |
| `src/lib/catalog/visual.ts` | A6 |
| `src/lib/promotions/active.ts` | A5 |
| `src/lib/metrics/service.ts` | A7 |
| `src/lib/ai/tools/recommendation-tool.ts` | A4 |
| `src/lib/ai/tools/promotions-tool.ts` | A5 |
| `src/lib/ai/tools/catalog-visual-tool.ts` | A6 |
| `src/app/api/admin/metrics/route.ts` | A7 |
| `src/app/dashboard/metricas/page.tsx` | A7 |
| `src/app/api/admin/promotions/route.ts` | A5 (UI opcional) |
| `src/app/api/admin/promotions/[id]/route.ts` | A5 (UI opcional) |
| `src/app/dashboard/promociones/page.tsx` | A5 (UI opcional) |
| `src/lib/whatsapp/window.ts` | B3 (Fase B) |

---

**Fin de la guía.** Si algo del repositorio cambió y este documento ya no
coincide, actualiza el documento en el mismo commit que el código.
