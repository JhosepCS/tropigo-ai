import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export async function POST() {
  await destroySession();
  return NextResponse.json({ success: true, message: "Sesión cerrada correctamente" });
}

export async function GET(req: NextRequest) {
  await destroySession();
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("notice", "logged_out");
  return NextResponse.redirect(loginUrl);
}
