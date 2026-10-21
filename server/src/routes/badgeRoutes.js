const express = require("express");
const { getBadge } = require("../controllers/badgeController");

const router = express.Router();
router.get("/:userId", getBadge);
module.exports = router;
