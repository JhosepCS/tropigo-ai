import { NextRequest, NextResponse } from "next/server";
import { ModelRouter } from "@/lib/ai/model-router";
import { requireAuth } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  try {
    await requireAuth().catch(() => null);

    const body = await req.json();
    const { provider, key, model } = body;

    if (!provider) {
      return NextResponse.json(
        { error: "Debe especificar el proveedor a probar ('groq', 'gemini', 'cerebras', 'openrouter', 'simulator')." },
        { status: 400 }
      );
    }

    const testResult = await ModelRouter.testProviderConnection(
      provider,
      key ? String(key).trim() : undefined,
      model ? String(model).trim() : undefined
    );

    return NextResponse.json({
      success: testResult.success,
      testResult,
    });
  } catch (error: any) {
    console.error("Error al probar proveedor de IA:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al realizar prueba de conexión con el proveedor.",
      },
      { status: 500 }
    );
  }
}
