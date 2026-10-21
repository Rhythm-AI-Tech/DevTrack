import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { githubConnectionUpdated } from "../features/auth/authSlice";
import { apiRequest } from "../utils/api";
import "./WorkspacePages.css";

function GitHub() {
  const dispatch = useDispatch();
  const [summary, setSummary] = useState(null);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");

    try {
      const data = await apiRequest("/github");
      setSummary(data);
      setUsername(data.profile?.login || "");
      setStatus("ready");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("failed");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const connect = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiRequest("/github/connect", {
        method: "POST",
        body: { username },
      });

      dispatch(
        githubConnectionUpdated(username.trim().toLowerCase())
      );

      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    setSaving(true);
    setError("");

    try {
      await apiRequest("/github/connect", {
        method: "DELETE",
      });

      dispatch(githubConnectionUpdated(""));
      setSummary({ success: true, connected: false });
      setUsername("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="workspace-page">
        <p role="status">Loading GitHub data…</p>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <header className="workspace-heading">
        <div>
          <span className="workspace-eyebrow">
            PUBLIC PROFILE DATA
          </span>
          <h1>GitHub</h1>
          <p>
            See public repositories and recent public push activity from
            GitHub.
          </p>
        </div>

        {summary?.connected && (
          <button
            className="workspace-secondary"
            type="button"
            onClick={load}
          >
            Refresh
          </button>
        )}
      </header>

      {error && (
        <p className="workspace-alert" role="alert">
          {error}
          <button type="button" onClick={load}>
            Retry
          </button>
        </p>
      )}

      {!summary?.connected ? (
        <section className="workspace-empty github-connect-card">
          <h2>Link a public GitHub profile</h2>
          <p>
            Enter a username to load its public profile, repositories,
            and recent public push events. This does not grant access to
            private repositories.
          </p>

          <form
            className="github-connect-form"
            onSubmit={connect}
          >
            <label>
              GitHub username
              <input
                required
                maxLength={39}
                autoComplete="off"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="octocat"
              />
            </label>

            <button
              className="workspace-primary"
              disabled={saving}
              type="submit"
            >
              {saving ? "Checking…" : "Link public profile"}
            </button>
          </form>

          <small>
            GitHub’s unauthenticated API has a shared rate limit. Private
            contributions are not available in this mode.
          </small>
        </section>
      ) : (
        <>
          <section className="github-overview">
            <div className="github-profile-card">
              {summary.profile?.avatarUrl && (
                <img
                  src={summary.profile.avatarUrl}
                  alt=""
                />
              )}

              <div>
                <span className="workspace-eyebrow">
                  LINKED PUBLIC PROFILE
                </span>
                <h2>
                  {summary.profile.name ||
                    summary.profile.login}
                </h2>

                <a
                  href={summary.profile.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  @{summary.profile.login} ↗
                </a>
              </div>

              <button
                className="workspace-secondary"
                type="button"
                onClick={disconnect}
                disabled={saving}
              >
                Disconnect
              </button>
            </div>

            <div className="github-stat-grid">
              <article>
                <span>Public repositories</span>
                <strong>{summary.profile.publicRepos}</strong>
              </article>

              <article>
                <span>Followers</span>
                <strong>{summary.profile.followers}</strong>
              </article>

              <article>
                <span>Public push events · 30 days</span>
                <strong>{summary.publicActivity.pushEvents}</strong>
              </article>
            </div>
          </section>

          <p className="github-limitation">
            {summary.limitations} GitHub’s public events feed is limited
            and can omit older or private activity; this is not a full
            contribution count.
          </p>

          <section className="github-repos">
            <div className="workspace-section-heading">
              <div>
                <span className="workspace-eyebrow">
                  UPDATED REPOSITORIES
                </span>
                <h2>Repositories</h2>
                <p>
                  Most recently updated public repositories owned by this
                  account.
                </p>
              </div>
            </div>

            {summary.repositories.length ? (
              <div className="repo-grid">
                {summary.repositories.map((repo) => (
                  <article className="repo-card" key={repo.id}>
                    <div className="repo-card-heading">
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {repo.name} ↗
                      </a>
                      <span>★ {repo.stars}</span>
                    </div>

                    <p>
                      {repo.description ||
                        "No repository description."}
                    </p>

                    <div className="repo-card-meta">
                      <span>
                        {repo.language ||
                          "Language not specified"}
                      </span>

                      <time dateTime={repo.updatedAt}>
                        Updated{" "}
                        {new Date(
                          repo.updatedAt
                        ).toLocaleDateString()}
                      </time>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="workspace-empty">
                This profile has no public repositories to show.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default GitHub;