import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTrackingData } from "@/lib/tracking/service";
import { TrackingClient } from "./tracking-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getTrackingData(id);
  return {
    title: data
      ? `Seguimiento ${data.code} · TropiGO`
      : "Seguimiento · TropiGO",
    description: data
      ? `Estado: ${data.statusLabel}. Sigue tu pedido o carrera en el mapa.`
      : "Seguimiento de pedidos y carreras de TropiGO Ivirgarzama.",
  };
}

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getTrackingData(id);
  if (!data) notFound();

  return <TrackingClient initialData={data} />;
}
