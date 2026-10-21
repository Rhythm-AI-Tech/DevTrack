const Problem = require("../models/Problem");

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

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 364);
    since.setUTCHours(0, 0, 0, 0);

    const rows = await Problem.aggregate([
      {
        $match: {
          user: req.user._id,
          platform: { $in: platform.names },
          origin: { $in: ["manual", "imported", "verified-sync", "public-profile"] },
          solvedAt: { $gte: since },
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

    const byDay = new Map(rows.map((row) => [row._id, row.count]));
    const days = [];

    for (let offset = 0; offset < 365; offset += 1) {
      const date = new Date(since);
      date.setUTCDate(date.getUTCDate() + offset);
      const key = date.toISOString().slice(0, 10);
      days.push({ date: key, count: byDay.get(key) || 0 });
    }

    return res.json({
      success: true,
      platform: platform.label,
      days,
      total: days.reduce((sum, day) => sum + day.count, 0),
    });
  } catch (error) {
    console.error("Activity heatmap error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not load platform contribution activity.",
    });
  }
};

module.exports = { getHeatmap };
