"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Link as LinkIcon, Check } from "lucide-react";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  helperText?: string;
}

export function ImageUploader({
  value,
  onChange,
  label = "Foto o Imagen",
  helperText = "Sube una imagen desde tu dispositivo (JPG, PNG) o pega una URL directa.",
}: ImageUploaderProps) {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comprimir imagen usando Canvas del navegador
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 900;
          const MAX_HEIGHT = 900;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.82);
          resolve(compressed);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const dataUrl = await compressImage(file);
      onChange(dataUrl);
    } catch (err) {
      console.error("Error al procesar imagen:", err);
      alert("No se pudo procesar la imagen seleccionada.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <label className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>{label}</span>
        </label>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`px-2 py-0.5 rounded font-bold transition-colors ${
              mode === "file"
                ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Subir archivo
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-2 py-0.5 rounded font-bold transition-colors ${
              mode === "url"
                ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Pegar enlace
          </button>
        </div>
      </div>

      {mode === "file" ? (
        <div className="space-y-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp,image/jpg"
            onChange={handleFileChange}
            className="hidden"
          />

          {!value ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30 group"
            >
              <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mx-auto mb-1 transition-colors" />
              <p className="font-bold text-slate-700 dark:text-slate-300">
                {loading ? "Comprimiendo y cargando..." : "Haz clic para seleccionar o arrastra una imagen"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG o WebP desde tu computadora o celular</p>
            </div>
          ) : (
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-between p-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-white">
                  <img src={value} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Imagen cargada con éxito</span>
                  </p>
                  <p className="text-[10px] text-slate-400">Optimizada para visualización y WhatsApp</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cambiar
                </button>
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg"
                  title="Eliminar imagen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://images.unsplash.com/... o enlace público de foto"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
            {value && (
              <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 bg-slate-100">
                <img src={value} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
      )}

      {helperText && <p className="text-[10px] text-slate-400">{helperText}</p>}
    </div>
  );
}
