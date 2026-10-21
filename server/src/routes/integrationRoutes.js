const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const {
  listProviders,
  getStatus,
  connect,
  verifyOwnership,
  cancelVerification,
  sync,
  disconnect,
} = require("../controllers/integrationController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", listProviders);
router.get("/:provider", getStatus);

router.post("/:provider/connect", connect);
router.post("/:provider/verify", verifyOwnership);
router.post("/:provider/cancel-verification", cancelVerification);
router.post("/:provider/sync", sync);
router.post("/:provider/disconnect", disconnect);

module.exports = router;