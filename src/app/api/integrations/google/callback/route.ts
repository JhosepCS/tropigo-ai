import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const provider = searchParams.get("state") || "google_calendar";
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/dashboard/integraciones?error=oauth_denied", req.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.APP_URL || "http://localhost:3000"}/api/integrations/google/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error_description || "Token exchange failed");

    // Guardar tokens cifrados con AES-256-GCM
    const encrypted = encrypt(JSON.stringify(tokenData));

    await prisma.integration.update({
      where: { provider },
      data: {
        status: "connected",
        accountIdentifier: "cuenta.google@clinicalumen.es",
        encryptedCredentials: encrypted,
      },
    });

    return NextResponse.redirect(
      new URL("/dashboard/integraciones?connected=" + provider, req.url)
    );
  } catch (err: any) {
    console.error("Error en OAuth Callback:", err);
    return NextResponse.redirect(
      new URL("/dashboard/integraciones?error=token_failed", req.url)
    );
  }
}
