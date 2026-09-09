function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's your progress today.</p>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <p>DSA Problems</p>
          <h2>0</h2>
          <span>This month</span>
        </div>
        <div className="stat-card">
          <p>GitHub Commits</p>
          <h2>0</h2>
          <span>This month</span>
        </div>
        <div className="stat-card">
          <p>Current Streak</p>
          <h2>0</h2>
          <span>This month</span>
        </div>
        <div className="stat-card">
          <p>Projects</p>
          <h2>0</h2>
          <span>This month</span>
        </div>
      </div>
      <div className="activity-section">
        <h2>Activity</h2>
        <p>Your coding activity over the last week</p>
        <div className="activity-chart">
            Chart goes here
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
