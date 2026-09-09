import Sidebar from "./components/Sidebar/Sidebar";
import Navbar from "./components/Navbar/Navbar";
import Dashboard from "./pages/Dashboard";

import "./App.css";

function App() {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Navbar />
        <main className="content">
          <Dashboard/>
        </main>
      </div>
    </div>
  );
}

export default App;
