const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getWebhook, updateWebhook } = require("../controllers/webhookController");

const router = express.Router();
router.use(authMiddleware);
router.get("/", getWebhook);
router.put("/", updateWebhook);

module.exports = router;
