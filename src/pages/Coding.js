import { useDispatch, useSelector } from "react-redux";
import { problemSolved, problemRemoved } from "../features/coding/codingSlice";
import selectProblems from "../features/coding/codingSelectors";

function Coding() {
  const dispatch = useDispatch();
  const problems = useSelector(selectProblems);
  return (
    <div>
      <h1>Coding</h1>
      <p>Problems Solved : {problems.length}</p>
      {problems.map((ele) => (
        <div key={ele.id}>
          <p>{ele.name}</p>
          <p>{ele.difficulty}</p>
          <p>{ele.problemUrl}</p>
          <p>{ele.revisionStatus}</p>
          <button onClick={() => dispatch(problemRemoved(ele.id))}>-</button>
        </div>
      ))}
      <button
        onClick={() =>
          dispatch(
            problemSolved({
              name: "Two Sum",
              difficulty: "Easy",
              problemUrl: "...",
              revisionStatus: "not-reviewed",
            }),
          )
        }
      >
        +
      </button>
    </div>
  );
}

export default Coding;
