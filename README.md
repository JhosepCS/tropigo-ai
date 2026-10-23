# 🦷 Atiende — Asistente de IA para WhatsApp y Web

**«Atiende»** es una aplicación diseñada para que agencias digitales instalen y configuren un asistente inteligente de atención al cliente para negocios locales (como la precargada **Clínica Dental Lumen** en Madrid). Atiende por WhatsApp y chat web, responde con la información oficial del negocio, agenda citas en Google Calendar, avisa al equipo y deriva la conversación a una persona cuando hace falta.

Toda la interfaz está en **español de España** y opera en la zona horaria **Europe/Madrid**. Todo se configura directamente desde el panel sin tocar código.

---

## 🛠️ Requisitos y Puesta en Marcha

Un solo comando arranca la base de datos local, la aplicación web y el worker:

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno (ya configuradas en .env para local)
cp .env.example .env

# 3. Arrancar la aplicación completa
npm run dev
```

La aplicación se levantará en:
👉 **[http://localhost:3000](http://localhost:3000)**

* **Usuario Administrador:** `admin@atiende.es`
* **Contraseña:** `AdminAtiende2025!`

---

## 🖥️ Las 9 Pantallas del Panel

1. **Resumen**: Interruptor general «Asistente encendido / en pausa», estado de canales (WhatsApp, Web Chat) e integraciones, métricas clave (conversaciones hoy/semana, citas creadas, conversaciones esperando persona, tiempo medio de respuesta) y registro de últimas acciones.
2. **Comportamiento**: Nombre del asistente, avatar, tono (*cercano*, *profesional*, *directo*), mensaje de bienvenida, horario semanal (L-V 09:00-14:00 y 16:00-20:00), política fuera de horario, casillas de pase a humano y botón «Ver el prompt completo» (modal de solo lectura con el prompt real compilado).
3. **Conocimiento**: Perfil del negocio (Clínica Dental Lumen), 8 servicios con duración y precios, 10 preguntas frecuentes (financiación, seguros, aparcamiento, niños, etc.), texto libre adicional y la herramienta **«Importar desde una web»** (descarga hasta 5 páginas internas, extrae contenido y la IA propone servicios y FAQs en JSON para guardar con un clic).
4. **Integraciones**: Catálogo de 6 tarjetas tipo App Store:
   - **Google Calendar**: Citas, huecos libres, reprogramación y cancelaciones.
   - **Gmail**: Confirmaciones por email y resumen diario al director.
   - **Google Sheets**: Sincronización automática de contactos.
   - **Slack**: Avisos de urgencias y citas creadas al canal del equipo.
   - **Stripe**: Cobro de señales para reserva de tratamientos.
   - **Webhooks Salientes**: Disparo de eventos firmados con HMAC hacia n8n/Make/Zapier.
5. **Canales**:
   - **WhatsApp**: Conexión QR en Baileys que se actualiza solo en tiempo real, persistente en disco y con auto-reconexión.
   - **Chat para tu Web**: Switch, color, mensaje de bienvenida, vista previa en directo, fragmento `<script>` embebible y página de demostración interactiva en **/demo**.
6. **Probar**: Simulador split-screen optimizado para vídeo: chat a la izquierda y **línea de tiempo de herramientas** a la derecha (detallando cada paso, parámetros y retornos), interruptor de «Modo seguro» y botón de nueva conversación.
7. **Conversaciones**: Bandeja de 2 columnas (lista y chat abierto), filtros (*Todas*, *Necesitan atención*, *WhatsApp*, *Web*), burbujas diferenciadas por rol, botón «Tomar el control» / «Devolver al asistente» y visor de herramientas usadas en cada mensaje.
8. **Actividad**: Historial de auditoría completo con filtros por integración y resultado (*Éxito*, *Simulado*, *Error*).
9. **Ajustes**: Timezone Europe/Madrid, catálogo dinámico de modelos de OpenRouter con soporte para herramientas (`tools`), estimador de coste mensual para 1.000 conversaciones, comprobador de saldo/clave, marca blanca de la agencia y usuarios.

---

## 🔒 Google Cloud OAuth Incremental

Google Calendar, Gmail y Google Sheets comparten un único cliente OAuth con autorización incremental (`include_granted_scopes: true`).
- **URL de retorno local:** `http://localhost:3000/api/integrations/google/callback`
- **Recomendación para producción:** Configurar la pantalla de consentimiento como **Externa** y publicada **«En producción»** para evitar que Google caduque los tokens a los 7 días.
