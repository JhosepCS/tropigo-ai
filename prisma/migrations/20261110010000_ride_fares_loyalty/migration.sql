-- AlterTable
ALTER TABLE "BusinessProfile" ADD COLUMN     "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "loyaltyRewardDescription" TEXT NOT NULL DEFAULT '10mo pedido gratis',
ADD COLUMN     "loyaltyRewardFreeDelivery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "loyaltyStampsRequired" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "rideMinFare" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
ADD COLUMN     "rideToritoSurcharge" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ALTER COLUMN "baseRideFee" SET DEFAULT 10.0;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "loyaltyCode" TEXT,
ADD COLUMN     "loyaltyRewardsRedeemed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "loyaltyStamps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "loyaltyTotalEarned" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "DeliveryZone" ALTER COLUMN "baseRideCost" SET DEFAULT 10.0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "loyaltyRewardApplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "loyaltyStampsAwarded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderQuote" ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "loyaltyRewardApplied" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RideTrip" ALTER COLUMN "fareAmount" SET DEFAULT 10.0;

-- CreateTable
CREATE TABLE "LoyaltyEvent" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" TEXT NOT NULL,
    "stampsDelta" INTEGER NOT NULL DEFAULT 0,
    "stampsAfter" INTEGER NOT NULL,
    "description" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoyaltyEvent_customerId_createdAt_idx" ON "LoyaltyEvent"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyEvent_orderId_idx" ON "LoyaltyEvent"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyEvent_customerId_orderId_type_key" ON "LoyaltyEvent"("customerId", "orderId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_loyaltyCode_key" ON "Customer"("loyaltyCode");

-- CreateIndex
CREATE INDEX "Customer_loyaltyCode_idx" ON "Customer"("loyaltyCode");

-- AddForeignKey
ALTER TABLE "LoyaltyEvent" ADD CONSTRAINT "LoyaltyEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyEvent" ADD CONSTRAINT "LoyaltyEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- DATOS: TARIFA MINIMA DE CARRERA Y CODIGOS DE FIDELIDAD EXISTENTES
-- =====================================================================

-- Ninguna carrera puede quedar por debajo de la tarifa minima oficial.
UPDATE "BusinessProfile"
SET "baseRideFee" = GREATEST("baseRideFee", 10.0),
    "rideMinFare" = GREATEST("rideMinFare", 10.0);

UPDATE "DeliveryZone"
SET "baseRideCost" = GREATEST("baseRideCost", 10.0);

-- Cada cliente existente recibe un codigo publico unico para su QR personal.
UPDATE "Customer"
SET "loyaltyCode" = 'TGO-' || upper(substr(md5(random()::text || "id"), 1, 8))
WHERE "loyaltyCode" IS NULL;
