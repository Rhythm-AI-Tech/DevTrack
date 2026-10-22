import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiRequest } from "../../utils/api";

function getSavedUser() {
  try {
    const saved = localStorage.getItem("devtrack_user");
    return saved ? JSON.parse(saved) : null;
  } catch {
    localStorage.removeItem("devtrack_user");
    return null;
  }
}

const savedToken = localStorage.getItem("devtrack_token");

const initialState = {
  user: getSavedUser(),
  token: savedToken || null,
  loading: false,
  error: null,
  authChecked: !savedToken,
};

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (userData, { rejectWithValue }) => {
    try {
      return await apiRequest("/auth/register", {
        method: "POST",
        body: userData,
        token: null,
      });
    } catch (error) {
      return rejectWithValue(error.message || "Registration failed.");
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials, { rejectWithValue }) => {
    try {
      return await apiRequest("/auth/login", {
        method: "POST",
        body: credentials,
        token: null,
      });
    } catch (error) {
      return rejectWithValue(error.message || "Login failed.");
    }
  }
);

export const validateSession = createAsyncThunk(
  "auth/validateSession",
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiRequest("/auth/me", {
        method: "GET",
      });

      return data.user;
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        invalidate: error.status === 401,
      });
    }
  }
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (fields, { rejectWithValue }) => {
    try {
      const data = await apiRequest("/auth/me", {
        method: "PATCH",
        body: fields,
      });

      return data.user;
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to update your profile."
      );
    }
  }
);

const persistAuth = (state, data) => {
  state.loading = false;
  state.user = data.user;
  state.token = data.token;
  state.authChecked = true;

  localStorage.setItem("devtrack_token", data.token);
  localStorage.setItem(
    "devtrack_user",
    JSON.stringify(data.user)
  );
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.loading = false;
      state.error = null;
      state.authChecked = true;

      localStorage.removeItem("devtrack_token");
      localStorage.removeItem("devtrack_user");
    },

    clearAuthError(state) {
      state.error = null;
    },

    githubConnectionUpdated(state, action) {
      if (!state.user) return;
      state.user.githubUsername = action.payload || "";
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) =>
        persistAuth(state, action.payload)
      )
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Registration failed.";
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) =>
        persistAuth(state, action.payload)
      )
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Login failed.";
      })
      .addCase(validateSession.pending, (state) => {
        state.authChecked = false;
      })
      .addCase(validateSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.authChecked = true;

        localStorage.setItem(
          "devtrack_user",
          JSON.stringify(action.payload)
        );
      })
      .addCase(validateSession.rejected, (state, action) => {
        state.authChecked = true;

        if (action.payload?.invalidate) {
          state.user = null;
          state.token = null;

          localStorage.removeItem("devtrack_token");
          localStorage.removeItem("devtrack_user");
        }
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;

        localStorage.setItem(
          "devtrack_user",
          JSON.stringify(action.payload)
        );
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.error =
          action.payload || "Failed to update your profile.";
      });
  },
});

export const {
  logout,
  clearAuthError,
  githubConnectionUpdated,
} = authSlice.actions;

export default authSlice.reducer;