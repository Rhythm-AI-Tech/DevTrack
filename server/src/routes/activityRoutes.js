const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getHeatmap } = require("../controllers/activityController");

const router = express.Router();
router.get("/heatmap", authMiddleware, getHeatmap);
module.exports = router;
