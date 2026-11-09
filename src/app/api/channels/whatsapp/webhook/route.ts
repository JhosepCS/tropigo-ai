import { NextRequest, NextResponse } from "next/server";
import { getMetaWhatsAppConfig } from "@/lib/whatsapp/meta-manager";
import { MetaCloudApiAdapter } from "@/lib/whatsapp/meta-cloud-adapter";
import { ModelRouter } from "@/lib/ai/model-router";
import { getAssistantConfig, buildSystemPrompt } from "@/lib/ai/config-manager";
import { getRealDataContextPrompt, getToolDefinitions, executeTool } from "@/lib/ai/tools";
import { prisma } from "@/lib/prisma";
import { IncomingWhatsAppMessage, IncomingWhatsAppStatus } from "@/lib/whatsapp/types";
import { confirmAndCreateOrder } from "@/lib/orders/order-service";
import { isSafeExplicitConfirmation } from "@/lib/orders/confirmation";
import { buildCustomerMemoryPrompt } from "@/lib/memory/customer-memory";
import { ensureConversationSession } from "@/lib/memory/conversation-summary";

export const dynamic = "force-dynamic";

// ============================================================================
// CACHÉ DE IDEMPOTENCIA EN MEMORIA (TTL 15 MINUTOS)
// Evita el doble procesamiento ante reintentos automáticos del Webhook de Meta
// ============================================================================
const recentWamids = new Map<string, { timestamp: number; state: "PROCESSING" | "COMPLETED" }>();

function cleanupWamidCache() {
  const now = Date.now();
  const maxAge = 15 * 60 * 1000; // 15 minutos
  for (const [wamid, record] of recentWamids.entries()) {
    if (now - record.timestamp > maxAge) {
      recentWamids.delete(wamid);
    }
  }
}

/**
 * 1. Verificación del Webhook de Meta (Handshake oficial)
 * Meta envía una petición GET con hub.mode, hub.verify_token y hub.challenge
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const config = await getMetaWhatsAppConfig();
  const officialVerifyToken = config.metaWebhookVerifyToken || "tropigo_verify_token_2025";

  if (mode === "subscribe" && token === officialVerifyToken) {
    console.log("[Meta Webhook] Verificación de handshake completada con éxito.");
    return new Response(challenge || "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[Meta Webhook] Rechazo de handshake: token de verificación no coincide.");
  return new Response("Forbidden: Verify token mismatch", { status: 403 });
}

/**
 * 2. Recepción de Mensajes y Estados de WhatsApp Business Cloud API
 */
