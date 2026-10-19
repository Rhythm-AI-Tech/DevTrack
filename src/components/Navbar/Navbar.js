import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../features/auth/authSlice";
import "./Navbar.css";

const API_URL = "http://localhost:5000/api";

function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user = useSelector((state) => state.auth.user);
  const reduxToken = useSelector((state) => state.auth.token);

  const [streak, setStreak] = useState(null);
  const [openPanel, setOpenPanel] = useState(null);

  const navbarRightRef = useRef(null);

  // Load the real streak from the authenticated dashboard API.
  useEffect(() => {
    const controller = new AbortController();
    const storedToken = localStorage.getItem("devtrack_token");
    const token = reduxToken || storedToken;

    if (!token || token === "undefined" || token === "null") {
      setStreak(null);
      return () => controller.abort();
    }

    async function loadStreak() {
      try {
        const response = await fetch(`${API_URL}/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Dashboard API returned ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !data.stats) {
          throw new Error("Invalid dashboard response.");
        }

        if (!controller.signal.aborted) {
          setStreak(data.stats.currentStreak ?? 0);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Could not load coding streak:", error);
          if (!controller.signal.aborted) setStreak(null);
        }
      }
    }

    loadStreak();

    return () => controller.abort();
  }, [reduxToken]);

  // Close popovers on outside click or Escape.
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!navbarRightRef.current?.contains(event.target)) {
        setOpenPanel(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpenPanel(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    setOpenPanel(null);
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  const togglePanel = (panel) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  const displayName = user?.name || "Developer";
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "D";

  return (
    <header className="navbar">
      <div className="navbar-search">
        <input
          type="search"
          placeholder="Search anything..."
          aria-label="Search DevTrack"
        />
      </div>

      <div className="navbar-right" ref={navbarRightRef}>
        <div className="navbar-streak" title="Your current coding streak">
          <span aria-hidden="true">🔥</span>
          <span>
            {streak === null ? "—" : streak}
            <small>day streak</small>
          </span>
        </div>

        <div className="navbar-popover-wrap">
          <button
            type="button"
            className="navbar-icon-button notification-trigger"
            aria-label="Notifications"
            aria-expanded={openPanel === "notifications"}
            aria-haspopup="dialog"
            onClick={() => togglePanel("notifications")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
          </button>

          {openPanel === "notifications" && (
            <section
              className="navbar-popover notification-popover"
              role="dialog"
              aria-label="Notifications"
            >
              <div className="popover-heading">
                <div>
                  <h3>Notifications</h3>
                  <p>Updates from your workspace</p>
                </div>
                <span className="popover-neutral-badge">Inbox</span>
              </div>

              <div className="notification-empty">
                <span className="notification-empty-icon" aria-hidden="true">
                  <span className="notification-empty-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                      <path d="M10 21h4" />
                    </svg>
                  </span>
                </span>
                <strong>You're all caught up</strong>
                <p>
                  Notifications will appear here when activity updates and
                  platform sync events are available.
                </p>
              </div>
            </section>
          )}
        </div>

        <div className="navbar-popover-wrap">
          <button
            type="button"
            className="navbar-profile-trigger"
            aria-expanded={openPanel === "profile"}
            aria-haspopup="menu"
            onClick={() => togglePanel("profile")}
          >
            <span className="navbar-avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="navbar-profile-name">{displayName}</span>
            <span className="navbar-chevron" aria-hidden="true">
              ⌄
            </span>
          </button>

          {openPanel === "profile" && (
            <div className="navbar-popover profile-popover" role="menu">
              <div className="profile-summary">
                <span
                  className="navbar-avatar profile-avatar-large"
                  aria-hidden="true"
                >
                  {initials}
                </span>
                <div>
                  <strong>{displayName}</strong>
                  <span>{user?.email || "DevTrack account"}</span>
                </div>
              </div>

              <div className="popover-divider" />

              <Link
                to="/settings"
                className="profile-menu-item"
                role="menuitem"
                onClick={() => setOpenPanel(null)}
              >
                <span aria-hidden="true">⚙</span>
                Account settings
                <span className="menu-item-arrow">→</span>
              </Link>

              <button
                type="button"
                className="profile-menu-item profile-logout"
                role="menuitem"
                onClick={handleLogout}
              >
                <span aria-hidden="true">↪</span>
                Log out
                <span className="menu-item-arrow">→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
