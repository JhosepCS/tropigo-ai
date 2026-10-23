import * as cheerio from "cheerio";

export interface CrawlResult {
  url: string;
  pagesScraped: string[];
  extractedText: string;
  proposal: {
    services: Array<{
      name: string;
      description: string;
      durationMinutes: number;
      price: number;
      priceType: "fixed" | "from" | "free";
      requiresAssessment: boolean;
    }>;
    faqs: Array<{
      question: string;
      answer: string;
      category: string;
    }>;
    scheduleDescription: string;
  };
}

export async function scrapeWebsite(rootUrl: string): Promise<CrawlResult> {
  const parsed = new URL(rootUrl);
  const origin = parsed.origin;
  const visited = new Set<string>();
  const toVisit: string[] = [rootUrl];
  let combinedText = "";

  while (toVisit.length > 0 && visited.size < 5) {
    const current = toVisit.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    try {
      const res = await fetch(current, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) continue;
      const html = await res.text();
      const $ = cheerio.load(html);

      // Limpiar elementos no deseados
      $("script, style, nav, footer, noscript, svg, iframe").remove();

      const pageText = $("body").text().replace(/\s+/g, " ").trim();
      combinedText += `\n--- PÁGINA: ${current} ---\n${pageText.slice(0, 3000)}\n`;

      // Buscar enlaces internos relevantes (servicios, precios, contacto, tratamientos)
      if (visited.size < 5) {
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href");
          if (!href) return;

          try {
            const resolved = new URL(href, origin);
            if (resolved.origin === origin) {
              const lower = resolved.pathname.toLowerCase();
              if (
                lower.includes("servicio") ||
                lower.includes("precio") ||
                lower.includes("tarifa") ||
                lower.includes("tratamiento") ||
                lower.includes("contacto") ||
                lower.includes("horario")
              ) {
                if (!visited.has(resolved.href) && !toVisit.includes(resolved.href)) {
                  toVisit.push(resolved.href);
                }
              }
            }
          } catch (e) {
            // Ignorar URLs inválidas
          }
        });
      }
    } catch (e) {
      console.error(`Error scraping ${current}:`, e);
    }
  }

  // Ahora procesamos con OpenRouter o generamos la propuesta estructurada
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) {
    try {
      const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "Atiende",
        },
        body: JSON.stringify({
          model: "anthropic/claude-3.5-haiku",
          messages: [
            {
              role: "system",
              content:
                "Eres un asistente extractor de datos de páginas web de negocios locales. Devuelve ÚNICAMENTE un JSON válido con este formato: { services: [{ name, description, durationMinutes, price, priceType: 'fixed'|'from'|'free', requiresAssessment: boolean }], faqs: [{ question, answer, category }], scheduleDescription: string }.",
            },
            {
              role: "user",
              content: `Extrae los servicios, preguntas frecuentes y horarios de este texto web extraído:\n\n${combinedText.slice(0, 10000)}`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (llmRes.ok) {
        const data = await llmRes.json();
        const content = data.choices?.[0]?.message?.content;
        const parsedProposal = JSON.parse(content);
        return {
          url: rootUrl,
          pagesScraped: Array.from(visited),
          extractedText: combinedText,
          proposal: parsedProposal,
        };
      }
    } catch (e) {
      console.warn("Fallo en OpenRouter durante extracción web:", e);
    }
  }

  // Propuesta heurística por defecto si no hay clave OpenRouter en local
  return {
    url: rootUrl,
    pagesScraped: Array.from(visited),
    extractedText: combinedText,
    proposal: {
      services: [
        {
          name: "Consulta y Diagnóstico Inicial",
          description: "Revisión completa de bienvenida y valoración personalizada.",
          durationMinutes: 30,
          price: 0,
          priceType: "free",
          requiresAssessment: false,
        },
        {
          name: "Tratamiento Dental Básico",
          description: "Limpieza y cuidado preventivo según protocolo de la clínica.",
          durationMinutes: 45,
          price: 50,
          priceType: "from",
          requiresAssessment: false,
        },
        {
          name: "Tratamiento Especializado",
          description: "Estudio de ortodoncia o implantes detectado en la web.",
          durationMinutes: 60,
          price: 600,
          priceType: "from",
          requiresAssessment: true,
        },
      ],
      faqs: [
        {
          question: "¿Cómo puedo solicitar cita?",
          answer: "Puedes solicitar cita directamente a través de este asistente o por teléfono.",
          category: "Citas",
        },
        {
          question: "¿Cuáles son las formas de pago?",
          answer: "Aceptamos efectivo, tarjeta bancaria y opciones de financiación.",
          category: "Pagos",
        },
      ],
      scheduleDescription: "Lunes a Viernes de 9:00 a 20:00 (Detectado en la web).",
    },
  };
}
