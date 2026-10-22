const formatterCache = new Map();

function resolveTimeZone(value) {
  const requested = typeof value === "string" ? value.trim() : "";
  if (!requested || requested.length > 100) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: requested });
    return requested;
  } catch {
    return "UTC";
  }
}

function getFormatter(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    );
  }
  return formatterCache.get(timeZone);
}

function dayKeyInTimeZone(value, timeZone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = getFormatter(timeZone).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDayKey(key, offset) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

/**
 * Count consecutive calendar days with at least one saved activity record.
 * Any platform counts; duplicate records on the same date count as one day.
 * If today is not active yet, yesterday's streak remains active through today.
 */
function buildCurrentStreak(activityProblems, now = new Date(), timeZone = "UTC") {
  const activeDates = new Set();
  for (const problem of Array.isArray(activityProblems) ? activityProblems : []) {
    const dateKey = problem?.solvedAt
      ? dayKeyInTimeZone(problem.solvedAt, timeZone)
      : null;
    if (dateKey) activeDates.add(dateKey);
  }

  const todayKey = dayKeyInTimeZone(now, timeZone);
  if (!todayKey) return 0;

  let cursor = activeDates.has(todayKey) ? todayKey : shiftDayKey(todayKey, -1);
  if (!activeDates.has(cursor)) return 0;

  let streak = 0;
  while (activeDates.has(cursor)) {
    streak += 1;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}

module.exports = { resolveTimeZone, dayKeyInTimeZone, buildCurrentStreak };
