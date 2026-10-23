import { Simulator } from "./simulator";

export const dynamic = "force-dynamic";

export default function ProbarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Probar Asistente</h2>
        <p className="text-sm text-[#475467]">
          Interactúa con el asistente con la configuración actual del negocio. A la derecha verás una línea de tiempo en directo con cada herramienta que invoca, sus parámetros y lo que devuelve (ideal para grabaciones de demostración).
        </p>
      </div>

      <Simulator />
    </div>
  );
}
