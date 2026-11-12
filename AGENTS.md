# AGENTS.md — Contexto oficial de TropiGO AI

Este archivo es la fuente de contexto para agentes de IA (OpenCode, Antigravity,
Claude Code, Cursor, etc.) que continúen este proyecto en otra PC.

## 1. Qué es este proyecto

TropiGO AI es un asistente inteligente de **delivery, mandados y mototaxi** para
Ivirgarzama (Trópico de Cochabamba, Bolivia). Atiende por **WhatsApp oficial de
Meta (Cloud API)** y por **chat web**, consulta datos reales del negocio, cotiza
pedidos, calcula tarifas, recuerda clientes y gestiona una tarjeta de fidelidad
con QR personal.

- **Panel:** Next.js 15 (App Router) + React 19 + Tailwind.
- **Base de datos:** PostgreSQL en Supabase (Prisma ORM).
- **IA:** Google Gemini (`gemini-3.1-flash-lite`) para texto, visión y audio.
- **Web:** Vercel (free).
- **WhatsApp oficial:** Meta Cloud API (webhook en Vercel, sin worker).
- **WhatsApp no oficial opcional:** worker Baileys en Render (solo pruebas).
- **Producción:** https://tropigo-ai.vercel.app
- **Repositorio:** https://github.com/JhosepCS/tropigo-ai

## 2. Estado actual (noviembre 2026)

- Login real funcionando. La contraseña admin está en `.env` (`ADMIN_PASSWORD`),
  no en el código ni en el README.
- Fidelidad implementada:
  - 10.º pedido gratis (configurable entre 2 y 50).
  - Un sello por pedido `ENTREGADO`.
  - Opcional: un sello por carrera de mototaxi `FINALIZADO`
    (`BusinessProfile.loyaltyCountRides`, activo por defecto).
  - QR personal por cliente con código `TGO-XXXXXXXX`.
  - La IA puede consultar la tarjeta por el WhatsApp del cliente
    (`consultar_mi_fidelidad`) o por el código/QR (`consultar_fidelidad_por_codigo`).
  - La IA lee QR desde fotos con `jsqr` + `sharp` y adjunta el contexto de la
    tarjeta al mensaje.
- Tarifas de mototaxi configurables desde **Ajustes** (mínimo absoluto 10 Bs.).
- Delivery por zonas configurable desde **Zonas**.
- Delivery por zona + distancia desde la **Plaza Principal de Ivirgarzama**:
  la tarifa de la zona se suma a un recargo por km adicional (2 km incluidos y
  2 Bs/km por defecto, configurable). Si el cliente comparte GPS normal o en
  tiempo real, se estima la ruta y el ETA. La última ubicación GPS se guarda en
  `Customer.savedLatitude/savedLongitude` + `lastLocationLabel` y la IA la
  reutiliza sin volver a pedirla.
- Comprobantes de pago por foto: Gemini Vision extrae monto, billetera,
  referencia y titular. El pago se verifica automáticamente solo si el monto y
  el titular/cuenta coinciden; si no, queda `PENDIENTE` para revisión manual.
- QR personal de cobro del repartidor en `Rider.paymentQrJson`, visible en
  `/pagar/[id]` cuando el pedido tiene rider asignado.
- Asignación automática de rider al pasar un pedido a `LISTO_RECOJO` si
  `BusinessProfile.autoAssignRiders` está activo. Se elige el rider activo y
  disponible con menos entregas; la asignación manual sigue disponible.
- Pagos digitales configurables desde **Ajustes → Pagos**: efectivo, QR Simple,
  Tigo Money, Altoke, Yape, ZAS y transferencia. El cliente paga en
  `/pagar/[id]`, reporta el pago y un operador lo verifica.
- Seguimiento en vivo en `/seguimiento/[id]` con mapa de Google sin API key.
  El repartidor activa “Compartir mi ubicación GPS” en su panel.
- Fidelidad mejorada: sellos dobles temporales, niveles Bronce/Plata/Oro,
  historial reciente y contexto proactivo para la IA.
- Webhook de Meta verificado. El canal está en `DISCONNECTED` hasta cargar las
  credenciales oficiales en **Canales**.
- Worker de Render opcional para el modo QR no oficial.

## 3. Comandos

```bash
npm install
npm run dev          # BD local + web + worker (si aplica)
npm run build        # prisma generate + next build
npm start            # servidor de producción
npm run start:worker # worker Baileys
npx tsc --noEmit     # verificación de tipos
npx prisma migrate deploy
npx prisma studio
```

