/**
 * URL base del worker de WhatsApp (Baileys).
 *
 * En local se usa 127.0.0.1. En producción el worker vive en Render, por lo
 * que el CRM (Vercel) no puede usar loopback. Se puede sobreescribir con
 * WORKER_URL o WHATSAPP_WORKER_URL.
 */
export function getWorkerBaseUrl(): string {
  const explicit =
    process.env.WORKER_URL?.trim() ||
    process.env.WHATSAPP_WORKER_URL?.trim();

  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    return "https://tropigo-whatsapp-worker.onrender.com";
  }

  return `http://127.0.0.1:${process.env.WORKER_PORT || 3001}`;
}
