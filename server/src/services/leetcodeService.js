const ENDPOINT = "https://leetcode.com/graphql";

async function graphQL(query, variables = {}) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Referer: "https://leetcode.com",
      "User-Agent":
        "Mozilla/5.0 (compatible; DevTrack/1.0; public-profile-sync)",
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(
      `LeetCode returned HTTP ${response.status}. It may be temporarily unavailable or rate-limiting requests.`
    );
  }

  const body = await response.json();

  if (body.errors?.length) {
    throw new Error(
      body.errors[0].message || "LeetCode rejected the query."
    );
  }

  if (!body.data) {
    throw new Error("LeetCode returned an empty response.");
  }

  return body.data;
}

async function fetchProfile(username) {
  const data = await graphQL(
    `query devTrackPublicProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          userAvatar
          aboutMe
        }
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
      }
    }`,
    { username }
  );

  if (!data?.matchedUser) {
    throw new Error(
      "LeetCode profile not found or not publicly accessible. Check the username and try again."
    );
  }

  return data.matchedUser;
}

async function fetchRecentAccepted(username) {
  const data = await graphQL(
    `query devTrackRecentAccepted(
      $username: String!,
      $limit: Int!
    ) {
      recentAcSubmissionList(
        username: $username,
        limit: $limit
      ) {
        id
        title
        titleSlug
        timestamp
      }
    }`,
    { username, limit: 20 }
  );

  const submissions = data?.recentAcSubmissionList;

  if (!Array.isArray(submissions)) {
    throw new Error(
      "LeetCode did not return recent accepted submissions."
    );
  }

  return submissions;
}

async function fetchDifficulty(slug) {
  try {
    const data = await graphQL(
      `query devTrackQuestionDifficulty($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          difficulty
        }
      }`,
      { titleSlug: slug }
    );

    const difficulty = data?.question?.difficulty;

    return ["Easy", "Medium", "Hard"].includes(difficulty)
      ? difficulty
      : null;
  } catch {
    // Never label a problem Easy when the lookup failed.
    return null;
  }
}

async function fetchUserCalendar(
  username,
  year = new Date().getFullYear()
) {
  const data = await graphQL(
    `query devTrackUserCalendar(
      $username: String!,
      $year: Int
    ) {
      matchedUser(username: $username) {
        userCalendar(year: $year) {
          streak
          totalActiveDays
        }
      }
    }`,
    { username, year }
  );

  return data?.matchedUser?.userCalendar || null;
}

module.exports = {
  fetchProfile,
  fetchRecentAccepted,
  fetchDifficulty,
  fetchUserCalendar,
};