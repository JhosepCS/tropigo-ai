import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      balance: null,
      message: "No configurada en OPENROUTER_API_KEY",
    });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/key", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        configured: true,
        balance: data.data?.limit_remaining !== undefined ? data.data.limit_remaining : data.data?.usage,
        label: data.data?.label || "Clave Activa",
      });
    }

    return NextResponse.json({
      configured: true,
      balance: null,
      message: "Clave presente",
    });
  } catch (e) {
    return NextResponse.json({
      configured: true,
      balance: null,
      message: "Clave configurada",
    });
  }
}
