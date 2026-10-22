const express = require("express");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

const GITHUB_API = "https://api.github.com";

async function githubRequest(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${GITHUB_API}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "DevTrack",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(
        response.status === 403
          ? "GitHub rate limit reached. Try again later."
          : response.status === 404
            ? "GitHub user not found."
            : "GitHub could not return this public profile."
      );

      error.status = response.status === 404 ? 404 :
        response.status === 403 ? 429 : 502;

      throw error;
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

router.get("/", async (req, res) => {
  const username = req.user.githubUsername;

  if (!username) {
    return res.json({ success: true, connected: false });
  }

  try {
    const encoded = encodeURIComponent(username);

    const [profile, repositories, events] = await Promise.all([
      githubRequest(`/users/${encoded}`),
      githubRequest(`/users/${encoded}/repos?sort=updated&per_page=20&type=owner`),
      githubRequest(`/users/${encoded}/events/public?per_page=100`),
    ]);

    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const pushEvents30d = events.filter(
      (event) =>
        event.type === "PushEvent" &&
        new Date(event.created_at).getTime() >= since
    ).length;

    res.json({
      success: true,
      connected: true,
      profile: {
        login: profile.login,
        name: profile.name,
        avatarUrl: profile.avatar_url,
        profileUrl: profile.html_url,
        publicRepos: profile.public_repos,
        followers: profile.followers,
      },
      repositories: repositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        url: repo.html_url,
        language: repo.language,
        stars: repo.stargazers_count,
        updatedAt: repo.updated_at,
      })),
      publicActivity: { windowDays: 30, pushEvents: pushEvents30d },
      limitations:
        "Only public GitHub data is shown. Private activity and the contribution calendar require GitHub authorization.",
    });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({
        success: false,
        message: "GitHub took too long to respond. Try again.",
      });
    }

    res.status(error.status || 502).json({
      success: false,
      message: error.message || "Unable to load GitHub data.",
    });
  }
});

router.post("/connect", async (req, res) => {
  const username =
    typeof req.body.username === "string"
      ? req.body.username.trim().toLowerCase()
      : "";

  if (!/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/.test(username)) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid GitHub username.",
    });
  }

  try {
    await githubRequest(`/users/${encodeURIComponent(username)}`);
    req.user.githubUsername = username;
    await req.user.save();

    res.json({ success: true, username });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({
        success: false,
        message: "GitHub took too long to respond. Try again.",
      });
    }

    res.status(error.status || 502).json({
      success: false,
      message: error.message || "Unable to verify this GitHub account.",
    });
  }
});

router.delete("/connect", async (req, res) => {
  req.user.githubUsername = "";
  await req.user.save();
  res.json({ success: true });
});

module.exports = router;