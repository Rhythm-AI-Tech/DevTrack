
const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const projectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["planned", "in-progress", "on-hold", "completed"],
      default: "planned",
    },
    deadline: {
      type: Date,
      default: null,
    },
    repositoryUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
      validate: {
        validator: (value) => !value || /^https?:\/\//i.test(value),
        message: "Repository URL must start with http:// or https://",
      },
    },
    milestones: {
      type: [milestoneSchema],
      default: [],
    },
  },
  { timestamps: true }
);

projectSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model("Project", projectSchema);
