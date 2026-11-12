# 🌴 TropiGO AI

Asistente inteligente de **delivery, mandados y mototaxi** para Ivirgarzama (Trópico de Cochabamba, Bolivia). Atiende por **WhatsApp** y **chat web**, consulta el catálogo y las zonas reales, cotiza pedidos, calcula tarifas de envío, recuerda a cada cliente y deriva a una operadora humana cuando hace falta.

- **Motor de IA:** Google Gemini (`gemini-3.1-flash-lite`) — texto, **visión de imágenes** y **transcripción de audios** en un solo proveedor gratuito.
- **Panel CRM:** Next.js 15 (App Router) + Prisma + PostgreSQL.
- **Base de datos:** Supabase (PostgreSQL).
- **Web:** Vercel (free).
- **WhatsApp oficial:** Meta Cloud API (recomendado, sin worker).
- **WhatsApp no oficial:** worker Baileys en Render (solo pruebas con QR).

---

## 🧠 Qué hace el asistente

| Capacidad | Cómo funciona |
|---|---|
| Ver imágenes | Descarga la foto (Meta API o Baileys) y la analiza con Gemini Vision: menús, comprobantes QR, productos, direcciones. |
| Entender audios | Descarga la nota de voz y la transcribe con Gemini Audio. Whisper de Groq queda como respaldo opcional. |
| Consultar datos reales | Herramientas conectadas a la BD: comercios, catálogo, precios, horarios, zonas, tarifas y pedidos. |
| Cotizar pedidos | Genera un resumen oficial con subtotal, envío y total. La creación real solo se confirma por WhatsApp. |
| Recordar clientes | Memoria estructurada por cliente (`CustomerMemoryFact`) + resúmenes de conversaciones. Nunca se mezcla entre clientes. |
| Derivar a humano | Herramienta `pasar_a_humano` + estado `HUMAN_TAKEOVER`. |
| Aislar el webchat | Cada sesión del navegador tiene su propio `Customer` y su propia conversación. |
| Distancia real | El delivery se cobra por la zona del cliente **más un recargo por km desde la Plaza Principal de Ivirgarzama**. Si el cliente comparte GPS (normal o en tiempo real), se estima la ruta, el ETA y el recargo configurable. |
| Ubicación persistente | La última ubicación GPS del cliente se guarda en su perfil y la IA la reutiliza para cotizar sin volver a pedirla. |
| Comprobantes de pago | Si el cliente envía la foto de un comprobante (Tigo Money, Yape, ZAS, Altoke, QR bancario, etc.), Gemini Vision extrae monto, billetera, referencia y titular. Se verifica automáticamente solo si monto y titular coinciden; si no, queda pendiente para revisión manual. |
| QR del repartidor | El rider puede cargar su QR personal de cobro en **Repartidores**. Cuando tiene un pedido asignado, el QR aparece en `/pagar/[id]` para que el cliente pague y envíe el comprobante. |
| Asignación de riders | Al pasar un pedido a `LISTO_RECOJO`, el sistema asigna automáticamente el rider activo y disponible con menos entregas (configurable en Ajustes). |
| Pagos digitales | QR Simple, Tigo Money, Altoke, Yape, ZAS, transferencia y efectivo. El cliente paga desde `/pagar/[id]` y reporta el pago; el operador verifica. |
| Seguimiento en vivo | `/seguimiento/[id]` muestra mapa de Google, repartidor, ETA e historial. El repartidor comparte GPS desde su panel. |
| Fidelidad mejorada | Sellos por pedido/carrera, sellos dobles temporales, niveles Bronce/Plata/Oro e historial reciente. |

---

## 🚀 Desarrollo local

```bash
npm install
cp .env.example .env      # completar claves reales
npm run dev               # BD local (5433) + web (3000) + worker
```

- Panel: <http://localhost:3000>
- Usuario inicial: `admin@tropigo.bo`
- Contraseña: la definida en `ADMIN_PASSWORD` del `.env` (no se versiona).
- El seed exige `ADMIN_PASSWORD` y `OPERATOR_PASSWORD`; no tiene contraseñas hardcodeadas.
- El QR de Baileys se muestra en **Canales → Modo QR (Baileys)** cuando `WHATSAPP_PROVIDER=BAILEYS_QR` y el worker está activo.

> ⚠️ La BD local del puerto 5433 contiene pedidos reales. **Nunca** ejecutes `prisma migrate reset` ni el seed sobre ella.

### Verificaciones

