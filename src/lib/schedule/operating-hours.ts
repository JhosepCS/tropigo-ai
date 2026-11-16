import { getAssistantConfig, WeekdayKey, DaySchedule } from "../ai/config-manager";

const DAY_MAP: Record<number, WeekdayKey> = {
  0: "domingo",
  1: "lunes",
  2: "martes",
  3: "miercoles",
  4: "jueves",
  5: "viernes",
  6: "sabado",
};

export interface OperatingHoursCheck {
  isOpen: boolean;
  currentDay: WeekdayKey;
  currentTimeStr: string;
  offHoursPolicy: "TAKE_MESSAGE" | "CONTINUE_AND_BOOK";
  nextOpenDay?: WeekdayKey;
  nextOpenTime?: string;
  message: string;
}

/**
 * Verifica si el negocio se encuentra dentro del horario de atención
 * configurado, utilizando la hora oficial de Bolivia (UTC-4).
 */
export async function checkOperatingHours(): Promise<OperatingHoursCheck> {
  const config = await getAssistantConfig();
  const hours = config.operatingHours || {};
  const policy = config.offHoursPolicy || "TAKE_MESSAGE";

  // Calcular la hora actual en Bolivia (UTC-4)
  const now = new Date();
  const boliviaOffsetMinutes = -4 * 60;
  const boliviaTime = new Date(
    now.getTime() + (boliviaOffsetMinutes - now.getTimezoneOffset()) * 60000
  );

  const dayIndex = boliviaTime.getDay();
  const currentDay = DAY_MAP[dayIndex];
  const currentHour = boliviaTime.getHours();
  const currentMinute = boliviaTime.getMinutes();
  const currentTimeStr = `${currentHour.toString().padStart(2, "0")}:${currentMinute
    .toString()
    .padStart(2, "0")}`;

  const todaySchedule: DaySchedule | null | undefined = hours[currentDay];

  // Si no hay horario configurado para hoy o está explícitamente cerrado
  if (!todaySchedule || todaySchedule.closed) {
    const next = findNextOpenDay(hours, dayIndex);
    return {
      isOpen: false,
      currentDay,
      currentTimeStr,
      offHoursPolicy: policy,
      nextOpenDay: next?.day,
      nextOpenTime: next?.time,
      message: buildOffHoursMessage(currentDay, next?.day, next?.time, policy),
    };
  }

  const { open, close } = todaySchedule;
  const isWithinHours = currentTimeStr >= open && currentTimeStr <= close;

  if (isWithinHours) {
    return {
      isOpen: true,
      currentDay,
      currentTimeStr,
      offHoursPolicy: policy,
      message: "",
    };
  }

  // Si está fuera de horario, buscar el próximo horario de apertura
  const next = findNextOpenDay(hours, dayIndex, currentTimeStr);
  return {
    isOpen: false,
    currentDay,
    currentTimeStr,
    offHoursPolicy: policy,
    nextOpenDay: next?.day,
    nextOpenTime: next?.time,
    message: buildOffHoursMessage(currentDay, next?.day, next?.time, policy),
  };
}

function findNextOpenDay(
  hours: Record<string, DaySchedule | null | undefined>,
  currentDayIndex: number,
  currentTimeStr?: string
): { day: WeekdayKey; time: string } | null {
  // Primero ver si abre hoy más tarde
  const todayKey = DAY_MAP[currentDayIndex];
  const today = hours[todayKey];
  if (today && !today.closed && currentTimeStr && currentTimeStr < today.open) {
    return { day: todayKey, time: today.open };
  }

  // Buscar en los siguientes 7 días
  for (let i = 1; i <= 7; i++) {
    const nextIndex = (currentDayIndex + i) % 7;
    const nextKey = DAY_MAP[nextIndex];
    const schedule = hours[nextKey];
    if (schedule && !schedule.closed && schedule.open) {
      return { day: nextKey, time: schedule.open };
    }
  }

  return null;
}

function buildOffHoursMessage(
  currentDay: WeekdayKey,
  nextDay?: WeekdayKey,
  nextTime?: string,
  policy: "TAKE_MESSAGE" | "CONTINUE_AND_BOOK" = "TAKE_MESSAGE"
): string {
  const nextInfo =
    nextDay && nextTime
      ? `Estaremos atendiendo de nuevo ${
          nextDay === currentDay ? "hoy" : `el día ${nextDay}`
        } a las *${nextTime}*.`
      : "Te responderemos en cuanto reanudemos la atención.";

  if (policy === "CONTINUE_AND_BOOK") {
    return (
      `🌙 *TropiGO:* En este momento estamos fuera de nuestro horario de atención habitual.\n\n` +
      `⏰ ${nextInfo}\n\n` +
      `De todas formas, puedes dejar los detalles de tu pedido o consulta aquí y un operador o el sistema lo procesará a primera hora. ¡Gracias por tu preferencia! 🌴🛵`
    );
  }

  return (
    `🌙 *¡Hola! En este momento TropiGO se encuentra fuera de horario de atención.*\n\n` +
    `⏰ ${nextInfo}\n\n` +
    `Tu mensaje ha quedado registrado. Si deseas, déjanos tu consulta o pedido y te responderemos con prioridad apenas abramos. ¡Que tengas un excelente descanso! 🌴🛵`
  );
}
