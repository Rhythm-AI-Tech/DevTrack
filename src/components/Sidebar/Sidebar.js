import "./Sidebar.css";

function Sidebar(){
    return (
        <aside className="sidebar">
            <h2 className="logo">DevTrack</h2>
            <nav className="sidebar-nav">
                <p className="active">Dashboard</p>
                <p>Coding</p>
                <p>GitHub</p>
                <p>DSA</p>
                <p>Projects</p>
                <p>Goals</p>
            </nav>
            <div className="sidebar-bottom">
                <p>Settings</p>
            </div>
        </aside>
    );
}

export default Sidebar;