```bash
npx tsc --noEmit
npm run build
RUN_DB_TESTS=1 npx tsx scripts/test-customer-memory.ts
```

---

## 📱 WhatsApp oficial (Meta Cloud API) — recomendado

La ruta oficial **no usa QR ni Render**. El webhook vive en Vercel y Meta entrega los mensajes directamente.

1. Crea una app en <https://developers.facebook.com/apps> con el caso de uso **“Connect with customers through WhatsApp”**.
2. En **API Setup**, Meta te asigna un **número de prueba** gratis. Agrega tu número personal como destinatario verificado (máximo 5).
3. Copia el **Phone Number ID** y el **WABA ID**.
4. En el CRM → **Canales → Credenciales Oficiales Cloud API**, pega los datos y guarda. El sistema valida contra Meta.
5. Configura el webhook en Meta:
   - **Callback URL:** `https://tropigo-ai.vercel.app/api/channels/whatsapp/webhook`
   - **Verify Token:** `tropigo_verify_token_2025`
   - Suscríbete al campo **`messages`**.
6. Escribe desde tu WhatsApp al número de prueba. El asistente debe responder con texto, audios e imágenes.

Cuando compres el **chip nuevo**, agrégalo en Meta como número real, verifícalo por SMS/llamada, define un PIN y actualiza el **Phone Number ID** y **WABA ID** en el CRM. El webhook y el token permanente se mantienen.

**Límites y costos:** el número de prueba solo escribe a 5 destinatarios verificados. En producción, Meta da **1,000 mensajes de servicio gratis al mes**; después cobra por mensaje (Bolivia = “Resto de Latinoamérica”). Los mensajes que el cliente envía al negocio no se cobran.

**Sobre tu número actual:** Meta no acepta un número que ya esté en uso con WhatsApp, salvo que borres esa cuenta o uses coexistencia (requiere Tech Provider/Solution Partner y Embedded Signup v4/v5). Lo recomendable es dejar tu número personal y usar el chip nuevo para el bot.

📖 Guía completa: [`docs/CONFIGURAR-META.md`](docs/CONFIGURAR-META.md)

---

## ☁️ Despliegue en producción (gratuito)

```
Vercel (Next.js)  ──────►  Supabase (PostgreSQL)
        ▲                        ▲
        │                        │
Meta Cloud API (webhook) ────────┘

Render (worker Baileys) ── solo si usas QR / modo no oficial
```

### 1. Base de datos (ya configurada)

Proyecto Supabase `fwtcjeyccyxmfkypbrmc`. Usa el **pooler**:

- `DATABASE_URL` → Transaction pooler, puerto **6543**, con `?pgbouncer=true&connection_limit=1`.
- `DIRECT_URL` → Session pooler, puerto **5432** (migraciones).

El esquema se aplica con el baseline `prisma/migrations/20261110000000_init`:

```bash
npx prisma migrate deploy
```

### 2. Web en Vercel

1. Importa el repositorio `JhosepCS/tropigo-ai` en <https://vercel.com/new>.
2. Framework: **Next.js** (se detecta solo; `vercel.json` ya está incluido).
3. Carga las variables de `.env.example`:
   - `DATABASE_URL`, `DIRECT_URL`
   - `GEMINI_API_KEY`, `GEMINI_MULTIMODAL_MODEL`
   - `APP_URL` (la URL final de Vercel)
   - `ENCRYPTION_KEY` (64 caracteres hexadecimales)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
   - `WHATSAPP_PROVIDER=META_CLOUD_API`
4. Deploy.

`vercel.json` fija la región `iad1` (cerca de Supabase us-east-1) y las rutas de IA tienen `maxDuration = 60`.

### 3. Worker de WhatsApp en Render (solo QR / no oficial)

> Meta oficial **no necesita este worker**. Úsalo solo si quieres probar el modo QR con un número desechable.

1. El repositorio debe ser **público** o debes instalar la **Render GitHub App** para que Render pueda leerlo.
2. Crea un **Blueprint** en <https://render.com> apuntando al repo; Render lee `render.yaml`.
3. Completa las variables marcadas con `sync: false` (`DATABASE_URL`, `DIRECT_URL`, `GEMINI_API_KEY`, `APP_URL`, `ENCRYPTION_KEY`, `GROQ_API_KEY`).
4. El servicio queda en `https://tropigo-whatsapp-worker.onrender.com` con health check en `/health`.
5. Abre el panel CRM → **Canales → Modo QR (Baileys)** y escanea el QR.

