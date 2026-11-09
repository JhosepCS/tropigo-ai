import { prisma } from "../prisma";
import { encrypt, decrypt } from "../encryption";

export interface AIKeys {
  groqKey?: string;
  geminiKey?: string;
  cerebrasKey?: string;
  openRouterKey?: string;
}

/**
 * Obtiene las API Keys de los proveedores.
 * Prioridad 1: Variables de entorno del servidor (.env)
 * Prioridad 2: Claves cifradas en la base de datos Supabase (Integration model con encryptedCredentials)
 * NUNCA se expone texto plano al cliente.
 */
export async function getProviderKeys(): Promise<AIKeys> {
  const keys: AIKeys = {
    groqKey: process.env.GROQ_API_KEY || undefined,
    geminiKey: process.env.GEMINI_API_KEY || undefined,
    cerebrasKey: process.env.CEREBRAS_API_KEY || undefined,
    openRouterKey: process.env.OPENROUTER_API_KEY || undefined,
  };

  try {
    const integration = await prisma.integration.findUnique({
      where: { provider: "ai_keys" },
    });

    if (integration?.encryptedCredentials) {
      const decrypted = decrypt(integration.encryptedCredentials);
      if (decrypted) {
        try {
          const parsed = JSON.parse(decrypted);
          if (!keys.groqKey && parsed.groq) keys.groqKey = parsed.groq;
          if (!keys.geminiKey && parsed.gemini) keys.geminiKey = parsed.gemini;
          if (!keys.cerebrasKey && parsed.cerebras) keys.cerebrasKey = parsed.cerebras;
          if (!keys.openRouterKey && parsed.openrouter) keys.openRouterKey = parsed.openrouter;
        } catch {
          // Si no es JSON, es una clave Groq directa histórica
          if (!keys.groqKey) keys.groqKey = decrypted;
        }
      }
    }
  } catch (err) {
    console.warn("No se pudieron cargar credenciales desde Supabase:", err);
  }

  return keys;
}

/**
 * Guarda las claves API cifradas en Supabase de forma segura.
 * Nunca almacena texto plano.
 */
export async function saveProviderKeys(newKeys: Partial<AIKeys>): Promise<void> {
  const currentKeys = await getProviderKeys();
  const merged = {
    groq: newKeys.groqKey !== undefined ? (newKeys.groqKey.trim() || undefined) : currentKeys.groqKey,
    gemini: newKeys.geminiKey !== undefined ? (newKeys.geminiKey.trim() || undefined) : currentKeys.geminiKey,
    cerebras: newKeys.cerebrasKey !== undefined ? (newKeys.cerebrasKey.trim() || undefined) : currentKeys.cerebrasKey,
    openrouter: newKeys.openRouterKey !== undefined ? (newKeys.openRouterKey.trim() || undefined) : currentKeys.openRouterKey,
  };

  const encryptedJson = encrypt(JSON.stringify(merged));

  const metadata = {
    hasGroq: !!merged.groq,
    hasGemini: !!merged.gemini,
    hasCerebras: !!merged.cerebras,
    hasOpenRouter: !!merged.openrouter,
    updatedAt: new Date().toISOString(),
  };

  await prisma.integration.upsert({
    where: { provider: "ai_keys" },
    update: {
      encryptedCredentials: encryptedJson,
      status: "connected",
      settingsJson: JSON.stringify(metadata),
    },
    create: {
      provider: "ai_keys",
      name: "Proveedores de IA Multimodelo TropiGO",
      status: "connected",
      encryptedCredentials: encryptedJson,
      settingsJson: JSON.stringify(metadata),
    },
  });
}

/**
 * Devuelve las claves enmascaradas para visualización segura en el CRM.
 * Si la clave no existe, retorna undefined.
 */
export function maskKey(key?: string): string | undefined {
  if (!key || key.trim().length === 0) return undefined;
  const clean = key.trim();
  if (clean.length <= 8) return "••••••••";
  return `••••••••${clean.slice(-4)}`;
}
