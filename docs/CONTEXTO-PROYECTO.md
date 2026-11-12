# Contexto del proyecto TropiGO AI

Documento de continuidad para retomar el proyecto en otra PC con OpenCode,
Antigravity u otro agente. No contiene contraseñas ni tokens.

## Resumen ejecutivo

TropiGO AI es un demo funcional de asistente de delivery y mototaxi para
Ivirgarzama. El objetivo inmediato es operar con **WhatsApp oficial de Meta**,
fidelizar clientes con una tarjeta de sellos y QR, y dejar una base portable
para evolucionar a una app tipo Yango/PedidosYa en el Trópico de Cochabamba.

## Lo que ya está hecho

### Producto

- Panel CRM con login, pedidos, clientes, comercios, catálogo, zonas, tarifas,
  repartidores, conversaciones, fidelidad, ajustes y canales.
- Chat web aislado por sesión.
- Webhook de WhatsApp oficial de Meta con texto, imágenes, audios y ubicaciones.
- IA con herramientas conectadas a la base de datos (catálogo, precios, zonas,
  tarifas, pedidos, memoria, fidelidad, derivación a humano).
- Fidelidad:
  - tarjeta con 10.º pedido gratis configurable;
  - QR personal `TGO-XXXXXXXX`;
  - página pública `/fidelidad/[code]`;
  - sellos por pedidos entregados;
  - sellos opcionales por carreras finalizadas;
  - consulta por WhatsApp y por código/QR;
  - lectura de QR desde fotos con `jsqr` + `sharp`;
  - canje automático en la cotización y canje manual desde el CRM.
- Tarifas de mototaxi configurables (mínimo 10 Bs.) y recargo de torito.
- Delivery por distancia real: distancia estimada por ruta, ETA y recargo
  opcional por km adicional.
- Pagos digitales configurables: efectivo, QR Simple, Tigo Money, Altoke, Yape,
  ZAS y transferencia. Página pública `/pagar/[id]` y reporte de pago.
- Seguimiento en vivo `/seguimiento/[id]` con mapa de Google sin API key y GPS
  del repartidor desde su panel.
- Fidelidad mejorada: sellos dobles temporales, niveles Bronce/Plata/Oro,
  historial reciente y contexto proactivo para la IA.
- Modo QR no oficial con Baileys y worker para Render (opcional).

### Infraestructura

- Supabase (PostgreSQL) con migraciones Prisma.
- Vercel para el panel y el webhook.
- Gemini gratuito para texto, visión y audio.
- Repositorio público en GitHub.
- `ENCRYPTION_KEY` rotada después de hacer público el repo; los deployments
  viejos de Vercel fueron eliminados.
- Contraseña admin cambiada a la definida en `.env`.

## Decisiones tomadas

1. **Meta Cloud API oficial** es la ruta principal. No requiere Render.
2. El número de prueba de Meta sirve para probar ya, con hasta 5 destinatarios
   verificados.
3. El número personal `+591 57770679` no se debe borrar de WhatsApp; para
   producción se recomienda un chip nuevo.
4. Baileys/Render queda como respaldo para pruebas con un número desechable.
5. La fidelidad cuenta pedidos `ENTREGADO`. Las carreras `FINALIZADO` suman
   sellos solo si `loyaltyCountRides` está activo (por defecto sí).
6. El premio es un pedido gratis; el envío se cobra aparte salvo que
   `loyaltyRewardFreeDelivery` esté activo.
7. El backup completo va cifrado con contraseña. El código sin secretos puede
   compartirse por separado.
8. Google Maps se integra con iframe embed sin API key para evitar costos.
9. El recargo por distancia es opcional (`deliveryPerKmFee = 0` por defecto)
   para no romper las tarifas fijas por zona.
10. Los pagos digitales se verifican manualmente desde el CRM; el cliente solo
    reporta el pago con su número de transacción.

## Estructura de datos importante

- `BusinessProfile`: nombre, teléfono, tarifas, fidelidad, `loyaltyCountRides`,
  `loyaltyDoubleStampsUntil`, `paymentMethodsJson`, `deliveryIncludedKm`,
  `deliveryPerKmFee`.
