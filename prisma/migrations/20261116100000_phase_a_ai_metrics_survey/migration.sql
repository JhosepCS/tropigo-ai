-- Fase A de mejoras del asistente: encuestas post-entrega, latencia de
-- inferencia y programación de promociones. Migración aditiva: no elimina
-- columnas ni datos existentes.

-- 1. Centro oficial de reparto: Plaza Principal de Ivirgarzama.
--    Se actualizan los valores por defecto y las filas que aún conservan las
--    coordenadas preliminares del casco central.
ALTER TABLE "BusinessProfile"
  ALTER COLUMN "deliveryIncludedKm" SET DEFAULT 2.0,
  ALTER COLUMN "deliveryPerKmFee" SET DEFAULT 2.0,
  ALTER COLUMN "deliveryCenterLatitude" SET DEFAULT -17.033507383798074,
  ALTER COLUMN "deliveryCenterLongitude" SET DEFAULT -64.85743625167643;

UPDATE "BusinessProfile"
SET
  "deliveryCenterName" = 'Plaza Principal de Ivirgarzama',
  "deliveryCenterLatitude" = -17.033507383798074,
  "deliveryCenterLongitude" = -64.85743625167643
WHERE "deliveryCenterLatitude" = -17.0315
  AND "deliveryCenterLongitude" = -64.8615;

-- 2. Latencia de inferencia por mensaje del asistente (métricas A7).
ALTER TABLE "Message" ADD COLUMN "latencyMs" INTEGER;

-- 3. Programación de promociones por día/hora y anuncios automáticos.
ALTER TABLE "Promotion"
  ADD COLUMN "announceMessage" TEXT,
  ADD COLUMN "autoAnnounce" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "scheduleDays" TEXT,
  ADD COLUMN "scheduleEnd" TEXT,
  ADD COLUMN "scheduleStart" TEXT;

-- 4. Encuesta de satisfacción post-entrega (A2).
CREATE TABLE "OrderRating" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderRating_orderId_key" ON "OrderRating"("orderId");
CREATE INDEX "OrderRating_rating_createdAt_idx" ON "OrderRating"("rating", "createdAt");

ALTER TABLE "OrderRating"
  ADD CONSTRAINT "OrderRating_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
