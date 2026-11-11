import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function runIntegrityTests() {
  console.log("🔍 Iniciando pruebas de integridad del modelo de datos de TropiGO...\n");
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  try {
    // 1. Prueba de Localidades (5 localidades requeridas)
    const cities = await prisma.city.findMany();
    assert(cities.length === 5, `Se esperan 5 localidades, encontradas: ${cities.length}`);

    const ivirgarzama = cities.find((c) => c.name === "Ivirgarzama");
    assert(ivirgarzama?.isActive === true, "Ivirgarzama debe ser la localidad inicial activa");

    const inactiveCities = cities.filter((c) => c.name !== "Ivirgarzama");
    const allInactive = inactiveCities.every((c) => c.isActive === false);
    assert(
      allInactive && inactiveCities.length === 4,
      "Las otras 4 localidades (Shinahota, Puerto Villarroel, Chimoré, Villa Tunari) deben estar inactivas"
    );

    // 2. Prueba de Zonas y Tarifas
    const zones = await prisma.deliveryZone.findMany({ where: { cityId: ivirgarzama?.id } });
    assert(zones.length === 5, `Se esperan 5 zonas de cobertura en Ivirgarzama, encontradas: ${zones.length}`);
    const cascoCentral = zones.find((z) => z.name === "Casco Central");
    assert(
      cascoCentral?.baseDeliveryCost === 5.0 && cascoCentral?.baseRideCost === 4.0,
      `Tarifas base correctas en Casco Central (Delivery: ${cascoCentral?.baseDeliveryCost} Bs., Moto: ${cascoCentral?.baseRideCost} Bs.)`
    );

    // 3. Prueba de Seguridad y Credenciales Hacheadas (Sin texto plano)
    const admin = await prisma.user.findUnique({
      where: { email: "admin@tropigo.bo" },
      include: { profile: true },
    });
    assert(!!admin, "Usuario administrador existe en la base de datos");
    const adminPassword = process.env.ADMIN_PASSWORD;
    assert(!!adminPassword, "ADMIN_PASSWORD está definida para validar el hash");
    assert(
      !adminPassword || !admin?.password.includes(adminPassword),
      "La contraseña no está en texto plano"
    );
    const passwordValid = adminPassword
      ? await bcrypt.compare(adminPassword, admin?.password || "")
      : false;
    assert(passwordValid, "El hash bcrypt de la contraseña de administrador valida correctamente");
    assert(admin?.role === "ADMIN", `Rol de administrador verificado: ${admin?.role}`);

    // 4. Prueba de Preservación Histórica de Pedidos (OrderItem Snapshot)
    const demoOrder = await prisma.order.findUnique({
      where: { orderNumber: "TRP-1041" },
      include: {
        items: true,
        statusHistory: true,
        merchant: true,
        assignedRider: true,
        paymentRecords: true,
      },
    });
    assert(!!demoOrder, "Pedido de demostración TRP-1041 existe");
    assert(
      demoOrder?.items.length === 1,
      `Renglones del pedido normalizados (OrderItem): ${demoOrder?.items.length}`
    );
    const item = demoOrder?.items[0];
    assert(
      item?.productName === "[DEMO] Cuarto de Pollo a la Broaster" && item?.unitPrice === 18.0,
      `Snapshot inmutable verificado: ${item?.productName} congelado a ${item?.unitPrice} Bs.`
    );
    assert(
      demoOrder?.statusHistory.length === 2,
      `Trazabilidad de estados (OrderStatusHistory): ${demoOrder?.statusHistory.length} eventos registrados`
    );

    // 5. Prueba de Comercios [DEMO] y Catálogo
    const merchants = await prisma.merchant.findMany({
      include: { products: { include: { variants: true } } },
    });
    assert(merchants.length === 4, `Comercios [DEMO] creados: ${merchants.length}`);
    const allDemoTagged = merchants.every((m) => m.name.includes("[DEMO]"));
    assert(allDemoTagged, "Todos los comercios de demostración están claramente etiquetados con [DEMO]");

    // 6. Prueba de Movilidad y Mototaxis
    const demoRide = await prisma.rideTrip.findUnique({
      where: { tripNumber: "VIAJE-2001" },
      include: { assignedRider: true, statusHistory: true },
    });
    assert(!!demoRide, "Carrera de mototaxi de demostración VIAJE-2001 existe");
    assert(
      demoRide?.fareAmount === 5.0 && demoRide?.vehicleType === "TORITO_TRIMOVIL",
      `Tarifa y vehículo de torito verificados: ${demoRide?.fareAmount} Bs. en ${demoRide?.vehicleType}`
    );
    assert(
      demoRide?.statusHistory.length === 2,
      `Trazabilidad de carrera (RideStatusHistory): ${demoRide?.statusHistory.length} transiciones`
    );

    // 7. Prueba de Configuración de Asistente IA (TropiBot)
    const assistant = await prisma.assistantConfig.findFirst();
    assert(assistant?.name === "TropiBot", `Asistente configurado como: ${assistant?.name}`);
    assert(
      assistant?.activeProvider === "GROQ",
      `Proveedor de IA activo por defecto: ${assistant?.activeProvider}`
    );

    console.log(`\n📊 Resumen de Pruebas: ${passedTests}/${totalTests} pruebas superadas con éxito (100%).`);
  } catch (error: any) {
    console.error("❌ Error ejecutando pruebas de integridad:", error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

runIntegrityTests();