La sesión de Baileys se guarda en `Channel.settingsJson` de Supabase (`WHATSAPP_SESSION_PERSIST=true`), así que sobrevive reinicios del hosting.

> **Plan free de Render:** el servicio se duerme tras ~15 minutos sin tráfico. Configura un ping gratuito (cron-job.org o UptimeRobot) a `https://TU-WORKER.onrender.com/health` cada 5 minutos para mantener WhatsApp conectado. Si usas Meta oficial, puedes dejar `WHATSAPP_PROVIDER=META_CLOUD_API` en Render: el worker queda saludable pero no conecta Baileys.

### 4. Docker (opcional)

```bash
docker compose up -d --build
```

- `web`: migraciones automáticas (`RUN_MIGRATIONS=true`) y Next.js en `:3000`.
- `worker`: Baileys + health server en `:3001`, sesión en el volumen `whatsapp_session`.
- La base de datos **no** se levanta localmente: se usa Supabase.

---

## 🔐 Privacidad y seguridad

- Cada cliente de WhatsApp y cada sesión web tienen su propio registro y su propia memoria.
- Los pedidos reales solo se cotizan/confirman por WhatsApp (`source !== WEBCHAT/PUBLIC`).
- Las credenciales de canales se cifran con AES-256-GCM (`ENCRYPTION_KEY`).
- `ENCRYPTION_KEY` también firma las sesiones JWT. Debe tener **64 caracteres hexadecimales** y nunca debe subirse al repositorio. Genera una con `openssl rand -hex 32`.
- Si la clave se filtra, rótala de inmediato en Vercel/Render y en el `.env`. Las sesiones viejas quedan invalidadas.
- El seed está desactivado por defecto en producción (`SEED_DEMO=false`); **borra y recrea datos**.
- No hay contraseñas de administrador hardcodeadas en el código ni en el README.

---

## 💾 Backup y traslado a otra PC

El proyecto se puede mover sin `node_modules` ni `.next`:

**Incluir:** `src`, `prisma`, `public`, `scripts`, `docs`, `package.json`, `package-lock.json`, `next.config.*`, `tsconfig.json`, `tailwind.config.*`, `postcss.config.*`, `README.md`, `.env.example`, `render.yaml`, `vercel.json`.

**Excluir:** `.env`, `.env.local`, `.env.production`, `node_modules`, `.next`, `.git`, `.vercel`, `data`, `backup`, `*.log`, `tsconfig.tsbuildinfo`.

**Secretos:** el `.env` real y las credenciales deben viajar en un archivo **cifrado con contraseña** (7-Zip AES-256), nunca en el ZIP/7z público de MediaFire.

En la otra PC:

```bash
npm install
# copiar el .env real desde el archivo de secretos
npm run dev
```

La base de datos de producción vive en Supabase, así que no necesitas copiar PostgreSQL. Si quieres respaldar la BD local 5433, usa `pg_dump` y guarda el `.sql` dentro del archivo cifrado.

---

## 🧰 Scripts útiles

| Comando | Descripción |
|---|---|
| `npm run dev` | BD local + web + worker |
| `npm run build` | `prisma generate` + build de Next.js |
| `npm start` | Servidor de producción |
| `npm run start:worker` | Worker de WhatsApp |
| `npm run db:seed` | Datos demo (¡solo BD vacía! y con `ADMIN_PASSWORD`/`OPERATOR_PASSWORD`) |
| `npx prisma migrate deploy` | Migraciones de producción |
| `npx prisma studio` | Explorador de datos |

---

## 📁 Estructura clave

```
src/app/api/webchat/chat/route.ts        Webchat aislado (texto/imagen/audio)
src/app/api/channels/whatsapp/webhook/   Webhook Meta Cloud API
src/app/api/channels/whatsapp/sse/       Estado/QR en vivo (solo admin/operador)
src/components/whatsapp-baileys-qr.tsx   Tarjeta QR del modo Baileys
src/lib/ai/agent.ts                      Orquestador único de herramientas
src/lib/ai/multimodal.ts                 Visión y transcripción Gemini
src/lib/ai/tools/                        Herramientas conectadas a la BD
src/lib/auth/secret.ts                   Firma de sesiones (ENCRYPTION_KEY)
src/worker/index.ts                      Worker Baileys + health + persistencia
docs/CONFIGURAR-META.md                  Guía del número oficial y número de prueba
prisma/migrations/20261110000000_init/   Baseline completo de producción
```
