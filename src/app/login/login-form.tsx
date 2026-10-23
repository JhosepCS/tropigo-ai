"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@atiende.es");
  const [password, setPassword] = useState("AdminAtiende2025!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error de inicio de sesión");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="font-medium text-[#344054]">Correo electrónico</label>
        <div className="relative">
          <Mail className="w-4 h-4 text-[#98A2B3] absolute left-3 top-2.5" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl pl-9 pr-3 py-2 text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="font-medium text-[#344054]">Contraseña</label>
        <div className="relative">
          <Lock className="w-4 h-4 text-[#98A2B3] absolute left-3 top-2.5" />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl pl-9 pr-3 py-2 text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
        >
          <span>{loading ? "Comprobando..." : "Entrar al Panel"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 bg-[#F9FAFB] border border-[#EAECF0] rounded-xl text-[11px] text-[#667085] text-center mt-4">
        Credenciales por defecto: <strong>admin@atiende.es</strong> / <strong>AdminAtiende2025!</strong>
      </div>
    </form>
  );
}
