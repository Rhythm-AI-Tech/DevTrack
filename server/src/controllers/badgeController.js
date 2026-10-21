const mongoose = require("mongoose");
const Problem = require("../models/Problem");
const User = require("../models/User");

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (char) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  }[char]));
}

function badgeSvg(label, value, color = "#16a34a") {
  const left = escapeXml(label);
  const right = escapeXml(value);
  const leftWidth = Math.max(72, left.length * 7 + 20);
  const rightWidth = Math.max(50, right.length * 7 + 20);
  const width = leftWidth + rightWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="28" role="img" aria-label="${left}: ${right}"><title>${left}: ${right}</title><linearGradient id="g" x2="0" y2="100%"><stop offset="0" stop-color="#555"/><stop offset="1" stop-color="#333"/></linearGradient><rect width="${leftWidth}" height="28" rx="4" fill="url(#g)"/><rect x="${leftWidth}" width="${rightWidth}" height="28" rx="4" fill="${color}"/><rect x="${leftWidth}" width="4" height="28" fill="${color}"/><g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle"><text x="${leftWidth / 2}" y="18">${left}</text><text x="${leftWidth + rightWidth / 2}" y="18">${right}</text></g></svg>`;
}

async function getBadge(req, res) {
  if (!mongoose.isValidObjectId(req.params.userId)) {
    return res.status(400).type("text/plain").send("Invalid user id");
  }
  try {
    const user = await User.findById(req.params.userId).select("_id integrations");
    if (!user) return res.status(404).type("text/plain").send("User not found");
    const total = await Problem.countDocuments({ user: user._id, origin: { $in: ["imported", "verified-sync"] } });
    res.set({
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      "X-Content-Type-Options": "nosniff",
    });
    return res.send(badgeSvg("DevTracker solutions", total.toLocaleString(), "#16a34a"));
  } catch (error) {
    return res.status(500).type("text/plain").send("Could not render badge");
  }
}

module.exports = { getBadge };
