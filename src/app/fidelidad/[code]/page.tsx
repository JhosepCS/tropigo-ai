import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Gift,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  Sparkles,
  Store,
} from "lucide-react";
import {
  buildLoyaltyQrDataUrl,
  getLoyaltyCardByCode,
} from "@/lib/loyalty/service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const card = await getLoyaltyCardByCode(code);
  return {
    title: card
      ? `Tarjeta de fidelidad ${card.code} · TropiGO`
      : "Tarjeta de fidelidad · TropiGO",
    description: card
      ? `${card.displayName} tiene ${card.stamps} de ${card.stampsNeeded} sellos en su tarjeta de fidelidad TropiGO.`
      : "Tarjeta de fidelidad de TropiGO Ivirgarzama.",
  };
}

export default async function PublicLoyaltyCardPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const card = await getLoyaltyCardByCode(code);

  if (!card) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-700 px-4 py-10">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <QrCode className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-black text-slate-900">
            Tarjeta no encontrada
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            El código <span className="font-mono font-bold">{code}</span> no
            corresponde a una tarjeta de fidelidad activa. Pide a TropiGO que
            genere tu QR personal.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            Volver a TropiGO
          </Link>
        </div>
      </main>
    );
  }

  const qrDataUrl = await buildLoyaltyQrDataUrl(card.code);
  const whatsappPhone = card.settings.businessPhone.replace(/\D/g, "");
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
        `Hola TropiGO, quiero consultar mi tarjeta de fidelidad ${card.code}.`
      )}`
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-700 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-4 flex items-center justify-between text-emerald-50">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-sm font-black backdrop-blur">
              TG
            </div>
            <div>
              <p className="text-sm font-black tracking-tight">TropiGO</p>
              <p className="text-[10px] text-emerald-100/80">
                Ivirgarzama · Trópico de Cochabamba
              </p>
            </div>
          </div>
          <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-50">
            Tarjeta digital
          </span>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="relative bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 px-5 py-5 text-white">
            <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-12 right-10 h-28 w-28 rounded-full bg-white/5" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100">
                  {card.settings.businessName}
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">
                  Tarjeta de Fidelidad
                </h1>
                <p className="mt-1 text-xs text-emerald-50">
                  {card.settings.rewardDescription}
                </p>
              </div>
              <div className="rounded-2xl bg-white/15 p-2.5 backdrop-blur">
                <Gift className="h-7 w-7" />
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Titular
                </p>
                <p className="text-lg font-black text-slate-900">
                  {card.displayName}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                  {card.code}
                </p>
              </div>
              <img
                src={qrDataUrl}
                alt={`QR de la tarjeta ${card.code}`}
                className="h-24 w-24 rounded-xl border border-slate-100 bg-white p-1 shadow-2xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Sellos
                </p>
                <p className="text-[10px] font-bold text-emerald-700">
                  {card.stamps} de {card.stampsNeeded}
                </p>
              </div>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {Array.from({ length: card.stampsNeeded }).map((_, index) => {
                  const filled = index < card.stamps;
                  return (
                    <div
                      key={index}
                      className={`flex aspect-square items-center justify-center rounded-full border-2 text-[10px] font-black ${
                        filled
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-dashed border-slate-300 bg-slate-50 text-slate-300"
                      }`}
                    >
                      {filled ? (
                        <BadgeCheck className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                  );
                })}
                <div
                  className={`flex aspect-square items-center justify-center rounded-full border-2 ${
                    card.rewardAvailable
                      ? "border-amber-400 bg-amber-100 text-amber-700"
                      : "border-dashed border-amber-300 bg-amber-50/60 text-amber-400"
                  }`}
                  title={card.settings.rewardDescription}
                >
                  <Gift className="h-4 w-4" />
                </div>
              </div>
            </div>

            {card.rewardAvailable ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="flex items-center gap-1.5 text-sm font-black text-amber-800">
                  <Sparkles className="h-4 w-4" />
                  ¡Tu premio está listo!
                </p>
                <p className="mt-1 text-[11px] text-amber-700">
                  Muestra esta tarjeta al confirmar tu próximo pedido. El
                  descuento se aplica automáticamente en el resumen.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                <p className="text-sm font-bold text-emerald-800">
                  Te faltan {card.missingForReward} sello(s)
                </p>
                <p className="mt-1 text-[11px] text-emerald-700">
                  Cada pedido entregado suma un sello
                  {card.countRides ? " y cada carrera finalizada también" : ""}.
                  Tu premio se activa en el número {card.nextRewardAtNumber}.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-2">
                <p className="text-[9px] font-bold uppercase text-slate-400">
                  Pedidos entregados
                </p>
                <p className="text-base font-black text-slate-800">
                  {card.completedOrders}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-2">
                <p className="text-[9px] font-bold uppercase text-slate-400">
                  Carreras
                </p>
                <p className="text-base font-black text-slate-800">
                  {card.completedRides}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-2">
                <p className="text-[9px] font-bold uppercase text-slate-400">
                  Sellos
                </p>
                <p className="text-base font-black text-slate-800">
                  {card.totalEarned}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-2">
                <p className="text-[9px] font-bold uppercase text-slate-400">
                  Premios
                </p>
                <p className="text-base font-black text-slate-800">
                  {card.rewardsRedeemed}
                </p>
              </div>
            </div>

            {!card.settings.enabled && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
                El programa de fidelidad está temporalmente pausado. Tu tarjeta
                conserva sus sellos.
              </div>
            )}

            <div className="space-y-1.5 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
              <p className="flex items-center gap-1.5">
                <Store className="h-3 w-3 text-emerald-600" />
                {card.settings.businessName}
              </p>
              {card.settings.businessAddress && (
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-emerald-600" />
                  {card.settings.businessAddress}
                </p>
              )}
              {card.settings.businessPhone && (
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-emerald-600" />
                  {card.settings.businessPhone}
                </p>
              )}
            </div>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                Consultar por WhatsApp
              </a>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] text-emerald-100/70">
          Tarjeta personal e intransferible · TropiGO AI · Ivirgarzama, Bolivia
        </p>
      </div>
    </main>
  );
}
