// routes/authRoutes.js - ADD DEBUG ROUTES
import express from "express";
import { loginUser, getCurrentUser, logoutUser, checkCookies, setTestCookie } from "../controllers/authController.js";
import { clerkAuth } from "../middleware/clerkAuth.js";
import { jwtAuth } from "../middleware/jwtAuth.js";

const router = express.Router();

// Login with Clerk authentication
router.post("/login/", clerkAuth, loginUser);

// Get current user with JWT authentication (for cookie-based auth)
router.get("/me", jwtAuth, getCurrentUser);

// Logout endpoint
router.post("/logout", logoutUser);

// ✅ ADD DEBUG ROUTES
router.get("/check-cookies", checkCookies);
router.get("/set-test-cookie", setTestCookie);

export default router;