const mongoose = require("mongoose");

const providerStateSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ["", "pending", "verified", "public"],
      default: "",
    },

    username: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    pendingUsername: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    verificationCode: {
      type: String,
      default: "",
      maxlength: 60,
    },

    verificationExpiresAt: {
      type: Date,
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    lastSyncedAt: {
      type: Date,
      default: null,
    },

    lastSyncError: {
      type: String,
      default: "",
      maxlength: 300,
    },

    stats: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    cursor: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false },
);

const integrationsSchema = new mongoose.Schema(
  {
    providers: {
      type: Map,
      of: providerStateSchema,
      default: () => new Map(),
    },
  },
  {
    _id: false,
    strict: false,
  },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must contain at least 8 characters"],
      select: false,
    },

    integrations: {
      type: integrationsSchema,
      default: () => ({}),
    },

    githubUsername: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      maxlength: 39,
    },
    themePreference: {
      type: String,
      enum: ["dark", "light"],
      default: "dark",
    },
  },
  { timestamps: true },
);

userSchema.index({ createdAt: -1 });

module.exports = mongoose.model("User", userSchema);
