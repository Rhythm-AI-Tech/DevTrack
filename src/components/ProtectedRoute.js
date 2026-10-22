 import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

function ProtectedRoute() {
  const { token, authChecked } = useSelector((state) => state.auth);

  if (!authChecked) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        Verifying your DevTracker session...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
