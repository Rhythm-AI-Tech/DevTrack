
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProblems } from "../features/coding/codingSlice";
import {
  selectProblems,
  selectStatus,
  selectError,
} from "../features/coding/codingSelectors";
import "./Dashboard.css";

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

  const difficultyCounts = useMemo(() => {
    const counts = { Easy: 0, Medium: 0, Hard: 0 };

    for (const problem of uniqueProblems) {
      const difficulty = String(problem.difficulty || "").toLowerCase();

      if (difficulty === "easy") counts.Easy += 1;
      if (difficulty === "medium") counts.Medium += 1;
      if (difficulty === "hard") counts.Hard += 1;
    }

    return counts;
  }, [uniqueProblems]);

  const total = uniqueProblems.length;
  const leetcodeConnected = Boolean(stats?.leetcode?.connected);

  const breakdown = [
    { label: "Easy", value: difficultyCounts.Easy, className: "easy" },
    { label: "Medium", value: difficultyCounts.Medium, className: "medium" },
    { label: "Hard", value: difficultyCounts.Hard, className: "hard" },
  ];

  const cards = [
    {
      label: "DSA Problems",
      value: total,
      description: "Distinct problems tracked",
      icon: "code",
      color: "violet",
    },
    {
      label: "GitHub Commits",
      value: "—",
      description: "Integration coming next",
      icon: "github",
      color: "blue",
      muted: true,
    },
    {
      label: "Current Streak",
      value: stats?.currentStreak ?? 0,
      description: "Based on tracked history",
      icon: "flame",
      color: "orange",
    },
    {
      label: "Projects",
      value: "—",
      description: "Project tracking coming next",
      icon: "folder",
      color: "green",
      muted: true,
    },
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
      if (leetcodeConnected) {
        const response = await fetch(
          `${API_URL}/integrations/leetcode/sync`,
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
          throw new Error(data.message || "LeetCode sync failed.");
        }

        const warnings = Array.isArray(data.warnings)
          ? data.warnings.join(" ")
          : "";

        setRefreshMessage(
          [data.message, warnings].filter(Boolean).join(" ") ||
            "Sync completed."
        );
      } else {
        setRefreshMessage("Your saved DevTrack records have been refreshed.");
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
            {leetcodeConnected
              ? `Verified · @${stats.leetcode.username}`
              : "DevTrack tracking active"}
          </div>
        </div>
      </header>

      {refreshMessage && (
        <p className="dt-dashboard-footer" role="status">
          {refreshMessage}
        </p>
      )}

      <section className="dt-stats-grid" aria-label="Progress overview">
        {cards.map((card) => (
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

      <section className="dt-activity-card">
        <div className="dt-section-heading">
          <div>
            <span className="dt-eyebrow">YOUR CODING PROGRESS</span>
            <h2>Problem breakdown</h2>
            <p>
              Explore distinct problems tracked in DevTrack by difficulty.
            </p>
          </div>

          <div className="dt-total-badge">
            <strong>{total}</strong>
            <span>tracked</span>
          </div>
        </div>

        <div className="dt-breakdown">
          {breakdown.map((item) => {
            const percentage =
              total === 0 ? 0 : Math.round((item.value / total) * 100);

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

        {total === 0 && (
          <p className="dt-empty-note">
            Your progress will appear here as you track coding problems.
          </p>
        )}
      </section>

      <p className="dt-dashboard-footer">
        Your progress is based on distinct problem records saved in DevTrack.
        Connect and verify your LeetCode account in Settings to manage your
        platform integration.
      </p>
    </main>
  );
}

export default Dashboard;
