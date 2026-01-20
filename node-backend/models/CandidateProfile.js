// models/CandidateProfile.js
import mongoose from "mongoose";

const candidateProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  resumeUrl: { type: String, default: "" },
  // add other fields as needed
}, { timestamps: true });

export default mongoose.model("CandidateProfile", candidateProfileSchema);
