import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchProblems } from "../features/coding/codingSlice";
import "./WorkspacePages.css";

function DSA() {
  const dispatch = useDispatch();

  const { problems, status, error } = useSelector(
    (state) => state.coding
  );

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchProblems());
    }
  }, [dispatch, status]);

  const topics = useMemo(() => {
    const counts = new Map();

    problems.forEach((problem) =>
      problem.topics.forEach((topic) =>
        counts.set(topic, (counts.get(topic) || 0) + 1)
      )
    );

    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    );
  }, [problems]);

  const difficulty = ["Easy", "Medium", "Hard", "Unknown"].map(
    (name) => ({
      name,
      count: problems.filter(
        (problem) => problem.difficulty === name
      ).length,
    })
  );

  if (status === "loading" || status === "idle") {
    return (
      <div className="workspace-page">
        <p role="status">Loading your DSA records…</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="workspace-page">
        <div className="workspace-alert" role="alert">
          {error}
          <button
            type="button"
            onClick={() => dispatch(fetchProblems())}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <header className="workspace-heading">
        <div>
          <span className="workspace-eyebrow">
            PRACTICE OVERVIEW
          </span>
          <h1>DSA</h1>
          <p>
            Review your saved algorithm practice by difficulty and topic.
          </p>
        </div>

        <Link
          className="workspace-primary link-button"
          to="/coding"
        >
          Open coding log
        </Link>
      </header>

      <section
        className="dsa-summary"
        aria-label="Difficulty summary"
      >
        {difficulty.map((item) => (
          <article key={item.name}>
            <span>{item.name}</span>
            <strong>{item.count}</strong>
          </article>
        ))}
      </section>

      <section className="workspace-panel">
        <div className="workspace-section-heading">
          <div>
            <span className="workspace-eyebrow">
              TOPICS FROM YOUR RECORDS
            </span>
            <h2>Practice coverage</h2>
            <p>
              Topics are based on tags you add to saved problems.
            </p>
          </div>
        </div>

        {topics.length ? (
          <div className="dsa-topic-list">
            {topics.map(([topic, count]) => (
              <Link
                key={topic}
                to={`/coding?search=${encodeURIComponent(topic)}`}
              >
                <span>{topic}</span>
                <strong>
                  {count} {count === 1 ? "problem" : "problems"}
                </strong>
              </Link>
            ))}
          </div>
        ) : (
          <div className="workspace-empty compact">
            <h3>No topics recorded yet</h3>
            <p>
              Add topic tags when logging problems; this page will
              summarize your coverage.
            </p>

            <Link
              className="workspace-primary link-button"
              to="/coding"
            >
              Log a problem
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

export default DSA;