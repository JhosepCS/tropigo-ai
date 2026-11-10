# 🌴 TropiGO AI

Asistente inteligente de **delivery, mandados y mototaxi** para Ivirgarzama (Trópico de Cochabamba, Bolivia). Atiende por **WhatsApp** y **chat web**, consulta el catálogo y las zonas reales, cotiza pedidos, calcula tarifas de envío, recuerda a cada cliente y deriva a una operadora humana cuando hace falta.

- **Motor de IA:** Google Gemini (`gemini-3.1-flash-lite`) — texto, **visión de imágenes** y **transcripción de audios** en un solo proveedor gratuito.
- **Panel CRM:** Next.js 15 (App Router) + Prisma + PostgreSQL.
- **Base de datos:** Supabase (PostgreSQL).
- **Web:** Vercel (free).
- **Worker de WhatsApp:** Render (free) con Baileys y sesión persistida en Supabase.

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

---

## 🚀 Desarrollo local

```bash
npm install
cp .env.example .env      # completar claves reales
npm run dev               # BD local (5433) + web (3000) + worker
```

- Panel: <http://localhost:3000>
- Usuario inicial: `admin@tropigo.bo` / `AdminTropigo2025!` (cambiar al primer ingreso).
- El worker muestra el QR en el panel CRM (`/dashboard/canales`).

> ⚠️ La BD local del puerto 5433 contiene pedidos reales. **Nunca** ejecutes `prisma migrate reset` ni el seed sobre ella.

### Verificaciones

```bash
npx tsc --noEmit
npm run build
RUN_DB_TESTS=1 npx tsx scripts/test-customer-memory.ts
```

---

## ☁️ Despliegue en producción (gratuito)

La arquitectura recomendada separa la web del worker:

```
Vercel (Next.js)  ──────►  Supabase (PostgreSQL)
        ▲                        ▲
        │                        │
Render (worker Baileys) ─────────┘
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
   - `ENCRYPTION_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
   - `WHATSAPP_PROVIDER=BAILEYS_QR`
4. Deploy.

`vercel.json` fija la región `iad1` (cerca de Supabase us-east-1) y las rutas de IA tienen `maxDuration = 60`.

### 3. Worker de WhatsApp en Render

1. Crea un **Blueprint** en <https://render.com> apuntando al repo; Render lee `render.yaml`.
2. Completa las variables marcadas con `sync: false` (`DATABASE_URL`, `DIRECT_URL`, `GEMINI_API_KEY`, `APP_URL`, `ENCRYPTION_KEY`, `GROQ_API_KEY`).
3. El servicio queda en `https://tropigo-whatsapp-worker.onrender.com` con health check en `/health`.
4. Abre el panel CRM → **Canales → WhatsApp** y escanea el QR.

La sesión de Baileys se guarda en `Channel.settingsJson` de Supabase (`WHATSAPP_SESSION_PERSIST=true`), así que sobrevive reinicios del hosting.

> **Plan free de Render:** el servicio se duerme tras ~15 minutos sin tráfico. Configura un ping gratuito (cron-job.org o UptimeRobot) a `https://TU-WORKER.onrender.com/health` cada 5 minutos para mantener WhatsApp conectado. Si prefieres el webhook oficial, usa Meta Cloud API (`WHATSAPP_PROVIDER=META_CLOUD_API`) y elimina el worker.

### 4. Docker (opcional)

```bash
docker compose up -d --build
```

- `web`: migraciones automáticas (`RUN_MIGRATIONS=true`) y Next.js en `:3000`.
- `worker`: Baileys + health server en `:3001`, sesión en el volumen `whatsapp_session`.
- La base de datos **no** se levanta localmente: se usa Supabase.

También puedes desplegar la imagen publicada en GHCR:

```bash
docker pull ghcr.io/jhosepcs/tropigo-ai:latest
```

---

## 🔐 Privacidad y seguridad

- Cada cliente de WhatsApp y cada sesión web tienen su propio registro y su propia memoria.
- Los pedidos reales solo se cotizan/confirman por WhatsApp (`source !== WEBCHAT/PUBLIC`).
- Las credenciales de canales se cifran con AES-256-GCM (`ENCRYPTION_KEY`).
- El seed está desactivado por defecto en producción (`SEED_DEMO=false`); **borra y recrea datos**.
- Cambia `ADMIN_PASSWORD` y `ENCRYPTION_KEY` antes de publicar.

---

## 🧰 Scripts útiles

| Comando | Descripción |
|---|---|
| `npm run dev` | BD local + web + worker |
| `npm run build` | `prisma generate` + build de Next.js |
| `npm start` | Servidor de producción |
| `npm run start:worker` | Worker de WhatsApp |
| `npm run db:seed` | Datos demo (¡solo BD vacía!) |
| `npx prisma migrate deploy` | Migraciones de producción |
| `npx prisma studio` | Explorador de datos |

---

## 📁 Estructura clave

```
src/app/api/webchat/chat/route.ts        Webchat aislado (texto/imagen/audio)
src/app/api/channels/whatsapp/webhook/   Webhook Meta Cloud API
src/lib/ai/agent.ts                      Orquestador único de herramientas
src/lib/ai/multimodal.ts                 Visión y transcripción Gemini
src/lib/ai/tools/                        Herramientas conectadas a la BD
src/worker/index.ts                      Worker Baileys + health + persistencia
prisma/migrations/20261110000000_init/   Baseline completo de producción
```
