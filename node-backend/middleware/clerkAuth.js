// middleware/clerkAuth.js
import { createClerkClient, verifyToken } from "@clerk/backend";
import User from "../models/User.js";
import CandidateProfile from "../models/CandidateProfile.js";
import InterviewerProfile from "../models/InterviewerProfile.js";

console.log("🟢 Clerk Secret in middleware:", process.env.CLERK_SECRET_KEY);
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const clerkAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No authorization header" });

    const token = authHeader.split(" ")[1];
    const decoded = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    const clerkUser = await clerk.users.getUser(decoded.sub);

    // Find MongoDB user linked to Clerk ID
    let mongoUser = await User.findOne({ clerkId: decoded.sub });

    // If user not found in DB (webhook delay), create them
    if (!mongoUser) {
      console.log("🔄 User not found in DB, creating fallback user...");
      
      const email = clerkUser.primaryEmailAddress?.emailAddress || 
                   clerkUser.emailAddresses?.[0]?.emailAddress || "";
      const username = clerkUser.username || email.split('@')[0] || decoded.sub;
      
      // ✅ FIXED: Check both unsafe and public metadata
      const userType = clerkUser.unsafeMetadata?.user_type || 
                      clerkUser.publicMetadata?.user_type || 
                      "candidate";

      console.log("🎯 Fallback user metadata:", {
        unsafe: clerkUser.unsafeMetadata?.user_type,
        public: clerkUser.publicMetadata?.user_type,
        final: userType
      });

      mongoUser = await User.create({
        clerkId: decoded.sub,
        email,
        username,
        userType
      });

      // Create profile for the user
      await createUserProfile(mongoUser, userType, clerkUser);
      
      console.log("✅ Fallback user created:", mongoUser._id);
    }

    req.clerkUser = clerkUser;
    req.user = mongoUser;
    next();
  } catch (err) {
    console.error("❌ Clerk Auth Error:", err);
    res.status(401).json({ message: "Unauthorized", error: err.message });
  }
};

async function createUserProfile(user, userType, clerkUser) {
  try {
    // ✅ FIXED: Get company name from both metadata sources
    const companyName = clerkUser.unsafeMetadata?.company_name || 
                       clerkUser.publicMetadata?.company_name || "";

    if (userType === "candidate") {
      await CandidateProfile.findOneAndUpdate(
        { user: user._id },
        { user: user._id },
        { upsert: true, new: true }
      );
      console.log("✅ Candidate profile created");
    } else if (userType === "interviewer") {
      await InterviewerProfile.findOneAndUpdate(
        { user: user._id },
        { user: user._id, companyName },
        { upsert: true, new: true }
      );
      console.log("✅ Interviewer profile created with company:", companyName);
    }
  } catch (error) {
    console.error("Error creating user profile:", error);
  }
}