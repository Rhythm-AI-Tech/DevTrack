import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../features/auth/authSlice";
import { fetchProblems } from "../../features/coding/codingSlice";
import { apiRequest } from "../../utils/api";
import "./Navbar.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const READ_NOTIFICATIONS_KEY = "devtrack_read_notifications";


const SEARCH_PAGES = [
  { id: "page-dashboard", type: "page", label: "Dashboard", detail: "Your progress and platform metrics", to: "/dashboard", icon: "▦", keywords: "home overview stats activity profile" },
  { id: "page-coding", type: "page", label: "Coding Log", detail: "Search and manage saved coding problems", to: "/coding", icon: "</>", keywords: "coding problems leetcode solved difficulty topics" },
  { id: "page-github", type: "page", label: "GitHub", detail: "Repositories and contribution activity", to: "/github", icon: "⌘", keywords: "github repositories commits contributions" },
  { id: "page-dsa", type: "page", label: "DSA Practice", detail: "Review practice by difficulty and topic", to: "/dsa", icon: "◇", keywords: "algorithms data structures topics practice" },
  { id: "page-projects", type: "page", label: "Projects", detail: "Project plans, repositories, and milestones", to: "/projects", icon: "▣", keywords: "build log portfolio repository milestone" },
  { id: "page-goals", type: "page", label: "Goals", detail: "Your coding targets and progress", to: "/goals", icon: "◎", keywords: "targets weekly problems streak goal" },
  { id: "page-settings", type: "page", label: "Settings", detail: "Account and platform connections", to: "/settings", icon: "⚙", keywords: "account preferences integrations profile" },
];

const normalizeSearch = (value) => String(value || "").toLowerCase().trim();
const searchScore = (result, query) => {
  const label = normalizeSearch(result.label);
  const text = normalizeSearch(`${result.label} ${result.detail || ""} ${result.searchText || ""}`);
  if (label === query) return 0;
  if (label.startsWith(query)) return 1;
  if (label.includes(query)) return 2;
  return text.includes(query) ? 3 : 99;
};

function makeSearchResults(query, data) {
  const normalized = normalizeSearch(query);
  const pageResults = SEARCH_PAGES.filter((page) => {
    if (!normalized) return ["page-dashboard", "page-coding", "page-projects", "page-goals"].includes(page.id);
    return normalizeSearch(`${page.label} ${page.detail} ${page.keywords}`).includes(normalized);
  });
  if (normalized.length < 2) return pageResults.slice(0, 7);

  const problemResults = (data.problems || []).map((problem) => {
    const id = String(problem._id || problem.id || "");
    const label = String(problem.title || problem.name || "Untitled problem");
    const topics = Array.isArray(problem.topics) ? problem.topics.join(" ") : String(problem.topics || problem.topic || "");
    const detail = [problem.platform || "Other", problem.difficulty || "Unknown", topics].filter(Boolean).join(" · ");
    return {
      id: `problem-${id}`, recordId: id, type: "problem", label, detail,
      to: `/coding/problem/${encodeURIComponent(id)}`, icon: "</>",
      searchText: `${label} ${detail} ${problem.notes || ""} ${problem.externalId || ""}`,
    };
  });
  const projectResults = (data.projects || []).map((project) => {
    const id = String(project._id || project.id || "");
    const label = String(project.name || "Untitled project");
    const detail = `Project · ${(project.status || "planned").replace(/-/g, " ")}${project.repositoryUrl ? " · Repository linked" : ""}`;
    return {
      id: `project-${id}`, recordId: id, type: "project", label, detail,
      to: `/projects?focus=${encodeURIComponent(id)}`, icon: "▣",
      searchText: `${label} ${project.description || ""} ${project.status || ""} ${project.repositoryUrl || ""} ${(project.milestones || []).map((milestone) => milestone.title).join(" ")}`,
    };
  });
  const goalResults = (data.goals || []).map((goal) => {
    const id = String(goal._id || goal.id || "");
    const label = String(goal.title || "Untitled goal");
    const detail = `Goal · ${goal.kind || "custom"}${goal.status ? ` · ${goal.status}` : ""}`;
    return {
      id: `goal-${id}`, recordId: id, type: "goal", label, detail,
      to: `/goals?focus=${encodeURIComponent(id)}`, icon: "◎",
      searchText: `${label} ${goal.description || ""} ${goal.kind || ""} ${goal.status || ""}`,
    };
  });

  return [...pageResults, ...problemResults, ...projectResults, ...goalResults]
    .filter((result) => searchScore(result, normalized) < 99)
    .sort((a, b) => searchScore(a, normalized) - searchScore(b, normalized))
    .slice(0, 12);
}

