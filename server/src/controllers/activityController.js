const Problem = require("../models/Problem");
const { buildRollingActivityCalendar } = require("../utils/activityCalendar");

const PLATFORM_ALIASES = {
  leetcode: { label: "LeetCode", names: ["LeetCode"] },
  codeforces: { label: "Codeforces", names: ["Codeforces"] },
  atcoder: { label: "AtCoder", names: ["AtCoder"] },
  codewars: { label: "Codewars", names: ["Codewars", "CodeWars"] },
  geeksforgeeks: { label: "GeeksforGeeks", names: ["GeeksforGeeks"] },
  hackerrank: { label: "HackerRank", names: ["HackerRank"] },
};

const normalizePlatform = (value) =>
  String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function getProviderState(user, platformId) {
  const providers = user?.integrations?.providers;
  if (providers && typeof providers.get === "function") return providers.get(platformId) || null;
  return providers?.[platformId] || null;
}

function getProfileCalendar(state, now = new Date()) {
  if (!state || !["verified", "public"].includes(state.mode) || !String(state.username || "").trim()) return null;
  const stats = state.stats || {};
  if (!Array.isArray(stats.activityCalendar) || !stats.activityCalendarSource) return null;

  const countByDate = {};
  for (const item of stats.activityCalendar) {
    const date = String(item?.date || "");
    const count = Number(item?.count);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(count) && count >= 0) {
      countByDate[date] = count;
    }
  }

  const calendar = buildRollingActivityCalendar(countByDate, now, 365);
  const total = calendar.days.reduce((sum, day) => sum + day.count, 0);
  const labels = {
    "leetcode-profile": { sourceLabel: "LeetCode public profile submissions", activityLabel: "submissions" },
    "codeforces-api": { sourceLabel: "Codeforces public submission history", activityLabel: "submissions" },
    "atcoder-api": { sourceLabel: "AtCoder public submission history", activityLabel: "submissions" },
    "codewars-api": { sourceLabel: "Codewars completed challenges", activityLabel: "completed challenges" },
  };
  const display = labels[stats.activityCalendarSource] || {
    sourceLabel: `${PLATFORM_ALIASES[normalizePlatform(state?.platform)]?.label || "Platform"} activity calendar`,
    activityLabel: stats.activityLabel || "activity events",
  };

  return {
    ...calendar,
    total,
    source: "platform-profile",
    sourceLabel: display.sourceLabel,
    activityLabel: stats.activityLabel || display.activityLabel,
    coverageComplete: stats.activityCalendarCoverageComplete !== false,
    lastSyncedAt: state.lastSyncedAt || stats.activityCalendarFetchedAt || null,
    officialProfileSource: true,
  };
}

const getHeatmap = async (req, res) => {
  try {
    const platformId = normalizePlatform(req.query.platform);
    const platform = PLATFORM_ALIASES[platformId];

    if (!platform) {
      return res.status(400).json({
        success: false,
        message: "Select one supported platform to load isolated contribution activity.",
      });
    }

    const state = getProviderState(req.user, platformId);
    const profileCalendar = getProfileCalendar(state);
    if (profileCalendar) {
      return res.json({
        success: true,
        platform: platform.label,
        days: profileCalendar.days,
        total: profileCalendar.total,
        source: profileCalendar.source,
        sourceLabel: profileCalendar.sourceLabel,
        activityLabel: profileCalendar.activityLabel,
        coverageComplete: profileCalendar.coverageComplete,
        lastSyncedAt: profileCalendar.lastSyncedAt,
        officialProfileSource: true,
      });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - 364);

    const rows = await Problem.aggregate([
      {
        $match: {
          user: req.user._id,
          platform: { $in: platform.names },
          origin: { $in: ["manual", "imported", "verified-sync", "public-profile"] },
          solvedAt: { $gte: start },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$solvedAt",
              timezone: "UTC",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const byDay = Object.fromEntries(rows.map((row) => [row._id, row.count]));
    const calendar = buildRollingActivityCalendar(byDay, new Date(), 365);
    return res.json({
      success: true,
      platform: platform.label,
      days: calendar.days,
      total: calendar.days.reduce((sum, day) => sum + day.count, 0),
      source: "devtracker-records",
      sourceLabel: "DevTracker saved problem records",
      activityLabel: "logged records",
      coverageComplete: true,
      lastSyncedAt: null,
      officialProfileSource: false,
    });
  } catch (error) {
    console.error("Activity heatmap error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not load platform contribution activity.",
    });
  }
};

module.exports = { getHeatmap, getProfileCalendar };
