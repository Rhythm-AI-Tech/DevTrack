import { createSlice } from "@reduxjs/toolkit";

const codingSlice = createSlice({
    name:  "coding",
    initialState: {
        problemsSolved: 0
    },
    reducers: {
        problemSolved(state){
            state.problemsSolved++;
        }
    }
})

export default codingSlice.reducer;