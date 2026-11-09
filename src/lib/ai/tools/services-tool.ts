import { prisma } from "../../prisma";
import { IAssistantTool } from "./types";

export const servicesTool: IAssistantTool = {
  name: "consultar_servicios",
  description:
    "Consulta la información oficial de los servicios que ofrece TropiGO en Ivirgarzama (Delivery de restaurantes, farmacia y abarrotes, mandados express y movilidad en mototaxi/torito).",
  parameters: {
    type: "object",
    properties: {
      servicio: {
        type: "string",
        description: "Nombre del servicio a consultar (ej: 'delivery', 'mandados', 'mototaxi', 'torito', 'farmacia').",
      },
    },
  },
  async execute(args: { servicio?: string }) {
    try {
      // 1. Consultar servicios registrados en base de datos
      const dbServices = await prisma.service.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });

      // 2. Servicios esenciales de la plataforma TropiGO en Ivirgarzama
      const coreServices = [
        {
          id: "srv_delivery_comida",
          nombre: "Delivery de Restaurantes y Comida Criolla",
          descripcion:
            "Envío rápido de pollo a la broaster, almuerzos, pique macho y comida rápida desde restaurantes afiliados de Ivirgarzama.",
          tarifaBaseBs: 5.0,
          tiempoAproximadoMinutos: 25,
          condiciones: "Entrega puerta a puerta en radio urbano y comunidades periféricas.",
        },
        {
          id: "srv_farmacia_abarrotes",
          nombre: "Compras de Farmacia y Abarrotes",
          descripcion:
            "Compra y despacho de medicamentos de venta libre, productos de primeros auxilios y artículos de primera necesidad.",
          tarifaBaseBs: 5.0,
          tiempoAproximadoMinutos: 20,
          condiciones: "No se suministran medicamentos controlados sin receta médica previa.",
        },
        {
          id: "srv_mandados_express",
          nombre: "Mandados y Encomiendas Express",
          descripcion:
            "Diligencias personalizadas, pagos de servicios básicos, retiro de paquetes en terminal y compras específicas.",
          tarifaBaseBs: 7.0,
          tiempoAproximadoMinutos: 25,
          condiciones: "Indicar claramente el encargo y monto estimado en efectivo.",
        },
        {
          id: "srv_mototaxi",
          nombre: "Movilidad en Mototaxi (Individual)",
          descripcion:
            "Traslado rápido y seguro de un pasajero por las principales avenidas y barrios de Ivirgarzama.",
          tarifaBaseBs: 4.0,
          tiempoAproximadoMinutos: 15,
          condiciones: "Capacidad para 1 pasajero.",
        },
        {
          id: "srv_torito_trimovil",
          nombre: "Movilidad en Torito Trimóvil",
          descripcion:
            "Traslado en motocarro techado con capacidad para hasta 3 pasajeros o transporte de víveres y bolsas de mercado.",
          tarifaBaseBs: 5.0,
          tiempoAproximadoMinutos: 20,
          condiciones: "Capacidad para hasta 3 pasajeros o carga moderada.",
        },
      ];

      // Combinar servicios de BD con los servicios core
      const allServices = [
        ...coreServices,
        ...dbServices.map((s) => ({
          id: s.id,
          nombre: s.name,
          descripcion: s.description,
          tarifaBaseBs: s.price,
          tiempoAproximadoMinutos: s.durationMinutes,
          condiciones: s.requiresAssessment ? "Requiere cotización previa" : "Tarifa estándar",
        })),
      ];

      // Filtrar si el usuario especificó un término
      let filtered = allServices;
      if (args.servicio && args.servicio.trim()) {
        const q = args.servicio.trim().toLowerCase();
        filtered = allServices.filter(
          (s) =>
            s.nombre.toLowerCase().includes(q) ||
            s.descripcion.toLowerCase().includes(q) ||
            (q.includes("moto") && s.nombre.toLowerCase().includes("moto")) ||
            (q.includes("tori") && s.nombre.toLowerCase().includes("tori")) ||
            (q.includes("comida") && s.nombre.toLowerCase().includes("comida")) ||
            (q.includes("manda") && s.nombre.toLowerCase().includes("manda"))
        );
      }

      return {
        total: filtered.length,
        servicios: filtered,
        mensaje: `TropiGO ofrece ${filtered.length} servicios oficiales en Ivirgarzama:`,
      };
    } catch (err: any) {
      console.error("[Tool: consultar_servicios] Error:", err);
      return {
        error: `Error al consultar servicios: ${err.message}`,
        servicios: [],
      };
    }
  },
};
