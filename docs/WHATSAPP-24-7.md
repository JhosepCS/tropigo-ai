# WhatsApp 24/7 — Guía rápida (Baileys / QR)

TropiGO usa el worker `src/worker/index.ts` con Baileys porque el número no se
pudo verificar en Meta. El worker debe estar encendido **todo el día** para que
TropiBot reciba y responda. Este documento explica cómo lograrlo sin pagar un
plan mensual.

## 1. Qué hace el worker

- Mantiene la sesión de WhatsApp (QR) y reconecta solo si se cae.
- Agrupa mensajes seguidos del cliente (`WHATSAPP_BATCH_DELAY_MS`, 2.5 s).
- Responde saludos y opciones 1–5 al instante, sin gastar tokens.
- Confirma pedidos reales con `confirmAndCreateOrder` en el canal Baileys.
- Guarda **todos** los mensajes entrantes aunque el asistente esté apagado o el
  chat esté en control humano, para que el CRM siempre muestre el chat correcto.
- Si un operador toma el control y no responde en `AI_AUTO_RESUME_SECONDS`
  (17 s por defecto), TropiBot retoma la conversación automáticamente.
- Expone `GET /health` con `baileysConnected`, `queuedChats`, `uptimeSeconds` y
  `autoResumeSeconds`. El CRM lo consulta cada 10 s.

## 2. Opción A — PC siempre encendida (recomendada si no hay servidor)

1. Instala dependencias una vez:

   ```bat
   npm install
   ```

2. Arranca el worker con el lanzador que se reinicia solo:

   ```bat
   scripts\worker-forever.bat
   ```

3. Escanea el QR desde el CRM (**Canales → WhatsApp**) o desde
   `ESCANEAR-WHATSAPP-TROPIGO.html`.

4. Evita que Windows suspenda el equipo:
   - **Configuración → Sistema → Energía** → suspensión: *Nunca*.
   - Desactiva el ahorro de energía del adaptador de red.

5. Para que arranque al iniciar sesión: crea un acceso directo a
   `scripts\worker-forever.bat` en `shell:startup` (Win + R → `shell:startup`).

> La PC debe permanecer encendida, conectada a internet y sin suspensión.
> Si se apaga, el bot deja de responder hasta que vuelva a arrancar.

### CRM en Vercel + worker en la PC

No hace falta abrir puertos ni pagar un túnel. El CRM y el worker se comunican
por la base de datos:

- El worker escribe un **latido** en `Channel` cada 30 s. El CRM lo usa para
  mostrar “conectado” aunque Vercel no pueda alcanzar la PC.
- Si el CRM no logra enviar un mensaje por HTTP, lo guarda como
  `PENDING_WORKER`. El worker lo detecta en ~3 s, lo envía por WhatsApp y lo
  marca como `SENT`.
- Si el worker está apagado más de 2 minutos, el CRM muestra “Worker
  desconectado” y el mensaje queda como fallido (no se pierde).

Así el operador puede responder desde el CRM en Vercel mientras el worker corre
en la PC del local.

## 3. Opción B — Render free + keep-alive

El `render.yaml` ya define el servicio `tropigo-whatsapp-worker` con
`plan: free`. Render duerme el servicio tras ~15 minutos sin tráfico, por eso el
repositorio incluye `.github/workflows/keep-worker-awake.yml`, que hace ping a
`/health` cada 5 minutos.

1. Despliega el worker en Render y escanea el QR.
2. En **Vercel → Settings → Environment Variables** define:

   ```env
   WORKER_URL=https://tropigo-whatsapp-worker.onrender.com
   WORKER_SECRET=<un secreto largo>
   AI_AUTO_RESUME_SECONDS=17
   WHATSAPP_BATCH_DELAY_MS=2500
   ```

3. En **GitHub → Settings → Secrets and variables → Actions** crea
   `WORKER_URL` con la misma URL. Si no lo creas, el workflow usa la URL por
   defecto del `render.yaml`.
4. Activa **Actions → Keep WhatsApp Worker Awake → Run workflow** una vez para
   verificar que responde.

> El keep-alive de GitHub Actions es gratuito, pero los cron programados pueden
> retrasarse y se desactivan tras 60 días sin actividad en el repositorio.
> Para producción seria, usa la Opción A o un VPS pequeño.

## 4. Verificación

```bat
curl https://TU-WORKER/health
```

Debe devolver `"baileysConnected": true`. En el CRM, el banner superior muestra
`+591 57770679 conectado`. Si muestra **Worker desconectado**:

- Revisa que `WORKER_URL` sea la URL pública correcta (no `127.0.0.1`).
- Confirma que el worker esté corriendo y que el QR siga vinculado.
- Si el teléfono cerró la sesión, borra `data/whatsapp_session` y vuelve a
  escanear el QR.

## 5. Reglas de respuesta

- La IA responde en máximo ~650 caracteres y 8 líneas.
- Los resúmenes de pedido se envían completos.
- Nunca se corta una URL a la mitad.
- Los atajos de menú, market, taxi, GPS y operador son instantáneos (0 tokens).
- Un operador puede escribir `#ia` o `reanudar` en el chat para devolver el
  control a TropiBot.
