import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import { createProblem, fetchProblems } from "../features/coding/codingSlice";
import {
  selectProblems,
  selectStatus,
  selectError,
} from "../features/coding/codingSelectors";
import { getProblemsThisWeek, getCurrentStreak } from "../utils/codingUtils";
import "./Coding.css";

const CODING_PLATFORMS = [
  "LeetCode",
  "Codeforces",
  "GeeksforGeeks",
  "CodeChef",
  "HackerRank",
  "AtCoder",
  "HackerEarth",
  "Codewars",
  "Other",
];

const initialForm = () => ({
  title: "",
  platform: "LeetCode",
  difficulty: "Easy",
  problemUrl: "",
  solvedAt: new Date().toISOString().slice(0, 10),
  topics: "",
});

function getProblemIdentity(problem) {
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

  return url
    ? `${platform}::url:${url}`
    : `${platform}::id:${problem.id || problem._id || ""}`;
}

function getUniqueProblems(problems) {
  const unique = new Map();

  for (const problem of problems) {
    const key = getProblemIdentity(problem);

    if (!unique.has(key)) {
      unique.set(key, problem);
    }
  }

  return [...unique.values()];
}

function getSaveError(error) {
  if (typeof error === "string") return error;

  if (typeof error?.message === "string") return error.message;

  if (typeof error?.payload === "string") return error.payload;

  return "Unable to save the problem. Please try again.";
}

