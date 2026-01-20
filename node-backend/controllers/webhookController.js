// controllers/webhookController.js
import User from "../models/User.js";
import CandidateProfile from "../models/CandidateProfile.js";
import InterviewerProfile from "../models/InterviewerProfile.js";
import { verifySvixSignature } from "../utils/svixVerify.js";

export const clerkWebhook = async (req, res) => {
  try {
    
    console.log("🟢 Webhook received!");
    console.log("Event type:", req.body?.type);
    console.log("Webhook secret exists:", !!process.env.CLERK_WEBHOOK_SECRET);
    console.log("MongoDB URI exists:", !!process.env.MONGO_URI);
    
    // Debug: Log the full user data with ALL metadata
    if (req.body?.data) {
      console.log("📋 User data received:", {
        id: req.body.data.id,
        email_addresses: req.body.data.email_addresses,
        username: req.body.data.username,
        public_metadata: req.body.data.public_metadata,
        unsafe_metadata: req.body.data.unsafe_metadata, // ✅ ADDED
        private_metadata: req.body.data.private_metadata // ✅ ADDED
      });
    }

    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const sig = req.headers["svix-signature"] || req.headers["svix_signature"];
    const timestampHeader = req.headers["svix-timestamp"] || req.headers["svix_timestamp"];
    const secret = process.env.CLERK_WEBHOOK_SECRET;

    // Verify signature
    const ok = verifySvixSignature(rawBody, sig, timestampHeader, secret);
    if (!ok) {
      console.log("❌ Invalid Svix signature");
      return res.status(401).send("Invalid signature");
    }

    console.log("✅ Signature verified");

    const event = req.body;
    const type = event.type;
    const data = event.data || {};

    switch (type) {
      case "user.created":
        console.log("🧩 Creating user in MongoDB");
        await handleUserCreated(data);
        break;
      case "user.updated":
        console.log("🔄 Updating user in MongoDB");
        await handleUserUpdated(data);
        break;
      case "user.deleted":
        console.log("🗑️ Deleting user from MongoDB");
        await handleUserDeleted(data);
        break;
      default:
        console.log(`🤷 Unhandled event type: ${type}`);
    }

    return res.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(400).json({ error: err.message });
  }
};

async function handleUserCreated(userData) {
  try {
    const clerkId = userData.id;
    if (!clerkId) return;
    
    const email = extractEmail(userData);
    const username = userData.username || (email && email.split("@")[0]) || clerkId;
    
    // ✅ FIXED: Check both unsafe_metadata AND public_metadata
    const unsafe_metadata = userData.unsafe_metadata || {};
    const public_metadata = userData.public_metadata || {};
    
    // ✅ PRIORITY: unsafe_metadata first, then public_metadata, then fallback
    const userType = unsafe_metadata.user_type || 
                    public_metadata.user_type || 
                    "candidate";

    console.log("🎯 Metadata analysis:", {
      unsafe_metadata: unsafe_metadata.user_type,
      public_metadata: public_metadata.user_type,
      finalUserType: userType
    });

    let user = await User.findOne({ clerkId });
    if (!user) {
      user = await User.create({ 
        clerkId, 
        email: email || "", 
        username, 
        userType 
      });
      console.log("✅ User created in MongoDB:", user._id);
      
      // create profile
      await createUserProfile(user, userType, userData);
    } else {
      console.log("ℹ️ User already exists in DB");
    }
  } catch (error) {
    console.error("Error in handleUserCreated:", error);
    throw error;
  }
}

async function handleUserUpdated(userData) {
  try {
    const clerkId = userData.id;
    if (!clerkId) return;
    
    const email = extractEmail(userData);
    
    // ✅ FIXED: Check both metadata sources
    const unsafe_metadata = userData.unsafe_metadata || {};
    const public_metadata = userData.public_metadata || {};
    const userType = unsafe_metadata.user_type || public_metadata.user_type;
    
    const username = userData.username;

    const user = await User.findOne({ clerkId });
    if (!user) {
      console.log("ℹ️ User not found for update, creating new user...");
      await handleUserCreated(userData);
      return;
    }
    
    let updated = false;
    if (email && user.email !== email) { 
      user.email = email; 
      updated = true; 
    }
    if (username && user.username !== username) { 
      user.username = username; 
      updated = true; 
    }
    
    // ✅ FIXED: Update userType if metadata has it
    if (userType && user.userType !== userType) {
      user.userType = userType; 
      updated = true;
      console.log("🔄 User type updated to:", userType);
      await createUserProfile(user, userType, userData);
    }
    
    if (updated) {
      await user.save();
      console.log("✅ User updated in MongoDB");
    }
  } catch (error) {
    console.error("Error in handleUserUpdated:", error);
    throw error;
  }
}

async function handleUserDeleted(userData) {
  try {
    const clerkId = userData.id;
    if (!clerkId) return;
    
    // First find the user to get their _id
    const user = await User.findOne({ clerkId });
    if (!user) {
      console.log("ℹ️ User not found for deletion");
      return;
    }
    
    // Delete user and profiles
    await User.deleteOne({ clerkId });
    await CandidateProfile.deleteOne({ user: user._id }).catch(()=>{});
    await InterviewerProfile.deleteOne({ user: user._id }).catch(()=>{});
    
    console.log("✅ User deleted from MongoDB");
  } catch (error) {
    console.error("Error in handleUserDeleted:", error);
    throw error;
  }
}

async function createUserProfile(user, userType, userData) {
  try {
    // ✅ FIXED: Get company name from both metadata sources
    const unsafe_metadata = userData.unsafe_metadata || {};
    const public_metadata = userData.public_metadata || {};
    const companyName = unsafe_metadata.company_name || public_metadata.company_name || "";

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
    throw error;
  }
}

function extractEmail(userData) {
  // Try primary email first
  if (userData.primary_email_address_id) {
    const primaryEmail = userData.email_addresses?.find(
      email => email.id === userData.primary_email_address_id
    );
    if (primaryEmail) return primaryEmail.email_address;
  }

  // Try verified email
  const verifiedEmail = userData.email_addresses?.find(
    email => email.verification?.status === "verified"
  );
  if (verifiedEmail) return verifiedEmail.email_address;

  // Fallback to first email
  if (userData.email_addresses?.length > 0) {
    return userData.email_addresses[0].email_address;
  }

  return userData.email_addresses?.[0]?.email_address || null;
}