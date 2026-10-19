import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { apiRequest } from "../utils/api";
import { invalidateDashboard } from "../features/dashboard/dashboardSlice";
import "./WorkspacePages.css";

const blankGoal = () => ({
  title: "",
  description: "",
  kind: "weekly-problems",
  target: 5,
  deadline: "",
});

const goalKindLabel = {
  "weekly-problems": "Problems logged this week",
  "coding-streak": "DevTrack coding streak",
  custom: "Personal target",
};

function Goals() {
  const dispatch = useDispatch();

  const [goals, setGoals] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(blankGoal);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setStatus("loading");
    setError("");

    try {
      const data = await apiRequest("/goals");
      setGoals(data.goals);
      setStatus("ready");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("failed");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateForm = (field, value) =>
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        deadline: form.deadline || null,
      };

      if (editingId) {
        const { goal } = await apiRequest(`/goals/${editingId}`, {
          method: "PATCH",
          body: payload,
        });

        setGoals((items) =>
          items.map((item) =>
            item._id === editingId ? goal : item
          )
        );
      } else {
        const { goal } = await apiRequest("/goals", {
          method: "POST",
          body: payload,
        });

        setGoals((items) => [goal, ...items]);
      }

      setForm(blankGoal());
      setEditingId(null);
      setFormOpen(false);
      dispatch(invalidateDashboard());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (goal) => {
    setEditingId(goal._id);
    setForm({
      title: goal.title,
      description: goal.description || "",
      kind: goal.kind,
      target: goal.target,
      deadline: goal.deadline
        ? goal.deadline.slice(0, 10)
        : "",
    });
    setFormOpen(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const changeGoal = async (goal, fields) => {
    setError("");

    try {
      const { goal: updated } = await apiRequest(
        `/goals/${goal._id}`,
        {
          method: "PATCH",
          body: fields,
        }
      );

      setGoals((items) =>
        items.map((item) =>
          item._id === updated._id ? updated : item
        )
      );

      dispatch(invalidateDashboard());
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const remove = async (goal) => {
    if (!window.confirm(`Delete the goal “${goal.title}”?`)) {
      return;
    }

    try {
      await apiRequest(`/goals/${goal._id}`, {
        method: "DELETE",
      });

      setGoals((items) =>
        items.filter((item) => item._id !== goal._id)
      );

      dispatch(invalidateDashboard());
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (status === "loading") {
    return (
      <div className="workspace-page">
        <p role="status">Loading goals…</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="workspace-page">
        <div className="workspace-alert" role="alert">
          <p>{error}</p>
          <button type="button" onClick={load}>
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
            MAKE IT MEASURABLE
          </span>
          <h1>Goals</h1>
          <p>
            Weekly problem and streak goals use records in your DevTrack
            Coding log.
          </p>
        </div>

        <button
          className="workspace-primary"
          type="button"
          onClick={() => {
            setFormOpen((open) => !open);

            if (formOpen) {
              setEditingId(null);
              setForm(blankGoal());
            }
          }}
        >
          {formOpen ? "Close form" : "New goal"}
        </button>
      </header>

      {error && (
        <p className="workspace-alert" role="alert">
          {error}
        </p>
      )}

      {formOpen && (
        <form className="workspace-form" onSubmit={submit}>
          <div className="workspace-form-heading">
            <h2>{editingId ? "Edit goal" : "Create a goal"}</h2>
            <p>
              Activity goals are calculated from your saved coding
              records.
            </p>
          </div>

          <label>
            Goal title
            <input
              required
              maxLength={120}
              value={form.title}
              onChange={(event) =>
                updateForm("title", event.target.value)
              }
            />
          </label>

          <label>
            What does progress measure?
            <select
              value={form.kind}
              onChange={(event) =>
                updateForm("kind", event.target.value)
              }
            >
              <option value="weekly-problems">
                Problems logged this week
              </option>
              <option value="coding-streak">
                DevTrack coding streak
              </option>
              <option value="custom">Personal target</option>
            </select>
          </label>

          <div className="workspace-form-row">
            <label>
              Target
              <input
                required
                type="number"
                min="1"
                max="100000"
                value={form.target}
                onChange={(event) =>
                  updateForm("target", Number(event.target.value))
                }
              />
            </label>

            <label>
              Deadline
              <input
                type="date"
                value={form.deadline}
                onChange={(event) =>
                  updateForm("deadline", event.target.value)
                }
              />
            </label>
          </div>

          <label>
            Description{" "}
            <span className="workspace-optional">Optional</span>
            <textarea
              rows="2"
              maxLength={1000}
              value={form.description}
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
            />
          </label>

          <div className="workspace-form-actions">
            <button
              className="workspace-primary"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Create goal"}
            </button>
          </div>
        </form>
      )}

      {!goals.length ? (
        <div className="workspace-empty">
          <h2>No goals yet</h2>
          <p>
            Try a weekly problem target, a coding streak, or a personal
            milestone.
          </p>
          <button
            className="workspace-primary"
            type="button"
            onClick={() => setFormOpen(true)}
          >
            Create your first goal
          </button>
        </div>
      ) : (
        <section className="goal-grid" aria-label="Goals">
          {goals.map((goal) => (
            <article className="goal-card" key={goal._id}>
              <div className="goal-card-top">
                <span className={`goal-status ${goal.status}`}>
                  {goal.status}
                </span>

                <div className="project-actions">
                  <button
                    type="button"
                    onClick={() => edit(goal)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(goal)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <h2>{goal.title}</h2>
              <p className="goal-kind">
                {goalKindLabel[goal.kind]}
              </p>

              {goal.description && (
                <p className="goal-description">
                  {goal.description}
                </p>
              )}

              <div className="goal-progress-label">
                <strong>{goal.currentProgress}</strong>
                <span>of {goal.target}</span>
                <b>{goal.percentComplete}%</b>
              </div>

              <div
                className="goal-progress-track"
                role="progressbar"
                aria-label={`${goal.title} progress`}
                aria-valuenow={goal.percentComplete}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <span
                  style={{
                    width: `${goal.percentComplete}%`,
                  }}
                />
              </div>

              <div className="goal-card-footer">
                {goal.deadline ? (
                  <span>
                    Due{" "}
                    {new Date(
                      `${goal.deadline.slice(0, 10)}T00:00:00`
                    ).toLocaleDateString()}
                  </span>
                ) : (
                  <span>No deadline</span>
                )}

                {goal.kind === "custom" ? (
                  <button
                    type="button"
                    onClick={() =>
                      changeGoal(goal, {
                        progress: Math.min(
                          goal.target,
                          goal.currentProgress + 1
                        ),
                      })
                    }
                    disabled={
                      goal.currentProgress >= goal.target ||
                      goal.status !== "active"
                    }
                  >
                    Add progress
                  </button>
                ) : (
                  <span>Calculated from coding</span>
                )}
              </div>

              <div className="goal-card-actions">
                {goal.status !== "completed" && (
                  <button
                    type="button"
                    onClick={() =>
                      changeGoal(goal, {
                        status:
                          goal.status === "paused"
                            ? "active"
                            : "paused",
                      })
                    }
                  >
                    {goal.status === "paused" ? "Resume" : "Pause"}
                  </button>
                )}

                {goal.status !== "completed" && (
                  <button
                    type="button"
                    onClick={() =>
                      changeGoal(goal, { status: "completed" })
                    }
                  >
                    Mark complete
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default Goals;