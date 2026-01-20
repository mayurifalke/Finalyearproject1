// models/InterviewerProfile.js
import mongoose from "mongoose";

const interviewerProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  companyName: { type: String, default: "" },
  // add other fields
}, { timestamps: true });

export default mongoose.model("InterviewerProfile", interviewerProfileSchema);
