# 📱 Configurar WhatsApp oficial de Meta (Cloud API)

Esta guía deja el asistente operando con la **API oficial de WhatsApp** y explica cómo probar gratis con el número de prueba de Meta antes de comprar el chip nuevo.

> **Importante:** el modo oficial **no usa QR**. El QR pertenece a Baileys (no oficial) y puede hacer que WhatsApp bloquee el número. Para producción usa siempre Cloud API.

---

## 1. Lo que necesitas

- Una cuenta de Facebook/Meta.
- Una cuenta de **Meta Business** (Business Suite).
- Un número de teléfono que **no esté en uso con WhatsApp** (para producción).
- Para probar ya: el **número de prueba** que Meta regala al crear la app.

### ¿Puedo usar mi +591 57770679?

No directamente si ese número ya tiene WhatsApp activo. Meta no permite registrar un número que esté en uso con WhatsApp, salvo que:

- borres la cuenta de WhatsApp de ese número (pierdes el WhatsApp normal), o
- uses **coexistencia** con la app WhatsApp Business, que requiere ser Tech Provider/Solution Partner y usar Embedded Signup v4/v5. El botón de coexistencia del CRM actual **no cumple** esos requisitos.

**Recomendación:** deja `+591 57770679` para tu uso personal y compra un chip nuevo para TropiGO. El chip nuevo trae un número nuevo; no se “vincula” al número personal.

---

## 2. Probar gratis con el número de prueba de Meta

El número de prueba es gratis, pero **solo puede escribir a 5 números verificados**. Sirve para probar el flujo completo antes de comprar el chip.

1. Entra a <https://developers.facebook.com/apps>.
2. **Create App** → caso de uso **“Connect with customers through WhatsApp”**.
3. Selecciona tu cuenta de Meta Business.
4. En **API Setup** verás:
   - un **número de prueba** de Meta,
   - el **Phone Number ID**,
   - el **WABA ID** (WhatsApp Business Account ID),
   - un **token temporal**.
5. En **To → Manage phone number list**, agrega tu `+591 57770679` como destinatario y verifica el código que te llega por WhatsApp.
6. Copia el **Phone Number ID** y el **WABA ID**.

> El número de prueba es de Meta, no tuyo. No sirve para clientes reales y no se puede usar con Baileys.

---

## 3. Guardar las credenciales en el CRM

1. Entra a `https://tropigo-ai.vercel.app/login`.
2. Ve a **Canales → Credenciales Oficiales Cloud API**.
3. Pega:
   - **Phone Number ID**
   - **WABA ID**
   - **System User Token** (puedes empezar con el token temporal)
   - **App ID** y **App Secret** (opcionales, pero recomendados)
   - **Verify Token:** `tropigo_verify_token_2025`
4. Pulsa **“Guardar Credenciales y Probar Conexión”**.

El CRM valida los datos contra Meta y muestra el estado de la conexión. **No envíes el token por chat**; pégalo directamente en el CRM. Se guarda cifrado con AES-256-GCM.

---

## 4. Configurar el webhook

En Meta → tu app → **WhatsApp → Configuration → Webhook**:

- **Callback URL:** `https://tropigo-ai.vercel.app/api/channels/whatsapp/webhook`
- **Verify Token:** `tropigo_verify_token_2025`
- **Webhook fields:** suscríbete a **`messages`**.

El endpoint ya está publicado y responde al challenge de Meta. Si cambias el verify token en el CRM, actualízalo también en Meta.

---

## 5. Probar

1. Desde tu WhatsApp (`+591 57770679`) escribe al número de prueba.
2. El asistente debe responder con texto.
3. Prueba también una foto y una nota de voz.
4. Si no responde:
   - revisa que el destinatario esté verificado,
   - revisa que el webhook esté suscrito a `messages`,
   - revisa los logs de Vercel,
   - confirma que el token no haya expirado.

---

## 6. Token permanente (recomendado)

El token temporal expira. Para producción crea un **System User Token**:

1. Meta Business Settings → **Users → System Users**.
2. Crea un usuario del sistema (o usa uno existente).
3. Asígnale:
   - tu app,
   - tu cuenta de WhatsApp (WABA).
4. Genera un token con estos permisos:
   - `business_management`
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Pega el token en el CRM y guarda.

---

## 7. Pasar del número de prueba al chip nuevo

Cuando tengas el chip:

1. En Meta → tu app → **API Setup → Add phone number**.
2. Ingresa el número nuevo. Debe **no tener WhatsApp activo**.
3. Verifica el código por SMS o llamada.
4. Define un **PIN de 6 dígitos** y guárdalo.
5. Copia el nuevo **Phone Number ID** (el WABA ID suele ser el mismo).
6. En el CRM → **Canales**, actualiza el **Phone Number ID** y guarda.
7. El webhook y el token permanente se mantienen.
8. Escribe desde otro teléfono al número nuevo y prueba.

No necesitas Render para esta ruta. El webhook vive en Vercel.

---

## 8. Límites, costos y buenas prácticas

- **Número de prueba:** gratis, solo 5 destinatarios verificados.
- **Producción:** Meta da **1,000 mensajes de servicio gratis al mes** por número; después cobra por mensaje. Bolivia está en la región “Resto de Latinoamérica”.
- Los mensajes **del cliente al negocio no se cobran**.
- Agrega un método de pago en **Billing Hub** antes de pasar a producción.
- No uses el número personal para el bot si no quieres arriesgarlo.
- No compartas tokens ni el App Secret. El CRM los cifra, pero el `.env` y los backups de secretos deben guardarse aparte.

---

## 9. Coexistencia (avanzado)

La coexistencia permite usar la app **WhatsApp Business** y la Cloud API con el mismo número. Requiere:

- ser Tech Provider/Solution Partner,
- Embedded Signup v4/v5,
- cumplir los requisitos de Meta.

El botón de coexistencia del CRM es solo una referencia y **no** completa ese flujo. Si más adelante quieres migrar tu número personal, primero investiga la coexistencia con un partner oficial; no borres tu WhatsApp sin respaldo.

---

## 10. Solución de problemas

| Problema | Causa probable | Solución |
|---|---|---|
| El webhook no verifica | Verify Token distinto | Usa `tropigo_verify_token_2025` en Meta y en el CRM |
| Meta dice “number already in use” | El número tiene WhatsApp activo | Usa un número nuevo o borra la cuenta de WhatsApp de ese número |
| No llegan mensajes | Webhook sin `messages` | Suscríbete al campo `messages` |
| El asistente no responde | Token vencido o sin permisos | Genera un System User Token permanente |
| Error de firma | App Secret distinto | Copia el App Secret correcto en el CRM |
| Solo funciona con 5 números | Estás en el número de prueba | Agrega el número real y verifica la empresa |

---

## Enlaces útiles

- Panel: <https://tropigo-ai.vercel.app>
- Meta for Developers: <https://developers.facebook.com/apps>
- Documentación de precios: <https://developers.facebook.com/docs/whatsapp/pricing>
- Documentación de números: <https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers>
