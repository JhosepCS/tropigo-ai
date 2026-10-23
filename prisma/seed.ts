import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando siembra de datos para Tropigo Delivery (Ivirgarzama)...");

  // 1. Usuario Administrador
  const adminEmail = process.env.ADMIN_EMAIL || "admin@tropigo.bo";
  const adminPassword = process.env.ADMIN_PASSWORD || "AdminTropigo2025!";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword },
    create: {
      email: adminEmail,
      name: "Administrador Tropigo",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log(`✅ Usuario administrador listo: ${admin.email}`);

  // 2. Perfil del Negocio Tropigo
  const existingProfile = await prisma.businessProfile.findFirst();
  if (!existingProfile) {
    await prisma.businessProfile.create({
      data: {
        name: "Tropigo Delivery",
        cityZone: "Ivirgarzama, Trópico de Cochabamba, Bolivia",
        currency: "BOB",
        currencySymbol: "Bs.",
        phone: "+59174389012",
        address: "Av. Mortensen esq. Mercado Central, Ivirgarzama",
        paymentModes: JSON.stringify(["EFECTIVO", "QR_BANCO", "TIGO_MONEY"]),
        assistantStatus: "ACTIVE",
      },
    });
    console.log("✅ Perfil de negocio Tropigo creado");
  }

  // 3. Configuración del Asistente (TropiBot)
  const existingAssistant = await prisma.assistantConfig.findFirst();
  if (!existingAssistant) {
    await prisma.assistantConfig.create({
      data: {
        name: "TropiBot",
        avatarUrl: "/tropigo-logo.png",
        tone: "cercano",
        welcomeMessage:
          "¡Hola! 👋 Te habla TropiBot, el asistente de pedidos de Tropigo Delivery en Ivirgarzama. 🛵💨\n\n¿Qué se te antoja pedir hoy? Tenemos pollos broaster, hamburguesas, pescado del trópico, farmacia o servicio de mandados.",
        instructions:
          "Eres el asistente inteligente de Tropigo Delivery en Ivirgarzama (Cochabamba, Bolivia). Atiendes pedidos de comida, farmacia y mandados. Sé amable, conciso y rápido. Ofrece el menú resumido, arma el carrito sumando los precios en Bolivianos (Bs.), pide la ubicación (texto o pin GPS), calcula la tarifa de delivery según la zona y confirma el método de pago (Efectivo, QR Banco Unión/BCP, o Tigo Money). Cuando todo esté confirmado, genera la orden.",
        prohibitedActions:
          "Nunca inventes precios que no existan en el menú. Nunca cierres una orden sin dirección/ubicación clara y método de pago definido. Nunca des consejos médicos ante consultas de farmacia.",
        operatingHours: JSON.stringify({
          lunes: { open: "07:30", close: "23:00" },
          martes: { open: "07:30", close: "23:00" },
          miercoles: { open: "07:30", close: "23:00" },
          jueves: { open: "07:30", close: "23:00" },
          viernes: { open: "07:30", close: "23:59" },
          sabado: { open: "07:30", close: "23:59" },
          domingo: { open: "07:30", close: "23:00" },
        }),
        offHoursPolicy: "RECORD_MESSAGE",
        handoffRules: JSON.stringify([
          "queja",
          "urgencia",
          "pide hablar con alguien",
          "no sabe la respuesta",
        ]),
        safeMode: false,
      },
    });
    console.log("✅ Configuración de TropiBot creada");
  }

  // 4. Tarifario de Zonas de Ivirgarzama
  const zonesCount = await prisma.deliveryZone.count();
  if (zonesCount === 0) {
    await prisma.deliveryZone.createMany({
      data: [
        { name: "Casco Viejo / Mercado Central", baseCost: 5.0, estimatedMinutes: 20 },
        { name: "Av. Mortensen / Zona Terminal", baseCost: 5.0, estimatedMinutes: 20 },
        { name: "Barrio Magisterio / Coliseo", baseCost: 6.0, estimatedMinutes: 25 },
        { name: "Hospital San Francisco / Senda 3", baseCost: 7.0, estimatedMinutes: 30 },
        { name: "Sindicato Simón Bolívar", baseCost: 8.0, estimatedMinutes: 35 },
        { name: "Sindicato 1ro de Mayo / Zona Industrial", baseCost: 10.0, estimatedMinutes: 40 },
      ],
    });
    console.log("✅ Tarifario de zonas de Ivirgarzama creado");
  }

  // 5. Comercios y Menús
  const merchantsCount = await prisma.merchant.count();
  if (merchantsCount === 0) {
    // 5.1 Pollería
    const polleria = await prisma.merchant.create({
      data: {
        name: "Pollos y Broaster El Rey del Trópico",
        category: "Pollería",
        phone: "+59173900111",
        address: "Av. Mortensen casi esq. Bolívar",
        commissionRate: 0.12,
        isActive: true,
        products: {
          create: [
            {
              name: "1/4 Pollo Broaster con papas y chaufa",
              description: "Pierna o pecho crocante, papas fritas caseras, arroz chaufa y salsas",
              price: 22.0,
              category: "Platos",
            },
            {
              name: "1/2 Pollo a la Brasa con plátano frito",
              description: "Medio pollo dorado al carbón, plátano maduro frito, yuca y ensalada",
              price: 40.0,
              category: "Platos",
            },
            {
              name: "Alitas Crispy x8 con salsa BBQ",
              description: "8 alitas bañadas en barbacoa ahumada con papas fritas",
              price: 28.0,
              category: "Snacks",
            },
            {
              name: "Porción de Plátano o Yuca frita",
              description: "Guarnición tradicional del trópico",
              price: 6.0,
              category: "Guarniciones",
            },
            {
              name: "Coca-Cola 2 Litros Retornable",
              description: "Gaseosa bien helada",
              price: 15.0,
              category: "Bebidas",
            },
          ],
        },
      },
    });

    // 5.2 Hamburguesería
    const burger = await prisma.merchant.create({
      data: {
        name: "Burger & Grill La Chura Ivirgarzama",
        category: "Restaurante",
        phone: "+59172900222",
        address: "Frente al Coliseo Municipal",
        commissionRate: 0.10,
        isActive: true,
        products: {
          create: [
            {
              name: "Hamburguesa Doble Carne con Cheddar y Tocineta",
              description: "200g carne artesanal, queso cheddar fundido, tocineta y papas",
              price: 25.0,
              category: "Hamburguesas",
            },
            {
              name: "Hamburguesa Clásica Tropigo",
              description: "Carne a la plancha, lechuga, tomate, huevo frito y papas al hilo",
              price: 18.0,
              category: "Hamburguesas",
            },
            {
              name: "Salchipapa Especial Tropigo",
              description: "Salchichas viena, huevo frito, queso rallado y cremas",
              price: 16.0,
              category: "Comida Rápida",
            },
            {
              name: "Lomito con Huevo y Papas",
              description: "Filete de carne tierna con huevo frito y papas fritas",
              price: 24.0,
              category: "Sándwiches",
            },
          ],
        },
      },
    });

    // 5.3 Picantería Comida Típica
    const tipica = await prisma.merchant.create({
      data: {
        name: "Picantería & Pescadería Sabor Tropical",
        category: "Restaurante",
        phone: "+59171900333",
        address: "Barrio San José, frente a la cancha",
        commissionRate: 0.10,
        isActive: true,
        products: {
          create: [
            {
              name: "Pacú a la Parrilla con Yuca y Arroz",
              description: "Pescado fresco del río a la brasa con guarniciones tradicionales",
              price: 45.0,
              category: "Pescados",
            },
            {
              name: "Surubí Frito Crocante",
              description: "Filete de surubí apanado con ensalada fresca y arroz",
              price: 50.0,
              category: "Pescados",
            },
            {
              name: "Majadito de Pato con Plátano",
              description: "Majadito tostado con huevo frito y plátano maduro",
              price: 25.0,
              category: "Platos Típicos",
            },
          ],
        },
      },
    });

    // 5.4 Farmacia
    const farmacia = await prisma.merchant.create({
      data: {
        name: "Farmacia San Elías Ivirgarzama",
        category: "Farmacia",
        phone: "+59174900444",
        address: "Calle Comercio s/n, a 50m del Hospital",
        commissionRate: 0.08,
        isActive: true,
        products: {
          create: [
            {
              name: "Paracetamol 500mg (Blister x10)",
              description: "Analgésico y antipirético",
              price: 5.0,
              category: "Medicamentos",
            },
            {
              name: "Ibuprofeno 400mg (Caja x20)",
              description: "Antiinflamatorio y alivio del dolor",
              price: 12.0,
              category: "Medicamentos",
            },
            {
              name: "Sales de Rehidratación Oral (Pack x3 sobres)",
              description: "Para golpes de calor o deshidratación",
              price: 8.0,
              category: "Suplementos",
            },
            {
              name: "Kit de Primeros Auxilios",
              description: "Alcohol 70%, gasas estériles, curitas y algodón",
              price: 20.0,
              category: "Cuidado Personal",
            },
          ],
        },
      },
    });

    // 5.5 Mandados
    const mandados = await prisma.merchant.create({
      data: {
        name: "Servicio de Mandados y Encomiendas Tropigo",
        category: "Mandados",
        phone: "+59174389012",
        address: "Base Central Tropigo Ivirgarzama",
        commissionRate: 0.0,
        isActive: true,
        products: {
          create: [
            {
              name: "Mandado Express dentro del Pueblo",
              description: "Comprar o recoger algo en un punto A y llevarlo a punto B",
              price: 10.0,
              category: "Mandados",
            },
            {
              name: "Recojo de Encomienda en la Terminal",
              description: "Retiro de bulto o sobre en flotas de la terminal de Ivirgarzama",
              price: 12.0,
              category: "Mandados",
            },
          ],
        },
      },
    });

    console.log("✅ Comercios y catálogos creados con éxito");
  }

  // 6. Repartidores (Riders)
  const ridersCount = await prisma.rider.count();
  if (ridersCount === 0) {
    await prisma.rider.createMany({
      data: [
        { name: "Brayan Rojas", phone: "+59173911223", plateNumber: "4892-KLR", isActive: true, isAvailable: true },
        { name: "Javier Quispe", phone: "+59171244556", plateNumber: "3105-TXB", isActive: true, isAvailable: true },
        { name: "Carlos Mamani", phone: "+59178966778", plateNumber: "5541-MNA", isActive: true, isAvailable: false },
      ],
    });
    console.log("✅ Repartidores de Tropigo registrados");
  }

  // 7. Clientes y Pedidos de prueba
  const customersCount = await prisma.customer.count();
  if (customersCount === 0) {
    const customer1 = await prisma.customer.create({
      data: {
        name: "Doña Elena Mendoza",
        phone: "+59174567890",
        defaultAddress: "Frente a la Plaza Principal, acera este, casa verde",
        totalOrders: 3,
      },
    });

    const customer2 = await prisma.customer.create({
      data: {
        name: "Lic. Rodrigo Fuentes",
        phone: "+59176543210",
        defaultAddress: "Av. Mortensen frente a Banco Unión",
        totalOrders: 5,
      },
    });

    const customer3 = await prisma.customer.create({
      data: {
        name: "Carmen Vaca",
        phone: "+59171239876",
        defaultAddress: "Hospital San Francisco, Sala de Espera",
        totalOrders: 1,
      },
    });

    const polleria = await prisma.merchant.findFirst({ where: { category: "Pollería" } });
    const burger = await prisma.merchant.findFirst({ where: { category: "Restaurante" } });
    const riderCarlos = await prisma.rider.findFirst({ where: { name: "Carlos Mamani" } });

    // Pedido 1: RECIBIDO
    await prisma.order.create({
      data: {
        orderNumber: "TRP-1041",
        customerId: customer1.id,
        merchantId: polleria?.id,
        itemsJson: JSON.stringify([
          { name: "1/4 Pollo Broaster con papas y chaufa", quantity: 2, unitPrice: 22.0, notes: "Con bastante ají" },
          { name: "Coca-Cola 2 Litros Retornable", quantity: 1, unitPrice: 15.0 },
        ]),
        subtotal: 59.0,
        deliveryFee: 5.0,
        totalAmount: 64.0,
        paymentMethod: "EFECTIVO",
        paymentStatus: "PENDIENTE",
        status: "RECIBIDO",
        deliveryAddressText: "Frente a la Plaza Principal, acera este, casa verde con rejas negras",
      },
    });

    // Pedido 2: EN_PREPARACION
    await prisma.order.create({
      data: {
        orderNumber: "TRP-1042",
        customerId: customer2.id,
        merchantId: burger?.id,
        itemsJson: JSON.stringify([
          { name: "Hamburguesa Doble Carne con Cheddar y Tocineta", quantity: 1, unitPrice: 25.0, notes: "Sin cebolla" },
          { name: "Salchipapa Especial Tropigo", quantity: 1, unitPrice: 16.0 },
        ]),
        subtotal: 41.0,
        deliveryFee: 5.0,
        totalAmount: 46.0,
        paymentMethod: "QR_BANCO",
        paymentStatus: "PAGADO_VERIFICADO",
        status: "EN_PREPARACION",
        deliveryAddressText: "Av. Mortensen frente a Banco Unión, oficina 2do piso",
      },
    });

    // Pedido 3: EN_CAMINO
    await prisma.order.create({
      data: {
        orderNumber: "TRP-1043",
        customerId: customer3.id,
        merchantId: polleria?.id,
        assignedRiderId: riderCarlos?.id,
        itemsJson: JSON.stringify([
          { name: "1/2 Pollo a la Brasa con plátano frito", quantity: 1, unitPrice: 40.0 },
        ]),
        subtotal: 40.0,
        deliveryFee: 7.0,
        totalAmount: 47.0,
        paymentMethod: "TIGO_MONEY",
        paymentStatus: "PAGADO_VERIFICADO",
        status: "EN_CAMINO",
        deliveryAddressText: "Hospital San Francisco, Sala de Espera, preguntar por Carmen",
      },
    });

    // Conversación de prueba en WhatsApp
    const conversation = await prisma.conversation.create({
      data: {
        customerId: customer1.id,
        channel: "WHATSAPP",
        status: "AI_ACTIVE",
        messages: {
          create: [
            {
              sender: "CUSTOMER",
              content: "Buenas noches, quiero pedir pollos broaster para cenar por favor",
            },
            {
              sender: "ASSISTANT",
              content:
                "¡Buenas noches Doña Elena! 👋 Con gusto le tomo su pedido de Pollos El Rey del Trópico. 🍗 Tenemos:\n- 1/4 Pollo Broaster con papas y chaufa: 22 Bs.\n- 1/2 Pollo a la Brasa con plátano: 40 Bs.\n- Alitas Crispy x8: 28 Bs.\n\n¿Cuántos cuartos le anoto?",
            },
          ],
        },
      },
    });

    console.log("✅ Clientes, pedidos y conversaciones de prueba listos");
  }

  // 8. Configuración de WhatsApp
  const existingWpConfig = await prisma.whatsAppConfig.findFirst();
  if (!existingWpConfig) {
    await prisma.whatsAppConfig.create({
      data: {
        activeProvider: "BAILEYS_QR",
        baileysStatus: "DISCONNECTED",
        metaWebhookVerifyToken: "tropigo_verify_token_2025",
      },
    });
    console.log("✅ Configuración inicial de WhatsApp (Baileys/Meta) registrada");
  }

  console.log("🚀 Base de datos inicializada exitosamente para Tropigo!");
}

main()
  .catch((e) => {
    console.error("❌ Error en la siembra de base de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
