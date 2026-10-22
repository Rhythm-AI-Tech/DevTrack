import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProblems } from "../features/coding/codingSlice";
import {
  selectProblems,
  selectStatus,
  selectError,
} from "../features/coding/codingSelectors";
import "./Dashboard.css";
import DashboardAnalytics from "../components/DashboardAnalytics";
import PlatformDropdown from "../components/PlatformDropdown";
import DeveloperAchievements from "../components/DeveloperAchievements";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const icons = {
  code: (
    <>
      <path d="m8 8-4 4 4 4" />
      <path d="m16 8 4 4-4 4" />
      <path d="m14 4-4 16" />
    </>
  ),
  flame: (
    <path d="M12 22c4.4 0 7-3 7-7 0-3-2-5-4-7 0 3-1 4-2 5 0-5-3-8-5-10 0 5-1 7-2 10-2 5 1 9 6 9Z" />
  ),
  github: (
    <>
      <path d="M9 19c-4.5 1.4-4.5-2.5-6.5-3" />
      <path d="M15 21v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.7a5.2 5.2 0 0 0-1.4-3.6 4.8 4.8 0 0 0-.1-3.6S17.6.3 15 2.1a13.1 13.1 0 0 0-6 0C6.4.3 5.2.6 5.2.6a4.8 4.8 0 0 0-.1 3.6 5.2 5.2 0 0 0-1.4 3.6c0 5.2 3.2 6.4 6.2 6.7A3.4 3.4 0 0 0 9 17.1V21" />
    </>
  ),
  folder: (
    <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  ),
};

function Icon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

