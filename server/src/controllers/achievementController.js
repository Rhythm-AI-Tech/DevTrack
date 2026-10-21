const Problem = require("../models/Problem");
const Goal = require("../models/Goal");
const Project = require("../models/Project");

const CATALOG = [
  { id: "first-solve", name: "First Steps", description: "Log your first solved problem in DevTrack.", icon: "🚀", target: 1, metric: "trackedProblems" },
  { id: "streak-master", name: "Streak Master", description: "Keep a seven-day coding streak from saved solve activity.", icon: "🔥", target: 7, metric: "currentStreak" },
  { id: "algo-titan", name: "Algo Titan", description: "Reach 100 solved problems on your saved LeetCode profile.", icon: "⚔️", target: 100, metric: "leetcodeSolved" },
  { id: "polyglot", name: "Polyglot", description: "Record solved problems in three different programming languages.", icon: "🌈", target: 3, metric: "languageCount" },
  { id: "platform-explorer", name: "Platform Explorer", description: "Save three connected coding-platform profiles.", icon: "🌐", target: 3, metric: "linkedProfiles" },
  { id: "goal-getter", name: "Goal Getter", description: "Complete a DevTrack study goal.", icon: "🎯", target: 1, metric: "completedGoals" },
  { id: "project-builder", name: "Project Builder", description: "Create a project in your workspace.", icon: "🛠️", target: 1, metric: "projectsCreated" },
];

const normalizePlatform = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function toPlainState(state) {
  return state && typeof state.toObject === "function" ? state.toObject() : (state || {});
}

function getProviderEntries(user) {
  const providers = user?.integrations?.providers;
  if (providers && typeof providers.entries === "function") return Array.from(providers.entries());
  return Object.entries(providers || {});
}

function getMetricNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function calculateCurrentStreak(problems, now = new Date()) {
  const dates = new Set();
  for (const problem of problems) {
    if (!problem.solvedAt) continue;
    const date = new Date(problem.solvedAt);
    if (!Number.isNaN(date.getTime())) dates.add(date.toISOString().slice(0, 10));
  }
  const cursor = new Date(now);
  cursor.setUTCHours(0, 0, 0, 0);
  const key = (date) => date.toISOString().slice(0, 10);
  if (!dates.has(key(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (dates.has(key(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

async function getAchievements(req, res) {
  try {
    const user = req.user;
    const userId = user._id;
    const [trackedProblems, leetcodeRecordCount, allRecentProblems, languages, completedGoals, projectsCreated] = await Promise.all([
      Problem.countDocuments({ user: userId }),
      Problem.countDocuments({ user: userId, platform: { $regex: /^leetcode$/i } }),
      Problem.find({ user: userId }).select("platform solvedAt language").sort({ solvedAt: -1 }).limit(10000).lean(),
      Problem.distinct("language", { user: userId }),
      Goal.countDocuments({ user: userId, status: "completed" }),
      Project.countDocuments({ user: userId }),
    ]);

    const entries = getProviderEntries(user).map(([id, state]) => [normalizePlatform(id), toPlainState(state)]);
    const providerState = new Map(entries);
    const leetcodeState = providerState.get("leetcode") || {};
    const leetcodeStats = leetcodeState.stats && typeof leetcodeState.stats === "object" ? leetcodeState.stats : {};
    const connectedStates = entries.filter(([, state]) => ["verified", "public"].includes(state.mode) && String(state.username || "").trim());
    const profileTotal = [leetcodeStats.totalSolved, leetcodeStats.solved, leetcodeStats.completedChallenges].map(getMetricNumber).find((value) => value !== null);
    const languageSet = new Set((languages || []).map((language) => String(language || "").trim()).filter((language) => language && normalizePlatform(language) !== "unknown"));
    const metrics = {
      trackedProblems,
      currentStreak: calculateCurrentStreak(allRecentProblems),
      leetcodeSolved: profileTotal === undefined ? leetcodeRecordCount : profileTotal,
      languageCount: languageSet.size,
      linkedProfiles: connectedStates.length,
      completedGoals,
      projectsCreated,
    };

    const existing = new Map((user.achievementBadges || []).map((badge) => [badge.id, badge]));
    let shouldSave = false;
    for (const item of CATALOG) {
      const value = Number(metrics[item.metric]) || 0;
      if (value >= item.target && !existing.has(item.id)) {
        const record = {
          id: item.id,
          name: item.name,
          description: item.description,
          icon: item.icon,
          unlockedAt: new Date(),
          metricValue: value,
        };
        user.achievementBadges.push(record);
        existing.set(item.id, record);
        shouldSave = true;
      }
    }
    if (shouldSave) await user.save();

    const achievements = CATALOG.map((item) => {
      const unlockedRecord = existing.get(item.id);
      const value = Number(metrics[item.metric]) || 0;
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        icon: item.icon,
        progress: Math.min(value, item.target),
        currentValue: value,
        target: item.target,
        unlocked: Boolean(unlockedRecord),
        unlockedAt: unlockedRecord?.unlockedAt || null,
      };
    });

    return res.json({ success: true, achievements, unlockedCount: achievements.filter((item) => item.unlocked).length });
  } catch (error) {
    console.error("Achievement calculation failed:", error.message);
    return res.status(500).json({ success: false, message: "Could not calculate developer achievements." });
  }
}

module.exports = { getAchievements, calculateCurrentStreak };
