import devtrackLogo from "../assets/devtrack-logo.svg";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { registerUser, clearAuthError } from "../features/auth/authSlice";
import "./Auth.css";

function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, token } = useSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("devtrack_theme") || "dark";
    } catch {
      return "dark";
    }
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("devtrack_theme", theme);
    } catch {
      // Theme remains applied for this session when browser storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [token, navigate]);

  const handleChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));

    if (error) {
      dispatch(clearAuthError());
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const result = await dispatch(registerUser(formData));

    if (registerUser.fulfilled.match(result)) {
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <main className="auth-page" data-theme={theme}>
      <section className="auth-hero">
        <Link to="/register" className="auth-brand" aria-label="DevTracker home">
          <img src={devtrackLogo} alt="DevTracker" className="auth-brand-logo" />
        </Link>

        <div className="hero-content">
          <span className="hero-label">
            <span className="status-dot" />
            YOUR CODING SPACE
          </span>

          <h1>
            Hello, developer.
            <br />
            <span>Let's build your story.</span>
          </h1>

          <p>
            Start small, stay curious, and keep
            <br className="desktop-break" />
            track of how far you've come.
          </p>

          <div className="floating-tech tech-code">{"< />"} Code</div>
          <div className="floating-tech tech-dsa">
            DSA <span>↗</span>
          </div>
          <div className="floating-tech tech-build">✳ Build something</div>

          <div className="hero-visual" aria-hidden="true">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />

            <div className="mini-window">
              <div className="window-top">
                <span />
                <span />
                <span />
                <i>your-progress.js</i>
              </div>

              <div className="code-lines">
                <div>
                  <b>01</b> <span className="code-purple">const</span> progress
                  = <span className="code-blue">"growing"</span>;
                </div>
                <div>
                  <b>02</b> <span className="code-purple">function</span>{" "}
                  <span className="code-blue">keepGoing</span>() {"{"}
                </div>
                <div>
                  <b>03</b> &nbsp; learn();
                </div>
                <div>
                  <b>04</b> &nbsp; practice();
                </div>
                <div>
                  <b>05</b> {"}"}
                </div>
              </div>

              <div className="window-status">
                <span>
                  <i /> All systems ready
                </span>
                <span>● DevTracker</span>
              </div>
            </div>

            <div className="orbit-spark spark-one">✳</div>
            <div className="orbit-spark spark-two">✦</div>
            <div className="orbit-spark spark-three">⌘</div>
          </div>
        </div>

        <div className="hero-footer">
          <span>CODE. LEARN. BUILD.</span>
          <span>YOUR JOURNEY, YOUR PACE.</span>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-top">
          <span>Nice to meet you!</span>

          <button
            type="button"
            className="theme-toggle"
            onClick={() =>
              setTheme((current) => (current === "light" ? "dark" : "light"))
            }
            aria-label={`Switch to ${
              theme === "light" ? "dark" : "light"
            } mode`}
            aria-pressed={theme === "dark"}
          >
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
        </div>

        <div className="auth-card">
          {/* Star icon removed */}
          <div className="form-heading">
            <h2>Create your account</h2>
            <p>Start tracking your coding progress with DevTracker.</p>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="What should we call you?"
              value={formData.name}
              onChange={handleChange}
              autoComplete="name"
              minLength={2}
              maxLength={50}
              required
            />

            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />

            <div className="password-label-row">
              <label htmlFor="password">Password</label>
              <span className="password-hint">8 CHARACTERS MIN.</span>
            </div>

            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={8}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button className="auth-button" type="submit" disabled={loading}>
              <span>
                {loading ? "Creating account..." : "Create your account"}
              </span>
            </button>
          </form>

          <div className="auth-note">
            No platform connections needed to get started.
          </div>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in →</Link>
          </p>
        </div>

        <div className="form-bottom">
          <span>Made for curious minds.</span>
          <span>DevTracker ©</span>
        </div>
      </section>
    </main>
  );
}

export default Register;
