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

import {
  getProblemsThisWeek,
  getCurrentStreak,
} from "../utils/codingUtils";

function Coding() {
  const [selectedPlatform, setSelectedPlatform] =
    useState("All Platforms");

  const [searchQuery, setSearchQuery] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const problems = useSelector(selectProblems);
  const status = useSelector(selectStatus);
  const error = useSelector(selectError);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchProblems());
    }
  }, [dispatch, status]);

  const filteredProblems = problems.filter((problem) => {
    const matchesPlatform =
      selectedPlatform === "All Platforms" ||
      problem.platform === selectedPlatform;

    const matchesSearch = problem.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    return matchesPlatform && matchesSearch;
  });

  const problemsThisWeek = getProblemsThisWeek(problems);

  const currentStreak = getCurrentStreak(problems);

  const revisionProblems = problems.filter(
    (problem) => problem.markedForRevision
  );

  if (status === "loading") {
    return <p>Loading coding activity...</p>;
  }

  if (status === "failed") {
    return <p>{error}</p>;
  }

  return (
    <div className="coding-page">

      {/* HEADER */}

      <section className="coding-header">

        <div>
          <h1>Coding</h1>

          <p>
            Your coding activity across connected platforms.
          </p>
        </div>

        <div className="coding-filters">

          <div className="search-wrapper">

            <input
              type="text"
              placeholder="Search problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {searchQuery && (
              <button
                className="clear-search"
                onClick={() => setSearchQuery("")}
              >
                ×
              </button>
            )}

          </div>

          <select
            value={selectedPlatform}
            onChange={(e) =>
              setSelectedPlatform(e.target.value)
            }
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


      {/* STATS */}

      <section className="coding-stats">

        <div className="coding-stat-card">
          <span>Problems Solved</span>
          <strong>{problems.length}</strong>
        </div>

        <div className="coding-stat-card">
          <span>This Week</span>
          <strong>{problemsThisWeek.length}</strong>
        </div>

        <div className="coding-stat-card">
          <span>Current Streak</span>
          <strong>{currentStreak}</strong>
        </div>

        <div className="coding-stat-card">
          <span>Revision Queue</span>
          <strong>{revisionProblems.length}</strong>
        </div>

      </section>


      {/* RECENT ACTIVITY */}

      <section className="recent-section">

        <div className="section-heading">

          <div>
            <h2>Recent Activity</h2>

            <p>
              Your latest coding activity.
            </p>
          </div>

        </div>

        <div className="problem-list">

          {filteredProblems.length === 0 ? (

            <div className="empty-state">

              <h3>No coding activity found</h3>

              <p>
                Try changing your search or platform filter.
              </p>

            </div>

          ) : (

            filteredProblems.map((problem) => (

              <div
                className="problem-row"
                key={problem.id}
                onClick={() =>
                  navigate(`/coding/problem/${problem.id}`)
                }
              >

                <div>

                  <strong>{problem.name}</strong>

                  <span>
                    {problem.platform}
                    {problem.notes && " • Notes added"}
                  </span>

                </div>

                <span>
                  {problem.difficulty}
                </span>

                <span>
                  {problem.solvedAt}
                </span>

              </div>

            ))

          )}

        </div>

      </section>


      {/* REVISION QUEUE */}

      <section className="revision-section">

        <div className="section-heading">

          <div>
            <h2>Revision Queue</h2>

            <p>
              Problems you have chosen to revisit.
            </p>
          </div>

        </div>

        <div className="revision-list">

          {revisionProblems.length === 0 ? (

            <div className="empty-state">

              <h3>Your revision queue is empty</h3>

              <p>
                Mark problems for revision from their details page.
              </p>

            </div>

          ) : (

            revisionProblems.map((problem) => (

              <div
                className="revision-item"
                key={problem.id}
                onClick={() =>
                  navigate(`/coding/problem/${problem.id}`)
                }
              >

                <div>

                  <strong>{problem.name}</strong>

                  <span>
                    {problem.platform} • {problem.difficulty}
                  </span>

                </div>

                <span>→</span>

              </div>

            ))

          )}

        </div>

      </section>

    </div>
  );
}

export default Coding;