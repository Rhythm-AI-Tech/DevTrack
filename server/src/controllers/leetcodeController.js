const crypto = require("crypto");
const Problem = require("../models/Problem");
const User = require("../models/User");

const {
  fetchProfile,
  fetchRecentAccepted,
  fetchDifficulty,
  fetchUserCalendar,
} = require("../services/leetcodeService");

const CHALLENGE_TTL_MS = 20 * 60 * 1000;

function getSolvedStats(profile) {
  const rows = profile?.submitStats?.acSubmissionNum;

  if (!Array.isArray(rows)) {
    throw new Error(
      "LeetCode did not return its profile-wide solved statistics."
    );
  }

  const countFor = (difficulty) => {
    const row = rows.find(
      (item) => item.difficulty === difficulty
    );
    const value = Number(row?.count);

    return Number.isFinite(value) && value >= 0 ? value : 0;
  };

  const easy = countFor("Easy");
  const medium = countFor("Medium");
  const hard = countFor("Hard");

  const allRow = rows.find((item) => item.difficulty === "All");
  const allValue = Number(allRow?.count);

  return {
    totalSolved:
      Number.isFinite(allValue) && allValue >= 0
        ? allValue
        : easy + medium + hard,
    easy,
    medium,
    hard,
  };
}

function getProblemSlug(problem) {
  const urlMatch = String(problem.problemUrl || "").match(
    /leetcode\.com\/problems\/([^/?#]+)/i
  );

  if (urlMatch?.[1]) {
    return urlMatch[1].toLowerCase();
  }

  const sourceId = String(problem.sourceId || "")
    .trim()
    .toLowerCase();

  // Old records used numeric submission IDs, not problem slugs.
  if (sourceId && !/^\d+$/.test(sourceId)) {
    return sourceId;
  }

  return null;
}

// Clean up identifiable duplicates created by the old sync logic.
async function deduplicateImportedProblems(userId) {
  const rows = await Problem.find({
    user: userId,
    source: "leetcode",
  })
    .select("_id title sourceId problemUrl solvedAt difficulty")
    .lean();

  const groups = new Map();

  for (const row of rows) {
    const slug = getProblemSlug(row);

    if (!slug) continue;

    if (!groups.has(slug)) {
      groups.set(slug, []);
    }

    groups.get(slug).push(row);
  }

  for (const [slug, group] of groups) {
    group.sort((a, b) => {
      const aCanonical = a.sourceId === slug ? 0 : 1;
      const bCanonical = b.sourceId === slug ? 0 : 1;

      if (aCanonical !== bCanonical) {
        return aCanonical - bCanonical;
      }

      return (
        new Date(a.solvedAt || 0) -
        new Date(b.solvedAt || 0)
      );
    });

    const [keeper, ...duplicates] = group;

    if (duplicates.length) {
      await Problem.deleteMany({
        _id: { $in: duplicates.map((row) => row._id) },
        user: userId,
      });
    }

    if (keeper.sourceId !== slug) {
      await Problem.updateOne(
        { _id: keeper._id, user: userId },
        { $set: { sourceId: slug } }
      );
    }
  }
}

function saveProfileSnapshot(user, profile, calendar = null) {
  const solved = getSolvedStats(profile);
  const stats = user.integrations.leetcodeStats || {};

  stats.totalSolved = solved.totalSolved;
  stats.easy = solved.easy;
  stats.medium = solved.medium;
  stats.hard = solved.hard;
  stats.updatedAt = new Date();

  if (calendar && Number.isFinite(Number(calendar.streak))) {
    stats.currentStreak = Math.max(0, Number(calendar.streak));
  }

  if (
    calendar &&
    Number.isFinite(Number(calendar.totalActiveDays))
  ) {
    stats.totalActiveDays = Math.max(
      0,
      Number(calendar.totalActiveDays)
    );
  }

  user.integrations.leetcodeStats = stats;

  return solved;
}

// GET /api/integrations/leetcode
const status = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("integrations")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const integration = user.integrations || {};

    // Old username-only connections are not considered verified.
    const connected = Boolean(
      integration.leetcodeUsername &&
      integration.leetcodeVerifiedAt
    );

    const pendingIsValid = Boolean(
      integration.leetcodePendingUsername &&
      integration.leetcodeVerificationCode &&
      integration.leetcodeVerificationExpiresAt &&
      new Date(
        integration.leetcodeVerificationExpiresAt
      ).getTime() > Date.now()
    );

    let profile = null;

    if (connected) {
      try {
        const result = await fetchProfile(
          integration.leetcodeUsername
        );

        profile = {
          username: result.username,
          realName: result.profile?.realName || "",
          avatar: result.profile?.userAvatar || "",
          solved: getSolvedStats(result),
        };
      } catch {
        // If LeetCode is temporarily unavailable, show saved totals.
        const saved = integration.leetcodeStats || {};

        profile = {
          username: integration.leetcodeUsername,
          realName: "",
          avatar: "",
          solved: {
            totalSolved: saved.totalSolved || 0,
            easy: saved.easy || 0,
            medium: saved.medium || 0,
            hard: saved.hard || 0,
          },
          stale: true,
        };
      }
    }

    return res.json({
      success: true,
      connected,
      username: connected
        ? integration.leetcodeUsername
        : "",
      verifiedAt: connected
        ? integration.leetcodeVerifiedAt
        : null,

      pendingUsername: pendingIsValid
        ? integration.leetcodePendingUsername
        : "",

      verificationCode: pendingIsValid
        ? integration.leetcodeVerificationCode
        : "",

      verificationExpiresAt: pendingIsValid
        ? integration.leetcodeVerificationExpiresAt
        : null,

      verificationExpired: Boolean(
        integration.leetcodePendingUsername &&
        integration.leetcodeVerificationExpiresAt &&
        !pendingIsValid
      ),

      lastSyncedAt: connected
        ? integration.leetcodeLastSyncedAt
        : null,

      lastSyncError:
        integration.leetcodeLastSyncError || "",

      leetcodeStats: connected
        ? integration.leetcodeStats
        : null,

      profile,
    });
  } catch (error) {
    console.error("LeetCode status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load LeetCode integration status.",
    });
  }
};

