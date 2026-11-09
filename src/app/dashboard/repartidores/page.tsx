import React from "react";
import { prisma } from "@/lib/prisma";
import { RepartidoresClient } from "./repartidores-client";

export const dynamic = "force-dynamic";

export default async function RepartidoresPage() {
  const riders = await prisma.rider.findMany({
    include: {
      city: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return <RepartidoresClient riders={riders} />;
}
