import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

const DEV_FALLBACK_KEY = "tropigo-dev-only-insecure-encryption-key-change-me";

function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;

  if (!envKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ENCRYPTION_KEY es obligatoria en produccion. Configura una clave de 64 caracteres hexadecimales."
      );
    }
    return crypto.createHash("sha256").update(DEV_FALLBACK_KEY).digest();
  }

  if (envKey.length === 64) {
    return Buffer.from(envKey, "hex");
  }
  return crypto.createHash("sha256").update(envKey).digest();
}

/**
 * Cifra un texto utilizando AES-256-GCM
 */
export function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  
  // Formato: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Descifra un texto encriptado con AES-256-GCM
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return "";
  try {
    const parts = encryptedData.split(":");
    if (parts.length !== 3) return "";
    
    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("Error al descifrar datos:", error);
    return "";
  }
}
