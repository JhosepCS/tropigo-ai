# 🛵 Tropigo Delivery (Ivirgarzama) - Sistema de Pedidos con IA & WhatsApp Dual-Engine

Sistema integral de atención automatizada de pedidos por WhatsApp (Dual-Engine: **Meta Cloud API Oficial** y **Baileys QR Local**), KDS en vivo para despacho, tarifas geográficas en Bolivianos (Bs.), transcripción de notas de voz de clientes (Whisper) y gestión de comercios afiliados en **Ivirgarzama (Trópico de Cochabamba, Bolivia)**.

---

## 🚀 Arquitectura Dual-Process

El sistema desacopla por completo la interfaz web del motor de mensajería y la IA:
1. **`web`**: Next.js 15 App Router con diseño limpio y moderno inspirado en *Untitled UI*. KDS de despacho en vivo, chat unificado con toma de control humano, webhooks oficiales de Meta con verificación criptográfica SHA-256 y API REST.
2. **`worker`**: Proceso Node.js persistente que mantiene el socket de Baileys, procesa notas de voz con Whisper y ejecuta tareas de despacho en segundo plano.

---

## 🛠️ Puesta en marcha en local

Sin necesidad de tener Docker instalado en tu máquina local:

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno (ya configuradas por defecto en .env)
cp .env.example .env

# 3. Levantar la base de datos local y sincronizar el esquema
npm run db:push
npm run db:seed

# 4. Arrancar la aplicación completa (DB local + Web + Worker)
npm run dev
```

La aplicación quedará disponible de inmediato en:
👉 **http://localhost:3000**

- **Usuario Admin:** `admin@tropigo.bo`
- **Contraseña:** `AdminTropigo2025!`

---

## 📲 Configuración del Canal WhatsApp (Dual-Engine)

En la pantalla **Canal WhatsApp** del panel puedes alternar entre dos motores sin tocar código:

1. **Baileys (Conexión QR Local)**:
   - Para desarrollo o pruebas locales sin cuenta comercial de Meta.
   - Buffer inteligente de 8 segundos para agrupar mensajes.
   - Indicador de «escribiendo...» automático.

2. **Meta Cloud API (API Oficial)**:
   - Conexión oficial directa mediante la Graph API de Meta (`v21.0`).
   - Webhook validado con firma criptográfica `X-Hub-Signature-256`.
   - Soporte para botones interactivos, listas de menú y solicitud de ubicación GPS.
   - URL de Webhook: `https://[TU-DOMINIO]/api/webhooks/meta`
   - Token de Verificación: `tropigo_verify_token_2025`

---

## 🔒 Seguridad y Cifrado
Todos los tokens permanentes de Meta y API keys se almacenan cifrados con **AES-256-GCM** en la base de datos utilizando la variable `ENCRYPTION_KEY`.
