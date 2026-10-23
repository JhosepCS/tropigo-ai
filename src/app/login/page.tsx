import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const agency = await prisma.agencyProfile.findFirst();

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white font-black text-xl shadow-md">
            A
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#101828]">Atiende</h1>
            <p className="text-xs text-[#667085]">{agency?.name || "Lumina Digital Agency"}</p>
          </div>
        </div>

        <h2 className="mt-6 text-center text-xl font-bold tracking-tight text-[#101828]">
          Acceso al Panel de Control
        </h2>
        <p className="mt-1 text-center text-xs text-[#667085]">
          Gestiona el asistente de IA para WhatsApp y Web
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs border border-[#EAECF0] rounded-3xl sm:px-10">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