- `Customer`: teléfono, nombre, `loyaltyCode`, `loyaltyStamps`,
  `loyaltyTotalEarned`, `loyaltyRewardsRedeemed`, `totalRides`.
- `Order`: pedido, estado (`ENTREGADO`), `loyaltyRewardApplied`,
  `loyaltyStampsAwarded`, `distanceKm`, `distanceSurcharge`.
- `OrderQuote`: cotización, `distanceKm`, `distanceSurcharge`.
- `Rider`: `currentLatitude`, `currentLongitude`, `lastLocationAt`.
- `PaymentRecord`: `methodId`, `reference`, `reportedByCustomer`,
  `verificationStatus`.
- `RideTrip`: carrera, estado (`FINALIZADO`), `loyaltyStampsAwarded`.
- `LoyaltyEvent`: historial de sellos, reservas, canjes y restauraciones.
  Tiene `orderId` y `rideId` para idempotencia.

## Flujo de fidelidad

1. El cliente pide por WhatsApp o web.
2. Al confirmar un pedido, si tiene premio disponible, se reserva y se aplica
   el descuento en la cotización.
3. Al pasar el pedido a `ENTREGADO`, se sella (o se marca el premio como
   canjeado si el pedido era el premio).
4. Si el pedido se cancela antes de entregarse, se restauran los sellos.
5. Si una carrera pasa a `FINALIZADO` y `loyaltyCountRides` está activo, se
   suma un sello con idempotencia por `rideId`.
6. La IA consulta la tarjeta por el cliente de la conversación o por el código
   del QR. Nunca revela teléfono ni datos de contacto de otra tarjeta.

## Configuración desde el panel

- **Ajustes → Datos Generales & Empresa:** tarifa mínima de mototaxi, tarifa
  base, recargo torito, delivery por distancia (km incluidos y recargo por km),
  fidelidad (activo, sellos requeridos, texto del premio, envío gratis, contar
  carreras, sellos dobles) y métodos de pago con QR/datos de cuenta.
- **Zonas:** tarifas de delivery y mototaxi por zona.
- **Canales:** credenciales de Meta Cloud API y tarjeta QR de Baileys.
- **Fidelidad:** lista de clientes, tarjeta, QR, nivel, historial, agregar sello
  y canjear premio.
- **Repartidor:** pedidos asignados, mapa de Google y botón para compartir GPS.

## Producción

- URL: https://tropigo-ai.vercel.app
- Webhook Meta: https://tropigo-ai.vercel.app/api/channels/whatsapp/webhook
- Verify token: `tropigo_verify_token_2025`
- Proyecto Vercel: `tropigo-ai`
- Supabase ref: `fwtcjeyccyxmfkypbrmc` (pooler us-east-1)
- Repo: https://github.com/JhosepCS/tropigo-ai

## Pendientes

1. Crear la app de Meta en la otra laptop y cargar las credenciales.
2. Probar el número de prueba con el teléfono personal.
3. Comprar el chip nuevo y migrar el `Phone Number ID`.
4. Opcional: crear el worker de Render para el modo QR no oficial.
5. Probar en producción: login, fidelidad, QR, lectura de QR por WhatsApp,
   consulta por código, SSE protegido, tarjeta pública, pagos y seguimiento.
6. Cargar los QR reales de Altoke, Yape, ZAS, Tigo Money y bancos en Ajustes.
7. Evolucionar a la app final: notificaciones push, multi-ciudad y más
   integraciones de pago.

## Problemas conocidos y cuidados

- El baseline `prisma/migrations/20261110000000_init` contiene bytes nulos y
  falla en Prisma Dev local; en Supabase ya está aplicado. No recrear la base
  desde cero sin revisar ese archivo.
- No ejecutar `prisma migrate reset` ni `npm run db:seed` sobre datos reales.
- `APP_URL` en `.env` local es `http://localhost:3000`; en Vercel debe ser la
  URL pública para que los QR apunten bien.
- El worker Baileys puede bloquear el número; usarlo solo con un número
  desechable.
- El modo oficial de Meta no usa QR.
- Si se rota `ENCRYPTION_KEY`, las credenciales cifradas viejas dejan de poder
  descifrarse y las sesiones se invalidan.
