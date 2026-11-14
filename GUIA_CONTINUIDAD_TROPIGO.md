# 🚀 GUÍA MAESTRA DE CONTINUIDAD TÉCNICA: TROPIGO DELIVERY
**Fecha:** Noviembre 2026  
**Ecosistema:** TropiGO (Ivirgarzama / Trópico de Cochabamba, Bolivia)  
**Objetivo:** Continuar el desarrollo en tu nueva PC con 100% del contexto, código, arquitectura y herramientas de IA (Antigravity / OpenCode).

---

## 📌 1. ESTADO ACTUAL DEL PROYECTO Y REPOSITORIOS

### Repositorio Central (Backend, Base de Datos, IA y Dashboard):
* **GitHub:** [https://github.com/JhosepCS/tropigo-ai.git](https://github.com/JhosepCS/tropigo-ai.git)
* **Despliegue de Producción:** [https://tropigo-ai.vercel.app](https://tropigo-ai.vercel.app)
* **Credenciales de Acceso:** `admin@tropigo.bo` | `admin1234567`
* **Tecnologías:** Next.js 15, Prisma ORM, PostgreSQL (Supabase), Baileys (WhatsApp Bot), OpenRouter / Asistente IA, Tailwind CSS.

---

## 🔍 2. HALLAZGOS CLAVE DE LA INGENIERÍA INVERSA (REVERSE ENGINEERING)

### A. De PedidosYa (v10.43.8.3)
1. **Estructura de Menú y Categorías (`BOLocalGrid.json`):**
   * Grilla nativa adaptada a Bolivia: *Restaurantes, Mercados, Farmacias, Bebidas*.
   * Estructura de restaurante: `id`, `name`, `rating`, `deliveryTime` (min-max), `deliveryFee` (Bs), `imageUrl`, `categories`.
   * Estructura de producto: `id`, `name`, `description`, `price`, `imageUrl`, `optionGroups` (ej. Variación de pieza, salsas, tamaño de gaseosa).
2. **Flujo de Checkout y Carrito:**
   * Carrito flotante con cálculo en vivo de: `Subtotal + Costo de Envío por Zona + Descuento = Total (Bs)`.

### B. De Yango (v5.98.6)
1. **Uso de Flutter:** Yango utiliza Flutter para renderizar interfaces ultra fluidas a 60-120 FPS.
2. **Modelos de IA Integrados (Google ML Kit):**
   * `play-services-mlkit-text-recognition`: OCR local para escanear y digitalizar menús en papel de restaurantes locales sin escribirlos a mano.
   * `play-services-mlkit-barcode-scanning`: Escaneo de QR ultrarrápido para verificación de entrega entre repartidor y cliente.
   * `play-services-mlkit-face-detection`: Verificación de identidad facial para el inicio de turno de mototaxistas y repartidores.
3. **Cálculo de Tarifas Dinámicas:**
   * Modelo de distancia en `model-distance-calculations.json`: Tarifa base fija + incremento por kilómetro recorrido.

---

## 🏗️ 3. ARQUITECTURA DE LA PLATAFORMA COMPLETA (4 COMPONENTES)

```
                                  ┌──────────────────────────────────────────────┐
                                  │           BACKEND CENTRAL (Next.js)          │
                                  │      Repo: JhosepCS/tropigo-ai.git           │
                                  │         PostgreSQL en Supabase               │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                ┌────────────────────────┬───────────────┴───────────────┬────────────────────────┐
                ▼                        ▼                               ▼                        ▼
       [ APP CLIENTE ]          [ APP REPARTIDOR ]              [ PANEL COMERCIO ]        [ PANEL ADMIN ]
        (APK Flutter)             (APK Flutter)                 (Web Móvil/Tablet)       (Web en Jarvis)
    • Banners & Ofertas      • Timbre fuerte de pedido         • Notificación sonora    • Monitoreo global
    • Menús con fotos        • Botón Aceptar / Rechazar        • Gestión de inventario  • Asignación de zonas
    • Carrito flotante       • Ruta GPS al local y cliente     • Cambiar precios/platos • Liquidación motos
    • Pago QR Boliviano      • Confirmar entrega con QR        • Despachar pedido       • Configuración IA
```

---

## 🛠️ 4. PASO A PASO PARA RESTAURAR EN TU NUEVA COMPUTADORA

### Requisitos Previos a Instalar en la Nueva PC:
1. **Git:** Descargar e instalar desde [git-scm.com](https://git-scm.com).
2. **Node.js (v20 o v22 LTS):** Descargar desde [nodejs.org](https://nodejs.org).
3. **Flutter SDK:** Descargar desde [flutter.dev](https://flutter.dev) (si deseas compilar la APK nativa) + Android Studio.
4. **VS Code o Antigravity / OpenCode.**

### Pasos de Configuración:
```bash
# 1. Clonar el proyecto principal
git clone https://github.com/JhosepCS/tropigo-ai.git TropiGO
cd TropiGO

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (.env)
# Copia las claves de Supabase, JWT y OpenRouter en tu archivo .env local

# 4. Probar el servidor en desarrollo
npm run dev
```

---

## 🤖 5. PROMPT MAESTRO PARA PEGAR EN TU NUEVA PC (Antigravity u OpenCode)

Copia y pega el siguiente bloque de texto en el chat de tu IA cuando abras el proyecto en la nueva computadora:

```markdown
Hola Antigravity / Asistente. Estoy continuando el desarrollo de **TropiGO**, la plataforma de delivery y movilidad para el Trópico de Cochabamba (Ivirgarzama, Bolivia).

**Contexto del Proyecto:**
- Repositorio backend: https://github.com/JhosepCS/tropigo-ai.git (Next.js 15, Prisma ORM, PostgreSQL Supabase, APIs listas para orders, comercio, repartidor y zonas).
- Despliegue en producción: https://tropigo-ai.vercel.app
- El objetivo actual es: FASE 1 - DELIVERY DE COMIDA AL 100%.
- Queremos construir la App Cliente y App Repartidor (estilo PedidosYa / Yango) en Flutter o Capacitor, 100% gratuita y consumiendo las APIs existentes de este repositorio.

Por favor, revisa el archivo GUIA_CONTINUIDAD_TROPIGO.md para conocer los endpoints y requerimientos, y ayúdame con el siguiente paso: [indica aquí la pantalla o función que quieras desarrollar].
```

---

## 📋 6. CHECKLIST DE MIGRACIÓN ANTES DE APAGAR ESTA LAPTOP

- [x] Cambios de código respaldados y commiteados a Git.
- [x] Push realizado al repositorio remoto `JhosepCS/tropigo-ai.git`.
- [x] Documento maestro `GUIA_CONTINUIDAD_TROPIGO.md` generado en la raíz.
- [ ] Subir la carpeta de las APKs descompiladas (`PedidosYa` y `Yango`) a tu Google Drive / OneDrive personal en formato ZIP si deseas conservar los assets gráficos originales (logos, iconos y json).
