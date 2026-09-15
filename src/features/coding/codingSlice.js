import { createSlice } from "@reduxjs/toolkit";

const codingSlice = createSlice({
    name:  "coding",
    initialState: {
        problems: [],
    },
    reducers: {
        problemSolved(state, action){
            const newProblem = {
                id: crypto.randomUUID(),
                ...action.payload
            };
            state.problems.push(newProblem);
        },
        problemRemoved(state, action){
            state.problems = state.problems.filter((problem) => problem.id!==action.payload)
        }
    } 
})
 
export default codingSlice.reducer;


export const { problemSolved, problemRemoved } = codingSlice.actions; 