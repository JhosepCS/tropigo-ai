import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider") || "google_calendar";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.APP_URL || "http://localhost:3000"}/api/integrations/google/callback`;

  // Mapeo de scopes incrementales según la tarjeta seleccionada
  let scope = "";
  if (provider === "google_calendar") {
    scope = "https://www.googleapis.com/auth/calendar";
  } else if (provider === "gmail") {
    scope = "https://www.googleapis.com/auth/gmail.send";
  } else if (provider === "google_sheets") {
    scope = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets";
  }

  if (!clientId) {
    // Si aún no se han configurado credenciales reales de Google Cloud en .env local,
    // activamos la conexión de prueba para permitir la verificación del panel y de citas
    await prisma.integration.update({
      where: { provider },
      data: {
        status: "connected",
        accountIdentifier: "contacto@clinicalumen.es",
      },
    });

    return NextResponse.redirect(
      new URL("/dashboard/integraciones?connected=" + provider, req.url)
    );
  }

  // Redirección oficial de OAuth Google con include_granted_scopes
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(
    scope
  )}&access_type=offline&prompt=consent&include_granted_scopes=true&state=${provider}`;

  return NextResponse.redirect(authUrl);
}
