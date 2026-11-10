import { getProviderKeys } from "./key-manager";

export interface MultimodalResult {
  text: string;
  model?: string;
  error?: string;
}

const DEFAULT_MODEL = "gemini-3.1-flash-lite";

function candidateModels(): string[] {
  const configured = process.env.GEMINI_MULTIMODAL_MODEL?.trim();
  const models = [
    configured,
    DEFAULT_MODEL,
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
  ].filter(Boolean) as string[];
  return Array.from(new Set(models));
}

function normalizeMimeType(mimeType: string): string {
  return (mimeType || "application/octet-stream").split(";")[0].trim().toLowerCase();
}

function extensionForMime(mimeType: string): string {
  const mime = normalizeMimeType(mimeType);
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("heic")) return "heic";
  if (mime.includes("heif")) return "heif";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("ogg") || mime.includes("opus")) return "ogg";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("aac")) return "aac";
  if (mime.includes("flac")) return "flac";
  if (mime.includes("webm")) return "webm";
  return "bin";
}

async function callGemini(
  parts: any[],
  apiKey: string,
  options: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
): Promise<MultimodalResult> {
  const models = candidateModels();
  let lastError = "";

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? 45_000
    );

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              temperature: options.temperature ?? 0.15,
              maxOutputTokens: options.maxTokens ?? 900,
            },
          }),
        }
      );

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          detail = err?.error?.message || JSON.stringify(err);
        } catch {
          detail = await res.text().catch(() => detail);
        }

        lastError = `${model}: ${detail}`;

        // Cuota, saturación o modelo retirado: probar el siguiente modelo.
        if ([404, 429, 503].includes(res.status)) continue;

        // Clave inválida u otro error definitivo: no seguir intentando.
        return { text: "", model, error: detail };
      }

      const data = await res.json();
      const text = (data.candidates?.[0]?.content?.parts || [])
        .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
        .filter(Boolean)
        .join("\n")
        .trim();

      if (!text) {
        lastError = `${model}: respuesta vacía`;
        continue;
      }

      return { text, model };
    } catch (error: any) {
      lastError =
        error?.name === "AbortError"
          ? `${model}: tiempo de espera agotado`
          : `${model}: ${error?.message || String(error)}`;
    } finally {
      clearTimeout(timeout);
    }
  }

  return { text: "", error: lastError || "No se pudo procesar el archivo multimodal." };
}

/**
 * Analiza una imagen (foto de menú, comprobante, producto, dirección, etc.)
 * usando Gemini. Devuelve una descripción útil para el asistente.
 */
export async function analyzeImage(
  buffer: Buffer,
  mimeType: string,
  caption?: string
): Promise<MultimodalResult> {
  const keys = await getProviderKeys();
  if (!keys.geminiKey) {
    return { text: "", error: "GEMINI_API_KEY no configurada para analizar imágenes." };
  }
  if (!buffer || buffer.length === 0) {
    return { text: "", error: "La imagen llegó vacía." };
  }

  const prompt =
    "Eres el módulo de visión de TropiBot, asistente de delivery y movilidad de TropiGO en Ivirgarzama, Bolivia. " +
    "Analiza la imagen y describe de forma concisa y literal lo que ves. " +
    "Si es un menú o lista de precios, extrae los nombres de platos y precios exactos. " +
    "Si es un comprobante de pago o QR, indica el monto, banco y datos visibles. " +
    "Si es una dirección, referencia o mapa, transcribe las referencias y nombres de calles. " +
    "Si es un producto, indica qué producto es y cualquier detalle relevante. " +
    "No inventes datos que no aparezcan en la imagen. Responde en español." +
    (caption ? `\nEl cliente acompañó la imagen con este texto: "${caption}"` : "");

  return callGemini(
    [
      { text: prompt },
      {
        inlineData: {
          mimeType: normalizeMimeType(mimeType),
          data: buffer.toString("base64"),
        },
      },
    ],
    keys.geminiKey,
    { maxTokens: 900 }
  );
}

/**
 * Transcribe una nota de voz o archivo de audio usando Gemini.
 * Si Gemini falla y existe una clave Groq válida, intenta Whisper como respaldo.
 */
export async function transcribeAudio(
  buffer: Buffer,
  mimeType: string
): Promise<MultimodalResult> {
  if (!buffer || buffer.length === 0) {
    return { text: "", error: "El audio llegó vacío." };
  }

  const keys = await getProviderKeys();
  if (!keys.geminiKey) {
    return { text: "", error: "GEMINI_API_KEY no configurada para transcribir audio." };
  }

  const result = await callGemini(
    [
      {
        text:
          "Transcribe literalmente el audio en español. Es una nota de voz de un cliente de delivery en Ivirgarzama, Bolivia. " +
          "Puede incluir nombres de platos, direcciones, barrios, precios o confirmaciones. " +
          "Devuelve únicamente la transcripción, sin comentarios. Si el audio es ininteligible, escribe exactamente: [AUDIO_ININTELIGIBLE].",
      },
      {
        inlineData: {
          mimeType: normalizeMimeType(mimeType),
          data: buffer.toString("base64"),
        },
      },
    ],
    keys.geminiKey,
    { maxTokens: 700, temperature: 0.05 }
  );

  if (result.text && result.text !== "[AUDIO_ININTELIGIBLE]") {
    return result;
  }

  // Respaldo opcional con Groq Whisper. Solo se intenta si hay clave.
  if (keys.groqKey) {
    try {
      const form = new FormData();
      const bytes = new Uint8Array(buffer);
      form.append(
        "file",
        new Blob([bytes], { type: normalizeMimeType(mimeType) }),
        `audio.${extensionForMime(mimeType)}`
      );
      form.append("model", "whisper-large-v3");
      form.append("response_format", "json");
      form.append("language", "es");

      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${keys.groqKey}` },
        body: form,
      });

      if (res.ok) {
        const data = await res.json();
        const text = String(data.text || "").trim();
        if (text) return { text, model: "whisper-large-v3" };
      }
    } catch {
      // Ignorar: el error principal de Gemini ya se devuelve abajo.
    }
  }

  return result.text === "[AUDIO_ININTELIGIBLE]"
    ? { text: "", model: result.model, error: "El audio no se entiende con claridad." }
    : result;
}
