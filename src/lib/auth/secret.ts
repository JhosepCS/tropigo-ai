const DEFAULT_SYSTEM_SECRET =
  "67c9116ce5c3183a63c3a76b8051c1e84e2363d001868fba7499472af342c860";

/**
 * Secreto usado para firmar y verificar las sesiones JWT.
 * Usa ENCRYPTION_KEY si existe, o el secreto de sistema por defecto.
 * Nunca lanza excepciones fatales para evitar bucles de login en despliegues.
 */
export function getSessionSecret(): Uint8Array {
  const envKey =
    process.env.ENCRYPTION_KEY?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    DEFAULT_SYSTEM_SECRET;

  return new TextEncoder().encode(envKey);
}
