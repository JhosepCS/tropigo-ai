import { PrismaClient } from "@prisma/client";
import {
  getAssistantConfig,
  saveAssistantConfig,
  resetAssistantConfig,
  buildSystemPrompt,
  DEFAULT_ASSISTANT_CONFIG,
} from "../src/lib/ai/config-manager";
import { ModelRouter } from "../src/lib/ai/model-router";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
    failed++;
  }
}

async function runStudioTests() {
  console.log("=================================================================");
  console.log("🎨 PRUEBAS DEL MÓDULO AI STUDIO / PERSONALIZACIÓN DE IA TROPIGO");
  console.log("=================================================================\n");

  try {
    // 1. Lectura inicial
    console.log("📋 [1/5] Verificando lectura de configuración actual...");
    const initialConfig = await getAssistantConfig();
    assert(!!initialConfig.name, `Asistente cargado con nombre: "${initialConfig.name}"`);
    assert(!!initialConfig.instructions, "Instrucciones base presentes.");

    // 2. Modificación de Identidad, Personalidad, Reglas e Instrucciones
    console.log("\n✏️  [2/5] Modificando configuración (AI Studio)...");
    const testChanges = {
      name: "TropiGO Master AI",
      avatarUrl: "https://images.unsplash.com/photo-1550853024-fae8dd4be47f?w=150",
      description: "Asistente estrella de pedidos y despacho para Ivirgarzama",
      tone: "amable" as const,
      languageStyle: "bolivian_tropical" as const,
      welcomeMessage: "¡Bienvenido caserito! Te atiende TropiGO Master AI.",
      goodbyeMessage: "¡Que viva el Trópico! Hasta la próxima.",
      instructions: "Eres el mejor asistente de Bolivia. Siempre sugiere platos con llajwa picante y arroz con queso.",
      prohibitedActions: "1. No inventar tarifas.\n2. Prohibido confirmar pedidos sin autorización.",
      quotePolicy: "require_zone" as const,
      orderPolicy: "strict_confirmation" as const,
      handoffRules: ["queja", "molesto", "reclamo", "humano", "atraso"],
      customHandoffRule: "Si el cliente pide hablar con Laura de despacho, transferir inmediatamente.",
    };

    const saved = await saveAssistantConfig(testChanges);
    assert(saved.name === "TropiGO Master AI", "Nombre actualizado persistido.");
    assert(saved.tone === "amable", "Tono 'amable' guardado.");
    assert(saved.handoffRules.includes("atraso"), "Reglas de handoff actualizadas.");

    // 3. Verificación de Persistencia Directa en PostgreSQL / Supabase
    console.log("\n💾 [3/5] Verificando persistencia en base de datos PostgreSQL...");
    const dbRecord = await prisma.assistantConfig.findFirst();
    assert(dbRecord?.name === "TropiGO Master AI", "Nombre verificado directamente en la tabla AssistantConfig.");
    assert(dbRecord?.tone === "amable", "Tono verificado directamente en base de datos.");

    let extraDbData: any = {};
    try {
      if (dbRecord?.operatingHoursJson) extraDbData = JSON.parse(dbRecord.operatingHoursJson);
    } catch {}
    assert(extraDbData.goodbyeMessage === "¡Que viva el Trópico! Hasta la próxima.", "Despedida persistida en BD.");
    assert(extraDbData.description === "Asistente estrella de pedidos y despacho para Ivirgarzama", "Descripción persistida.");

    // 4. Verificación del Compilador de System Prompt
    console.log("\n⚙️  [4/5] Verificando compilación dinámica del System Prompt...");
    const compiledPrompt = buildSystemPrompt(saved);
    assert(compiledPrompt.includes("TropiGO Master AI"), "El System Prompt incluye el nombre personalizado.");
    assert(compiledPrompt.includes("Tu tono es sumamente amable"), "El System Prompt inyecta las directrices del tono 'amable'.");
    assert(compiledPrompt.includes("CONFIRMACIÓN OBLIGATORIA DE PEDIDOS"), "El System Prompt exige resumen antes de confirmar.");
    assert(compiledPrompt.includes("COTIZACIÓN DE TARIFAS: Solo cotiza tarifas"), "El System Prompt exige zona de Ivirgarzama.");
    assert(compiledPrompt.includes("Laura de despacho"), "Directriz personalizada de handoff inyectada.");

    // 5. Verificación de Ejecución con el Motor de IA
    console.log("\n🤖 [5/5] Probando invocación del motor con el Prompt personalizado...");
    const chatResult = await ModelRouter.executeChat([
      { role: "system", content: compiledPrompt },
      { role: "user", content: "Hola, ¿cómo te llamas y qué me recomiendas?" },
    ]);

    assert(!!chatResult.content, `Respuesta generada (${chatResult.latencyMs} ms, proveedor: ${chatResult.provider}).`);

    // 6. Restaurar Valores Predeterminados
    console.log("\n🔄 Restaurando valores predeterminados de fábrica...");
    const restored = await resetAssistantConfig();
    assert(restored.name === DEFAULT_ASSISTANT_CONFIG.name, `Asistente restaurado a "${DEFAULT_ASSISTANT_CONFIG.name}".`);
    assert(restored.tone === "cercano", "Tono restaurado a 'cercano'.");

  } catch (err: any) {
    console.error("❌ ERROR DURANTE PRUEBAS:", err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n=================================================================");
  console.log(`RESULTADOS: ${passed} Pasadas, ${failed} Fallidas`);
  console.log("=================================================================");

  if (failed > 0) process.exit(1);
}

runStudioTests();
