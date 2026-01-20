// server.js - FIXED CORS CONFIGURATION
import "./config/config.js";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import cookieParser from 'cookie-parser';

// ✅ 1️⃣ Connect to database first
await connectDB();

const app = express();

// ✅ 2️⃣ FIXED: Proper CORS configuration for cookies
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  credentials: true, // ✅ THIS IS CRUCIAL - allows cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
};

app.use(cors(corsOptions)); // ✅ Use the configured CORS

app.use(cookieParser());

// ✅ 3️⃣ Webhook route with raw body parsing (MUST BE FIRST)
app.use(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  webhookRoutes
);

// ✅ 4️⃣ JSON parser for all other routes
app.use(express.json({ limit: "1mb" }));

// ✅ 5️⃣ Test route
app.get("/", (req, res) => res.send("HireAI Node Backend running ✅"));

// ✅ 6️⃣ API routes
app.use("/api/auth", authRoutes);

// ✅ 7️⃣ Webhook test endpoint
app.get("/api/webhook-test", (req, res) => {
  res.json({ 
    message: "Webhook endpoint is reachable", 
    timestamp: new Date().toISOString(),
    db: process.env.MONGO_URI ? "MongoDB URI is set" : "MongoDB URI missing"
  });
});

// ✅ 8️⃣ Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));