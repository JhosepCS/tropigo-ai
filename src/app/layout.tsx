import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tropigo Delivery | Panel de Despacho & Asistente IA",
  description: "Sistema de Pedidos con IA y WhatsApp Dual-Engine para Ivirgarzama, Bolivia",
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