export async function POST(req: NextRequest) {
  cleanupWamidCache();

  try {
    const rawBody = await req.text();
    const config = await getMetaWhatsAppConfig();

    // -------------------------------------------------------------
    // VALIDACIÓN DE FIRMA CRIPTOGRÁFICA HMAC-SHA256 (Si App Secret está configurado)
    // -------------------------------------------------------------
    if (config.metaAppSecret) {
      const signature = req.headers.get("x-hub-signature-256");
      const isValid = MetaCloudApiAdapter.validateSignature(rawBody, signature, config.metaAppSecret);
      if (!isValid) {
        console.warn("[Meta Webhook] Firma HMAC-SHA256 inválida en webhook entrante.");
        return NextResponse.json({ error: "Invalid cryptographic signature" }, { status: 401 });
      }
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
    }

    // -------------------------------------------------------------
    // PROCESAMIENTO DE ESTADOS DE MENSAJES (sent, delivered, read, failed)
    // -------------------------------------------------------------
    const statuses: IncomingWhatsAppStatus[] = MetaCloudApiAdapter.parseWebhookStatuses(payload);
    if (statuses.length > 0) {
      for (const st of statuses) {
        await processMessageStatusUpdate(st);
      }
    }

    // -------------------------------------------------------------
    // PROCESAMIENTO DE MENSAJES ENTRANTES (Texto, audio, ubicación, fotos)
    // -------------------------------------------------------------
    const incomingMessages: IncomingWhatsAppMessage[] = MetaCloudApiAdapter.parseWebhookMessages(payload);

    if (incomingMessages.length === 0) {
      return NextResponse.json({
        status: "acknowledged",
        statusesProcessed: statuses.length,
      });
    }

    for (const msg of incomingMessages) {
      // -------------------------------------------------------------
      // 1. CONTROL DE IDEMPOTENCIA (Anti-Duplicados)
      // -------------------------------------------------------------
      if (recentWamids.has(msg.id)) {
        console.log(`[Meta Webhook] Mensaje ${msg.id} ya registrado en caché de idempotencia. Omitiendo duplicado.`);
        continue;
      }

      // Verificación en base de datos si ya fue persistido
      const existingDbMsg = await prisma.message.findFirst({
        where: {
          rawPayload: {
            contains: msg.id,
          },
        },
      });

      if (existingDbMsg) {
        console.log(`[Meta Webhook] Mensaje ${msg.id} ya existe en base de datos. Omitiendo procesamiento duplicado.`);
        recentWamids.set(msg.id, { timestamp: Date.now(), state: "COMPLETED" });
        continue;
      }

      // Marcar en proceso
      recentWamids.set(msg.id, { timestamp: Date.now(), state: "PROCESSING" });

      const rawDigits = msg.from.replace(/\D/g, "");
      const e164 = `+${rawDigits}`;
      const customerPhone = msg.from; // formato enviado por Meta

      let userText = msg.text || "";
      if (msg.location) {
        userText = `[Ubicación compartida: Lat ${msg.location.latitude}, Lng ${msg.location.longitude}${
          msg.location.address ? ` - ${msg.location.address}` : ""
        }]`;
      } else if (msg.type === "image") {
        userText = msg.mediaCaption ? `[Foto: ${msg.mediaCaption}]` : "[Foto compartida]";
      } else if (msg.type === "audio") {
        userText = "[Nota de voz recibida por WhatsApp]";
      } else if (msg.type === "document") {
        userText = msg.mediaCaption ? `[Documento: ${msg.mediaCaption}]` : "[Documento adjunto]";
      }

      if (!userText.trim()) {
        userText = "[Mensaje recibido por WhatsApp]";
      }

      // -------------------------------------------------------------
      // 2. IDENTIFICACIÓN Y REGISTRO DEL CLIENTE POR TELÉFONO
      // -------------------------------------------------------------
      let customer = await prisma.customer.findFirst({
        where: {
          OR: [{ phone: customerPhone }, { phone: rawDigits }, { phone: e164 }],
        },
      });

      const profileName = msg.senderProfileName?.trim();

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            phone: e164,
            name: profileName || `Cliente WhatsApp (+${rawDigits})`,
          },
        });
      } else if (profileName && (!customer.name || customer.name.startsWith("Cliente WhatsApp"))) {
        // Actualizar con el nombre real del perfil de Meta si antes tenía nombre genérico
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: { name: profileName },
        });
      }

      // -------------------------------------------------------------
      // 3. CONVERSACIÓN Y REGISTRO DE MENSAJE ENTRANTE EN BD
      // -------------------------------------------------------------
      // Si el cliente vuelve después de varios días, la conversación
      // anterior se resume, se cierra y se abre una nueva sesión. La
      // memoria estructurada y los resúmenes se conservan por cliente.
      const conversation = await ensureConversationSession(customer.id, "WHATSAPP");

      // Guardar mensaje entrante del cliente con su identificador wamid
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: "CUSTOMER",
          content: userText,
          mediaType: msg.location ? "location" : msg.type,
          latitude: msg.location?.latitude || null,
          longitude: msg.location?.longitude || null,
          rawPayload: JSON.stringify({
            wamid: msg.id,
            timestamp: msg.timestamp,
            profileName: profileName || null,
            direction: "inbound",
          }),
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      // -------------------------------------------------------------
      // 4. VERIFICAR SI LA CONVERSACIÓN ESTÁ EN ATENCIÓN HUMANA
      // -------------------------------------------------------------
      if (conversation.status === "HUMAN_TAKEOVER") {
        console.log(
          `[Meta Webhook] Conversación ${conversation.id} en HUMAN_TAKEOVER. Asistente IA en pausa, esperando al operador.`
        );
        recentWamids.set(msg.id, { timestamp: Date.now(), state: "COMPLETED" });
        continue;
      }

      // -------------------------------------------------------------
      // 5. RESPUESTA AUTOMÁTICA DEL ASISTENTE SEGÚN AI STUDIO
      // -------------------------------------------------------------
      const hasOutboundCredentials = Boolean(config.metaPhoneNumberId && config.metaSystemToken);

      if (!hasOutboundCredentials) {
        console.warn("[Meta Webhook] Credenciales de Meta no configuradas para responder automáticamente.");
        recentWamids.set(msg.id, { timestamp: Date.now(), state: "COMPLETED" });
        continue;
      }

      try {
        const metaAdapter = new MetaCloudApiAdapter({
          phoneNumberId: config.metaPhoneNumberId!,
          systemToken: config.metaSystemToken!,
          appSecret: config.metaAppSecret,
        });

        // Marcar leído en WhatsApp (doble check azul)
        metaAdapter.markAsRead(msg.id).catch((err) => {
          console.warn("[Meta Webhook] No se pudo marcar como leído en Meta:", err.message);
        });

        // -------------------------------------------------------------
        // 5.1 CONFIRMACIÓN EXPLÍCITA Y CREACIÓN ATÓMICA DEL PEDIDO
        // La confirmación se detecta en el servidor a partir del texto real
        // del cliente. El modelo de IA no puede autorizar un pedido.
        // -------------------------------------------------------------
        const safeConfirmation = isSafeExplicitConfirmation(userText);

        const pendingQuote = await prisma.orderQuote.findFirst({
          where: {
            customerId: customer.id,
            conversationId: conversation.id,
            status: "PENDIENTE",
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });

        // Verificar que el resumen de esa cotización fue realmente mostrado
        // en la conversación antes de aceptar la confirmación.
        const summaryShown = pendingQuote
          ? Boolean(
              await prisma.message.findFirst({
                where: {
                  conversationId: conversation.id,
                  sender: "ASSISTANT",
                  createdAt: { gte: pendingQuote.createdAt },
                  OR: [
                    { content: { contains: "RESUMEN DE TU PEDIDO" } },
                    { content: { contains: pendingQuote.totalAmount.toFixed(2) } },
                  ],
                },
                select: { id: true },
              })
            )
          : false;

        const lastAssistantMessage = await prisma.message.findFirst({
          where: { conversationId: conversation.id, sender: "ASSISTANT" },
          orderBy: { createdAt: "desc" },
        });
        const lastAssistantAskedConfirmation = Boolean(
          lastAssistantMessage && /confirm/i.test(lastAssistantMessage.content)
        );

        if (
          safeConfirmation &&
          pendingQuote &&
          summaryShown &&
          lastAssistantAskedConfirmation
        ) {
          const creation = await confirmAndCreateOrder(
            { quoteId: pendingQuote.id },
            {
              customerId: customer.id,
              conversationId: conversation.id,
              confirmationVerified: true,
              source: "WHATSAPP",
            }
          );

          const confirmationReply = creation.exitoso
            ? creation.mensajeConfirmacion ||
              `Tu pedido ${creation.orderNumber} fue registrado correctamente.`
            : `No pude registrar el pedido: ${
                creation.error || "intenta nuevamente o solicita ayuda a un operador."
              }`;

          const outboundWamid = await metaAdapter.sendMessage(
            customerPhone,
            confirmationReply
          );

          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              sender: "ASSISTANT",
              content: confirmationReply,
              toolCallsJson: JSON.stringify([
                {
                  tool: "registrar_pedido",
                  args: { quoteId: pendingQuote.id },
                  result: creation,
                },
              ]),
              rawPayload: JSON.stringify({
                wamid: outboundWamid,
                deliveryStatus: "SENT",
                sentAt: new Date().toISOString(),
                direction: "outbound",
              }),
            },
          });

          recentWamids.set(msg.id, { timestamp: Date.now(), state: "COMPLETED" });
          continue;
        }

        // Si no hay cotización pendiente pero el cliente confirma un pedido
        // que ya fue creado, responder sin duplicar.
        if (safeConfirmation && !pendingQuote) {
          const recentConsumed = await prisma.orderQuote.findFirst({
            where: {
              customerId: customer.id,
              conversationId: conversation.id,
              status: "CONSUMIDA",
              consumedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
            },
            orderBy: { consumedAt: "desc" },
            include: { order: true },
          });

          if (
            recentConsumed?.order &&
            lastAssistantMessage?.content.includes(recentConsumed.order.orderNumber)
          ) {
            const duplicateReply =
              `Tu pedido ${recentConsumed.order.orderNumber} ya está registrado. ` +
              `No se creó un duplicado.`;
            const outboundWamid = await metaAdapter.sendMessage(
              customerPhone,
              duplicateReply
            );
            await prisma.message.create({
              data: {
                conversationId: conversation.id,
                sender: "ASSISTANT",
                content: duplicateReply,
                rawPayload: JSON.stringify({
                  wamid: outboundWamid,
                  deliveryStatus: "SENT",
                  sentAt: new Date().toISOString(),
                  direction: "outbound",
                }),
              },
            });
            recentWamids.set(msg.id, { timestamp: Date.now(), state: "COMPLETED" });
            continue;
          }
        }

        // Contexto confiable para las herramientas. El modelo nunca recibe
        // confirmationVerified=true: la creación ya se resolvió arriba.
        const toolContext = {
          customerId: customer.id,
          conversationId: conversation.id,
          confirmationVerified: false,
          source: "WHATSAPP" as const,
        };

        const assistantConfig = await getAssistantConfig();
        const [realDataContext, memoryContext] = await Promise.all([
          getRealDataContextPrompt(),
          buildCustomerMemoryPrompt(customer.id),
        ]);
        const systemPrompt = buildSystemPrompt(
          assistantConfig,
          [realDataContext, memoryContext].filter(Boolean).join("\n\n")
        );

        // Recuperar contexto reciente de la conversación (últimos 10 mensajes)
        const recentMessages = await prisma.message.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        const chatHistory = recentMessages.reverse().map((m) => ({
          role:
            m.sender === "CUSTOMER"
              ? ("user" as const)
              : m.sender === "ASSISTANT"
              ? ("assistant" as const)
              : ("user" as const),
          content: m.content,
        }));

        // Invocar motor multimodelo de TropiGO AI con herramientas conectadas a BD
        const aiResponse = await ModelRouter.executeChat(
          [{ role: "system", content: systemPrompt }, ...chatHistory],
          {
            tools: getToolDefinitions(),
            toolContext,
          },
          assistantConfig
        );

        // Si la IA ejecutó llamadas a herramientas internas, resolverlas si no tienen resultado
        if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
          for (const call of aiResponse.toolCalls) {
            if (!call.result) {
              call.result = await executeTool(call.tool, call.args, toolContext);
            }
          }
        }

        // Si se activó traspaso a operador humano
        if (aiResponse.operatorHandoff) {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { status: "HUMAN_TAKEOVER", lastMessageAt: new Date() },
          });

          await prisma.handoffHistory.create({
            data: {
              conversationId: conversation.id,
              reason: "Detección de reclamo o solicitud de operador según reglas de AI Studio",
              action: "TAKEOVER",
            },
          });
        }

        // Determinar texto final de respuesta.
        // Para herramientas de pedidos, el texto oficial de la herramienta
        // tiene prioridad sobre una posible frase introductoria del modelo.
        let replyText = aiResponse.content;

        if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
          const orderTool = aiResponse.toolCalls.find((call) =>
            ["preparar_resumen_pedido", "registrar_pedido", "consultar_estado_pedido", "cotizar_tarifa"].includes(
              call.tool
            )
          );
          const primaryResult = orderTool?.result || aiResponse.toolCalls[0].result;

          if (primaryResult) {
            const toolText =
              primaryResult.resumenTexto ||
              primaryResult.mensajeConfirmacion ||
              primaryResult.mensajeOficial ||
              primaryResult.mensaje ||
              primaryResult.error ||
              null;

            if (toolText && (!replyText || orderTool)) {
              replyText = toolText;
            }
          }
        }

        if (!replyText) {
          replyText =
            "¡Hola! He recibido tu mensaje en TropiGO Ivirgarzama. En un momento te atendemos.";
        }

        // Enviar respuesta por WhatsApp oficial de Meta
        const outboundWamid = await metaAdapter.sendMessage(customerPhone, replyText);

        // Guardar mensaje saliente del asistente con su wamid, herramientas usadas y estado inicial SENT
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            sender: "ASSISTANT",
            content: replyText,
            toolCallsJson: aiResponse.toolCalls ? JSON.stringify(aiResponse.toolCalls) : null,
            providerModel: `${aiResponse.provider}/${aiResponse.model}`,
            tokensUsed: aiResponse.tokensUsed || null,
            rawPayload: JSON.stringify({
              wamid: outboundWamid,
              deliveryStatus: "SENT",
              sentAt: new Date().toISOString(),
              direction: "outbound",
            }),
          },
        });
      } catch (aiErr: any) {
        console.error("[Meta Webhook] Error durante la inferencia o envío de IA:", aiErr);

        // En caso de fallo de IA, no tumbar el webhook. Notificar y pausar para atención humana.
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { status: "HUMAN_TAKEOVER", lastMessageAt: new Date() },
        });

        const assistantConfig = await getAssistantConfig();
        await prisma.activityLog.create({
          data: {
            action: "AI_INFERENCE_FALLBACK",
            entityName: "Conversation",
            entityId: conversation.id,
            provider: assistantConfig?.activeProvider || "AI",
            channel: "whatsapp",
            status: "warning",
            detailsJson: JSON.stringify({ error: aiErr.message }),
            errorText: aiErr.message,
          },
        });
      }

      recentWamids.set(msg.id, { timestamp: Date.now(), state: "COMPLETED" });
    }

    return NextResponse.json({
      status: "processed",
      messagesCount: incomingMessages.length,
      statusesCount: statuses.length,
    });
  } catch (err: any) {
    console.error("[Meta Webhook] Error al procesar webhook de Meta:", err);
    // Respondemos 200 con reporte de error interno para evitar tormenta de reintentos de Meta
    return NextResponse.json(
      { status: "error_handled", error: err.message || "Webhook processing error" },
      { status: 200 }
    );
  }
}

