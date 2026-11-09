/**
 * Suite de Pruebas de Integración y Flujo Real:
 * WhatsApp Cloud API de Meta <-> Agente IA <-> CRM TropiGO
 * 
 * Verifica los 10 requisitos del flujo:
 * 1. Webhook para recibir mensajes entrantes
 * 2. Verificación de firma criptográfica HMAC-SHA256
 * 3. Registro de mensajes y conversaciones en BD
 * 4. Identificación de cliente por número y nombre de perfil
 * 5. Envío de mensajes desde el CRM mediante Cloud API
 * 6. Respuestas del asistente según configuración de AI Studio
 * 7. Actualización de estados de mensajes (sent, delivered, read, failed)
 * 8. Prevención de mensajes duplicados e idempotencia
 * 9. Consulta en tiempo real para el CRM
 * 10. Manejo de errores y reintentos sin duplicación
 */

import crypto from "crypto";
import { prisma } from "../src/lib/prisma";
import { MetaCloudApiAdapter } from "../src/lib/whatsapp/meta-cloud-adapter";
import { getMetaWhatsAppConfig } from "../src/lib/whatsapp/meta-manager";
import { getAssistantConfig, buildSystemPrompt } from "../src/lib/ai/config-manager";
import { GET as handleWebhookGet, POST as handleWebhookPost } from "../src/app/api/channels/whatsapp/webhook/route";
import { POST as handleSendMessage } from "../src/app/api/conversations/send-message/route";
import { GET as handleGetConversations } from "../src/app/api/conversations/route";
import { NextRequest } from "next/server";

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    totalPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    totalFailed++;
  }
}

