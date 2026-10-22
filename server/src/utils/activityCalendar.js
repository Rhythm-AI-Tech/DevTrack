const DAY_MS = 24 * 60 * 60 * 1000;

function utcDateKey(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function epochDateKey(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  const milliseconds = timestamp > 1000000000000 ? timestamp : timestamp * 1000;
  return utcDateKey(new Date(milliseconds));
}

function parseLeetCodeSubmissionCalendar(value) {
  let calendar = value;
  if (typeof calendar === "string") {
    try { calendar = JSON.parse(calendar); } catch { return {}; }
  }
  if (!calendar || typeof calendar !== "object" || Array.isArray(calendar)) return {};

  const counts = {};
  for (const [rawKey, rawCount] of Object.entries(calendar)) {
    const key = String(rawKey);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : epochDateKey(key);
    const count = Number(rawCount);
    if (!date || !Number.isFinite(count) || count < 0) continue;
    counts[date] = (counts[date] || 0) + count;
  }
  return counts;
}

function countSubmissionsByDay(submissions, timestampField) {
  const counts = {};
  for (const submission of Array.isArray(submissions) ? submissions : []) {
    const date = epochDateKey(submission?.[timestampField]);
    if (date) counts[date] = (counts[date] || 0) + 1;
  }
  return counts;
}

function mergeDailyCounts(...sources) {
  const merged = {};
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const [date, rawCount] of Object.entries(source)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const count = Number(rawCount);
      if (Number.isFinite(count) && count >= 0) merged[date] = (merged[date] || 0) + count;
    }
  }
  return merged;
}

function buildRollingActivityCalendar(counts, now = new Date(), days = 365) {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startKey = utcDateKey(start);
  const endKey = utcDateKey(today);
  const dailyCounts = counts && typeof counts === "object" ? counts : {};
  const output = [];

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + offset);
    const date = utcDateKey(day);
    const value = Number(dailyCounts[date]) || 0;
    output.push({ date, count: Math.max(0, value) });
  }

  return { days: output, startDate: startKey, endDate: endKey };
}

function trimDailyCounts(counts, now = new Date(), days = 365) {
  const calendar = buildRollingActivityCalendar(counts, now, days);
  const trimmed = {};
  for (const day of calendar.days) {
    if (day.count > 0) trimmed[day.date] = day.count;
  }
  return trimmed;
}

module.exports = {
  DAY_MS,
  utcDateKey,
  epochDateKey,
  parseLeetCodeSubmissionCalendar,
  countSubmissionsByDay,
  mergeDailyCounts,
  buildRollingActivityCalendar,
  trimDailyCounts,
};
