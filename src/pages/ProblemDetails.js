import { useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import "./ProblemDetails.css";

function ProblemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const problem = useSelector((state) =>
    state.coding.problems.find((problem) => problem.id === id)
  );

  if (!problem) {
    return (
      <div className="problem-not-found">
        <h2>Problem not found</h2>

        <button onClick={() => navigate("/coding")}>
          ← Back to Coding
        </button>
      </div>
    );
  }

  return (
    <div className="problem-details">

      <button
        className="back-button"
        onClick={() => navigate("/coding")}
      >
        ← Back to Coding
      </button>


      <section className="problem-header">

        <div>
          <h1>{problem.name}</h1>

          <div className="problem-meta">
            <span>{problem.difficulty}</span>
            <span>•</span>
            <span>{problem.platform}</span>
          </div>
        </div>

        <a
          className="solve-button"
          href={problem.problemUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open Problem ↗
        </a>

      </section>


      <section className="problem-section">

        <h2>Topics</h2>

        <div className="topic-list">
          {problem.topic?.map((topic) => (
            <span className="topic-tag" key={topic}>
              {topic}
            </span>
          ))}
        </div>

      </section>

      <section className="problem-section">

        <h2>Your Notes</h2>

        <div className="notes-box">
          <p>No notes added yet.</p>
        </div>

      </section>

      <section className="problem-section">

        <div className="section-title-row">

          <div>
            <h2>Revision</h2>
            <p>
              Keep track of how well you remember this problem.
            </p>
          </div>

          <button className="revision-button">
            Mark as Revised
          </button>

        </div>

        <div className="revision-info">

          <div>
            <span>Last revised</span>
            <strong>—</strong>
          </div>

          <div>
            <span>Revision count</span>
            <strong>0</strong>
          </div>

        </div>

      </section>

    </div>
  );
}

export default ProblemDetails;