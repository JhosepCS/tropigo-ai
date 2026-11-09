import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TropiGO | Movemos el Trópico — Delivery & Mototaxis en Ivirgarzama",
  description:
    "Plataforma profesional de delivery de comida, compras de farmacia, mandados express y mototaxis en Ivirgarzama y el Trópico de Cochabamba.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#F9FAFB] text-[#101828] antialiased">
        {children}
      </body>
    </html>
  );
}
