const { getProvider } = require("./platformRegistry");

const LEETCODE_ENDPOINT = "https://leetcode.com/graphql";
const CODEFORCES_ENDPOINT = "https://codeforces.com/api";
const ATCODER_ENDPOINT =
  "https://kenkoooo.com/atcoder/atcoder-api/v3";

const CODEFORCES_MAX_SUBMISSIONS = 10000;
const ATCODER_PAGE_SIZE = 500;
const ATCODER_MAX_PAGES_PER_SYNC = 3;
const CODEWARS_MAX_PAGES_PER_SYNC = 10;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchResponse(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
  }

  return response;
}

async function fetchJson(url, options = {}) {
  const response = await fetchResponse(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "DevTrack/1.0",
      ...(options.headers || {}),
    },
    ...options,
  });

  return response.json();
}

async function leetcodeGraphQL(query, variables = {}) {
  const response = await fetchResponse(LEETCODE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Referer: "https://leetcode.com",
      "User-Agent": "DevTrack/1.0 public-profile-sync",
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = await response.json();

  if (body.errors?.length) {
    throw new Error(
      body.errors[0].message || "LeetCode rejected the query."
    );
  }

  if (!body.data) {
    throw new Error("LeetCode returned an empty GraphQL response.");
  }

  return body.data;
}

// Codeforces has a relatively strict request interval. Serialize API calls
// in this Node process, including calls triggered by different users.
let codeforcesQueue = Promise.resolve();
let lastCodeforcesRequestAt = 0;

function codeforcesApi(method, params = {}) {
  const task = codeforcesQueue.then(async () => {
    const waitMs =
      2100 - (Date.now() - lastCodeforcesRequestAt);

    if (waitMs > 0) {
      await delay(waitMs);
    }

    lastCodeforcesRequestAt = Date.now();

    const url = new URL(`${CODEFORCES_ENDPOINT}/${method}`);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const body = await fetchJson(url.toString());

    if (body.status !== "OK") {
      throw new Error(
        body.comment || "Codeforces API request failed."
      );
    }

    return body.result;
  });

  codeforcesQueue = task.then(
    () => undefined,
    () => undefined
  );

  return task;
}

// AtCoder Problems asks API clients to wait over one second between accesses.
// This helper serializes calls from this service process.
let lastAtCoderRequestAt = 0;
let atcoderQueue = Promise.resolve();

function atcoderApi(url) {
  const task = atcoderQueue.then(async () => {
    const waitMs =
      1150 - (Date.now() - lastAtCoderRequestAt);

    if (waitMs > 0) {
      await delay(waitMs);
    }

    lastAtCoderRequestAt = Date.now();

    return fetchJson(url);
  });

  atcoderQueue = task.then(
    () => undefined,
    () => undefined
  );

  return task;
}

function profileStatsFromLeetCode(profile) {
  const rows = profile?.submitStats?.acSubmissionNum || [];

  const findCount = (difficulty) => {
    const row = rows.find(
      (item) => item.difficulty === difficulty
    );

    const value = Number(row?.count);

    return Number.isFinite(value) && value >= 0 ? value : 0;
  };

  const easy = findCount("Easy");
  const medium = findCount("Medium");
  const hard = findCount("Hard");
  const allRow = rows.find((item) => item.difficulty === "All");
  const all = Number(allRow?.count);

  return {
    totalSolved:
      Number.isFinite(all) && all >= 0
        ? all
        : easy + medium + hard,
    easy,
    medium,
    hard,
  };
}

async function fetchProviderProfile(providerId, username) {
  const provider = getProvider(providerId);

  if (!provider) {
    throw new Error("Unknown coding platform.");
  }

  const safeUsername = String(username || "").trim();

  if (!safeUsername || safeUsername.length > 100) {
    throw new Error("Enter a valid platform username.");
  }

  if (providerId === "leetcode") {
    const data = await leetcodeGraphQL(
      `query devTrackPublicProfile($username: String!) {
        matchedUser(username: $username) {
          username
          profile {
            realName
            userAvatar
            aboutMe
          }
          submitStats {
            acSubmissionNum {
              difficulty
              count
              submissions
            }
          }
        }
      }`,
      { username: safeUsername }
    );

    const profile = data?.matchedUser;

    if (!profile) {
      throw new Error(
        "LeetCode profile not found or not publicly accessible."
      );
    }

    return {
      username: profile.username,
      displayName: profile.profile?.realName || profile.username,
      profileUrl:
        `https://leetcode.com/u/${encodeURIComponent(profile.username)}/`,
      verificationValue: profile.profile?.aboutMe || "",
      stats: profileStatsFromLeetCode(profile),
      raw: profile,
    };
  }

  if (providerId === "codeforces") {
    const result = await codeforcesApi("user.info", {
      handles: safeUsername,
    });

    const profile = result?.[0];

    if (!profile) {
      throw new Error("Codeforces handle not found.");
    }

    return {
      username: profile.handle,
      displayName:
        [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
        profile.handle,
      profileUrl:
        `https://codeforces.com/profile/${encodeURIComponent(profile.handle)}`,
      verificationValue: profile.organization || "",
      stats: {
        rating: profile.rating ?? null,
        maxRating: profile.maxRating ?? null,
        rank: profile.rank || "Unrated",
        maxRank: profile.maxRank || "Unrated",
      },
      raw: profile,
    };
  }

  if (providerId === "atcoder") {
    const profileUrl =
      `https://atcoder.jp/users/${encodeURIComponent(safeUsername)}`;

    const response = await fetchResponse(profileUrl, {
      headers: { "User-Agent": "DevTrack/1.0" },
    });

    // This check is only for profile existence. It does not prove ownership.
    const html = await response.text();

    if (/404\s+Not Found/i.test(html.slice(0, 5000))) {
      throw new Error(
        "AtCoder profile was not found. Check the username."
      );
    }

    return {
      username: safeUsername,
      displayName: safeUsername,
      profileUrl,
      verificationValue: "",
      stats: {},
      raw: null,
    };
  }

  if (providerId === "codewars") {
    const profile = await fetchJson(
      `https://www.codewars.com/api/v1/users/${encodeURIComponent(safeUsername)}`
    );

    if (!profile?.username) {
      throw new Error("Codewars profile was not found.");
    }

    return {
      username: profile.username,
      displayName: profile.name || profile.username,
      profileUrl:
        `https://www.codewars.com/users/${encodeURIComponent(profile.username)}`,
      verificationValue: "",
      stats: {
        honor: profile.honor ?? null,
        totalCompleted: profile.codeChallenges?.totalCompleted ?? null,
        overallRank: profile.ranks?.overall?.name || "",
      },
      raw: profile,
    };
  }

  throw new Error(
    `${provider.name} does not have an automatic sync adapter in this build. Use manual tracking for now.`
  );
}

async function fetchLeetCodeRecentSubmissions(username) {
  const data = await leetcodeGraphQL(
    `query devTrackRecentAccepted($username: String!) {
      recentAcSubmissionList(username: $username, limit: 20) {
        title
        titleSlug
        timestamp
      }
    }`,
    { username }
  );

  if (!Array.isArray(data?.recentAcSubmissionList)) {
    throw new Error(
      "LeetCode did not return recent accepted submissions."
    );
  }

  const submissions = data.recentAcSubmissionList;
  const uniqueSlugs = [
    ...new Set(
      submissions
        .map((item) => String(item.titleSlug || "").toLowerCase())
        .filter((slug) => /^[a-z0-9-]+$/.test(slug))
    ),
  ];

  const difficultyBySlug = new Map();

  if (uniqueSlugs.length) {
    try {
      const questionFields = uniqueSlugs
        .map(
          (slug, index) =>
            `q${index}: question(titleSlug: "${slug}") { difficulty }`
        )
        .join("\n");

      const difficultyData = await leetcodeGraphQL(
        `query devTrackQuestionDifficulties { ${questionFields} }`
      );

      uniqueSlugs.forEach((slug, index) => {
        const difficulty = difficultyData[`q${index}`]?.difficulty;

        difficultyBySlug.set(
          slug,
          ["Easy", "Medium", "Hard"].includes(difficulty)
            ? difficulty
            : "Unknown"
        );
      });
    } catch {
      // Failed lookups stay Unknown. Never silently label them Easy.
    }
  }

  const unique = new Map();

  for (const submission of submissions) {
    const slug = String(submission.titleSlug || "").toLowerCase();
    const timestamp = Number(submission.timestamp);

    if (
      !slug ||
      !submission.title ||
      !Number.isFinite(timestamp) ||
      timestamp <= 0
    ) {
      continue;
    }

    const existing = unique.get(slug);

    if (!existing || timestamp < existing.timestamp) {
      unique.set(slug, {
        sourceId: slug,
        title: submission.title,
        difficulty: difficultyBySlug.get(slug) || "Unknown",
        problemUrl: `https://leetcode.com/problems/${slug}/`,
        solvedAt: new Date(timestamp * 1000),
        topic: [],
      });
    }
  }

  return [...unique.values()];
}

async function syncCodeforces(username) {
  const profile = await fetchProviderProfile("codeforces", username);

  const submissions = await codeforcesApi("user.status", {
    handle: profile.username,
    from: 1,
    count: CODEFORCES_MAX_SUBMISSIONS,
  });

  if (!Array.isArray(submissions)) {
    throw new Error("Codeforces returned an invalid submission list.");
  }

  const unique = new Map();
  let acceptedSubmissions = 0;

  for (const submission of submissions) {
    if (submission.verdict !== "OK" || !submission.problem) {
      continue;
    }

    acceptedSubmissions++;

    const problem = submission.problem;

    let identity = null;
    let url = "";

    if (problem.contestId && problem.index) {
      identity = `${problem.contestId}-${problem.index}`;
      url =
        `https://codeforces.com/problemset/problem/` +
        `${problem.contestId}/${problem.index}`;
    } else if (problem.problemsetName && problem.index) {
      identity = `${problem.problemsetName}-${problem.index}`;
      url =
        `https://codeforces.com/problemset/${encodeURIComponent(problem.problemsetName)}` +
        `/problem/${encodeURIComponent(problem.index)}`;
    }

    const timestamp = Number(submission.creationTimeSeconds);

    if (!identity || !Number.isFinite(timestamp)) {
      continue;
    }

    const existing = unique.get(identity);

    if (!existing || timestamp < existing.timestamp) {
      unique.set(identity, {
        sourceId: identity.toLowerCase(),
        title: problem.name || identity,
        // Codeforces rating is not the same as official difficulty.
        difficulty: "Unknown",
        problemUrl: url,
        solvedAt: new Date(timestamp * 1000),
        topic: Array.isArray(problem.tags) ? problem.tags : [],
        timestamp,
      });
    }
  }

  const records = [...unique.values()].map(({ timestamp, ...record }) => record);

  return {
    profile,
    records,
    stats: {
      ...profile.stats,
      acceptedSubmissionsInFetchedHistory: acceptedSubmissions,
      uniqueSolvedInFetchedHistory: records.length,
      fetchedSubmissionCount: submissions.length,
      historyLimited: submissions.length >= CODEFORCES_MAX_SUBMISSIONS,
      statsAreLifetimeTotals: false,
    },
    cursor: {},
    warning:
      submissions.length >= CODEFORCES_MAX_SUBMISSIONS
        ? "Codeforces returned the configured submission limit; the unique-problem count may not cover your full history."
        : "Unique-problem count reflects the public submission history returned by Codeforces.",
  };
}

async function syncAtCoder(username, existingCursor = {}) {
  const initialFrom =
    Number(existingCursor.nextFromSecond) ||
    (Number(existingCursor.lastFetchedEpochSecond)
      ? Number(existingCursor.lastFetchedEpochSecond) + 1
      : Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60);

  let fromSecond = initialFrom;
  let morePagesRemain = false;
  let scanned = [];
  let pagesFetched = 0;

  for (
    let page = 0;
    page < ATCODER_MAX_PAGES_PER_SYNC;
    page++
  ) {
    const url =
      `${ATCODER_ENDPOINT}/user/submissions` +
      `?user=${encodeURIComponent(username)}` +
      `&from_second=${fromSecond}`;

    const batch = await atcoderApi(url);

    if (!Array.isArray(batch)) {
      throw new Error("AtCoder Problems returned an invalid submission list.");
    }

    pagesFetched++;
    scanned = scanned.concat(batch);

    if (batch.length < ATCODER_PAGE_SIZE) {
      morePagesRemain = false;
      break;
    }

    const latestInBatch = Math.max(
      ...batch.map((item) => Number(item.epoch_second) || 0)
    );

    if (!latestInBatch) {
      morePagesRemain = false;
      break;
    }

    fromSecond = latestInBatch + 1;
    morePagesRemain = true;
  }

  const unique = new Map();

  for (const submission of scanned) {
    if (submission.result !== "AC" || !submission.problem_id) {
      continue;
    }

    const id = String(submission.problem_id).toLowerCase();
    const timestamp = Number(submission.epoch_second);

    if (!Number.isFinite(timestamp)) {
      continue;
    }

    const existing = unique.get(id);

    if (!existing || timestamp < existing.timestamp) {
      const contest = id.split("_")[0];

      unique.set(id, {
        sourceId: id,
        title: id,
        difficulty: "Unknown",
        problemUrl:
          `https://atcoder.jp/contests/${encodeURIComponent(contest)}` +
          `/tasks/${encodeURIComponent(id)}`,
        solvedAt: new Date(timestamp * 1000),
        topic: [],
        timestamp,
      });
    }
  }

  const records = [...unique.values()].map(({ timestamp, ...record }) => record);
  const latestFetched = scanned.reduce(
    (max, row) => Math.max(max, Number(row.epoch_second) || 0),
    Number(existingCursor.lastFetchedEpochSecond) || 0
  );

  return {
    profile: {
      username,
      displayName: username,
      profileUrl: `https://atcoder.jp/users/${encodeURIComponent(username)}`,
    },
    records,
    stats: {
      uniqueSolvedInFetchedHistory: records.length,
      acceptedSubmissionsInFetchedHistory: scanned.filter(
        (row) => row.result === "AC"
      ).length,
      fetchedSubmissionCount: scanned.length,
      pagesFetched,
      historyLimited: morePagesRemain,
      statsAreLifetimeTotals: false,
    },
    cursor: {
      lastFetchedEpochSecond: latestFetched,
      nextFromSecond: morePagesRemain ? fromSecond : null,
      initialWindowStartedAt: Number(existingCursor.initialWindowStartedAt) ||
        initialFrom,
    },
    warning: morePagesRemain
      ? "AtCoder returned another full page. The initial history sync is incomplete; sync again to continue fetching from the saved cursor."
      : "AtCoder records reflect the fetched submission window, not a guaranteed lifetime total.",
  };
}

async function syncCodewars(username) {
  const profile = await fetchProviderProfile("codewars", username);
  const unique = new Map();

  const firstPage = await fetchJson(
    `https://www.codewars.com/api/v1/users/${encodeURIComponent(username)}` +
    `/code-challenges/completed?page=0`
  );

  const totalPages = Math.max(1, Number(firstPage.totalPages) || 1);
  const pagesToFetch = Math.min(
    totalPages,
    CODEWARS_MAX_PAGES_PER_SYNC
  );

  for (let page = 0; page < pagesToFetch; page++) {
    if (page > 0) {
      await delay(150);
    }

    const response =
      page === 0
        ? firstPage
        : await fetchJson(
            `https://www.codewars.com/api/v1/users/${encodeURIComponent(username)}` +
            `/code-challenges/completed?page=${page}`
          );

    for (const challenge of response.data || []) {
      const slug = String(challenge.slug || "").toLowerCase();

      if (!slug) continue;

      const completedAt = challenge.completedAt
        ? new Date(challenge.completedAt)
        : new Date(0);

      const existing = unique.get(slug);

      if (!existing || completedAt < existing.solvedAt) {
        unique.set(slug, {
          sourceId: slug,
          title: challenge.name || slug,
          difficulty: "Unknown",
          problemUrl: `https://www.codewars.com/kata/${slug}`,
          solvedAt: completedAt,
          topic: [],
        });
      }
    }
  }

  const records = [...unique.values()];

  return {
    profile,
    records,
    stats: {
      ...(profile.stats || {}),
      uniqueChallengesInFetchedHistory: records.length,
      pagesFetched: pagesToFetch,
      totalPages: totalPages,
      historyLimited: totalPages > pagesToFetch,
      statsAreLifetimeTotals: true,
    },
    cursor: {},
    warning:
      totalPages > pagesToFetch
        ? `Only ${pagesToFetch} of ${totalPages} Codewars pages were fetched in this sync. The profile's completed-challenge total is shown separately.`
        : "Codewars profile totals and fetched completed-challenge records are separate metrics.",
  };
}

async function syncPlatform(providerId, username, cursor = {}) {
  if (providerId === "leetcode") {
    const profile = await fetchProviderProfile("leetcode", username);
    const records = await fetchLeetCodeRecentSubmissions(profile.username);

    return {
      profile,
      records,
      stats: {
        ...profile.stats,
        uniqueProblemsInRecentWindow: records.length,
        recentWindowSize: 20,
        statsAreLifetimeTotals: true,
      },
      cursor: {},
      warning:
        "LeetCode's profile-wide solved counts are lifetime summary figures. Imported individual problem details are limited to the recent accepted-submission window.",
    };
  }

  if (providerId === "codeforces") {
    return syncCodeforces(username);
  }

  if (providerId === "atcoder") {
    return syncAtCoder(username, cursor);
  }

  if (providerId === "codewars") {
    return syncCodewars(username);
  }

  const provider = getProvider(providerId);

  throw new Error(
    `${provider?.name || providerId} does not support automatic sync in this build.`
  );
}

module.exports = {
  fetchProviderProfile,
  syncPlatform,
};