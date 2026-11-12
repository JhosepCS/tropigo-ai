-- Migración aditiva: pagos QR configurables, distancia real, GPS y fidelidad.
-- No elimina ni modifica datos existentes.

ALTER TABLE "BusinessProfile"
  ADD COLUMN IF NOT EXISTS "paymentMethodsJson" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryIncludedKm" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS "deliveryPerKmFee" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS "loyaltyDoubleStampsUntil" TIMESTAMP(3);

ALTER TABLE "Rider"
  ADD COLUMN IF NOT EXISTS "lastLocationAt" TIMESTAMP(3);

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "distanceKm" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "distanceSurcharge" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

ALTER TABLE "OrderQuote"
  ADD COLUMN IF NOT EXISTS "distanceKm" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "distanceSurcharge" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

ALTER TABLE "PaymentRecord"
  ADD COLUMN IF NOT EXISTS "methodId" TEXT,
  ADD COLUMN IF NOT EXISTS "reference" TEXT,
  ADD COLUMN IF NOT EXISTS "reportedByCustomer" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "PaymentRecord_methodId_idx"
  ON "PaymentRecord" ("methodId");
