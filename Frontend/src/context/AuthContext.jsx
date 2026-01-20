// src/context/AuthContext.jsx - COMPLETE REWRITE
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { useUser, useAuth, useClerk } from "@clerk/clerk-react";
import api, { setAuthToken } from "../api";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  const { user, isSignedIn, isLoaded: userLoaded } = useUser();
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { signOut } = useClerk();
  const [userRole, setUserRole] = useState(null);
  const [backendUser, setBackendUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  // ✅ CRITICAL: Use refs for stable values
  const authInitialized = useRef(false);
  const logoutInProgress = useRef(false);
  const navigate = useNavigate();

  // ✅ STABLE: Memoized role detection
  const detectUserRole = useCallback((currentUser, currentBackendUser) => {
    const role = currentUser?.unsafeMetadata?.user_type || 
                 currentUser?.publicMetadata?.user_type || 
                 currentBackendUser?.user_type || 
                 "candidate";
    
    console.log("🎯 Role detection:", {
      unsafeMetadata: currentUser?.unsafeMetadata?.user_type,
      publicMetadata: currentUser?.publicMetadata?.user_type,
      backendUser: currentBackendUser?.user_type,
      finalRole: role
    });
    
    return role;
  }, []);

  // ✅ FIXED: Single authentication initialization
  useEffect(() => {
    // Skip if already initialized, logging out, or not loaded
    if (authInitialized.current || logoutInProgress.current || !userLoaded || !authLoaded) {
      return;
    }

    // If not signed in, just clear and return
    if (!isSignedIn) {
      console.log("👤 User not signed in, clearing auth state");
      setBackendUser(null);
      setUserRole(null);
      setAuthToken(null);
      setIsLoading(false);
      authInitialized.current = false; // Reset for next login
      return;
    }

    // Mark as initializing to prevent multiple runs
    authInitialized.current = true;
    
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setAuthError(null);
        console.log("🔄 Starting ONE-TIME auth initialization...");

        const token = await getToken();
        if (!token) {
          throw new Error("No token available from Clerk");
        }

        // Set token for API calls
        setAuthToken(token);

        // ✅ CALL BACKEND LOGIN ONLY ONCE
        try {
          console.log("🔐 Calling backend login endpoint...");
          const res = await api.post("/auth/login/", {}, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (res.data?.user) {
            setBackendUser(res.data.user);
            console.log("✅ Backend user data received");
            
            // Set role based on backend response
            const role = detectUserRole(user, res.data.user);
            setUserRole(role);
            console.log("🎯 Final user role set to:", role);
          }
        } catch (err) {
          console.warn("⚠️ Backend login endpoint warning:", err?.response?.data || err.message);
          // Fallback to Clerk metadata only
          const role = detectUserRole(user, null);
          setUserRole(role);
        }

      } catch (error) {
        console.error("❌ Auth initialization error:", error);
        setAuthError(error.message);
        authInitialized.current = false; // Reset on error
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [isSignedIn, userLoaded, authLoaded]); // ✅ REMOVED volatile dependencies

  // ✅ SEPARATE: Handle user metadata updates without re-initializing auth
  useEffect(() => {
    if (!user || !isSignedIn || logoutInProgress.current) return;

    // Only update role if we don't have backend data
    if (!backendUser) {
      const role = detectUserRole(user, backendUser);
      if (role && role !== userRole) {
        setUserRole(role);
        console.log("🔄 Updated role from user metadata:", role);
      }
    }
  }, [user, backendUser, userRole, isSignedIn, detectUserRole]);

  // ✅ FIXED: Complete logout with proper cleanup
  const logout = useCallback(async () => {
    if (logoutInProgress.current) {
      console.log("🚫 Logout already in progress");
      return;
    }

    try {
      logoutInProgress.current = true;
      setIsLoading(true);
      
      console.log("🚪 Starting comprehensive logout process...");

      // 1. Clear auth initialization flag FIRST
      authInitialized.current = false;

      // 2. Clear frontend state
      setAuthToken(null);
      setBackendUser(null);
      setUserRole(null);
      setAuthError(null);
      localStorage.removeItem("clerk_token");

      // 3. Call backend logout to clear JWT cookie
      try {
        await api.post("/auth/logout/");
        console.log("✅ Backend logout successful - JWT cookie cleared");
      } catch (err) {
        console.error("❌ Backend logout failed:", err);
        // Continue with frontend cleanup
      }

      // 4. Clerk sign out - this should clear Clerk session
      try {
        await signOut();
        console.log("✅ Clerk sign out successful");
      } catch (err) {
        console.error("❌ Clerk sign out error:", err);
      }

      // 5. Navigate to home
      navigate("/", { replace: true });
      console.log("✅ Logout process completed");

    } catch (error) {
      console.error("❌ Unexpected logout error:", error);
    } finally {
      // Reset after ensuring everything is cleaned up
      setTimeout(() => {
        logoutInProgress.current = false;
        setIsLoading(false);
        console.log("🔄 Logout process fully completed");
      }, 2000);
    }
  }, [signOut, navigate]);

  // Update user role function
  const updateUserRole = useCallback(async (role, companyName = null) => {
    try {
      const metadata = { user_type: role };
      if (role === "interviewer" && companyName) {
        metadata.company_name = companyName;
      }

      await user?.update({
        unsafeMetadata: metadata
      });

      await user?.reload?.();
      setUserRole(role);
      console.log("✅ User role updated to:", role);
      
      return true;
    } catch (err) {
      console.error("❌ Failed to update user role:", err);
      setAuthError(err.message);
      return false;
    }
  }, [user]);

  const value = {
    isAuthenticated: isSignedIn && !logoutInProgress.current,
    user,
    backendUser,
    userRole,
    isLoading: isLoading || logoutInProgress.current,
    authError,
    logout,
    updateUserRole,
    clearError: () => setAuthError(null),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}