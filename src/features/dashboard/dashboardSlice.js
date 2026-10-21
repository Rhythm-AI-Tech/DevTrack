import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../utils/api";

export const loadDashboard = createAsyncThunk(
  "dashboard/load",
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiRequest("/dashboard");

      if (!data.success || !data.stats) {
        throw new Error("The dashboard returned an invalid response.");
      }

      return data.stats;
    } catch (error) {
      return rejectWithValue(error.message || "Unable to load dashboard data.");
    }
  },
);

const initialState = {
  stats: null,
  status: "idle",
  error: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,

  reducers: {
    invalidateDashboard(state) {
      state.status = "idle";
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadDashboard.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })

      .addCase(loadDashboard.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.stats = action.payload;
        state.error = null;
      })

      .addCase(loadDashboard.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Unable to load dashboard data.";
      })

      .addMatcher(
        (action) =>
          [
            "auth/logout",
            "auth/loginUser/fulfilled",
            "auth/registerUser/fulfilled",
          ].includes(action.type),
        () => ({
          stats: null,
          status: "idle",
          error: null,
        }),
      )

      .addMatcher(
        (action) =>
          action.type === "auth/validateSession/rejected" &&
          action.payload?.invalidate,
        () => ({
          stats: null,
          status: "idle",
          error: null,
        }),
      );
  },
});

export const { invalidateDashboard } = dashboardSlice.actions;

export default dashboardSlice.reducer;
