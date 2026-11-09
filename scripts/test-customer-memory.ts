import { prisma } from "../src/lib/prisma";
import {
  buildCustomerMemoryPrompt,
  clearCustomerMemory,
  deleteCustomerMemoryFact,
  getCustomerMemorySnapshot,
  isSensitiveMemoryValue,
  listCustomerMemoryFacts,
  normalizeMemoryKey,
  redactSensitiveText,
  setCustomerMemoryOptOut,
  updateCustomerMemoryFact,
  upsertCustomerMemoryFact,
  validateMemoryInput,
} from "../src/lib/memory/customer-memory";
import {
  buildDeterministicSummary,
  deleteConversationSummary,
  ensureConversationSession,
  listConversationSummaries,
  summarizeConversation,
} from "../src/lib/memory/conversation-summary";

let passed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passed += 1;
  console.log(`  ✅ [PASS] ${message}`);
}

function unitTests() {
  console.log("===============================================================");
  console.log("🧪 1. VALIDACIÓN, NORMALIZACIÓN Y PRIVACIDAD");
  console.log("===============================================================\n");

  assert(
    normalizeMemoryKey("  Dirección   Habitual ") === "direccion_habitual",
    "Normaliza claves con acentos, mayúsculas y espacios"
  );
  assert(
    normalizeMemoryKey("SIN_CEBOLLA") === "sin_cebolla",
    "Normaliza claves con guiones bajos"
  );

  const valid = validateMemoryInput({
    category: "preferencia",
    key: "sin_cebolla",
    value: "Siempre pide sin cebolla",
  });
  assert(valid.ok, "Acepta un dato de memoria válido");

  const invalidCategory = validateMemoryInput({
    category: "SALUD",
    key: "alergia",
    value: "Alergia al maní",
  });
  assert(!invalidCategory.ok, "Rechaza categorías fuera del catálogo");

  const shortKey = validateMemoryInput({
    category: "PERFIL",
    key: "a",
    value: "Nombre preferido",
  });
  assert(!shortKey.ok, "Rechaza claves demasiado cortas");

  const longValue = validateMemoryInput({
    category: "OBSERVACION",
    key: "nota",
    value: "x".repeat(401),
  });
  assert(!longValue.ok, "Rechaza valores que superan el límite");

  // Datos sensibles bloqueados
  const blockedCases: Array<{ key: string; value: string; label: string }> = [
    { key: "tarjeta", value: "4111 1111 1111 1111", label: "número de tarjeta" },
    { key: "cvv", value: "cvv 123", label: "código de seguridad" },
    { key: "ci", value: "CI 8765432", label: "documento de identidad" },
    { key: "cuenta", value: "cuenta bancaria 12345678", label: "cuenta bancaria" },
    { key: "clave", value: "contraseña: secreta123", label: "contraseña" },
    { key: "biometria", value: "huella digital registrada", label: "biometría" },
    { key: "salud", value: "diagnóstico de diabetes", label: "diagnóstico médico" },
    { key: "religion", value: "religión católica", label: "categoría especial" },
    { key: "correo", value: "cliente@example.com", label: "correo electrónico" },
    { key: "telefono", value: "72945120", label: "número largo" },
  ];

  for (const item of blockedCases) {
    const result = validateMemoryInput({
      category: "OBSERVACION",
      key: item.key,
      value: item.value,
    });
    assert(!result.ok, `Bloquea ${item.label} en memoria`);
  }

  const allergy = validateMemoryInput({
    category: "PREFERENCIA",
    key: "alergia_mani",
    value: "Alergia al maní, evitar contacto con frutos secos",
  });
  assert(allergy.ok, "Permite alergias alimentarias necesarias para el pedido");

  assert(
    isSensitiveMemoryValue("4111 1111 1111 1111").sensitive,
    "Detecta tarjetas fuera de la validación de categoría"
  );

  const redacted = redactSensitiveText(
    "Mi tarjeta es 4111 1111 1111 1111 y mi correo cliente@example.com, teléfono 72945120"
  );
  assert(!redacted.includes("4111"), "Redacta números de tarjeta en resúmenes");
  assert(!redacted.includes("cliente@example.com"), "Redacta correos en resúmenes");
  assert(!redacted.includes("72945120"), "Redacta números largos en resúmenes");

  console.log("\n===============================================================");
  console.log("🧪 2. RESUMEN DETERMINÍSTICO SIN MODELOS DE IA");
  console.log("===============================================================\n");

  const baseDate = new Date("2026-11-01T12:00:00.000Z");
  const messages = [
    {
      sender: "CUSTOMER",
      content: "Hola, quiero pedir un pollo al spiedo sin cebolla para mi casa en el barrio Magisterio",
      createdAt: baseDate,
    },
    {
      sender: "ASSISTANT",
      content: "Claro, te preparo la cotización con entrega en tu dirección habitual.",
      createdAt: new Date(baseDate.getTime() + 60_000),
    },
    {
      sender: "CUSTOMER",
      content: "Mi dirección es calle Los Pinos #45, frente a la cancha. Prefiero pagar con QR.",
      createdAt: new Date(baseDate.getTime() + 120_000),
    },
    {
      sender: "CUSTOMER",
      content: "El pedido TRP-1041 llegó con demora, quiero dejar el reclamo registrado.",
      createdAt: new Date(baseDate.getTime() + 180_000),
    },
  ];

  const summary = buildDeterministicSummary(messages);
  assert(summary.messageCount === 4, "Cuenta todos los mensajes reales");
  assert(summary.topics.length > 0, "Detecta temas de la conversación");
  assert(summary.summaryText.includes("TRP-1041"), "Conserva pedidos mencionados");
  assert(
    summary.summaryText.toLowerCase().includes("direcciones/referencias"),
    "Incluye direcciones útiles"
  );
  assert(
    summary.summaryText.toLowerCase().includes("preferencias/datos útiles"),
    "Incluye preferencias útiles"
  );
  assert(
    summary.summaryText.toLowerCase().includes("pendientes/incidencias"),
    "Incluye reclamos o pendientes"
  );

  const emptySummary = buildDeterministicSummary([
    {
      sender: "CUSTOMER",
      content: "Hola",
      createdAt: baseDate,
    },
  ]);
  assert(
    emptySummary.summaryText.includes("sin datos duraderos"),
    "No inventa datos cuando la conversación es breve"
  );
}

