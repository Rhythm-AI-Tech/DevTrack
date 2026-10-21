import { createSlice } from "@reduxjs/toolkit";

const savedTheme = localStorage.getItem("devtrack-theme");

const initialState = {
  theme: savedTheme === "dark" ? "dark" : "light",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme(state, action) {
      state.theme = action.payload === "dark" ? "dark" : "light";
    },
  },
});

export const { setTheme } = uiSlice.actions;
export default uiSlice.reducer;