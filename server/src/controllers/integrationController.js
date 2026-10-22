const crypto = require("crypto");

const User = require("../models/User");
const Problem = require("../models/Problem");

const {
  PROVIDERS,
  getProvider,
} = require("../services/platformRegistry");

const {
  fetchProviderProfile,
  syncPlatform,
} = require("../services/platformAdapters");

const CHALLENGE_TTL_MS = 20 * 60 * 1000;

function getState(user, providerId) {
  const map = user.integrations?.providers;
  const state = map?.get
    ? map.get(providerId)
    : map?.[providerId];

  if (!state) return {};

  return typeof state.toObject === "function"
    ? state.toObject()
    : { ...state };
}

function saveState(user, providerId, state) {
  if (!user.integrations) {
    user.integrations = {};
  }

  if (
    !user.integrations.providers ||
    typeof user.integrations.providers.set !== "function"
  ) {
    user.integrations.providers = new Map();
  }

  user.integrations.providers.set(providerId, state);
  user.markModified("integrations.providers");
}

function getIntegrationStatus(provider, state) {
  const hasPendingChallenge = Boolean(
    state.pendingUsername &&
    state.verificationCode &&
    state.verificationExpiresAt &&
    new Date(state.verificationExpiresAt).getTime() > Date.now()
  );

  let status = "not-connected";

  if (provider.mode === "manual") {
    status = "manual";
  } else if (state.mode === "verified") {
    status = "verified";
  } else if (state.mode === "public") {
    status = "public-unverified";
  } else if (hasPendingChallenge) {
    status = "pending";
  } else if (state.pendingUsername && state.verificationExpiresAt) {
    status = "verification-expired";
  }

  return {
    id: provider.id,
    name: provider.name,
    mode: provider.mode,
    syncAvailable: provider.syncAvailable,
    description: provider.description,
    verificationField: provider.verificationField || null,
    profileUrl: provider.profileUrl,
    status,

    username: state.username || "",
    connected: state.mode === "verified",
    publicTracking: state.mode === "public",

    pendingUsername: hasPendingChallenge
      ? state.pendingUsername
      : "",

    verificationCode: hasPendingChallenge
      ? state.verificationCode
      : "",

    verificationExpiresAt: hasPendingChallenge
      ? state.verificationExpiresAt
      : null,

    verificationExpired: status === "verification-expired",
    verifiedAt: state.verifiedAt || null,
    lastSyncedAt: state.lastSyncedAt || null,
    lastSyncError: state.lastSyncError || "",
    stats: state.stats || {},
  };
}

// GET /api/integrations
const listProviders = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("integrations")
      .exec();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "DevTracker user not found.",
      });
    }

    const providers = PROVIDERS.map((provider) =>
      getIntegrationStatus(
        provider,
        getState(user, provider.id)
      )
    );

    return res.json({
      success: true,
      providers,
    });
  } catch (error) {
    console.error("List integrations error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load platform integrations.",
    });
  }
};

// GET /api/integrations/:provider
const getStatus = async (req, res) => {
  const provider = getProvider(req.params.provider);

  if (!provider) {
    return res.status(404).json({
      success: false,
      message: "Unknown coding platform.",
    });
  }

  try {
    const user = await User.findById(req.user._id)
      .select("integrations")
      .exec();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "DevTracker user not found.",
      });
    }

    return res.json({
      success: true,
      provider: getIntegrationStatus(
        provider,
        getState(user, provider.id)
      ),
    });
  } catch (error) {
    console.error("Integration status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load platform status.",
    });
  }
};

