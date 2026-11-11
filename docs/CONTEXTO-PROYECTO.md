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

## Estructura de datos importante

- `BusinessProfile`: nombre, teléfono, tarifas, fidelidad, `loyaltyCountRides`.
- `Customer`: teléfono, nombre, `loyaltyCode`, `loyaltyStamps`,
  `loyaltyTotalEarned`, `loyaltyRewardsRedeemed`, `totalRides`.
- `Order`: pedido, estado (`ENTREGADO`), `loyaltyRewardApplied`,
  `loyaltyStampsAwarded`.
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
  base, recargo torito, fidelidad (activo, sellos requeridos, texto del premio,
  envío gratis, contar carreras).
- **Zonas:** tarifas de delivery y mototaxi por zona.
- **Canales:** credenciales de Meta Cloud API y tarjeta QR de Baileys.
- **Fidelidad:** lista de clientes, tarjeta, QR, agregar sello y canjear premio.

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
   consulta por código, SSE protegido y tarjeta pública.
6. Evolucionar a la app final: repartidores en tiempo real, pagos QR/Tigo
   Money, notificaciones, multi-ciudad.

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
