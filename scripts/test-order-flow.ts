import { prisma } from "../src/lib/prisma";
import {
  assignRiderToOrder,
  confirmAndCreateOrder,
  createOrderQuote,
  findActiveZoneForQuery,
  getOrderForCustomer,
  OrderTransitionError,
  transitionOrderStatus,
} from "../src/lib/orders/order-service";
import {
  isExplicitConfirmation,
  isSafeExplicitConfirmation,
} from "../src/lib/orders/confirmation";

let passed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passed += 1;
  console.log(`  ✅ [PASS] ${message}`);
}

function unitTests() {
  console.log("===============================================================");
  console.log("🧪 1. DETECCIÓN DETERMINÍSTICA DE CONFIRMACIÓN");
  console.log("===============================================================\n");

  const positives = [
    "Sí, confirmo",
    "si confirmo",
    "Sí, confirmo el pedido",
    "Confirmo mi pedido",
    "Dale adelante",
    "De acuerdo",
    "Perfecto",
    "Adelante",
    "OK",
    "Listo",
  ];

  for (const text of positives) {
    assert(isExplicitConfirmation(text), `Reconoce confirmación: "${text}"`);
    assert(isSafeExplicitConfirmation(text), `Acepta confirmación segura: "${text}"`);
  }

  const negatives = [
    "No confirmo",
    "No, todavía no",
    "Espera",
    "Sí, pero agrega papas",
    "Sí confirmo, cambia la dirección",
    "Mejor cancela",
    "Quizás",
    "Tal vez",
    "No estoy seguro",
    "Sí, confirmo, agrega 2 gaseosas",
    "Confirmo por 30 Bs",
    "Sí, pero sin ensalada",
  ];

  for (const text of negatives) {
    assert(!isSafeExplicitConfirmation(text), `Rechaza confirmación insegura: "${text}"`);
  }

  assert(!isExplicitConfirmation(""), "Rechaza texto vacío");
  assert(!isExplicitConfirmation("Hola, ¿qué tienen?"), "Rechaza saludo sin confirmación");
}

