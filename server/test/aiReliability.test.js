const test = require("node:test");
const assert = require("node:assert/strict");
const { buildProgressFallback, extractStatus, generateWithRetry } = require("../src/controllers/aiController");

test("progress fallback summarizes only the supplied saved metrics", () => {
  const context = {
    loggedProblemTotals: {
      last7Days: 3,
      total: 17,
      currentStreakDays: 2,
      difficulty: { Easy: 5, Medium: 8, Hard: 2, Unknown: 2 },
      activityByDayLast7Days: [{ date: "2026-10-20", count: 3 }],
      commonTopics: [{ topic: "Arrays", count: 6 }],
      weeklyProblemTitles: [{ title: "Two Sum", platform: "LeetCode", difficulty: "Easy" }]
    }
  };
  const summary = buildProgressFallback(context);
  assert.match(summary, /last 7 days: 3/);
  assert.match(summary, /Total tracked problems in the loaded snapshot: 17/);
  assert.match(summary, /Arrays \(6\)/);
  assert.match(summary, /Two Sum/);
});

test("status extraction recognizes nested Gemini error payloads", () => {
  assert.equal(extractStatus({ message: '{"error":{"code":503,"status":"UNAVAILABLE"}}' }), 503);
  assert.equal(extractStatus({ status: 429, message: "rate limited" }), 429);
});

test("generateWithRetry makes one request and surfaces transient failures for model fallback", async () => {
  let calls = 0;
  const gemini = { models: { generateContent: async () => {
    calls += 1;
    throw { status: 503, message: "temporarily unavailable" };
  } } };
  await assert.rejects(() => generateWithRetry(gemini, "test-model", [], {}), (error) => error?.status === 503 && error?.message === "temporarily unavailable");
  assert.equal(calls, 1);
});

test("generateWithRetry does not retry non-transient errors", async () => {
  let calls = 0;
  const gemini = { models: { generateContent: async () => {
    calls += 1;
    throw { status: 400, message: "invalid request" };
  } } };
  await assert.rejects(() => generateWithRetry(gemini, "test-model", [], {}));
  assert.equal(calls, 1);
});