// POST /api/integrations/leetcode/connect
// Starts verification. It does not connect the profile yet.
const connect = async (req, res) => {
  const username = String(req.body.username || "").trim();

  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(username)) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid LeetCode username.",
    });
  }

  try {
    await fetchProfile(username);

    const verificationCode =
      `DEVTRACK-VERIFY-${crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase()}`;

    const verificationExpiresAt = new Date(
      Date.now() + CHALLENGE_TTL_MS
    );

    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        "integrations.leetcodePendingUsername": username,
        "integrations.leetcodeVerificationCode":
          verificationCode,
        "integrations.leetcodeVerificationExpiresAt":
          verificationExpiresAt,
        "integrations.leetcodeLastSyncError": "",
      },
    });

    return res.json({
      success: true,
      pending: true,
      pendingUsername: username,
      verificationCode,
      verificationExpiresAt,
      message:
        "Verification code created. Add it to the About Me field on your LeetCode profile, save it, then select Verify ownership. Your account is not connected yet.",
    });
  } catch (error) {
    return res.status(422).json({
      success: false,
      message:
        error.message ||
        "Unable to check that public LeetCode profile.",
    });
  }
};

// POST /api/integrations/leetcode/verify
const verifyOwnership = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("integrations");

    const integration = user?.integrations;
    const pendingUsername =
      integration?.leetcodePendingUsername;
    const challenge =
      integration?.leetcodeVerificationCode;
    const expiresAt =
      integration?.leetcodeVerificationExpiresAt;

    if (!pendingUsername || !challenge || !expiresAt) {
      return res.status(400).json({
        success: false,
        message:
          "Start a new LeetCode verification first.",
      });
    }

    if (new Date(expiresAt).getTime() <= Date.now()) {
      return res.status(410).json({
        success: false,
        message:
          "This verification code expired. Start a new verification.",
      });
    }

    const profile = await fetchProfile(pendingUsername);
    const aboutMe = String(profile.profile?.aboutMe || "");

    if (
      !aboutMe
        .toUpperCase()
        .includes(challenge.toUpperCase())
    ) {
      return res.status(409).json({
        success: false,
        message:
          "The code was not found in that profile's About Me field. Add the exact code, save your LeetCode profile, and try again.",
      });
    }

    let calendar = null;

    try {
      calendar = await fetchUserCalendar(pendingUsername);
    } catch {
      // Calendar information is optional.
    }

    const solved = saveProfileSnapshot(
      user,
      profile,
      calendar
    );

    user.integrations.leetcodeUsername = profile.username;
    user.integrations.leetcodeVerifiedAt = new Date();
    user.integrations.leetcodePendingUsername = "";
    user.integrations.leetcodeVerificationCode = "";
    user.integrations.leetcodeVerificationExpiresAt = null;
    user.integrations.leetcodeLastSyncError = "";

    await user.save();

    return res.json({
      success: true,
      connected: true,
      username: profile.username,
      verifiedAt: user.integrations.leetcodeVerifiedAt,
      stats: solved,
      message:
        `Ownership verified. Connected to @${profile.username}. ` +
        "Profile-wide solved totals are now available. You can remove the temporary verification code from About Me.",
    });
  } catch (error) {
    console.error(
      "LeetCode ownership verification error:",
      error.message
    );

    return res.status(502).json({
      success: false,
      message:
        error.message ||
        "Unable to verify the LeetCode profile right now.",
    });
  }
};

