import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { API_BASE_URL, apiRequest } from "../utils/api";
import "./DeveloperIntegrationsHub.css";

function DeveloperIntegrationsHub({ providers = [] }) {
  const user = useSelector((state) => state.auth.user);
  const userId = user?._id || user?.id;
  const [credential, setCredential] = useState(null);
  const [freshKey, setFreshKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [webhooksEnabled, setWebhooksEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookBusy, setWebhookBusy] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest("/v1/keys").then((result) => {
      if (active) setCredential(result.credential);
    }).catch((error) => {
      if (active) setNotice(error.message || "Could not load API key status.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest("/v1/webhooks").then((result) => {
      if (!active) return;
      setWebhooksEnabled(Boolean(result.webhook?.enabled));
      setWebhookUrl(result.webhook?.targetUrl || "");
    }).catch((error) => {
      if (active) setNotice(error.message || "Could not load webhook settings.");
    });
    return () => { active = false; };
  }, []);

  async function saveWebhook(nextEnabled = webhooksEnabled) {
    setWebhookBusy(true);
    setNotice("");
    try {
      const result = await apiRequest("/v1/webhooks", {
        method: "PUT",
        body: { enabled: nextEnabled, targetUrl: webhookUrl.trim() },
      });
      setWebhooksEnabled(Boolean(result.webhook?.enabled));
      setWebhookUrl(result.webhook?.targetUrl || "");
      setNotice(nextEnabled
        ? "Webhook enabled. DevTracker will POST new problem events to this endpoint."
        : "Webhook delivery disabled.");
    } catch (error) {
      setNotice(error.message || "Could not save webhook settings.");
    } finally {
      setWebhookBusy(false);
    }
  }

  const badgeUrl = useMemo(() => userId ? `${API_BASE_URL}/v1/badge/${encodeURIComponent(userId)}` : "", [userId]);
  const markdown = badgeUrl ? `![DevTracker solutions](${badgeUrl})` : "";

  async function copy(value, label) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied to clipboard.`);
    } catch {
      setNotice("Clipboard access was blocked by your browser. Select and copy the text manually.");
    }
  }

  async function regenerate() {
    if (credential && !window.confirm("Regenerate your API key? The current key will stop working immediately.")) return;
    setBusy(true);
    setNotice("");
    try {
      const result = await apiRequest("/v1/keys/regenerate", { method: "POST", body: {} });
      setCredential(result.credential);
      setFreshKey(result.key);
      setReveal(true);
      setNotice(result.warning || "API key generated.");
    } catch (error) {
      setNotice(error.message || "Could not generate API key.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!window.confirm("Revoke this API key? Any integrations using it will stop working.")) return;
    setBusy(true);
    try {
      await apiRequest("/v1/keys", { method: "DELETE" });
      setCredential(null);
      setFreshKey("");
      setReveal(false);
      setNotice("API key revoked.");
    } catch (error) {
      setNotice(error.message || "Could not revoke API key.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="devhub" aria-labelledby="devhub-title">
      <header className="devhub-heading">
        <div><span className="devhub-eyebrow">BUILD ON DEVTRACK</span><h2 id="devhub-title">Developer Integrations Hub</h2><p>Manage profile connections, share your progress, and access your personal data API.</p></div>
        <span className="devhub-heading-mark" aria-hidden="true">⌘</span>
      </header>

      {notice && <p className="devhub-notice" role="status">{notice}</p>}

      <div className="devhub-section">
        <div className="devhub-section-title"><div><h3>Live connections</h3><p>Only synced accounts contribute external activity to the heatmap.</p></div><span>{providers.filter((provider) => provider.status === "verified").length} verified</span></div>
        <div className="devhub-connection-grid">
          {providers.filter((provider) => provider.mode !== "manual").map((provider) => {
            const connected = provider.status === "verified";
            return <article className="devhub-connection-card" key={provider.id}><span className={`devhub-status-dot ${connected ? "connected" : ""}`} /><div><strong>{provider.name}</strong><small>{connected ? `Verified · @${provider.username}` : provider.status === "public-unverified" ? "Public profile · ownership unverified" : provider.status === "pending" ? "Verification pending" : "Not connected"}</small></div><span className={`devhub-state ${connected ? "is-connected" : ""}`}>{connected ? "Connected" : "Disconnected"}</span></article>;
          })}
          {!providers.some((provider) => provider.mode !== "manual") && <p className="devhub-muted">Connect supported platforms above to see their status here.</p>}
        </div>
      </div>

      <div className="devhub-feature-grid">
        <article className="devhub-panel">
          <div className="devhub-panel-title"><span className="devhub-panel-icon">▧</span><div><h3>Profile README badge</h3><p>Live SVG badge for your GitHub profile README.</p></div></div>
          {badgeUrl ? <><div className="devhub-badge-preview"><img src={badgeUrl} alt="DevTracker solutions badge preview" /></div><label htmlFor="devhub-badge-markdown">Markdown</label><textarea id="devhub-badge-markdown" className="devhub-code-field" value={markdown} readOnly rows={2} /><button className="devhub-primary-button" type="button" onClick={() => copy(markdown, "Badge Markdown")}>Copy Markdown</button><a className="devhub-text-link" href={badgeUrl} target="_blank" rel="noreferrer">Open badge SVG ↗</a></> : <p className="devhub-muted">Sign in again to generate your personal badge URL.</p>}
          <small className="devhub-footnote">The badge reports imported/synced solutions only; manually entered problems are excluded.</small>
        </article>

        <article className="devhub-panel">
          <div className="devhub-panel-title"><span className="devhub-panel-icon">⌘</span><div><h3>API credentials</h3><p>Access your tracked problem records programmatically.</p></div></div>
          {loading ? <p className="devhub-muted">Checking credential status…</p> : credential ? <><div className="devhub-credential-meta"><span>Key prefix</span><code>{credential.prefix}••••••••</code><span>Created</span><code>{credential.createdAt ? new Date(credential.createdAt).toLocaleDateString() : "—"}</code></div>{freshKey && <><label htmlFor="devhub-api-key">New API key · copy it now</label><div className="devhub-secret-row"><input id="devhub-api-key" type={reveal ? "text" : "password"} value={freshKey} readOnly autoComplete="off" /><button type="button" onClick={() => setReveal((value) => !value)}>{reveal ? "Hide" : "Reveal"}</button><button type="button" onClick={() => copy(freshKey, "API key")}>Copy</button></div><p className="devhub-warning">For security, the full key is shown only in this session. It cannot be recovered after leaving this page.</p></> }<div className="devhub-button-row"><button className="devhub-primary-button" type="button" disabled={busy} onClick={regenerate}>{busy ? "Working…" : "Regenerate key"}</button><button className="devhub-danger-button" type="button" disabled={busy} onClick={revoke}>Revoke</button></div></> : <><p className="devhub-muted">No API key exists yet. Generate one to authenticate requests to the activity API.</p><button className="devhub-primary-button" type="button" disabled={busy} onClick={regenerate}>{busy ? "Generating…" : "Generate API key"}</button></>}
          <div className="devhub-api-example"><span>Example request</span><code>GET /api/v1/data/activity</code><small>Send your key in the <code>x-api-key</code> header. Never put it in client-side public code.</small></div>
        </article>
      </div>

      <div className="devhub-webhook-row">
        <div className="devhub-webhook-copy">
          <strong>Webhook event delivery</strong>
          <p>Send a JSON <code>problem.created</code> event when you log a new problem. Use an HTTPS endpoint you control.</p>
          <label className="devhub-webhook-label" htmlFor="devhub-webhook-url">Destination URL</label>
          <input id="devhub-webhook-url" className="devhub-webhook-input" type="url" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://your-service.example/webhooks/devtracker" autoComplete="url" />
          <div className="devhub-button-row">
            <button type="button" className="devhub-primary-button" disabled={webhookBusy} onClick={() => saveWebhook(true)}>{webhookBusy ? "Saving…" : "Save & enable"}</button>
            <button type="button" className="devhub-secondary-button" disabled={webhookBusy || !webhooksEnabled} onClick={() => saveWebhook(false)}>Disable delivery</button>
          </div>
          <small>Delivery is best-effort with a 5-second timeout. Avoid placing secrets in the URL.</small>
        </div>
        <span className={`devhub-switch ${webhooksEnabled ? "enabled" : ""}`} role="status" aria-label={webhooksEnabled ? "Webhooks enabled" : "Webhooks disabled"}><span /></span>
      </div>
    </section>
  );
}

export default DeveloperIntegrationsHub;
