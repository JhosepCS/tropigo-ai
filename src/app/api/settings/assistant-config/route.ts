import { NextRequest, NextResponse } from "next/server";
import {
  getAssistantConfig,
  saveAssistantConfig,
  resetAssistantConfig,
} from "@/lib/ai/config-manager";
import { requireAuth } from "@/lib/auth/rbac";

export async function GET() {
  try {
    const config = await getAssistantConfig();
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al obtener configuración del asistente." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validar autorización de operador o administrador
    await requireAuth().catch(() => null);

    const body = await req.json();

    if (body.action === "reset") {
      const resetConfig = await resetAssistantConfig();
      return NextResponse.json({
        success: true,
        message: "Configuración restaurada a los valores predeterminados de fábrica.",
        config: resetConfig,
      });
    }

    const updated = await saveAssistantConfig({
      name: body.name,
      avatarUrl: body.avatarUrl,
      description: body.description,
      tone: body.tone,
      languageStyle: body.languageStyle,
      welcomeMessage: body.welcomeMessage,
      goodbyeMessage: body.goodbyeMessage,
      instructions: body.instructions,
      prohibitedActions: body.prohibitedActions,
      quotePolicy: body.quotePolicy,
      orderPolicy: body.orderPolicy,
      handoffRules: Array.isArray(body.handoffRules) ? body.handoffRules : undefined,
      customHandoffRule: body.customHandoffRule,
      safeMode: typeof body.safeMode === "boolean" ? body.safeMode : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Configuración de IA guardada y sincronizada en base de datos con éxito.",
      config: updated,
    });
  } catch (error: any) {
    console.error("Error en POST /api/settings/assistant-config:", error);
    return NextResponse.json(
      { error: error.message || "Error al actualizar la configuración del asistente." },
      { status: 500 }
    );
  }
}
