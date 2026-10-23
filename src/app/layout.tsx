import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atiende | Asistente de IA para Negocios Locales",
  description: "Asistente de IA para WhatsApp y Web que atiende clientes, agenda citas en Google Calendar y avisa al equipo.",
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
