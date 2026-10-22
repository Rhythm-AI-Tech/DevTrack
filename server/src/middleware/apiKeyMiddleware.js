const crypto = require("crypto");
const ApiCredential = require("../models/ApiCredential");
const User = require("../models/User");

const apiKeyAuth = async (req, res, next) => {
  const key = String(req.get("x-api-key") || "").trim();
  if (!/^dt_live_[A-Za-z0-9_-]{32,}$/.test(key)) {
    return res.status(401).json({ success: false, message: "A valid x-api-key header is required." });
  }

  try {
    const keyHash = crypto.createHash("sha256").update(key).digest("hex");
    const credential = await ApiCredential.findOne({ keyHash }).select("+keyHash");
    if (!credential) return res.status(401).json({ success: false, message: "Invalid API key." });

    const user = await User.findById(credential.user);
    if (!user) return res.status(401).json({ success: false, message: "API key owner no longer exists." });

    credential.lastUsedAt = new Date();
    await credential.save();
    req.apiUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = apiKeyAuth;
