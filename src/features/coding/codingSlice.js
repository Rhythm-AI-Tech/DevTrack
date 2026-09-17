import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const fetchProblems = createAsyncThunk(
    "coding/fetchProblems",
    async() => {
        const data = await new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        name: "Two Sum",
                        difficulty: "Easy",
                        platform: "LeetCode",
                        topic: ["hashmap", "array"],
                        solvedAt: "2026-09-17",
                        problemUrl: "https://leetcode.com/problems/two-sum/description/"
                    },
                    {
                        name: "Binary Search",
                        difficulty: "Easy",
                        platform: "LeetCode",
                        topic: ["array"],
                        solvedAt: "2026-07-01",
                        problemUrl: "https://leetcode.com/problems/binary-search/description/"
                    },
                ]);
            }, 2000);
        });
        return data;
    }
);

const codingSlice = createSlice({
    name:  "coding",
    initialState: {
        problems: [],
        status: "idle",
        error: null
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
    }, 
    extraReducers: (builder) => {
        builder
            .addCase(fetchProblems.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchProblems.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.problems = action.payload;
            })
            .addCase(fetchProblems.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message;
            });
    }
})
 
export default codingSlice.reducer;
export const { problemSolved, problemRemoved } = codingSlice.actions; 
export {fetchProblems};