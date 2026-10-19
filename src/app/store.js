import { configureStore } from "@reduxjs/toolkit";

import codingReducer from "../features/coding/codingSlice.js";
import authReducer from "../features/auth/authSlice.js";
import uiReducer from "../features/ui/uiSlice.js";
import dashboardReducer from "../features/dashboard/dashboardSlice.js";

export const store = configureStore({
  reducer: {
    coding: codingReducer,
    auth: authReducer,
    ui: uiReducer,
    dashboard: dashboardReducer,
  },
});