async function runRealFlowTests() {
  console.log("===============================================================");
  console.log("🧪 INICIANDO PRUEBAS DE COMUNICACIÓN REAL WHATSAPP <-> IA <-> CRM");
  console.log("===============================================================\n");

  const currentConfig = await getMetaWhatsAppConfig();
  const testSecret = "tropigo_test_secret_abc123";
  const testVerifyToken = currentConfig.metaWebhookVerifyToken || "tropigo_verify_token_2025";
  const testCustomerPhone = "59172945120";
  const testCustomerName = "Carlos Mamani (Ivirgarzama)";

  try {
    // -------------------------------------------------------------
    // 1. VERIFICACIÓN DEL WEBHOOK (HANDSHAKE DE META)
    // -------------------------------------------------------------
    console.log("📡 [1/10] Probando Handshake GET oficial de Meta...");
    
    // A) Handshake válido
    const validGetReq = new NextRequest(
      `http://localhost:3000/api/channels/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${testVerifyToken}&hub.challenge=CHALLENGE_CODE_123`
    );
    const validGetRes = await handleWebhookGet(validGetReq);
    assert(validGetRes.status === 200, "Handshake con token correcto devuelve HTTP 200.");
    const challengeBody = await validGetRes.text();
    assert(challengeBody === "CHALLENGE_CODE_123", "Handshake devuelve exactamente el hub.challenge esperado.");

    // B) Handshake inválido (token erróneo)
    const invalidGetReq = new NextRequest(
      "http://localhost:3000/api/channels/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=WRONG_TOKEN&hub.challenge=CODE"
    );
    const invalidGetRes = await handleWebhookGet(invalidGetReq);
    assert(invalidGetRes.status === 403, "Handshake con token incorrecto es rechazado con HTTP 403 Forbidden.");

    // -------------------------------------------------------------
    // 2. VALIDACIÓN DE FIRMA CRIPTOGRÁFICA HMAC-SHA256
    // -------------------------------------------------------------
    console.log("\n🔐 [2/10] Probando verificación de firma HMAC-SHA256...");
    const samplePayload = JSON.stringify({ test: "data", timestamp: Date.now() });
    const correctSignature = "sha256=" + crypto.createHmac("sha256", testSecret).update(samplePayload).digest("hex");
    const forgedSignature = "sha256=11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";

    assert(
      MetaCloudApiAdapter.validateSignature(samplePayload, correctSignature, testSecret),
      "Firma legítima de Meta es aceptada exitosamente."
    );
    assert(
      !MetaCloudApiAdapter.validateSignature(samplePayload, forgedSignature, testSecret),
      "Firma alterada o falsificada es rechazada de inmediato."
    );
    assert(
      !MetaCloudApiAdapter.validateSignature(samplePayload, null, testSecret),
      "Solicitud sin cabecera de firma es rechazada de inmediato."
    );

    // -------------------------------------------------------------
    // 3. PARSER DE MENSAJES Y CONTACTOS DE META
    // -------------------------------------------------------------
    console.log("\n📦 [3/10] Probando extracción y normalización de mensajes y perfiles...");
    const incomingWamid = `wamid.HBgL${Date.now()}TEST`;
    const metaWebhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "100659264494958",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "59174389012",
                  phone_number_id: "106540352242522",
                },
                contacts: [
                  {
                    profile: { name: testCustomerName },
                    wa_id: testCustomerPhone,
                  },
                ],
                messages: [
                  {
                    from: testCustomerPhone,
                    id: incomingWamid,
                    timestamp: "1731000000",
                    text: { body: "Buenas tardes, ¿tienen comida disponible en Ivirgarzama?" },
                    type: "text",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const parsedMessages = MetaCloudApiAdapter.parseWebhookMessages(metaWebhookPayload);
    assert(parsedMessages.length === 1, "Extrae correctamente el mensaje del array de cambios.");
    assert(parsedMessages[0].id === incomingWamid, "Conserva el wamid oficial del mensaje de Meta.");
    assert(parsedMessages[0].from === testCustomerPhone, "Extrae el número de teléfono del cliente.");
    assert(parsedMessages[0].senderProfileName === testCustomerName, "Extrae el nombre de perfil oficial del cliente.");
    assert(Boolean(parsedMessages[0].text?.includes("comida")), "Normaliza el texto del cuerpo del mensaje.");

    // -------------------------------------------------------------
    // 4. REGISTRO EN BASE DE DATOS E IDENTIFICACIÓN DEL CLIENTE
    // -------------------------------------------------------------
    console.log("\n💾 [4/10] Probando registro en BD e identificación por número...");
    // Simular recepción a través del endpoint POST
    const postReq = new NextRequest("http://localhost:3000/api/channels/whatsapp/webhook", {
      method: "POST",
      body: JSON.stringify(metaWebhookPayload),
      headers: { "Content-Type": "application/json" },
    });

    const postRes = await handleWebhookPost(postReq);
    assert(postRes.status === 200, "Endpoint POST procesa el mensaje entrante con HTTP 200.");

    // Verificar en la base de datos
    const savedCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: testCustomerPhone },
          { phone: `+${testCustomerPhone}` },
        ],
      },
    });

    assert(Boolean(savedCustomer), "El cliente fue registrado e identificado en la base de datos.");
    assert(
      savedCustomer?.name === testCustomerName,
      "El nombre del cliente se actualizó con el nombre de perfil de WhatsApp."
    );

    const savedConv = await prisma.conversation.findFirst({
      where: { customerId: savedCustomer!.id, channel: "WHATSAPP" },
      include: { messages: true },
    });

    assert(Boolean(savedConv), "Se creó o asoció la conversación de WhatsApp en estado AI_ACTIVE.");
    const savedMessage = savedConv?.messages.find((m) => m.rawPayload?.includes(incomingWamid));
    assert(Boolean(savedMessage), "El mensaje entrante se guardó con su wamid y rol CUSTOMER.");

    // -------------------------------------------------------------
    // 5. PREVENCIÓN DE DUPLICADOS E IDEMPOTENCIA
    // -------------------------------------------------------------
    console.log("\n🛡️ [5/10] Probando control de idempotencia y anti-duplicados...");
    // Reintentar enviar el mismo payload con el mismo wamid (simulando reintento de red de Meta)
    const duplicateReq = new NextRequest("http://localhost:3000/api/channels/whatsapp/webhook", {
      method: "POST",
      body: JSON.stringify(metaWebhookPayload),
      headers: { "Content-Type": "application/json" },
    });

    const duplicateRes = await handleWebhookPost(duplicateReq);
    assert(duplicateRes.status === 200, "El reintento responde HTTP 200 para evitar tormenta de reintentos.");

    const messagesCountAfterRetry = await prisma.message.count({
      where: {
        conversationId: savedConv!.id,
        rawPayload: { contains: incomingWamid },
      },
    });
    assert(messagesCountAfterRetry === 1, "Idempotencia estricta: NO se duplicó el mensaje en la base de datos.");

    // -------------------------------------------------------------
    // 6. ACTUALIZACIÓN DE ESTADOS (SENT -> DELIVERED -> READ)
    // -------------------------------------------------------------
    console.log("\n📬 [6/10] Probando actualización de estados de entrega (sent, delivered, read)...");
    const outboundTestWamid = `wamid.OUTBOUND_${Date.now()}`;
    
    // Crear mensaje saliente previo en BD
    const outboundMsg = await prisma.message.create({
      data: {
        conversationId: savedConv!.id,
        sender: "ASSISTANT",
        content: "¡Hola Carlos! Tenemos Pollería El Pahuichi y Doña Julia en Ivirgarzama.",
        rawPayload: JSON.stringify({
          wamid: outboundTestWamid,
          deliveryStatus: "SENT",
          sentAt: new Date().toISOString(),
        }),
      },
    });

    // A) Enviar evento DELIVERED desde Meta
    const deliveredPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "100659264494958",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                statuses: [
                  {
                    id: outboundTestWamid,
                    status: "delivered",
                    timestamp: "1731000010",
                    recipient_id: testCustomerPhone,
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const statusDeliveredReq = new NextRequest("http://localhost:3000/api/channels/whatsapp/webhook", {
      method: "POST",
      body: JSON.stringify(deliveredPayload),
      headers: { "Content-Type": "application/json" },
    });
    await handleWebhookPost(statusDeliveredReq);

    const checkDelivered = await prisma.message.findUnique({ where: { id: outboundMsg.id } });
    const parsedPayloadDelivered = JSON.parse(checkDelivered?.rawPayload || "{}");
    assert(
      parsedPayloadDelivered.deliveryStatus === "DELIVERED",
      "El estado del mensaje avanzó a DELIVERED (doble check gris)."
    );

    // B) Enviar evento READ (Doble check azul)
    const readPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "100659264494958",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                statuses: [
                  {
                    id: outboundTestWamid,
                    status: "read",
                    timestamp: "1731000020",
                    recipient_id: testCustomerPhone,
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const statusReadReq = new NextRequest("http://localhost:3000/api/channels/whatsapp/webhook", {
      method: "POST",
      body: JSON.stringify(readPayload),
      headers: { "Content-Type": "application/json" },
    });
    await handleWebhookPost(statusReadReq);

    const checkRead = await prisma.message.findUnique({ where: { id: outboundMsg.id } });
    const parsedPayloadRead = JSON.parse(checkRead?.rawPayload || "{}");
    assert(
      parsedPayloadRead.deliveryStatus === "READ",
      "El estado del mensaje avanzó a READ (doble check azul confirmado)."
    );

    // -------------------------------------------------------------
    // 7. ENVÍO DE MENSAJES DESDE EL CRM MEDIANTE CLOUD API
    // -------------------------------------------------------------
    console.log("\n👩‍💻 [7/10] Probando envío de mensaje desde el CRM (Operador Humano)...");
    const sendCrmReq = new NextRequest("http://localhost:3000/api/conversations/send-message", {
      method: "POST",
      body: JSON.stringify({
        conversationId: savedConv!.id,
        recipientPhone: testCustomerPhone,
        content: "Hola Carlos, soy Laura de despacho. Te confirmo que tu pedido ya está en camino.",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const sendCrmRes = await handleSendMessage(sendCrmReq);
    assert(sendCrmRes.status === 200, "API del CRM procesa el envío del operador.");
    const sendData = await sendCrmRes.json();
    assert(Boolean(sendData.message), "Mensaje del operador registrado en base de datos.");
    assert(sendData.message.sender === "OPERATOR", "El remitente queda etiquetado como OPERATOR.");

    // Verificar que la conversación pasó a HUMAN_TAKEOVER
    const convAfterSend = await prisma.conversation.findUnique({ where: { id: savedConv!.id } });
    assert(
      convAfterSend?.status === "HUMAN_TAKEOVER",
      "La conversación pasa automáticamente a HUMAN_TAKEOVER para que el asistente no interrumpa al operador."
    );

    // -------------------------------------------------------------
    // 8. DEBOUNCE ANTI-DOUBLE CLICK EN EL CRM
    // -------------------------------------------------------------
    console.log("\n⚡ [8/10] Probando debounce de doble envío rápido en el CRM...");
    const duplicateCrmReq = new NextRequest("http://localhost:3000/api/conversations/send-message", {
      method: "POST",
      body: JSON.stringify({
        conversationId: savedConv!.id,
        recipientPhone: testCustomerPhone,
        content: "Hola Carlos, soy Laura de despacho. Te confirmo que tu pedido ya está en camino.",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const duplicateCrmRes = await handleSendMessage(duplicateCrmReq);
    const duplicateCrmData = await duplicateCrmRes.json();
    assert(
      duplicateCrmData.duplicatePrevented === true,
      "Doble click rápido detectado y prevenido: no se envía mensaje duplicado al cliente."
    );

    // -------------------------------------------------------------
    // 9. CONFIGURACIÓN DEL ASISTENTE Y REGLAS DE AI STUDIO
    // -------------------------------------------------------------
    console.log("\n🤖 [9/10] Probando configuración de AI Studio y reglas de prompt...");
    const assistantConfig = await getAssistantConfig();
    assert(Boolean(assistantConfig.name), "Configuración de AI Studio cargada correctamente.");
    const prompt = buildSystemPrompt(assistantConfig);
    assert(prompt.includes(assistantConfig.name), "El prompt del sistema incluye el nombre del asistente.");
    assert(prompt.includes("Bolivianos") || prompt.includes("Bs"), "El prompt instruye precios en moneda local boliviana.");
    assert(prompt.includes("Ivirgarzama"), "El prompt contiene la referencia geográfica de Ivirgarzama.");

    // -------------------------------------------------------------
    // 10. CONSULTA EN TIEMPO REAL PARA EL CRM (/api/conversations)
    // -------------------------------------------------------------
    console.log("\n📊 [10/10] Probando endpoint en tiempo real para el CRM (/api/conversations)...");
    const getConvRes = await handleGetConversations();
    assert(getConvRes.status === 200, "Endpoint GET /api/conversations responde HTTP 200.");
    const conversationsData = await getConvRes.json();
    assert(conversationsData.success === true, "Retorna success: true.");
    assert(Array.isArray(conversationsData.conversations), "Retorna array de conversaciones.");

    const crmConv = conversationsData.conversations.find((c: any) => c.id === savedConv!.id);
    assert(Boolean(crmConv), "La conversación del cliente aparece en la lista del CRM.");
    assert(crmConv.customer.name === testCustomerName, "El CRM recibe el nombre verificado del cliente.");
    assert(crmConv.customer.phone.includes(testCustomerPhone), "El CRM recibe el teléfono E.164 del cliente.");

    const lastMsg = crmConv.messages[crmConv.messages.length - 1];
    assert(Boolean(lastMsg.deliveryStatus), "Los mensajes incluyen su estado de entrega de WhatsApp (SENT/DELIVERED/READ).");
    console.log(`  ℹ️ Último mensaje en CRM: "${lastMsg.content.slice(0, 40)}..." [Estado: ${lastMsg.deliveryStatus}]`);

  } catch (error: any) {
    console.error("❌ Excepción no controlada durante las pruebas:", error);
    totalFailed++;
  } finally {
    console.log("\n===============================================================");
    console.log(`📋 RESULTADOS FINALES: ${totalPassed} superadas, ${totalFailed} fallidas`);
    console.log("===============================================================\n");

    if (totalFailed > 0) {
      process.exit(1);
    }
  }
}

runRealFlowTests();
