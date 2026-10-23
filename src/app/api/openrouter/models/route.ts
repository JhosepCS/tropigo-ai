import { NextRequest, NextResponse } from "next/server";

// Cache en memoria para 1 hora
let cachedModels: any[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hora

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  const now = Date.now();
  if (!forceRefresh && cachedModels && now - lastFetchTime < CACHE_DURATION_MS) {
    return NextResponse.json({
      success: true,
      cached: true,
      models: cachedModels,
    });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) {
      throw new Error(`OpenRouter API error: ${res.status}`);
    }

    const data = await res.json();
    const rawList: any[] = data.data || [];

    // Filtrar estrictamente solo modelos que soportan "tools"
    const toolModels = rawList
      .filter((m) => {
        const params = m.supported_parameters || [];
        return params.includes("tools");
      })
      .map((m) => {
        const promptPerToken = parseFloat(m.pricing?.prompt || "0");
        const completionPerToken = parseFloat(m.pricing?.completion || "0");

        const promptPer1M = promptPerToken * 1000000;
        const completionPer1M = completionPerToken * 1000000;

        const provider = m.id.split("/")[0] || "otros";

        return {
          id: m.id,
          name: m.name || m.id,
          provider,
          contextLength: m.context_length || 0,
          promptPricePer1M: promptPer1M,
          completionPricePer1M: completionPer1M,
          isFree: promptPer1M === 0 && completionPer1M === 0,
        };
      });

    cachedModels = toolModels;
    lastFetchTime = now;

    return NextResponse.json({
      success: true,
      cached: false,
      models: toolModels,
    });
  } catch (error: any) {
    console.error("Error al obtener modelos de OpenRouter:", error);
    // Si falla la red, devolver fallback con modelos populares con soporte tools
    const fallback = [
      {
        id: "anthropic/claude-haiku-5.5",
        name: "Claude Haiku 5.5",
        provider: "anthropic",
        contextLength: 200000,
        promptPricePer1M: 0.8,
        completionPricePer1M: 4.0,
        isFree: false,
      },
      {
        id: "anthropic/claude-3.5-haiku",
        name: "Claude 3.5 Haiku",
        provider: "anthropic",
        contextLength: 200000,
        promptPricePer1M: 0.8,
        completionPricePer1M: 4.0,
        isFree: false,
      },
      {
        id: "openai/gpt-4o-mini",
        name: "GPT-4o Mini",
        provider: "openai",
        contextLength: 128000,
        promptPricePer1M: 0.15,
        completionPricePer1M: 0.6,
        isFree: false,
      },
      {
        id: "google/gemini-2.0-flash-001",
        name: "Gemini 2.0 Flash",
        provider: "google",
        contextLength: 1048576,
        promptPricePer1M: 0.1,
        completionPricePer1M: 0.4,
        isFree: false,
      },
      {
        id: "meta-llama/llama-3.3-70b-instruct:free",
        name: "Llama 3.3 70B Instruct (Free)",
        provider: "meta-llama",
        contextLength: 131072,
        promptPricePer1M: 0,
        completionPricePer1M: 0,
        isFree: true,
      },
    ];

    return NextResponse.json({
      success: true,
      cached: false,
      models: fallback,
    });
  }
}