Verificaciones recomendadas antes de cada deploy:

```bash
npx tsc --noEmit
npm run build
```

> **NUNCA** ejecutes `prisma migrate reset` ni `npm run db:seed` sobre una base
> con datos reales. El seed borra y recrea información.

## 4. Arquitectura clave

```
src/app/api/channels/whatsapp/webhook/route.ts  Webhook Meta (texto, audio, imagen, QR)
src/app/api/webchat/chat/route.ts               Chat web aislado por sesión
src/lib/ai/agent.ts                             Orquestador de herramientas
src/lib/ai/tools/index.ts                       Registro de herramientas + contexto vivo
src/lib/ai/tools/loyalty-tool.ts                consultar_mi_fidelidad
src/lib/ai/tools/loyalty-code-tool.ts           consultar_fidelidad_por_codigo
src/lib/ai/tools/payments-tool.ts               consultar_metodos_pago
src/lib/ai/tools/payment-status-tool.ts         consultar_mis_pagos
src/lib/ai/tools/location-request-tool.ts       solicitar_ubicacion
src/lib/payments/types.ts                       Métodos de pago y normalización
src/lib/payments/service.ts                     Lectura/guardado de métodos
src/lib/payments/rider.ts                       QR personal de cobro del rider
src/lib/payments/receipt-service.ts             Registro/verificación de comprobantes
src/lib/geo/delivery-center.ts                  Centro, distancia y ubicación guardada
src/lib/geo/maps-distance.ts                    Distancia real por carretera (Google Maps API)
src/lib/geo/reverse-geocode.ts                  Dirección aproximada (Nominatim)
src/lib/calendar/google-calendar.ts             Agendamiento automático en Google Calendar
src/lib/tracking/service.ts                     Datos de seguimiento y mapa
src/lib/whatsapp/notifications.ts               Notificaciones automáticas por WhatsApp al cliente
src/lib/app-url.ts                              URL pública para enlaces
src/lib/ai/config-manager.ts                    System prompt
src/lib/loyalty/service.ts                      Sellos, premios, QR, canje
src/lib/loyalty/code.ts                         Normalización TGO-XXXXXXXX
src/lib/loyalty/qr-decode.ts                    Lectura de QR con jsqr + sharp
src/lib/loyalty/prompt.ts                       Contexto de tarjeta para la IA
src/lib/orders/order-service.ts                 Cotización, pedido y premio
src/lib/rides/fare.ts                           Tarifas de mototaxi
src/worker/index.ts                             Worker Baileys opcional
src/app/dashboard/ajustes/                      Tarifas, pagos, distancia y fidelidad
src/app/dashboard/repartidores/                 Riders + QR personal de cobro
src/app/api/admin/riders/[id]/payment-qr/       Guardar QR de cobro del rider
src/app/dashboard/fidelidad/                    Tarjetas, QR, sellos y canje
src/app/fidelidad/[code]/page.tsx               Tarjeta pública
src/app/pagar/[id]/                             Página pública de pago con QR
src/app/seguimiento/[id]/                       Mapa de seguimiento en vivo
src/app/api/public/payments/report/             Reporte de pago del cliente
src/app/api/repartidor/location/                GPS autenticado del repartidor
src/app/api/public/tracking/[id]/               API de seguimiento privado
prisma/schema.prisma                            Modelo de datos
prisma/migrations/                              Migraciones (baseline + aditivas)
docs/CONFIGURAR-META.md                         Guía de Meta
```

## 5. Reglas de fidelidad (importante)

- `loyaltyStampsRequired = 10` significa que **el pedido número 10 es gratis**.
- `stampsNeeded = stampsRequired - 1` (con 10, la tarjeta se completa con 9
  sellos; el 10.º pedido se aplica como premio).
- Los sellos se guardan en `Customer.loyaltyStamps`.
- Los pedidos se sellan al pasar a `ENTREGADO` (`awardLoyaltyOnDelivery`).
- Las carreras se sellan al pasar a `FINALIZADO`
  (`awardLoyaltyOnRideCompletionById`) solo si `loyaltyCountRides = true`.
- El premio se reserva al confirmar el pedido (`reserveLoyaltyReward`) y se
  aplica en `getLoyaltyDiscountForQuote`. Si el pedido se cancela, se restauran
  los sellos (`restoreLoyaltyOnCancellation`).