// POST /api/integrations/leetcode/cancel-verification
const cancelVerification = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      "integrations.leetcodePendingUsername": "",
      "integrations.leetcodeVerificationCode": "",
      "integrations.leetcodeVerificationExpiresAt": null,
    },
  });

  return res.json({
    success: true,
    message: "Pending verification cancelled.",
  });
};

// POST /api/integrations/leetcode/disconnect
const disconnect = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      "integrations.leetcodeUsername": "",
      "integrations.leetcodeVerifiedAt": null,
      "integrations.leetcodeLastSyncedAt": null,
      "integrations.leetcodeLastSyncError": "",

      "integrations.leetcodeStats.totalSolved": 0,
      "integrations.leetcodeStats.easy": 0,
      "integrations.leetcodeStats.medium": 0,
      "integrations.leetcodeStats.hard": 0,
      "integrations.leetcodeStats.currentStreak": null,
      "integrations.leetcodeStats.totalActiveDays": null,
      "integrations.leetcodeStats.updatedAt": null,

      "integrations.leetcodePendingUsername": "",
      "integrations.leetcodeVerificationCode": "",
      "integrations.leetcodeVerificationExpiresAt": null,
    },
  });

  return res.json({
    success: true,
    message:
      "LeetCode disconnected. Previously imported problem records were kept in DevTracker.",
  });
};

