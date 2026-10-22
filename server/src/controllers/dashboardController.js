const Problem = require("../models/Problem");
const { getProvider } = require("../services/platformRegistry");

const SUPPORTED_PLATFORM_IDS = [
  "leetcode",
  "codeforces",
  "atcoder",
  "codewars",
  "geeksforgeeks",
  "hackerrank",
];

const normalizePlatform = (value) =>
  String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

function mapPlatformId(platform) {
  const normalized = normalizePlatform(platform);
  if (normalized === "leetcode") return "leetcode";
  if (normalized === "codeforces") return "codeforces";
  if (normalized === "atcoder") return "atcoder";
  if (normalized === "codewars") return "codewars";
  if (normalized === "geeksforgeeks") return "geeksforgeeks";
  if (normalized === "hackerrank") return "hackerrank";
  return normalized;
}

function buildHistoryByPlatform(activityProblems, today) {
  const countsByPlatform = new Map();

  for (const problem of activityProblems) {
    if (!problem.solvedAt || !problem.platform) continue;
    const platformId = mapPlatformId(problem.platform);
    if (!SUPPORTED_PLATFORM_IDS.includes(platformId)) continue;
    const date = dayKey(problem.solvedAt);
    if (!countsByPlatform.has(platformId)) countsByPlatform.set(platformId, new Map());
    const byDate = countsByPlatform.get(platformId);
    byDate.set(date, (byDate.get(date) || 0) + 1);
  }

  const firstDay = new Date(today);
  firstDay.setUTCDate(firstDay.getUTCDate() - 29);
  const output = {};

  for (const platformId of SUPPORTED_PLATFORM_IDS) {
    const byDate = countsByPlatform.get(platformId) || new Map();
    output[platformId] = Array.from({ length: 30 }, (_, offset) => {
      const date = new Date(firstDay);
      date.setUTCDate(date.getUTCDate() + offset);
      const key = dayKey(date);
      return { date: key, count: byDate.get(key) || 0 };
    });
  }

  return output;
}

function buildStreakByPlatform(activityProblems, today) {
  const datesByPlatform = new Map();

  for (const problem of activityProblems) {
    if (!problem.solvedAt || !problem.platform) continue;
    const platformId = mapPlatformId(problem.platform);
    if (!SUPPORTED_PLATFORM_IDS.includes(platformId)) continue;
    if (!datesByPlatform.has(platformId)) datesByPlatform.set(platformId, new Set());
    datesByPlatform.get(platformId).add(dayKey(problem.solvedAt));
  }

  const output = {};
  for (const platformId of SUPPORTED_PLATFORM_IDS) {
    const dates = datesByPlatform.get(platformId) || new Set();
    const cursor = new Date(today);
    if (!dates.has(dayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
    let streak = 0;
    while (dates.has(dayKey(cursor))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    output[platformId] = streak;
  }
  return output;
}

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const manualProblems = await Problem.find({
      user: userId,
      origin: "manual",
    })
      .select("title solvedAt difficulty platform notes problemUrl markedForRevision topics")
      .sort({ solvedAt: -1, createdAt: -1 })
      .lean();

    const activityProblems = await Problem.find({
      user: userId,
      origin: { $in: ["manual", "imported", "verified-sync", "public-profile"] },
    })
      .select("solvedAt platform")
      .lean();

    const providerMap = req.user.integrations?.providers;
    const providerEntries =
      providerMap && typeof providerMap.entries === "function"
        ? Array.from(providerMap.entries())
        : Object.entries(providerMap || {});

    const verifiedPlatforms = providerEntries
      .filter(([id, state]) => {
        const modeIsLinked = ["verified", "public"].includes(state?.mode);
        const username = String(state?.username || "").trim();
        return (
          SUPPORTED_PLATFORM_IDS.includes(mapPlatformId(id)) &&
          modeIsLinked &&
          Boolean(username)
        );
      })
      .map(([id, state]) => {
        const platformId = mapPlatformId(id);
        const provider = getProvider(platformId);
        const username = String(state.username || "").trim();
        return {
          id: platformId,
          name: provider?.name || platformId,
          mode: state.mode,
          username,
          profileUrl: provider?.profileUrl
            ? `${provider.profileUrl}${encodeURIComponent(username)}`
            : "",
          stats: state.stats || {},
          verifiedAt: state.verifiedAt || null,
          lastSyncedAt: state.lastSyncedAt || null,
          lastSyncError: state.lastSyncError || "",
          metricsAvailable: state.stats?.metricsAvailable !== false,
        };
      });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const activityHistoryByPlatform = buildHistoryByPlatform(activityProblems, today);
    const currentStreakByPlatform = buildStreakByPlatform(activityProblems, today);

    const recentProblems = manualProblems.slice(0, 6);
    const difficultyStats = manualProblems.reduce(
      (counts, problem) => {
        const key = ["Easy", "Medium", "Hard", "Unknown"].includes(problem.difficulty)
          ? problem.difficulty
          : "Unknown";
        counts[key] += 1;
        return counts;
      },
      { Easy: 0, Medium: 0, Hard: 0, Unknown: 0 }
    );

    return res.status(200).json({
      success: true,
      stats: {
        manualTrackedTotal: manualProblems.length,
        manualDifficultyStats: difficultyStats,
        recentProblems,
        verifiedPlatforms,
        activityHistoryByPlatform,
        currentStreakByPlatform,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics.",
    });
  }
};

module.exports = { getDashboardStats };
