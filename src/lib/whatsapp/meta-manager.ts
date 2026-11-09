import { prisma } from "../prisma";
import { encrypt, decrypt } from "../encryption";
import { MetaCloudApiAdapter } from "./meta-cloud-adapter";

export interface MetaWhatsAppConfigData {
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  connectionType: "EMBEDDED_SIGNUP" | "COEXISTENCE" | "STANDARD_CREDENTIALS";
  metaAppId?: string;
  metaAppSecret?: string;
  metaPhoneNumberId?: string;
  metaWabaId?: string;
  metaSystemToken?: string;
  metaWebhookVerifyToken: string;
  connectedPhone?: string;
  connectedAccountName?: string;
  connectedAt?: string;
  coexistenceStatus?: "NOT_CONFIGURED" | "PENDING_SCAN" | "VERIFIED";
  coexistenceQr?: string;
  coexistenceCode?: string;
  qualityRating?: string;
  codeVerificationStatus?: string;
  lastError?: string;
  lastVerifiedAt?: string;
}

export interface MaskedWhatsAppStatus {
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  activeProvider: "META_CLOUD_API";
  connectionType: "EMBEDDED_SIGNUP" | "COEXISTENCE" | "STANDARD_CREDENTIALS";
  metaAppId?: string;
  metaPhoneNumberId?: string;
  metaWabaId?: string;
  hasSystemToken: boolean;
  hasAppSecret: boolean;
  metaWebhookVerifyToken: string;
  connectedPhone?: string;
  connectedAccountName?: string;
  connectedAt?: string;
  coexistenceStatus?: "NOT_CONFIGURED" | "PENDING_SCAN" | "VERIFIED";
  coexistenceQr?: string;
  coexistenceCode?: string;
  qualityRating?: string;
  codeVerificationStatus?: string;
  lastError?: string;
  lastVerifiedAt?: string;
  webhookUrl: string;
}

/**
 * Obtiene o inicializa la configuración de Meta Cloud API desde Supabase
 */
export async function getMetaWhatsAppConfig(): Promise<MetaWhatsAppConfigData> {
  let record = await prisma.whatsAppConfig.findFirst();

  if (!record) {
    record = await prisma.whatsAppConfig.create({
      data: {
        activeProvider: "META_CLOUD_API",
        metaWebhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || "tropigo_verify_token_2025",
        baileysStatus: "DISCONNECTED",
        baileysSessionData: JSON.stringify({
          status: "DISCONNECTED",
          connectionType: "STANDARD_CREDENTIALS",
          coexistenceStatus: "NOT_CONFIGURED",
        }),
      },
    });
  }

  // Descifrar credenciales si existen
  let systemToken = process.env.META_SYSTEM_TOKEN || undefined;
  if (record.metaSystemTokenEncrypted) {
    const dec = decrypt(record.metaSystemTokenEncrypted);
    if (dec) systemToken = dec;
  }

  let appSecret = process.env.META_APP_SECRET || undefined;
  if (record.metaAppSecretEncrypted) {
    const dec = decrypt(record.metaAppSecretEncrypted);
    if (dec) appSecret = dec;
  }

  // Parsear metadatos extendidos guardados en formato JSON seguro
  let extra: any = {};
  try {
    if (record.baileysSessionData) {
      extra = JSON.parse(record.baileysSessionData);
    }
  } catch {}

  const phoneNumberId = record.metaPhoneNumberId || process.env.META_PHONE_NUMBER_ID || undefined;
  const wabaId = record.metaWabaId || process.env.META_WABA_ID || undefined;
  const metaAppId = extra.metaAppId || process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID || undefined;

  return {
    status: (extra.status as any) || (record.baileysStatus === "CONNECTED" ? "CONNECTED" : "DISCONNECTED"),
    connectionType: extra.connectionType || "STANDARD_CREDENTIALS",
    metaAppId,
    metaAppSecret: appSecret,
    metaPhoneNumberId: phoneNumberId,
    metaWabaId: wabaId,
    metaSystemToken: systemToken,
    metaWebhookVerifyToken: record.metaWebhookVerifyToken || "tropigo_verify_token_2025",
    connectedPhone: record.connectedPhone || extra.connectedPhone || undefined,
    connectedAccountName: extra.connectedAccountName || undefined,
    connectedAt: extra.connectedAt || undefined,
    coexistenceStatus: extra.coexistenceStatus || "NOT_CONFIGURED",
    coexistenceQr: extra.coexistenceQr || undefined,
    coexistenceCode: extra.coexistenceCode || undefined,
    qualityRating: extra.qualityRating || undefined,
    codeVerificationStatus: extra.codeVerificationStatus || undefined,
    lastError: extra.lastError || undefined,
    lastVerifiedAt: extra.lastVerifiedAt || undefined,
  };
}

