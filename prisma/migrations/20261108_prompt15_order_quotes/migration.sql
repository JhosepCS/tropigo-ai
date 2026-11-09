-- =================================================================
-- PROMPT 15: COTIZACIONES DE PEDIDO Y NUMERACIÓN ATÓMICA
-- Migración aditiva. No elimina ni reemplaza datos existentes.
-- =================================================================

CREATE TABLE IF NOT EXISTS "OrderQuote" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "conversationId" TEXT,
    "merchantId" TEXT NOT NULL,
    "deliveryZoneId" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "deliveryFee" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'EFECTIVO',
    "deliveryAddressText" TEXT NOT NULL,
    "referencePoint" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "customerNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderQuote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrderQuote_token_key" ON "OrderQuote"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "OrderQuote_orderId_key" ON "OrderQuote"("orderId");
CREATE INDEX IF NOT EXISTS "OrderQuote_customerId_status_idx" ON "OrderQuote"("customerId", "status");
CREATE INDEX IF NOT EXISTS "OrderQuote_conversationId_status_idx" ON "OrderQuote"("conversationId", "status");
CREATE INDEX IF NOT EXISTS "OrderQuote_expiresAt_idx" ON "OrderQuote"("expiresAt");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderQuote_customerId_fkey') THEN
        ALTER TABLE "OrderQuote"
            ADD CONSTRAINT "OrderQuote_customerId_fkey"
            FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderQuote_conversationId_fkey') THEN
        ALTER TABLE "OrderQuote"
            ADD CONSTRAINT "OrderQuote_conversationId_fkey"
            FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderQuote_merchantId_fkey') THEN
        ALTER TABLE "OrderQuote"
            ADD CONSTRAINT "OrderQuote_merchantId_fkey"
            FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderQuote_deliveryZoneId_fkey') THEN
        ALTER TABLE "OrderQuote"
            ADD CONSTRAINT "OrderQuote_deliveryZoneId_fkey"
            FOREIGN KEY ("deliveryZoneId") REFERENCES "DeliveryZone"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderQuote_orderId_fkey') THEN
        ALTER TABLE "OrderQuote"
            ADD CONSTRAINT "OrderQuote_orderId_fkey"
            FOREIGN KEY ("orderId") REFERENCES "Order"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "OrderCounter" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderCounter_pkey" PRIMARY KEY ("id")
);

-- Inicializar el contador con el mayor TRP-XXXX existente.
-- Si la tabla está vacía, el primer pedido será TRP-1042.
INSERT INTO "OrderCounter" ("id", "value", "updatedAt")
SELECT
    'orders',
    COALESCE(MAX(CAST(SUBSTRING("orderNumber" FROM 5) AS INTEGER)), 1041),
    CURRENT_TIMESTAMP
FROM "Order"
WHERE "orderNumber" ~ '^TRP-[0-9]+$'
ON CONFLICT ("id") DO NOTHING;
