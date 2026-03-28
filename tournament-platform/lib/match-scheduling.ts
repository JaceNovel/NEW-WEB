const MATCH_SLOT_INTERVAL_MINUTES = 15;
const MATCH_START_HOUR_UTC = 21;
const MATCH_LOOKAHEAD_DAYS = 60;

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
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), MATCH_START_HOUR_UTC, minuteOffset, 0, 0));
}

function ceilToSlotInterval(date: Date) {
  const intervalMs = MATCH_SLOT_INTERVAL_MINUTES * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / intervalMs) * intervalMs);
}

function getNextSchedulingStart(from: Date) {
  const today = startOfUtcDay(from);
  const todayStart = buildSlotDate(today, 0);

  if (!isRestDay(today) && from.getTime() < todayStart.getTime()) {
    return todayStart;
  }

  for (let offset = 1; offset < MATCH_LOOKAHEAD_DAYS; offset += 1) {
    const currentDay = new Date(today.getTime() + offset * 24 * 60 * 60 * 1000);

    if (isRestDay(currentDay)) {
      continue;
    }

    return buildSlotDate(currentDay, 0);
  }

  throw new Error("Aucun début de programmation disponible n'a pu être calculé.");
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

export function getTournamentDisplayDate(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : new Date(date);

  if (value.getUTCHours() >= MATCH_START_HOUR_UTC) {
    return value;
  }

  return new Date(value.getTime() - 24 * 60 * 60 * 1000);
}

export function getScheduledMatchTimezoneLabel() {
  return "GMT";
}

export function computeNextMatchSlot(params: { existingDates?: Array<Date | string>; from?: Date }) {
  const now = params.from ?? new Date();
  const occupiedSlots = new Set(
    (params.existingDates ?? []).map((value) => new Date(value).getTime()).filter((value) => Number.isFinite(value)),
  );

  const today = startOfUtcDay(now);
  const todayStart = buildSlotDate(today, 0);

  let candidate = !isRestDay(today) && now.getTime() >= todayStart.getTime()
    ? ceilToSlotInterval(now)
    : getNextSchedulingStart(now);

  const maxIterations = MATCH_LOOKAHEAD_DAYS * 24 * (60 / MATCH_SLOT_INTERVAL_MINUTES);

  for (let index = 0; index < maxIterations; index += 1) {
    if (candidate.getTime() > now.getTime() && !occupiedSlots.has(candidate.getTime())) {
      return candidate;
    }

    candidate = new Date(candidate.getTime() + MATCH_SLOT_INTERVAL_MINUTES * 60 * 1000);
  }

  throw new Error("Aucun créneau disponible n'a pu être calculé pour les 60 prochains jours.");
}