/**
 * Retorna el estado enmascarado para la interfaz del CRM (NUNCA expone el token ni app secret)
 */
export async function getMaskedWhatsAppStatus(appUrl?: string): Promise<MaskedWhatsAppStatus> {
  const conf = await getMetaWhatsAppConfig();
  const domain = appUrl || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://tropigo.app";
  const cleanDomain = domain.endsWith("/") ? domain.slice(0, -1) : domain;

  return {
    status: conf.status,
    activeProvider: "META_CLOUD_API",
    connectionType: conf.connectionType,
    metaAppId: conf.metaAppId,
    metaPhoneNumberId: conf.metaPhoneNumberId,
    metaWabaId: conf.metaWabaId,
    hasSystemToken: Boolean(conf.metaSystemToken && conf.metaSystemToken.length > 10),
    hasAppSecret: Boolean(conf.metaAppSecret && conf.metaAppSecret.length > 5),
    metaWebhookVerifyToken: conf.metaWebhookVerifyToken,
    connectedPhone: conf.connectedPhone,
    connectedAccountName: conf.connectedAccountName,
    connectedAt: conf.connectedAt,
    coexistenceStatus: conf.coexistenceStatus,
    coexistenceQr: conf.coexistenceQr,
    coexistenceCode: conf.coexistenceCode,
    qualityRating: conf.qualityRating,
    codeVerificationStatus: conf.codeVerificationStatus,
    lastError: conf.lastError,
    lastVerifiedAt: conf.lastVerifiedAt,
    webhookUrl: `${cleanDomain}/api/channels/whatsapp/webhook`,
  };
}

/**
 * Guarda credenciales estándar oficiales cifradas con AES-256-GCM
 */
export async function saveStandardMetaCredentials(input: {
  metaAppId?: string;
  metaAppSecret?: string;
  metaPhoneNumberId: string;
  metaWabaId?: string;
  metaSystemToken?: string;
  metaWebhookVerifyToken?: string;
}): Promise<void> {
  const current = await getMetaWhatsAppConfig();

  const encryptedToken = input.metaSystemToken?.trim()
    ? encrypt(input.metaSystemToken.trim())
    : current.metaSystemToken
    ? encrypt(current.metaSystemToken)
    : null;

  const encryptedSecret = input.metaAppSecret?.trim()
    ? encrypt(input.metaAppSecret.trim())
    : current.metaAppSecret
    ? encrypt(current.metaAppSecret)
    : null;

  const updatedMetadata = {
    status: "DISCONNECTED", // Requiere verificar antes de marcar como conectado
    connectionType: "STANDARD_CREDENTIALS",
    metaAppId: input.metaAppId?.trim() || current.metaAppId,
    connectedPhone: current.connectedPhone,
    connectedAccountName: current.connectedAccountName,
    coexistenceStatus: "NOT_CONFIGURED",
    updatedAt: new Date().toISOString(),
  };

  const existing = await prisma.whatsAppConfig.findFirst();

  if (existing) {
    await prisma.whatsAppConfig.update({
      where: { id: existing.id },
      data: {
        activeProvider: "META_CLOUD_API",
        metaPhoneNumberId: input.metaPhoneNumberId.trim(),
        metaWabaId: input.metaWabaId?.trim() || null,
        metaSystemTokenEncrypted: encryptedToken,
        metaAppSecretEncrypted: encryptedSecret,
        metaWebhookVerifyToken: input.metaWebhookVerifyToken?.trim() || current.metaWebhookVerifyToken,
        baileysStatus: "DISCONNECTED",
        baileysSessionData: JSON.stringify(updatedMetadata),
      },
    });
  } else {
    await prisma.whatsAppConfig.create({
      data: {
        activeProvider: "META_CLOUD_API",
        metaPhoneNumberId: input.metaPhoneNumberId.trim(),
        metaWabaId: input.metaWabaId?.trim() || null,
        metaSystemTokenEncrypted: encryptedToken,
        metaAppSecretEncrypted: encryptedSecret,
        metaWebhookVerifyToken: input.metaWebhookVerifyToken?.trim() || "tropigo_verify_token_2025",
        baileysStatus: "DISCONNECTED",
        baileysSessionData: JSON.stringify(updatedMetadata),
      },
    });
  }

  // Sincronizar tabla de Channel
  await prisma.channel.upsert({
    where: { type: "whatsapp" },
    update: {
      status: "disconnected",
      settingsJson: JSON.stringify({ provider: "META_CLOUD_API" }),
    },
    create: {
      type: "whatsapp",
      status: "disconnected",
      settingsJson: JSON.stringify({ provider: "META_CLOUD_API" }),
    },
  });
}

