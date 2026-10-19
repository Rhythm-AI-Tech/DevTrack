
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function formatName(value) {
  return String(value || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function formatStats(stats) {
  if (!stats || typeof stats !== "object") return [];

  return Object.entries(stats)
    .filter(
      ([, value]) =>
        ["string", "number"].includes(typeof value) &&
        value !== "" &&
        Number.isFinite(typeof value === "number" ? value : 1)
    )
    .slice(0, 5)
    .map(([key, value]) => ({
      label: formatName(key),
      value:
        typeof value === "number" ? value.toLocaleString() : value,
    }));
}

function statusLabel(provider) {
  switch (provider.status) {
    case "verified":
      return "Verified";
    case "public-unverified":
      return "Public profile";
    case "pending":
      return "Verification pending";
    case "verification-expired":
      return "Verification expired";
    case "manual":
      return "Manual tracking";
    default:
      return "Not connected";
  }
}

function Settings() {
  const [providers, setProviders] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);

  const navigate = useNavigate();

  const request = useCallback(async (path, options = {}) => {
    const token = localStorage.getItem("devtrack_token");

    if (!token) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed. Please try again.");
    }

    return data;
  }, []);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await request("/integrations");
      const loadedProviders = data.providers || [];

      setProviders(loadedProviders);

      setUsernames((previous) => {
        const next = { ...previous };

        for (const provider of loadedProviders) {
          if (next[provider.id] === undefined) {
            next[provider.id] =
              provider.username || provider.pendingUsername || "";
          }
        }

        return next;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const runAction = async (provider, action, body = {}) => {
    setBusyProvider(provider.id);
    setNotice(null);

    try {
      const data = await request(
        `/integrations/${provider.id}/${action}`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      setNotice({
        type: "success",
        text: data.warning
          ? `${data.message} ${data.warning}`
          : data.message || "Action completed.",
      });

      await loadProviders();
    } catch (err) {
      setNotice({
        type: "error",
        text: err.message,
      });
    } finally {
      setBusyProvider("");
    }
  };

  // Public-profile connections no longer require a consent checkbox.
  // Verified platforms retain their existing ownership-verification flow.
  const startConnection = async (provider) => {
    const username = String(usernames[provider.id] || "").trim();

    if (!username) {
      setNotice({
        type: "error",
        text: `Enter your ${provider.name} username first.`,
      });
      return;
    }

    await runAction(provider, "connect", {
      username,
      trackPublicProfile: provider.mode === "public",
    });
  };

  if (loading) {
    return (
      <main className="settings-page settings-integrations-page">
        <p className="settings-loading">Loading integrations…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="settings-page settings-integrations-page">
        <header className="settings-heading">
          <span className="settings-eyebrow">SETTINGS</span>
          <h1>Platform integrations</h1>
        </header>

        <div className="settings-notice error" role="alert">
          {error}
        </div>

        <button
          className="settings-primary-button"
          type="button"
          onClick={loadProviders}
        >
          Try again
        </button>
      </main>
    );
  }

  const automaticCount = providers.filter(
    (provider) => provider.syncAvailable
  ).length;

  const verifiedCount = providers.filter(
    (provider) => provider.status === "verified"
  ).length;

  return (
    <main className="settings-page settings-integrations-page">
      <header className="settings-heading">
        <span className="settings-eyebrow">SETTINGS</span>
        <h1>Platform integrations</h1>
        <p>Connect and manage your coding platforms.</p>
      </header>

      <section className="integration-overview">
        <div>
          <span>Sync-enabled platforms</span>
          <strong>{automaticCount}</strong>
        </div>

        <div>
          <span>Verified accounts</span>
          <strong>{verifiedCount}</strong>
        </div>

        <div>
          <span>Total platforms</span>
          <strong>{providers.length}</strong>
        </div>
      </section>

      {notice && (
        <div
          className={`settings-notice ${notice.type}`}
          role="status"
        >
          {notice.text}
        </div>
      )}

      <div className="integration-grid">
        {providers.map((provider) => {
          const busy = busyProvider === provider.id;
          const isVerified = provider.status === "verified";
          const isPublic = provider.status === "public-unverified";

          const pending =
            provider.status === "pending" ||
            provider.status === "verification-expired";

          const statItems = formatStats(provider.stats);
          const account = provider.username || provider.pendingUsername;

          return (
            <section
              className="settings-card integration-card"
              key={provider.id}
            >
              <div className="settings-card-heading">
                <div className="settings-platform-mark">
                  {provider.name
                    .split(/[\s/]+/)
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div className="settings-platform-title">
                  <h2>{provider.name}</h2>
                </div>

                <span
                  className={`settings-status ${
                    isVerified
                      ? "connected"
                      : isPublic
                      ? "public-status"
                      : "disconnected"
                  }`}
                >
                  <span />
                  {statusLabel(provider)}
                </span>
              </div>

              {provider.syncAvailable ? (
                <>
                  {!isVerified && !isPublic && (
                    <form
                      className="settings-connect-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        startConnection(provider);
                      }}
                    >
                      <label htmlFor={`username-${provider.id}`}>
                        {provider.mode === "verified"
                          ? "Username"
                          : "Public profile username"}
                      </label>

                      <div className="settings-input-row">
                        <input
                          id={`username-${provider.id}`}
                          value={usernames[provider.id] || ""}
                          onChange={(event) =>
                            setUsernames((previous) => ({
                              ...previous,
                              [provider.id]: event.target.value,
                            }))
                          }
                          placeholder={`Enter ${provider.name} username`}
                          maxLength={100}
                          required
                          disabled={busy}
                        />

                        <button type="submit" disabled={busy}>
                          {busy
                            ? "Please wait…"
                            : provider.mode === "verified"
                            ? "Verify account"
                            : "Connect"}
                        </button>
                      </div>
                    </form>
                  )}

                  {pending && provider.verificationCode && (
                    <div className="settings-verification-panel">
                      <h3>Verify @{provider.pendingUsername}</h3>

                      <p>
                        Add this code to the{" "}
                        <strong>{provider.verificationField}</strong>{" "}
                        field on your profile, save it, then verify.
                      </p>

                      <code className="settings-verification-code">
                        {provider.verificationCode}
                      </code>

                      <div className="settings-actions">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => runAction(provider, "verify")}
                        >
                          Verify ownership
                        </button>

                        <button
                          type="button"
                          className="settings-secondary"
                          disabled={busy}
                          onClick={() =>
                            runAction(provider, "cancel-verification")
                          }
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {(isVerified || isPublic) && (
                    <div className="settings-connected-details">
                      <div className="settings-profile">
                        <div>
                          <strong>@{account}</strong>
                          <span>
                            {isVerified
                              ? "Verified account"
                              : "Public profile"}
                          </span>
                        </div>

                        {provider.profileUrl && account && (
                          <a
                            href={`${provider.profileUrl}${encodeURIComponent(
                              account
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View profile ↗
                          </a>
                        )}
                      </div>

                      {statItems.length > 0 && (
                        <div className="integration-stats">
                          {statItems.map((stat) => (
                            <div
                              className="integration-stat"
                              key={stat.label}
                            >
                              <span>{stat.label}</span>
                              <strong>{stat.value}</strong>
                            </div>
                          ))}
                        </div>
                      )}

                      {provider.lastSyncError && (
                        <p className="integration-error-text">
                          {provider.lastSyncError}
                        </p>
                      )}

                      <div className="settings-actions">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => runAction(provider, "sync")}
                        >
                          {busy ? "Syncing…" : "Sync now"}
                        </button>

                        <button
                          type="button"
                          className="settings-secondary"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Disconnect ${provider.name}? Previously imported records will be kept.`
                              )
                            ) {
                              runAction(provider, "disconnect");
                            }
                          }}
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="integration-manual">
                  <button
                    className="settings-secondary-button"
                    type="button"
                    onClick={() => navigate("/coding")}
                  >
                    Open Coding page
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}

export default Settings;
