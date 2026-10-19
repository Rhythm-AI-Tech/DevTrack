import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, clearAuthError } from "../features/auth/authSlice";
import "./Auth.css";
import devtrackLogo from "../assets/devtrack-logo.svg";

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, token } = useSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("devtrack-theme") || "light",
  );

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    localStorage.setItem("devtrack-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (token) navigate("/dashboard", { replace: true });
  }, [token, navigate]);

  const handleChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));

    if (error) dispatch(clearAuthError());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const result = await dispatch(loginUser(formData));

    if (loginUser.fulfilled.match(result)) {
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <main className="auth-page" data-theme={theme}>
      <section className="auth-hero">
        <Link to="/login" className="auth-brand" aria-label="DevTrack home">
          <img src={devtrackLogo} alt="DevTrack" className="auth-brand-logo" />
        </Link>

        <div className="hero-content">
          <span className="hero-label">
            <span className="status-dot" />
            YOUR CODING SPACE
          </span>

          <h1>
            Hello, developer.
            <br />
            <span>Ready to grow?</span>
          </h1>

          <p>
            Your problems, projects, and progress —
            <br className="desktop-break" />
            all in one simple place.
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
                  <b>01</b>
                  <span className="code-purple">const</span> progress ={" "}
                  <span className="code-blue">"growing"</span>;
                </div>
                <div>
                  <b>02</b>
                  <span className="code-purple">function</span>{" "}
                  <span className="code-blue">keepGoing</span>() {"{"}
                </div>
                <div>
                  <b>03</b> &nbsp; learn();
                </div>
                <div>
                  <b>04</b> &nbsp; practice();
                </div>
                <div>
                  <b>05</b>
                  {"}"}
                </div>
              </div>

              <div className="window-status">
                <span>
                  <i /> All systems ready
                </span>
                <span>● DevTrack</span>
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
          <span>Welcome back!</span>

          <button
            type="button"
            className="theme-toggle"
            onClick={() =>
              setTheme((current) => (current === "light" ? "dark" : "light"))
            }
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            aria-pressed={theme === "dark"}
          >
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
        </div>

        <div className="auth-card">
          <div className="form-heading">
            <h2>Welcome back!</h2>
            <p>Sign in to continue your coding journey.</p>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
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
              <button
                className="text-button"
                type="button"
                onClick={() => navigate("/forgot-password")}
              >
                Forgot password?
              </button>
            </div>

            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
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
              <span>{loading ? "Signing in..." : "Sign in to DevTrack"}</span>
            </button>
          </form>

          <div className="auth-note">
            No pressure to be perfect. Just keep making progress.
          </div>

          <p className="auth-footer">
            Don't have an account? <Link to="/register">Create one →</Link>
          </p>
        </div>

        <div className="form-bottom">
          <span>Made for curious minds.</span>
          <span>DEVTRACK ©</span>
        </div>
      </section>
    </main>
  );
}

export default Login;
