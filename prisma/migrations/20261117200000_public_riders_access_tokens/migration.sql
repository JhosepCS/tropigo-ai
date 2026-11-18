-- Registro público de repartidores, enlaces de acceso rápido por token y
-- avisos de pedidos al comercio y al repartidor. Migración aditiva: no
-- elimina columnas ni datos existentes.

-- 1. Repartidores: estado de aprobación, token de acceso y origen del registro.
ALTER TABLE "Rider"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVO',
  ADD COLUMN "accessToken" TEXT,
  ADD COLUMN "registeredViaWeb" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Rider_accessToken_key" ON "Rider"("accessToken");
CREATE INDEX "Rider_status_idx" ON "Rider"("status");

-- 2. Comercios: enlace de acceso rápido para el panel de cocina.
ALTER TABLE "Merchant" ADD COLUMN "accessToken" TEXT;
CREATE UNIQUE INDEX "Merchant_accessToken_key" ON "Merchant"("accessToken");

-- 3. Pedidos: confirmaciones del repartidor y control de avisos enviados.
ALTER TABLE "Order"
  ADD COLUMN "riderAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "riderArrivedAt" TIMESTAMP(3),
  ADD COLUMN "merchantNotifiedAt" TIMESTAMP(3),
  ADD COLUMN "riderNotifiedAt" TIMESTAMP(3);