function Coding() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedPlatform, setSelectedPlatform] = useState("All Platforms");
  const [selectedDifficulty, setSelectedDifficulty] =
    useState("All Difficulties");
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || "",
  );
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  const problems = useSelector(selectProblems);
  const status = useSelector(selectStatus);
  const error = useSelector(selectError);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchProblems());
    }
  }, [dispatch, status]);

  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
  }, [searchParams]);

  const safeProblems = useMemo(
    () => getUniqueProblems(Array.isArray(problems) ? problems : []),
    [problems],
  );

  const normalizedProblems = useMemo(
    () =>
      safeProblems.map((problem) => ({
        ...problem,
        id: String(problem.id ?? problem._id ?? ""),
        name: String(problem.name ?? problem.title ?? ""),
        platform: problem.platform || "Other",
        difficulty: problem.difficulty || "Unknown",
        topics: Array.isArray(problem.topics) ? problem.topics : [],
        solvedAt: problem.solvedAt || "",
      })),
    [safeProblems],
  );

  const filteredProblems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return normalizedProblems.filter((problem) => {
      const matchesPlatform =
        selectedPlatform === "All Platforms" ||
        problem.platform === selectedPlatform;

      const matchesDifficulty =
        selectedDifficulty === "All Difficulties" ||
        problem.difficulty === selectedDifficulty;

      const matchesTitle = problem.name.toLowerCase().includes(query);

      const matchesTopics = problem.topics.some((topic) =>
        String(topic).toLowerCase().includes(query),
      );

      return (
        matchesPlatform && matchesDifficulty && (matchesTitle || matchesTopics)
      );
    });
  }, [normalizedProblems, selectedPlatform, selectedDifficulty, searchQuery]);

  const problemsThisWeek = getProblemsThisWeek(normalizedProblems);
  const currentStreak = getCurrentStreak(normalizedProblems);

  const revisionProblems = normalizedProblems.filter(
    (problem) => problem.markedForRevision,
  );

  const handleFormChange = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
    setSubmitError("");
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setSearchParams(value.trim() ? { search: value } : {});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessMessage("");

    const payload = {
      ...formData,
      title: formData.title.trim(),
      problemUrl: formData.problemUrl.trim(),
      topics: formData.topics,
    };

    if (!payload.title) {
      setSuccessMessage("");
      return;
    }

    const result = await dispatch(createProblem(payload));

    if (createProblem.fulfilled.match(result)) {
      setFormData(initialForm());
      setFormOpen(false);
      setSuccessMessage("Problem saved to your account.");

      // Refresh the saved list from the existing backend.
      dispatch(fetchProblems());
    } else {
      setSuccessMessage(
        result.payload || "Unable to save the problem. Please try again.",
      );
    }
  };

  if (status === "loading") {
    return (
      <div className="coding-page">
        <p role="status">Loading coding activity...</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="coding-page">
        <h1>Coding</h1>
        <div className="coding-error" role="alert">
          <p>{error || "Unable to load coding activity."}</p>
          <button
            type="button"
            className="coding-primary-button"
            onClick={() => dispatch(fetchProblems())}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="coding-page">
      <section className="coding-header">
        <div>
          <h1>Coding</h1>
          <p>Your saved coding activity and revision queue.</p>
        </div>

        <button
          type="button"
          className="coding-primary-button"
          onClick={() => {
            setFormOpen((open) => !open);
            setSubmitError("");
            setSuccessMessage("");
          }}
        >
          {formOpen ? "Cancel" : "Log a problem"}
        </button>
      </section>

      <p className="coding-sync-note">
        Track your saved coding activity here. Connected platform statistics
        remain separate to avoid double-counting.
      </p>

      {successMessage && (
        <p className="coding-success" role="status">
          {successMessage}
        </p>
      )}

      {submitError && (
        <p className="coding-error" role="alert">
          {submitError}
        </p>
      )}

      {formOpen && (
        <form className="coding-form" onSubmit={handleSubmit}>
          <div className="coding-form-heading">
            <div>
              <h2>Record a solved problem</h2>
              <p>Add a problem to your DevTrack log.</p>
            </div>
          </div>

          <label>
            Problem title
            <input
              type="text"
              required
              maxLength={160}
              value={formData.title}
              onChange={(event) =>
                handleFormChange("title", event.target.value)
              }
              placeholder="e.g. Two Sum"
            />
          </label>

          <div className="coding-form-row">
            <label>
              Platform
              <select
                required
                value={formData.platform}
                onChange={(event) =>
                  handleFormChange("platform", event.target.value)
                }
              >
                {CODING_PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Difficulty
              <select
                value={formData.difficulty}
                onChange={(event) =>
                  handleFormChange("difficulty", event.target.value)
                }
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Unknown">Unknown</option>
              </select>
            </label>

            <label>
              Solved date
              <input
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                value={formData.solvedAt}
                onChange={(event) =>
                  handleFormChange("solvedAt", event.target.value)
                }
              />
            </label>
          </div>

          <label>
            Problem URL <span className="coding-optional">Optional</span>
            <input
              type="url"
              maxLength={500}
              placeholder="https://..."
              value={formData.problemUrl}
              onChange={(event) =>
                handleFormChange("problemUrl", event.target.value)
              }
            />
          </label>

          <label>
            Topics{" "}
            <span className="coding-optional">Comma separated · optional</span>
            <input
              type="text"
              maxLength={500}
              placeholder="Arrays, Hash Map"
              value={formData.topics}
              onChange={(event) =>
                handleFormChange("topics", event.target.value)
              }
            />
          </label>

          <div className="coding-form-actions">
            <button
              type="submit"
              className="coding-primary-button"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save problem"}
            </button>

            <button
              type="button"
              className="coding-secondary-button"
              disabled={saving}
              onClick={() => {
                setFormOpen(false);
                setSubmitError("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="coding-stats" aria-label="Coding statistics">
        <div className="coding-stat-card">
          <span>Logged problems</span>
          <strong>{normalizedProblems.length}</strong>
        </div>

        <div className="coding-stat-card">
          <span>Logged this week</span>
          <strong>{problemsThisWeek.length}</strong>
        </div>

        <div className="coding-stat-card">
          <span>DevTrack streak</span>
          <strong>{currentStreak}</strong>
        </div>

        <div className="coding-stat-card">
          <span>Revision queue</span>
          <strong>{revisionProblems.length}</strong>
        </div>
      </section>

      <section className="recent-section">
        <div className="coding-list-heading">
          <div>
            <h2>Recent Activity</h2>
            <p>Problems saved in your coding history.</p>
          </div>

          <div className="coding-filters">
            <input
              type="search"
              aria-label="Search problems"
              placeholder="Search problems..."
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
            />

            <select
              aria-label="Filter by platform"
              value={selectedPlatform}
              onChange={(event) => setSelectedPlatform(event.target.value)}
            >
              <option value="All Platforms">All Platforms</option>
              {CODING_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by difficulty"
              value={selectedDifficulty}
              onChange={(event) => setSelectedDifficulty(event.target.value)}
            >
              <option value="All Difficulties">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
        </div>

        <div className="problem-list">
          {filteredProblems.length === 0 ? (
            <div className="empty-state">
              <h3>
                {normalizedProblems.length
                  ? "No matching problems"
                  : "No coding activity yet"}
              </h3>
              <p>
                {normalizedProblems.length
                  ? "Try changing your search or filters."
                  : "Log a solved problem to start building your history."}
              </p>
              {normalizedProblems.length === 0 && (
                <button
                  type="button"
                  className="coding-primary-button"
                  onClick={() => setFormOpen(true)}
                >
                  Log a problem
                </button>
              )}
            </div>
          ) : (
            filteredProblems.map((problem) => (
              <Link
                className="problem-row"
                key={problem.id || getProblemIdentity(problem)}
                to={`/coding/problem/${problem.id}`}
              >
                <span className="problem-row-title">
                  <strong>{problem.name}</strong>
                  <small>
                    {problem.platform}
                    {problem.origin === "public-profile"
                      ? " · Public profile (unverified)"
                      : problem.origin === "verified-platform"
                        ? " · Verified sync"
                        : problem.origin === "csv-import"
                          ? " · CSV import"
                          : ""}
                    {problem.notes ? " · Notes added" : ""}
                    {problem.markedForRevision ? " · For revision" : ""}
                  </small>
                </span>

                <span
                  className={`difficulty-pill ${problem.difficulty.toLowerCase()}`}
                >
                  {problem.difficulty}
                </span>

                <time dateTime={problem.solvedAt || undefined}>
                  {problem.solvedAt
                    ? new Date(problem.solvedAt).toLocaleDateString()
                    : "—"}
                </time>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="revision-section">
        <div className="coding-list-heading">
          <div>
            <h2>Revision Queue</h2>
            <p>Problems you have chosen to revisit.</p>
          </div>
        </div>

        <div className="revision-list">
          {revisionProblems.length === 0 ? (
            <div className="empty-state">
              <h3>Your revision queue is empty</h3>
              <p>Mark a problem for revision from its details page.</p>
            </div>
          ) : (
            revisionProblems.map((problem) => (
              <Link
                className="revision-item"
                key={problem.id || getProblemIdentity(problem)}
                to={`/coding/problem/${problem.id}`}
              >
                <div>
                  <strong>{problem.name}</strong>
                  <span>
                    {problem.platform} · {problem.difficulty}
                  </span>
                </div>
                <span aria-hidden="true">→</span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default Coding;
