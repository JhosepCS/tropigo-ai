-- Migración aditiva: fidelidad por carreras de mototaxi.
-- No borra datos existentes.

ALTER TABLE "BusinessProfile"
  ADD COLUMN IF NOT EXISTS "loyaltyCountRides" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "RideTrip"
  ADD COLUMN IF NOT EXISTS "loyaltyStampsAwarded" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "LoyaltyEvent"
  ADD COLUMN IF NOT EXISTS "rideId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyEvent_customerId_rideId_type_key"
  ON "LoyaltyEvent" ("customerId", "rideId", "type");

CREATE INDEX IF NOT EXISTS "LoyaltyEvent_rideId_idx"
  ON "LoyaltyEvent" ("rideId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'LoyaltyEvent_rideId_fkey'
  ) THEN
    ALTER TABLE "LoyaltyEvent"
      ADD CONSTRAINT "LoyaltyEvent_rideId_fkey"
      FOREIGN KEY ("rideId") REFERENCES "RideTrip"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
