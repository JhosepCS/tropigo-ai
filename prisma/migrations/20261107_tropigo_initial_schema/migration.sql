-- =================================================================
-- TROPIGO: MIGRACIÓN INICIAL DDL POSTGRESQL (SUPABASE / LOCAL)
-- =================================================================

-- 1. LOCALIDADES Y ZONIFICACIÓN
CREATE TABLE IF NOT EXISTS "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'Cochabamba',
    "country" TEXT NOT NULL DEFAULT 'BO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "City_name_key" ON "City"("name");
CREATE INDEX IF NOT EXISTS "City_name_idx" ON "City"("name");

CREATE TABLE IF NOT EXISTS "DeliveryZone" (
    "id" TEXT NOT NULL,
    "cityId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseDeliveryCost" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "baseRideCost" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 20,
    "polygonGeoJson" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DeliveryZone_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryZone_cityId_name_key" ON "DeliveryZone"("cityId", "name");
CREATE INDEX IF NOT EXISTS "DeliveryZone_cityId_isActive_idx" ON "DeliveryZone"("cityId", "isActive");

-- 2. USUARIOS, SEGURIDAD, PERFILES Y SESIONES
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
CREATE INDEX IF NOT EXISTS "User_role_status_idx" ON "User"("role", "status");

CREATE TABLE IF NOT EXISTS "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "documentNumber" TEXT,
    "internalNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Profile_userId_key" ON "Profile"("userId");

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
CREATE INDEX IF NOT EXISTS "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsappLid" TEXT,
    "name" TEXT,
    "defaultAddress" TEXT,
    "referencePoint" TEXT,
    "savedLatitude" DOUBLE PRECISION,
    "savedLongitude" DOUBLE PRECISION,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRides" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_phone_key" ON "Customer"("phone");
CREATE INDEX IF NOT EXISTS "Customer_phone_idx" ON "Customer"("phone");

CREATE TABLE IF NOT EXISTS "UserAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "customerId" TEXT,
    "zoneId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Casa',
    "streetAddress" TEXT NOT NULL,
    "referencePoint" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAddress_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "DeliveryZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserAddress_customerId_idx" ON "UserAddress"("customerId");
CREATE INDEX IF NOT EXISTS "UserAddress_userId_idx" ON "UserAddress"("userId");

-- 3. COMERCIOS Y SUCURSALES
CREATE TABLE IF NOT EXISTS "CommercialCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "CommercialCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommercialCategory_name_key" ON "CommercialCategory"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "CommercialCategory_slug_key" ON "CommercialCategory"("slug");

CREATE TABLE IF NOT EXISTS "Merchant" (
    "id" TEXT NOT NULL,
    "cityId" TEXT,
    "categoryId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Restaurante',
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "legalName" TEXT,
    "nit" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.8,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Merchant_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Merchant_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CommercialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Merchant_slug_key" ON "Merchant"("slug");
CREATE INDEX IF NOT EXISTS "Merchant_cityId_isOpen_idx" ON "Merchant"("cityId", "isOpen");
CREATE INDEX IF NOT EXISTS "Merchant_categoryId_idx" ON "Merchant"("categoryId");

CREATE TABLE IF NOT EXISTS "MerchantBranch" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MerchantBranch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MerchantBranch_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MerchantBranch_merchantId_idx" ON "MerchantBranch"("merchantId");

CREATE TABLE IF NOT EXISTS "MerchantSchedule" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MerchantSchedule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MerchantSchedule_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MerchantSchedule_merchantId_dayOfWeek_key" ON "MerchantSchedule"("merchantId", "dayOfWeek");

-- 4. CATÁLOGOS Y PRODUCTOS
CREATE TABLE IF NOT EXISTS "ProductCategory" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductCategory_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProductCategory_merchantId_order_idx" ON "ProductCategory"("merchantId", "order");

CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "productCategoryId" TEXT,
    "category" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "preparationMinutes" INTEGER DEFAULT 15,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Product_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Product_merchantId_isAvailable_idx" ON "Product"("merchantId", "isAvailable");
CREATE INDEX IF NOT EXISTS "Product_productCategoryId_idx" ON "Product"("productCategoryId");

CREATE TABLE IF NOT EXISTS "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");

CREATE TABLE IF NOT EXISTS "ProductOptionGroup" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ProductOptionGroup_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductOptionGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProductOptionGroup_productId_idx" ON "ProductOptionGroup"("productId");

CREATE TABLE IF NOT EXISTS "ProductOptionItem" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "additionalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    CONSTRAINT "ProductOptionItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductOptionItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProductOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Service" (
    "id" TEXT NOT NULL,
    "cityId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "priceType" TEXT NOT NULL DEFAULT 'fixed',
    "requiresAssessment" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Service_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Service_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Service_cityId_isActive_idx" ON "Service"("cityId", "isActive");

-- 5. FLOTA Y REPARTIDORES
CREATE TABLE IF NOT EXISTS "Rider" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "cityId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL DEFAULT 'MOTO',
    "plateNumber" TEXT NOT NULL,
    "vehicleModel" TEXT,
    "vehicleColor" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "currentLocation" TEXT,
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "totalRides" INTEGER NOT NULL DEFAULT 0,
    "earnedBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rider_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Rider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Rider_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Rider_userId_key" ON "Rider"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Rider_phone_key" ON "Rider"("phone");
CREATE INDEX IF NOT EXISTS "Rider_cityId_isActive_isAvailable_idx" ON "Rider"("cityId", "isActive", "isAvailable");
CREATE INDEX IF NOT EXISTS "Rider_vehicleType_idx" ON "Rider"("vehicleType");

-- 6. PEDIDOS Y DETALLES HISTÓRICOS
CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "cityId" TEXT,
    "customerId" TEXT NOT NULL,
    "merchantId" TEXT,
    "assignedRiderId" TEXT,
    "deliveryZoneId" TEXT,
    "orderType" TEXT NOT NULL DEFAULT 'DELIVERY',
    "itemsJson" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'EFECTIVO',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "status" TEXT NOT NULL DEFAULT 'RECIBIDO',
    "deliveryAddressText" TEXT NOT NULL,
    "referencePoint" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "customerNotes" TEXT,
    "notes" TEXT,
    "cancellationReason" TEXT,
    "cancelledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Order_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_assignedRiderId_fkey" FOREIGN KEY ("assignedRiderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_deliveryZoneId_fkey" FOREIGN KEY ("deliveryZoneId") REFERENCES "DeliveryZone"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX IF NOT EXISTS "Order_cityId_status_idx" ON "Order"("cityId", "status");
CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX IF NOT EXISTS "Order_assignedRiderId_idx" ON "Order"("assignedRiderId");
CREATE INDEX IF NOT EXISTS "Order_merchantId_idx" ON "Order"("merchantId");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");

CREATE TABLE IF NOT EXISTS "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "variantName" TEXT,
    "optionsSnapshotJson" TEXT,
    "specialInstructions" TEXT,
    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");

CREATE TABLE IF NOT EXISTS "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedByUserId" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");

-- 7. MOVILIDAD (MOTOTAXIS)
CREATE TABLE IF NOT EXISTS "RideTrip" (
    "id" TEXT NOT NULL,
    "tripNumber" TEXT NOT NULL,
    "cityId" TEXT,
    "customerId" TEXT NOT NULL,
    "assignedRiderId" TEXT,
    "originZoneId" TEXT,
    "destZoneId" TEXT,
    "vehicleType" TEXT NOT NULL DEFAULT 'MOTO',
    "originAddress" TEXT NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "originLat" DOUBLE PRECISION,
    "originLng" DOUBLE PRECISION,
    "destLat" DOUBLE PRECISION,
    "destLng" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION,
    "fareAmount" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'EFECTIVO',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "status" TEXT NOT NULL DEFAULT 'SOLICITADO',
    "passengerNotes" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RideTrip_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RideTrip_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RideTrip_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RideTrip_assignedRiderId_fkey" FOREIGN KEY ("assignedRiderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RideTrip_originZoneId_fkey" FOREIGN KEY ("originZoneId") REFERENCES "DeliveryZone"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RideTrip_destZoneId_fkey" FOREIGN KEY ("destZoneId") REFERENCES "DeliveryZone"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "RideTrip_tripNumber_key" ON "RideTrip"("tripNumber");
CREATE INDEX IF NOT EXISTS "RideTrip_cityId_status_idx" ON "RideTrip"("cityId", "status");
CREATE INDEX IF NOT EXISTS "RideTrip_customerId_idx" ON "RideTrip"("customerId");
CREATE INDEX IF NOT EXISTS "RideTrip_assignedRiderId_idx" ON "RideTrip"("assignedRiderId");
CREATE INDEX IF NOT EXISTS "RideTrip_createdAt_idx" ON "RideTrip"("createdAt");

CREATE TABLE IF NOT EXISTS "RideStatusHistory" (
    "id" TEXT NOT NULL,
    "rideTripId" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RideStatusHistory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RideStatusHistory_rideTripId_fkey" FOREIGN KEY ("rideTripId") REFERENCES "RideTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RideStatusHistory_rideTripId_idx" ON "RideStatusHistory"("rideTripId");

-- 8. ATENCIÓN Y CHATS
CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "status" TEXT NOT NULL DEFAULT 'AI_ACTIVE',
    "assignedOperatorId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Conversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Conversation_assignedOperatorId_fkey" FOREIGN KEY ("assignedOperatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Conversation_customerId_channel_idx" ON "Conversation"("customerId", "channel");
CREATE INDEX IF NOT EXISTS "Conversation_status_lastMessageAt_idx" ON "Conversation"("status", "lastMessageAt");

CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaType" TEXT DEFAULT 'text',
    "mediaUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "transcription" TEXT,
    "toolCallsJson" TEXT,
    "tokensUsed" INTEGER,
    "providerModel" TEXT,
    "rawPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

CREATE TABLE IF NOT EXISTS "HandoffHistory" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "operatorId" TEXT,
    "reason" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HandoffHistory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HandoffHistory_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HandoffHistory_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "HandoffHistory_conversationId_idx" ON "HandoffHistory"("conversationId");

-- 9. PAGOS Y QR
CREATE TABLE IF NOT EXISTS "PaymentRecord" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "rideTripId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BOB',
    "provider" TEXT NOT NULL DEFAULT 'QR_SIMPLE',
    "qrStringData" TEXT,
    "receiptImageUrl" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "verifiedByUserId" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PaymentRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentRecord_rideTripId_fkey" FOREIGN KEY ("rideTripId") REFERENCES "RideTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentRecord_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PaymentRecord_orderId_idx" ON "PaymentRecord"("orderId");
CREATE INDEX IF NOT EXISTS "PaymentRecord_rideTripId_idx" ON "PaymentRecord"("rideTripId");
CREATE INDEX IF NOT EXISTS "PaymentRecord_verificationStatus_idx" ON "PaymentRecord"("verificationStatus");

CREATE TABLE IF NOT EXISTS "RiderSettlement" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalOrdersCount" INTEGER NOT NULL DEFAULT 0,
    "totalRidesCount" INTEGER NOT NULL DEFAULT 0,
    "grossEarned" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "platformCommission" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "netPayout" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiderSettlement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RiderSettlement_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RiderSettlement_riderId_status_idx" ON "RiderSettlement"("riderId", "status");

-- 10. ADMINISTRACIÓN Y CONFIGURACIONES
CREATE TABLE IF NOT EXISTS "BusinessProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'TropiGO Ivirgarzama',
    "activity" TEXT NOT NULL DEFAULT 'Plataforma de delivery, mandados y movilidad en mototaxi',
    "cityZone" TEXT NOT NULL DEFAULT 'Ivirgarzama, Trópico de Cochabamba, Bolivia',
    "address" TEXT NOT NULL DEFAULT 'Av. Mortensen esq. Mercado Central, Ivirgarzama',
    "phone" TEXT NOT NULL DEFAULT '+59174389012',
    "website" TEXT NOT NULL DEFAULT 'https://tropigo.bo',
    "currency" TEXT NOT NULL DEFAULT 'BOB',
    "currencySymbol" TEXT NOT NULL DEFAULT 'Bs.',
    "timezone" TEXT NOT NULL DEFAULT 'America/La_Paz',
    "paymentModes" TEXT NOT NULL DEFAULT '["EFECTIVO", "QR_BANCO", "TIGO_MONEY"]',
    "bankQrImage" TEXT,
    "baseDeliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "baseRideFee" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "assistantEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AgencyProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'TropiGO Tecnologías',
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgencyProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WhatsAppConfig" (
    "id" TEXT NOT NULL,
    "activeProvider" TEXT NOT NULL DEFAULT 'BAILEYS_QR',
    "metaPhoneNumberId" TEXT,
    "metaWabaId" TEXT,
    "metaSystemTokenEncrypted" TEXT,
    "metaWebhookVerifyToken" TEXT NOT NULL DEFAULT 'tropigo_verify_token_2025',
    "metaAppSecretEncrypted" TEXT,
    "baileysSessionData" TEXT,
    "baileysStatus" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "baileysQr" TEXT,
    "connectedPhone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssistantConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'TropiBot',
    "avatarUrl" TEXT NOT NULL DEFAULT '/avatar-tropigo.png',
    "tone" TEXT NOT NULL DEFAULT 'cercano',
    "welcomeMessage" TEXT NOT NULL DEFAULT '¡Hola! 👋 Te habla TropiBot, tu asistente de TropiGO en Ivirgarzama. ¿Qué se te antoja pedir hoy? Tenemos delivery de comida, compras de farmacia, mandados y mototaxis.',
    "instructions" TEXT NOT NULL,
    "prohibitedActions" TEXT NOT NULL,
    "operatingHours" TEXT NOT NULL DEFAULT '{}',
    "operatingHoursJson" TEXT NOT NULL DEFAULT '{}',
    "offHoursPolicy" TEXT NOT NULL DEFAULT 'TAKE_MESSAGE',
    "handoffRules" TEXT NOT NULL DEFAULT '[]',
    "handoffRulesJson" TEXT NOT NULL DEFAULT '[]',
    "customHandoffRule" TEXT,
    "activeProvider" TEXT NOT NULL DEFAULT 'GROQ',
    "activeModel" TEXT NOT NULL DEFAULT 'llama-3.3-70b-versatile',
    "safeMode" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssistantConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WorkerCommand" (
    "id" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "payloadJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkerCommand_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WorkerCommand_status_createdAt_idx" ON "WorkerCommand"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "Promotion" (
    "id" TEXT NOT NULL,
    "cityId" TEXT,
    "merchantId" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "discountType" TEXT NOT NULL DEFAULT 'FIXED_AMOUNT',
    "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "minOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "maxDiscount" DOUBLE PRECISION,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Promotion_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Promotion_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Promotion_code_key" ON "Promotion"("code");
CREATE INDEX IF NOT EXISTS "Promotion_code_isActive_idx" ON "Promotion"("code", "isActive");

CREATE TABLE IF NOT EXISTS "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityName" TEXT,
    "entityId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'system',
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "status" TEXT NOT NULL,
    "detailsJson" TEXT,
    "errorText" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ActivityLog_action_createdAt_idx" ON "ActivityLog"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityLog_entityId_idx" ON "ActivityLog"("entityId");
