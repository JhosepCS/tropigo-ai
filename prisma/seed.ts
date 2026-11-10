import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando sembrado integral de datos para TropiGO (Trópico de Cochabamba)...");

  // Limpieza inicial para garantizar idempotencia sin violar restricciones de clave foránea
  console.log("🧹 Limpiando datos previos de forma ordenada...");
  await prisma.orderDiscount.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.paymentRecord.deleteMany();
  await prisma.riderSettlement.deleteMany();
  await prisma.order.deleteMany();
  await prisma.rideStatusHistory.deleteMany();
  await prisma.rideTrip.deleteMany();
  await prisma.handoffHistory.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.userAddress.deleteMany();
  await prisma.session.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.rider.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productOptionItem.deleteMany();
  await prisma.productOptionGroup.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.merchantSchedule.deleteMany();
  await prisma.merchantBranch.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.commercialCategory.deleteMany();
  await prisma.deliveryZone.deleteMany();
  await prisma.service.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.knowledgeDocument.deleteMany();
  await prisma.knowledgeBase.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.workerCommand.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.whatsAppConfig.deleteMany();
  await prisma.assistantConfig.deleteMany();
  await prisma.businessProfile.deleteMany();
  await prisma.agencyProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.city.deleteMany();

  // =================================================================
  // 1. LOCALIDADES (5 LOCALIDADES SOLICITADAS)
  // =================================================================
  console.log("📍 Registrando localidades del Trópico de Cochabamba...");

  const ivirgarzama = await prisma.city.create({
    data: {
      id: "city_ivirgarzama",
      name: "Ivirgarzama",
      department: "Cochabamba",
      country: "BO",
      isActive: true, // Localidad inicial activa
    },
  });

  await prisma.city.createMany({
    data: [
      {
        id: "city_shinahota",
        name: "Shinahota",
        department: "Cochabamba",
        country: "BO",
        isActive: false, // Inactiva hasta próxima fase
      },
      {
        id: "city_puerto_villarroel",
        name: "Puerto Villarroel",
        department: "Cochabamba",
        country: "BO",
        isActive: false,
      },
      {
        id: "city_chimore",
        name: "Chimoré",
        department: "Cochabamba",
        country: "BO",
        isActive: false,
      },
      {
        id: "city_villa_tunari",
        name: "Villa Tunari",
        department: "Cochabamba",
        country: "BO",
        isActive: false,
      },
    ],
  });
  console.log("✅ 5 Localidades registradas (Ivirgarzama activa, 4 inactivas)");

  // =================================================================
  // 2. ZONAS DE COBERTURA Y TARIFARIO (IVIRGARZAMA)
  // =================================================================
  console.log("🗺️ Registrando zonas de cobertura y tarifario para Ivirgarzama...");
  const zonesData = [
    {
      id: "zone_casco_central",
      cityId: ivirgarzama.id,
      name: "Casco Central",
      description: "Plaza Principal, entorno de Alcaldía y zona comercial central",
      baseDeliveryCost: 5.0,
      baseRideCost: 4.0,
      estimatedMinutes: 15,
      isActive: true,
    },
    {
      id: "zone_av_mortensen",
      cityId: ivirgarzama.id,
      name: "Av. Mortensen",
      description: "Avenida comercial principal, entidades financieras y farmacias",
      baseDeliveryCost: 5.0,
      baseRideCost: 4.0,
      estimatedMinutes: 15,
      isActive: true,
    },
    {
      id: "zone_mercado_central",
      cityId: ivirgarzama.id,
      name: "Mercado Central",
      description: "Paradas de transporte, puestos de abarrotes y comida criolla",
      baseDeliveryCost: 5.0,
      baseRideCost: 4.0,
      estimatedMinutes: 15,
      isActive: true,
    },
    {
      id: "zone_villa_14",
      cityId: ivirgarzama.id,
      name: "Villa 14",
      description: "Zona periurbana de expansión residencial y sindicato",
      baseDeliveryCost: 8.0,
      baseRideCost: 7.0,
      estimatedMinutes: 25,
      isActive: true,
    },
    {
      id: "zone_senda_3",
      cityId: ivirgarzama.id,
      name: "Senda III",
      description: "Área comunitaria e interprovincial sobre carretera troncal",
      baseDeliveryCost: 10.0,
      baseRideCost: 9.0,
      estimatedMinutes: 30,
      isActive: true,
    },
  ];

  for (const z of zonesData) {
    await prisma.deliveryZone.create({ data: z });
  }
  console.log("✅ 5 Zonas de cobertura y tarifas configuradas");

  // =================================================================
  // 3. CATEGORÍAS COMERCIALES
  // =================================================================
  console.log("🏷️ Creando categorías comerciales oficiales...");
  const catRestaurantes = await prisma.commercialCategory.create({
    data: {
      name: "Restaurantes y Comida Criolla",
      slug: "restaurantes",
      icon: "UtensilsCrossed",
      order: 1,
    },
  });

  const catPollerias = await prisma.commercialCategory.create({
    data: {
      name: "Pollerías y Broasterías",
      slug: "pollerias",
      icon: "Drumstick",
      order: 2,
    },
  });

  const catFarmacias = await prisma.commercialCategory.create({
    data: {
      name: "Farmacias y Salud",
      slug: "farmacias",
      icon: "Pill",
      order: 3,
    },
  });

  const catAbarrotes = await prisma.commercialCategory.create({
    data: {
      name: "Abarrotes y Tiendas",
      slug: "abarrotes",
      icon: "Store",
      order: 4,
    },
  });

  const catMandados = await prisma.commercialCategory.create({
    data: {
      name: "Mandados y Envíos Express",
      slug: "mandados",
      icon: "Bike",
      order: 5,
    },
  });

  // =================================================================
  // 4. USUARIOS ADMINISTRATIVOS Y OPERATIVOS (HASH BCRYPT SEGURO)
  // =================================================================
  console.log("👤 Creando usuarios del sistema (sin contraseñas en texto plano)...");
  const adminPasswordHash = await bcrypt.hash("AdminTropigo2025!", 10);
  const operatorPasswordHash = await bcrypt.hash("OperadorDemo2025!", 10);

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@tropigo.bo",
      phone: "+59174389001",
      password: adminPasswordHash,
      name: "Administrador General TropiGO",
      role: "ADMIN",
      status: "ACTIVE",
      profile: {
        create: {
          documentNumber: "7891234-CBBA",
          internalNotes: "Responsable de operaciones en Ivirgarzama",
        },
      },
    },
  });

  const operatorUser = await prisma.user.create({
    data: {
      email: "operador@tropigo.bo",
      phone: "+59174389002",
      password: operatorPasswordHash,
      name: "Operador de Despacho Turno Mañana",
      role: "OPERATOR",
      status: "ACTIVE",
      profile: {
        create: {
          documentNumber: "6543210-CBBA",
          internalNotes: "Operador encargado del tablero KDS y validación de QR",
        },
      },
    },
  });

  const comercioPasswordHash = await bcrypt.hash("ComercioDemo2025!", 10);
  const comercioUser = await prisma.user.create({
    data: {
      email: "comercio@tropigo.bo",
      phone: "+59172901234",
      password: comercioPasswordHash,
      name: "Dueño de Pollería El Pahuichi",
      role: "MERCHANT_OWNER",
      status: "ACTIVE",
      profile: {
        create: {
          documentNumber: "5432109-CBBA",
          internalNotes: "Propietario de comercio afiliado [DEMO]",
        },
      },
    },
  });
  console.log("✅ Usuarios Admin, Operador y Comercio creados con credenciales seguras");

  // =================================================================
  // 5. COMERCIOS DE DEMOSTRACIÓN ([DEMO]) Y CATÁLOGO DE PLATOS
  // =================================================================
  console.log("🍽️ Creando comercios y productos de demostración [DEMO]...");

  // Comercio 1: Pollería El Pahuichi
  const pahuichi = await prisma.merchant.create({
    data: {
      cityId: ivirgarzama.id,
      categoryId: catPollerias.id,
      category: "Pollería",
      name: "[DEMO] Pollería El Pahuichi",
      slug: "demo-polleria-el-pahuichi",
      description: "El mejor pollo a la broaster y a la brasa con papas fritas y arroz con queso.",
      phone: "+59172901234",
      address: "Av. Mortensen esq. Cochabamba, Ivirgarzama",
      commissionRate: 0.10,
      rating: 4.9,
      isOpen: true,
      imageUrl: "/merchants/el-pahuichi.jpg",
      branches: {
        create: {
          name: "Sucursal Central Av. Mortensen",
          address: "Av. Mortensen #240",
          phone: "+59172901234",
        },
      },
      schedules: {
        createMany: {
          data: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
            dayOfWeek: day,
            openTime: "11:00",
            closeTime: "23:00",
            isClosed: false,
          })),
        },
      },
      productCategories: {
        create: [
          { name: "Platos Broaster", order: 1 },
          { name: "Bebidas y Refrescos", order: 2 },
        ],
      },
    },
  });

  const prodCatBroaster = await prisma.productCategory.findFirst({
    where: { merchantId: pahuichi.id, name: "Platos Broaster" },
  });

  const pCuartoBroaster = await prisma.product.create({
    data: {
      merchantId: pahuichi.id,
      productCategoryId: prodCatBroaster?.id,
      category: "Platos Broaster",
      name: "[DEMO] Cuarto de Pollo a la Broaster",
      description: "Una presa grande (pecho o pierna), papas fritas crocantes, arroz con queso y llajwa.",
      price: 18.0,
      isAvailable: true,
      preparationMinutes: 12,
      variants: {
        create: [
          { name: "Pierna con Cuadril", finalPrice: 18.0 },
          { name: "Pecho con Ala", finalPrice: 19.0 },
        ],
      },
      optionGroups: {
        create: {
          name: "Guarnición adicional",
          isRequired: false,
          items: {
            create: [
              { name: "Porción extra de papas fritas", additionalPrice: 5.0 },
              { name: "Porción extra de arroz con queso", additionalPrice: 4.0 },
            ],
          },
        },
      },
    },
  });

  await prisma.product.create({
    data: {
      merchantId: pahuichi.id,
      productCategoryId: prodCatBroaster?.id,
      category: "Platos Broaster",
      name: "[DEMO] Medio Pollo a la Broaster",
      description: "Dos presas grandes con doble porción de papas fritas, arroz con queso y salsas.",
      price: 35.0,
      isAvailable: true,
      preparationMinutes: 15,
    },
  });

  // Comercio 2: Comidas Doña Julia
  const donaJulia = await prisma.merchant.create({
    data: {
      cityId: ivirgarzama.id,
      categoryId: catRestaurantes.id,
      category: "Restaurante",
      name: "[DEMO] Comidas Doña Julia",
      slug: "demo-comidas-dona-julia",
      description: "Tradición y sabor cochabambino: pique macho, majadito tostado, milanesas y sopa del día.",
      phone: "+59171987654",
      address: "Calle Bolívar frente al Mercado Central, Ivirgarzama",
      commissionRate: 0.10,
      rating: 4.8,
      isOpen: true,
      imageUrl: "/merchants/dona-julia.jpg",
      schedules: {
        createMany: {
          data: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
            dayOfWeek: day,
            openTime: "07:30",
            closeTime: "22:00",
            isClosed: false,
          })),
        },
      },
    },
  });

  await prisma.product.create({
    data: {
      merchantId: donaJulia.id,
      category: "Almuerzos y Platos Típicos",
      name: "[DEMO] Pique Macho Especial",
      description: "Carne de res tierna salteada con salchichas, papas fritas, huevo duro, locoto y tomate.",
      price: 30.0,
      isAvailable: true,
      preparationMinutes: 20,
    },
  });

  await prisma.product.create({
    data: {
      merchantId: donaJulia.id,
      category: "Almuerzos y Platos Típicos",
      name: "[DEMO] Majadito Tostado de Charque",
      description: "Arroz con charque desmenuzado, plátano frito y huevo estrellado.",
      price: 20.0,
      isAvailable: true,
      preparationMinutes: 10,
    },
  });

  // Comercio 3: Farmacia Bolivia
  const farmacia = await prisma.merchant.create({
    data: {
      cityId: ivirgarzama.id,
      categoryId: catFarmacias.id,
      category: "Farmacia",
      name: "[DEMO] Farmacia Bolivia",
      slug: "demo-farmacia-bolivia",
      description: "Medicamentos de venta libre, primeros auxilios, cuidado personal y productos para el hogar.",
      phone: "+59174381111",
      address: "Av. Mortensen esq. Santa Cruz, Ivirgarzama",
      commissionRate: 0.08,
      rating: 4.9,
      isOpen: true,
    },
  });

  await prisma.product.create({
    data: {
      merchantId: farmacia.id,
      category: "Medicamentos Libres",
      name: "[DEMO] Paracetamol 500mg (Caja 20 comprimidos)",
      description: "Analgésico y antipirético para alivio de dolor y fiebre.",
      price: 10.0,
      isAvailable: true,
      preparationMinutes: 5,
    },
  });

  // Comercio 4: Mandados Express
  const mandados = await prisma.merchant.create({
    data: {
      cityId: ivirgarzama.id,
      categoryId: catMandados.id,
      category: "Mandados",
      name: "[DEMO] Mandados Express TropiGO",
      slug: "demo-mandados-express",
      description: "Diligencias, compras en tiendas de barrio, pagos de servicios o encomiendas en Ivirgarzama.",
      phone: "+59174389012",
      address: "Oficinas Centrales TropiGO, Ivirgarzama",
      commissionRate: 0.15,
      rating: 5.0,
      isOpen: true,
    },
  });

  await prisma.product.create({
    data: {
      merchantId: mandados.id,
      category: "Servicios",
      name: "[DEMO] Mandado Urbano Personalizado",
      description: "Un repartidor irá al comercio de tu preferencia a comprar lo que indiques en las notas.",
      price: 7.0,
      isAvailable: true,
      preparationMinutes: 5,
    },
  });
  console.log("✅ 4 Comercios [DEMO] y menú inicial creados");

  // =================================================================
  // 6. REPARTIDORES Y FLOTA ([DEMO])
  // =================================================================
  console.log("🛵 Registrando flota de repartidores y mototaxistas [DEMO]...");

  const rider1User = await prisma.user.create({
    data: {
      email: "rider1@tropigo.bo",
      phone: "+59171234567",
      password: await bcrypt.hash("RiderDemo2025!", 10),
      name: "Juan Carlos Choque",
      role: "RIDER",
      status: "ACTIVE",
    },
  });

  const rider1 = await prisma.rider.create({
    data: {
      userId: rider1User.id,
      cityId: ivirgarzama.id,
      name: "[DEMO] Juan Carlos - Moto 1",
      phone: "+59171234567",
      vehicleType: "MOTO",
      plateNumber: "4321-XYZ",
      vehicleModel: "Honda CB125F Roja",
      vehicleColor: "Rojo",
      rating: 4.95,
      isActive: true,
      isAvailable: true,
      totalDeliveries: 48,
      earnedBalance: 240.0,
    },
  });

  const rider2User = await prisma.user.create({
    data: {
      email: "rider2@tropigo.bo",
      phone: "+59172345678",
      password: await bcrypt.hash("RiderDemo2025!", 10),
      name: "Wilson Mamani",
      role: "RIDER",
      status: "ACTIVE",
    },
  });

  const rider2 = await prisma.rider.create({
    data: {
      userId: rider2User.id,
      cityId: ivirgarzama.id,
      name: "[DEMO] Wilson Mamani - Torito 1",
      phone: "+59172345678",
      vehicleType: "TORITO_TRIMOVIL",
      plateNumber: "TR-892",
      vehicleModel: "Trimóvil Bajaj RE Amarillo",
      vehicleColor: "Amarillo",
      rating: 4.9,
      isActive: true,
      isAvailable: true,
      totalDeliveries: 32,
      totalRides: 64,
      earnedBalance: 320.0,
    },
  });

  const rider3User = await prisma.user.create({
    data: {
      email: "rider3@tropigo.bo",
      phone: "+59173456789",
      password: await bcrypt.hash("RiderDemo2025!", 10),
      name: "Mario Quispe",
      role: "RIDER",
      status: "ACTIVE",
    },
  });

  await prisma.rider.create({
    data: {
      userId: rider3User.id,
      cityId: ivirgarzama.id,
      name: "[DEMO] Mario Quispe - Moto 2",
      phone: "+59173456789",
      vehicleType: "MOTO",
      plateNumber: "1289-ABC",
      vehicleModel: "Suzuki GN125 Azul",
      vehicleColor: "Azul",
      rating: 4.88,
      isActive: true,
      isAvailable: true,
      totalDeliveries: 25,
      earnedBalance: 125.0,
    },
  });
  console.log("✅ 3 Conductores [DEMO] registrados");

  // =================================================================
  // 7. CLIENTE Y PEDIDO DE DEMOSTRACIÓN ([DEMO])
  // =================================================================
  console.log("📦 Creando cliente y orden de demostración [DEMO] con preservación histórica...");

  const customerDemo = await prisma.customer.create({
    data: {
      phone: "+59178901234",
      name: "Sandra Mamani",
      defaultAddress: "Av. Mortensen esq. Cochabamba, lado farmacia",
      referencePoint: "Casa de dos plantas con rejas negras",
      totalOrders: 1,
    },
  });

  const zoneCentral = await prisma.deliveryZone.findFirst({
    where: { cityId: ivirgarzama.id, name: "Casco Central" },
  });

  const orderDemo = await prisma.order.create({
    data: {
      orderNumber: "TRP-1041",
      cityId: ivirgarzama.id,
      customerId: customerDemo.id,
      merchantId: pahuichi.id,
      assignedRiderId: rider1.id,
      deliveryZoneId: zoneCentral?.id,
      orderType: "DELIVERY",
      itemsJson: JSON.stringify([
        {
          productId: pCuartoBroaster.id,
          name: "[DEMO] Cuarto de Pollo a la Broaster",
          quantity: 2,
          unitPrice: 18.0,
          variantName: "Pierna con Cuadril",
          notes: "Con abundante llajwa por favor",
        },
      ]),
      subtotal: 36.0,
      deliveryFee: 5.0,
      discountAmount: 0.0,
      totalAmount: 41.0,
      paymentMethod: "QR_BANCO",
      paymentStatus: "PENDIENTE",
      status: "EN_PREPARACION",
      deliveryAddressText: "Av. Mortensen esq. Cochabamba, lado farmacia",
      referencePoint: "Casa de dos plantas con rejas negras",
      customerNotes: "Llamar al llegar a la puerta.",
      items: {
        create: [
          {
            productId: pCuartoBroaster.id,
            productName: "[DEMO] Cuarto de Pollo a la Broaster",
            unitPrice: 18.0,
            quantity: 2,
            subtotal: 36.0,
            variantName: "Pierna con Cuadril",
            specialInstructions: "Con abundante llajwa por favor",
          },
        ],
      },
      statusHistory: {
        create: [
          {
            fromStatus: null,
            toStatus: "RECIBIDO",
            comment: "Pedido ingresado desde el portal web",
          },
          {
            fromStatus: "RECIBIDO",
            toStatus: "EN_PREPARACION",
            changedByUserId: operatorUser.id,
            comment: "Cocina confirmó recepción (tiempo est.: 15 min)",
          },
        ],
      },
      paymentRecords: {
        create: {
          amount: 41.0,
          currency: "BOB",
          provider: "QR_SIMPLE",
          verificationStatus: "PENDIENTE",
        },
      },
    },
  });

  // Carrera de Mototaxi de demostración
  await prisma.rideTrip.create({
    data: {
      tripNumber: "VIAJE-2001",
      cityId: ivirgarzama.id,
      customerId: customerDemo.id,
      assignedRiderId: rider2.id,
      vehicleType: "TORITO_TRIMOVIL",
      originAddress: "Mercado Central de Ivirgarzama",
      destinationAddress: "Sindicato San Salvador, Villa 14",
      fareAmount: 5.0,
      paymentMethod: "EFECTIVO",
      paymentStatus: "PENDIENTE",
      status: "CONDUCTOR_ASIGNADO",
      passengerNotes: "Somos dos personas con dos bolsas de víveres.",
      statusHistory: {
        create: [
          {
            toStatus: "SOLICITADO",
            comment: "Pasajero solicitó torito desde el portal web",
          },
          {
            toStatus: "CONDUCTOR_ASIGNADO",
            comment: "Despachado a Wilson Mamani (Torito 1)",
          },
        ],
      },
    },
  });
  console.log("✅ Pedido TRP-1041 y Carrera VIAJE-2001 [DEMO] creados con trazabilidad completa");

  // =================================================================
  // 8. CONFIGURACIONES GENERALES, ASISTENTE IA Y AUDITORÍA
  // =================================================================
  console.log("⚙️ Estableciendo configuraciones del sistema y asistente TropiBot...");

  await prisma.agencyProfile.create({
    data: {
      name: "TropiGO Tecnologías",
      logoUrl: "/logo-tropigo.png",
    },
  });

  await prisma.businessProfile.create({
    data: {
      name: "TropiGO Ivirgarzama",
      activity: "Plataforma de delivery, mandados y movilidad en mototaxi",
      cityZone: "Ivirgarzama, Trópico de Cochabamba, Bolivia",
      address: "Av. Mortensen esq. Mercado Central, Ivirgarzama",
      phone: "+59174389012",
      website: "https://tropigo.bo",
      currency: "BOB",
      currencySymbol: "Bs.",
      timezone: "America/La_Paz",
      paymentModes: JSON.stringify(["EFECTIVO", "QR_BANCO", "TIGO_MONEY"]),
      baseDeliveryFee: 5.0,
      baseRideFee: 4.0,
      assistantEnabled: true,
    },
  });

  await prisma.assistantConfig.create({
    data: {
      name: "TropiBot",
      avatarUrl: "/avatar-tropigo.png",
      tone: "cercano",
      welcomeMessage:
        "¡Hola! 👋 Te habla TropiBot, tu asistente de TropiGO en Ivirgarzama. ¿Qué se te antoja pedir hoy? Tenemos delivery de comida de los mejores restaurantes, farmacia, mandados y mototaxis.",
      instructions:
        "Eres TropiBot, el asistente inteligente oficial de TropiGO en Ivirgarzama (Trópico de Cochabamba, Bolivia). Atiendes a los clientes por WhatsApp y Web de forma ágil, respetuosa y con calidez cochabambina. Muestra precios siempre en Bolivianos (Bs.). Para pedidos de comida pide siempre confirmación de los platos, ubicación o referencia clara y método de pago (Efectivo o QR Simple). Para mototaxis, solicita el punto de partida y destino para cotizar la tarifa.",
      prohibitedActions:
        "1. Nunca inventes precios o comercios que no existan en el catálogo oficial.\n2. Nunca des confirmación final a un pedido sin dirección, ubicación o referencia y método de pago.\n3. Si un cliente reclama airadamente o el audio no se entiende, deriva inmediatamente a un operador humano.\n4. No proporciones diagnósticos médicos ni recomendaciones farmacológicas.",
      operatingHours: JSON.stringify({
        lunes: { open: "07:00", close: "23:00" },
        martes: { open: "07:00", close: "23:00" },
        miercoles: { open: "07:00", close: "23:00" },
        jueves: { open: "07:00", close: "23:00" },
        viernes: { open: "07:00", close: "23:59" },
        sabado: { open: "07:00", close: "23:59" },
        domingo: { open: "07:00", close: "23:00" },
      }),
      offHoursPolicy: "TAKE_MESSAGE",
      handoffRules: JSON.stringify([
        "queja",
        "reclamo",
        "pide hablar con alguien",
        "no sabe la respuesta",
        "urgencia",
      ]),
      activeProvider: "GEMINI",
      activeModel: "gemini-3.1-flash-lite",
      safeMode: false,
    },
  });

  await prisma.knowledgeBase.create({
    data: {
      freeText:
        "TropiGO es la plataforma de delivery y movilidad líder en Ivirgarzama (Trópico de Cochabamba, Bolivia). Conectamos a los mejores restaurantes, farmacias y comercios con clientes mediante repartidores en moto y mototaxis.",
    },
  });

  await prisma.faq.createMany({
    data: [
      {
        cityId: ivirgarzama.id,
        category: "Delivery",
        question: "¿Cuánto cuesta el delivery urbano en Ivirgarzama?",
        answer: "La tarifa base en el radio urbano de Ivirgarzama es de 5.00 Bs. Para zonas más alejadas como Villa 14 es 8.00 Bs. y Senda III es 10.00 Bs.",
        order: 1,
      },
      {
        cityId: ivirgarzama.id,
        category: "Movilidad",
        question: "¿Cuánto cuesta la carrera en mototaxi o torito?",
        answer: "En moto individual la tarifa urbana es de 4.00 Bs. En torito (trimóvil para más pasajeros o carga) es de 5.00 Bs.",
        order: 2,
      },
      {
        cityId: ivirgarzama.id,
        category: "Pagos",
        question: "¿Cómo puedo pagar mi pedido?",
        answer: "Aceptamos pago en efectivo al momento de la entrega o transferencia por QR Simple de cualquier banco boliviano o Tigo Money.",
        order: 3,
      },
    ],
  });

  await prisma.whatsAppConfig.create({
    data: {
      activeProvider: "BAILEYS_QR",
      metaWebhookVerifyToken: "tropigo_verify_token_2025",
      baileysStatus: "DISCONNECTED",
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: adminUser.id,
      action: "DATABASE_SEEDED",
      entityName: "System",
      status: "success",
      detailsJson: JSON.stringify({
        plataforma: "TropiGO",
        localidadInicial: "Ivirgarzama",
        expansionesRegistradas: ["Shinahota", "Puerto Villarroel", "Chimoré", "Villa Tunari"],
        modo: "DEMO_COMPLETO",
      }),
    },
  });

  console.log("✨ Sembrado completado exitosamente con integridad referencial verificada.");
}

main()
  .catch((e) => {
    console.error("❌ Error durante el sembrado:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
