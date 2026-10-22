const mongoose = require("mongoose");

const apiCredentialSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  keyHash: { type: String, required: true, select: false },
  prefix: { type: String, required: true, maxlength: 24 },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("ApiCredential", apiCredentialSchema);
