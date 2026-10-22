const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { chat } = require("../controllers/aiController");

const router = express.Router();
const recentRequests = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;

router.use(authMiddleware);
router.post("/chat", (req, res, next) => {
  const key = String(req.user._id);
  const now = Date.now();
  const recent = (recentRequests.get(key) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    return res.status(429).json({ success: false, message: "You've sent several messages. Wait a minute and try again." });
  }
  recent.push(now);
  recentRequests.set(key, recent);
  if (recentRequests.size > 5000) {
    for (const [userKey, timestamps] of recentRequests) {
      if (!timestamps.some((timestamp) => now - timestamp < WINDOW_MS)) recentRequests.delete(userKey);
    }
  }
  return chat(req, res, next);
});

module.exports = router;
