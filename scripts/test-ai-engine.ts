import {
  GroqAdapter,
} from "../src/lib/ai/adapters/groq-adapter";
import {
  GeminiAdapter,
} from "../src/lib/ai/adapters/gemini-adapter";
import {
  CerebrasAdapter,
} from "../src/lib/ai/adapters/cerebras-adapter";
import {
  OpenRouterAdapter,
} from "../src/lib/ai/adapters/openrouter-adapter";
import {
  LocalSimulatorAdapter,
} from "../src/lib/ai/adapters/local-simulator";
import { ModelRouter } from "../src/lib/ai/model-router";
import {
  saveProviderKeys,
  getProviderKeys,
  maskKey,
} from "../src/lib/ai/key-manager";
import {
  getAssistantConfig,
  saveAssistantConfig,
  buildSystemPrompt,
  DEFAULT_ASSISTANT_CONFIG,
} from "../src/lib/ai/config-manager";
import { VERIFIED_MODELS_CATALOG } from "../src/lib/ai/types";
import { prisma } from "../src/lib/prisma";

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

async function runEngineTests() {
  console.log("=================================================================");
  console.log("🚀 PRUEBAS COMPLETAS DEL MOTOR DE INTELIGENCIA ARTIFICIAL TROpiGO");
  console.log("=================================================================\n");

  try {
    // -------------------------------------------------------------
    // 1. ARQUITECTURA MODULAR Y ADAPTADORES INDEPENDIENTES
    // -------------------------------------------------------------
    console.log("🧩 [1/7] Verificando arquitectura modular y adaptadores independientes...");
    const groq = new GroqAdapter("mock_key_groq");
    const gemini = new GeminiAdapter("mock_key_gemini");
    const cerebras = new CerebrasAdapter("mock_key_cerebras");
    const openrouter = new OpenRouterAdapter("mock_key_openrouter");
    const simulator = new LocalSimulatorAdapter();

    assert(groq.providerName === "groq", "GroqAdapter implementa IAAdapter correctamente.");
    assert(gemini.providerName === "gemini", "GeminiAdapter implementa IAAdapter correctamente.");
    assert(cerebras.providerName === "cerebras", "CerebrasAdapter implementa IAAdapter correctamente.");
    assert(openrouter.providerName === "openrouter", "OpenRouterAdapter implementa IAAdapter correctamente.");
    assert(simulator.providerName === "simulator", "LocalSimulatorAdapter implementa IAAdapter correctamente.");

    // -------------------------------------------------------------
    // 2. PRUEBA DE CONEXIÓN Y DETECCIÓN REAL DE ERRORES
    // -------------------------------------------------------------
    console.log("\n📡 [2/7] Probando endpoint de prueba de conexión y captura de errores reales...");
    
    // Conexión simulador (debe ser instantánea)
    const simTest = await simulator.testConnection();
    assert(simTest.success, "Simulador local responde con éxito instantáneo.");
    assert(simTest.latencyMs >= 0, `Latencia del simulador: ${simTest.latencyMs} ms.`);

    // Conexión con clave ausente
    const noKeyGroq = new GroqAdapter("");
    const noKeyRes = await noKeyGroq.testConnection();
    assert(!noKeyRes.success, "Detecta ausencia de clave sin caerse el servidor.");
    assert(noKeyRes.error?.includes("no configurada") ?? false, "Mensaje de error claro para el administrador.");

    // Conexión con clave inválida a Groq (prueba real de error HTTP)
    const invalidKeyGroq = new GroqAdapter("gsk_invalid_test_key_12345");
    const invalidKeyRes = await invalidKeyGroq.testConnection();
    assert(!invalidKeyRes.success, "Rechaza clave inválida de Groq correctamente.");
    assert(
      (invalidKeyRes.error?.includes("401") || invalidKeyRes.error?.includes("Groq Error") || invalidKeyRes.error?.includes("Fallo de conexión")) ?? false,
      `Error real capturado: "${invalidKeyRes.error}"`
    );

    // -------------------------------------------------------------
    // 3. SEGURIDAD Y CIFRADO DE API KEYS (AES-256-GCM)
    // -------------------------------------------------------------
    console.log("\n🔐 [3/7] Verificando almacenamiento seguro y cifrado en el servidor...");
    await saveProviderKeys({
      groqKey: "gsk_test_secret_key_groq_9999",
      geminiKey: "AIzaSy_test_secret_gemini_8888",
    });

    const integrationRecord = await prisma.integration.findUnique({
      where: { provider: "ai_keys" },
    });
    assert(!!integrationRecord?.encryptedCredentials, "Credenciales persistidas en tabla Integration.");
    assert(
      !integrationRecord?.encryptedCredentials?.includes("gsk_test_secret_key_groq_9999"),
      "La clave NUNCA se almacena en texto plano en la base de datos (Cifrado AES-256-GCM)."
    );

    const decryptedKeys = await getProviderKeys();
    assert(
      decryptedKeys.groqKey === "gsk_test_secret_key_groq_9999",
      "El servidor descifra la clave correctamente para su uso interno."
    );

    const masked = maskKey(decryptedKeys.groqKey);
    assert(masked === "••••••••9999", `Enmascaramiento seguro para el frontend: ${masked}`);

    // -------------------------------------------------------------
    // 4. GARANTÍA DE PRESUPUESTO 0 BS Y MODELOS VERIFICADOS
    // -------------------------------------------------------------
    console.log("\n💰 [4/7] Verificando garantía estricta de 0 Bs y catálogo de modelos vigentes...");
    
    // Todos los modelos en el catálogo tienen isFree: true
    const allProviders = Object.keys(VERIFIED_MODELS_CATALOG) as (keyof typeof VERIFIED_MODELS_CATALOG)[];
    const allFree = allProviders.every((p) =>
      VERIFIED_MODELS_CATALOG[p].every((m) => m.isFree === true)
    );
    assert(allFree, "Todos los modelos autorizados pertenecen a capas gratuitas verificadas.");

    // OpenRouter: intento forzado de usar modelo de pago
    const orPaidAttempt = new OpenRouterAdapter("mock_key", "openai/gpt-4o"); // modelo de pago
    // Debe forzar el modelo gratuito :free
    const orTest = await orPaidAttempt.testConnection({ model: "anthropic/claude-3-opus" });
    assert(
      orTest.model.endsWith(":free"),
      `OpenRouter forzó modelo gratuito de seguridad: ${orTest.model}`
    );

    // -------------------------------------------------------------
    // 5. SELECCIÓN DE PROVEEDOR Y MODELO DESDE EL CRM
    // -------------------------------------------------------------
    console.log("\n⚙️  [5/7] Verificando selección de proveedor y modelo activo...");
    await saveAssistantConfig({
      activeProvider: "GEMINI",
      activeModel: "gemini-1.5-flash",
      fallbackProviders: ["GROQ", "OPENROUTER", "LOCAL"],
    });

    const activeConfig = await getAssistantConfig();
    assert(activeConfig.activeProvider === "GEMINI", "Proveedor activo actualizado a GEMINI.");
    assert(activeConfig.activeModel === "gemini-1.5-flash", "Modelo activo actualizado a gemini-1.5-flash.");

    // -------------------------------------------------------------
    // 6. INTEGRACIÓN DE CONTEXTO Y PERSONALIZACIÓN DE AI STUDIO
    // -------------------------------------------------------------
    console.log("\n🎨 [6/7] Verificando integración con AI Studio (Prompt dinámico y reglas)...");
    await saveAssistantConfig({
      name: "TropiBot Turbo",
      tone: "cercano",
      instructions: "Atiende pedidos de Doña Julia y Pollería El Pahuichi en Ivirgarzama.",
      prohibitedActions: "Prohibido cobrar tarifas fuera de tarifario.",
    });

    const compiledPrompt = buildSystemPrompt(await getAssistantConfig());
    assert(compiledPrompt.includes("TropiBot Turbo"), "Nombre personalizado inyectado en System Prompt.");
    assert(compiledPrompt.includes("Trópico de Cochabamba"), "Contexto regional de Ivirgarzama presente.");
    assert(compiledPrompt.includes("Doña Julia y Pollería El Pahuichi"), "Instrucciones de comercio presentes.");
    assert(compiledPrompt.includes("Prohibido cobrar tarifas fuera de tarifario"), "Reglas de seguridad presentes.");

    // -------------------------------------------------------------
    // 7. EJECUCIÓN DEL CHAT, FALLBACK TRANSPARENTE Y PASE A HUMANO
    // -------------------------------------------------------------
    console.log("\n💬 [7/7] Probando ejecución de chat, fallback y detección de pase a humano...");
    
    // Prueba de conversación estándar con fallback al simulador
    const chatResult = await ModelRouter.executeChat([
      { role: "user", content: "Hola buenas tardes, ¿cuánto cuesta el delivery al Barrio Magisterio?" }
    ]);
    assert(!!chatResult.content, "Respuesta generada correctamente.");
    assert(chatResult.content.includes("5.00 Bs") || chatResult.content.includes("Magisterio"), "Respuesta contiene datos de tarifas de Ivirgarzama.");
    assert(chatResult.fallbackUsed === true, "Fallback transparente activado correctamente.");

    // Prueba de detección de pase a operador humano
    const handoffResult = await ModelRouter.executeChat([
      { role: "user", content: "Tengo un reclamo urgente, mi pedido no llegó y quiero hablar con una persona." }
    ]);
    assert(handoffResult.operatorHandoff === true, "Detección de operador humano activada (operatorHandoff: true).");
    assert(
      handoffResult.content.toLowerCase().includes("operador") || handoffResult.content.toLowerCase().includes("derivado"),
      "Mensaje cordial informando al cliente sobre la transferencia humana."
    );

    // Restaurar a configuración de fábrica de Ivirgarzama
    await saveAssistantConfig(DEFAULT_ASSISTANT_CONFIG);
    console.log("\n🔄 Valores predeterminados de fábrica restaurados.");

    console.log("\n=================================================================");
    console.log(`RESULTADOS: ${passed} Pasadas, ${failed} Fallidas`);
    console.log("=================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Error inesperado durante la ejecución de pruebas:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runEngineTests();
