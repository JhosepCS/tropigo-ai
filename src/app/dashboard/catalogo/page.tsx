import { prisma } from "@/lib/prisma";
import { CatalogoClient } from "./catalogo-client";

export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  const merchants = await prisma.merchant.findMany({
    include: {
      products: {
        orderBy: { category: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#101828]">Catálogo de Comercios y Menús</h2>
        <p className="text-sm text-[#475467]">
          Gestiona los restaurantes afiliados, precios en Bolivianos (Bs.) y marca productos como "Agotado" con un clic para que TropiBot no los ofrezca en WhatsApp.
        </p>
      </div>

      <CatalogoClient initialMerchants={merchants as any} />
    </div>
  );
}
