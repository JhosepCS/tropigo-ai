const DEV_FALLBACK_SECRET = "tropigo-dev-only-insecure-session-secret-change-me";

/**
 * Secreto usado para firmar y verificar las sesiones JWT.
 *
 * En produccion es obligatorio definir ENCRYPTION_KEY. El respaldo solo
 * existe para desarrollo local y nunca debe usarse en un despliegue real.
 */
export function getSessionSecret(): Uint8Array {
  const envKey = process.env.ENCRYPTION_KEY;

  if (!envKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ENCRYPTION_KEY es obligatoria en produccion para firmar las sesiones."
      );
    }
    return new TextEncoder().encode(DEV_FALLBACK_SECRET);
  }

  return new TextEncoder().encode(envKey);
}