// POST /api/integrations/:provider/connect
const connect = async (req, res) => {
  const provider = getProvider(req.params.provider);

  if (!provider) {
    return res.status(404).json({
      success: false,
      message: "Unknown coding platform.",
    });
  }

  if (!provider.syncAvailable) {
    return res.status(409).json({
      success: false,
      message:
        `${provider.name} is available for manual tracking, but an automatic personal-history connector is not configured yet.`,
    });
  }

  const username = String(
    req.body.username || req.body.handle || ""
  ).trim();

  if (
    !username ||
    username.length > 100 ||
    /[\s/\\]/.test(username)
  ) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid platform username.",
    });
  }

  try {
    // A public profile can only be tracked as explicitly unverified.
    if (provider.mode === "public") {
      if (req.body.trackPublicProfile !== true) {
        return res.status(400).json({
          success: false,
          message:
            "Confirm that you want to track a public profile without verifying its ownership.",
        });
      }

      const profile = await fetchProviderProfile(
        provider.id,
        username
      );

      const user = await User.findById(req.user._id)
        .select("integrations")
        .exec();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "DevTracker user not found.",
        });
      }

      const oldState = getState(user, provider.id);

      saveState(user, provider.id, {
        ...oldState,
        mode: "public",
        username: profile.username,
        pendingUsername: "",
        verificationCode: "",
        verificationExpiresAt: null,
        verifiedAt: null,
        stats: profile.stats || {},
        cursor: oldState.cursor || {},
        lastSyncError: "",
      });

      await user.save();

      return res.json({
        success: true,
        publicTracking: true,
        connected: false,
        username: profile.username,
        message:
          `${provider.name} public profile selected. Ownership is not verified, so its imported records will remain separate from your personal verified totals.`,
      });
    }

    // Verified providers require a one-time profile-edit challenge.
    const profile = await fetchProviderProfile(
      provider.id,
      username
    );

    const verificationCode =
      `DEVTRACK-${crypto
        .randomBytes(5)
        .toString("hex")
        .toUpperCase()}`;

    const verificationExpiresAt = new Date(
      Date.now() + CHALLENGE_TTL_MS
    );

    const user = await User.findById(req.user._id)
      .select("integrations")
      .exec();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "DevTracker user not found.",
      });
    }

    const oldState = getState(user, provider.id);

    saveState(user, provider.id, {
      ...oldState,
      mode:
        oldState.mode === "verified"
          ? "verified"
          : "pending",
      pendingUsername: profile.username,
      verificationCode,
      verificationExpiresAt,
      lastSyncError: "",
    });

    await user.save();

    return res.json({
      success: true,
      pending: true,
      username: profile.username,
      pendingUsername: profile.username,
      verificationCode,
      verificationExpiresAt,
      verificationField: provider.verificationField,
      message:
        `Add the verification code to your ${provider.verificationField} field, save the profile, then verify ownership in DevTracker.`,
    });
  } catch (error) {
    return res.status(422).json({
      success: false,
      message:
        error.message || "Unable to connect this profile.",
    });
  }
};

// POST /api/integrations/:provider/verify
const verifyOwnership = async (req, res) => {
  const provider = getProvider(req.params.provider);

  if (!provider || provider.mode !== "verified") {
    return res.status(400).json({
      success: false,
      message:
        "This provider does not support profile-field ownership verification.",
    });
  }

  try {
    const user = await User.findById(req.user._id)
      .select("integrations")
      .exec();

    const state = user ? getState(user, provider.id) : null;

    if (!user || !state?.pendingUsername || !state?.verificationCode) {
      return res.status(400).json({
        success: false,
        message: "Start a new verification challenge first.",
      });
    }

    if (
      !state.verificationExpiresAt ||
      new Date(state.verificationExpiresAt).getTime() <= Date.now()
    ) {
      return res.status(410).json({
        success: false,
        message: "The verification code expired. Start again.",
      });
    }

    const profile = await fetchProviderProfile(
      provider.id,
      state.pendingUsername
    );

    const profileField = String(
      profile.verificationValue || ""
    );

    if (
      !profileField
        .toUpperCase()
        .includes(state.verificationCode.toUpperCase())
    ) {
      return res.status(409).json({
        success: false,
        message:
          `The code was not found in the profile's ${provider.verificationField} field. Add the exact code, save the profile, and retry.`,
      });
    }

    saveState(user, provider.id, {
      ...state,
      mode: "verified",
      username: profile.username,
      pendingUsername: "",
      verificationCode: "",
      verificationExpiresAt: null,
      verifiedAt: new Date(),
      stats: profile.stats || {},
      cursor: state.cursor || {},
      lastSyncError: "",
    });

    await user.save();

    return res.json({
      success: true,
      connected: true,
      username: profile.username,
      verifiedAt: new Date(),
      stats: profile.stats || {},
      message:
        `Ownership verified for ${provider.name}. Your account is now connected.`,
    });
  } catch (error) {
    console.error("Verify ownership error:", error.message);

    return res.status(502).json({
      success: false,
      message:
        error.message || "Could not verify profile ownership.",
    });
  }
};

// POST /api/integrations/:provider/cancel-verification
const cancelVerification = async (req, res) => {
  const provider = getProvider(req.params.provider);

  if (!provider) {
    return res.status(404).json({
      success: false,
      message: "Unknown coding platform.",
    });
  }

  try {
    const user = await User.findById(req.user._id)
      .select("integrations")
      .exec();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "DevTracker user not found.",
      });
    }

    const state = getState(user, provider.id);

    saveState(user, provider.id, {
      ...state,
      pendingUsername: "",
      verificationCode: "",
      verificationExpiresAt: null,
      mode:
        state.mode === "pending"
          ? ""
          : state.mode,
    });

    await user.save();

    return res.json({
      success: true,
      message: "Verification cancelled.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not cancel verification.",
    });
  }
};

