const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCurrentStreak, resolveTimeZone } = require('../src/utils/activityStreak');

const now = new Date('2026-10-22T10:00:00.000Z');
const problem = (solvedAt, platform = 'LeetCode') => ({ solvedAt: new Date(solvedAt), platform });

test('counts consecutive active calendar days and ignores duplicate records on the same day', () => {
  const records = [
    problem('2026-10-20T09:00:00.000Z'),
    problem('2026-10-21T09:00:00.000Z', 'Codeforces'),
    problem('2026-10-21T10:00:00.000Z', 'Codeforces'),
    problem('2026-10-22T09:00:00.000Z', 'Other'),
  ];
  assert.equal(buildCurrentStreak(records, now, 'Asia/Kolkata'), 3);
});

test('resets after a missed day when activity resumes later', () => {
  const records = [
    problem('2026-10-20T09:00:00.000Z'),
    problem('2026-10-22T09:00:00.000Z'),
  ];
  assert.equal(buildCurrentStreak(records, now, 'Asia/Kolkata'), 1);
});

test('returns zero after a missed day if there is no activity today or yesterday', () => {
  assert.equal(buildCurrentStreak([problem('2026-10-20T09:00:00.000Z')], now, 'Asia/Kolkata'), 0);
});

test('keeps yesterday streak active until the current day is missed', () => {
  const records = [
    problem('2026-10-20T09:00:00.000Z'),
    problem('2026-10-21T09:00:00.000Z'),
  ];
  assert.equal(buildCurrentStreak(records, now, 'Asia/Kolkata'), 2);
});

test('uses UTC for invalid time-zone identifiers', () => {
  assert.equal(resolveTimeZone('not/a-timezone'), 'UTC');
  assert.equal(resolveTimeZone('Asia/Kolkata'), 'Asia/Kolkata');
});
