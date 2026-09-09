import "./Sidebar.css";
import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <aside className="sidebar">
      <h2 className="logo">DevTrack</h2>
      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/coding"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Coding
        </NavLink>
        <NavLink
          to="/github"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          GitHub
        </NavLink>
        <NavLink
          to="/dsa"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          DSA
        </NavLink>
        <NavLink
          to="/projects"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Projects
        </NavLink>
        <NavLink
          to="/goals"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Goals
        </NavLink>
      </nav>
      <div className="sidebar-bottom">
        <NavLink
          to="/settings"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Settings
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;
