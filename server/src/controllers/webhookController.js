const User = require("../models/User");

function validateTargetUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return { value: "", error: null };
  if (value.length > 2048) return { error: "Webhook URL must be 2048 characters or fewer." };

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { error: "Enter a valid HTTPS webhook URL." };
  }

  if (parsed.protocol !== "https:") {
    return { error: "Webhook destinations must use HTTPS." };
  }
  if (parsed.username || parsed.password) {
    return { error: "Credentials are not allowed in webhook URLs." };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const blocked = host === "localhost" || host.endsWith(".localhost") ||
    host === "::1" || host === "0.0.0.0" ||
    /^127\./.test(host) || /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (blocked) return { error: "Local and private-network webhook destinations are not allowed." };

  parsed.hash = "";
  return { value: parsed.toString(), error: null };
}

async function getWebhook(req, res) {
  try {
    const user = await User.findById(req.user._id).select("webhook").lean();
    if (!user) return res.status(404).json({ success: false, message: "User account not found." });
    return res.json({ success: true, webhook: user.webhook || { enabled: false, targetUrl: "" } });
  } catch (error) {
    console.error("Load webhook preference failed:", error.message);
    return res.status(500).json({ success: false, message: "Could not load webhook settings." });
  }
}

async function updateWebhook(req, res) {
  const enabled = req.body?.enabled;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ success: false, message: "The enabled field must be true or false." });
  }

  const checked = validateTargetUrl(req.body?.targetUrl);
  if (checked.error) return res.status(400).json({ success: false, message: checked.error });
  if (enabled && !checked.value) {
    return res.status(400).json({ success: false, message: "Enter an HTTPS destination before enabling webhooks." });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User account not found." });

    user.webhook = {
      ...(user.webhook?.toObject ? user.webhook.toObject() : user.webhook || {}),
      enabled,
      targetUrl: checked.value || user.webhook?.targetUrl || "",
      updatedAt: new Date(),
    };
    await user.save();

    return res.json({
      success: true,
      webhook: {
        enabled: user.webhook.enabled,
        targetUrl: user.webhook.targetUrl,
        updatedAt: user.webhook.updatedAt,
        lastDeliveryAt: user.webhook.lastDeliveryAt,
        lastDeliveryStatus: user.webhook.lastDeliveryStatus,
      },
    });
  } catch (error) {
    console.error("Update webhook preference failed:", error.message);
    return res.status(500).json({ success: false, message: "Could not save webhook settings." });
  }
}

async function deliverProblemCreated(userId, problem) {
  let user;
  try {
    user = await User.findById(userId).select("webhook").lean();
    const webhook = user?.webhook;
    if (!webhook?.enabled || !webhook.targetUrl) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(webhook.targetUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "DevTracker-Webhooks/1.0" },
        body: JSON.stringify({
          event: "problem.created",
          createdAt: new Date().toISOString(),
          data: {
            id: String(problem._id),
            title: problem.title,
            platform: problem.platform,
            difficulty: problem.difficulty,
            solvedAt: problem.solvedAt,
            topics: problem.topics || [],
          },
        }),
        signal: controller.signal,
        redirect: "error",
      });
      await User.updateOne({ _id: userId }, {
        $set: {
          "webhook.lastDeliveryAt": new Date(),
          "webhook.lastDeliveryStatus": response.ok ? `Delivered (${response.status})` : `Destination returned ${response.status}`,
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    try {
      await User.updateOne({ _id: userId }, {
        $set: {
          "webhook.lastDeliveryAt": new Date(),
          "webhook.lastDeliveryStatus": error.name === "AbortError" ? "Delivery timed out" : "Delivery failed",
        },
      });
    } catch (updateError) {
      console.error("Could not record webhook delivery result:", updateError.message);
    }
    console.error("DevTracker webhook delivery failed:", error.message);
  }
}

module.exports = { getWebhook, updateWebhook, deliverProblemCreated, validateTargetUrl };
