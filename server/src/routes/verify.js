const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getProvider } = require("../services/platformRegistry");
const { connect, verifyOwnership } = require("../controllers/integrationController");

const router = express.Router();
router.use(authMiddleware);

router.post("/:provider/challenge", (req, res, next) => {
  const provider = getProvider(req.params.provider);
  if (!provider) {
    return res.status(404).json({ success: false, message: "Unknown coding platform." });
  }
  if (provider.mode !== "verified") {
    return res.status(409).json({
      success: false,
      message: `${provider.name} does not support ownership-token verification in this build.`,
    });
  }
  return connect(req, res, next);
});

router.post("/:provider", (req, res, next) => {
  const provider = getProvider(req.params.provider);
  if (!provider) {
    return res.status(404).json({ success: false, message: "Unknown coding platform." });
  }
  if (provider.mode !== "verified") {
    return res.status(409).json({
      success: false,
      message: `${provider.name} does not support ownership-token verification in this build.`,
    });
  }
  return verifyOwnership(req, res, next);
});

module.exports = router;