async function integrationTests() {
  console.log("\n===============================================================");
  console.log("🧪 3. AISLAMIENTO ENTRE DOS CLIENTES REALES");
  console.log("===============================================================\n");

  const suffix = `${Date.now()}`.slice(-8);
  const createdCustomerIds: string[] = [];
  const createdConversationIds: string[] = [];

  const customerA = await prisma.customer.create({
    data: { phone: `+5917${suffix}1`, name: "Cliente Prueba A" },
  });
  const customerB = await prisma.customer.create({
    data: { phone: `+5917${suffix}2`, name: "Cliente Prueba B" },
  });
  createdCustomerIds.push(customerA.id, customerB.id);

  try {
    const factA = await upsertCustomerMemoryFact(customerA.id, {
      category: "PREFERENCIA",
      key: "sin_cebolla",
      value: "Siempre pide sin cebolla",
    });
    assert(Boolean(factA.exitoso), "Guarda memoria del cliente A");

    const factB = await upsertCustomerMemoryFact(customerB.id, {
      category: "PREFERENCIA",
      key: "sin_cebolla",
      value: "Prefiere extra cebolla",
    });
    assert(Boolean(factB.exitoso), "Guarda memoria del cliente B");

    const factsA = await listCustomerMemoryFacts(customerA.id);
    const factsB = await listCustomerMemoryFacts(customerB.id);
    assert(factsA.length === 1 && factsA[0].value.includes("sin cebolla"), "A solo ve su propia memoria");
    assert(factsB.length === 1 && factsB[0].value.includes("extra cebolla"), "B solo ve su propia memoria");
    assert(
      factsA.every((fact) => fact.customerId === customerA.id),
      "Ningún dato de B aparece en la memoria de A"
    );

    const promptA = await buildCustomerMemoryPrompt(customerA.id);
    const promptB = await buildCustomerMemoryPrompt(customerB.id);
    assert(promptA.includes("sin cebolla"), "El prompt de A contiene su preferencia");
    assert(!promptA.includes("extra cebolla"), "El prompt de A no filtra datos de B");
    assert(promptB.includes("extra cebolla"), "El prompt de B contiene su preferencia");
    assert(!promptB.includes("sin cebolla"), "El prompt de B no filtra datos de A");

    console.log("\n===============================================================");
    console.log("🧪 4. DEDUPLICACIÓN, EDICIÓN Y ELIMINACIÓN");
    console.log("===============================================================\n");

    const dedupe = await upsertCustomerMemoryFact(customerA.id, {
      category: "PREFERENCIA",
      key: "SIN CEBOLLA",
      value: "Pide sin cebolla y sin tomate",
    });
    assert(Boolean(dedupe.exitoso), "Actualiza en lugar de duplicar por clave normalizada");
    assert(Boolean(dedupe.actualizado), "Marca el dato como actualizado");

    const factsAfterDedupe = await listCustomerMemoryFacts(customerA.id);
    assert(factsAfterDedupe.length === 1, "Sigue habiendo un solo dato para la misma clave");
    assert(
      factsAfterDedupe[0].value.includes("sin tomate"),
      "El valor fue reemplazado por el nuevo"
    );

    const updated = await updateCustomerMemoryFact(
      customerA.id,
      factsAfterDedupe[0].id,
      { value: "Pide sin cebolla, sin tomate y con ají aparte" },
      { source: "CRM" }
    );
    assert(Boolean(updated.exitoso), "El CRM puede editar un dato de memoria");
    assert(
      updated.fact?.source === "CRM",
      "El dato editado desde CRM registra la fuente"
    );

    const crossUpdate = await updateCustomerMemoryFact(customerB.id, factsAfterDedupe[0].id, {
      value: "Intento de mezclar clientes",
    });
    assert(Boolean(crossUpdate.error), "No se puede editar un dato de otro cliente");

    const crossDelete = await deleteCustomerMemoryFact(customerB.id, factsAfterDedupe[0].id);
    assert(Boolean(crossDelete.error), "No se puede eliminar un dato de otro cliente");

    const sensitive = await upsertCustomerMemoryFact(customerA.id, {
      category: "OBSERVACION",
      key: "tarjeta",
      value: "4111 1111 1111 1111",
    });
    assert(Boolean(sensitive.error), "La IA no puede guardar datos sensibles");

    console.log("\n===============================================================");
    console.log("🧪 5. OPT-OUT CONTROLADO POR EL ADMINISTRADOR");
    console.log("===============================================================\n");

    const optOut = await setCustomerMemoryOptOut(customerA.id, true);
    assert(Boolean(optOut.exitoso), "El administrador desactiva la memoria de A");

    const aiWriteBlocked = await upsertCustomerMemoryFact(customerA.id, {
      category: "OBSERVACION",
      key: "horario",
      value: "Atender después de las 18:00",
    });
    assert(Boolean(aiWriteBlocked.error), "La IA no puede escribir con memoria desactivada");

    const crmWriteAllowed = await upsertCustomerMemoryFact(
      customerA.id,
      {
        category: "OBSERVACION",
        key: "horario",
        value: "Atender después de las 18:00",
      },
      { source: "CRM", ignoreOptOut: true }
    );
    assert(Boolean(crmWriteAllowed.exitoso), "El CRM puede mantener datos con memoria desactivada");

    const promptOptOut = await buildCustomerMemoryPrompt(customerA.id);
    assert(
      promptOptOut.includes("DESACTIVADA"),
      "El prompt indica que la memoria está desactivada"
    );
    assert(
      !promptOptOut.includes("sin cebolla"),
      "El prompt no inyecta datos cuando la memoria está desactivada"
    );

    await setCustomerMemoryOptOut(customerA.id, false);
    const promptReactivated = await buildCustomerMemoryPrompt(customerA.id);
    assert(
      promptReactivated.includes("sin cebolla"),
      "Al reactivar, la memoria vuelve a estar disponible"
    );

    console.log("\n===============================================================");
    console.log("🧪 6. RESÚMENES HISTÓRICOS Y ROTACIÓN DE SESIÓN");
    console.log("===============================================================\n");

    const conversation = await prisma.conversation.create({
      data: {
        customerId: customerA.id,
        channel: "WHATSAPP",
        status: "AI_ACTIVE",
        lastMessageAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    });
    createdConversationIds.push(conversation.id);

    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          sender: "CUSTOMER",
          content: "Hola, quiero pedir pollo al spiedo sin cebolla en mi casa del barrio Magisterio",
        },
        {
          conversationId: conversation.id,
          sender: "ASSISTANT",
          content: "Perfecto, te cotizo la entrega en tu dirección habitual.",
        },
        {
          conversationId: conversation.id,
          sender: "CUSTOMER",
          content: "Prefiero pagar con QR. Mi dirección es calle Los Pinos #45, frente a la cancha.",
        },
      ],
    });

    const generated = await summarizeConversation(conversation.id, { generatedBy: "SYSTEM" });
    assert(Boolean(generated.exitoso), "Genera el resumen determinístico de la conversación");
    assert(generated.summary?.messageCount === 3, "El resumen contabiliza los mensajes reales");

    const duplicate = await summarizeConversation(conversation.id);
    assert(Boolean(duplicate.existente), "No regenera un resumen existente sin force");

    const regenerated = await summarizeConversation(conversation.id, { force: true });
    assert(Boolean(regenerated.exitoso), "El CRM puede regenerar un resumen existente");

    const summaries = await listConversationSummaries(customerA.id);
    assert(summaries.length === 1, "Lista solo los resúmenes del cliente A");

    const summariesB = await listConversationSummaries(customerB.id);
    assert(summariesB.length === 0, "El cliente B no ve resúmenes de A");

    const newSession = await ensureConversationSession(customerA.id, "WHATSAPP");
    assert(newSession.id !== conversation.id, "Abre una nueva sesión tras varios días de inactividad");
    assert(newSession.status === "AI_ACTIVE", "La nueva sesión queda activa para la IA");
    createdConversationIds.push(newSession.id);

    const oldConversation = await prisma.conversation.findUnique({
      where: { id: conversation.id },
    });
    assert(oldConversation?.status === "CLOSED", "Cierra la conversación anterior al rotar");

    const oldSummary = await prisma.conversationSummary.findUnique({
      where: { conversationId: conversation.id },
    });
    assert(Boolean(oldSummary), "Conserva el resumen de la conversación anterior");

    const activeAgain = await ensureConversationSession(customerA.id, "WHATSAPP");
    assert(activeAgain.id === newSession.id, "Reutiliza la sesión reciente sin crear otra");

    const takeover = await prisma.conversation.create({
      data: {
        customerId: customerB.id,
        channel: "WHATSAPP",
        status: "HUMAN_TAKEOVER",
        lastMessageAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    });
    createdConversationIds.push(takeover.id);

    const takeoverSession = await ensureConversationSession(customerB.id, "WHATSAPP");
    assert(
      takeoverSession.id === takeover.id,
      "No cierra automáticamente una conversación en atención humana"
    );

    console.log("\n===============================================================");
    console.log("🧪 7. SNAPSHOT Y BORRADO ADMINISTRATIVO");
    console.log("===============================================================\n");

    const snapshot = await getCustomerMemorySnapshot(customerA.id);
    assert(Boolean(snapshot.customer), "El snapshot devuelve el cliente correcto");
    assert(
      snapshot.facts.every((fact) => fact.customerId === customerA.id),
      "El snapshot solo contiene hechos de A"
    );
    assert(
      snapshot.summaries.every((summary) => summary.customerId === customerA.id),
      "El snapshot solo contiene resúmenes de A"
    );

    const deletedSummary = await deleteConversationSummary(
      customerA.id,
      oldSummary!.id,
      { generatedBy: "CRM" }
    );
    assert(Boolean(deletedSummary.exitoso), "El CRM elimina un resumen histórico");

    const crossSummaryDelete = await deleteConversationSummary(customerB.id, oldSummary!.id);
    assert(Boolean(crossSummaryDelete.error), "No se puede eliminar un resumen de otro cliente");

    const cleared = await clearCustomerMemory(customerA.id, {
      source: "CRM",
      actorUserId: null,
    });
    assert(Boolean(cleared.exitoso), "El administrador borra toda la memoria de A");

    const remainingA = await listCustomerMemoryFacts(customerA.id);
    const remainingB = await listCustomerMemoryFacts(customerB.id);
    assert(remainingA.length === 0, "La memoria de A queda vacía");
    assert(remainingB.length === 1, "La memoria de B permanece intacta");
  } finally {
    try {
      const entityIds = [...createdCustomerIds, ...createdConversationIds];
      await prisma.activityLog.deleteMany({
        where: {
          OR: [
            { provider: "customer_memory", entityId: { in: entityIds } },
            { provider: "customer_memory", detailsJson: { contains: suffix } },
          ],
        },
      });
      if (createdCustomerIds.length > 0) {
        // El borrado en cascada elimina memoria, resúmenes, conversaciones y mensajes.
        await prisma.customer.deleteMany({ where: { id: { in: createdCustomerIds } } });
      }
      console.log("\n🧹 Datos de prueba eliminados.");
    } catch (cleanupError: any) {
      console.warn("⚠️ No se pudieron limpiar todos los datos de prueba:", cleanupError.message);
    }
  }
}

(async () => {
  unitTests();

  if (process.env.RUN_DB_TESTS !== "1") {
    console.log(
      "\n⏭️ Pruebas de integración omitidas. Ejecuta con RUN_DB_TESTS=1 cuando la base de datos esté disponible."
    );
    await prisma.$disconnect();
    console.log(`\n✅ ${passed} comprobaciones unitarias superadas.`);
    return;
  }

  await integrationTests();
  await prisma.$disconnect();

  console.log("\n===============================================================");
  console.log(`✅ TODAS LAS PRUEBAS PASARON: ${passed} comprobaciones`);
  console.log("===============================================================");
})().catch(async (error) => {
  console.error("\n❌ Pruebas fallidas:", error.message);
  await prisma.$disconnect().catch(() => {});
  process.exitCode = 1;
});
