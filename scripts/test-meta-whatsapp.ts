import {
  saveStandardMetaCredentials,
  getMetaWhatsAppConfig,
  getMaskedWhatsAppStatus,
  verifyMetaConnection,
  disconnectWhatsAppSecurely,
  initiateMetaCoexistence,
  handleEmbeddedSignupExchange,
} from "../src/lib/whatsapp/meta-manager";
import { MetaCloudApiAdapter } from "../src/lib/whatsapp/meta-cloud-adapter";
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

async function runMetaWhatsAppTests() {
  console.log("=================================================================");
  console.log("📱 PRUEBAS DEL MÓDULO OFICIAL WHATSAPP BUSINESS CLOUD API (META)");
  console.log("=================================================================\n");

  try {
    // -------------------------------------------------------------
    // 1. GESTIÓN Y CIFRADO SEGURO DE CREDENCIALES (AES-256-GCM)
    // -------------------------------------------------------------
    console.log("🔐 [1/6] Verificando almacenamiento seguro y cifrado en el servidor...");
    
    const testSecretToken = "EAAJ_mock_system_user_token_meta_123456789";
    const testAppSecret = "mock_app_secret_meta_987654";
    const testPhoneId = "104928475829102";
    const testWabaId = "982347102938475";

    await saveStandardMetaCredentials({
      metaPhoneNumberId: testPhoneId,
      metaWabaId: testWabaId,
      metaSystemToken: testSecretToken,
      metaAppSecret: testAppSecret,
      metaWebhookVerifyToken: "tropigo_test_token_2026",
    });

    const record = await prisma.whatsAppConfig.findFirst();
    assert(!!record, "Registro WhatsAppConfig actualizado en base de datos.");
    assert(
      !record?.metaSystemTokenEncrypted?.includes(testSecretToken),
      "El System User Token NUNCA se almacena en texto plano (cifrado con AES-256-GCM)."
    );
    assert(
      !record?.metaAppSecretEncrypted?.includes(testAppSecret),
      "El Meta App Secret NUNCA se almacena en texto plano (cifrado con AES-256-GCM)."
    );

    const decryptedConfig = await getMetaWhatsAppConfig();
    assert(
      decryptedConfig.metaSystemToken === testSecretToken,
      "El servidor descifra internamente el token para llamadas oficiales a Graph API."
    );

    // -------------------------------------------------------------
    // 2. ENMASCARAMIENTO SEGURO Y PROTECCIÓN DEL NAVEGADOR
    // -------------------------------------------------------------
    console.log("\n🛡️  [2/6] Verificando que ningún token se exponga al navegador ni en status...");
    const maskedStatus = await getMaskedWhatsAppStatus("https://tropigo.app");
    
    assert(maskedStatus.hasSystemToken === true, "Indica presencia de token sin revelarlo.");
    assert(maskedStatus.hasAppSecret === true, "Indica presencia de App Secret sin revelarlo.");
    assert(
      !(maskedStatus as any).metaSystemToken,
      "El campo metaSystemToken NO existe en la respuesta expuesta al cliente."
    );
    assert(
      !(maskedStatus as any).metaAppSecret,
      "El campo metaAppSecret NO existe en la respuesta expuesta al cliente."
    );
    assert(
      maskedStatus.webhookUrl.includes("/api/channels/whatsapp/webhook"),
      `URL oficial de Webhook configurada: ${maskedStatus.webhookUrl}`
    );

    // -------------------------------------------------------------
    // 3. VERIFICACIÓN REAL CON GRAPH API (NO SIMULAR CONEXIONES)
    // -------------------------------------------------------------
    console.log("\n📡 [3/6] Verificando validación estricta contra Meta Graph API...");
    // Con credenciales mock, Meta Graph API debe rechazar la conexión con HTTP 400/401
    const verifyResult = await verifyMetaConnection();
    assert(
      verifyResult.success === false,
      "La verificación rechaza credenciales simuladas/falsas (NUNCA afirma conexión sin respuesta 200 de Meta)."
    );
    assert(
      !!verifyResult.error,
      `Error real de Meta capturado correctamente: "${verifyResult.error}"`
    );

    const statusAfterFailedVerify = await getMaskedWhatsAppStatus();
    assert(
      statusAfterFailedVerify.status !== "CONNECTED",
      "El estado se mantiene en ERROR o DESCONECTADO (garantía de integridad estricta)."
    );

    // -------------------------------------------------------------
    // 4. FLUJO DE COEXISTENCIA OFICIAL (SIN QR FALSOS)
    // -------------------------------------------------------------
    console.log("\n📱 [4/6] Verificando flujo de Coexistencia con WhatsApp Business App...");
    const coexistence = await initiateMetaCoexistence();
    // Como la clave es de prueba, Meta rechazará la coexistencia con error oficial
    assert(
      !coexistence.success,
      "Coexistencia no genera códigos ni QR falsos cuando Meta no los autoriza."
    );
    assert(
      Boolean(coexistence.error?.includes("Meta") || coexistence.error?.includes("coexistencia")),
      "Muestra mensaje oficial de requisitos de Meta al administrador."
    );

    // -------------------------------------------------------------
    // 5. PARSERS DE WEBHOOK Y FIRMA CRIPTOGRÁFICA HMAC-SHA256
    // -------------------------------------------------------------
    console.log("\n📬 [5/6] Verificando firma criptográfica HMAC y normalizador de Webhook...");
    
    const sampleBody = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID_TEST",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: "59174389001", phone_number_id: "104928475829102" },
                contacts: [{ profile: { name: "Juan Perez" }, wa_id: "59174389012" }],
                messages: [
                  {
                    from: "59174389012",
                    id: "wamid.HBgNNTkxNzQzODkwMTIVAgASGBIw",
                    timestamp: "1731000000",
                    text: { body: "Hola TropiGO, quiero pedir un pollo broaster" },
                    type: "text",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    });

    const parsedMessages = MetaCloudApiAdapter.parseWebhookMessages(JSON.parse(sampleBody));
    assert(parsedMessages.length === 1, "Mensaje de WhatsApp entrante normalizado.");
    assert(parsedMessages[0].from === "59174389012", "Número de remitente extraído en formato E.164.");
    assert(
      parsedMessages[0].text === "Hola TropiGO, quiero pedir un pollo broaster",
      "Texto del mensaje extraído fielmente."
    );

    // Prueba de validación de firma HMAC
    const crypto = await import("crypto");
    const secret = "test_signing_secret_99";
    const validHmac = crypto.createHmac("sha256", secret).update(sampleBody).digest("hex");
    const validHeader = `sha256=${validHmac}`;
    const isSigValid = MetaCloudApiAdapter.validateSignature(sampleBody, validHeader, secret);
    assert(isSigValid === true, "Firma HMAC-SHA256 válida aceptada.");

    const isFakeSigValid = MetaCloudApiAdapter.validateSignature(sampleBody, "sha256=fake_invalid_signature_hex", secret);
    assert(isFakeSigValid === false, "Firma HMAC-SHA256 alterada rechazada.");

    // -------------------------------------------------------------
    // 6. DESCONEXIÓN SEGURA
    // -------------------------------------------------------------
    console.log("\n🔌 [6/6] Probando desconexión segura y limpieza de credenciales...");
    await disconnectWhatsAppSecurely();
    
    const statusAfterDisconnect = await getMaskedWhatsAppStatus();
    assert(
      statusAfterDisconnect.status === "DISCONNECTED",
      "Estado reseteado a DISCONNECTED."
    );
    assert(
      statusAfterDisconnect.hasSystemToken === false,
      "System User Token eliminado del servidor."
    );
    assert(
      statusAfterDisconnect.connectedPhone === undefined,
      "Número conectado eliminado."
    );

    console.log("\n=================================================================");
    console.log(`RESULTADOS: ${passed} Pasadas, ${failed} Fallidas`);
    console.log("=================================================================\n");

    if (failed > 0) process.exit(1);
  } catch (err: any) {
    console.error("❌ Error inesperado durante pruebas:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMetaWhatsAppTests();