function readNotificationIds() {
  try {
    const value = JSON.parse(localStorage.getItem(READ_NOTIFICATIONS_KEY) || "[]");
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const reduxToken = useSelector((state) => state.auth.token);
  const [streak, setStreak] = useState(null);
  const [openPanel, setOpenPanel] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(readNotificationIds);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState(() => makeSearchResults("", {}));
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const searchWrapRef = useRef(null);
  const searchCacheRef = useRef({ loadedAt: 0, problems: [], projects: [], goals: [] });
  const searchFetchPromiseRef = useRef(null);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("devtrack_theme") === "light" ? "light" : "dark"; }
    catch { return "dark"; }
  });
  const navbarRightRef = useRef(null);
  const token = reduxToken || (typeof localStorage !== "undefined" ? localStorage.getItem("devtrack_token") : "");

  const loadWorkspaceUpdates = useCallback(async (signal) => {
    if (!token || token === "undefined" || token === "null") {
      setStreak(null);
      setNotifications([]);
      return;
    }
    setNotificationsLoading(true);
    setNotificationError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const dashboardUrl = `${API_URL}/dashboard?timeZone=${encodeURIComponent(timeZone)}`;
      const [dashboardResponse, integrationsResponse] = await Promise.all([
        fetch(dashboardUrl, { headers, signal }),
        fetch(`${API_URL}/integrations`, { headers, signal }).catch(() => null),
      ]);
      if (!dashboardResponse.ok) throw new Error("Could not refresh workspace activity.");
      const dashboard = await dashboardResponse.json();
      if (!dashboard.success || !dashboard.stats) throw new Error("The activity response was invalid.");
      const currentStreak = Number(dashboard.stats.currentStreak);
      setStreak(Number.isFinite(currentStreak) && currentStreak >= 0 ? currentStreak : 0);

      const items = [];
      if (currentStreak > 0) {
        items.push({
          id: `streak-${currentStreak}`,
          title: `${currentStreak}-day coding streak`,
          detail: currentStreak === 1 ? "Your coding activity is underway. Keep it going!" : "Your recent coding activity is keeping the streak alive.",
          time: "Current progress",
          type: "streak",
        });
      }
      if (integrationsResponse?.ok) {
        const integrationData = await integrationsResponse.json().catch(() => ({}));
        (Array.isArray(integrationData.providers) ? integrationData.providers : []).forEach((provider) => {
          if (provider.lastSyncedAt) {
            const stamp = new Date(provider.lastSyncedAt);
            if (!Number.isNaN(stamp.getTime())) {
              items.push({
                id: `sync-${provider.id || provider.name}-${stamp.toISOString()}`,
                title: `${provider.name || provider.id || "Platform"} synced`,
                detail: provider.lastSyncError ? `Last sync reported: ${provider.lastSyncError}` : "Your saved platform profile has a recent sync timestamp.",
                time: stamp.toLocaleString(),
                type: provider.lastSyncError ? "warning" : "sync",
              });
            }
          }
        });
      }
      setNotifications(items.slice(0, 8));
    } catch (error) {
      if (error.name !== "AbortError") setNotificationError(error.message || "Could not load updates.");
    } finally {
      if (!signal?.aborted) setNotificationsLoading(false);
    }
  }, [token]);

  const loadSearchRecords = useCallback(async () => {
    const cached = searchCacheRef.current;
    if (cached.loadedAt && Date.now() - cached.loadedAt < 10000) return cached;
    if (searchFetchPromiseRef.current) return searchFetchPromiseRef.current;

    const request = Promise.allSettled([
      apiRequest("/problems"),
      apiRequest("/projects"),
      apiRequest("/goals"),
    ]).then((responses) => {
      const next = { loadedAt: Date.now(), problems: [], projects: [], goals: [], failedCount: 0 };
      responses.forEach((response, index) => {
        if (response.status !== "fulfilled") {
          next.failedCount += 1;
          return;
        }
        const value = response.value || {};
        if (index === 0) next.problems = Array.isArray(value.problems) ? value.problems : [];
        if (index === 1) next.projects = Array.isArray(value.projects) ? value.projects : [];
        if (index === 2) next.goals = Array.isArray(value.goals) ? value.goals : [];
      });
      if (next.failedCount === 3) {
        next.loadedAt = 0;
        next.error = "Saved records could not be loaded. Check that the DevTracker backend is running.";
      } else if (next.failedCount > 0) {
        next.error = "Some record types could not be searched. Other available results are shown.";
      } else {
        next.error = "";
      }
      searchCacheRef.current = next;
      return next;
    }).finally(() => {
      searchFetchPromiseRef.current = null;
    });
    searchFetchPromiseRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const query = normalizeSearch(searchQuery);
    let current = true;
    if (query.length < 2) {
      setSearchError("");
      setSearchLoading(false);
      setSearchResults(makeSearchResults(query, {}));
      setActiveSearchIndex(-1);
      return undefined;
    }

    setSearchResults([]);
    setActiveSearchIndex(-1);
    setSearchLoading(true);
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      try {
        const data = await loadSearchRecords();
        if (!current) return;
        setSearchResults(makeSearchResults(query, data));
        setSearchError(data.error || "");
        setActiveSearchIndex(-1);
      } catch (error) {
        if (!current) return;
        setSearchResults(makeSearchResults(query, {}));
        setSearchError(error.message || "Saved records could not be searched.");
      } finally {
        if (current) setSearchLoading(false);
      }
    }, 180);

    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [searchOpen, searchQuery, loadSearchRecords]);

  const selectSearchResult = async (result) => {
    if (!result) return;
    setSearchOpen(false);
    setSearchQuery("");
    setActiveSearchIndex(-1);
    setOpenPanel(null);
    if (result.type === "problem") {
      try {
        await dispatch(fetchProblems()).unwrap();
        navigate(result.to);
      } catch {
        navigate("/coding");
      }
      return;
    }
    navigate(result.to);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "ArrowDown" && searchOpen && searchResults.length) {
      event.preventDefault();
      setActiveSearchIndex((index) => index >= searchResults.length - 1 ? 0 : index + 1);
    } else if (event.key === "ArrowUp" && searchOpen && searchResults.length) {
      event.preventDefault();
      setActiveSearchIndex((index) => index <= 0 ? searchResults.length - 1 : index - 1);
    } else if (event.key === "Enter" && searchOpen && searchResults.length) {
      event.preventDefault();
      selectSearchResult(searchResults[activeSearchIndex >= 0 ? activeSearchIndex : 0]);
    } else if (event.key === "Escape" && searchOpen) {
      event.preventDefault();
      setSearchOpen(false);
      setActiveSearchIndex(-1);
      searchInputRef.current?.blur();
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (!document.hidden) loadWorkspaceUpdates(controller.signal);
    };
    const invalidateSearchCache = () => { searchCacheRef.current.loadedAt = 0; };
    refresh();
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("devtrack:activity-updated", refresh);
    window.addEventListener("devtrack:activity-updated", invalidateSearchCache);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("devtrack:activity-updated", refresh);
      window.removeEventListener("devtrack:activity-updated", invalidateSearchCache);
    };
  }, [loadWorkspaceUpdates]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!navbarRightRef.current?.contains(event.target)) setOpenPanel(null);
      if (!searchWrapRef.current?.contains(event.target)) setSearchOpen(false);
    };
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        window.requestAnimationFrame(() => searchInputRef.current?.focus());
      }
      if (event.key === "Escape") {
        setOpenPanel(null);
        setSearchOpen(false);
        setActiveSearchIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("devtrack_theme", theme); } catch { /* Browser storage may be disabled. */ }
  }, [theme]);

  const handleLogout = () => {
    setOpenPanel(null);
    dispatch(logout());
    navigate("/login", { replace: true });
  };
  const togglePanel = (panel) => setOpenPanel((current) => current === panel ? null : panel);
  const displayName = user?.name || "Developer";
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "D";
  const unreadCount = useMemo(() => notifications.filter((item) => !readIds.has(item.id)).length, [notifications, readIds]);

  const markAllRead = () => {
    const next = new Set([...readIds, ...notifications.map((item) => item.id)]);
    setReadIds(next);
    try { localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify([...next])); } catch { /* Ignore unavailable storage. */ }
  };

  return (
    <header className="navbar">
      <div className={`navbar-search${searchOpen ? " is-open" : ""}`} ref={searchWrapRef}>
        <div className="navbar-search-field">
          <svg className="navbar-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.2 4.2" /></svg>
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Search pages, problems, projects…"
            aria-label="Search DevTracker"
            aria-autocomplete="list"
            aria-controls="navbar-search-results"
            aria-expanded={searchOpen}
            aria-activedescendant={activeSearchIndex >= 0 ? `navbar-search-result-${activeSearchIndex}` : undefined}
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }}
            onKeyDown={handleSearchKeyDown}
          />
          {!searchQuery && <kbd className="navbar-search-shortcut">Ctrl K</kbd>}
          {searchQuery && <button type="button" className="navbar-search-clear" aria-label="Clear search" onClick={() => { setSearchQuery(""); setSearchOpen(true); searchInputRef.current?.focus(); }}>×</button>}
        </div>
        {searchOpen && (
          <div className="navbar-search-results" id="navbar-search-results" role="listbox" aria-label="Search results">
            <div className="navbar-search-results-heading">
              <span>{normalizeSearch(searchQuery).length >= 2 ? "SEARCH RESULTS" : "QUICK NAVIGATION"}</span>
              <span>{searchLoading ? "Searching…" : searchResults.length ? `${searchResults.length} results` : ""}</span>
            </div>
            {searchError && <p className="navbar-search-message" role="status">{searchError}</p>}
            {searchResults.map((result, index) => (
              <button
                type="button"
                id={`navbar-search-result-${index}`}
                key={result.id}
                role="option"
                tabIndex={-1}
                aria-selected={activeSearchIndex === index}
                className={`navbar-search-result${activeSearchIndex === index ? " is-active" : ""}`}
                onMouseEnter={() => setActiveSearchIndex(index)}
                onClick={() => selectSearchResult(result)}
              >
                <span className={`navbar-search-result-icon ${result.type}`} aria-hidden="true">{result.icon}</span>
                <span className="navbar-search-result-copy"><strong>{result.label}</strong><small>{result.detail}</small></span>
                <span className="navbar-search-result-arrow" aria-hidden="true">↵</span>
              </button>
            ))}
            {!searchLoading && !searchResults.length && !searchError && (
              <div className="navbar-search-no-results"><strong>No results found</strong><span>Try a page name, problem title, topic, project, or goal.</span></div>
            )}
            <div className="navbar-search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>Enter</kbd> to open <kbd>Esc</kbd> to close</span></div>
          </div>
        )}
      </div>
      <div className="navbar-right" ref={navbarRightRef}>
        <div className="navbar-streak" title="Your current coding streak">
          <span aria-hidden="true">🔥</span>
          <span>{streak === null ? "—" : streak}<small>day streak</small></span>
        </div>
        <button type="button" className="navbar-icon-button navbar-theme-toggle"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}>
          <span aria-hidden="true">{theme === "dark" ? "☼" : "☾"}</span>
        </button>
        <div className="navbar-popover-wrap">
          <button type="button" className="navbar-icon-button notification-trigger"
            aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
            aria-expanded={openPanel === "notifications"} aria-haspopup="dialog"
            onClick={() => { togglePanel("notifications"); if (openPanel !== "notifications") loadWorkspaceUpdates(); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
            {unreadCount > 0 && <span className="navbar-notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>
          {openPanel === "notifications" && (
            <section className="navbar-popover notification-popover" role="dialog" aria-label="Notifications">
              <div className="popover-heading">
                <div><h3>Notifications</h3><p>Streak and platform sync updates</p></div>
                <button type="button" className="notification-refresh" onClick={() => loadWorkspaceUpdates()} disabled={notificationsLoading}>{notificationsLoading ? "Refreshing…" : "Refresh"}</button>
              </div>
              {notificationError && <p className="notification-error" role="alert">{notificationError}</p>}
              {notifications.length ? (
                <>
                  <div className="notification-list">
                    {notifications.map((item) => (
                      <article className={`notification-item ${readIds.has(item.id) ? "is-read" : "is-unread"}`} key={item.id}>
                        <span className={`notification-item-icon ${item.type}`} aria-hidden="true">{item.type === "streak" ? "🔥" : item.type === "warning" ? "!" : "↻"}</span>
                        <div><strong>{item.title}</strong><p>{item.detail}</p><small>{item.time}</small></div>
                      </article>
                    ))}
                  </div>
                  <button type="button" className="notification-mark-read" onClick={markAllRead}>Mark all as read</button>
                </>
              ) : !notificationsLoading && !notificationError ? (
                <div className="notification-empty">
                  <span className="notification-empty-icon" aria-hidden="true">✓</span>
                  <strong>You're all caught up</strong>
                  <p>No streak or platform sync updates yet. Log activity or sync a profile to see updates here.</p>
                </div>
              ) : null}
            </section>
          )}
        </div>
        <div className="navbar-popover-wrap">
          <button type="button" className="navbar-profile-trigger" aria-expanded={openPanel === "profile"} aria-haspopup="menu" onClick={() => togglePanel("profile")}>
            <span className="navbar-avatar" aria-hidden="true">{initials}</span>
            <span className="navbar-profile-name">{displayName}</span><span className="navbar-chevron" aria-hidden="true">⌄</span>
          </button>
          {openPanel === "profile" && (
            <div className="navbar-popover profile-popover" role="menu">
              <div className="profile-summary">
                <span className="navbar-avatar profile-avatar-large" aria-hidden="true">{initials}</span>
                <div><strong>{displayName}</strong><span>{user?.email || "DevTracker account"}</span></div>
              </div>
              <div className="popover-divider" />
              <Link to="/settings" className="profile-menu-item" role="menuitem" onClick={() => setOpenPanel(null)}>
                <span aria-hidden="true">⚙</span>Account settings<span className="menu-item-arrow">→</span>
              </Link>
              <button type="button" className="profile-menu-item profile-logout" role="menuitem" onClick={handleLogout}>
                <span aria-hidden="true">↪</span>Log out<span className="menu-item-arrow">→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
export default Navbar;
