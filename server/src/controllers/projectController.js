const Project = require("../models/Project");

const projectFields = [
  "name", "description", "status", "deadline", "repositoryUrl", "milestones",
];

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
};

const withProgress = (project) => {
  const value = project.toObject ? project.toObject() : project;
  const milestones = value.milestones || [];
  value.progress = milestones.length
    ? Math.round(
        (milestones.filter((m) => m.completed).length / milestones.length) * 100
      )
    : value.status === "completed" ? 100 : 0;
  return value;
};

const validMilestones = (items) =>
  Array.isArray(items) &&
  items.length <= 50 &&
  items.every((item) =>
    item &&
    typeof item === "object" &&
    typeof item.title === "string" &&
    item.title.trim().length > 0 &&
    item.title.trim().length <= 120 &&
    (item.completed === undefined || typeof item.completed === "boolean")
  );

async function getProjects(req, res) {
  try {
    const projects = await Project.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, projects: projects.map(withProgress) });
  } catch (error) {
    console.error("Get projects error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch projects." });
  }
}

async function createProject(req, res) {
  try {
    const body = req.body;

    if (typeof body.name !== "string" || !body.name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project name is required.",
      });
    }

    if (body.repositoryUrl && !isHttpUrl(body.repositoryUrl)) {
      return res.status(400).json({
        success: false,
        message: "Repository URL must be a valid HTTP or HTTPS URL.",
      });
    }

    if (body.milestones !== undefined && !validMilestones(body.milestones)) {
      return res.status(400).json({
        success: false,
        message: "Milestones need a title and must contain no more than 50 items.",
      });
    }

    const project = await Project.create({
      user: req.user._id,
      name: body.name.trim(),
      description: body.description,
      status: body.status,
      deadline: body.deadline || null,
      repositoryUrl: body.repositoryUrl,
      milestones: Array.isArray(body.milestones)
        ? body.milestones.map((m) => ({ title: m.title }))
        : [],
    });

    res.status(201).json({ success: true, project: withProgress(project) });
  } catch (error) {
    if (["ValidationError", "CastError"].includes(error.name)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project details.",
      });
    }

    console.error("Create project error:", error.message);
    res.status(500).json({ success: false, message: "Failed to create project." });
  }
}

async function updateProject(req, res) {
  try {
    const updates = {};

    projectFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        message: "Provide project fields to update.",
      });
    }

    if (
      updates.name !== undefined &&
      (typeof updates.name !== "string" || !updates.name.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Project name cannot be empty.",
      });
    }

    if (updates.name) updates.name = updates.name.trim();

    if (updates.repositoryUrl && !isHttpUrl(updates.repositoryUrl)) {
      return res.status(400).json({
        success: false,
        message: "Repository URL must be a valid HTTP or HTTPS URL.",
      });
    }

    if (updates.milestones !== undefined) {
      if (!validMilestones(updates.milestones)) {
        return res.status(400).json({
          success: false,
          message: "Milestones need a title and must contain no more than 50 items.",
        });
      }

      updates.milestones = updates.milestones.map((m) => ({
        _id: m._id,
        title: m.title.trim(),
        completed: m.completed === true,
        completedAt: m.completed ? (m.completedAt || new Date()) : null,
      }));
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    res.json({ success: true, project: withProgress(project) });
  } catch (error) {
    if (["ValidationError", "CastError"].includes(error.name)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID or details.",
      });
    }

    console.error("Update project error:", error.message);
    res.status(500).json({ success: false, message: "Failed to update project." });
  }
}

async function deleteProject(req, res) {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    res.json({ success: true, message: "Project deleted." });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID.",
      });
    }

    console.error("Delete project error:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete project." });
  }
}

module.exports = { getProjects, createProject, updateProject, deleteProject };