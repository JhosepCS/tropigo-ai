/**
 * Suite de Pruebas de Herramientas Internas Conectadas a la Base de Datos Real de TropiGO:
 * 
 * 1. Comercios registrados (consultar_comercios)
 * 2. Catálogo de productos (consultar_catalogo)
 * 3. Precios y disponibilidad (consultar_precios_disponibilidad)
 * 4. Horarios de atención (consultar_horarios)
 * 5. Zonas de cobertura (consultar_zonas_cobertura)
 * 6. Tarifas de entrega (cotizar_tarifa)
 * 7. Información de servicios (consultar_servicios)
 * 8. Estado de pedidos (consultar_estado_pedido)
 * 9. Esquema de Tool Calling compatible con LLMs (getToolDefinitions)
 * 10. Contexto en tiempo real anti-alucinaciones (getRealDataContextPrompt)
 * 11. Ejecución del asistente con invocación automática de herramientas
 */

import {
  executeTool,
  getToolDefinitions,
  getRealDataContextPrompt,
  TROPIGO_TOOLS,
} from "../src/lib/ai/tools";
import { LocalSimulatorAdapter } from "../src/lib/ai/adapters/local-simulator";

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    totalPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    totalFailed++;
  }
}

async function runRealDataToolsTests() {
  console.log("===============================================================");
  console.log("🧪 PRUEBAS DE HERRAMIENTAS INTERNAS CONECTADAS A LA BD DE TROPIGO");
  console.log("===============================================================\n");

  try {
    // -------------------------------------------------------------
    // 1. COMERCIOS REGISTRADOS (consultar_comercios)
    // -------------------------------------------------------------
    console.log("🏪 [1/11] Probando herramienta 'consultar_comercios'...");
    const resComercios = await executeTool("consultar_comercios", { soloAbiertos: true });
    assert(resComercios.encontrados > 0, "Encuentra comercios abiertos en la base de datos.");
    const pahuichi = resComercios.comercios?.find((c: any) => c.nombre.includes("Pahuichi"));
    assert(Boolean(pahuichi), "Encuentra a Pollería El Pahuichi con datos reales.");
    assert(Boolean(pahuichi?.categoria.includes("Pollería")), "Categoría correcta obtenida de la base de datos.");
    assert(Boolean(pahuichi?.direccion), "Dirección física real incluida en el resultado.");

    const resComerciosFiltro = await executeTool("consultar_comercios", { buscar: "Julia" });
    assert(
      Boolean(resComerciosFiltro.comercios?.some((c: any) => c.nombre.includes("Doña Julia"))),
      "Filtro de búsqueda por nombre encuentra a Comidas Doña Julia."
    );

    // -------------------------------------------------------------
    // 2. CATÁLOGO DE PRODUCTOS (consultar_catalogo)
    // -------------------------------------------------------------
    console.log("\n🍗 [2/11] Probando herramienta 'consultar_catalogo'...");
    const resCatalogo = await executeTool("consultar_catalogo", { comercio: "Pahuichi" });
    assert(resCatalogo.total > 0, "Obtiene platos del menú de Pollería El Pahuichi.");
    const platoBroaster = resCatalogo.productos?.find((p: any) => p.nombre.includes("Broaster"));
    assert(Boolean(platoBroaster), "Encuentra el Cuarto de Pollo a la Broaster.");
    assert(Boolean(platoBroaster?.precioBs === 18.0), "Precio exacto en Bolivianos verificado: 18.00 Bs.");
    assert(Boolean(platoBroaster?.disponible === true), "Disponibilidad en cocina confirmada.");

    // Búsqueda cruzada de platos
    const resBusquedaPlatos = await executeTool("consultar_catalogo", { buscar: "majadito" });
    assert(
      Boolean(resBusquedaPlatos.productos?.some((p: any) => p.nombre.toLowerCase().includes("majadito"))),
      "Búsqueda por término 'majadito' localiza el plato en Comidas Doña Julia."
    );

    // -------------------------------------------------------------
    // 3. PRECIOS Y DISPONIBILIDAD (consultar_precios_disponibilidad)
    // -------------------------------------------------------------
    console.log("\n💰 [3/11] Probando herramienta 'consultar_precios_disponibilidad'...");
    const resPrecio = await executeTool("consultar_precios_disponibilidad", {
      producto: "Cuarto de Pollo a la Broaster",
    });
    assert(resPrecio.encontrado === true, "Plato encontrado en la base de datos.");
    assert(resPrecio.resultados[0].precioBaseBs === 18.0, "Precio base verificado: 18.00 Bs.");
    assert(resPrecio.resultados[0].variantes.length > 0, "Retorna las variantes de corte (Pierna / Pecho).");
    assert(resPrecio.resultados[0].guarnicionesOpciones.length > 0, "Retorna guarniciones y adicionales oficiales.");

    // Anti-alucinación: consultar producto inexistente
    const resInexistente = await executeTool("consultar_precios_disponibilidad", {
      producto: "Sushi de Langosta Roll",
    });
    assert(resInexistente.encontrado === false, "Producto inventado o inexistente es rechazado con encontrado=false.");
    assert(
      resInexistente.mensaje.includes("No inventes precios"),
      "Instruye al modelo a no inventar precios ni confirmar órdenes inexistentes."
    );

    // -------------------------------------------------------------
    // 4. HORARIOS DE ATENCIÓN (consultar_horarios)
    // -------------------------------------------------------------
    console.log("\n⏰ [4/11] Probando herramienta 'consultar_horarios'...");
    const resHorario = await executeTool("consultar_horarios", { comercio: "El Pahuichi" });
    assert(resHorario.encontrado === true, "Horario de Pollería El Pahuichi localizado.");
    assert(Boolean(resHorario.horaActualBolivia), "Calcula la hora local exacta de Bolivia (America/La_Paz UTC-4).");
    assert(resHorario.horarioSemanalCompleto.length === 7, "Contiene el horario de los 7 días de la semana.");
    assert(typeof resHorario.abiertoAhora === "boolean", "Calcula booleanamente si está abierto o cerrado en este momento.");

    const resHorarioInexistente = await executeTool("consultar_horarios", { comercio: "Restaurante Fantasma" });
    assert(resHorarioInexistente.encontrado === false, "Comercio no registrado devuelve encontrado=false.");

    // -------------------------------------------------------------
    // 5. ZONAS DE COBERTURA (consultar_zonas_cobertura)
    // -------------------------------------------------------------
    console.log("\n🗺️ [5/11] Probando herramienta 'consultar_zonas_cobertura'...");
    const resZonas = await executeTool("consultar_zonas_cobertura", {});
    assert(resZonas.total >= 4, "Obtiene las zonas activas de Ivirgarzama de la base de datos.");
    const zonaVilla14 = resZonas.zonas?.find((z: any) => z.nombre === "Villa 14");
    assert(Boolean(zonaVilla14), "Zona periurbana Villa 14 presente.");
    assert(Boolean(zonaVilla14?.tarifaBaseDeliveryBs === 8.0), "Tarifa de delivery a Villa 14 verificada: 8.00 Bs.");

    const resFiltroZona = await executeTool("consultar_zonas_cobertura", { buscar: "Senda III" });
    assert(
      Boolean(resFiltroZona.zonas?.some((z: any) => z.nombre.includes("Senda"))),
      "Filtro por nombre localiza la zona comunitaria Senda III."
    );

    // -------------------------------------------------------------
    // 6. TARIFAS DE ENTREGA Y COTIZACIÓN (cotizar_tarifa)
    // -------------------------------------------------------------
    console.log("\n🛵 [6/11] Probando herramienta 'cotizar_tarifa'...");
    // A) Delivery Casco Central
    const cotizacionCentral = await executeTool("cotizar_tarifa", {
      tipo: "DELIVERY",
      destino: "Plaza Principal / Casco Central",
    });
    assert(cotizacionCentral.tarifaBs === 5.0, "Tarifa de delivery en Casco Central es 5.00 Bs.");
    assert(cotizacionCentral.metodosPagoPermitidos.length > 0, "Retorna métodos de pago autorizados (Efectivo y QR).");

    // B) Delivery Villa 14
    const cotizacionVilla14 = await executeTool("cotizar_tarifa", {
      tipo: "DELIVERY",
      destino: "Barrio Villa 14, pasando el puente",
    });
    assert(cotizacionVilla14.tarifaBs === 8.0, "Tarifa de delivery en Villa 14 es 8.00 Bs.");

    // C) Delivery Senda III
    const cotizacionSenda3 = await executeTool("cotizar_tarifa", {
      tipo: "DELIVERY",
      destino: "Senda III carretera troncal",
    });
    assert(cotizacionSenda3.tarifaBs === 10.0, "Tarifa de delivery a Senda III es 10.00 Bs.");

    // D) Mototaxi Individual Casco Central
    const cotizacionMoto = await executeTool("cotizar_tarifa", {
      tipo: "MOTOTAXI",
      destino: "Mercado Central",
      vehiculo: "MOTO",
    });
    assert(cotizacionMoto.tarifaBs === 4.0, "Tarifa de mototaxi individual en zona urbana es 4.00 Bs.");

    // E) Torito Trimóvil (con recargo de 1 Bs por capacidad)
    const cotizacionTorito = await executeTool("cotizar_tarifa", {
      tipo: "MOTOTAXI",
      destino: "Mercado Central",
      vehiculo: "TORITO",
    });
    assert(cotizacionTorito.tarifaBs === 5.0, "Tarifa de Torito Trimóvil es 5.00 Bs.");

    // -------------------------------------------------------------
    // 7. INFORMACIÓN DE SERVICIOS (consultar_servicios)
    // -------------------------------------------------------------
    console.log("\n📋 [7/11] Probando herramienta 'consultar_servicios'...");
    const resServicios = await executeTool("consultar_servicios", {});
    assert(resServicios.total >= 4, "Retorna los servicios oficiales de TropiGO.");
    const servicioMandados = resServicios.servicios?.find((s: any) => s.nombre.includes("Mandados"));
    assert(Boolean(servicioMandados), "Servicio de Mandados Express incluido con tarifa base.");
    const servicioMototaxi = resServicios.servicios?.find((s: any) => s.nombre.includes("Mototaxi"));
    assert(Boolean(servicioMototaxi), "Servicio de Mototaxis incluido con tarifa base.");

    const resFiltroServicio = await executeTool("consultar_servicios", { servicio: "torito" });
    assert(
      Boolean(resFiltroServicio.servicios?.some((s: any) => s.nombre.toLowerCase().includes("torito"))),
      "Filtro por 'torito' retorna la información del trimóvil para pasajeros."
    );

    // -------------------------------------------------------------
    // 8. ESTADO DE PEDIDOS (consultar_estado_pedido)
    // -------------------------------------------------------------
    console.log("\n🔎 [8/11] Probando herramienta 'consultar_estado_pedido'...");
    // A) Pedido de delivery TRP-1041
    const resPedido = await executeTool("consultar_estado_pedido", { codigo: "TRP-1041" });
    assert(resPedido.encontrado === true, "Encuentra el pedido de demostración TRP-1041.");
    assert(resPedido.estadoInterno === "EN_PREPARACION", "Estado en vivo del pedido verificado: EN_PREPARACION.");
    assert(resPedido.totalBs === 41.0, "Total del pedido verificado en 41.00 Bs.");
    assert(resPedido.comercio.includes("Pahuichi"), "Comercio emisor verificado en el pedido.");

    // B) Carrera de mototaxi VIAJE-2001
    const resViaje = await executeTool("consultar_estado_pedido", { codigo: "VIAJE-2001" });
    assert(resViaje.encontrado === true, "Encuentra la carrera de mototaxi VIAJE-2001.");
    assert(resViaje.estadoInterno === "CONDUCTOR_ASIGNADO", "Estado de la carrera verificado: CONDUCTOR_ASIGNADO.");
    assert(resViaje.vehiculo === "Torito Trimóvil", "Vehículo identificado como Torito Trimóvil.");

    // C) Pedido inexistente
    const resPedidoInexistente = await executeTool("consultar_estado_pedido", { codigo: "TRP-9999" });
    assert(resPedidoInexistente.encontrado === false, "Pedido inexistente retorna encontrado=false sin inventar datos.");

    // -------------------------------------------------------------
    // 9. ESQUEMA DE TOOL CALLING PARA MODELOS LLM (getToolDefinitions)
    // -------------------------------------------------------------
    console.log("\n📐 [9/11] Verificando especificación JSON Schema para OpenAI / Groq / Gemini...");
    const definitions = getToolDefinitions();
    assert(definitions.length === 8, "El catálogo exporta exactamente las 8 herramientas internas requeridas.");
    
    const requiredTools = [
      "consultar_comercios",
      "consultar_catalogo",
      "consultar_precios_disponibilidad",
      "consultar_horarios",
      "consultar_zonas_cobertura",
      "cotizar_tarifa",
      "consultar_servicios",
      "consultar_estado_pedido",
    ];

    for (const name of requiredTools) {
      const found = definitions.find((d) => d.function.name === name);
      assert(Boolean(found), `Herramienta '${name}' cumple con la especificación JSON Schema.`);
    }

    // -------------------------------------------------------------
    // 10. CONTEXTO EN TIEMPO REAL ANTI-ALUCINACIONES (getRealDataContextPrompt)
    // -------------------------------------------------------------
    console.log("\n🧠 [10/11] Verificando generación de contexto en tiempo real anti-alucinaciones...");
    const realContext = await getRealDataContextPrompt();
    assert(realContext.includes("DATOS OFICIALES EN VIVO DE TROPIGO"), "Encabezado oficial generado.");
    assert(realContext.includes("El Pahuichi") || realContext.includes("Doña Julia"), "Comercios reales de Ivirgarzama inyectados.");
    assert(realContext.includes("Bs."), "Moneda Bolivianos confirmada en el contexto.");
    assert(realContext.includes("Casco Central") || realContext.includes("Villa 14"), "Zonas de cobertura reales inyectadas.");
    assert(realContext.includes("NUNCA inventes"), "Regla estricta de no alucinación presente en el prompt.");

    // -------------------------------------------------------------
    // 11. ASISTENTE LOCAL EJECUTANDO HERRAMIENTAS REALES
    // -------------------------------------------------------------
    console.log("\n🤖 [11/11] Verificando que el Asistente invoca y responde con datos reales de la BD...");
    const simulator = new LocalSimulatorAdapter();

    // A) Preguntar por precios de comida
    const responsePrecio = await simulator.generateText([
      { role: "user", content: "¿Cuánto cuesta el cuarto de pollo a la broaster?" },
    ]);
    assert(responsePrecio.content.includes("18.00 Bs"), "El asistente responde con el precio real de 18.00 Bs. desde la BD.");
    assert(Boolean(responsePrecio.toolCalls), "El asistente registró la llamada a la herramienta interna.");
    assert(
      responsePrecio.toolCalls?.[0].tool === "consultar_precios_disponibilidad",
      "Herramienta 'consultar_precios_disponibilidad' fue ejecutada automáticamente."
    );

    // B) Preguntar por tarifas a Villa 14
    const responseTarifa = await simulator.generateText([
      { role: "user", content: "¿Cuánto cuesta el delivery hacia Villa 14?" },
    ]);
    assert(responseTarifa.content.includes("8.00 Bs"), "El asistente cotiza la tarifa real de 8.00 Bs. para Villa 14.");
    assert(
      responseTarifa.toolCalls?.[0].tool === "cotizar_tarifa",
      "Herramienta 'cotizar_tarifa' fue ejecutada automáticamente."
    );

    // C) Preguntar por estado de orden TRP-1041
    const responseEstado = await simulator.generateText([
      { role: "user", content: "¿Cómo va mi pedido TRP-1041?" },
    ]);
    assert(
      responseEstado.content.includes("EN_PREPARACION") || responseEstado.content.includes("preparación"),
      "El asistente consulta y responde el estado real del pedido TRP-1041 desde la BD."
    );

  } catch (error: any) {
    console.error("❌ Excepción no controlada durante las pruebas de herramientas:", error);
    totalFailed++;
  } finally {
    console.log("\n===============================================================");
    console.log(`📋 RESULTADOS FINALES: ${totalPassed} superadas, ${totalFailed} fallidas`);
    console.log("===============================================================\n");

    if (totalFailed > 0) {
      process.exit(1);
    }
  }
}

runRealDataToolsTests();
