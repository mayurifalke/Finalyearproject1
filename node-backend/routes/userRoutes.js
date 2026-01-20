// routes/userRoutes.js
import express from "express";
import { getProfile } from "../controllers/userController.js";
import { createUser } from "../controllers/userController.js";
import { clerkAuth } from "../middleware/clerkAuth.js";

const router = express.Router();

router.get("/me", clerkAuth, getProfile);
router.post("/", createUser); // ✅ Add this line

export default router;