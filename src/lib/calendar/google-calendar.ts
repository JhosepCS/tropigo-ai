import crypto from "crypto";

export interface OrderCalendarInput {
  orderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  address: string;
  total: number;
  items?: string;
  estimatedDeliveryMinutes?: number;
}

/**
 * Obtiene un token de acceso OAuth2 usando una cuenta de servicio de Google (Service Account)
 * mediante el flujo de aserción JWT nativo de Node.js (sin librerías externas pesadas).
 */
async function getGoogleServiceAccountToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const claim = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/calendar.events",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
    const encodedClaim = Buffer.from(JSON.stringify(claim)).toString("base64url");
    const signInput = `${encodedHeader}.${encodedClaim}`;

    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signInput);
    sign.end();
    const signature = sign.sign(serviceAccount.private_key, "base64url");

    const jwtAssertion = `${signInput}.${signature}`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwtAssertion,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn("[google-calendar] No se pudo obtener access token de Google:", res.status);
      return null;
    }

    const data = await res.json();
    return data.access_token || null;
  } catch (err) {
    console.warn("[google-calendar] Error al autenticar cuenta de servicio:", err);
    return null;
  }
}

/**
 * Agenda un pedido en Google Calendar si está configurado en las variables de entorno.
 *
 * Variables de entorno requeridas (opcionales):
 * - GOOGLE_CALENDAR_ID: ID del calendario (ej. "primary" o "tu-negocio@gmail.com")
 * - GOOGLE_SERVICE_ACCOUNT_JSON: Contenido del archivo JSON de la Service Account de Google
 *
 * Si alguna no está presente o la llamada falla, retorna null de forma silenciosa sin interrumpir el flujo.
 */
export async function createOrderCalendarEvent(
  order: OrderCalendarInput
): Promise<string | null> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const rawServiceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!calendarId || !rawServiceAccount) {
    return null;
  }

  try {
    let serviceAccount: { client_email: string; private_key: string };
    try {
      serviceAccount = JSON.parse(rawServiceAccount);
    } catch {
      console.warn("[google-calendar] GOOGLE_SERVICE_ACCOUNT_JSON no es un JSON válido.");
      return null;
    }

    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      return null;
    }

    const token = await getGoogleServiceAccountToken(serviceAccount);
    if (!token) {
      return null;
    }

    const startTime = new Date();
    const durationMin = Math.max(15, order.estimatedDeliveryMinutes || 40);
    const endTime = new Date(startTime.getTime() + durationMin * 60 * 1000);

    const description = [
      `🛵 Pedido: ${order.orderNumber}`,
      `👤 Cliente: ${order.customerName}`,
      order.customerPhone ? `📞 Teléfono: ${order.customerPhone}` : null,
      `📍 Dirección: ${order.address}`,
      `💰 Total: ${order.total.toFixed(2)} Bs.`,
      order.items ? `\n🍽️ Detalle:\n${order.items}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const eventPayload = {
      summary: `🛵 ${order.orderNumber} — ${order.customerName}`,
      description,
      location: `${order.address}, Ivirgarzama, Bolivia`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "America/La_Paz",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "America/La_Paz",
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 10 },
        ],
      },
    };

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.warn("[google-calendar] Error al crear evento en Google Calendar:", err);
      return null;
    }

    const data = await res.json();
    return data.id || null;
  } catch (err) {
    console.warn("[google-calendar] Error al sincronizar evento de pedido:", err);
    return null;
  }
}

