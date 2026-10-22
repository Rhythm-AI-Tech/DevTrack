const crypto = require("crypto");
const ApiCredential = require("../models/ApiCredential");

function createKey() {
  return `dt_live_${crypto.randomBytes(32).toString("base64url")}`;
}

async function getStatus(req, res) {
  const credential = await ApiCredential.findOne({ user: req.user._id }).select("prefix createdAt lastUsedAt");
  return res.json({ success: true, credential: credential ? {
    prefix: credential.prefix, createdAt: credential.createdAt, lastUsedAt: credential.lastUsedAt,
  } : null });
}

async function regenerate(req, res) {
  const key = createKey();
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  const prefix = key.slice(0, 16);
  await ApiCredential.findOneAndUpdate(
    { user: req.user._id },
    { $set: { keyHash, prefix, createdAt: new Date(), lastUsedAt: null } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return res.status(201).json({
    success: true,
    key,
    credential: { prefix, createdAt: new Date(), lastUsedAt: null },
    warning: "Copy this key now. DevTracker stores only its hash and cannot reveal it again.",
  });
}

async function revoke(req, res) {
  await ApiCredential.deleteOne({ user: req.user._id });
  return res.json({ success: true, message: "API key revoked." });
}

module.exports = { getStatus, regenerate, revoke };
