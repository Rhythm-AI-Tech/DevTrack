const API_BASE = "https://codeforces.com/api";
const MIN_REQUEST_INTERVAL = 2100;
const MAX_SUBMISSIONS = 10000;

let apiQueue = Promise.resolve();
let lastRequestStarted = 0;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestCodeforces(method, params) {
  const url = new URL(`${API_BASE}/${method}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const task = apiQueue.then(async () => {
    const waitFor =
      MIN_REQUEST_INTERVAL -
      (Date.now() - lastRequestStarted);

    if (waitFor > 0) {
      await delay(waitFor);
    }

    lastRequestStarted = Date.now();

    const response = await fetch(url, {
      headers: {
        "User-Agent": "DevTrack/1.0 public-profile-sync",
      },
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      throw new Error(
        `Codeforces returned HTTP ${response.status}. Try again later.`
      );
    }

    const body = await response.json();

    if (body.status !== "OK") {
      throw new Error(
        body.comment || "Codeforces rejected the API request."
      );
    }

    return body.result;
  });

  // Keep the queue usable even when a request fails.
  apiQueue = task.then(
    () => undefined,
    () => undefined
  );

  return task;
}

async function fetchCodeforcesProfile(handle) {
  const result = await requestCodeforces("user.info", {
    handles: handle,
  });

  if (!Array.isArray(result) || !result[0]) {
    throw new Error("Codeforces user not found.");
  }

  return result[0];
}

async function fetchCodeforcesSubmissions(handle) {
  return requestCodeforces("user.status", {
    handle,
    from: 1,
    count: MAX_SUBMISSIONS,
  });
}

function difficultyFromRating(rating) {
  if (!Number.isFinite(Number(rating))) {
    return "Unknown";
  }

  const value = Number(rating);

  if (value <= 1200) return "Easy";
  if (value <= 1600) return "Medium";

  return "Hard";
}

function problemIdentity(problem) {
  if (
    Number.isFinite(Number(problem.contestId)) &&
    problem.index
  ) {
    return `${problem.contestId}-${problem.index}`;
  }

  if (problem.problemsetName && problem.index) {
    return `${problem.problemsetName}-${problem.index}`;
  }

  return null;
}

function problemUrl(problem) {
  if (problem.contestId && problem.index) {
    return (
      `https://codeforces.com/problemset/problem/` +
      `${problem.contestId}/${problem.index}`
    );
  }

  if (problem.problemsetName && problem.index) {
    return (
      `https://codeforces.com/problemset/` +
      `${problem.problemsetName}/problem/${problem.index}`
    );
  }

  return "";
}

module.exports = {
  fetchCodeforcesProfile,
  fetchCodeforcesSubmissions,
  difficultyFromRating,
  problemIdentity,
  problemUrl,
  MAX_SUBMISSIONS,
};