- El QR codifica `https://TU_DOMINIO/fidelidad/TGO-XXXXXXXX`.
- El nombre en la tarjeta pública y en la consulta por código va enmascarado.
- Si `loyaltyDoubleStampsUntil` está vigente, cada pedido/carrera suma 2 sellos
  (`stampsPerEvent = 2`), con tope en `stampsNeeded`.
- Niveles informativos: Bronce (0-9 servicios), Plata (10-29), Oro (30+).
- `getLoyaltySummary` y `getLoyaltyCardByCode` devuelven nivel, progreso,
  sellos dobles e historial reciente; la IA recibe contexto proactivo.

## 6. WhatsApp oficial (Meta)

1. Crear app en https://developers.facebook.com/apps con el caso de uso
   “Connect with customers through WhatsApp”.
2. Guardar `Phone Number ID`, `WABA ID`, token y App Secret en
   **Canales → Credenciales Oficiales Cloud API**.
3. Webhook:
   - URL: `https://tropigo-ai.vercel.app/api/channels/whatsapp/webhook`
   - Verify token: `tropigo_verify_token_2025`
   - Campo: `messages`.
4. El número de prueba sirve para 5 destinatarios verificados.
5. Para el chip nuevo: agregarlo en Meta, verificar, copiar el nuevo
   `Phone Number ID` y actualizarlo en el CRM. El webhook y el token se mantienen.

Más detalle en `docs/CONFIGURAR-META.md`.

## 7. Variables de entorno

El archivo `.env` real viaja **solo** dentro del backup cifrado. Nunca se sube a
Git. Las variables principales:

- `DATABASE_URL` / `DIRECT_URL` (Supabase pooler 6543 / 5432).
- `APP_URL` (URL pública; en producción `https://tropigo-ai.vercel.app`).
- `ENCRYPTION_KEY` (64 hex; cifra credenciales y firma sesiones).
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `OPERATOR_PASSWORD`.
- `GEMINI_API_KEY`, `GEMINI_MULTIMODAL_MODEL`.
- `WHATSAPP_PROVIDER` (`META_CLOUD_API` recomendado; `BAILEYS_QR` solo pruebas).
- `META_PHONE_NUMBER_ID`, `META_WABA_ID`, `META_SYSTEM_TOKEN`,
  `META_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET`.
- `GOOGLE_MAPS_API_KEY` (opcional; distancia real por carretera con Google Maps).
- `GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` (opcional; agendamiento automático en Google Calendar).

## 8. Backup y restauración

- `TropiGO-AI-completo-*.7z`: código + `.env` + datos exportados, cifrado con
  contraseña (AES-256, cabeceras cifradas). **No compartir.**
- `TropiGO-AI-codigo.zip`: solo código y documentación, sin secretos. Se puede
  subir a MediaFire o compartir.
- `LEEME-PRIMERO.txt`: pasos para la otra PC.
- `SHA256SUMS.txt`: checksums para verificar la descarga.

En la otra PC:

```bash
# 1. Extraer el 7z con 7-Zip (contraseña del backup)
# 2. Abrir la carpeta TropiGO-AI
npm install
npm run build
npm run dev
```

La base de datos ya está en Supabase; no hay que instalar PostgreSQL. Solo hay
que cambiar el número de WhatsApp cuando Meta lo entregue.

## 9. Seguridad

- No commitear `.env`, tokens, contraseñas ni claves.
- Si `ENCRYPTION_KEY` se filtra, rotarla en Vercel/Render y en `.env`. Las
  sesiones viejas quedan invalidadas.
- El repo puede ser público solo si no contiene secretos.
- No usar el número personal con Baileys si se quiere conservar.
- El modo oficial de Meta es la ruta recomendada para producción.

## 10. Próximos pasos sugeridos

1. Crear la app de Meta en la otra laptop y cargar credenciales.
2. Probar el número de prueba con `+591 57770679`.
3. Comprar el chip nuevo y migrar el `Phone Number ID`.
4. Cargar los QR reales de pago del negocio y el QR personal de cada rider.
5. Confirmar la tarifa por km (hoy 2 km incluidos y 2 Bs/km) y las coordenadas
   reales de la Plaza Principal.
6. Evaluar Render solo si se quiere el modo QR no oficial.
7. Evolucionar el demo a la app final tipo Yango/PedidosYa:
   - repartidores y seguimiento en tiempo real,
   - pagos QR/Tigo Money,
   - notificaciones push,
   - multi-zona y multi-ciudad.