/**
 * Verifica la conexión real contra la Graph API de Meta
 * NUNCA afirma que está conectado a menos que Graph API retorne HTTP 200 con datos válidos
 */
export async function verifyMetaConnection(): Promise<{
  success: boolean;
  accountDetails?: any;
  error?: string;
}> {
  const config = await getMetaWhatsAppConfig();

  if (!config.metaPhoneNumberId) {
    return { success: false, error: "Identificador de número de teléfono (Phone Number ID) no configurado." };
  }

  if (!config.metaSystemToken) {
    return { success: false, error: "Token de acceso de usuario del sistema (System User Token) no configurado." };
  }

  const endpoint = `https://graph.facebook.com/v21.0/${config.metaPhoneNumberId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status,throughput`;

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.metaSystemToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data.error?.message || `Meta Graph API Error [HTTP ${res.status}]`;
      
      // Actualizar estado de error en BD
      const existing = await prisma.whatsAppConfig.findFirst();
      if (existing) {
        let metaObj: any = {};
        try { metaObj = JSON.parse(existing.baileysSessionData || "{}"); } catch {}
        metaObj.status = "ERROR";
        metaObj.lastError = errorMsg;
        metaObj.lastVerifiedAt = new Date().toISOString();
        await prisma.whatsAppConfig.update({
          where: { id: existing.id },
          data: {
            baileysStatus: "DISCONNECTED",
            baileysSessionData: JSON.stringify(metaObj),
          },
        });
      }

      return { success: false, error: errorMsg };
    }

    // Datos válidos recibidos desde Meta
    const verifiedName = data.verified_name || "TropiGO Business";
    const displayPhone = data.display_phone_number || config.connectedPhone || "";
    const qualityRating = data.quality_rating || "UNKNOWN";
    const verificationStatus = data.code_verification_status || "VERIFIED";

    const existing = await prisma.whatsAppConfig.findFirst();
    if (existing) {
      let metaObj: any = {};
      try { metaObj = JSON.parse(existing.baileysSessionData || "{}"); } catch {}
      metaObj.status = "CONNECTED";
      metaObj.connectedAccountName = verifiedName;
      metaObj.connectedPhone = displayPhone;
      metaObj.qualityRating = qualityRating;
      metaObj.codeVerificationStatus = verificationStatus;
      metaObj.connectedAt = metaObj.connectedAt || new Date().toISOString();
      metaObj.lastVerifiedAt = new Date().toISOString();
      metaObj.lastError = null;

      await prisma.whatsAppConfig.update({
        where: { id: existing.id },
        data: {
          baileysStatus: "CONNECTED",
          connectedPhone: displayPhone,
          baileysSessionData: JSON.stringify(metaObj),
        },
      });
    }

    // Sincronizar en tabla Channel
    await prisma.channel.upsert({
      where: { type: "whatsapp" },
      update: {
        status: "connected",
        phone: displayPhone,
        settingsJson: JSON.stringify({
          provider: "META_CLOUD_API",
          verifiedName,
          qualityRating,
        }),
      },
      create: {
        type: "whatsapp",
        status: "connected",
        phone: displayPhone,
        settingsJson: JSON.stringify({
          provider: "META_CLOUD_API",
          verifiedName,
          qualityRating,
        }),
      },
    });

    return {
      success: true,
      accountDetails: {
        verifiedName,
        displayPhone,
        qualityRating,
        verificationStatus,
        raw: data,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Error de red al conectar con Meta Graph API: ${err.message}`,
    };
  }
}

/**
 * Desconecta WhatsApp de forma segura, eliminando las credenciales y reseteando estado
 */
export async function disconnectWhatsAppSecurely(): Promise<void> {
  const existing = await prisma.whatsAppConfig.findFirst();

  if (existing) {
    await prisma.whatsAppConfig.update({
      where: { id: existing.id },
      data: {
        metaSystemTokenEncrypted: null,
        metaAppSecretEncrypted: null,
        metaPhoneNumberId: null,
        metaWabaId: null,
        connectedPhone: null,
        baileysStatus: "DISCONNECTED",
        baileysSessionData: JSON.stringify({
          status: "DISCONNECTED",
          connectionType: "STANDARD_CREDENTIALS",
          coexistenceStatus: "NOT_CONFIGURED",
          disconnectedAt: new Date().toISOString(),
        }),
      },
    });
  }

  await prisma.channel.upsert({
    where: { type: "whatsapp" },
    update: {
      status: "disconnected",
      phone: null,
      qrCode: null,
      settingsJson: JSON.stringify({ provider: "META_CLOUD_API", status: "disconnected" }),
    },
    create: {
      type: "whatsapp",
      status: "disconnected",
      settingsJson: JSON.stringify({ provider: "META_CLOUD_API", status: "disconnected" }),
    },
  });
}

/**
 * Solicita a Meta el proceso de coexistencia oficial (para conservar WhatsApp Business App en celular)
 * Si Meta retorna QR o código de 8 dígitos, lo almacena.
 */
export async function initiateMetaCoexistence(): Promise<{
  success: boolean;
  coexistenceQr?: string;
  coexistenceCode?: string;
  error?: string;
  message?: string;
}> {
  const config = await getMetaWhatsAppConfig();

  if (!config.metaPhoneNumberId || !config.metaSystemToken) {
    return {
      success: false,
      error: "Para activar Coexistencia, primero debes configurar el Phone Number ID y el System Token oficial en el panel.",
    };
  }

  try {
    // Solicitud oficial de Coexistencia a Meta Graph API
    // POST https://graph.facebook.com/v21.0/{phone_number_id}/coexistence
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${config.metaPhoneNumberId}/coexistence`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.metaSystemToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      let errMsg = data.error?.message || "La cuenta o número no cumple con los requisitos de coexistencia de Meta.";
      if (data.error?.code === 100 || data.error?.error_subcode === 2388001) {
        errMsg =
          "El número debe estar activo en la aplicación WhatsApp Business en tu celular y registrado bajo tu WABA en Meta Business Manager.";
      }

      return {
        success: false,
        error: `Meta Coexistence Error: ${errMsg}`,
      };
    }

    const qrReturned = data.qr_code || data.pairing_qr || null;
    const codeReturned = data.code || data.pairing_code || null;

    // Persistir estado de coexistencia devuelto por Meta
    const existing = await prisma.whatsAppConfig.findFirst();
    if (existing) {
      let metaObj: any = {};
      try { metaObj = JSON.parse(existing.baileysSessionData || "{}"); } catch {}
      metaObj.connectionType = "COEXISTENCE";
      metaObj.coexistenceStatus = "PENDING_SCAN";
      metaObj.coexistenceQr = qrReturned;
      metaObj.coexistenceCode = codeReturned;
      await prisma.whatsAppConfig.update({
        where: { id: existing.id },
        data: {
          baileysSessionData: JSON.stringify(metaObj),
        },
      });
    }

    return {
      success: true,
      coexistenceQr: qrReturned,
      coexistenceCode: codeReturned,
      message:
        "Solicitud de coexistencia aprobada por Meta. Escanea el QR oficial o ingresa el código en WhatsApp Business App > Dispositivos Vinculados.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Error de red al consultar coexistencia con Meta: ${err.message}`,
    };
  }
}

