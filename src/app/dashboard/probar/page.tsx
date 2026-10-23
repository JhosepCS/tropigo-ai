import { Simulator } from "./simulator";

export const dynamic = "force-dynamic";

export default function ProbarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Probar Asistente (Simulador de Pedidos)</h2>
        <p className="text-sm text-[#475467]">
          Interactúa con TropiBot como si fueras un cliente en WhatsApp. A la derecha verás en tiempo real cada herramienta que invoca, el cálculo de delivery y el armado del carrito.
        </p>
      </div>

      <Simulator />
    </div>
  );
}
