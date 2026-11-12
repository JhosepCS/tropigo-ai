-- Migración aditiva: operador IA para clientes.
-- Centro de distancia (Plaza Principal de Ivirgarzama), ubicación persistente,
-- QR personal de cobro del repartidor, análisis de comprobantes y asignación
-- automática de repartidores. No elimina ni modifica datos existentes.

ALTER TABLE "BusinessProfile"
  ADD COLUMN IF NOT EXISTS "deliveryCenterName" TEXT NOT NULL DEFAULT 'Plaza Principal de Ivirgarzama',
  ADD COLUMN IF NOT EXISTS "deliveryCenterLatitude" DOUBLE PRECISION NOT NULL DEFAULT -16.9833,
  ADD COLUMN IF NOT EXISTS "deliveryCenterLongitude" DOUBLE PRECISION NOT NULL DEFAULT -64.7667,
  ADD COLUMN IF NOT EXISTS "autoAssignRiders" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "lastLocationLabel" TEXT;

ALTER TABLE "Rider"
  ADD COLUMN IF NOT EXISTS "paymentQrJson" TEXT;

ALTER TABLE "PaymentRecord"
  ADD COLUMN IF NOT EXISTS "receiptAnalysisJson" TEXT;

-- Activar el cobro por distancia desde la plaza para la configuración actual.
-- Si el negocio ya tenía un recargo configurado, se conserva.
UPDATE "BusinessProfile"
SET
  "deliveryIncludedKm" = 2.0,
  "deliveryPerKmFee" = 2.0
WHERE "deliveryPerKmFee" = 0.0;
