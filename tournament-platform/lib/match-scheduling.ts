const MATCH_SLOT_MINUTES = [0, 15, 30, 45, 60, 75] as const;

const DAY_NAME_MAP: Record<string, number> = {
  sunday: 0,
  dimanche: 0,
  monday: 1,
  lundi: 1,
  tuesday: 2,
  mardi: 2,
  wednesday: 3,
  mercredi: 3,
  thursday: 4,
  jeudi: 4,
  friday: 5,
  vendredi: 5,
  saturday: 6,
  samedi: 6,
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getConfiguredRestDay() {
  const raw = (process.env.MATCH_REST_DAY_UTC ?? "").trim().toLowerCase();

  if (!raw) return 0;

  if (/^[0-6]$/.test(raw)) {
    return Number(raw);
  }

  return DAY_NAME_MAP[raw] ?? 0;
}

export function getConfiguredRestDayLabel() {
  const restDay = getConfiguredRestDay();
  const labels = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  return labels[restDay] ?? labels[0];
}

function isRestDay(date: Date) {
  return date.getUTCDay() === getConfiguredRestDay();
}

function buildSlotDate(day: Date, minuteOffset: number) {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 21, minuteOffset, 0, 0));
}

export function formatScheduledMatchDate(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(value);
}

export function getScheduledMatchTimezoneLabel() {
  return "GMT";
}

export function computeNextMatchSlot(params: { existingDates?: Array<Date | string>; from?: Date }) {
  const now = params.from ?? new Date();
  const occupiedSlots = new Set(
    (params.existingDates ?? []).map((value) => new Date(value).getTime()).filter((value) => Number.isFinite(value)),
  );

  let day = startOfUtcDay(now);

  for (let offset = 0; offset < 60; offset += 1) {
    const currentDay = new Date(day.getTime() + offset * 24 * 60 * 60 * 1000);

    if (isRestDay(currentDay)) {
      continue;
    }

    for (const minuteOffset of MATCH_SLOT_MINUTES) {
      const slot = buildSlotDate(currentDay, minuteOffset);

      if (slot.getTime() <= now.getTime()) {
        continue;
      }

      if (occupiedSlots.has(slot.getTime())) {
        continue;
      }

      return slot;
    }
  }

  throw new Error("Aucun créneau disponible n'a pu être calculé pour les 60 prochains jours.");
}