const PROVIDERS = [
  {
    id: "leetcode",
    name: "LeetCode",
    mode: "verified",
    syncAvailable: true,
    verificationField: "About Me",
    description:
      "Profile-wide solved counts and a limited window of recent accepted submissions. Public GraphQL API is unofficial.",
    profileUrl: "https://leetcode.com/u/",
  },
  {
    id: "codeforces",
    name: "Codeforces",
    mode: "verified",
    syncAvailable: true,
    verificationField: "Organization",
    description:
      "Public rating, rank, and accepted submission history using the documented Codeforces API.",
    profileUrl: "https://codeforces.com/profile/",
  },
  {
    id: "atcoder",
    name: "AtCoder",
    mode: "public",
    syncAvailable: true,
    description:
      "Recent public submissions through the community AtCoder Problems API. Ownership is not verified.",
    profileUrl: "https://atcoder.jp/users/",
  },
  {
    id: "codewars",
    name: "Codewars",
    mode: "public",
    syncAvailable: true,
    description:
      "Public completed-challenge list and profile totals. Public tracking does not prove ownership.",
    profileUrl: "https://www.codewars.com/users/",
  },
  {
    id: "geeksforgeeks",
    name: "GeeksforGeeks",
    mode: "public",
    syncAvailable: true,
    description: "Save a public profile link. Automated verification and scraping are not guaranteed; use View profile to open the official page.",
    profileUrl: "https://www.geeksforgeeks.org/user/",
  },
  {
    id: "hackerrank",
    name: "HackerRank",
    mode: "public",
    syncAvailable: true,
    description: "Save a public profile link. Automated verification and scraping are not guaranteed; use View profile to open the official page.",
    profileUrl: "https://www.hackerrank.com/profile/",
  },
];

const PROVIDER_MAP = new Map(
  PROVIDERS.map((provider) => [provider.id, provider])
);

function getProvider(id) {
  return PROVIDER_MAP.get(String(id || "").toLowerCase()) || null;
}

module.exports = {
  PROVIDERS,
  PROVIDER_MAP,
  getProvider,
};
