import { prisma } from "../../prisma";
import { IAssistantTool } from "./types";

export const schedulesTool: IAssistantTool = {
  name: "consultar_horarios",
  description:
    "Consulta los horarios oficiales de apertura y cierre de un restaurante o comercio en Ivirgarzama y verifica si está abierto ahora según la hora local de Bolivia (UTC-4).",
  parameters: {
    type: "object",
    properties: {
      comercio: {
        type: "string",
        description: "Nombre del restaurante o comercio (ej: 'El Pahuichi', 'Doña Julia', 'Farmacia Bolivia').",
      },
    },
    required: ["comercio"],
  },
  async execute(args: { comercio: string }) {
    try {
      if (!args.comercio || !args.comercio.trim()) {
        return { error: "Debe indicar el nombre del comercio para consultar sus horarios." };
      }

      const term = args.comercio.trim();
      const merchant = await prisma.merchant.findFirst({
        where: {
          name: { contains: term, mode: "insensitive" },
        },
        include: {
          schedules: {
            orderBy: { dayOfWeek: "asc" },
          },
        },
      });

      if (!merchant) {
        return {
          encontrado: false,
          mensaje: `No se encontró el comercio "${args.comercio}" en los registros oficiales de TropiGO Ivirgarzama.`,
        };
      }

      const cleanMerchantName = merchant.name.replace(/^\[DEMO\]\s*/i, "");

      // -------------------------------------------------------------
      // CÁLCULO DE HORA ACTUAL EN BOLIVIA (America/La_Paz, UTC-4)
      // -------------------------------------------------------------
      const now = new Date();
      const boliviaDateString = now.toLocaleString("en-US", { timeZone: "America/La_Paz" });
      const boliviaDate = new Date(boliviaDateString);

      const dayOfWeek = boliviaDate.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
      const currentHours = String(boliviaDate.getHours()).padStart(2, "0");
      const currentMinutes = String(boliviaDate.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      const daysMap = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      const currentDayName = daysMap[dayOfWeek];

      // Buscar horario del día actual en la base de datos
      const todaySchedule = merchant.schedules.find((s) => s.dayOfWeek === dayOfWeek);

      let estaAbiertoSegunHorario = false;
      let horarioHoyTexto = "Sin horario específico registrado para hoy";

      if (todaySchedule && !todaySchedule.isClosed) {
        horarioHoyTexto = `${todaySchedule.openTime} a ${todaySchedule.closeTime}`;
        if (currentTimeStr >= todaySchedule.openTime && currentTimeStr <= todaySchedule.closeTime) {
          estaAbiertoSegunHorario = true;
        }
      } else if (todaySchedule?.isClosed) {
        horarioHoyTexto = "Cerrado todo el día";
      }

      // Si el comercio tiene interruptor manual isOpen = false, está cerrado aunque el horario diga abierto
      const abiertoReal = merchant.isOpen && (merchant.schedules.length === 0 || estaAbiertoSegunHorario);

      const horarioSemanal = merchant.schedules.map((s) => ({
        dia: daysMap[s.dayOfWeek],
        diaNumero: s.dayOfWeek,
        abierto: !s.isClosed,
        apertura: s.openTime,
        cierre: s.closeTime,
      }));

      return {
        encontrado: true,
        comercio: cleanMerchantName,
        abiertoAhora: abiertoReal,
        interruptorManualAbierto: merchant.isOpen,
        horaActualBolivia: `${currentTimeStr} (${currentDayName})`,
        horarioHoy: horarioHoyTexto,
        horarioSemanalCompleto: horarioSemanal,
        mensaje: abiertoReal
          ? `🟢 ${cleanMerchantName} se encuentra ABIERTO ahora en Ivirgarzama (Horario de hoy ${currentDayName}: ${horarioHoyTexto}).`
          : `🔴 ${cleanMerchantName} se encuentra CERRADO en este momento (Horario de hoy ${currentDayName}: ${horarioHoyTexto}).`,
      };
    } catch (err: any) {
      console.error("[Tool: consultar_horarios] Error:", err);
      return {
        error: `Error al consultar horarios del comercio: ${err.message}`,
      };
    }
  },
};
