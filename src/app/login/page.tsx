import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/ui/logo";
import { MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const business = await prisma.businessProfile.findFirst();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="flex justify-center">
          <Logo size="lg" href="/" />
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Acceso a la Plataforma
          </h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ivirgarzama • Centro Operativo del Trópico</span>
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-3xl sm:px-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
