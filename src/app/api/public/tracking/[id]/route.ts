import { NextRequest, NextResponse } from "next/server";
import { getTrackingData } from "@/lib/tracking/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/tracking/[id]
 * Seguimiento con mapa para el enlace privado del pedido o carrera.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getTrackingData(id);

    if (!data) {
      return NextResponse.json(
        { error: "Seguimiento no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[Tracking] Error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el seguimiento." },
      { status: 500 }
    );
  }
}
