"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Bike,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

const VEHICLES = [
  { id: "MOTO", label: "Moto", emoji: "🏍️" },
  { id: "TORITO_TRIMOVIL", label: "Torito / Trimóvil", emoji: "🛺" },
  { id: "BICICLETA", label: "Bicicleta", emoji: "🚲" },
];

const QR_TYPES = [
  { id: "WALLET", label: "Billetera móvil (Tigo Money, Yape, ZAS, Altoke)" },
  { id: "QR", label: "QR Simple / QR bancario" },
  { id: "BANK", label: "Cuenta bancaria" },
];

const MAX_QR_BYTES = 900_000;

export function RegistroRepartidorClient({
  supportUrl,
  cityName,
}: {
  supportUrl: string;
  cityName: string;
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    vehicleType: "MOTO",
    plateNumber: "",
    vehicleModel: "",
    vehicleColor: "",
  });
  const [showQr, setShowQr] = useState(false);
  const [qr, setQr] = useState({
    label: "",
    type: "WALLET",
    accountName: "",
    accountNumber: "",
    qrImage: "",
    instructions: "",
  });
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    name: string;
    accessUrl?: string;
    message: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleQrFile = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El QR debe ser una imagen PNG, JPG o WEBP.");
      return;
    }
    if (file.size > MAX_QR_BYTES) {
      setError("La imagen del QR es muy pesada. Usa una foto menor a 900 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result.startsWith("data:image/")) {
        setError("No se pudo leer la imagen del QR.");
        return;
      }
      setQr((prev) => ({ ...prev, qrImage: result }));
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (form.name.trim().length < 3) {
      setError("Escribe tu nombre completo.");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 7) {
      setError("Escribe tu número de WhatsApp, por ejemplo 71234567.");
      return;
    }
    if (!terms) {
      setError("Confirma que los datos son tuyos para continuar.");
      return;
    }

    setSubmitting(true);
    try {
      const hasQrData =
        Boolean(qr.qrImage) ||
        Boolean(qr.accountName.trim()) ||
        Boolean(qr.accountNumber.trim());
      const res = await fetch("/api/public/registro/repartidor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          paymentQr: hasQrData ? { ...qr, label: qr.label || "Cobro personal" } : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "No se pudo enviar tu registro. Intenta de nuevo.");
        return;
      }
      setSuccess({
        name: data?.rider?.name || form.name,
        accessUrl: data?.accessUrl,
        message:
          data?.message ||
          "Tu solicitud fue enviada. Te avisaremos por WhatsApp cuando sea aprobada.",
      });
    } catch {
      setError("Error de conexión. Revisa tu internet e intenta otra vez.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-3xl border border-[#E0CCE9] bg-white p-6 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-black text-[#1E1523]">
          ¡Registro enviado, {success.name.split(" ")[0]}!
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#6B5A72]">
          {success.message}
        </p>
        <div className="mx-auto mt-5 max-w-md rounded-2xl border border-[#E8DFED] bg-[#F7F4F9] p-4 text-left text-xs text-[#6B5A72]">
          <p className="font-black text-[#331E39]">¿Qué pasa ahora?</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>Un operador de TropiGO revisa tu nombre, vehículo y QR de cobro.</li>
            <li>Te llega la aprobación a tu WhatsApp con tu enlace personal.</li>
            <li>Abres el enlace y ves tus carreras con botones grandes.</li>
          </ol>
        </div>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <a
            href={supportUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#331E39] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4A2C54]"
          >
            <MessageCircle className="h-4 w-4" />
            Escribir a TropiGO
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-[#E0CCE9] bg-white px-5 py-3 text-sm font-bold text-[#331E39] transition hover:bg-[#F7F4F9]"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-3xl border border-[#E0CCE9] bg-white p-5 shadow-sm sm:p-8"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#331E39] text-[#E6D2F0]">
          <Bike className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-black text-[#1E1523]">Datos del conductor</h2>
          <p className="text-[11px] text-[#6B5A72]">
            Operamos en {cityName}. Solo mayores de 18 años.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-[11px] font-black uppercase tracking-wide text-[#6B5A72]">
            Nombre completo *
          </span>
          <input
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Ej: Juan Pérez Mamani"
            autoComplete="name"
            className="mt-1 w-full rounded-xl border border-[#E0CCE9] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#8E58A6] focus:ring-2 focus:ring-[#C8A2D8]/40"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-black uppercase tracking-wide text-[#6B5A72]">
            WhatsApp *
          </span>
          <div className="mt-1 flex items-center overflow-hidden rounded-xl border border-[#E0CCE9] bg-white focus-within:border-[#8E58A6] focus-within:ring-2 focus-within:ring-[#C8A2D8]/40">
            <span className="border-r border-[#E8DFED] bg-[#F7F4F9] px-3 py-2.5 text-sm font-bold text-[#6B5A72]">
              +591
            </span>
            <input
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value.replace(/[^\d\s]/g, ""))}
              placeholder="71234567"
              inputMode="tel"
              autoComplete="tel-national"
              className="w-full bg-transparent px-3 py-2.5 text-sm outline-none"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-[11px] font-black uppercase tracking-wide text-[#6B5A72]">
            Placa del vehículo
          </span>
          <input
            value={form.plateNumber}
            onChange={(e) => setField("plateNumber", e.target.value.toUpperCase())}
            placeholder="Ej: 1234-ABC"
            className="mt-1 w-full rounded-xl border border-[#E0CCE9] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#8E58A6] focus:ring-2 focus:ring-[#C8A2D8]/40"
          />
        </label>
      </div>

      <div>
        <span className="text-[11px] font-black uppercase tracking-wide text-[#6B5A72]">
          Tipo de vehículo *
        </span>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {VEHICLES.map((vehicle) => {
            const active = form.vehicleType === vehicle.id;
            return (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => setField("vehicleType", vehicle.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${
                  active
                    ? "border-[#331E39] bg-[#331E39] text-white"
                    : "border-[#E0CCE9] bg-white text-[#331E39] hover:bg-[#F7F4F9]"
                }`}
              >
                <span className="text-lg">{vehicle.emoji}</span>
                {vehicle.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-black uppercase tracking-wide text-[#6B5A72]">
            Modelo
          </span>
          <input
            value={form.vehicleModel}
            onChange={(e) => setField("vehicleModel", e.target.value)}
            placeholder="Ej: Honda 150"
            className="mt-1 w-full rounded-xl border border-[#E0CCE9] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#8E58A6] focus:ring-2 focus:ring-[#C8A2D8]/40"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-black uppercase tracking-wide text-[#6B5A72]">
            Color
          </span>
          <input
            value={form.vehicleColor}
            onChange={(e) => setField("vehicleColor", e.target.value)}
            placeholder="Ej: Rojo"
            className="mt-1 w-full rounded-xl border border-[#E0CCE9] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#8E58A6] focus:ring-2 focus:ring-[#C8A2D8]/40"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-[#E8DFED] bg-[#F7F4F9] p-4">
        <button
          type="button"
          onClick={() => setShowQr((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-[#8E58A6]" />
            <span>
              <span className="block text-sm font-black text-[#331E39]">
                QR personal de cobro (opcional)
              </span>
              <span className="block text-[11px] text-[#6B5A72]">
                Para que el cliente te pague directo por Tigo Money, Yape o QR.
              </span>
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[#6B5A72] transition ${showQr ? "rotate-180" : ""}`}
          />
        </button>

        {showQr && (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-bold text-[#6B5A72]">Nombre del método</span>
                <input
                  value={qr.label}
                  onChange={(e) => setQr((p) => ({ ...p, label: e.target.value }))}
                  placeholder="Ej: Tigo Money de Juan"
                  className="mt-1 w-full rounded-xl border border-[#E0CCE9] bg-white px-3 py-2 text-sm outline-none focus:border-[#8E58A6]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-[#6B5A72]">Tipo de cuenta</span>
                <select
                  value={qr.type}
                  onChange={(e) => setQr((p) => ({ ...p, type: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#E0CCE9] bg-white px-3 py-2 text-sm outline-none focus:border-[#8E58A6]"
                >
                  {QR_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-[#6B5A72]">Titular</span>
                <input
                  value={qr.accountName}
                  onChange={(e) => setQr((p) => ({ ...p, accountName: e.target.value }))}
                  placeholder="Nombre en la cuenta"
                  className="mt-1 w-full rounded-xl border border-[#E0CCE9] bg-white px-3 py-2 text-sm outline-none focus:border-[#8E58A6]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-[#6B5A72]">Número o cuenta</span>
                <input
                  value={qr.accountNumber}
                  onChange={(e) => setQr((p) => ({ ...p, accountNumber: e.target.value }))}
                  placeholder="Ej: 71234567"
                  className="mt-1 w-full rounded-xl border border-[#E0CCE9] bg-white px-3 py-2 text-sm outline-none focus:border-[#8E58A6]"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E0CCE9] bg-white px-4 py-2 text-xs font-bold text-[#331E39] transition hover:bg-[#F3EAF7]"
              >
                <Upload className="h-3.5 w-3.5" />
                Subir foto del QR
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleQrFile(e.target.files?.[0])}
              />
              {qr.qrImage && (
                <span className="inline-flex items-center gap-2 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  QR cargado
                  <button
                    type="button"
                    onClick={() => setQr((p) => ({ ...p, qrImage: "" }))}
                    className="text-red-600"
                    aria-label="Quitar QR"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-[10px] leading-relaxed text-[#6B5A72]">
              Puedes enviarlo después por WhatsApp. TropiGO nunca pide tu clave
              bancaria: solo el QR o el número de cuenta para cobrar.
            </p>
          </div>
        )}
      </div>

      <label className="flex items-start gap-2 text-[11px] leading-relaxed text-[#6B5A72]">
        <input
          type="checkbox"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[#C8A2D8] accent-[#331E39]"
        />
        <span>
          Confirmo que mis datos son reales, que mi vehículo está en condiciones y
          acepto el trato de repartidor de TropiGO: trato amable al cliente,
          entrega en el tiempo acordado y cobro transparente.
        </span>
      </label>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#331E39] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#4A2C54] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando registro...
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            Enviar mi registro
          </>
        )}
      </button>

      <p className="text-center text-[10px] text-[#6B5A72]">
        Al registrarte no pagas nada. La aprobación se avisa por WhatsApp.
      </p>
    </form>
  );
}
