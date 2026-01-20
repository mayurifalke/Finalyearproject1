// models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  clerkId: { type: String, unique: true, required: true },
  username: { type: String },
  email: { type: String },
  userType: { type: String, enum: ["candidate", "interviewer"], default: "candidate" },
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
