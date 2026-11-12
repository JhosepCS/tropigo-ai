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
- Delivery por zona + distancia desde la **Plaza Principal de Ivirgarzama**:
  la tarifa de la zona se suma a un recargo por km adicional (2 km incluidos
  y 2 Bs/km por defecto, configurable). Si el cliente comparte GPS normal o en
  tiempo real, se estima la ruta y el ETA; la última ubicación queda guardada
  en su perfil para no pedirla de nuevo.
- Comprobantes de pago por foto: Gemini Vision extrae monto, billetera,
  referencia y titular. El pago se verifica automáticamente solo si el monto y
  el titular/cuenta coinciden; en caso contrario queda `PENDIENTE` para que un
  operador lo revise.
- QR personal de cobro del repartidor: se carga en **Repartidores** y aparece
  en `/pagar/[id]` cuando el pedido tiene rider asignado. El cliente puede
  pagar por cualquier billetera y enviar la foto del comprobante.
- Asignación automática de repartidor al pasar un pedido a `LISTO_RECOJO`
  (activable en Ajustes); elige el rider activo y disponible con menos
  entregas. Si no hay ninguno, el pedido queda para asignación manual.
- Herramientas IA nuevas: `consultar_mis_pagos` y `solicitar_ubicacion`
  (botón nativo de ubicación de WhatsApp).
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
9. El delivery se cobra por zona + distancia desde la Plaza Principal. Por
   defecto: 2 km incluidos y 2 Bs/km adicional. Se configura desde Ajustes; el
   centro (nombre y coordenadas) también es editable.
10. Los pagos digitales se verifican automáticamente solo si el comprobante
    coincide en monto y titular/cuenta; el resto queda pendiente para revisión
    manual desde el CRM. No se integran APIs de billeteras.
11. El QR personal del repartidor se muestra en el enlace de pago del pedido;
    el cliente puede pagar por cualquier billetera y enviar la foto del
    comprobante por WhatsApp.
12. La asignación de riders es automática al pasar a `LISTO_RECOJO` si
    `autoAssignRiders` está activo; se mantiene la asignación manual como
    respaldo.

## Estructura de datos importante

- `BusinessProfile`: nombre, teléfono, tarifas, fidelidad, `loyaltyCountRides`,
  `loyaltyDoubleStampsUntil`, `paymentMethodsJson`, `deliveryIncludedKm`,
  `deliveryPerKmFee`, `deliveryCenterName`, `deliveryCenterLatitude`,
  `deliveryCenterLongitude`, `autoAssignRiders`.
- `Customer`: teléfono, nombre, `loyaltyCode`, `loyaltyStamps`,
  `loyaltyTotalEarned`, `loyaltyRewardsRedeemed`, `totalRides`,
  `savedLatitude`, `savedLongitude`, `lastLocationLabel`.
- `Order`: pedido, estado (`ENTREGADO`), `loyaltyRewardApplied`,
  `loyaltyStampsAwarded`, `distanceKm`, `distanceSurcharge`.
- `OrderQuote`: cotización, `distanceKm`, `distanceSurcharge`.
- `Rider`: `currentLatitude`, `currentLongitude`, `lastLocationAt`,
  `paymentQrJson` (QR personal de cobro).
- `PaymentRecord`: `methodId` (incluye `rider-qr`), `reference`,
  `reportedByCustomer`, `verificationStatus`, `receiptAnalysisJson`.
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
  base, recargo torito, delivery por distancia (centro de reparto, km incluidos
  y recargo por km), asignación automática de riders, fidelidad (activo, sellos
  requeridos, texto del premio, envío gratis, contar carreras, sellos dobles) y
  métodos de pago con QR/datos de cuenta.
- **Zonas:** tarifas de delivery y mototaxi por zona.
- **Canales:** credenciales de Meta Cloud API y tarjeta QR de Baileys.
- **Fidelidad:** lista de clientes, tarjeta, QR, nivel, historial, agregar sello
  y canjear premio.
- **Repartidores:** QR personal de cobro por rider (billetera, titular, número,
  imagen del QR) y estado de disponibilidad.
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
   consulta por código, SSE protegido, tarjeta pública, pagos, comprobantes,
   QR del rider y seguimiento.
6. Cargar los QR reales de Altoke, Yape, ZAS, Tigo Money y bancos en Ajustes, y
   el QR personal de cobro de cada rider en **Repartidores**.
7. Confirmar con el negocio la tarifa exacta por km (hoy 2 km incluidos y
   2 Bs/km) y las coordenadas reales de la Plaza Principal.
8. Evolucionar a la app final: notificaciones push, multi-ciudad y más
   integraciones de pago.

## Problemas conocidos y cuidados

- El baseline `prisma/migrations/20261110000000_init` contiene bytes nulos y
  falla en Prisma Dev local; en Supabase ya está aplicado. No recrear la base
  desde cero sin revisar ese archivo.
- Las migraciones `20261112150000_customer_ai_distance_payments` y
  `20261112170000_fix_delivery_center_defaults` ya están aplicadas en Supabase.
  No volver a ejecutarlas a mano.
- La verificación automática de comprobantes es conservadora: exige monto y
  titular/cuenta coincidentes. Si el cliente paga desde una cuenta de un
  tercero, el pago quedará pendiente para revisión manual.
- Las ubicaciones en tiempo real de WhatsApp llegan como varios mensajes
  seguidos; el webhook guarda todas, pero responde solo a la primera de una
  ráfaga de 90 segundos para no repetir mensajes.
- No ejecutar `prisma migrate reset` ni `npm run db:seed` sobre datos reales.
- `APP_URL` en `.env` local es `http://localhost:3000`; en Vercel debe ser la
  URL pública para que los QR apunten bien.
- El worker Baileys puede bloquear el número; usarlo solo con un número
  desechable.
- El modo oficial de Meta no usa QR.
- Si se rota `ENCRYPTION_KEY`, las credenciales cifradas viejas dejan de poder
  descifrarse y las sesiones se invalidan.
