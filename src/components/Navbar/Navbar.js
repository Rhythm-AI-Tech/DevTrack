import "./Navbar.css";

function Navbar() {
  return (
    <header className="navbar">
      <input type="text" placeholder="Search anything..." />

      <div className="navbar-right">
        <span>🔥 17 day streak</span>
        <button>🔔</button>
        <button>👤</button>
      </div>
    </header>
  );
}

export default Navbar;
