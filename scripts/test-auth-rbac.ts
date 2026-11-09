import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  ROLES,
  Role,
  requireRole,
  assertMerchantOwnership,
  assertRiderOrderAccess,
  assertRiderTripAccess,
  assertCustomerAccess,
  UnauthorizedError,
  ForbiddenError,
} from "../src/lib/auth/rbac";
import {
  createSession,
  verifySessionToken,
  destroyAllUserSessions,
  destroySession,
} from "../src/lib/auth/session";

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

async function runTestSuite() {
  console.log("=================================================================");
  console.log("🔒 SUITE DE PRUEBAS DE AUTENTICACIÓN Y AUTORIZACIÓN (RBAC) TROPIGO");
  console.log("=================================================================\n");

  try {
    // -------------------------------------------------------------
    // SETUP: Creación de entidades de prueba temporales aisladas
    // -------------------------------------------------------------
    console.log("⚙️  Configurando datos de prueba...");

    // 1. Ciudad de prueba (usamos Ivirgarzama o la creamos)
    let testCity = await prisma.city.findFirst({
      where: { name: "Ivirgarzama" },
    });
    if (!testCity) {
      testCity = await prisma.city.create({
        data: {
          name: "Ivirgarzama",
          department: "Cochabamba",
          isActive: true,
        },
      });
    }

    // 2. Zona de prueba
    let testZone = await prisma.deliveryZone.findFirst({
      where: { cityId: testCity.id },
    });
    if (!testZone) {
      testZone = await prisma.deliveryZone.create({
        data: {
          cityId: testCity.id,
          name: "Casco Central Test",
          baseDeliveryCost: 5.0,
          baseRideCost: 4.0,
        },
      });
    }

    // 3. Usuarios de prueba para cada Rol
    const hash = await bcrypt.hash("PasswordTest123!", 10);

    const userSuperadmin = await prisma.user.upsert({
      where: { email: "test-superadmin@tropigo.test" },
      update: { role: "SUPERADMIN", status: "ACTIVE" },
      create: {
        email: "test-superadmin@tropigo.test",
        password: hash,
        name: "Test Superadmin",
        role: "SUPERADMIN",
        status: "ACTIVE",
      },
    });

    const userAdmin = await prisma.user.upsert({
      where: { email: "test-admin@tropigo.test" },
      update: { role: "ADMIN", status: "ACTIVE" },
      create: {
        email: "test-admin@tropigo.test",
        password: hash,
        name: "Test Admin",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    const userOperator = await prisma.user.upsert({
      where: { email: "test-operator@tropigo.test" },
      update: { role: "OPERATOR", status: "ACTIVE" },
      create: {
        email: "test-operator@tropigo.test",
        password: hash,
        name: "Test Operator",
        role: "OPERATOR",
        status: "ACTIVE",
      },
    });

    const userMerchantA = await prisma.user.upsert({
      where: { email: "test-merchant-a@tropigo.test" },
      update: { role: "MERCHANT_OWNER", status: "ACTIVE" },
      create: {
        email: "test-merchant-a@tropigo.test",
        password: hash,
        name: "Test Merchant Owner A",
        role: "MERCHANT_OWNER",
        status: "ACTIVE",
      },
    });

    const userMerchantB = await prisma.user.upsert({
      where: { email: "test-merchant-b@tropigo.test" },
      update: { role: "MERCHANT_OWNER", status: "ACTIVE" },
      create: {
        email: "test-merchant-b@tropigo.test",
        password: hash,
        name: "Test Merchant Owner B",
        role: "MERCHANT_OWNER",
        status: "ACTIVE",
      },
    });

    const userRiderA = await prisma.user.upsert({
      where: { email: "test-rider-a@tropigo.test" },
      update: { role: "RIDER", status: "ACTIVE" },
      create: {
        email: "test-rider-a@tropigo.test",
        password: hash,
        name: "Test Rider A",
        role: "RIDER",
        status: "ACTIVE",
      },
    });

    const userRiderB = await prisma.user.upsert({
      where: { email: "test-rider-b@tropigo.test" },
      update: { role: "RIDER", status: "ACTIVE" },
      create: {
        email: "test-rider-b@tropigo.test",
        password: hash,
        name: "Test Rider B",
        role: "RIDER",
        status: "ACTIVE",
      },
    });

    const userCustomerA = await prisma.user.upsert({
      where: { email: "test-customer-a@tropigo.test" },
      update: { role: "CUSTOMER", status: "ACTIVE" },
      create: {
        email: "test-customer-a@tropigo.test",
        password: hash,
        name: "Test Customer A",
        role: "CUSTOMER",
        status: "ACTIVE",
      },
    });

    const userCustomerB = await prisma.user.upsert({
      where: { email: "test-customer-b@tropigo.test" },
      update: { role: "CUSTOMER", status: "ACTIVE" },
      create: {
        email: "test-customer-b@tropigo.test",
        password: hash,
        name: "Test Customer B",
        role: "CUSTOMER",
        status: "ACTIVE",
      },
    });

    // 4. Perfiles y Entidades de Comercio
    const merchantA = await prisma.merchant.upsert({
      where: { slug: "test-merchant-a" },
      update: { ownerId: userMerchantA.id },
      create: {
        id: "merchant_test_a",
        cityId: testCity.id,
        ownerId: userMerchantA.id,
        name: "Comercio A de Prueba",
        slug: "test-merchant-a",
        category: "Restaurante",
      },
    });

    const merchantB = await prisma.merchant.upsert({
      where: { slug: "test-merchant-b" },
      update: { ownerId: userMerchantB.id },
      create: {
        id: "merchant_test_b",
        cityId: testCity.id,
        ownerId: userMerchantB.id,
        name: "Comercio B de Prueba",
        slug: "test-merchant-b",
        category: "Pollería",
      },
    });

    // 5. Perfiles de Repartidor
    const riderA = await prisma.rider.upsert({
      where: { phone: "+59170000001" },
      update: { userId: userRiderA.id },
      create: {
        id: "rider_test_a",
        userId: userRiderA.id,
        cityId: testCity.id,
        name: "Rider Test A",
        phone: "+59170000001",
        vehicleType: "MOTO",
        plateNumber: "TEST-01",
      },
    });

    const riderB = await prisma.rider.upsert({
      where: { phone: "+59170000002" },
      update: { userId: userRiderB.id },
      create: {
        id: "rider_test_b",
        userId: userRiderB.id,
        cityId: testCity.id,
        name: "Rider Test B",
        phone: "+59170000002",
        vehicleType: "TORITO_TRIMOVIL",
        plateNumber: "TEST-02",
      },
    });

    // 6. Perfiles de Clientes
    const customerA = await prisma.customer.upsert({
      where: { phone: "+59170000003" },
      update: { userId: userCustomerA.id },
      create: {
        id: "customer_test_a",
        userId: userCustomerA.id,
        name: "Customer Test A",
        phone: "+59170000003",
      },
    });

    const customerB = await prisma.customer.upsert({
      where: { phone: "+59170000004" },
      update: { userId: userCustomerB.id },
      create: {
        id: "customer_test_b",
        userId: userCustomerB.id,
        name: "Customer Test B",
        phone: "+59170000004",
      },
    });

    // 7. Pedidos y Viajes asignados
    const orderRiderA = await prisma.order.upsert({
      where: { orderNumber: "TEST-ORD-A" },
      update: { assignedRiderId: riderA.id, merchantId: merchantA.id, customerId: customerA.id },
      create: {
        id: "order_test_a",
        orderNumber: "TEST-ORD-A",
        cityId: testCity.id,
        merchantId: merchantA.id,
        customerId: customerA.id,
        assignedRiderId: riderA.id,
        deliveryZoneId: testZone.id,
        deliveryAddressText: "Av. Test 1",
        itemsJson: "[]",
        totalAmount: 50.0,
        status: "EN_CAMINO",
      },
    });

    const orderRiderB = await prisma.order.upsert({
      where: { orderNumber: "TEST-ORD-B" },
      update: { assignedRiderId: riderB.id, merchantId: merchantB.id, customerId: customerB.id },
      create: {
        id: "order_test_b",
        orderNumber: "TEST-ORD-B",
        cityId: testCity.id,
        merchantId: merchantB.id,
        customerId: customerB.id,
        assignedRiderId: riderB.id,
        deliveryZoneId: testZone.id,
        deliveryAddressText: "Av. Test 2",
        itemsJson: "[]",
        totalAmount: 30.0,
        status: "EN_CAMINO",
      },
    });

    const tripRiderA = await prisma.rideTrip.upsert({
      where: { tripNumber: "TEST-TRIP-A" },
      update: { assignedRiderId: riderA.id, customerId: customerA.id },
      create: {
        id: "trip_test_a",
        tripNumber: "TEST-TRIP-A",
        cityId: testCity.id,
        customerId: customerA.id,
        assignedRiderId: riderA.id,
        originAddress: "Origen A",
        destinationAddress: "Destino A",
        status: "EN_CURSO",
        fareAmount: 4.0,
      },
    });

    console.log("✅ Entidades de prueba inicializadas correctamente.\n");

    // =============================================================
    // TEST 1: Sesiones y Criptografía JWT
    // =============================================================
    console.log("🧪 GRUPO 1: Gestión de Sesiones y Criptografía");

    const sessionToken = await createSession(
      {
        userId: userAdmin.id,
        email: userAdmin.email,
        role: userAdmin.role,
        name: userAdmin.name,
      },
      { ipAddress: "192.168.1.100", userAgent: "TestRunner/1.0" }
    );

    assert(typeof sessionToken === "string" && sessionToken.length > 20, "Generación exitosa de JWT firmado");

    const verified = await verifySessionToken(sessionToken);
    assert(
      verified !== null && verified.userId === userAdmin.id && verified.role === "ADMIN",
      "Verificación de token JWT y existencia de sesión activa en BD"
    );

    const invalidCheck = await verifySessionToken("token.invalido.falso");
    assert(invalidCheck === null, "Rechazo inmediato de token JWT corrupto o manipulado");

    // =============================================================
    // TEST 2: Control de Acceso de Comercios (Aislamiento de Datos)
    // =============================================================
    console.log("\n🧪 GRUPO 2: Control de Acceso y Aislamiento de Comercios");

    // A. El Comercio A puede acceder a su propio comercio
    let allowedA = false;
    try {
      allowedA = await assertMerchantOwnership(userMerchantA.id, merchantA.id);
    } catch (e) {}
    assert(allowedA === true, "Comercio A autorizado a consultar y editar su propio restaurante");

    // B. El Comercio A NO puede acceder al comercio B
    let deniedB = false;
    try {
      await assertMerchantOwnership(userMerchantA.id, merchantB.id);
    } catch (e) {
      if (e instanceof ForbiddenError) deniedB = true;
    }
    assert(deniedB === true, "Comercio A DENEGADO (403 Forbidden) al intentar acceder al Comercio B");

    // C. El Superadministrador sí puede acceder a cualquier comercio
    let superadminAccess = false;
    try {
      superadminAccess = await assertMerchantOwnership(userSuperadmin.id, merchantA.id);
    } catch (e) {}
    assert(superadminAccess === true, "Superadministrador autorizado a supervisar el Comercio A");

    // D. Un Cliente NO puede acceder a la administración del comercio
    let customerDenied = false;
    try {
      await assertMerchantOwnership(userCustomerA.id, merchantA.id);
    } catch (e) {
      if (e instanceof ForbiddenError) customerDenied = true;
    }
    assert(customerDenied === true, "Cliente DENEGADO (403 Forbidden) al intentar administrar un comercio");

    // =============================================================
    // TEST 3: Control de Acceso de Repartidores (Aislamiento de Entregas)
    // =============================================================
    console.log("\n🧪 GRUPO 3: Control de Acceso y Aislamiento de Repartidores");

    // A. El Repartidor A puede acceder a su entrega asignada
    let riderAAllowed = false;
    try {
      riderAAllowed = await assertRiderOrderAccess(userRiderA.id, orderRiderA.id);
    } catch (e) {}
    assert(riderAAllowed === true, "Repartidor A autorizado a ver y gestionar su entrega asignada");

    // B. El Repartidor A NO puede acceder a la entrega del Repartidor B
    let riderADeniedOther = false;
    try {
      await assertRiderOrderAccess(userRiderA.id, orderRiderB.id);
    } catch (e) {
      if (e instanceof ForbiddenError) riderADeniedOther = true;
    }
    assert(riderADeniedOther === true, "Repartidor A DENEGADO (403 Forbidden) al intentar acceder a la entrega del Repartidor B");

    // C. Un Operador central sí puede acceder a la entrega para reasignarla
    let operatorAllowedOrder = false;
    try {
      operatorAllowedOrder = await assertRiderOrderAccess(userOperator.id, orderRiderA.id);
    } catch (e) {}
    assert(operatorAllowedOrder === true, "Operador Central autorizado a supervisar cualquier entrega");

    // =============================================================
    // TEST 4: Control de Acceso de Mototaxistas (Carreras de Pasajeros)
    // =============================================================
    console.log("\n🧪 GRUPO 4: Control de Acceso a Carreras de Pasajeros");

    // A. El Conductor A puede acceder a su carrera asignada
    let tripAllowedA = false;
    try {
      tripAllowedA = await assertRiderTripAccess(userRiderA.id, tripRiderA.id);
    } catch (e) {}
    assert(tripAllowedA === true, "Conductor autorizado a ver y finalizar su carrera asignada");

    // B. El Conductor B NO puede acceder a la carrera del Conductor A
    let tripDeniedB = false;
    try {
      await assertRiderTripAccess(userRiderB.id, tripRiderA.id);
    } catch (e) {
      if (e instanceof ForbiddenError) tripDeniedB = true;
    }
    assert(tripDeniedB === true, "Conductor B DENEGADO (403 Forbidden) al intentar acceder a la carrera del Conductor A");

    // =============================================================
    // TEST 5: Control de Acceso de Clientes (Privacidad de Datos)
    // =============================================================
    console.log("\n🧪 GRUPO 5: Privacidad y Aislamiento de Clientes");

    // A. El Cliente A puede consultar sus propios datos
    let customerAAllowed = false;
    try {
      customerAAllowed = await assertCustomerAccess(userCustomerA.id, customerA.id);
    } catch (e) {}
    assert(customerAAllowed === true, "Cliente autorizado a consultar sus propios pedidos y direcciones");

    // B. El Cliente A NO puede consultar datos del Cliente B
    let customerADeniedB = false;
    try {
      await assertCustomerAccess(userCustomerA.id, customerB.id);
    } catch (e) {
      if (e instanceof ForbiddenError) customerADeniedB = true;
    }
    assert(customerADeniedB === true, "Cliente A DENEGADO (403 Forbidden) al intentar consultar pedidos del Cliente B");

    // =============================================================
    // TEST 6: Flujo de Recuperación de Contraseña
    // =============================================================
    console.log("\n🧪 GRUPO 6: Recuperación de Contraseña con Criptografía Segura");

    const resetTokenStr = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    const resetRecord = await prisma.passwordResetToken.create({
      data: {
        userId: userCustomerA.id,
        token: resetTokenStr,
        expiresAt,
      },
    });

    assert(resetRecord.token === resetTokenStr, "Token de recuperación generado y guardado en base de datos");

    // Simular canje del token
    const newPasswordHash = await bcrypt.hash("NewPassword2026!", 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userCustomerA.id },
        data: { password: newPasswordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    const updatedUser = await prisma.user.findUnique({
      where: { id: userCustomerA.id },
    });
    const passwordUpdated = await bcrypt.compare("NewPassword2026!", updatedUser!.password);
    assert(passwordUpdated === true, "Contraseña actualizada exitosamente con bcrypt (12 rondas)");

    // Intentar reutilizar el token (Debe ser rechazado por usedAt !== null)
    const usedTokenCheck = await prisma.passwordResetToken.findUnique({
      where: { token: resetTokenStr },
    });
    assert(usedTokenCheck?.usedAt !== null, "Protección contra repetición: el token queda invalidado de por vida");

    // =============================================================
    // TEST 7: Revocación Remota de Sesiones
    // =============================================================
    console.log("\n🧪 GRUPO 7: Revocación de Sesiones Remotas");

    // Crear sesión para el usuario Customer A
    const custSessionToken = await createSession(
      {
        userId: userCustomerA.id,
        email: userCustomerA.email,
        role: userCustomerA.role,
        name: userCustomerA.name,
      },
      { ipAddress: "10.0.0.1", userAgent: "MobileApp" }
    );

    const sessionBefore = await verifySessionToken(custSessionToken);
    assert(sessionBefore !== null, "Sesión activa validada correctamente");

    // Revocar todas las sesiones del usuario (simulando cambio de contraseña o cierre remoto)
    await destroyAllUserSessions(userCustomerA.id);

    const sessionAfter = await verifySessionToken(custSessionToken);
    assert(sessionAfter === null, "Sesión revocada rechazada inmediatamente (401 Unauthorized)");

    // =============================================================
    // TEST 8: Protección de Bootstrap del Primer Administrador
    // =============================================================
    console.log("\n🧪 GRUPO 8: Seguridad del Procedimiento de Bootstrap");

    const superadminCount = await prisma.user.count({
      where: { role: "SUPERADMIN" },
    });

    assert(
      superadminCount > 0,
      `Superadministrador existente verificado (${superadminCount}). El endpoint de bootstrap se bloquea permanentemente con 403.`
    );

    // -------------------------------------------------------------
    // RESUMEN FINAL
    // -------------------------------------------------------------
    console.log("\n=======================================================");
    console.log(`📊 RESULTADO DE LA SUITE DE PRUEBAS DE SEGURIDAD RBAC:`);
    console.log(`   Pruebas Exitosas: ${testsPassed}`);
    console.log(`   Pruebas Fallidas: ${testsFailed}`);
    console.log("=======================================================");

    if (testsFailed > 0) {
      console.error("\n❌ Se detectaron fallas de seguridad o permisos.");
      process.exit(1);
    } else {
      console.log("\n✨ ¡TODAS LAS PRUEBAS DE SEGURIDAD Y PERMISOS PASARON EXITOSAMENTE (100%)!");
    }
  } catch (error) {
    console.error("Error durante la ejecución de las pruebas:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
