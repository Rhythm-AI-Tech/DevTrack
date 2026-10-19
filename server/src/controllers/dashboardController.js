
const Problem = require("../models/Problem");

const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Count only problems explicitly logged in DevTrack.
    const personalProblemFilter = {
      user: userId,
      origin: "manual",
    };

    const problems = await Problem.find(personalProblemFilter)
      .select("solvedAt difficulty platform")
      .lean();

    const recentProblems = await Problem.find(personalProblemFilter)
      .select(
        "title difficulty platform solvedAt notes problemUrl markedForRevision topics"
      )
      .sort({ solvedAt: -1, createdAt: -1 })
      .limit(6)
      .lean();

    const platformStats = {
      LeetCode: 0,
      Codeforces: 0,
      CodeChef: 0,
      GeeksforGeeks: 0,
      HackerRank: 0,
      AtCoder: 0,
      HackerEarth: 0,
      Codewars: 0,
      Other: 0,
    };

    const difficultyStats = {
      Easy: 0,
      Medium: 0,
      Hard: 0,
      Unknown: 0,
    };

    const solvedDays = new Set();
    const activityByDay = new Map();

    for (const problem of problems) {
      if (Object.hasOwn(platformStats, problem.platform)) {
        platformStats[problem.platform] += 1;
      }

      if (Object.hasOwn(difficultyStats, problem.difficulty)) {
        difficultyStats[problem.difficulty] += 1;
      }

      if (!problem.solvedAt) continue;

      const key = dayKey(problem.solvedAt);
      solvedDays.add(key);
      activityByDay.set(key, (activityByDay.get(key) || 0) + 1);
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const cursor = new Date(today);

    // A streak remains active if the user solved something today
    // or yesterday.
    if (!solvedDays.has(dayKey(cursor))) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    let currentStreak = 0;

    while (solvedDays.has(dayKey(cursor))) {
      currentStreak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    const firstDay = new Date(today);
    firstDay.setUTCDate(firstDay.getUTCDate() - 29);

    const activityHistory = Array.from({ length: 30 }, (_, offset) => {
      const day = new Date(firstDay);
      day.setUTCDate(day.getUTCDate() + offset);

      const date = dayKey(day);

      return {
        date,
        count: activityByDay.get(date) || 0,
      };
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalSolved: problems.length,
        easy: difficultyStats.Easy,
        medium: difficultyStats.Medium,
        hard: difficultyStats.Hard,
        unknownDifficulty: difficultyStats.Unknown,
        currentStreak,
        platformStats,

        // These are profile statistics, not DevTrack-logged totals.
        platformIntegrations: {
          codeforces: {
            handle: req.user.codeforcesHandle || "",
            solved: req.user.codeforcesStats?.solved ?? null,
            submissions: req.user.codeforcesStats?.submissions ?? null,
            lastSyncedAt:
              req.user.codeforcesStats?.lastSyncedAt ?? null,
          },
          codewars: {
            handle: req.user.codewarsHandle || "",
            solved: req.user.codewarsStats?.solved ?? null,
            honor: req.user.codewarsStats?.honor ?? null,
            rank: req.user.codewarsStats?.rank ?? null,
            lastSyncedAt:
              req.user.codewarsStats?.lastSyncedAt ?? null,
          },
          profiles: req.user.platformProfiles || {},
        },

        activityHistory,
        recentProblems,
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