// POST /api/integrations/leetcode/sync
const sync = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("integrations");

    const integration = user?.integrations;
    const username = integration?.leetcodeUsername;

    const isVerified = Boolean(
      username && integration.leetcodeVerifiedAt
    );

    if (!isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Connect a LeetCode account by completing the ownership-verification step in Settings first.",
      });
    }

    const profile = await fetchProfile(username);
    const solved = getSolvedStats(profile);

    // The public endpoint exposes only a limited recent window.
    let submissions = [];
    let submissionWarning = "";

    try {
      submissions = await fetchRecentAccepted(username);
    } catch (error) {
      submissionWarning =
        "Profile totals were refreshed, but recent problem details could not be imported: " +
        error.message;
    }

    let calendar = null;

    try {
      calendar = await fetchUserCalendar(username);
    } catch {
      // Keep existing calendar information if the request fails.
    }

    await deduplicateImportedProblems(user._id);

    // Keep only one record for each problem slug in this sync.
    const uniqueSubmissions = new Map();

    for (const submission of submissions) {
      const slug = String(submission.titleSlug || "")
        .trim()
        .toLowerCase();

      const timestamp = Number(submission.timestamp);

      if (
        !slug ||
        !submission.title ||
        !Number.isFinite(timestamp) ||
        timestamp <= 0
      ) {
        continue;
      }

      const existing = uniqueSubmissions.get(slug);

      if (!existing || timestamp < existing.timestamp) {
        uniqueSubmissions.set(slug, {
          slug,
          title: submission.title,
          timestamp,
        });
      }
    }

    let imported = 0;
    let refreshed = 0;
    let skippedUnknownDifficulty = 0;

    for (const submission of uniqueSubmissions.values()) {
      const difficulty = await fetchDifficulty(
        submission.slug
      );

      if (!difficulty) {
        skippedUnknownDifficulty++;
        continue;
      }

      try {
        const result = await Problem.updateOne(
          {
            user: user._id,
            source: "leetcode",
            sourceId: submission.slug,
          },
          {
            $set: {
              title: submission.title,
              platform: "LeetCode",
              difficulty,
              problemUrl:
                `https://leetcode.com/problems/${submission.slug}/`,
            },

            $setOnInsert: {
              user: user._id,
              source: "leetcode",
              sourceId: submission.slug,
              solvedAt: new Date(
                submission.timestamp * 1000
              ),
            },
          },
          { upsert: true }
        );

        if (result.upsertedCount) {
          imported++;
        } else if (result.matchedCount) {
          refreshed++;
        }
      } catch (error) {
        // A concurrent sync may hit the unique index; this is safe.
        if (error.code !== 11000) {
          throw error;
        }
      }
    }

    saveProfileSnapshot(user, profile, calendar);

    user.integrations.leetcodeLastSyncedAt = new Date();
    user.integrations.leetcodeLastSyncError = submissionWarning;

    await user.save();

    const warnings = [];

    if (submissionWarning) {
      warnings.push(submissionWarning);
    }

    if (skippedUnknownDifficulty) {
      warnings.push(
        `${skippedUnknownDifficulty} recent problem(s) were skipped because their difficulty could not be verified. They were not falsely labelled Easy.`
      );
    }

    return res.json({
      success: true,
      message:
        `Profile totals refreshed: ${solved.totalSolved} unique problems solved ` +
        `(${solved.easy} Easy, ${solved.medium} Medium, ${solved.hard} Hard). ` +
        `Imported ${imported} new distinct problem record(s).`,
      imported,
      refreshed,
      checked: uniqueSubmissions.size,
      stats: solved,
      username: profile.username,
      lastSyncedAt:
        user.integrations.leetcodeLastSyncedAt,
      warnings,
      limitation:
        "The headline totals use LeetCode profile-wide summary counts. The individual imported problem list is limited to the recent accepted-submission window and is not a complete lifetime history.",
    });
  } catch (error) {
    console.error("LeetCode sync error:", error.message);

    try {
      const user = await User.findById(req.user._id)
        .select("integrations");

      if (user) {
        user.integrations.leetcodeLastSyncError =
          String(error.message || "Sync failed").slice(
            0,
            300
          );

        await user.save();
      }
    } catch {
      // Preserve the original sync error.
    }

    return res.status(502).json({
      success: false,
      message:
        error.message ||
        "Unable to sync LeetCode right now.",
    });
  }
};

module.exports = {
  status,
  connect,
  verifyOwnership,
  cancelVerification,
  disconnect,
  sync,
};