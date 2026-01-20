// controllers/userController.js
// import User from "../models/user.js";
import CandidateProfile from "../models/CandidateProfile.js";
import InterviewerProfile from "../models/InterviewerProfile.js";
import User from "../models/User.js";

export const createUser = async (req, res) => {
  try {
    const { clerkId, email, name, userType, companyName } = req.body;

    console.log("🔄 Creating/updating user in MongoDB:", { clerkId, userType, companyName });

    // Check if user already exists
    let user = await User.findOne({ clerkId });

    if (user) {
      // Update existing user
      user.email = email || user.email;
      user.username = name || user.username;
      
      // ✅ FIXED: Only update userType if provided
      if (userType) {
        user.userType = userType;
      }
      
      await user.save();
      console.log("✅ User updated in MongoDB:", user._id);
    } else {
      // Create new user - use provided userType or default to candidate
      user = await User.create({
        clerkId,
        email: email || "",
        username: name || email?.split('@')[0] || clerkId,
        userType: userType || "candidate" // ✅ Use provided userType
      });
      console.log("✅ User created in MongoDB:", user._id);
    }

    // Create profile with the correct userType
    const finalUserType = userType || user.userType;
    await createUserProfile(user, finalUserType, companyName);

    res.status(200).json({
      message: "User processed successfully",
      user: {
        id: user._id,
        clerk_id: user.clerkId,
        username: user.username,
        email: user.email,
        user_type: user.userType,
      }
    });

  } catch (error) {
    console.error("❌ Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

async function createUserProfile(user, userType, companyName) {
  try {
    if (userType === "candidate") {
      await CandidateProfile.findOneAndUpdate(
        { user: user._id },
        { user: user._id },
        { upsert: true, new: true }
      );
      console.log("✅ Candidate profile created/updated");
    } else if (userType === "interviewer") {
      await InterviewerProfile.findOneAndUpdate(
        { user: user._id },
        { user: user._id, companyName: companyName || "" },
        { upsert: true, new: true }
      );
      console.log("✅ Interviewer profile created/updated with company:", companyName);
    }
  } catch (error) {
    console.error("Error creating user profile:", error);
  }
}