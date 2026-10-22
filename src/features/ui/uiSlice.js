import { createSlice } from "@reduxjs/toolkit";

function readSavedTheme() {
  try {
    const savedTheme = localStorage.getItem("devtrack_theme");
    return savedTheme === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

const initialState = {
  theme: readSavedTheme(),
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme(state, action) {
      state.theme = action.payload === "light" ? "light" : "dark";
    },
  },
});

export const { setTheme } = uiSlice.actions;
export default uiSlice.reducer;
