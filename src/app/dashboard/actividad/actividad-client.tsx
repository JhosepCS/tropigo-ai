"use client";

import { useState } from "react";
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ActividadClientProps {
  initialLogs: any[];
}

export function ActividadClient({ initialLogs }: ActividadClientProps) {
  const [logs] = useState(initialLogs);
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filteredLogs = logs.filter((l) => {
    if (providerFilter !== "ALL" && l.provider !== providerFilter) return false;
    if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const action = l.action.toLowerCase();
      const details = l.detailsJson?.toLowerCase() || "";
      return action.includes(q) || details.includes(q);
    }
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-2xs p-6 space-y-6">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por acción o detalles..."
            className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl pl-9 pr-3 py-2 text-xs text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {/* Filtro por Integración */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-xs text-[#101828]"
          >
            <option value="ALL">Todas las integraciones</option>
            <option value="assistant">Asistente</option>
            <option value="google_calendar">Google Calendar</option>
            <option value="gmail">Gmail</option>
            <option value="google_sheets">Google Sheets</option>
            <option value="slack">Slack</option>
            <option value="stripe">Stripe</option>
            <option value="webhooks">Webhooks</option>
            <option value="whatsapp">WhatsApp</option>
          </select>

          {/* Filtro por Resultado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-xs text-[#101828]"
          >
            <option value="ALL">Todos los resultados</option>
            <option value="success">Éxito</option>
            <option value="simulated">Modo Seguro (Simulado)</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#EAECF0] text-[#667085] bg-[#F9FAFB]">
              <th className="py-2.5 px-3">Fecha y Hora</th>
              <th className="py-2.5 px-3">Acción</th>
              <th className="py-2.5 px-3">Integración</th>
              <th className="py-2.5 px-3">Canal</th>
              <th className="py-2.5 px-3">Resultado</th>
              <th className="py-2.5 px-3 text-right">Detalles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAECF0]">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-xs text-[#98A2B3]">
                  No se han encontrado registros de actividad con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedRow === log.id;
                let parsedDetails = null;
                try {
                  if (log.detailsJson) parsedDetails = JSON.parse(log.detailsJson);
                } catch (e) {}

                return (
                  <tr key={log.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3 px-3 text-[#667085] font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("es-ES", {
                        timeZone: "Europe/Madrid",
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#101828]">
                      {log.action}
                      {isExpanded && parsedDetails && (
                        <pre className="mt-2 bg-[#101828] text-[#E4E7EC] p-3 rounded-xl font-mono text-[10px] overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(parsedDetails, null, 2)}
                        </pre>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize text-[11px] font-medium bg-[#F2F4F7] text-[#344054] px-2 py-0.5 rounded-md">
                        {log.provider.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3 capitalize text-[#475467] text-[11px]">
                      {log.channel}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 ${
                          log.status === "success"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : log.status === "simulated"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {log.status === "success"
                          ? "Completado"
                          : log.status === "simulated"
                          ? "Simulado"
                          : "Error"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {parsedDetails && (
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                          className="text-[#667085] hover:text-[#101828] p-1 rounded hover:bg-[#F2F4F7]"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
