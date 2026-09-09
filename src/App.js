import Sidebar from "./components/Sidebar/Sidebar";
import Navbar from "./components/Navbar/Navbar";
import Dashboard from "./pages/Dashboard";
import DSA from "./pages/DSA";
import GitHub from "./pages/GitHub";
import Goals from "./pages/Goals";
import Projects from "./pages/Projects";
import Settings from "./pages/Settings";
import Coding from "./pages/Coding";
import { Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";

import "./App.css";

function App() {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Navbar />
        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard"/>}/>
            <Route path="/dashboard" element={<Dashboard/>}/>
            <Route path="/coding" element={<Coding/>}/>
            <Route path="/github" element={<GitHub/>}/>
            <Route path="/dsa" element={<DSA/>}/>
            <Route path="/projects" element={<Projects/>}/>
            <Route path="/goals" element={<Goals/>}/>
            <Route path="/settings" element={<Settings/>}/> 
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
