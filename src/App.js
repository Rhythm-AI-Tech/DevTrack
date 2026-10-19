import { Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar/Sidebar";
import Navbar from "./components/Navbar/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import Coding from "./pages/Coding";
import ProblemDetails from "./pages/ProblemDetails";
import DSA from "./pages/DSA";
import GitHub from "./pages/GitHub";
import Goals from "./pages/Goals";
import Projects from "./pages/Projects";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { validateSession } from "./features/auth/authSlice";

import "./App.css";

function AppLayout() {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Navbar />
        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/coding" element={<Coding />} />
            <Route path="/github" element={<GitHub />} />
            <Route path="/dsa" element={<DSA />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/coding/problem/:id" element={<ProblemDetails />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    if (localStorage.getItem("devtrack_token")) {
      dispatch(validateSession());
    }
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<AppLayout />} />
      </Route>
    </Routes>
  );
}

export default App;

