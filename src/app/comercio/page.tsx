import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ChefHat, Clock, Phone, MapPin, CheckCircle, Printer, Store } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ComercioPage() {
  const session = await getSession();

  let merchant = null;
  if (session?.role === "MERCHANT_OWNER") {
    merchant = await prisma.merchant.findFirst({
      where: { ownerId: session.userId },
      include: {
        products: { where: { isAvailable: true } },
      },
    });
  }

  // Fallback si es un admin o supervisor
  if (!merchant) {
    merchant = await prisma.merchant.findFirst({
      where: { isOpen: true },
      include: {
        products: { where: { isAvailable: true } },
      },
    });
  }

  if (!merchant) {
    return (
      <EmptyState
        icon={<Store className="w-8 h-8 text-slate-400" />}
        title="Sin comercio afiliado"
        description="Tu cuenta no tiene un comercio asignado en este momento. Solicita al administrador la vinculación de tu restaurante."
      />
    );
  }

  // Solo consulta pedidos correspondientes estrictamente a su comercio
  const orders = await prisma.order.findMany({
    where: {
      merchantId: merchant.id,
    },
    include: {
      customer: true,
      assignedRider: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return (
    <div className="space-y-6">
      {/* Encabezado del Comercio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Vista de Cocina en Vivo
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5">
            Comandas de {merchant.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {orders.length} pedidos registrados hoy • Platos listos para entrega inmediata
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />}>
            Probar Impresora Térmica
          </Button>
        </div>
      </div>

      {/* Grid de Comandas */}
      {orders.length === 0 ? (
        <EmptyState
          icon={<ChefHat className="w-8 h-8 text-emerald-600" />}
          title="Sin comandas pendientes en cocina"
          description="Los nuevos pedidos de comida de Ivirgarzama ingresarán automáticamente a esta pantalla con alerta sonora."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((order) => {
            const items = order.items.length > 0
              ? order.items
              : JSON.parse(order.itemsJson || "[]");

            const isPending = order.status === "RECIBIDO" || order.status === "EN_PREPARACION";

            return (
              <Card key={order.id} className={isPending ? "border-amber-300 shadow-sm" : ""}>
                <CardHeader className="bg-slate-50/60 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Orden
                    </span>
                    <CardTitle className="text-base text-slate-900">
                      {order.orderNumber}
                    </CardTitle>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  {/* Lista de Platos */}
                  <div className="space-y-2 border-b border-slate-100 pb-3">
                    {items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-start justify-between text-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900">
                            {item.quantity}x {item.productName || item.name}
                          </p>
                          {(item.specialInstructions || item.notes) && (
                            <p className="text-[11px] text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded">
                              Nota: {item.specialInstructions || item.notes}
                            </p>
                          )}
                        </div>
                        <span className="font-semibold text-slate-600">
                          {((item.unitPrice || item.price || 0) * (item.quantity || 1)).toFixed(2)} Bs.
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Datos del Cliente y Repartidor */}
                  <div className="text-[11px] text-slate-500 space-y-1">
                    <p className="flex items-center gap-1.5 font-medium text-slate-700">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      Cliente: {order.customer.name || order.customer.phone}
                    </p>
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {order.deliveryAddressText}
                    </p>
                    {order.assignedRider && (
                      <p className="text-emerald-700 font-bold flex items-center gap-1 pt-1">
                        🛵 Repartidor: {order.assignedRider.name}
                      </p>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">
                    Total: {order.totalAmount.toFixed(2)} Bs.
                  </span>

                  {order.status === "RECIBIDO" && (
                    <Button variant="solar" size="sm">
                      Aceptar a Cocina
                    </Button>
                  )}

                  {order.status === "EN_PREPARACION" && (
                    <Button variant="primary" size="sm" leftIcon={<CheckCircle className="w-3.5 h-3.5" />}>
                      Marcar Listo
                    </Button>
                  )}

                  {order.status === "ENTREGADO" && (
                    <span className="text-[11px] font-bold text-emerald-700">
                      ✓ Completado
                    </span>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
