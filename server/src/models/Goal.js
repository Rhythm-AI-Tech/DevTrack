
const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    kind: {
      type: String,
      enum: ["weekly-problems", "coding-streak", "custom"],
      default: "custom",
    },
    target: {
      type: Number,
      required: true,
      min: 1,
      max: 100000,
    },
    progress: {
      type: Number,
      min: 0,
      default: 0,
    },
    deadline: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

goalSchema.index({ user: 1, status: 1, deadline: 1 });

module.exports = mongoose.model("Goal", goalSchema);
