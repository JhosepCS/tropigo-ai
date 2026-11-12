"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Loader2,
  Lock,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import {
  paymentMethodCode,
  type PublicPaymentMethod,
} from "@/lib/payments/types";

interface PaymentData {
  id: string;
  kind: "ORDER" | "RIDE";
  code: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  subtitle: string;
}

function typeIcon(type: PublicPaymentMethod["type"]) {
  if (type === "CASH") return <Wallet className="h-4 w-4" />;
  if (type === "QR") return <QrCode className="h-4 w-4" />;
  if (type === "BANK") return <ShieldCheck className="h-4 w-4" />;
  return <Smartphone className="h-4 w-4" />;
}

export function PaymentClient({
  payment,
  methods,
}: {
  payment: PaymentData;
  methods: PublicPaymentMethod[];
}) {
  const [selectedId, setSelectedId] = useState(() => {
    const preferred = methods.find(
      (method) => paymentMethodCode(method) === payment.paymentMethod
    );
    return (
      preferred?.id ||
      methods.find((method) => method.type !== "CASH")?.id ||
      methods[0]?.id ||
      ""
    );
  });
  const [reference, setReference] = useState("");
  const [reporting, setReporting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(
    null
  );
  const [copied, setCopied] = useState<string | null>(null);

  const selected = methods.find((method) => method.id === selectedId) || null;
  const isPaid = payment.paymentStatus === "PAGADO_VERIFICADO";
  const isCancelled = payment.status === "CANCELADO";
  const isCash = selected?.type === "CASH";

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  const reportPayment = async () => {
    if (!selected) return;
    setReporting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/public/payments/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(payment.kind === "ORDER"
            ? { orderId: payment.id }
            : { tripId: payment.id }),
          methodId: selected.id,
          reference,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo reportar el pago.");
      }
      setMessage({ type: "ok", text: data?.message || "Pago reportado." });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "No se pudo reportar el pago.",
      });
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB] px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <header>
          <Link
            href="/"
            className="text-[11px] font-bold uppercase tracking-wider text-emerald-700"
          >
            TropiGO Ivirgarzama
          </Link>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#101828]">
            Pago de tu {payment.kind === "ORDER" ? "pedido" : "carrera"}
          </h1>
          <p className="text-xs text-[#667085]">
            Elige el método, escanea el QR y reporta el pago. Un operador lo verificará.
          </p>
        </header>

        <section className="rounded-3xl border border-[#EAECF0] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-black text-[#101828]">{payment.code}</p>
              <p className="mt-0.5 text-[11px] text-[#667085]">{payment.subtitle}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-[#667085]">Total</p>
              <p className="text-2xl font-black text-emerald-700">
                {payment.amount.toFixed(2)} Bs.
              </p>
            </div>
          </div>

          {isPaid ? (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Este pago ya fue verificado por TropiGO. ¡Gracias!</span>
            </div>
          ) : isCancelled ? (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Este servicio fue cancelado. No realices ningún pago.</span>
            </div>
          ) : (
            <p className="mt-4 text-[11px] text-[#667085]">
              Estado actual del pago: <b>{payment.paymentStatus}</b>. Si ya pagaste,
              reporta el número de transacción para acelerar la verificación.
            </p>
          )}
        </section>

        {!isPaid && !isCancelled && (
          <>
            <section className="rounded-3xl border border-[#EAECF0] bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#667085]">
                1. Elige cómo pagar
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {methods.map((method) => {
                  const active = method.id === selectedId;
                  return (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedId(method.id);
                        setMessage(null);
                      }}
                      className={`flex flex-col items-start gap-1 rounded-2xl border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200"
                          : "border-[#EAECF0] bg-[#F9FAFB] hover:border-emerald-200"
                      }`}
                    >
                      <span className="text-base">{method.emoji}</span>
                      <span className="text-[11px] font-black text-[#344054]">
                        {method.label}
                      </span>
                      <span className="flex items-center gap-1 text-[9px] font-bold uppercase text-[#667085]">
                        {typeIcon(method.type)}
                        {method.type === "CASH"
                          ? "Efectivo"
                          : method.type === "QR"
                          ? "QR"
                          : method.type === "BANK"
                          ? "Banco"
                          : "Billetera"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {selected && (
              <section className="rounded-3xl border border-[#EAECF0] bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#667085]">
                  2. Paga con {selected.label}
                </p>

                {isCash ? (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-xs text-emerald-800">
                    <p className="font-black">Paga en efectivo al recibir</p>
                    <p className="mt-1">{selected.instructions}</p>
                    <p className="mt-2 text-lg font-black">
                      {payment.amount.toFixed(2)} Bs.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-4">
                    {selected.qrUrl ? (
                      <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#EAECF0] bg-[#F9FAFB] p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selected.qrUrl}
                          alt={`QR de pago ${selected.label}`}
                          className="h-56 w-56 rounded-xl bg-white object-contain p-2 shadow-sm"
                        />
                        <a
                          href={selected.qrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"
                        >
                          Abrir QR en tamaño completo
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-[11px] text-amber-800">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          El QR de {selected.label} aún no fue cargado por el negocio.
                          Usa los datos de cuenta o paga en efectivo.
                        </span>
                      </div>
                    )}

                    {(selected.accountName || selected.accountNumber) && (
                      <div className="space-y-2 rounded-2xl border border-[#EAECF0] px-3 py-3">
                        {selected.accountName && (
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[9px] font-bold uppercase text-[#667085]">
                                Titular
                              </p>
                              <p className="text-xs font-bold text-[#101828]">
                                {selected.accountName}
                              </p>
                            </div>
                          </div>
                        )}
                        {selected.accountNumber && (
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[9px] font-bold uppercase text-[#667085]">
                                Cuenta / celular
                              </p>
                              <p className="font-mono text-xs font-bold text-[#101828]">
                                {selected.accountNumber}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                copy(selected.accountNumber, selected.id)
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-[#D0D5DD] px-2 py-1 text-[10px] font-bold text-[#344054]"
                            >
                              {copied === selected.id ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <ClipboardCopy className="h-3 w-3" />
                              )}
                              {copied === selected.id ? "Copiado" : "Copiar"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] leading-relaxed text-[#667085]">
                      {selected.instructions}
                    </p>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-[#667085]">
                        3. Número de transacción o comprobante (opcional)
                      </label>
                      <input
                        value={reference}
                        onChange={(event) => setReference(event.target.value)}
                        placeholder="Ej: 123456789"
                        maxLength={160}
                        className="w-full rounded-xl border border-[#D0D5DD] bg-[#F9FAFB] px-3 py-2 text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <button
                      onClick={reportPayment}
                      disabled={reporting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {reporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {reporting ? "Reportando..." : "Ya pagué, reportar pago"}
                    </button>
                  </div>
                )}
              </section>
            )}

            {message && (
              <div
                className={`flex items-start gap-2 rounded-2xl border px-3 py-3 text-xs ${
                  message.type === "ok"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {message.type === "ok" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}
          </>
        )}

        <div className="flex items-start gap-2 rounded-2xl border border-[#EAECF0] bg-white px-3 py-3 text-[10px] text-[#667085]">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span>
            TropiGO nunca te pedirá contraseñas, datos de tarjeta ni códigos de
            seguridad. Solo muestra el QR o los datos de cuenta del negocio.
          </span>
        </div>

        <p className="pb-6 text-center text-[10px] text-slate-400">
          TropiGO Ivirgarzama · Trópico de Cochabamba, Bolivia
        </p>
      </div>
    </div>
  );
}
