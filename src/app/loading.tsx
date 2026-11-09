import { Spinner } from "@/components/ui/spinner";
import { Logo } from "@/components/ui/logo";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
        <Logo size="lg" />
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-2">
          <Spinner size="sm" color="primary" />
          <span>Cargando plataforma TropiGO...</span>
        </div>
      </div>
    </div>
  );
}