/**
 * Actualiza el estado de entrega (sent, delivered, read, failed) de un mensaje
 * buscando el wamid en rawPayload.
 */
async function processMessageStatusUpdate(status: IncomingWhatsAppStatus) {
  try {
    if (!status.id) return;

    const message = await prisma.message.findFirst({
      where: {
        rawPayload: {
          contains: status.id,
        },
      },
    });

    if (!message) {
      return;
    }

    let payloadObj: any = {};
    try {
      payloadObj = JSON.parse(message.rawPayload || "{}");
    } catch {
      payloadObj = {};
    }

    const statusHierarchy: Record<string, number> = {
      PENDING: 0,
      SENT: 1,
      DELIVERED: 2,
      READ: 3,
      FAILED: 4,
    };

    const currentDelivery = payloadObj.deliveryStatus || "PENDING";
    const currentRank = statusHierarchy[currentDelivery] ?? 0;
    const newDelivery = status.status.toUpperCase();
    const newRank = statusHierarchy[newDelivery] ?? 0;

    // Solo avanzar de estado a menos que sea fallo
    if (newRank >= currentRank || status.status === "failed") {
      payloadObj.deliveryStatus = newDelivery;
      payloadObj[`${status.status}At`] = new Date(status.timestamp).toISOString();
      if (status.errors) {
        payloadObj.errors = status.errors;
      }

      await prisma.message.update({
        where: { id: message.id },
        data: {
          rawPayload: JSON.stringify(payloadObj),
        },
      });

      console.log(`[Meta Webhook] Estado de mensaje ${status.id} actualizado a ${newDelivery}.`);
    }
  } catch (err: any) {
    console.warn(`[Meta Webhook] No se pudo actualizar estado para wamid ${status.id}:`, err.message);
  }
}
