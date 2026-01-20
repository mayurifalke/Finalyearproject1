// controllers/authController.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';
const JWT_EXPIRES_IN = '7d';
const recentLogins = new Map();
const LOGIN_COOLDOWN = 5000; // 5 seconds

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    JWT_SECRET, 
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// controllers/authController.js - ADD DEBUG ENDPOINT
export const checkCookies = async (req, res) => {
  try {
    console.log("🍪 Checking cookies in request:", req.cookies);
    console.log("📋 Request headers:", {
      cookie: req.headers.cookie,
      origin: req.headers.origin,
      host: req.headers.host
    });

    return res.json({
      cookiesPresent: !!req.cookies.token,
      allCookies: req.cookies,
      headers: {
        cookie: req.headers.cookie,
        origin: req.headers.origin,
      }
    });
  } catch (error) {
    console.error("Check cookies error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const setTestCookie = async (req, res) => {
  try {
    res.cookie("test_cookie", "hello_world", {
      httpOnly: false, // ✅ Make it visible to JavaScript for testing
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.json({ message: "Test cookie set" });
  } catch (error) {
    console.error("Set test cookie error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// controllers/authController.js
export const loginUser = async (req, res) => {
  try {
    if (!req.user || !req.clerkUser) {
      return res.status(401).json({ error: "Authentication failed" });
    }

    const user = req.user;
    const userId = user._id.toString();
    
    // ✅ PREVENT RAPID SUCCESSIVE LOGINS
    const now = Date.now();
    const lastLogin = recentLogins.get(userId);
    
    if (lastLogin && (now - lastLogin) < LOGIN_COOLDOWN) {
      console.log("🚫 Preventing rapid successive login for user:", userId);
      // Still return success but don't set new cookie
      return res.json({
        message: "Login successful (cached)",
        user: {
          id: user._id,
          clerk_id: user.clerkId,
          username: user.username,
          email: user.email,
          user_type: user.userType,
        },
        cached: true
      });
    }
    
    // Update last login time
    recentLogins.set(userId, now);

    const jwtToken = generateToken(userId);

    console.log("🔍 Login request details:", {
      origin: req.headers.origin,
      host: req.headers.host,
      userAgent: req.headers['user-agent'],
      userId: userId
    });

    const cookieOptions = {
      httpOnly: true,
      secure: false,
      sameSite: "lax", 
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    };

    console.log("🍪 Setting cookie with options:", cookieOptions);

    res.cookie("token", jwtToken, cookieOptions);

    // Clean up old entries from recentLogins map
    setTimeout(() => {
      recentLogins.delete(userId);
    }, LOGIN_COOLDOWN * 2);

    return res.json({
      message: "Login successful",
      user: {
        id: user._id,
        clerk_id: user.clerkId,
        username: user.username,
        email: user.email,
        user_type: user.userType,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user || !req.clerkUser) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user;
    res.json({
      user: {
        id: user._id,
        clerk_id: user.clerkId,
        username: user.username,
        email: user.email,
        user_type: user.userType,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ ADD LOGOUT ENDPOINT
// controllers/authController.js - FIXED LOGOUT
export const logoutUser = async (req, res) => {
  try {
    console.log("🔒 Logging out user...");
    
    // ✅ FIXED: Match the same cookie options as login
    res.clearCookie("token", {
      httpOnly: true,
      secure: false, // ✅ Must match login configuration
      sameSite: "lax", // ✅ Must match login configuration
      path: '/',
    });

    console.log("✅ Token cookie cleared");

    return res.json({ 
      message: "Logout successful",
      logoutTime: new Date().toISOString()
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};