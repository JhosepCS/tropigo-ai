import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Sembrando datos oficiales de TropiGO en Ivirgarzama (Trópico de Cochabamba)...");

  // Limpieza inicial para idempotencia
  await prisma.paymentRecord.deleteMany();
  await prisma.order.deleteMany();
  await prisma.rideTrip.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.rider.deleteMany();
  await prisma.product.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.deliveryZone.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.service.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.whatsAppConfig.deleteMany();
  await prisma.assistantConfig.deleteMany();
  await prisma.businessProfile.deleteMany();
  await prisma.agencyProfile.deleteMany();

  // 1. Usuario Administrador
  const adminEmail = process.env.ADMIN_EMAIL || "admin@tropigo.bo";
  const adminPassword = process.env.ADMIN_PASSWORD || "AdminTropigo2025!";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword },
    create: {
      email: adminEmail,
      name: "Administrador TropiGO",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log(`✅ Administrador creado: ${admin.email}`);

  // 2. Perfil de Marca / Agencia
  await prisma.agencyProfile.create({
    data: {
      name: "TropiGO Tecnologías",
      logoUrl: "/logo-tropigo.png",
    },
  });

  // 3. Perfil del Negocio TropiGO
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
  console.log("✅ Perfil de TropiGO Ivirgarzama configurado");

  // 4. Configuración del Asistente de IA (TropiBot)
  await prisma.assistantConfig.create({
    data: {
      name: "TropiBot",
      avatarUrl: "/avatar-tropigo.png",
      tone: "cercano",
      welcomeMessage:
        "¡Hola! 👋 Te habla TropiBot, tu asistente de TropiGO en Ivirgarzama. ¿Qué se te antoja pedir hoy? Tenemos delivery de comida de los mejores restaurantes, farmacia, mandados y mototaxis.",
      instructions:
        "Eres TropiBot, el asistente inteligente de TropiGO en Ivirgarzama (Trópico de Cochabamba, Bolivia). Atiendes a los clientes por WhatsApp y Web de forma ágil, respetuosa y con calidez cochabambina. Muestra precios siempre en Bolivianos (Bs.). Para pedidos de comida pide siempre confirmación de los platos, ubicación o referencia clara y método de pago (Efectivo o QR Simple). Para mototaxis, solicita el punto de partida y destino para cotizar la tarifa.",
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
      customHandoffRule: "Compras especiales mayores a 150 Bs.",
      safeMode: false,
    },
  });
  console.log("✅ Asistente TropiBot configurado");

  // 5. Zonas de Cobertura y Tarifas de Ivirgarzama
  const zonas = [
    {
      name: "Casco Central y Plaza Principal",
      description: "Radio urbano de Ivirgarzama, Plaza 14 de Septiembre y bancos",
      baseDeliveryCost: 5.0,
      baseRideCost: 4.0,
      estimatedMinutes: 15,
    },
    {
      name: "Av. Mortensen y Mercado Central",
      description: "Zona comercial principal, ferias y mercados",
      baseDeliveryCost: 5.0,
      baseRideCost: 4.0,
      estimatedMinutes: 15,
    },
    {
      name: "Zona Terminal de Buses & Rotonda",
      description: "Paradas interprovinciales y surtidores de salida",
      baseDeliveryCost: 6.0,
      baseRideCost: 5.0,
      estimatedMinutes: 20,
    },
    {
      name: "Sindicato San Salvador / Villa 14",
      description: "Zona periurbana sobre carretera principal",
      baseDeliveryCost: 10.0,
      baseRideCost: 8.0,
      estimatedMinutes: 30,
    },
    {
      name: "Senda III y Puerto Villarroel (Tramo Especial)",
      description: "Comunidades aledañas y puerto fluvial",
      baseDeliveryCost: 18.0,
      baseRideCost: 15.0,
      estimatedMinutes: 45,
    },
  ];

  for (const z of zonas) {
    await prisma.deliveryZone.create({ data: z });
  }
  console.log(`✅ ${zonas.length} zonas de cobertura creadas`);

  // 6. Comercios y Catálogo de Productos
  const pahuichi = await prisma.merchant.create({
    data: {
      name: "Pollería El Pahuichi",
      category: "Restaurante",
      description: "El mejor pollo a la broaster y a la brasa de Ivirgarzama con papas y arroz con queso.",
      phone: "+59173829101",
      address: "Av. Mortensen frente a Entel",
      commissionRate: 0.10,
      rating: 4.9,
      isOpen: true,
      imageUrl: "/merchants/pahuichi.jpg",
      products: {
        create: [
          {
            name: "Cuarto de Pollo a la Broaster",
            description: "Presa de pierna o pecho crocante, papas fritas caseras, arroz con queso y llajwa.",
            price: 18.0,
            category: "Platos",
            isAvailable: true,
          },
          {
            name: "Medio Pollo a la Broaster",
            description: "Dos presas grandes de pollo broaster con doble porción de papas y arroz.",
            price: 35.0,
            category: "Platos",
            isAvailable: true,
          },
          {
            name: "Pollo Entero Familiar TropiGO",
            description: "Pollo entero en 4 cuartos, abundante papa frita, arroz con queso y gaseosa de 2 litros.",
            price: 68.0,
            category: "Combos",
            isAvailable: true,
          },
          {
            name: "Porción Extra de Arroz con Queso",
            description: "Arroz cremoso con queso criollo del trópico.",
            price: 7.0,
            category: "Guarniciones",
            isAvailable: true,
          },
        ],
      },
    },
  });

  const tipicos = await prisma.merchant.create({
    data: {
      name: "Comidas Doña Julia",
      category: "Restaurante",
      description: "Especialidad en majadito tostado, pique macho y silpancho cochabambino.",
      phone: "+59174910283",
      address: "Calle Bolívar lado Mercado Central",
      commissionRate: 0.10,
      rating: 4.8,
      isOpen: true,
      imageUrl: "/merchants/donajulia.jpg",
      products: {
        create: [
          {
            name: "Pique Macho Especial",
            description: "Trozos de lomo de res, salchichas viena, papas fritas, huevo duro, cebolla, tomate y locoto.",
            price: 30.0,
            category: "Platos",
            isAvailable: true,
          },
          {
            name: "Majadito Tostado de Charque",
            description: "Arroz con charque desmenuzado, plátano frito maduro y huevo frito.",
            price: 20.0,
            category: "Platos",
            isAvailable: true,
          },
          {
            name: "Silpancho Cochabambino",
            description: "Carne apanada gigante sobre cama de arroz y papas doradas, con huevo y salsa criolla picada.",
            price: 18.0,
            category: "Platos",
            isAvailable: true,
          },
        ],
      },
    },
  });

  const farmacia = await prisma.merchant.create({
    data: {
      name: "Farmacia Bolivia - Ivirgarzama",
      category: "Farmacia",
      description: "Medicamentos de urgencia, analgésicos, cuidado infantil y primeros auxilios.",
      phone: "+59171239084",
      address: "Av. Panamericana esq. Sucre",
      commissionRate: 0.08,
      rating: 4.7,
      isOpen: true,
      imageUrl: "/merchants/farmacia.jpg",
      products: {
        create: [
          {
            name: "Paracetamol 500mg (Caja 20 comp.)",
            description: "Analgésico y antipirético para alivio rápido de fiebre y dolor.",
            price: 12.0,
            category: "Medicamentos",
            isAvailable: true,
          },
          {
            name: "Ibuprofeno 400mg (Caja 10 comp.)",
            description: "Antiinflamatorio no esteroideo para dolores musculares y articulares.",
            price: 15.0,
            category: "Medicamentos",
            isAvailable: true,
          },
          {
            name: "Sales de Rehidratación Oral (Electrolitos)",
            description: "Polvo para preparar 1L de solución rehidratante contra deshidratación.",
            price: 8.0,
            category: "Salud",
            isAvailable: true,
          },
          {
            name: "Alcohol en Gel 500ml",
            description: "Sanitizante para manos con 70% de alcohol y dosificador.",
            price: 18.0,
            category: "Cuidado Personal",
            isAvailable: true,
          },
        ],
      },
    },
  });

  const mandados = await prisma.merchant.create({
    data: {
      name: "Mandados y Encomiendas TropiGO",
      category: "Mandados",
      description: "Servicio de compras personalizadas, retiro de encomiendas y pagos de servicios.",
      phone: "+59174389012",
      address: "Oficina Central TropiGO",
      commissionRate: 0.15,
      rating: 5.0,
      isOpen: true,
      imageUrl: "/merchants/mandados.jpg",
      products: {
        create: [
          {
            name: "Mandado Urbano Simple",
            description: "Compra rápida en tiendas locales, farmacias o recojo de paquetes pequeños.",
            price: 7.0,
            category: "Servicios",
            isAvailable: true,
          },
          {
            name: "Recojo de Encomienda en Terminal de Buses",
            description: "Recepción de encomienda interprovincial y entrega en la puerta de tu domicilio.",
            price: 10.0,
            category: "Servicios",
            isAvailable: true,
          },
        ],
      },
    },
  });

  console.log("✅ 4 Comercios y 14 productos creados con precios en Bs.");

  // 7. Flota de Repartidores y Mototaxistas
  const rider1 = await prisma.rider.create({
    data: {
      name: "Juan Carlos Choque",
      phone: "+59171234567",
      vehicleType: "MOTO",
      plateNumber: "4821-XRT",
      rating: 4.9,
      isActive: true,
      isAvailable: true,
      currentLocation: "Plaza Principal",
      totalDeliveries: 42,
      totalRides: 18,
      earnedBalance: 240.0,
    },
  });

  const rider2 = await prisma.rider.create({
    data: {
      name: "Marcos Torrico (Torito)",
      phone: "+59172345678",
      vehicleType: "TORITO",
      plateNumber: "3192-TYU",
      rating: 5.0,
      isActive: true,
      isAvailable: true,
      currentLocation: "Mercado Central",
      totalDeliveries: 15,
      totalRides: 58,
      earnedBalance: 320.0,
    },
  });

  const rider3 = await prisma.rider.create({
    data: {
      name: "Brayan Flores",
      phone: "+59173456789",
      vehicleType: "MOTO",
      plateNumber: "5541-BNM",
      rating: 4.8,
      isActive: true,
      isAvailable: true,
      currentLocation: "Av. Mortensen",
      totalDeliveries: 31,
      totalRides: 12,
      earnedBalance: 195.0,
    },
  });
  console.log("✅ 3 Conductores y Repartidores registrados (Motos y Torito)");

  // 8. Clientes de Ejemplo
  const customer1 = await prisma.customer.create({
    data: {
      name: "Sandra Mamani",
      phone: "+59178901234",
      defaultAddress: "Av. Mortensen esq. Calle Cochabamba",
      referencePoint: "Frente al surtidor central",
      totalOrders: 3,
      totalRides: 1,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: "Roberto Claure",
      phone: "+59179012345",
      defaultAddress: "Barrio 1º de Mayo, Calle 3",
      referencePoint: "A media cuadra de la cancha deportiva",
      totalOrders: 5,
      totalRides: 4,
    },
  });

  // 9. Pedido de Ejemplo en curso
  await prisma.order.create({
    data: {
      orderNumber: "TRP-1041",
      customerId: customer1.id,
      merchantId: pahuichi.id,
      assignedRiderId: rider1.id,
      orderType: "DELIVERY",
      itemsJson: JSON.stringify([
        {
          name: "Cuarto de Pollo a la Broaster",
          quantity: 2,
          unitPrice: 18.0,
          notes: "Pierna y pecho bien dorado, llajwa extra",
        },
        {
          name: "Porción Extra de Arroz con Queso",
          quantity: 1,
          unitPrice: 7.0,
        },
      ]),
      subtotal: 43.0,
      deliveryFee: 5.0,
      totalAmount: 48.0,
      paymentMethod: "QR_BANCO",
      paymentStatus: "PAGADO_VERIFICADO",
      status: "EN_CAMINO",
      deliveryAddressText: "Av. Mortensen esq. Calle Cochabamba",
      referencePoint: "Frente al surtidor central",
      notes: "El cliente paga con QR Simple BCP, comprobante verificado por operador.",
    },
  });

  // 10. Carrera de Mototaxi de Ejemplo
  await prisma.rideTrip.create({
    data: {
      tripNumber: "VIAJE-2001",
      customerId: customer2.id,
      assignedRiderId: rider2.id,
      vehicleType: "TORITO",
      originAddress: "Mercado Central de Ivirgarzama",
      destinationAddress: "Terminal de Buses Interprovincial",
      fareAmount: 5.0,
      paymentMethod: "EFECTIVO",
      paymentStatus: "PENDIENTE",
      status: "EN_CURSO",
      passengerNotes: "Pasajero con dos bolsas de compras del mercado.",
    },
  });

  // 11. Conversación activa de WhatsApp
  const conv = await prisma.conversation.create({
    data: {
      customerId: customer1.id,
      channel: "WHATSAPP",
      status: "AI_ACTIVE",
      messages: {
        create: [
          {
            sender: "CUSTOMER",
            content: "Buenas tardes, ¿tienen pollo a la broaster de El Pahuichi?",
          },
          {
            sender: "ASSISTANT",
            content:
              "¡Hola Sandra! 👋 Sí, en Pollería El Pahuichi tenemos:\n\n• **Cuarto de Pollo a la Broaster:** 18 Bs. (con papas, arroz con queso y llajwa)\n• **Medio Pollo a la Broaster:** 35 Bs.\n• **Combo Familiar:** 68 Bs.\n\n¿Te gustaría que te lo enviemos a tu dirección en Av. Mortensen?",
            toolCallsJson: JSON.stringify([
              {
                tool: "consultar_comercios_y_menu",
                args: { categoria: "Pollería", comercio: "El Pahuichi" },
              },
            ]),
          },
          {
            sender: "CUSTOMER",
            content: "Sí por favor, envíame 2 cuartos y una porción extra de arroz con queso. Pago con QR.",
          },
        ],
      },
    },
  });

  // 12. Configuración de Canales WhatsApp
  await prisma.whatsAppConfig.create({
    data: {
      activeProvider: "BAILEYS_QR",
      baileysStatus: "DISCONNECTED",
      metaWebhookVerifyToken: "tropigo_verify_token_2025",
    },
  });

  await prisma.channel.create({
    data: {
      type: "whatsapp",
      status: "disconnected",
      settingsJson: JSON.stringify({
        provider: "BAILEYS_QR",
        bufferSeconds: 8,
      }),
    },
  });

  await prisma.channel.create({
    data: {
      type: "webchat",
      status: "connected",
      settingsJson: JSON.stringify({
        enabled: true,
        primaryColor: "#059669",
        welcomeMessage: "¡Bienvenido a TropiGO Ivirgarzama! ¿Qué necesitas pedir hoy?",
      }),
    },
  });

  // 13. Preguntas Frecuentes de TropiGO
  const faqs = [
    {
      question: "¿Cómo puedo pagar mis pedidos y carreras?",
      answer: "Aceptamos efectivo en Bolivianos al momento de la entrega, QR Simple interoperable de cualquier banco (BCP, BNB, Banco Unión, BISA, Fie, Fassil) y Tigo Money.",
      category: "Pagos",
      order: 1,
    },
    {
      question: "¿Hasta qué hora atienden?",
      answer: "Nuestro servicio de delivery y mototaxi funciona de lunes a domingo desde las 07:00 hasta las 23:00 (viernes y sábado hasta las 23:59).",
      category: "Horarios",
      order: 2,
    },
    {
      question: "¿Llegan a sindicatos y zonas alejadas como Villa 14 o Senda III?",
      answer: "Sí, llegamos a comunidades aledañas como Senda III, Villa 14 y Puerto Villarroel con una tarifa especial por tramo o distancia calculada.",
      category: "Cobertura",
      order: 3,
    },
    {
      question: "¿Cómo pido un mototaxi o torito?",
      answer: "Solo debes escribirnos por WhatsApp indicando tu punto de partida y tu destino. TropiBot te cotiza la tarifa en Bs. y te envía al conductor más cercano.",
      category: "Movilidad",
      order: 4,
    },
    {
      question: "¿Qué pasa si llueve?",
      answer: "Seguimos operando con toritos cubiertos y repartidores con impermeables. En lluvia intensa puede aplicarse un pequeño recargo de 2 Bs. para proteger al conductor.",
      category: "Servicio",
      order: 5,
    },
  ];

  for (const f of faqs) {
    await prisma.faq.create({ data: f });
  }

  // 14. Integraciones listas (desconectadas por defecto, modulares)
  const integrations = [
    { provider: "google_calendar", name: "Google Calendar" },
    { provider: "gmail", name: "Gmail" },
    { provider: "google_sheets", name: "Google Sheets" },
    { provider: "slack", name: "Slack" },
    { provider: "stripe", name: "Stripe" },
    { provider: "webhooks", name: "Webhooks" },
  ];

  for (const integ of integrations) {
    await prisma.integration.create({
      data: {
        provider: integ.provider,
        name: integ.name,
        status: "disconnected",
      },
    });
  }

  console.log("✅ Base de datos sembrada con éxito para TropiGO Ivirgarzama.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
