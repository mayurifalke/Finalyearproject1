// src/App.jsx
import React from "react";
import AppRoutes from "./Routes/Routes";
import { AuthProvider } from "./context/AuthContext";


const App = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
