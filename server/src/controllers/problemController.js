
const Problem = require("../models/Problem");
const { deliverProblemCreated } = require("./webhookController");

// GET /api/problems
const getProblems = async (req, res) => {
  try {
    const problems = await Problem.find({
      user: req.user._id,
      origin: "manual",
    }).sort({ solvedAt: -1 });

    return res.status(200).json({
      success: true,
      count: problems.length,
      problems,
    });
  } catch (error) {
    console.error("Get problems error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch coding problems.",
    });
  }
};

// POST /api/problems
const createProblem = async (req, res) => {
  try {
    const {
      title,
      platform,
      difficulty,
      language,
      problemUrl,
      solvedAt,
      notes,
      topics,
    } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Problem title is required.",
      });
    }

    const problem = await Problem.create({
      user: req.user._id,
      title: title.trim(),
      platform,
      difficulty,
      language,
      problemUrl,
      solvedAt,
      notes: typeof notes === "string" ? notes : "",
      topics: Array.isArray(topics)
        ? topics
        : typeof topics === "string"
          ? topics.split(",").map((topic) => topic.trim()).filter(Boolean)
          : [],
    });

    // Webhook delivery is best-effort and never blocks the problem-save response.
    void deliverProblemCreated(req.user._id, problem);

    return res.status(201).json({
      success: true,
      message: "Coding problem saved successfully.",
      problem,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid coding problem details.",
      });
    }

    console.error("Create problem error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to save coding problem.",
    });
  }
};

// PATCH /api/problems/:id
const updateProblem = async (req, res) => {
  try {
    const allowedFields = [
      "title",
      "platform",
      "difficulty",
      "language",
      "problemUrl",
      "solvedAt",
      "notes",
      "topics",
      "markedForRevision",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one valid field to update.",
      });
    }

    if (
      updates.title !== undefined &&
      (typeof updates.title !== "string" || !updates.title.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Problem title cannot be empty.",
      });
    }

    if (updates.title !== undefined) {
      updates.title = updates.title.trim();
    }

    if (updates.notes !== undefined) {
      if (typeof updates.notes !== "string") {
        return res.status(400).json({
          success: false,
          message: "Notes must be text.",
        });
      }

      if (updates.notes.length > 5000) {
        return res.status(400).json({
          success: false,
          message: "Notes cannot exceed 5000 characters.",
        });
      }
    }

    if (updates.topics !== undefined && !Array.isArray(updates.topics)) {
      return res.status(400).json({
        success: false,
        message: "Topics must be an array.",
      });
    }

    if (
      updates.markedForRevision !== undefined &&
      typeof updates.markedForRevision !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "Revision status must be true or false.",
      });
    }

    const problem = await Problem.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
        origin: "manual",
      },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Problem updated successfully.",
      problem,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid problem ID or details.",
      });
    }

    console.error("Update problem error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update problem.",
    });
  }
};

// POST /api/problems/:id/revisions
const markAsRevised = async (req, res) => {
  try {
    const problem = await Problem.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
        origin: "manual",
      },
      {
        $inc: { revisionCount: 1 },
        $set: {
          lastRevised: new Date(),
          markedForRevision: false,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Revision recorded successfully.",
      problem,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid problem ID.",
      });
    }

    console.error("Mark as revised error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to record revision.",
    });
  }
};

// DELETE /api/problems/:id
const deleteProblem = async (req, res) => {
  try {
    const problem = await Problem.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
      origin: "manual",
    });

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Problem deleted successfully.",
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid problem ID.",
      });
    }

    console.error("Delete problem error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete problem.",
    });
  }
};

module.exports = {
  getProblems,
  createProblem,
  updateProblem,
  markAsRevised,
  deleteProblem,
};