/**
 * Intercambio seguro del código OAuth devuelto por Meta Embedded Signup
 */
export async function handleEmbeddedSignupExchange(input: {
  code: string;
  wabaId?: string;
  phoneNumberId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const config = await getMetaWhatsAppConfig();

  if (!config.metaAppId || !config.metaAppSecret) {
    return {
      success: false,
      error: "Para completar Embedded Signup se requiere Meta App ID y Meta App Secret configurados en el servidor.",
    };
  }

  try {
    // Intercambiar auth_code por System User Access Token de larga duración
    const url = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${config.metaAppId}&client_secret=${config.metaAppSecret}&code=${input.code}`;
    const res = await fetch(url, { method: "GET" });
    const data = await res.json();

    if (!res.ok || !data.access_token) {
      return {
        success: false,
        error: data.error?.message || "Error al intercambiar token con Meta OAuth.",
      };
    }

    const systemToken = data.access_token;
    const phoneNumberId = input.phoneNumberId || config.metaPhoneNumberId;
    const wabaId = input.wabaId || config.metaWabaId;

    if (!phoneNumberId) {
      return {
        success: false,
        error: "Meta no retornó el Phone Number ID en el flujo Embedded Signup.",
      };
    }

    await saveStandardMetaCredentials({
      metaPhoneNumberId: phoneNumberId,
      metaWabaId: wabaId,
      metaSystemToken: systemToken,
    });

    // Verificar inmediatamente la conexión con el nuevo token
    return await verifyMetaConnection();
  } catch (err: any) {
    return {
      success: false,
      error: `Error al procesar Embedded Signup: ${err.message}`,
    };
  }
}

/**
 * Retorna la instancia de MetaCloudApiAdapter lista para enviar mensajes oficiales
 */
export async function getActiveMetaAdapter(): Promise<MetaCloudApiAdapter | null> {
  const conf = await getMetaWhatsAppConfig();
  if (!conf.metaPhoneNumberId || !conf.metaSystemToken) {
    return null;
  }

  return new MetaCloudApiAdapter({
    phoneNumberId: conf.metaPhoneNumberId,
    systemToken: conf.metaSystemToken,
    appSecret: conf.metaAppSecret,
  });
}
