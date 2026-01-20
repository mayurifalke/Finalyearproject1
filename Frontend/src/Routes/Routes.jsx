// src/Routes/Routes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CandidateDashboard from "../components/Candidate/CandidateDashboard";
import RoleSelection from "../components/RoleSelection";
import ProtectedRoute from "../components/ProtectedRoute";
import InterviewerDashboard from "../components/Interviewer/InterviewerDashboard";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Default route → Role selection */}
      <Route path="/" element={<RoleSelection />} />

      <Route
        path="/dashboard/candidate"
        element={
          <ProtectedRoute requiredRole="candidate">
            <CandidateDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/interviewer"
        element={
          <ProtectedRoute requiredRole="interviewer">
            <InterviewerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Redirect all unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
