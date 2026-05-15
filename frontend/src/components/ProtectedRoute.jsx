import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ currentUser, requireCompletedProfile = true, children }) {
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireCompletedProfile && !currentUser.profile_completed) {
    return <Navigate to="/profile" replace />;
  }
  
  return children;
}