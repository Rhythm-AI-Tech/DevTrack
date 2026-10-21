const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");


const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const problemRoutes = require("./routes/problemRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const integrationRoutes = require("./routes/integrationRoutes");
const githubRoutes = require("./routes/githubRoutes");
const goalRoutes = require("./routes/goalRoutes");
const projectRoutes = require("./routes/projectRoutes");
const aiRoutes = require("./routes/aiRoutes");
const badgeRoutes = require("./routes/badgeRoutes");
const apiKeyRoutes = require("./routes/apiKeyRoutes");
const achievementRoutes = require("./routes/achievementRoutes");
const publicApiRoutes = require("./routes/publicApiRoutes");
const activityRoutes = require("./routes/activityRoutes");
const verifyRoutes = require("./routes/verify");
const webhookRoutes = require("./routes/webhookRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware must run before API routes.
const allowedOrigins = String(
  process.env.CORS_ORIGINS ||
  "http://localhost:3000,http://localhost:5173"
).split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use("/api/integrations", integrationRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/badge", badgeRoutes);
app.use("/api/v1/keys", apiKeyRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/v1/data", publicApiRoutes);
app.use("/api/v1/activity", activityRoutes);
app.use("/api/v1/verify", verifyRoutes);
app.use("/api/v1/webhooks", webhookRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "DevTrack API is running",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ success: false, code: "API_NOT_FOUND", message: "API endpoint not found." });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, code: "INVALID_JSON", message: "Request body contains invalid JSON." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ success: false, code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds the 1 MB limit." });
  }
  if (String(error.message || "").includes("Origin is not allowed by CORS")) {
    return res.status(403).json({ success: false, code: "CORS_ORIGIN_DENIED", message: "This origin is not allowed." });
  }
  console.error("Unhandled API error:", error.message);
  return res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "An unexpected server error occurred." });
});

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start DevTrack server:", error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };