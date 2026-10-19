
const mongoose = require("mongoose");

const problemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // "manual" means the user explicitly logged this problem in DevTrack.
    // "imported" is reserved for records imported from external platforms.
    origin: {
      type: String,
      enum: ["manual", "imported"],
      default: "manual",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },

    platform: {
      type: String,
      enum: [
        "LeetCode",
        "Codeforces",
        "CodeChef",
        "GeeksforGeeks",
        "HackerRank",
        "AtCoder",
        "HackerEarth",
        "Codewars",
        "Other",
      ],
      default: "LeetCode",
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard", "Unknown"],
      default: "Easy",
    },

    problemUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
      validate: {
        validator: (value) => !value || /^https?:\/\//i.test(value),
        message: "Problem URL must start with http:// or https://",
      },
    },

    externalId: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 5000,
    },

    topics: {
      type: [String],
      default: [],
      validate: {
        validator: (topics) => topics.length <= 20,
        message: "A maximum of 20 topics is allowed.",
      },
    },

    markedForRevision: {
      type: Boolean,
      default: false,
    },

    lastRevised: {
      type: Date,
      default: null,
    },

    revisionCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    solvedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

problemSchema.index(
  { user: 1, platform: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      externalId: { $type: "string", $gt: "" },
    },
  }
);

// Efficiently query a user's manually logged problems by date.
problemSchema.index({
  user: 1,
  origin: 1,
  solvedAt: -1,
});

module.exports = mongoose.model("Problem", problemSchema);
