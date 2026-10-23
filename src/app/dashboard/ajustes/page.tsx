import { prisma } from "@/lib/prisma";
import { AjustesClient } from "./ajustes-client";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const business = await prisma.businessProfile.findFirst();
  const agency = await prisma.agencyProfile.findFirst();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Ajustes del Sistema</h2>
        <p className="text-sm text-[#475467]">
          Configuración general, modelo de IA con catálogo de OpenRouter, marca blanca de la agencia y gestión de usuarios.
        </p>
      </div>

      <AjustesClient
        initialBusiness={business as any}
        initialAgency={agency as any}
        users={users as any}
      />
    </div>
  );
}
