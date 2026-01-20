// src/components/RoleSelection.jsx - UPDATED
import React, { useState, useEffect } from "react";
import { useClerk, useSignUp, useSignIn, useSession } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import "./RoleSelection.css";

const RoleSelection = () => {
  const [selectedRole, setSelectedRole] = useState("candidate");
  const [companyName, setCompanyName] = useState("");
  const [showEmailSignUp, setShowEmailSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verification, setVerification] = useState(false);
  const [code, setCode] = useState("");
  
  const { openSignUp, openSignIn } = useClerk();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
  const { signIn, isLoaded: isSignInLoaded } = useSignIn();
  const { session } = useSession();
  const { isAuthenticated, userRole, isLoading } = useAuthContext();
  const navigate = useNavigate();

  // Redirect already signed-in users
  useEffect(() => {
    if (!isLoading && isAuthenticated && userRole) {
      console.log("🔄 Redirecting authenticated user to dashboard...");
      if (userRole === "candidate") {
        navigate("/dashboard/candidate", { replace: true });
      } else if (userRole === "interviewer") {
        navigate("/dashboard/interviewer", { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, userRole, navigate]);

  // ✅ FIXED: Simplified Clerk signup
  const handleContinue = async () => {
    try {
      const metadata = { 
        user_type: selectedRole 
      };
      
      if (selectedRole === "interviewer" && companyName) {
        metadata.company_name = companyName;
      }

      console.log("🔄 Opening Clerk signup with metadata:", metadata);

      // Directly open Clerk signup with metadata
      openSignUp({
        unsafeMetadata: metadata,
        afterSignUpUrl: window.location.origin, // Let the auth context handle redirection
      });

    } catch (err) {
      console.error("Sign-up failed:", err);
    }
  };

  const handleSignIn = () => {
    openSignIn({
      afterSignInUrl: window.location.origin, // Let auth context handle redirection
    });
  };

  // Show email verification form
  if (verification) {
    return (
      <div className="role-selection-container">
        <div className="role-selection-card">
          <h2>Verify Your Email</h2>
          <p>We sent a verification code to {email}</p>
          <form onSubmit={handleVerifyEmail}>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter verification code"
              required
            />
            <button type="submit" className="continue-button">
              Verify Email
            </button>
          </form>
          <button 
            onClick={() => setVerification(false)} 
            className="back-button"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Show email signup form
  if (showEmailSignUp) {
    return (
      <div className="role-selection-container">
        <div className="role-selection-card">
          <h2>Sign Up as {selectedRole === "candidate" ? "Candidate" : "Interviewer"}</h2>
          <form onSubmit={handleEmailSignUp}>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="continue-button">
              Create Account
            </button>
          </form>
          <button 
            onClick={() => setShowEmailSignUp(false)} 
            className="back-button"
          >
            Back to Role Selection
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !isSignUpLoaded || !isSignInLoaded) {
    return (
      <div className="role-selection-container">
        <div className="role-selection-card">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated) return null;

  return (
    <div className="role-selection-container">
      <div className="role-selection-card">
        <h2>Join HireAI</h2>
        <p className="subtitle">Choose your role to get started</p>

        <div className="role-options">
          <div
            className={`role-option ${selectedRole === "candidate" ? "selected" : ""}`}
            onClick={() => setSelectedRole("candidate")}
          >
            <div className="role-icon">👤</div>
            <h3>Candidate</h3>
            <p>Looking for job opportunities</p>
          </div>

          <div
            className={`role-option ${selectedRole === "interviewer" ? "selected" : ""}`}
            onClick={() => setSelectedRole("interviewer")}
          >
            <div className="role-icon">🏢</div>
            <h3>Interviewer</h3>
            <p>Hiring talent for your company</p>
          </div>
        </div>

        {selectedRole === "interviewer" && (
          <div className="company-input">
            <label htmlFor="companyName">Company Name (Optional)</label>
            <input
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter your company name"
            />
          </div>
        )}

        <button 
          className="continue-button" 
          onClick={handleContinue}
        >
          Continue as {selectedRole === "candidate" ? "Candidate" : "Interviewer"}
        </button>

        <p className="login-link">
          Already have an account?{" "}
          <a onClick={handleSignIn}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
};

export default RoleSelection;