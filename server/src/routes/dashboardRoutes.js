
const express = require("express");
const { getDashboardStats } = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, getDashboardStats);

module.exports = router;
