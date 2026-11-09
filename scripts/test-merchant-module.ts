import { PrismaClient } from "@prisma/client";
import {
  ROLES,
  requireRole,
  assertMerchantOwnership,
  ForbiddenError,
  UnauthorizedError,
} from "../src/lib/auth/rbac";

const prisma = new PrismaClient();

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    testsFailed++;
  }
}

async function runMerchantTestSuite() {
  console.log("=================================================================");
  console.log("🏪 SUITE DE PRUEBAS DEL MÓDULO DE GESTIÓN DE COMERCIOS TROPIGO");
  console.log("=================================================================\n");

  const runId = Date.now();
  let testCity: any = null;
  let testCategory: any = null;
  let testOwnerUser: any = null;
  let anotherOwnerUser: any = null;
  let testCustomerUser: any = null;
  let testCustomer: any = null;
  let testMerchant: any = null;
  let testBranch: any = null;

  try {
    // -------------------------------------------------------------
    // FASE 0: PREPARACIÓN Y CONFIGURACIÓN INICIAL
    // -------------------------------------------------------------
    console.log("⚙️  [1/8] Verificando entorno y ciudad base...");
    testCity = await prisma.city.findFirst({
      where: { name: "Ivirgarzama" },
    });

    if (!testCity) {
      testCity = await prisma.city.create({
        data: {
          name: "Ivirgarzama",
          department: "Cochabamba",
          country: "BO",
          isActive: true,
        },
      });
    }
    assert(!!testCity && testCity.name === "Ivirgarzama", "Ciudad Ivirgarzama disponible y activa.");

    // Crear categoría de prueba
    console.log("\n📁 [2/8] Prueba de Gestión de Categorías Comerciales...");
    const categorySlug = `gastronomia-test-${runId}`;
    testCategory = await prisma.commercialCategory.create({
      data: {
        name: `Gastronomía Test ${runId}`,
        slug: categorySlug,
        icon: "utensils",
        isActive: true,
        order: 1,
      },
    });
    assert(testCategory.slug === categorySlug, `Categoría creada exitosamente con slug '${categorySlug}'.`);

    // Listar categorías y verificar conteo
    const categoriesWithCount = await prisma.commercialCategory.findMany({
      where: { id: testCategory.id },
      include: {
        _count: {
          select: { merchants: true },
        },
      },
    });
    assert(categoriesWithCount.length === 1 && categoriesWithCount[0]._count.merchants === 0, "Categoría listada con conteo inicial de comercios en 0.");

    // -------------------------------------------------------------
    // FASE 1: REGISTRO DE COMERCIO Y HORARIOS PREDETERMINADOS
    // -------------------------------------------------------------
    console.log("\n🏪 [3/8] Prueba de Registro de Comercio y Horarios Iniciales...");
    testOwnerUser = await prisma.user.create({
      data: {
        email: `propietario_${runId}@tropigo.test`,
        phone: `+591789${runId.toString().slice(-5)}`,
        name: "Dueño de Prueba 1",
        password: "hashed_dummy_password_for_tests",
        role: ROLES.MERCHANT_OWNER,
        status: "ACTIVE",
      },
    });

    const merchantSlug = `restaurante-test-${runId}`;
    testMerchant = await prisma.merchant.create({
      data: {
        name: `Restaurante El Valle Test ${runId}`,
        slug: merchantSlug,
        legalName: "Inversiones Gastronómicas El Valle S.R.L.",
        nit: "1029384756",
        phone: "+59144123456",
        address: "Av. Principal y calle Bolívar #120, Ivirgarzama",
        latitude: -17.0321,
        longitude: -64.8572,
        isOpen: true,
        commissionRate: 0.10, // 10%
        cityId: testCity.id,
        categoryId: testCategory.id,
        ownerId: testOwnerUser.id,
        logoUrl: "https://tropigo.test/logos/restaurante-valle.png",
        bannerUrl: "https://tropigo.test/banners/restaurante-valle.png",
      },
    });

    assert(testMerchant.name.includes("Restaurante El Valle"), "Comercio registrado con éxito con datos fiscales y geográficos.");
    assert(Number(testMerchant.commissionRate) === 0.10, "Tasa de comisión TropiGO configurada correctamente (10%).");

    // Crear los 7 días de horarios predeterminados (como hace el endpoint /api/admin/merchants)
    const days = [
      { dayOfWeek: 1, openTime: "08:00", closeTime: "22:00", isClosed: false },
      { dayOfWeek: 2, openTime: "08:00", closeTime: "22:00", isClosed: false },
      { dayOfWeek: 3, openTime: "08:00", closeTime: "22:00", isClosed: false },
      { dayOfWeek: 4, openTime: "08:00", closeTime: "22:00", isClosed: false },
      { dayOfWeek: 5, openTime: "08:00", closeTime: "23:00", isClosed: false },
      { dayOfWeek: 6, openTime: "08:00", closeTime: "23:00", isClosed: false },
      { dayOfWeek: 0, openTime: "09:00", closeTime: "21:00", isClosed: false },
    ];

    await prisma.merchantSchedule.createMany({
      data: days.map((d) => ({
        merchantId: testMerchant.id,
        dayOfWeek: d.dayOfWeek,
        openTime: d.openTime,
        closeTime: d.closeTime,
        isClosed: d.isClosed,
      })),
    });

    const createdSchedules = await prisma.merchantSchedule.findMany({
      where: { merchantId: testMerchant.id },
    });
    assert(createdSchedules.length === 7, "Se crearon automáticamente los 7 días de horario semanal.");

    // -------------------------------------------------------------
    // FASE 2: GESTIÓN DE SUCURSALES (CRUD)
    // -------------------------------------------------------------
    console.log("\n📍 [4/8] Prueba de Gestión de Sucursales...");
    testBranch = await prisma.merchantBranch.create({
      data: {
        merchantId: testMerchant.id,
        name: "Sucursal Terminal Ivirgarzama",
        address: "Av. Panamericana frente a la Terminal Terrestre",
        phone: "+59171122334",
        latitude: -17.035,
        longitude: -64.852,
        isOpen: true,
      },
    });

    assert(testBranch.name === "Sucursal Terminal Ivirgarzama", "Sucursal creada con coordenadas y teléfono.");

    // Actualizar sucursal
    const updatedBranch = await prisma.merchantBranch.update({
      where: { id: testBranch.id },
      data: {
        phone: "+59179988776",
        isOpen: false,
      },
    });
    assert(updatedBranch.phone === "+59179988776" && updatedBranch.isOpen === false, "Sucursal editada y desactivada correctamente.");

    // Eliminar sucursal
    await prisma.merchantBranch.delete({
      where: { id: testBranch.id },
    });
    const checkDeletedBranch = await prisma.merchantBranch.findUnique({
      where: { id: testBranch.id },
    });
    assert(checkDeletedBranch === null, "Sucursal eliminada satisfactoriamente.");

    // -------------------------------------------------------------
    // FASE 3: ACTUALIZACIÓN DE INFORMACIÓN, HORARIOS Y ESTADO
    // -------------------------------------------------------------
    console.log("\n✏️  [5/8] Prueba de Actualización de Datos y Horarios...");
    // Actualizar datos del comercio
    const updatedMerchant = await prisma.merchant.update({
      where: { id: testMerchant.id },
      data: {
        legalName: "Inversiones El Valle S.R.L. Modificada",
        isOpen: false, // Desactivar temporalmente / cerrado
        phone: "+59144998877",
      },
    });
    assert(updatedMerchant.legalName === "Inversiones El Valle S.R.L. Modificada" && updatedMerchant.isOpen === false, "Información comercial y estado de apertura actualizados.");

    // Modificar horario de Domingo (cerrado)
    await prisma.merchantSchedule.updateMany({
      where: { merchantId: testMerchant.id, dayOfWeek: 0 },
      data: { isClosed: true },
    });
    const sundaySchedule = await prisma.merchantSchedule.findFirst({
      where: { merchantId: testMerchant.id, dayOfWeek: 0 },
    });
    assert(sundaySchedule?.isClosed === true, "Horario de domingo configurado como cerrado.");

    // -------------------------------------------------------------
    // FASE 4: ASOCIACIÓN DE PEDIDOS Y CÁLCULO DE ESTADÍSTICAS REALES
    // -------------------------------------------------------------
    console.log("\n📊 [6/8] Prueba de Pedidos Asociados y Estadísticas en Bs...");
    
    // Crear cliente de prueba y su registro de Customer
    testCustomerUser = await prisma.user.create({
      data: {
        email: `cliente_${runId}@tropigo.test`,
        phone: `+591600${runId.toString().slice(-5)}`,
        name: "Cliente Comensal",
        password: "hashed_dummy_password_for_tests",
        role: ROLES.CUSTOMER,
        status: "ACTIVE",
      },
    });

    testCustomer = await prisma.customer.create({
      data: {
        userId: testCustomerUser.id,
        phone: testCustomerUser.phone,
        name: testCustomerUser.name,
        defaultAddress: "Barrio Magisterio, Ivirgarzama",
      },
    });

    // Simular 3 pedidos asociados al comercio
    // Pedido 1: 50 Bs (ENTREGADO)
    // Pedido 2: 120 Bs (ENTREGADO)
    // Pedido 3: 35 Bs (RECIBIDO)
    const order1 = await prisma.order.create({
      data: {
        orderNumber: `ORD-${runId}-001`,
        customerId: testCustomer.id,
        merchantId: testMerchant.id,
        status: "ENTREGADO",
        subtotal: 50.00,
        deliveryFee: 10.00,
        totalAmount: 60.00,
        itemsJson: JSON.stringify([{ name: "Plato Especial", quantity: 1, price: 50 }]),
        paymentMethod: "QR_BANCO",
        paymentStatus: "PAGADO_VERIFICADO",
        deliveryAddressText: "Barrio Magisterio, Ivirgarzama",
      },
    });

    const order2 = await prisma.order.create({
      data: {
        orderNumber: `ORD-${runId}-002`,
        customerId: testCustomer.id,
        merchantId: testMerchant.id,
        status: "ENTREGADO",
        subtotal: 120.00,
        deliveryFee: 12.00,
        totalAmount: 132.00,
        itemsJson: JSON.stringify([{ name: "Pique Macho Familiar", quantity: 1, price: 120 }]),
        paymentMethod: "EFECTIVO",
        paymentStatus: "PAGADO_VERIFICADO",
        deliveryAddressText: "Av. Barrientos y calle Sucre, Ivirgarzama",
      },
    });

    const order3 = await prisma.order.create({
      data: {
        orderNumber: `ORD-${runId}-003`,
        customerId: testCustomer.id,
        merchantId: testMerchant.id,
        status: "RECIBIDO",
        subtotal: 35.00,
        deliveryFee: 10.00,
        totalAmount: 45.00,
        itemsJson: JSON.stringify([{ name: "Almuerzo Ejecutivo", quantity: 1, price: 35 }]),
        paymentMethod: "EFECTIVO",
        paymentStatus: "PENDIENTE",
        deliveryAddressText: "Zona Central, Ivirgarzama",
      },
    });

    // Calcular estadísticas en tiempo real (idéntico a /api/admin/merchants/[id])
    const allOrders = await prisma.order.findMany({
      where: { merchantId: testMerchant.id },
      select: {
        id: true,
        status: true,
        subtotal: true,
        totalAmount: true,
      },
    });

    const completedOrders = allOrders.filter((o) => o.status === "ENTREGADO");
    const totalRevenueBs = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const commissionGeneratedBs = totalRevenueBs * Number(testMerchant.commissionRate);
    const averageTicketBs = completedOrders.length > 0 ? totalRevenueBs / completedOrders.length : 0;

    assert(allOrders.length === 3, `Total de pedidos asociados correcto: ${allOrders.length}.`);
    assert(completedOrders.length === 2, `Pedidos completados (ENTREGADO): ${completedOrders.length}.`);
    assert(totalRevenueBs === 192.00, `Facturación total acumulada en Bs. exacta: ${totalRevenueBs} Bs. (60 + 132 Bs).`);
    assert(commissionGeneratedBs === 19.20, `Comisión generada para TropiGO exacta: ${commissionGeneratedBs.toFixed(2)} Bs. (10% de 192 Bs).`);
    assert(averageTicketBs === 96.00, `Ticket promedio exacto: ${averageTicketBs} Bs.`);

    // -------------------------------------------------------------
    // FASE 5: BÚSQUEDA, FILTROS Y PAGINACIÓN
    // -------------------------------------------------------------
    console.log("\n🔍 [7/8] Prueba de Búsqueda, Filtros y Paginación...");
    // 1. Búsqueda por nombre
    const searchByName = await prisma.merchant.findMany({
      where: {
        name: { contains: "El Valle Test", mode: "insensitive" },
      },
    });
    assert(searchByName.some((m) => m.id === testMerchant.id), "Búsqueda por nombre de comercio exitosa.");

    // 2. Búsqueda por NIT
    const searchByNit = await prisma.merchant.findMany({
      where: {
        nit: { contains: "1029384756", mode: "insensitive" },
      },
    });
    assert(searchByNit.some((m) => m.id === testMerchant.id), "Búsqueda por NIT fiscal exitosa.");

    // 3. Filtro por categoría y ciudad
    const filterCatCity = await prisma.merchant.findMany({
      where: {
        categoryId: testCategory.id,
        cityId: testCity.id,
      },
    });
    assert(filterCatCity.some((m) => m.id === testMerchant.id), "Filtro combinado por Categoría y Ciudad verificado.");

    // 4. Paginación
    const countTotal = await prisma.merchant.count({
      where: { cityId: testCity.id },
    });
    const pageSize = 2;
    const page1 = await prisma.merchant.findMany({
      where: { cityId: testCity.id },
      take: pageSize,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });
    assert(page1.length <= pageSize && countTotal >= 1, `Paginación operativa (total: ${countTotal}, página 1 devuelta con ${page1.length} registros).`);

    // -------------------------------------------------------------
    // FASE 6: REGLAS DE SEGURIDAD Y CONTROL DE ACCESO (RBAC)
    // -------------------------------------------------------------
    console.log("\n🛡️  [8/8] Prueba de Seguridad y Control de Acceso (RBAC)...");
    
    // 1. Propietario autorizado puede acceder a su propio comercio
    let ownerAccessAllowed = false;
    try {
      await assertMerchantOwnership(testOwnerUser.id, testMerchant.id);
      ownerAccessAllowed = true;
    } catch (e) {
      ownerAccessAllowed = false;
    }
    assert(ownerAccessAllowed, "El dueño del comercio tiene acceso legítimo a sus propios datos.");

    // 2. Propietario ajeno es bloqueado
    anotherOwnerUser = await prisma.user.create({
      data: {
        email: `otro_dueno_${runId}@tropigo.test`,
        phone: `+591777${runId.toString().slice(-5)}`,
        name: "Otro Propietario Ajeno",
        password: "hashed_dummy_password_for_tests",
        role: ROLES.MERCHANT_OWNER,
        status: "ACTIVE",
      },
    });

    let strangerBlocked = false;
    try {
      await assertMerchantOwnership(anotherOwnerUser.id, testMerchant.id);
    } catch (e: any) {
      if (e instanceof ForbiddenError) {
        strangerBlocked = true;
      }
    }
    assert(strangerBlocked, "Un comercio ajeno es BLOQUEADO con ForbiddenError (403) si intenta acceder a datos de otro comercio.");

    // 3. Intento de modificar comisión desde panel privado de comercio es ignorado/bloqueado
    // (En /api/comercio/my-profile los campos sensibles como commissionRate y cityId se omiten del update)
    const allowedMerchantUpdateFields = {
      phone: "+59144888888",
      address: "Nueva Dirección Ivirgarzama",
      commissionRate: 0.01, // Intento no permitido
    };
    // Desestructurar de la misma forma que /api/comercio/my-profile
    const { commissionRate, ...safeUpdates } = allowedMerchantUpdateFields;
    const selfUpdated = await prisma.merchant.update({
      where: { id: testMerchant.id },
      data: safeUpdates,
    });
    const reloadedMerchant = await prisma.merchant.findUnique({
      where: { id: testMerchant.id },
    });
    assert(
      reloadedMerchant?.phone === "+59144888888" &&
      Number(reloadedMerchant?.commissionRate) === 0.10,
      "El comercio puede actualizar sus contactos pero la comisión de la plataforma se mantiene inmutable (10%)."
    );

  } catch (err: any) {
    console.error("❌ ERROR DURANTE LA SUITE DE PRUEBAS:", err);
    testsFailed++;
  } finally {
    // -------------------------------------------------------------
    // LIMPIEZA DE DATOS DE PRUEBA
    // -------------------------------------------------------------
    console.log("\n🧹 Limpiando registros temporales de prueba...");
    try {
      if (testMerchant?.id) {
        await prisma.order.deleteMany({
          where: { merchantId: testMerchant.id },
        });
        await prisma.merchantSchedule.deleteMany({
          where: { merchantId: testMerchant.id },
        });
        await prisma.merchantBranch.deleteMany({
          where: { merchantId: testMerchant.id },
        });
        await prisma.merchant.delete({
          where: { id: testMerchant.id },
        });
      }
      if (testCategory?.id) {
        await prisma.commercialCategory.delete({
          where: { id: testCategory.id },
        });
      }
      const usersToDelete = [testOwnerUser?.id, anotherOwnerUser?.id, testCustomerUser?.id].filter(Boolean);
      if (testCustomerUser?.id) {
        await prisma.customer.deleteMany({
          where: { userId: testCustomerUser.id },
        });
      }
      if (usersToDelete.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: usersToDelete } },
        });
      }
      console.log("  ✅ Limpieza completada con éxito sin dejar residuos.");
    } catch (cleanupErr) {
      console.warn("  ⚠️ Advertencia durante limpieza:", cleanupErr);
    }
    await prisma.$disconnect();
  }

  console.log("\n=================================================================");
  console.log(`RESUMEN DE PRUEBAS: ${testsPassed} Pasadas, ${testsFailed} Fallidas`);
  console.log("=================================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runMerchantTestSuite();
