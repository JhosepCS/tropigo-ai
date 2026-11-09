import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/rbac";
import { listUserSessions } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { CuentaClient } from "./cuenta-client";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  let session;
  try {
    session = await requireAuth();
  } catch (e) {
    redirect("/login?from=/cuenta");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      profile: true,
      riderProfile: true,
      ownedMerchants: true,
      customerProfile: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const sessions = await listUserSessions(user.id);

  return <CuentaClient initialUser={user} initialSessions={sessions} />;
}
