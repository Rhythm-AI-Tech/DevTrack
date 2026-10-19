import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchProblems,
  updateNotes,
  toggleRevision,
  markAsRevised,
} from "../features/coding/codingSlice";
import "./ProblemDetails.css";

function ProblemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const problems = useSelector((state) => state.coding.problems);
  const status = useSelector((state) => state.coding.status);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingRevision, setUpdatingRevision] = useState(false);
  const [notice, setNotice] = useState(null);

  const problem = problems.find((item) => String(item.id) === String(id));

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchProblems());
    }
  }, [dispatch, status]);

  useEffect(() => {
    setNotes(problem?.notes || "");
  }, [problem?.id, problem?.notes]);

  const handleSaveNotes = async () => {
    if (!problem || savingNotes) return;

    setSavingNotes(true);
    setNotice(null);

    try {
      await dispatch(updateNotes({ id: problem.id, notes })).unwrap();

      setNotice({
        type: "success",
        text: "Notes saved successfully.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          typeof error === "string"
            ? error
            : error?.message || "Could not save notes. Please try again.",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleToggleRevision = async () => {
    if (!problem || updatingRevision) return;

    setUpdatingRevision(true);
    setNotice(null);

    const nextValue = !problem.markedForRevision;

    try {
      await dispatch(
        toggleRevision({
          id: problem.id,
          markedForRevision: nextValue,
        }),
      ).unwrap();

      setNotice({
        type: "success",
        text: nextValue
          ? "Added to your revision queue."
          : "Removed from your revision queue.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          typeof error === "string"
            ? error
            : error?.message || "Could not update the revision queue.",
      });
    } finally {
      setUpdatingRevision(false);
    }
  };

  const handleMarkAsRevised = async () => {
    if (!problem || updatingRevision) return;

    setUpdatingRevision(true);
    setNotice(null);

    try {
      await dispatch(markAsRevised(problem.id)).unwrap();

      setNotice({
        type: "success",
        text: "Revision recorded successfully.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          typeof error === "string"
            ? error
            : error?.message || "Could not record this revision.",
      });
    } finally {
      setUpdatingRevision(false);
    }
  };

  if (!problem && status === "loading") {
    return (
      <div className="problem-details">
        <p className="detail-loading">Loading problem details…</p>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="problem-not-found">
        <h2>Problem not found</h2>
        <p>
          {status === "failed"
            ? "Your coding history could not be loaded."
            : "This problem may have been deleted or is not in your coding history."}
        </p>
        <button
          type="button"
          className="back-button"
          onClick={() => {
            if (status === "failed") dispatch(fetchProblems());
            else navigate("/coding");
          }}
        >
          {status === "failed" ? "Retry loading" : "← Back to Coding"}
        </button>
      </div>
    );
  }

  const topics = Array.isArray(problem.topics)
    ? problem.topics
    : typeof problem.topics === "string"
      ? problem.topics
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  return (
    <div className="problem-details">
      <button
        type="button"
        className="back-button"
        onClick={() => navigate("/coding")}
      >
        ← Back to Coding
      </button>

      <section className="problem-header">
        <div className="problem-heading-copy">
          <span className="detail-eyebrow">CODING JOURNAL</span>
          <h1>{problem.name || "Untitled problem"}</h1>

          <div className="problem-meta">
            <span
              className={`difficulty-text ${String(
                problem.difficulty || "Unknown",
              ).toLowerCase()}`}
            >
              {problem.difficulty || "Unknown"}
            </span>
            <span aria-hidden="true">•</span>
            <span>{problem.platform || "Other"}</span>
          </div>
        </div>

        {problem.problemUrl && (
          <a
            className="solve-button"
            href={problem.problemUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Problem ↗
          </a>
        )}
      </section>

      {notice && (
        <div
          className={`detail-notice ${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
        >
          <span aria-hidden="true">
            {notice.type === "success" ? "✓" : "!"}
          </span>
          {notice.text}
        </div>
      )}

      <section className="problem-section">
        <div className="section-heading">
          <div>
            <span className="detail-eyebrow">CONCEPTS</span>
            <h2>Topics</h2>
          </div>
          {topics.length > 0 && (
            <span className="detail-count">{topics.length}</span>
          )}
        </div>

        {topics.length > 0 ? (
          <div className="topic-list">
            {topics.map((topic, index) => (
              <span className="topic-tag" key={`${topic}-${index}`}>
                {topic}
              </span>
            ))}
          </div>
        ) : (
          <p className="detail-empty">No topics added for this problem.</p>
        )}
      </section>

      <section className="problem-section">
        <div className="section-heading">
          <div>
            <span className="detail-eyebrow">PERSONAL KNOWLEDGE BASE</span>
            <h2>Your Notes</h2>
            <p>
              Save your approach, mistakes, and anything you want to remember
              later.
            </p>
          </div>
          <span className="notes-character-count">{notes.length}/5000</span>
        </div>

        <textarea
          className="notes-input"
          placeholder="Write your approach, mistakes, complexity, or what you learned…"
          value={notes}
          maxLength={5000}
          rows={7}
          onChange={(event) => {
            setNotes(event.target.value);
            setNotice(null);
          }}
        />

        <div className="notes-actions">
          <button
            type="button"
            className="save-notes-button"
            onClick={handleSaveNotes}
            disabled={savingNotes}
          >
            {savingNotes ? "Saving…" : "Save Notes"}
          </button>
        </div>
      </section>

      <section className="problem-section revision-section">
        <div className="section-heading">
          <div>
            <span className="detail-eyebrow">SPACED PRACTICE</span>
            <h2>Revision</h2>
            <p>Keep track of problems you want to revisit.</p>
          </div>

          <span
            className={`revision-status ${
              problem.markedForRevision ? "queued" : ""
            }`}
          >
            {problem.markedForRevision ? "In revision queue" : "Not queued"}
          </span>
        </div>

        <div className="revision-info">
          <div className="revision-stat">
            <span>Last revised</span>
            <strong>
              {problem.lastRevised
                ? new Date(
                    `${problem.lastRevised}T12:00:00`,
                  ).toLocaleDateString()
                : "Not yet revised"}
            </strong>
          </div>

          <div className="revision-stat">
            <span>Completed revisions</span>
            <strong>{Number(problem.revisionCount) || 0}</strong>
          </div>
        </div>

        <div className="revision-actions">
          <button
            type="button"
            className={`revision-button ${
              problem.markedForRevision ? "secondary" : ""
            }`}
            onClick={handleToggleRevision}
            disabled={updatingRevision}
          >
            {updatingRevision
              ? "Updating…"
              : problem.markedForRevision
                ? "Remove from Revision"
                : "Mark for Revision"}
          </button>

          <button
            type="button"
            className="revision-complete-button"
            onClick={handleMarkAsRevised}
            disabled={updatingRevision}
          >
            {updatingRevision ? "Saving…" : "Mark as Revised"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ProblemDetails;
