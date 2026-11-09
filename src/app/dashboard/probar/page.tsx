import { Simulator } from "./simulator";

export const dynamic = "force-dynamic";

export default function ProbarPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black text-[#101828]">
            Simulador de Pruebas: TropiBot
          </h2>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
            Groq Llama-3.3 70B
          </span>
        </div>
        <p className="text-xs text-[#667085] mt-0.5">
          Prueba las conversaciones en vivo como si fueras un cliente de Ivirgarzama pidiendo comida o mototaxis. A la derecha verás las herramientas de base de datos que se ejecutan paso a paso.
        </p>
      </div>

      <Simulator />
    </div>
  );
}
