function localDateKey(value) {
  if (!value) return null;

  // The Coding page stores date-only strings as YYYY-MM-DD.
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function todayKey() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function shiftDay(dateKey, amount) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);

  date.setDate(date.getDate() + amount);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function getProblemsThisWeek(problems) {
  const now = new Date();
  const start = new Date(now);

  // Sunday-based week, consistent with the previous DevTrack behavior.
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);

  const startKey = localDateKey(start);
  const endKey = todayKey();

  return problems.filter((problem) => {
    const key = localDateKey(problem.solvedAt);

    return key && key >= startKey && key <= endKey;
  });
}

export function getCurrentStreak(problems) {
  const solvedDays = new Set(
    problems
      .map((problem) => localDateKey(problem.solvedAt))
      .filter(Boolean)
  );

  if (solvedDays.size === 0) {
    return 0;
  }

  const today = todayKey();

  let cursor = solvedDays.has(today)
    ? today
    : shiftDay(today, -1);

  if (!solvedDays.has(cursor)) {
    return 0;
  }

  let streak = 0;

  while (solvedDays.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }

  return streak;
}