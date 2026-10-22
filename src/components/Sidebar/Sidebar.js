import "./Sidebar.css";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: "▦" },
  { to: "/coding", label: "Coding", icon: "</>" },
  { to: "/github", label: "GitHub", icon: "⌘" },
  { to: "/dsa", label: "DSA", icon: "◇" },
  { to: "/projects", label: "Projects", icon: "▣" },
  { to: "/goals", label: "Goals", icon: "◎" },
];

function SidebarLink({ to, label, icon }) {
  return (
    <NavLink to={to} title={label} className={({ isActive }) => (isActive ? "active" : "")}>
      <span className="sidebar-nav-icon" aria-hidden="true">{icon}</span>
      <span className="sidebar-link-label">{label}</span>
    </NavLink>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <h2 className="logo">DevTrack</h2>
      <nav className="sidebar-nav" aria-label="Workspace">
        {links.map((link) => <SidebarLink key={link.to} {...link} />)}
      </nav>
      <div className="sidebar-bottom">
        <SidebarLink to="/settings" label="Settings" icon="⚙" />
      </div>
    </aside>
  );
}

export default Sidebar;
