import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  updateNotes,
  toggleRevision,
  markAsRevised,
} from "../features/coding/codingSlice";
import "./ProblemDetails.css";

function ProblemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [revisionMessage, setRevisionMessage] = useState("");

  const problem = useSelector((state) =>
    state.coding.problems.find((problem) => problem.id === id)
  );

  useEffect(() => {
    if (problem) {
      setNotes(problem.notes || "");
    }
  }, [problem]);

  if (!problem) {
    return (
      <div className="problem-not-found">
        <h2>Problem not found</h2>

        <button
          className="back-button"
          onClick={() => navigate("/coding")}
        >
          ← Back to Coding
        </button>
      </div>
    );
  }

  const handleSaveNotes = () => {
    dispatch(
      updateNotes({
        id: problem.id,
        notes: notes,
      })
    );

    setNotesSaved(true);
  };

  const handleToggleRevision = () => {
    dispatch(toggleRevision(problem.id));

    if (problem.markedForRevision) {
      setRevisionMessage("Removed from your revision queue.");
    } else {
      setRevisionMessage("Added to your revision queue.");
    }
  };

  const handleMarkAsRevised = () => {
    dispatch(markAsRevised(problem.id));
    setRevisionMessage("Problem marked as revised.");
  };

  return (
    <div className="problem-details">

      {/* BACK */}

      <button
        className="back-button"
        onClick={() => navigate("/coding")}
      >
        ← Back to Coding
      </button>


      {/* HEADER */}

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


      {/* TOPICS */}

      <section className="problem-section">

        <h2>Topics</h2>

        <div className="topic-list">
          {problem.topic?.map((topic) => (
            <span
              className="topic-tag"
              key={topic}
            >
              {topic}
            </span>
          ))}
        </div>

      </section>


      {/* NOTES */}

      <section className="problem-section">

        <div className="section-heading">
          <div>
            <h2>Your Notes</h2>

            <p>
              Save your approach, mistakes, or anything you want
              to remember later.
            </p>
          </div>
        </div>

        <textarea
          className="notes-input"
          placeholder="Write something you want to remember about this problem..."
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesSaved(false);
          }}
        />

        <div className="notes-actions">

          <button
            className="save-notes-button"
            onClick={handleSaveNotes}
          >
            {notesSaved ? "Saved ✓" : "Save Notes"}
          </button>

          {notesSaved && (
            <span className="saved-message">
              Your notes have been saved.
            </span>
          )}

        </div>

      </section>


      {/* REVISION */}

      <section className="problem-section">

        <div className="section-heading">
          <div>
            <h2>Revision</h2>

            <p>
              Keep track of problems you want to revisit.
            </p>
          </div>
        </div>


        {/* REVISION STATS */}

        <div className="revision-info">

          <div className="revision-stat">
            <span>Last revised</span>
            <strong>
              {problem.lastRevised || "—"}
            </strong>
          </div>

          <div className="revision-stat">
            <span>Revision count</span>
            <strong>
              {problem.revisionCount}
            </strong>
          </div>

        </div>


        {/* REVISION ACTION */}

        <div className="revision-actions">

          {problem.markedForRevision ? (
            <button
              className="revision-button secondary"
              onClick={handleToggleRevision}
            >
              Remove from Revision
            </button>
          ) : (
            <button
              className="revision-button"
              onClick={handleToggleRevision}
            >
              Mark for Revision
            </button>
          )}

          {problem.markedForRevision && (
            <button
              className="revision-complete-button"
              onClick={handleMarkAsRevised}
            >
              Mark as Revised
            </button>
          )}

        </div>


        {/* FEEDBACK */}

        {revisionMessage && (
          <p className="revision-feedback">
            ✓ {revisionMessage}
          </p>
        )}

      </section>

    </div>
  );
}

export default ProblemDetails;