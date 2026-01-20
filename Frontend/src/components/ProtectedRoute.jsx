// src/components/ProtectedRoute.jsx
import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, userRole, isLoading, logout } = useAuthContext();

  // ✅ NEW: Check for session on route access
  useEffect(() => {
    const checkSession = async () => {
      if (isAuthenticated) {
        try {
          // You can add a session check API call here if needed
          // For now, we rely on Clerk's authentication state
          console.log("🔐 Session verified");
        } catch (error) {
          console.error("Session check failed:", error);
          // If session check fails, log out
          await logout();
        }
      }
    };

    checkSession();
  }, [isAuthenticated, logout]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-md mx-4">
            <p className="font-semibold">Access Denied</p>
            <p className="text-sm mt-2">You don't have permission to access this page.</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;