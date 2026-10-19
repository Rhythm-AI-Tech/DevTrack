

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

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware must run before API routes.
app.use(cors());
app.use(express.json());
app.use("/api/integrations", integrationRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/projects", projectRoutes);

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
app.use("/api/integrations", integrationRoutes);

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

startServer();