const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseLeetCodeSubmissionCalendar,
  countSubmissionsByDay,
  buildRollingActivityCalendar,
  mergeDailyCounts,
} = require("../src/utils/activityCalendar");

test("parses LeetCode JSON Unix timestamp calendar into UTC calendar dates", () => {
  const timestamp = Math.floor(Date.parse("2026-10-21T00:00:00Z") / 1000);
  const counts = parseLeetCodeSubmissionCalendar(JSON.stringify({ [timestamp]: 4 }));
  assert.equal(counts["2026-10-21"], 4);
});

test("counts every external submission, not only unique accepted problems", () => {
  const timestamp = Math.floor(Date.parse("2026-10-20T12:30:00Z") / 1000);
  const counts = countSubmissionsByDay([
    { creationTimeSeconds: timestamp },
    { creationTimeSeconds: timestamp + 900 },
    { creationTimeSeconds: timestamp + 1900 },
  ], "creationTimeSeconds");
  assert.equal(counts["2026-10-20"], 3);
});

test("rolling calendar has one ordered day per date and includes today", () => {
  const now = new Date("2026-10-22T15:00:00Z");
  const result = buildRollingActivityCalendar({ "2026-10-22": 5 }, now, 365);
  assert.equal(result.days.length, 365);
  assert.equal(result.startDate, "2025-10-23");
  assert.equal(result.endDate, "2026-10-22");
  assert.equal(result.days[364].date, "2026-10-22");
  assert.equal(result.days[364].count, 5);
  assert.equal(result.days[0].count, 0);
});

test("combines years without losing or duplicating date counts", () => {
  const merged = mergeDailyCounts(
    { "2025-12-31": 2, "2026-01-01": 1 },
    { "2025-12-31": 3, "2026-01-02": 4 }
  );
  assert.deepEqual(merged, { "2025-12-31": 5, "2026-01-01": 1, "2026-01-02": 4 });
});
