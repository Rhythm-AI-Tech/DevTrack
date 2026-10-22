import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { apiRequest } from "../utils/api";
import { invalidateDashboard } from "../features/dashboard/dashboardSlice";
import "./WorkspacePages.css";

const blankProject = () => ({
  name: "",
  description: "",
  status: "planned",
  deadline: "",
  repositoryUrl: "",
  milestoneText: "",
});

function Projects() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const focusProjectId = searchParams.get("focus");

  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(blankProject);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setStatus("loading");
    setError("");

    try {
      const data = await apiRequest("/projects");
      setProjects(data.projects);
      setStatus("ready");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("failed");
    }
  };

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (status !== "ready" || !focusProjectId) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const target = Array.from(document.querySelectorAll("[data-project-id]"))
        .find((element) => element.getAttribute("data-project-id") === focusProjectId);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [status, focusProjectId, projects.length]);

  const updateForm = (field, value) =>
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

  const fieldsFromProject = (project) => ({
    name: project.name,
    description: project.description || "",
    status: project.status,
    deadline: project.deadline
      ? project.deadline.slice(0, 10)
      : "",
    repositoryUrl: project.repositoryUrl || "",
    milestoneText: (project.milestones || [])
      .map((item) => item.title)
      .join("\n"),
  });

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name: form.name,
      description: form.description,
      status: form.status,
      deadline: form.deadline || null,
      repositoryUrl: form.repositoryUrl,
      milestones: form.milestoneText
        .split("\n")
        .map((title) => title.trim())
        .filter(Boolean)
        .map((title) => ({ title })),
    };

    try {
      if (editingId) {
        const { project } = await apiRequest(
          `/projects/${editingId}`,
          {
            method: "PATCH",
            body: payload,
          }
        );

        setProjects((items) =>
          items.map((item) =>
            item._id === editingId ? project : item
          )
        );
      } else {
        const { project } = await apiRequest("/projects", {
          method: "POST",
          body: payload,
        });

        setProjects((items) => [project, ...items]);
      }

      setForm(blankProject());
      setEditingId(null);
      setFormOpen(false);
      dispatch(invalidateDashboard());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (project) => {
    setEditingId(project._id);
    setForm(fieldsFromProject(project));
    setFormOpen(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const remove = async (project) => {
    if (
      !window.confirm(
        `Delete “${project.name}” and its milestones?`
      )
    ) {
      return;
    }

    try {
      await apiRequest(`/projects/${project._id}`, {
        method: "DELETE",
      });

      setProjects((items) =>
        items.filter((item) => item._id !== project._id)
      );

      dispatch(invalidateDashboard());
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const toggleMilestone = async (project, milestoneId) => {
    const milestones = project.milestones.map((milestone) =>
      milestone._id === milestoneId
        ? {
            ...milestone,
            completed: !milestone.completed,
            completedAt: milestone.completed
              ? null
              : new Date().toISOString(),
          }
        : milestone
    );

    try {
      const { project: updated } = await apiRequest(
        `/projects/${project._id}`,
        {
          method: "PATCH",
          body: { milestones },
        }
      );

      setProjects((items) =>
        items.map((item) =>
          item._id === updated._id ? updated : item
        )
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (status === "loading") {
    return (
      <div className="workspace-page">
        <p role="status">Loading projects…</p>
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
          <span className="workspace-eyebrow">BUILD LOG</span>
          <h1>Projects</h1>
          <p>
            Keep project plans, deadlines, and milestones in one place.
          </p>
        </div>

        <button
          className="workspace-primary"
          type="button"
          onClick={() => {
            setFormOpen((open) => !open);

            if (formOpen) {
              setEditingId(null);
              setForm(blankProject());
            }
          }}
        >
          {formOpen ? "Close form" : "New project"}
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
            <h2>{editingId ? "Edit project" : "Create a project"}</h2>
            <p>Project data is private to your account.</p>
          </div>

          <label>
            Project name
            <input
              required
              maxLength={100}
              value={form.name}
              onChange={(event) =>
                updateForm("name", event.target.value)
              }
            />
          </label>

          <label>
            Description
            <textarea
              maxLength={2000}
              rows="3"
              value={form.description}
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
            />
          </label>

          <div className="workspace-form-row">
            <label>
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  updateForm("status", event.target.value)
                }
              >
                <option value="planned">Planned</option>
                <option value="in-progress">In progress</option>
                <option value="on-hold">On hold</option>
                <option value="completed">Completed</option>
              </select>
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
            Repository URL
            <input
              type="url"
              maxLength={500}
              placeholder="https://github.com/you/project"
              value={form.repositoryUrl}
              onChange={(event) =>
                updateForm("repositoryUrl", event.target.value)
              }
            />
          </label>

          <label>
            Milestones{" "}
            <span className="workspace-optional">
              One per line
            </span>
            <textarea
              rows="3"
              maxLength={2500}
              placeholder={
                "Build the first feature\nWrite tests\nPrepare a demo"
              }
              value={form.milestoneText}
              onChange={(event) =>
                updateForm("milestoneText", event.target.value)
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
                  : "Create project"}
            </button>
          </div>
        </form>
      )}

      {!projects.length ? (
        <div className="workspace-empty">
          <h2>No projects yet</h2>
          <p>
            Create a project to track its status, deadline, and milestones.
          </p>
          <button
            className="workspace-primary"
            type="button"
            onClick={() => setFormOpen(true)}
          >
            Create your first project
          </button>
        </div>
      ) : (
        <section className="project-grid" aria-label="Projects">
          {projects.map((project) => (
            <article className={`project-card${focusProjectId === String(project._id) ? " search-target-highlight" : ""}`} key={project._id} data-project-id={String(project._id)}>
              <div className="project-card-top">
                <span className={`project-status ${project.status}`}>
                  {project.status.replace("-", " ")}
                </span>

                <div className="project-actions">
                  <button
                    type="button"
                    onClick={() => edit(project)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(project)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <h2>{project.name}</h2>

              <p className="project-description">
                {project.description || "No description added."}
              </p>

              <div className="project-meta">
                {project.deadline ? (
                  <span>
                    Due{" "}
                    {new Date(
                      `${project.deadline.slice(0, 10)}T00:00:00`
                    ).toLocaleDateString()}
                  </span>
                ) : (
                  <span>No deadline</span>
                )}

                {project.repositoryUrl && (
                  <a
                    href={project.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Repository ↗
                  </a>
                )}
              </div>

              <div className="project-progress-heading">
                <span>Milestones</span>
                <strong>{project.progress || 0}%</strong>
              </div>

              <div
                className="project-progress-track"
                role="progressbar"
                aria-label={`${project.name} milestone progress`}
                aria-valuenow={project.progress || 0}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <span
                  style={{
                    width: `${project.progress || 0}%`,
                  }}
                />
              </div>

              {project.milestones?.length ? (
                <ul className="milestone-list">
                  {project.milestones.map((milestone) => (
                    <li key={milestone._id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={milestone.completed}
                          onChange={() =>
                            toggleMilestone(project, milestone._id)
                          }
                        />
                        <span
                          className={
                            milestone.completed ? "is-complete" : ""
                          }
                        >
                          {milestone.title}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="project-no-milestones">
                  Add milestones while editing to track progress.
                </p>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default Projects;