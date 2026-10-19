
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../../utils/api";

const toDateString = (value) => {
  if (!value) return "";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().slice(0, 10);
};

const formatProblem = (problem) => {
  if (!problem || typeof problem !== "object") {
    throw new Error("The server returned an invalid problem record.");
  }

  const topics = problem.topics ?? problem.topic ?? [];

  return {
    id: String(problem._id ?? problem.id ?? ""),
    name: problem.title ?? problem.name ?? "",
    title: problem.title ?? problem.name ?? "",
    difficulty: problem.difficulty ?? "Unknown",
    platform: problem.platform ?? "Other",
    topics: Array.isArray(topics)
      ? topics
      : typeof topics === "string"
        ? topics.split(",").map((topic) => topic.trim()).filter(Boolean)
        : [],
    solvedAt: toDateString(problem.solvedAt),
    problemUrl: problem.problemUrl ?? "",
    externalId: problem.externalId ?? "",
    origin: problem.origin ?? "legacy-unknown",
    notes: problem.notes ?? "",
    markedForRevision: Boolean(problem.markedForRevision),
    lastRevised: toDateString(problem.lastRevised) || null,
    revisionCount: Number(problem.revisionCount ?? 0),
  };
};

const getErrorMessage = (error, fallback) =>
  error?.message || fallback;

export const fetchProblems = createAsyncThunk(
  "coding/fetchProblems",
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiRequest("/problems");

      if (!Array.isArray(data?.problems)) {
        throw new Error("The server response did not contain a problem list.");
      }

      return data.problems.map(formatProblem);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch coding problems.")
      );
    }
  }
);

export const createProblem = createAsyncThunk(
  "coding/createProblem",
  async (problem, { rejectWithValue }) => {
    try {
      const title = String(problem?.title ?? "").trim();

      if (!title) {
        throw new Error("Please enter a problem title.");
      }

      const topics =
        typeof problem.topics === "string"
          ? problem.topics
              .split(",")
              .map((topic) => topic.trim())
              .filter(Boolean)
          : Array.isArray(problem.topics)
            ? problem.topics
            : [];

      const data = await apiRequest("/problems", {
        method: "POST",
        body: {
          title,
          platform: problem.platform,
          difficulty: problem.difficulty,
          problemUrl: problem.problemUrl?.trim() ?? "",
          solvedAt: problem.solvedAt
            ? new Date(
                `${problem.solvedAt}T12:00:00`
              ).toISOString()
            : new Date().toISOString(),
          notes: problem.notes ?? "",
          topics,
        },
      });

      if (!data?.problem) {
        throw new Error("The server did not return the saved problem.");
      }

      return formatProblem(data.problem);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to save the problem.")
      );
    }
  }
);

export const updateProblem = createAsyncThunk(
  "coding/updateProblem",
  async ({ id, ...fields }, { rejectWithValue }) => {
    try {
      const payload = { ...fields };

      if (payload.name !== undefined) {
        payload.title = payload.name;
        delete payload.name;
      }

      const data = await apiRequest(`/problems/${id}`, {
        method: "PATCH",
        body: payload,
      });

      if (!data?.problem) {
        throw new Error("The server did not return the updated problem.");
      }

      return formatProblem(data.problem);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to update the problem.")
      );
    }
  }
);

export const updateNotes = createAsyncThunk(
  "coding/updateNotes",
  async ({ id, notes }, { rejectWithValue }) => {
    try {
      const data = await apiRequest(`/problems/${id}`, {
        method: "PATCH",
        body: { notes },
      });

      if (!data?.problem) {
        throw new Error("The server did not return the updated problem.");
      }

      return formatProblem(data.problem);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to save notes.")
      );
    }
  }
);

export const toggleRevision = createAsyncThunk(
  "coding/toggleRevision",
  async ({ id, markedForRevision }, { rejectWithValue }) => {
    try {
      const data = await apiRequest(`/problems/${id}`, {
        method: "PATCH",
        body: { markedForRevision },
      });

      if (!data?.problem) {
        throw new Error("The server did not return the updated problem.");
      }

      return formatProblem(data.problem);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to update the revision queue.")
      );
    }
  }
);

export const markAsRevised = createAsyncThunk(
  "coding/markAsRevised",
  async (id, { rejectWithValue }) => {
    try {
      const data = await apiRequest(`/problems/${id}/revisions`, {
        method: "POST",
      });

      if (!data?.problem) {
        throw new Error("The server did not return the updated problem.");
      }

      return formatProblem(data.problem);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to record this revision.")
      );
    }
  }
);

export const deleteProblem = createAsyncThunk(
  "coding/deleteProblem",
  async (id, { rejectWithValue }) => {
    try {
      await apiRequest(`/problems/${id}`, { method: "DELETE" });
      return id;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to delete the problem.")
      );
    }
  }
);

const upsertProblem = (state, problem) => {
  if (!problem?.id) return;

  const index = state.problems.findIndex(
    (item) => item.id === problem.id
  );

  if (index === -1) {
    state.problems.unshift(problem);
  } else {
    state.problems[index] = problem;
  }

  state.problems.sort((a, b) =>
    (b.solvedAt || "").localeCompare(a.solvedAt || "")
  );
};

const initialState = {
  problems: [],
  status: "idle",
  error: null,
  mutationStatus: "idle",
};

const codingSlice = createSlice({
  name: "coding",
  initialState,
  reducers: {
    clearCodingError(state) {
      state.error = null;
    },
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
        state.error = null;
      })
      .addCase(fetchProblems.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.payload || "Unable to load coding problems.";
      })

      .addCase(createProblem.pending, (state) => {
        state.mutationStatus = "saving";
        state.error = null;
      })
      .addCase(createProblem.fulfilled, (state, action) => {
        state.mutationStatus = "idle";
        upsertProblem(state, action.payload);
      })

      .addCase(updateProblem.fulfilled, (state, action) => {
        upsertProblem(state, action.payload);
      })
      .addCase(updateNotes.fulfilled, (state, action) => {
        upsertProblem(state, action.payload);
      })
      .addCase(toggleRevision.fulfilled, (state, action) => {
        upsertProblem(state, action.payload);
      })
      .addCase(markAsRevised.fulfilled, (state, action) => {
        upsertProblem(state, action.payload);
      })
      .addCase(deleteProblem.fulfilled, (state, action) => {
        state.problems = state.problems.filter(
          (problem) => problem.id !== action.payload
        );
      })

      .addMatcher(
        (action) =>
          action.type.startsWith("coding/") &&
          action.type.endsWith("/rejected"),
        (state, action) => {
          state.mutationStatus = "idle";
          state.error =
            action.payload ||
            action.error?.message ||
            "Something went wrong.";
        }
      )

      .addMatcher(
        (action) =>
          [
            "auth/logout",
            "auth/loginUser/fulfilled",
            "auth/registerUser/fulfilled",
          ].includes(action.type),
        () => ({ ...initialState })
      )

      .addMatcher(
        (action) =>
          action.type === "auth/validateSession/rejected" &&
          action.payload?.invalidate,
        () => ({ ...initialState })
      );
  },
});

export const { clearCodingError } = codingSlice.actions;
export default codingSlice.reducer;
