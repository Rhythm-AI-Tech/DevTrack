const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getStatus, regenerate, revoke } = require("../controllers/apiKeyController");

const router = express.Router();
router.use(authMiddleware);
router.get("/", getStatus);
router.post("/regenerate", regenerate);
router.delete("/", revoke);
module.exports = router;
