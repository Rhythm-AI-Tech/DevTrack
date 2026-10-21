import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "../utils/api";
import "./DeveloperAchievements.css";

function DeveloperAchievements() {
  const [achievements, setAchievements] = useState([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAchievements = useCallback(async () => {
    const token = localStorage.getItem("devtrack_token");
    if (!token) {
      setError("Sign in to track your achievements.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/achievements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || "Could not load achievements.");
      setAchievements(Array.isArray(data.achievements) ? data.achievements : []);
      setUnlockedCount(Number(data.unlockedCount) || 0);
    } catch (loadError) {
      setError(loadError.message || "Could not load achievements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAchievements(); }, [loadAchievements]);

  return (
    <section className="developer-achievements" aria-labelledby="developer-achievements-title">
      <header className="developer-achievements-heading">
        <div>
          <span className="developer-achievements-eyebrow">YOUR DEV JOURNEY</span>
          <h2 id="developer-achievements-title">Achievements</h2>
          <p>Milestones earned from your saved coding activity, language tags, profiles, and workspace.</p>
        </div>
        <div className="developer-achievements-count"><strong>{unlockedCount}</strong><span>/ {achievements.length || 7} unlocked</span></div>
      </header>

      {loading ? (
        <p className="developer-achievements-state" role="status">Checking your milestones…</p>
      ) : error ? (
        <div className="developer-achievements-state" role="status">
          <span>{error}</span>
          <button type="button" onClick={loadAchievements}>Retry</button>
        </div>
      ) : (
        <div className="developer-achievements-grid">
          {achievements.map((item) => {
            const percentage = item.target ? Math.min(100, Math.round((item.currentValue / item.target) * 100)) : 0;
            return (
              <article className={`developer-achievement-card ${item.unlocked ? "is-unlocked" : "is-locked"}`} key={item.id}>
                <div className="developer-achievement-card-top">
                  <span className="developer-achievement-icon" aria-hidden="true">{item.icon}</span>
                  <span className={`developer-achievement-state-pill ${item.unlocked ? "is-unlocked" : ""}`}>{item.unlocked ? "Unlocked" : "In progress"}</span>
                </div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <div className="developer-achievement-progress-meta">
                  <span>{item.unlocked ? "Milestone complete" : "Progress"}</span>
                  <strong>{Math.min(item.currentValue, item.target).toLocaleString()} / {item.target.toLocaleString()}</strong>
                </div>
                <div className="developer-achievement-progress" role="progressbar" aria-label={`${item.name} progress`} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${percentage}%` }} />
                </div>
                {item.unlocked && item.unlockedAt && <small>Unlocked {new Date(item.unlockedAt).toLocaleDateString()}</small>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default DeveloperAchievements;