function getProblemKey(problem) {
  const platform = String(problem.platform || "Other")
    .trim()
    .toLowerCase();

  const title = String(problem.name || problem.title || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (title) return `${platform}::${title}`;

  const url = String(problem.problemUrl || "")
    .trim()
    .toLowerCase()
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");

  if (url) return `${platform}::url:${url}`;

  return `${platform}::id:${problem.id || problem._id || ""}`;
}

const normalizePlatform = (value) =>
  String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const PLATFORM_NAMES = {
  leetcode: "LeetCode",
  codeforces: "Codeforces",
  atcoder: "AtCoder",
  codewars: "Codewars",
  geeksforgeeks: "GeeksforGeeks",
  hackerrank: "HackerRank",
};

const PLATFORM_PROFILE_URLS = {
  leetcode: "https://leetcode.com/u/",
  codeforces: "https://codeforces.com/profile/",
  atcoder: "https://atcoder.jp/users/",
  codewars: "https://www.codewars.com/users/",
  geeksforgeeks: "https://www.geeksforgeeks.org/user/",
  hackerrank: "https://www.hackerrank.com/profile/",
};

const EMPTY_PROFILE_STATS = {};

function Dashboard() {
  const dispatch = useDispatch();

  const problems = useSelector(selectProblems);
  const problemStatus = useSelector(selectStatus);
  const problemError = useSelector(selectError);

  const [stats, setStats] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [retry, setRetry] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");

  const loadDashboard = useCallback(async (signal) => {
    const token = localStorage.getItem("devtrack_token");

    if (!token) {
      setDashboardError("Your session is missing. Please sign in again.");
      setLoadingDashboard(false);
      return;
    }

    setLoadingDashboard(true);
    setDashboardError("");

    try {
      const response = await fetch(`${API_URL}/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load dashboard.");
      }

      if (!data.success || !data.stats) {
        throw new Error("The dashboard returned an invalid response.");
      }

      setStats(data.stats);
    } catch (err) {
      if (err.name !== "AbortError") {
        setDashboardError(
          err.message === "Failed to fetch"
            ? "Cannot connect to the server. Check that the backend is running."
            : err.message
        );
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingDashboard(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadDashboard(controller.signal);

    return () => controller.abort();
  }, [loadDashboard, retry]);

  useEffect(() => {
    if (problemStatus === "idle") {
      dispatch(fetchProblems());
    }
  }, [dispatch, problemStatus]);

  // Always derive the dashboard's DSA totals from the same saved
  // records that the Coding page displays.
  const uniqueProblems = useMemo(() => {
    const unique = new Map();

    for (const problem of Array.isArray(problems) ? problems : []) {
      const key = getProblemKey(problem);

      if (!unique.has(key)) {
        unique.set(key, problem);
      }
    }

    return [...unique.values()];
  }, [problems]);

  // Only persisted linked profiles are eligible for the dashboard selector.
  // A public-link-only integration is shown only after the user explicitly saved it.
  const verifiedPlatforms = useMemo(() => {
    const input = Array.isArray(stats?.verifiedPlatforms)
      ? stats.verifiedPlatforms
      : [];
    const seen = new Set();

    return input
      .filter((item) => {
        const id = normalizePlatform(item.id || item.platform);
        const allowed = Boolean(PLATFORM_NAMES[id]);
        const linked = ["verified", "public"].includes(item.mode);
        const hasHandle = Boolean(String(item.username || "").trim());
        const storedStats = item.stats && typeof item.stats === "object" && Object.keys(item.stats).length > 0;
        const hasSuccessfulSnapshot = Boolean(item.lastSyncedAt || storedStats);
        if (!allowed || !linked || !hasHandle || !hasSuccessfulSnapshot || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((item) => {
        const id = normalizePlatform(item.id || item.platform);
        const username = String(item.username || "").trim();
        return {
          ...item,
          id,
          name: PLATFORM_NAMES[id],
          username,
          profileUrl:
            item.profileUrl ||
            `${PLATFORM_PROFILE_URLS[id]}${encodeURIComponent(username)}`,
        };
      })
      .sort((a, b) => Object.keys(PLATFORM_NAMES).indexOf(a.id) - Object.keys(PLATFORM_NAMES).indexOf(b.id));
  }, [stats]);

  const platformOptions = useMemo(
    () => verifiedPlatforms.map((profile) => ({
      value: profile.name,
      label: profile.name,
    })),
    [verifiedPlatforms]
  );

  useEffect(() => {
    if (!platformOptions.length) {
      if (selectedPlatform) setSelectedPlatform("");
      return;
    }

    const selectionExists = platformOptions.some(
      (option) => option.value === selectedPlatform
    );

    if (!selectionExists) {
      setSelectedPlatform(platformOptions[0].value);
    }
  }, [platformOptions, selectedPlatform]);

  const selectedProfile =
    verifiedPlatforms.find((item) => item.name === selectedPlatform) || null;
  const selectedProfileStats = selectedProfile?.stats || EMPTY_PROFILE_STATS;

  const filteredProblems = useMemo(() => {
    if (!selectedProfile) return [];

    return uniqueProblems.filter(
      (problem) =>
        normalizePlatform(problem.platform) === selectedProfile.id
    );
  }, [uniqueProblems, selectedProfile]);

  const hasLiveLeetCodeDifficulty = Boolean(
    selectedProfile?.id === "leetcode" &&
    ["easy", "medium", "hard"].every((key) => {
      const value = selectedProfileStats[key] ?? selectedProfileStats[key[0].toUpperCase() + key.slice(1)];
      return value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0;
    })
  );

  const difficultyCounts = useMemo(() => {
    if (hasLiveLeetCodeDifficulty) {
      return {
        Easy: Number(selectedProfileStats.easy ?? selectedProfileStats.Easy) || 0,
        Medium: Number(selectedProfileStats.medium ?? selectedProfileStats.Medium) || 0,
        Hard: Number(selectedProfileStats.hard ?? selectedProfileStats.Hard) || 0,
      };
    }

    return filteredProblems.reduce(
      (counts, problem) => {
        const difficulty = String(problem.difficulty || "").toLowerCase();
        if (difficulty === "easy") counts.Easy += 1;
        if (difficulty === "medium") counts.Medium += 1;
        if (difficulty === "hard") counts.Hard += 1;
        return counts;
      },
      { Easy: 0, Medium: 0, Hard: 0 }
    );
  }, [filteredProblems, hasLiveLeetCodeDifficulty, selectedProfileStats]);

  const trackedProblemCount = filteredProblems.length;
  const solvedCandidates = [
    selectedProfileStats.totalSolved,
    selectedProfileStats.solved,
    selectedProfileStats.completedChallenges,
    selectedProfileStats.totalCompleted,
    selectedProfileStats.uniqueSolvedInFetchedHistory,
    selectedProfileStats.uniqueChallengesInFetchedHistory,
  ];
  const savedProfileSolved = solvedCandidates.find(
    (value) =>
      value !== null &&
      value !== undefined &&
      value !== "" &&
      Number.isFinite(Number(value)) &&
      Number(value) >= 0
  );
  const selectedSolvedTotal =
    savedProfileSolved === undefined
      ? trackedProblemCount
      : Number(savedProfileSolved);

  const selectedHistory = useMemo(() => {
    if (!selectedProfile) return [];
    const byPlatform = stats?.activityHistoryByPlatform?.[selectedProfile.id];

    if (Array.isArray(byPlatform) && byPlatform.length) {
      return byPlatform.slice(-30);
    }

    const counts = new Map();
    for (const problem of filteredProblems) {
      if (!problem.solvedAt) continue;
      const date = new Date(problem.solvedAt);
      if (Number.isNaN(date.getTime())) continue;
      const key = date.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from({ length: 30 }, (_, offset) => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (29 - offset));
      const key = date.toISOString().slice(0, 10);
      return { date: key, count: counts.get(key) || 0 };
    });
  }, [selectedProfile, filteredProblems, stats]);

  const currentStreak = useMemo(() => {
    const serverPlatformStreak = selectedProfile
      ? stats?.currentStreakByPlatform?.[selectedProfile.id]
      : null;
    if (serverPlatformStreak !== null && serverPlatformStreak !== undefined) {
      return Number(serverPlatformStreak) || 0;
    }
    const profileStreak = selectedProfileStats.currentStreak ?? selectedProfileStats.streak;
    if (profileStreak !== null && profileStreak !== undefined && Number.isFinite(Number(profileStreak))) {
      return Number(profileStreak);
    }

    const dates = new Set(
      filteredProblems
        .map((problem) => problem.solvedAt ? new Date(problem.solvedAt) : null)
        .filter((date) => date && !Number.isNaN(date.getTime()))
        .map((date) => date.toISOString().slice(0, 10))
    );
    const cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);
    const key = (date) => date.toISOString().slice(0, 10);
    if (!dates.has(key(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
    let streak = 0;
    while (dates.has(key(cursor))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return streak;
  }, [filteredProblems, selectedProfile, selectedProfileStats, stats]);

  const isLeetCode = selectedProfile?.id === "leetcode";
  const isCodeforces = selectedProfile?.id === "codeforces";
  const contestRating =
    selectedProfileStats.contestRating ??
    selectedProfileStats.rating ??
    selectedProfileStats.currentRating;
  const maximumRating =
    selectedProfileStats.maxRating ??
    selectedProfileStats.highestRating ??
    selectedProfileStats.maxRatingReached;
  const officialRank =
    selectedProfileStats.rankName ??
    selectedProfileStats.rank ??
    selectedProfileStats.overallRank ??
    selectedProfileStats.title;
  const globalRanking =
    selectedProfileStats.globalRanking ??
    selectedProfileStats.globalRank ??
    selectedProfileStats.ranking;
  const topPercentage = selectedProfileStats.topPercentage;

  const platformCards = (() => {
    if (!selectedProfile) {
      return [
        { label: "Platform solutions", value: "—", description: "Connect a platform in Settings", icon: "code", color: "violet" },
        { label: "Contest rating", value: "—", description: "No profile selected", icon: "github", color: "blue" },
        { label: "Current streak", value: "—", description: "No platform selected", icon: "flame", color: "orange" },
        { label: "Platform rank", value: "—", description: "No platform selected", icon: "folder", color: "green" },
      ];
    }

    if (isLeetCode) {
      return [
        { label: "Total solved", value: selectedSolvedTotal.toLocaleString(), description: savedProfileSolved === undefined ? "Tracked LeetCode records only" : "LeetCode lifetime accepted problems", icon: "code", color: "violet" },
        { label: "Current streak", value: currentStreak.toLocaleString(), description: "LeetCode activity recorded in DevTracker", icon: "github", color: "blue" },
        { label: "Contest rating", value: contestRating == null ? "—" : Math.round(Number(contestRating)).toLocaleString(), description: Number(selectedProfileStats.contestsAttended || selectedProfileStats.attendedContestsCount || 0) ? `${selectedProfileStats.contestsAttended ?? selectedProfileStats.attendedContestsCount} contests attended` : "LeetCode contest profile rating", icon: "flame", color: "orange" },
        { label: "Global ranking", value: globalRanking == null ? "—" : Number(globalRanking).toLocaleString(), description: topPercentage == null ? "LeetCode contest ranking" : `Top ${Number(topPercentage).toFixed(2)}% globally`, icon: "folder", color: "green" },
      ];
    }

    if (isCodeforces) {
      return [
        { label: selectedProfileStats.uniqueSolvedInFetchedHistory !== undefined ? "Unique solved · fetched history" : "Total solved", value: selectedSolvedTotal.toLocaleString(), description: selectedProfileStats.uniqueSolvedInFetchedHistory !== undefined ? "Distinct accepted problems in the fetched history, not a lifetime total" : (savedProfileSolved === undefined ? "Tracked Codeforces records only" : "Codeforces account statistics"), icon: "code", color: "violet" },
        { label: "Current streak", value: currentStreak.toLocaleString(), description: "Codeforces activity recorded in DevTracker", icon: "github", color: "blue" },
        { label: "Contest rating", value: contestRating == null ? "Unrated" : Math.round(Number(contestRating)).toLocaleString(), description: "Current Codeforces rating", icon: "flame", color: "orange" },
        { label: "Official rank", value: officialRank || "Unrated", description: `Peak rating ${maximumRating == null ? "—" : Math.round(Number(maximumRating))} · @${selectedProfile.username}`, icon: "folder", color: "green" },
      ];
    }

    const tier = officialRank || selectedProfileStats.rank || selectedProfileStats.honor || "Not provided";
    return [
      { label: selectedProfileStats.uniqueSolvedInFetchedHistory !== undefined ? "Unique solved · fetched history" : (selectedProfileStats.metricsAvailable === false && savedProfileSolved === undefined ? "Profile solved total" : "Total solved"), value: selectedProfileStats.metricsAvailable === false && savedProfileSolved === undefined ? "—" : selectedSolvedTotal.toLocaleString(), description: selectedProfileStats.uniqueSolvedInFetchedHistory !== undefined ? "Distinct solved problems in fetched history, not a lifetime total" : (selectedProfileStats.metricsAvailable === false && savedProfileSolved === undefined ? "Automated metrics unavailable; open the public profile below" : (savedProfileSolved === undefined ? "Tracked records only" : (selectedProfileStats.statsAreLifetimeTotals === false ? "Fetched profile history; not a guaranteed lifetime total" : "Platform profile total"))), icon: "code", color: "violet" },
      { label: "Platform streak", value: currentStreak.toLocaleString(), description: "Calculated from this platform's saved activity", icon: "github", color: "blue" },
      { label: "Current tier", value: String(tier), description: "Latest available profile value", icon: "flame", color: "orange" },
      { label: "Profile handle", value: `@${selectedProfile.username}`, description: "Connected profile", icon: "folder", color: "green" },
    ];
  })();

  const difficultyTotal =
    difficultyCounts.Easy + difficultyCounts.Medium + difficultyCounts.Hard;

  const breakdown = [
    { label: "Easy", value: difficultyCounts.Easy, className: "easy" },
    { label: "Medium", value: difficultyCounts.Medium, className: "medium" },
    { label: "Hard", value: difficultyCounts.Hard, className: "hard" },
  ];

  const handleSync = async () => {
    const token = localStorage.getItem("devtrack_token");

    if (!token) {
      setRefreshMessage("Please sign in again.");
      return;
    }

    setRefreshing(true);
    setRefreshMessage("");

    try {
      if (selectedProfile?.id) {
        const response = await fetch(
          `${API_URL}/integrations/${encodeURIComponent(selectedProfile.id)}/sync`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || `${selectedProfile.name} sync failed.`);
        }

        setRefreshMessage(
          [data.message, data.warning].filter(Boolean).join(" ") ||
            `${selectedProfile.name} sync completed.`
        );
      } else {
        setRefreshMessage("Connect a platform in Settings before syncing its data.");
      }

      // Refresh both sources after sync.
      await dispatch(fetchProblems()).unwrap();
      await loadDashboard();
    } catch (err) {
      setRefreshMessage(
        err.message || "Refresh failed. Please try again."
      );

      // Still refresh local records even if external sync fails.
      dispatch(fetchProblems());
    } finally {
      setRefreshing(false);
    }
  };

  if (
    (loadingDashboard && !stats) ||
    problemStatus === "loading" ||
    problemStatus === "idle"
  ) {
    return (
      <div className="dt-dashboard">
        <div className="dt-loading">
          <span className="dt-spinner" />
          <p>Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (dashboardError || !stats) {
    return (
      <div className="dt-dashboard">
        <div className="dt-page-heading">
          <span className="dt-eyebrow">YOUR WORKSPACE</span>
          <h1>Dashboard</h1>
          <p>Your coding journey, all in one place.</p>
        </div>

        <div className="dt-error">
          <strong>We couldn't load your progress.</strong>
          <p>{dashboardError || problemError || "Dashboard statistics were unavailable."}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (problemStatus === "failed") {
    return (
      <div className="dt-dashboard">
        <div className="dt-error" role="alert">
          <strong>We couldn't load your saved problems.</strong>
          <p>{problemError || "Please try loading your coding history again."}</p>
          <button type="button" onClick={() => dispatch(fetchProblems())}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="dt-dashboard">
      <header className="dt-page-heading">
        <div>
          <span className="dt-eyebrow">YOUR WORKSPACE</span>
          <h1>Dashboard</h1>
          <p>Every problem solved is progress. Keep building.</p>
        </div>

        <div className="dt-heading-actions">
          <div className="dt-platform-filter">
            <span className="dt-platform-filter-label">Platform context</span>
            <PlatformDropdown
              options={platformOptions}
              value={selectedPlatform}
              onChange={setSelectedPlatform}
              disabled={!platformOptions.length}
              ariaLabel="Filter dashboard by coding platform"
              emptyLabel="No synced profiles"
            />
          </div>
          <button
            className="dt-refresh-button"
            type="button"
            disabled={refreshing}
            onClick={handleSync}
          >
            {refreshing ? "Syncing…" : "↻ Sync & refresh"}
          </button>

          <div className="dt-live-status">
            <span />
            {selectedProfile
              ? `${selectedProfile.mode === "verified" ? "Verified" : "Public profile"} · @${selectedProfile.username}`
              : "No platform linked"}
          </div>
        </div>
      </header>

      {refreshMessage && (
        <p className="dt-dashboard-footer" role="status">
          {refreshMessage}
        </p>
      )}

      <section className="dt-stats-grid" aria-label="Progress overview">
        {platformCards.map((card) => (
          <article
            className={`dt-stat-card ${card.muted ? "is-muted" : ""}`}
            key={card.label}
          >
            <div className="dt-stat-top">
              <span className={`dt-stat-icon ${card.color}`}>
                <Icon name={card.icon} />
              </span>

              {card.muted && (
                <span className="dt-coming-soon">Coming soon</span>
              )}
            </div>

            <p className="dt-stat-label">{card.label}</p>
            <h2>{card.value}</h2>
            <span className="dt-stat-description">{card.description}</span>
          </article>
        ))}
      </section>

      <DashboardAnalytics
        history={selectedHistory}
        counts={difficultyCounts}
        problems={filteredProblems}
        verifiedPlatforms={verifiedPlatforms}
        selectedPlatform={selectedPlatform}
      />

      <DeveloperAchievements />

      <section className="dt-activity-card">
        <div className="dt-section-heading">
          <div>
            <span className="dt-eyebrow">YOUR CODING PROGRESS</span>
            <h2>Problem breakdown</h2>
            <p>
              {selectedProfile ? (isLeetCode && hasLiveLeetCodeDifficulty ? "LeetCode's profile-wide accepted-problem counts, from the same snapshot as Total Solved." : `Explore saved ${selectedProfile.name} records by difficulty.`) : "Link a platform in Settings to view isolated metrics."}
            </p>
          </div>

          <div className="dt-total-badge">
            <strong>{isLeetCode && hasLiveLeetCodeDifficulty ? (difficultyCounts.Easy + difficultyCounts.Medium + difficultyCounts.Hard).toLocaleString() : trackedProblemCount.toLocaleString()}</strong>
            <span>{isLeetCode && hasLiveLeetCodeDifficulty ? "profile total" : "tracked"}</span>
          </div>
        </div>

        <div className="dt-breakdown">
          {breakdown.map((item) => {
            const percentage =
              difficultyTotal === 0 ? 0 : Math.round((item.value / difficultyTotal) * 100);

            return (
              <div className="dt-breakdown-row" key={item.label}>
                <div className="dt-breakdown-info">
                  <span
                    className={`dt-difficulty-dot ${item.className}`}
                  />
                  <span className="dt-difficulty-name">{item.label}</span>
                  <strong>{item.value}</strong>
                  <span className="dt-percentage">{percentage}%</span>
                </div>

                <div
                  className="dt-progress-track"
                  role="progressbar"
                  aria-label={`${item.label} problems`}
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span
                    className={`dt-progress-fill ${item.className}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {difficultyTotal === 0 && (
          <p className="dt-empty-note">
            Your progress will appear here as you track coding problems.
          </p>
        )}
      </section>

      <p className="dt-dashboard-footer">
        All dashboard cards and charts are scoped to the selected saved platform. Profile lifetime totals are shown separately from individual records imported or logged in DevTrack.
      </p>
    </main>
  );
}

export default Dashboard;
