const Problem = require("../models/Problem");

async function getMyActivity(req, res) {
  const records = await Problem.find({ user: req.apiUser._id })
    .select("title platform difficulty solvedAt problemUrl topics origin")
    .sort({ solvedAt: -1 })
    .limit(500)
    .lean();
  return res.json({
    success: true,
    data: records.map((record) => ({
      title: record.title,
      platform: record.platform,
      difficulty: record.difficulty,
      solvedAt: record.solvedAt,
      url: record.problemUrl,
      topics: record.topics || [],
      origin: record.origin,
    })),
    meta: { count: records.length, limit: 500, truncated: records.length === 500 },
  });
}

module.exports = { getMyActivity };
