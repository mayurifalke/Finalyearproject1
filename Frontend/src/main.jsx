// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter } from "react-router-dom";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  console.error("❌ Missing VITE_CLERK_PUBLISHABLE_KEY in .env");
}

// Add this debug component temporarily to see real-time data
const DebugInfo = () => {
  const { isAuthenticated, userRole, user, backendUser, isLoading } = useAuthContext();
  
  if (isLoading) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div><strong>Auth Debug Info</strong></div>
      <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
      <div>User Role: {userRole || 'None'}</div>
      <div>Public Metadata: {JSON.stringify(user?.publicMetadata)}</div>
      <div>Backend User: {backendUser ? JSON.stringify(backendUser.user_type) : 'None'}</div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
   <ClerkProvider publishableKey={clerkPubKey}>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</ClerkProvider>

  </React.StrictMode>
);
