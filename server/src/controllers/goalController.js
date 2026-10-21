const Goal = require("../models/Goal");
const Problem = require("../models/Problem");

const dateKey = (date) => new Date(date).toISOString().slice(0, 10);

const activityFor = (problems) => {
  const days = new Set(problems.map((p) => dateKey(p.solvedAt)));
  const now = new Date();
  let cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  if (!days.has(dateKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const weekStart = new Date();
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

  const thisWeek = problems.filter((p) => {
    const date = new Date(p.solvedAt);
    return date >= weekStart && date <= now;
  }).length;

  return { streak, thisWeek };
};

async function decorateGoals(userId, goals) {
  const needsActivity = goals.some((g) => g.kind !== "custom");
  const problems = needsActivity
    ? await Problem.find({ user: userId }).select("solvedAt").lean()
    : [];

  const activity = activityFor(problems);

  return goals.map((goal) => {
    const value = goal.toObject ? goal.toObject() : { ...goal };

    if (value.kind === "weekly-problems") {
      value.currentProgress = activity.thisWeek;
    } else if (value.kind === "coding-streak") {
      value.currentProgress = activity.streak;
    } else {
      value.currentProgress = value.progress;
    }

    value.percentComplete = Math.min(
      100,
      Math.round((value.currentProgress / value.target) * 100)
    );

    return value;
  });
}

async function getGoals(req, res) {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      goals: await decorateGoals(req.user._id, goals),
    });
  } catch (error) {
    console.error("Get goals error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch goals." });
  }
}

async function createGoal(req, res) {
  try {
    const { title, description, kind = "custom", target, deadline } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      !Number.isFinite(Number(target))
    ) {
      return res.status(400).json({
        success: false,
        message: "A goal title and numeric target are required.",
      });
    }

    const goal = await Goal.create({
      user: req.user._id,
      title: title.trim(),
      description,
      kind,
      target: Number(target),
      deadline: deadline || null,
    });

    const [result] = await decorateGoals(req.user._id, [goal]);
    res.status(201).json({ success: true, goal: result });
  } catch (error) {
    if (["ValidationError", "CastError"].includes(error.name)) {
      return res.status(400).json({
        success: false,
        message: "Invalid goal details.",
      });
    }

    console.error("Create goal error:", error.message);
    res.status(500).json({ success: false, message: "Failed to create goal." });
  }
}

async function updateGoal(req, res) {
  try {
    const allowed = [
      "title", "description", "kind", "target",
      "progress", "deadline", "status",
    ];

    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        message: "Provide goal fields to update.",
      });
    }

    if (
      updates.title !== undefined &&
      (typeof updates.title !== "string" || !updates.title.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Goal title cannot be empty.",
      });
    }

    if (updates.title) updates.title = updates.title.trim();

    const existing = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).select("kind target progress");

    if (!existing) {
      return res.status(404).json({ success: false, message: "Goal not found." });
    }

    const nextKind = updates.kind ?? existing.kind;

    if (nextKind !== "custom" && updates.progress !== undefined) {
      return res.status(400).json({
        success: false,
        message: "Activity goal progress is calculated from coding records.",
      });
    }

    const target =
      updates.target === undefined ? existing.target : Number(updates.target);
    const progress =
      updates.progress === undefined
        ? existing.progress
        : Number(updates.progress);

    if (updates.target !== undefined && existing.kind === "custom" &&
        updates.progress === undefined && progress > target) {
      updates.progress = target;
    } else if (progress > target) {
      return res.status(400).json({
        success: false,
        message: "Goal progress cannot exceed its target.",
      });
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!goal) {
      return res.status(404).json({ success: false, message: "Goal not found." });
    }

    const [result] = await decorateGoals(req.user._id, [goal]);
    res.json({ success: true, goal: result });
  } catch (error) {
    if (["ValidationError", "CastError"].includes(error.name)) {
      return res.status(400).json({
        success: false,
        message: "Invalid goal ID or details.",
      });
    }

    console.error("Update goal error:", error.message);
    res.status(500).json({ success: false, message: "Failed to update goal." });
  }
}

async function deleteGoal(req, res) {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({ success: false, message: "Goal not found." });
    }

    res.json({ success: true, message: "Goal deleted." });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid goal ID." });
    }

    console.error("Delete goal error:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete goal." });
  }
}

module.exports = { getGoals, createGoal, updateGoal, deleteGoal };