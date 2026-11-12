/**
 * URL pública de la aplicación. Se usa para construir enlaces de pago,
 * seguimiento y tarjetas de fidelidad.
 */
export function getAppUrl(): string {
  const configured =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://tropigo-ai.vercel.app";
  return configured.replace(/\/+$/, "");
}
