import { NextRequest, NextResponse } from "next/server";
import { ModelRouter } from "@/lib/ai/model-router";
import { saveProviderKeys } from "@/lib/ai/key-manager";
import { getAssistantConfig, saveAssistantConfig } from "@/lib/ai/config-manager";
import { requireAuth } from "@/lib/auth/rbac";

export async function GET() {
  try {
    const [providers, assistantConfig] = await Promise.all([
      ModelRouter.getProvidersStatus(),
      getAssistantConfig(),
    ]);

    return NextResponse.json({
      success: true,
      providers,
      assistantConfig,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al obtener estado de proveedores IA." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validar sesión de operador o administrador si está autenticado
    await requireAuth().catch(() => null);

    const body = await req.json();
    const {
      groqKey,
      geminiKey,
      cerebrasKey,
      openRouterKey,
      activeProvider,
      activeModel,
      fallbackProviders,
      providerModels,
    } = body;

    // 1. Guardar claves API si fueron provistas
    if (
      groqKey !== undefined ||
      geminiKey !== undefined ||
      cerebrasKey !== undefined ||
      openRouterKey !== undefined
    ) {
      await saveProviderKeys({
        groqKey: groqKey !== undefined ? String(groqKey).trim() : undefined,
        geminiKey: geminiKey !== undefined ? String(geminiKey).trim() : undefined,
        cerebrasKey: cerebrasKey !== undefined ? String(cerebrasKey).trim() : undefined,
        openRouterKey: openRouterKey !== undefined ? String(openRouterKey).trim() : undefined,
      });
    }

    // 2. Guardar selección de proveedor y modelos si fueron provistos
    if (
      activeProvider !== undefined ||
      activeModel !== undefined ||
      fallbackProviders !== undefined ||
      providerModels !== undefined
    ) {
      await saveAssistantConfig({
        activeProvider,
        activeModel,
        fallbackProviders,
        providerModels,
      });
    }

    const [updatedProviders, updatedConfig] = await Promise.all([
      ModelRouter.getProvidersStatus(),
      getAssistantConfig(),
    ]);

    return NextResponse.json({
      success: true,
      message: "Configuración de IA y credenciales cifradas actualizadas exitosamente.",
      providers: updatedProviders,
      assistantConfig: updatedConfig,
    });
  } catch (error: any) {
    console.error("Error al guardar configuración de IA:", error);
    return NextResponse.json(
      { error: error.message || "Error al guardar configuración de IA." },
      { status: 500 }
    );
  }
}