// POST /api/integrations/:provider/sync
const sync = async (req, res) => {
  const provider = getProvider(req.params.provider);

  if (!provider) {
    return res.status(404).json({
      success: false,
      message: "Unknown coding platform.",
    });
  }

  if (!provider.syncAvailable) {
    return res.status(409).json({
      success: false,
      message:
        `${provider.name} supports manual tracking in this build, not automatic sync.`,
    });
  }

  try {
    const user = await User.findById(req.user._id)
      .select("integrations")
      .exec();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "DevTracker user not found.",
      });
    }

    const state = getState(user, provider.id);

    if (
      provider.mode === "verified" &&
      state.mode !== "verified"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Verify ownership of this platform account in Settings before syncing.",
      });
    }

    if (
      provider.mode === "public" &&
      state.mode !== "public"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Choose this public profile in Settings before tracking it.",
      });
    }

    const result = await syncPlatform(
      provider.id,
      state.username,
      state.cursor || {}
    );

    const origin =
      state.mode === "verified"
        ? "verified-sync"
        : "public-profile";

    const operations = result.records.map((record) => ({
      updateOne: {
        filter: {
          user: user._id,
          platform: provider.name,
          externalAccount: state.username.toLowerCase(),
          sourceId: record.sourceId,
        },
        update: {
          $set: {
            title: record.title,
            difficulty: record.difficulty || "Unknown",
            problemUrl: record.problemUrl || "",
            topic: record.topic || [],
            source: provider.id,
            origin,
          },
          $setOnInsert: {
            user: user._id,
            platform: provider.name,
            externalAccount: state.username.toLowerCase(),
            sourceId: record.sourceId,
            solvedAt: record.solvedAt || new Date(),
          },
        },
        upsert: true,
      },
    }));

    let imported = 0;
    let updated = 0;

    // Chunk bulk writes to avoid large single MongoDB payloads.
    for (let offset = 0; offset < operations.length; offset += 500) {
      const batch = operations.slice(offset, offset + 500);

      const writeResult = await Problem.bulkWrite(batch, {
        ordered: false,
      });

      imported += writeResult.upsertedCount || 0;
      updated += writeResult.matchedCount || 0;
    }

    const updatedState = {
      ...state,
      stats: { ...(state.stats || {}), ...(result.stats || {}) },
      cursor: result.cursor || state.cursor || {},
      lastSyncedAt: new Date(),
      lastSyncError: "",
    };

    saveState(user, provider.id, updatedState);
    await user.save();

    return res.json({
      success: true,
      provider: provider.id,
      username: state.username,
      origin,
      imported,
      updated,
      scanned: result.records.length,
      stats: updatedState.stats || {},
      lastSyncedAt: updatedState.lastSyncedAt,
      warning: result.warning || "",
      message:
        `${provider.name} sync finished. ` +
        `${imported} new problem record(s) imported.`,
    });
  } catch (error) {
    console.error(`${provider?.name || "Provider"} sync error:`, error.message);

    try {
      const user = await User.findById(req.user._id)
        .select("integrations")
        .exec();

      if (user) {
        const state = getState(user, provider.id);

        saveState(user, provider.id, {
          ...state,
          lastSyncError: String(error.message || "Sync failed").slice(
            0,
            300
          ),
        });

        await user.save();
      }
    } catch {
      // Return the original sync failure.
    }

    return res.status(502).json({
      success: false,
      message:
        error.message || "Could not sync this platform right now.",
    });
  }
};

// POST /api/integrations/:provider/disconnect
const disconnect = async (req, res) => {
  const provider = getProvider(req.params.provider);

  if (!provider) {
    return res.status(404).json({
      success: false,
      message: "Unknown coding platform.",
    });
  }

  try {
    const user = await User.findById(req.user._id)
      .select("integrations")
      .exec();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "DevTracker user not found.",
      });
    }

    saveState(user, provider.id, {
      mode: "",
      username: "",
      pendingUsername: "",
      verificationCode: "",
      verificationExpiresAt: null,
      verifiedAt: null,
      lastSyncedAt: null,
      lastSyncError: "",
      stats: {},
      cursor: {},
    });

    await user.save();

    return res.json({
      success: true,
      message:
        `${provider.name} disconnected. Previously imported records were retained.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not disconnect this platform.",
    });
  }
};

module.exports = {
  listProviders,
  getStatus,
  connect,
  verifyOwnership,
  cancelVerification,
  sync,
  disconnect,
};