async function integrationTests() {
  console.log("\n===============================================================");
  console.log("🧪 2. FLUJO REAL DE COTIZACIÓN, CONFIRMACIÓN Y PEDIDO");
  console.log("===============================================================\n");

  const suffix = `${Date.now()}`.slice(-8);
  const created: {
    zoneIds: string[];
    merchantId?: string;
    customerIds: string[];
    conversationId?: string;
    riderId?: string;
    adminId?: string;
    orderId?: string;
  } = { zoneIds: [], customerIds: [] };

  try {
    // -------------------------------------------------------------
    // Datos de prueba aislados (se eliminan al final)
    // -------------------------------------------------------------
    const zoneA = await prisma.deliveryZone.create({
      data: {
        name: `TEST-ZONA-A-${suffix}`,
        description: `Zona de prueba A ${suffix}`,
        baseDeliveryCost: 7.5,
        baseRideCost: 5.5,
        estimatedMinutes: 25,
        isActive: true,
      },
    });
    const zoneB = await prisma.deliveryZone.create({
      data: {
        name: `TEST-ZONA-B-${suffix}`,
        description: `Zona de prueba B ${suffix}`,
        baseDeliveryCost: 9.0,
        baseRideCost: 6.0,
        estimatedMinutes: 30,
        isActive: true,
      },
    });
    created.zoneIds.push(zoneA.id, zoneB.id);

    const merchant = await prisma.merchant.create({
      data: {
        name: `TEST-COMERCIO-${suffix}`,
        category: "Restaurante",
        isOpen: true,
        phone: `+5917${suffix}`,
      },
    });
    created.merchantId = merchant.id;

    const product = await prisma.product.create({
      data: {
        merchantId: merchant.id,
        name: `TEST-PRODUCTO-${suffix}`,
        price: 20.5,
        isAvailable: true,
      },
    });

    const customer = await prisma.customer.create({
      data: {
        phone: `+5918${suffix}`,
        name: `TEST-CLIENTE-${suffix}`,
      },
    });
    created.customerIds.push(customer.id);

    const otherCustomer = await prisma.customer.create({
      data: {
        phone: `+5919${suffix}`,
        name: `TEST-OTRO-CLIENTE-${suffix}`,
      },
    });
    created.customerIds.push(otherCustomer.id);

    const conversation = await prisma.conversation.create({
      data: { customerId: customer.id, channel: "WHATSAPP", status: "AI_ACTIVE" },
    });
    created.conversationId = conversation.id;

    const admin = await prisma.user.create({
      data: {
        email: `test-order-admin-${suffix}@example.invalid`,
        password: "not-a-real-password",
        name: `TEST ADMIN ${suffix}`,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    created.adminId = admin.id;

    const rider = await prisma.rider.create({
      data: {
        name: `TEST RIDER ${suffix}`,
        phone: `+5916${suffix}`,
        plateNumber: `TEST-${suffix}`,
        vehicleType: "MOTO",
        isActive: true,
        isAvailable: true,
      },
    });
    created.riderId = rider.id;

    const context = {
      customerId: customer.id,
      conversationId: conversation.id,
      source: "WHATSAPP" as const,
    };

    // -------------------------------------------------------------
    // Zonas: coincidencia exacta, ambigua y desconocida
    // -------------------------------------------------------------
    const exactZone = await findActiveZoneForQuery(zoneA.name);
    assert(exactZone.zone?.id === zoneA.id, "Resuelve la zona por nombre exacto");

    const ambiguousZone = await findActiveZoneForQuery(`TEST-ZONA`);
    assert(ambiguousZone.ambiguous === true, "Detecta coincidencia ambigua de zonas");
    assert(ambiguousZone.zone === null, "No elige una zona arbitraria cuando hay ambigüedad");

    const unknownZone = await findActiveZoneForQuery(`ZONA-INEXISTENTE-${suffix}`);
    assert(unknownZone.zone === null, "No inventa ni cae a una zona por defecto");

    // -------------------------------------------------------------
    // Cotización oficial
    // -------------------------------------------------------------
    const quote = await createOrderQuote(
      {
        comercio: merchant.name,
        items: [{ producto: product.name, cantidad: 2 }],
        direccionEntrega: `TEST Dirección ${suffix}`,
        zonaDestino: zoneA.name,
        metodoPago: "EFECTIVO",
      },
      context
    );

    assert(Boolean(quote.quoteId), "Genera un quoteId para la cotización");
    assert(quote.subtotalBs === 41, "Calcula subtotal real (2 × 20.50 = 41.00 Bs.)");
    assert(quote.costoEnvioBs === 7.5, "Aplica la tarifa de la zona exacta (7.50 Bs.)");
    assert(quote.totalBs === 48.5, "Calcula total real (48.50 Bs.)");
    assert(quote.puedeRegistrar === false, "La cotización no autoriza el pedido por sí sola");

    // -------------------------------------------------------------
    // Puerta de confirmación
    // -------------------------------------------------------------
    const withoutConfirmation = await confirmAndCreateOrder(
      { quoteId: quote.quoteId! },
      { ...context, confirmationVerified: false }
    );
    assert(
      withoutConfirmation.exitoso === false,
      "Rechaza crear el pedido sin confirmación verificada"
    );

    const operatorOutsideCrm = await confirmAndCreateOrder(
      { quoteId: quote.quoteId! },
      { ...context, operatorConfirmed: true }
    );
    assert(
      operatorOutsideCrm.exitoso === false,
      "No acepta operatorConfirmed fuera del CRM"
    );

    // -------------------------------------------------------------
    // Creación real e idempotencia
    // -------------------------------------------------------------
    const creation = await confirmAndCreateOrder(
      { quoteId: quote.quoteId! },
      { ...context, confirmationVerified: true }
    );

    assert(creation.exitoso === true, "Crea el pedido con confirmación verificada");
    assert(
      typeof creation.orderNumber === "string" && /^TRP-\d+$/.test(creation.orderNumber),
      `Genera número oficial TRP-XXXX (${creation.orderNumber})`
    );
    assert(creation.totalBs === 48.5, "Persiste el total calculado en la base de datos");
    created.orderId = creation.orderId;

    const duplicate = await confirmAndCreateOrder(
      { quoteId: quote.quoteId! },
      { ...context, confirmationVerified: true }
    );
    assert(duplicate.exitoso === true, "La segunda confirmación devuelve éxito idempotente");
    assert(duplicate.duplicado === true, "Marca la segunda confirmación como duplicada");
    assert(duplicate.orderId === creation.orderId, "No crea una segunda orden");

    const storedQuote = await prisma.orderQuote.findUnique({ where: { id: quote.quoteId } });
    assert(storedQuote?.status === "CONSUMIDA", "La cotización queda CONSUMIDA");
    assert(storedQuote?.orderId === creation.orderId, "La cotización queda vinculada a la orden");

    // -------------------------------------------------------------
    // Consulta de estado aislada por cliente
    // -------------------------------------------------------------
    const ownOrder = await getOrderForCustomer(creation.orderNumber!, {
      customerId: customer.id,
    });
    assert(ownOrder.encontrado === true, "El cliente dueño puede consultar su pedido");

    const foreignOrder = await getOrderForCustomer(creation.orderNumber!, {
      customerId: otherCustomer.id,
    });
    assert(
      foreignOrder.encontrado === false,
      "Otro cliente no puede consultar un pedido ajeno"
    );

    // -------------------------------------------------------------
    // Máquina de estados y asignación de repartidor
    // -------------------------------------------------------------
    let invalidTransitionRejected = false;
    try {
      await transitionOrderStatus({
        orderId: creation.orderId!,
        nextStatus: "ENTREGADO",
        actorUserId: admin.id,
      });
    } catch (error) {
      invalidTransitionRejected = error instanceof OrderTransitionError;
    }
    assert(
      invalidTransitionRejected,
      "Rechaza una transición inválida RECIBIDO → ENTREGADO"
    );

    const inPreparation = await transitionOrderStatus({
      orderId: creation.orderId!,
      nextStatus: "EN_PREPARACION",
      actorUserId: admin.id,
    });
    assert(inPreparation.status === "EN_PREPARACION", "Avanza a EN_PREPARACION");

    const ready = await transitionOrderStatus({
      orderId: creation.orderId!,
      nextStatus: "LISTO_RECOJO",
      actorUserId: admin.id,
    });
    assert(ready.status === "LISTO_RECOJO", "Avanza a LISTO_RECOJO");

    const assigned = await assignRiderToOrder({
      orderId: creation.orderId!,
      riderId: rider.id,
      actorUserId: admin.id,
    });
    assert(assigned.status === "ASIGNADO", "Asigna repartidor y pasa a ASIGNADO");

    const riderBusy = await prisma.rider.findUnique({ where: { id: rider.id } });
    assert(riderBusy?.isAvailable === false, "Marca al repartidor como ocupado");

    const onTheWay = await transitionOrderStatus({
      orderId: creation.orderId!,
      nextStatus: "EN_CAMINO",
      actorUserId: admin.id,
    });
    assert(onTheWay.status === "EN_CAMINO", "Avanza a EN_CAMINO");

    const delivered = await transitionOrderStatus({
      orderId: creation.orderId!,
      nextStatus: "ENTREGADO",
      actorUserId: admin.id,
    });
    assert(delivered.status === "ENTREGADO", "Avanza a ENTREGADO");

    const riderFree = await prisma.rider.findUnique({ where: { id: rider.id } });
    assert(riderFree?.isAvailable === true, "Libera al repartidor al entregar");
    assert(riderFree?.totalDeliveries === 1, "Incrementa el contador de entregas");

    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: creation.orderId },
      orderBy: { createdAt: "asc" },
    });
    assert(history.length >= 5, "Registra el historial completo de estados");
  } finally {
    // -------------------------------------------------------------
    // Limpieza estricta de los datos de prueba
    // -------------------------------------------------------------
    try {
      if (created.orderId) {
        await prisma.orderStatusHistory.deleteMany({ where: { orderId: created.orderId } });
        await prisma.orderItem.deleteMany({ where: { orderId: created.orderId } });
        await prisma.order.deleteMany({ where: { id: created.orderId } });
      }
      if (created.customerIds.length > 0) {
        await prisma.orderQuote.deleteMany({
          where: { customerId: { in: created.customerIds } },
        });
      }
      if (created.conversationId) {
        await prisma.conversation.deleteMany({ where: { id: created.conversationId } });
      }
      if (created.customerIds.length > 0) {
        await prisma.customer.deleteMany({ where: { id: { in: created.customerIds } } });
      }
      if (created.merchantId) {
        await prisma.product.deleteMany({ where: { merchantId: created.merchantId } });
        await prisma.merchant.deleteMany({ where: { id: created.merchantId } });
      }
      if (created.riderId) {
        await prisma.rider.deleteMany({ where: { id: created.riderId } });
      }
      if (created.adminId) {
        await prisma.user.deleteMany({ where: { id: created.adminId } });
      }
      if (created.zoneIds.length > 0) {
        await prisma.deliveryZone.deleteMany({ where: { id: { in: created.zoneIds } } });
      }
      console.log("\n🧹 Datos de prueba eliminados.");
    } catch (cleanupError: any) {
      console.warn("⚠️ No se pudieron eliminar todos los datos de prueba:", cleanupError.message);
    }
  }
}

async function main() {
  unitTests();

  if (process.env.RUN_DB_TESTS !== "1") {
    console.log(
      "\nℹ️ Pruebas de integración omitidas. Ejecuta con RUN_DB_TESTS=1 cuando la base de datos esté disponible."
    );
    await prisma.$disconnect();
    return;
  }

  await integrationTests();

  console.log("\n===============================================================");
  console.log(`✅ PRUEBAS COMPLETADAS: ${passed} verificaciones aprobadas`);
  console.log("===============================================================\n");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("\n❌ Pruebas fallidas:", error.message);
  await prisma.$disconnect().catch(() => {});
  process.exitCode = 1;
});
