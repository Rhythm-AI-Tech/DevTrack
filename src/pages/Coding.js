import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import "./Coding.css";
import { fetchProblems } from "../features/coding/codingSlice";
import { useNavigate } from "react-router-dom";
import {
  selectProblems,
  selectStatus,
  selectError,
} from "../features/coding/codingSelectors";

function Coding() {
  const [selectedPlatform, setSelectedPlatform] = useState("All Platforms");
  const [searchQuery, setSearchQuery] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const problems = useSelector(selectProblems);
  const status = useSelector(selectStatus);
  const error = useSelector(selectError);

  const filteredProblems = problems.filter((problem) => {
    const matchesPlatform =
      selectedPlatform === "All Platforms" ||
      problem.platform === selectedPlatform;

    const matchesSearch = problem.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    return matchesPlatform && matchesSearch;
  });

  useEffect(() => {
    dispatch(fetchProblems());
  }, [dispatch]);

  if (status === "loading") {
    return <p>Loading coding activity...</p>;
  }

  if (status === "failed") {
    return <p>{error}</p>;
  }

  return (
    <div className="coding-page">
      <section className="coding-header">
        <div>
          <h1>Coding</h1>
          <p>Your coding activity across connected platforms.</p>
        </div>

        <div className="coding-filters">
          <input
            type="text"
            placeholder="Search problems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
          >
            <option>All Platforms</option>
            <option>LeetCode</option>
            <option>GeeksforGeeks</option>
            <option>Codeforces</option>
            <option>CodeChef</option>
            <option>HackerRank</option>
          </select>
        </div>
      </section>

      <section className="coding-stats">
        <div className="coding-stat-card">
          <span>Problems Solved</span>
          <strong>{filteredProblems.length}</strong>
        </div>

        <div className="coding-stat-card">
          <span>This Week</span>
          <strong>18</strong>
        </div>

        <div className="coding-stat-card">
          <span>Current Streak</span>
          <strong>17 days</strong>
        </div>

        <div className="coding-stat-card">
          <span>Revision Queue</span>
          <strong>3</strong>
        </div>
      </section>

      <section className="recent-section">
        <div className="section-heading">
          <div>
            <h2>Recent Activity</h2>
            <p>Your latest coding activity.</p>
          </div>

          <button>View all</button>
        </div>

        <div className="problem-list">
          {filteredProblems.length === 0 ? (
            <div className="empty-state">
              <h3>No coding activity yet</h3>
              <p>There are no problems from this platform yet.</p>
            </div>
          ) : (
            filteredProblems.map((problem) => (
              <div
                className="problem-row"
                key={problem.id}
                onClick={() => navigate(`/coding/problem/${problem.id}`)}
              >
                <div>
                  <strong>{problem.name}</strong>
                  <span>{problem.platform}</span>
                </div>

                <span>{problem.difficulty}</span>

                <span>{problem.solvedAt}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="revision-section">
        <div className="section-heading">
          <div>
            <h2>Revision Queue</h2>
            <p>Problems DevTrack recommends revisiting.</p>
          </div>

          <button>View all</button>
        </div>

        <div className="revision-list">
          <div className="revision-item">
            <span>Binary Search</span>
            <span>→</span>
          </div>

          <div className="revision-item">
            <span>Merge Intervals</span>
            <span>→</span>
          </div>

          <div className="revision-item">
            <span>Lowest Common Ancestor</span>
            <span>→</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Coding;
