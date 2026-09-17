import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import "./Coding.css";
import { fetchProblems } from "../features/coding/codingSlice";

import {
  selectProblems,
  selectStatus,
  selectError,
} from "../features/coding/codingSelectors";

function Coding() {
  const dispatch = useDispatch();

  const problems = useSelector(selectProblems);
  const status = useSelector(selectStatus);
  const error = useSelector(selectError);

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

      {/* Header */}
      <section className="coding-header">
        <div>
          <h1>Coding</h1>
          <p>
            Your coding activity across connected platforms.
          </p>
        </div>

        <select>
          <option>All Platforms</option>
          <option>LeetCode</option>
          <option>GeeksforGeeks</option>
          <option>Codeforces</option>
          <option>CodeChef</option>
          <option>HackerRank</option>
        </select>
      </section>


      {/* Stats */}
      <section className="coding-stats">

        <div className="coding-stat-card">
          <span>Problems Solved</span>
          <strong>{problems.length}</strong>
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


      {/* Recent Activity */}
      <section className="recent-section">

        <div className="section-heading">
          <div>
            <h2>Recent Activity</h2>
            <p>Your latest coding activity.</p>
          </div>

          <button>View all</button>
        </div>

        <div className="problem-list">

          {problems.map((problem) => (
            <div className="problem-row" key={problem.id}>

              <div>
                <strong>{problem.name}</strong>
                <span>{problem.platform}</span>
              </div>

              <span>{problem.difficulty}</span>

              <span>{problem.solvedAt}</span>

            </div>
          ))}

        </div>

      </section>


      {/* Revision Queue */}
      <section className="revision-section">

        <div className="section-heading">
          <div>
            <h2>Revision Queue</h2>
            <p>
              Problems DevTrack recommends revisiting.
            </p>
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