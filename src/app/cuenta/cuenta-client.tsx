"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Shield,
  KeyRound,
  Laptop,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Store,
  Bike,
  LayoutDashboard,
  Calendar,
} from "lucide-react";

export function CuentaClient({
  initialUser,
  initialSessions,
}: {
  initialUser: any;
  initialSessions: any[];
}) {
  const [user, setUser] = useState(initialUser);
  const [sessions, setSessions] = useState(initialSessions);

  // Formulario Perfil
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [documentNumber, setDocumentNumber] = useState(
    user.profile?.documentNumber || ""
  );
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Formulario Contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Manejo de actualización de perfil
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMessage(null);

    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, documentNumber }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUser((prev: any) => ({ ...prev, ...data.user }));
      setProfileMessage("Tus datos personales han sido actualizados con éxito.");
    } catch (err: any) {
      alert(err.message || "Error al actualizar perfil");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Manejo de cambio de contraseña
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPasswordMessage(data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Error al cambiar contraseña");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Revocar sesión remota
  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm("¿Deseas cerrar esta sesión de forma remota?")) return;

    try {
      const res = await fetch("/api/auth/revoke-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } catch (e) {
      alert("Error al cerrar la sesión remota");
    }
  };

  // Determinar enlace de regreso según el rol
  const getBackLink = () => {
    if (["SUPERADMIN", "ADMIN", "OPERATOR"].includes(user.role)) {
      return { href: "/dashboard", label: "Volver a Administración KDS", icon: LayoutDashboard };
    }
    if (user.role === "MERCHANT_OWNER") {
      return { href: "/comercio", label: "Volver a Mi Cocina", icon: Store };
    }
    if (["RIDER", "MOTOTAXISTA"].includes(user.role)) {
      return { href: "/repartidor", label: "Volver a Mis Entregas", icon: Bike };
    }
    return { href: "/", label: "Volver al Catálogo", icon: ArrowLeft };
  };

  const backLink = getBackLink();
  const BackIcon = backLink.icon;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" href="/" />
            <div className="h-5 w-px bg-slate-200" />
            <span className="text-xs font-black text-slate-900">
              Gestión de Cuenta & Perfil
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={backLink.href}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <BackIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{backLink.label}</span>
            </Link>

            <Link
              href="/api/auth/logout"
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Tarjeta de Identificación del Usuario */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 text-emerald-300 flex items-center justify-center font-black text-xl border border-white/20">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black">{user.name}</h1>
                <span className="text-[10px] font-black uppercase bg-emerald-400 text-emerald-950 px-2 py-0.5 rounded-full">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">{user.email}</p>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                Estado: <span className="font-bold text-emerald-300">Activo</span> • Trópico de Cochabamba
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-emerald-100">
            <span className="block font-semibold">Miembro desde:</span>
            <span className="font-mono text-[11px]">
              {new Date(user.createdAt).toLocaleDateString("es-BO", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Formulario 1: Datos Personales */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Datos Personales</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              {profileMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{profileMessage}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Teléfono (WhatsApp)</label>
                  <input
                    type="text"
                    placeholder="+591XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Cédula de Identidad (CI)</label>
                  <input
                    type="text"
                    placeholder="Ej: 7891234-CBBA"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isUpdatingProfile}
                    className="w-full"
                  >
                    Guardar Cambios de Perfil
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Formulario 2: Seguridad y Cambio de Contraseña */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>Seguridad & Contraseña</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              {passwordMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passwordMessage}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Contraseña Actual</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Nueva Contraseña</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    isLoading={isChangingPassword}
                    className="w-full"
                  >
                    Actualizar Contraseña
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sección 3: Sesiones Activas & Dispositivos */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-emerald-600" />
              <span>Sesiones Activas & Dispositivos Conectados</span>
            </CardTitle>
            <span className="text-[11px] font-bold text-slate-500">
              {sessions.length} sesión(es) registrada(s)
            </span>
          </CardHeader>

          <CardContent className="p-4 space-y-3 text-xs">
            {sessions.length === 0 ? (
              <p className="text-slate-400 py-3 text-center">
                No hay otras sesiones activas registradas en la base de datos.
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                          {sess.userAgent || "Navegador Web"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          IP: {sess.ipAddress || "127.0.0.1"} • Iniciada el{" "}
                          {new Date(sess.createdAt).toLocaleDateString("es-BO", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeSession(sess.id)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
