const express = require("express");
const apiKeyAuth = require("../middleware/apiKeyMiddleware");
const { getMyActivity } = require("../controllers/publicApiController");

const router = express.Router();
router.get("/activity", apiKeyAuth, getMyActivity);
module.exports = router;
