"use client";

import { useState } from "react";
import {
  Globe,
  Plus,
  Trash2,
  Check,
  Save,
  Building,
  HelpCircle,
  FileText,
  Sparkles,
  DownloadCloud,
  X,
  ExternalLink,
} from "lucide-react";

interface ConocimientoClientProps {
  initialBusiness: any;
  initialServices: any[];
  initialFaqs: any[];
  initialFreeText: string;
}

export function ConocimientoClient({
  initialBusiness,
  initialServices,
  initialFaqs,
  initialFreeText,
}: ConocimientoClientProps) {
  // Negocio
  const [name, setName] = useState(initialBusiness?.name || "");
  const [activity, setActivity] = useState(initialBusiness?.activity || "");
  const [address, setAddress] = useState(initialBusiness?.address || "");
  const [phone, setPhone] = useState(initialBusiness?.phone || "");
  const [website, setWebsite] = useState(initialBusiness?.website || "");

  // Servicios
  const [services, setServices] = useState(initialServices);

  // FAQs
  const [faqs, setFaqs] = useState(initialFaqs);

  // Texto libre
  const [freeText, setFreeText] = useState(initialFreeText);

  // Modal Crawler "Importar desde una web"
  const [showCrawlerModal, setShowCrawlerModal] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState("https://clinicalumen.es");
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<any | null>(null);
  const [selectedProposedServices, setSelectedProposedServices] = useState<number[]>([]);
  const [selectedProposedFaqs, setSelectedProposedFaqs] = useState<number[]>([]);
  const [savingProposal, setSavingProposal] = useState(false);

  const [saved, setSaved] = useState(false);

  // Guardar todo
  const handleSaveAll = async () => {
    try {
      await fetch("/api/knowledge/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business: { name, activity, address, phone, website },
          freeText,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // Ejecutar crawler web
  const handleStartCrawl = async () => {
    if (!crawlUrl.trim()) return;
    setCrawling(true);
    setCrawlResult(null);

    try {
      const res = await fetch("/api/crawler/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: crawlUrl }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setCrawlResult(data.result);
        // Pre-seleccionar todos por defecto
        setSelectedProposedServices(
          data.result.proposal?.services?.map((_: any, idx: number) => idx) || []
        );
        setSelectedProposedFaqs(
          data.result.proposal?.faqs?.map((_: any, idx: number) => idx) || []
        );
      }
    } catch (e) {
      alert("Error al rastrear la web");
    } finally {
      setCrawling(false);
    }
  };

  // Guardar selección del crawler
  const handleApplyProposal = async () => {
    if (!crawlResult?.proposal) return;
    setSavingProposal(true);

    const chosenServices = crawlResult.proposal.services.filter((_: any, i: number) =>
      selectedProposedServices.includes(i)
    );
    const chosenFaqs = crawlResult.proposal.faqs.filter((_: any, i: number) =>
      selectedProposedFaqs.includes(i)
    );

    try {
      await fetch("/api/crawler/save-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: chosenServices,
          faqs: chosenFaqs,
        }),
      });

      // Actualizar estado local
      setServices([...services, ...chosenServices]);
      setFaqs([...faqs, ...chosenFaqs]);
      setShowCrawlerModal(false);
      alert("Servicios y FAQs importados correctamente!");
    } catch (e) {
      alert("Error al guardar la propuesta");
    } finally {
      setSavingProposal(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Botón Destacado: Importar desde una web */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <DownloadCloud className="w-5 h-5 text-teal-700" />
            <h3 className="font-bold text-sm text-teal-950">
              Importar información desde una web
            </h3>
          </div>
          <p className="text-xs text-teal-800">
            Pega la URL de tu negocio. El servidor descargará la página y hasta cinco enlaces internos (servicios, precios, contacto), extraerá el texto y la IA te propondrá servicios y preguntas frecuentes para guardar con un clic.
          </p>
        </div>

        <button
          onClick={() => setShowCrawlerModal(true)}
          className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0 shadow-xs flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Importar desde una web</span>
        </button>
      </div>

      {/* 1. Datos del Negocio */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-2xs space-y-4 text-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-[#EAECF0]">
          <Building className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-sm text-[#101828]">Datos de la Empresa</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">Nombre del negocio</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">A qué se dedica</label>
            <input
              type="text"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">Dirección física</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[#344054]">Teléfono público</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="font-medium text-[#344054]">Sitio web oficial</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
            />
          </div>
        </div>
      </div>

      {/* 2. Catálogo de Servicios y Precios */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
          <div>
            <h3 className="font-semibold text-sm text-[#101828]">Servicios y Tratamientos</h3>
            <p className="text-xs text-[#667085]">
              El asistente consulta esta lista para informar de tarifas y duración, y para dar citas.
            </p>
          </div>
          <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full font-semibold border border-teal-200">
            {services.length} tratamientos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EAECF0] text-[#667085] bg-[#F9FAFB]">
                <th className="py-2.5 px-3">Servicio</th>
                <th className="py-2.5 px-3">Duración</th>
                <th className="py-2.5 px-3">Precio</th>
                <th className="py-2.5 px-3 text-center">Requiere valoración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0]">
              {services.map((s, idx) => (
                <tr key={s.id || idx} className="hover:bg-[#F9FAFB]">
                  <td className="py-3 px-3">
                    <p className="font-semibold text-xs text-[#101828]">{s.name}</p>
                    <p className="text-[11px] text-[#667085] line-clamp-1">{s.description}</p>
                  </td>
                  <td className="py-3 px-3 text-[#475467]">{s.durationMinutes} min</td>
                  <td className="py-3 px-3 font-semibold text-teal-800">
                    {s.price === 0 ? "Gratuito" : `${s.priceType === "from" ? "Desde " : ""}${s.price} €`}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {s.requiresAssessment ? (
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 font-medium">
                        Sí
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#98A2B3]">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Preguntas Frecuentes */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-teal-600" />
            <h3 className="font-semibold text-sm text-[#101828]">Preguntas Frecuentes (FAQs)</h3>
          </div>
          <span className="text-xs bg-[#F2F4F7] text-[#475467] px-2.5 py-1 rounded-full font-medium border border-[#EAECF0]">
            {faqs.length} preguntas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map((f, i) => (
            <div
              key={f.id || i}
              className="p-4 rounded-xl border border-[#EAECF0] bg-[#FAFAFA] space-y-1.5 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-[#101828]">{f.question}</p>
                <span className="text-[10px] bg-white border border-[#EAECF0] text-[#667085] px-1.5 py-0.5 rounded shrink-0">
                  {f.category}
                </span>
              </div>
              <p className="text-[#475467] leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Texto libre con todo lo demás */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-2xs space-y-3 text-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-[#EAECF0]">
          <FileText className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-sm text-[#101828]">
            Texto libre con información adicional del negocio
          </h3>
        </div>
        <p className="text-[11px] text-[#667085]">
          Añade detalles sobre el equipo médico, premios, certificaciones, instalaciones o cualquier dato que el asistente deba conocer.
        </p>
        <textarea
          rows={5}
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl p-3 text-[#101828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 leading-relaxed"
        />
      </div>

      {/* Botón Guardar Cambios */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSaveAll}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saved ? "Guardado con éxito!" : "Guardar Todo el Conocimiento"}</span>
        </button>
      </div>

      {/* Modal: Importar desde una Web */}
      {showCrawlerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-[#EAECF0] space-y-5 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
              <div className="flex items-center gap-2">
                <DownloadCloud className="w-5 h-5 text-teal-700" />
                <h3 className="font-bold text-sm text-[#101828]">Importar desde una web</h3>
              </div>
              <button
                onClick={() => setShowCrawlerModal(false)}
                className="p-1 text-[#667085] hover:text-[#101828] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-medium text-[#344054]">
                URL de la página web del negocio:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={crawlUrl}
                  onChange={(e) => setCrawlUrl(e.target.value)}
                  placeholder="https://clinicalumen.es"
                  className="flex-1 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl px-3 py-2 text-[#101828]"
                />
                <button
                  onClick={handleStartCrawl}
                  disabled={crawling}
                  className="bg-teal-700 hover:bg-teal-800 disabled:bg-[#D0D5DD] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                >
                  {crawling ? "Rastreando..." : "Analizar Web"}
                </button>
              </div>
            </div>

            {/* Resultado de la Propuesta */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {crawling ? (
                <div className="h-48 flex flex-col items-center justify-center space-y-3 text-xs text-[#667085]">
                  <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
                  <p>Descargando páginas internas y estructurando con IA...</p>
                </div>
              ) : crawlResult ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900">
                    <p className="font-semibold">
                      ✅ {crawlResult.pagesScraped?.length || 1} página(s) analizada(s).
                    </p>
                    <p className="text-[11px] text-teal-800 mt-0.5">
                      Selecciona qué elementos deseas añadir a tu catálogo de Conocimiento:
                    </p>
                  </div>

                  {/* Servicios Propuestos */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-[#101828]">Servicios encontrados:</h4>
                    <div className="space-y-2">
                      {crawlResult.proposal?.services?.map((s: any, idx: number) => {
                        const isChecked = selectedProposedServices.includes(idx);
                        return (
                          <label
                            key={idx}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
                              isChecked ? "bg-teal-50/50 border-teal-500" : "bg-[#FAFAFA] border-[#EAECF0]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedProposedServices(
                                    selectedProposedServices.filter((i) => i !== idx)
                                  );
                                } else {
                                  setSelectedProposedServices([...selectedProposedServices, idx]);
                                }
                              }}
                              className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-[#101828]">
                                {s.name} — {s.price === 0 ? "Gratis" : `${s.price} €`} ({s.durationMinutes} min)
                              </p>
                              <p className="text-[11px] text-[#667085]">{s.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* FAQs Propuestas */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-[#101828]">Preguntas Frecuentes detectadas:</h4>
                    <div className="space-y-2">
                      {crawlResult.proposal?.faqs?.map((f: any, idx: number) => {
                        const isChecked = selectedProposedFaqs.includes(idx);
                        return (
                          <label
                            key={idx}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
                              isChecked ? "bg-teal-50/50 border-teal-500" : "bg-[#FAFAFA] border-[#EAECF0]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedProposedFaqs(
                                    selectedProposedFaqs.filter((i) => i !== idx)
                                  );
                                } else {
                                  setSelectedProposedFaqs([...selectedProposedFaqs, idx]);
                                }
                              }}
                              className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-[#101828]">{f.question}</p>
                              <p className="text-[11px] text-[#667085]">{f.answer}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-xs text-[#98A2B3] border border-dashed border-[#EAECF0] rounded-xl text-center p-4">
                  Introduce la URL de tu clínica o negocio para iniciar el análisis automático.
                </div>
              )}
            </div>

            {crawlResult && (
              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAECF0]">
                <button
                  onClick={() => setShowCrawlerModal(false)}
                  className="px-4 py-2 border border-[#D0D5DD] rounded-xl text-xs font-semibold text-[#344054]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApplyProposal}
                  disabled={savingProposal}
                  className="bg-teal-700 hover:bg-teal-800 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-xs"
                >
                  {savingProposal ? "Guardando..." : "Guardar selección"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
