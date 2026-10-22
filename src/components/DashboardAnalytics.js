import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../utils/api";
import "./DashboardAnalytics.css";

const normalizePlatform = (value) =>
  String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function metric(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  }
  return String(value);
}

function getCount(stats, key) {
  const value = stats?.[key] ?? stats?.[key[0].toUpperCase() + key.slice(1)];
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return null;
  }
  return Math.max(0, Number(value));
}

function ActivityBars({ history = [], platformLabel }) {
  const points = history.slice(-30);
  const max = Math.max(1, ...points.map((item) => Number(item.count) || 0));

  return (
    <section className="analytics-card analytics-chart-card">
      <div className="analytics-card-heading">
        <div>
          <span className="analytics-eyebrow">CONSISTENCY</span>
          <h2>{platformLabel} activity</h2>
          <p>Platform-specific recorded activity over the last 30 days</p>
        </div>
        <span className="analytics-chart-key"><i /> Records</span>
      </div>
      {points.length ? (
        <div className="analytics-bars" role="img" aria-label={`${platformLabel} daily activity bar chart`}>
          {points.map((point) => {
            const count = Number(point.count) || 0;
            return (
              <div className="analytics-bar-column" key={point.date} title={`${point.date}: ${count} ${platformLabel} record(s)`}>
                <span className="analytics-bar-value">{count || ""}</span>
                <div className="analytics-bar-track">
                  <i style={{ height: `${Math.max(count ? 8 : 2, count / max * 100)}%` }} />
                </div>
                <small>{point.date?.slice(8, 10)}</small>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="analytics-empty">Activity will appear after this platform has saved or synced records.</div>
      )}
    </section>
  );
}

function DifficultyDonut({ counts = {}, platformLabel }) {
  const easy = Number(counts.Easy) || 0;
  const medium = Number(counts.Medium) || 0;
  const hard = Number(counts.Hard) || 0;
  const total = easy + medium + hard;
  const easyPct = total ? easy / total * 100 : 0;
  const mediumPct = total ? medium / total * 100 : 0;
  const style = {
    background: total
      ? `conic-gradient(#22c55e 0 ${easyPct}%, #f59e0b ${easyPct}% ${easyPct + mediumPct}%, #f43f5e ${easyPct + mediumPct}% 100%)`
      : "conic-gradient(#3f3f46 0 100%)",
  };

  return (
    <section className="analytics-card analytics-difficulty-card">
      <div className="analytics-card-heading">
        <div>
          <span className="analytics-eyebrow">PROBLEM MIX</span>
          <h2>{platformLabel} difficulty</h2>
          <p>{platformLabel === "LeetCode" ? "Lifetime profile accepted-problem distribution when available" : "Distribution from records saved for this platform"}</p>
        </div>
      </div>
      <div className="analytics-donut-layout">
        <div className="analytics-donut" style={style} role="img" aria-label={`${easy} easy, ${medium} medium, ${hard} hard ${platformLabel} problems`}>
          <div><strong>{total.toLocaleString()}</strong><span>problems</span></div>
        </div>
        <div className="analytics-legend">
          {[
            { label: "Easy", value: easy, color: "easy" },
            { label: "Medium", value: medium, color: "medium" },
            { label: "Hard", value: hard, color: "hard" },
          ].map((item) => (
            <div key={item.label}>
              <span className={`analytics-legend-dot ${item.color}`} />
              <span>{item.label}</span>
              <strong>{item.value.toLocaleString()}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContributionHeatmap({ selectedPlatform }) {
  const [days, setDays] = useState([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPlatform) {
      setDays([]);
      setTotal(0);
      setMessage("Connect a platform in Settings to view its contribution activity.");
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setMessage("");
    apiRequest(`/v1/activity/heatmap?platform=${encodeURIComponent(selectedPlatform)}`, {
      signal: controller.signal,
    }).then((data) => {
      setDays(Array.isArray(data.days) ? data.days : []);
      setTotal(Number(data.total) || 0);
      setMessage("");
    }).catch((error) => {
      if (error.name !== "AbortError") {
        setDays([]);
        setTotal(0);
        setMessage("Could not load this platform's contribution activity. Try refreshing the dashboard.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [selectedPlatform]);

  const weeks = useMemo(() => {
    if (!days.length) return [];
    const padded = [...days];
    while (padded.length && new Date(`${padded[0].date}T00:00:00Z`).getUTCDay() !== 0) {
      const first = new Date(`${padded[0].date}T00:00:00Z`);
      first.setUTCDate(first.getUTCDate() - 1);
      padded.unshift({ date: first.toISOString().slice(0, 10), count: 0 });
    }
    const grouped = [];
    for (let index = 0; index < padded.length; index += 7) {
      grouped.push(padded.slice(index, index + 7));
    }
    return grouped;
  }, [days]);

  return (
    <section className="analytics-card analytics-heatmap-card">
      <div className="analytics-card-heading">
        <div>
          <span className="analytics-eyebrow">CONTRIBUTION HISTORY</span>
          <h2>{selectedPlatform || "Platform"} activity</h2>
          <p>Only saved records associated with the selected platform · last 365 days</p>
        </div>
        <strong className="analytics-heatmap-total">{total.toLocaleString()} <small>records</small></strong>
      </div>
      {message && <p className="analytics-empty" role="status">{message}</p>}
      {loading && <p className="analytics-empty" role="status">Loading {selectedPlatform} activity…</p>}
      <div className="analytics-heatmap-scroll">
        <div className="analytics-heatmap">
          {weeks.map((week, index) => (
            <div className="analytics-heatmap-week" key={`week-${index}`}>
              {week.map((day) => {
                const count = Number(day.count) || 0;
                const level = Math.min(4, count ? Math.ceil(Math.log2(count + 1)) : 0);
                return (
                  <span
                    key={day.date}
                    className={`analytics-heatmap-day level-${level}`}
                    title={`${day.date}: ${count} ${selectedPlatform} record(s)`}
                    aria-label={`${day.date}: ${count} records`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="analytics-heatmap-footer">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => <i key={level} className={`level-${level}`} />)}
        <span>More</span>
      </div>
    </section>
  );
}

function PlatformMetrics({ problems = [], verifiedPlatforms = [], selectedPlatform = "" }) {
  const platformId = normalizePlatform(selectedPlatform);
  const profile = verifiedPlatforms.find(
    (item) => normalizePlatform(item.id || item.platform) === platformId
  );
  const stats = profile?.stats || {};
  const platformProblems = problems.filter(
    (problem) => normalizePlatform(problem.platform) === platformId
  );
  const isLeetCode = platformId === "leetcode";
  const isCodeforces = platformId === "codeforces";
  const easyLive = getCount(stats, "easy");
  const mediumLive = getCount(stats, "medium");
  const hardLive = getCount(stats, "hard");
  const hasLiveDifficulty = isLeetCode && easyLive !== null && mediumLive !== null && hardLive !== null;
  const difficulty = hasLiveDifficulty
    ? { Easy: easyLive, Medium: mediumLive, Hard: hardLive }
    : platformProblems.reduce((counts, problem) => {
        const key = ["easy", "medium", "hard"].includes(String(problem.difficulty || "").toLowerCase())
          ? String(problem.difficulty).toLowerCase()
          : "unknown";
        if (key !== "unknown") counts[key[0].toUpperCase() + key.slice(1)] += 1;
        return counts;
      }, { Easy: 0, Medium: 0, Hard: 0 });
  const totalSolvedRaw = [stats.totalSolved, stats.solved, stats.completedChallenges, stats.totalCompleted, stats.uniqueSolvedInFetchedHistory, stats.uniqueChallengesInFetchedHistory]
    .find((value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0);
  const totalSolved = totalSolvedRaw === undefined
    ? (stats.metricsAvailable === false ? null : platformProblems.length)
    : Number(totalSolvedRaw);
  const rating = stats.contestRating ?? stats.rating ?? stats.currentRating;
  const maxRating = stats.maxRating ?? stats.highestRating ?? stats.maxRatingReached;
  const globalRanking = stats.globalRanking ?? stats.globalRank ?? stats.ranking;
  const topPercentage = stats.topPercentage;
  const rank = stats.rankName ?? stats.rank ?? stats.overallRank ?? stats.title;
  const profileUrl = profile?.profileUrl;

  return (
    <section className="analytics-card platform-metrics-card" aria-labelledby="platform-metrics-title">
      <div className="analytics-card-heading platform-metrics-heading">
        <div>
          <span className="analytics-eyebrow">PLATFORM INSIGHTS</span>
          <h2 id="platform-metrics-title">{profile?.name || selectedPlatform || "Connect a platform"}</h2>
          <p>{profile ? `Isolated statistics for @${profile.username}. No other platform totals are included.` : "Connect and save a platform profile in Settings to view its metrics."}</p>
        </div>
        {profileUrl && (
          <a className="platform-profile-link" href={profileUrl} target="_blank" rel="noopener noreferrer">
            View public profile ↗
          </a>
        )}
      </div>

      {!profile ? (
        <div className="analytics-empty">No linked platform is available yet. Open Settings and connect a profile.</div>
      ) : isLeetCode ? (
        <div className="platform-metric-body">
          <div className="platform-summary-number platform-summary-primary">
            <strong>{metric(totalSolved)}</strong>
            <span>LeetCode lifetime problems solved</span>
          </div>
          <div className="platform-difficulty-grid">
            {[
              { label: "Easy", value: difficulty.Easy, color: "easy" },
              { label: "Medium", value: difficulty.Medium, color: "medium" },
              { label: "Hard", value: difficulty.Hard, color: "hard" },
            ].map((item) => {
              const distributionTotal = difficulty.Easy + difficulty.Medium + difficulty.Hard;
              const percentage = distributionTotal ? item.value / distributionTotal * 100 : 0;
              return (
                <div className="platform-difficulty-item" key={item.label}>
                  <div><span className={`analytics-legend-dot ${item.color}`} /><span>{item.label}</span><strong>{metric(item.value)}</strong></div>
                  <div className="platform-difficulty-track"><i className={item.color} style={{ width: `${percentage}%` }} /></div>
                </div>
              );
            })}
          </div>
          <div className="platform-codeforces-grid">
            <div className="platform-summary-number"><strong>{rating == null ? "—" : metric(rating)}</strong><span>Contest rating</span></div>
            <div className="platform-summary-number"><strong>{globalRanking == null ? "—" : metric(globalRanking)}</strong><span>Global contest rank</span></div>
            <div className="platform-summary-number"><strong>{topPercentage == null ? "—" : `${Number(topPercentage).toFixed(2)}%`}</strong><span>Global top percentage</span></div>
            <div className="platform-summary-number"><strong>{metric(stats.attendedContestsCount ?? stats.contestsAttended)}</strong><span>Contests attended</span></div>
          </div>
          {Array.isArray(stats.contestHistory) && stats.contestHistory.length > 0 && (
            <div className="platform-contest-history">
              <h3>Recent contest ratings</h3>
              {stats.contestHistory.slice(-5).reverse().map((contest, index) => (
                <div className="platform-contest-row" key={`${contest.title || "contest"}-${contest.startTime || index}`}>
                  <span>{contest.title || "LeetCode contest"}</span>
                  <strong>{metric(contest.rating)}</strong>
                  {contest.ranking ? <small>Rank {metric(contest.ranking)}</small> : null}
                </div>
              ))}
            </div>
          )}
          {!hasLiveDifficulty && <p className="analytics-empty">LeetCode profile difficulty totals are not available in the saved snapshot. Use Sync & refresh to request an updated profile.</p>}
          {rating == null && <p className="analytics-empty">No LeetCode contest rating is available for this profile yet. This can happen before any ranked contest participation or when LeetCode does not return contest data.</p>}
        </div>
      ) : isCodeforces ? (
        <div className="platform-metric-body">
          <div className="platform-codeforces-grid">
            <div className="platform-summary-number"><strong>{metric(rating)}</strong><span>Current contest rating</span></div>
            <div className="platform-summary-number"><strong>{metric(maxRating)}</strong><span>Historical maximum rating</span></div>
            <div className="platform-summary-number"><strong>{rank || "Unrated"}</strong><span>Official Codeforces rank</span></div>
            <div className="platform-summary-number"><strong>{metric(totalSolved)}</strong><span>{stats.uniqueSolvedInFetchedHistory != null ? "Unique solved in fetched history" : "Solved / tracked count"}</span></div>
          </div>
          <p className="analytics-empty">Codeforces data is shown only for @{profile.username}. Rating values come from the latest saved official profile response; solved totals depend on sync support.</p>
        </div>
      ) : (
        <div className="platform-metric-body">
          <div className="platform-codeforces-grid">
            <div className="platform-summary-number"><strong>{metric(totalSolved)}</strong><span>{stats.uniqueSolvedInFetchedHistory != null ? "Unique solved in fetched history" : stats.metricsAvailable === false ? "Automated total unavailable" : "Platform solved total"}</span></div>
            <div className="platform-summary-number"><strong>{rank || "Not provided"}</strong><span>Tier / rank / honor</span></div>
            <div className="platform-summary-number"><strong>{metric(stats.rating ?? stats.honor)}</strong><span>Rating / honor</span></div>
            <div className="platform-summary-number"><strong>@{profile.username}</strong><span>Connected profile handle</span></div>
          </div>
          {profileUrl && <a className="platform-profile-link platform-profile-link-inline" href={profileUrl} target="_blank" rel="noopener noreferrer">Open {profile.name} profile ↗</a>}
          {stats.metricsAvailable === false && <p className="analytics-empty">This platform currently supports a saved public profile link, but not reliable public metrics. Use the button above to open the live profile.</p>}
        </div>
      )}
    </section>
  );
}

export default function DashboardAnalytics({
  history = [],
  counts = {},
  problems = [],
  verifiedPlatforms = [],
  selectedPlatform = "",
}) {
  const platformLabel = selectedPlatform || "Selected platform";
  return (
    <div className="dashboard-analytics">
      <PlatformMetrics
        problems={problems}
        verifiedPlatforms={verifiedPlatforms}
        selectedPlatform={selectedPlatform}
      />
      <div className="analytics-top-grid">
        <ActivityBars history={history} platformLabel={platformLabel} />
        <DifficultyDonut counts={counts} platformLabel={platformLabel} />
      </div>
      <ContributionHeatmap selectedPlatform={selectedPlatform} />
    </div>
  );
}
