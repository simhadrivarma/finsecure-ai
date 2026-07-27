// @ts-nocheck

/*
 * Shared secure Express application.
 * - Vercel/serverless can export this file directly.
 * - server.ts imports the same app for Render/local hosting.
 * - All staff CRUD routes use the central RBAC middleware.
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "https://finsecure-ai.vercel.app",
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(String(process.env.FRONTEND_URL).replace(/\/$/, ""));
}

const isAllowedOrigin = (origin: any) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    return new URL(origin).hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin(origin: any, callback: any) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

const getMongoUri = () =>
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  "";

let mongoPromise: any = null;

const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  const mongoUri = getMongoUri();
  if (!mongoUri) {
    throw new Error("MONGO_URI environment variable is required");
  }

  if (!mongoPromise) {
    mongoose.set("strictQuery", false);
    mongoPromise = mongoose
      .connect(mongoUri, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      })
      .catch((error: any) => {
        mongoPromise = null;
        throw error;
      });
  }

  await mongoPromise;
  return mongoose.connection;
};

app.use(async (req: any, res: any, next: any) => {
  try {
    await connectDatabase();
    return next();
  } catch (error: any) {
    return res.status(503).json({
      success: false,
      message: error.message || "Database connection failed",
    });
  }
});

app.get("/", (_req: any, res: any) =>
  res.status(200).json({
    success: true,
    message: "FinSecure AI Backend API is running",
  })
);

app.get("/api/health", (_req: any, res: any) =>
  res.status(200).json({
    success: true,
    message: "FinSecure AI API health check passed",
    database: mongoose.connection.readyState === 1 ? "connected" : "connecting",
    time: new Date().toISOString(),
  })
);

const mountRoute = (basePath: string, routePath: string, label: string) => {
  const loaded = require(routePath);
  const router = loaded.default || loaded;
  app.use(basePath, router);
  console.log(`✅ ${label} mounted at ${basePath}`);
};

mountRoute("/api/auth", "./routes/authRoutes", "AUTH ROUTES");
mountRoute("/api/admins", "./routes/adminRoutes", "ADMIN ROUTES");
mountRoute("/api/admin", "./routes/adminRoutes", "ADMIN ROUTES ALIAS");
mountRoute("/api/customer-auth", "./routes/customerAuthRoutes", "CUSTOMER AUTH ROUTES");
mountRoute("/api/employees", "./routes/employeeRoutes", "EMPLOYEE ROUTES");
mountRoute("/api/branches", "./routes/branchRoutes", "BRANCH ROUTES");
mountRoute("/api/customers", "./routes/customerRoutes", "CUSTOMER ROUTES");
mountRoute("/api/loans", "./routes/loanRoutes", "LOAN ROUTES");
mountRoute("/api/transactions", "./routes/transactionRoutes", "CUSTOMER TRANSACTION ROUTES");
mountRoute("/api/admin-transactions", "./routes/adminTransactionRoutes", "ADMIN TRANSACTION ROUTES");
mountRoute("/api/reports", "./routes/reportRoutes", "REPORT ROUTES");
mountRoute("/api/audit-logs", "./routes/auditLogRoutes", "AUDIT LOG ROUTES");
mountRoute("/api/dashboard", "./routes/dashboardRoutes", "DASHBOARD ROUTES");
mountRoute("/api/ai", "./routes/ai.routes", "CUSTOMER AI ROUTES");
mountRoute("/api/profile", "./routes/profile.routes", "CUSTOMER PROFILE ROUTES");
mountRoute("/api/admin-ai", "./routes/adminAiRoutes", "ADMIN AI ROUTES");


app.use((req: any, res: any) =>
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  })
);

app.use((error: any, _req: any, res: any, _next: any) => {
  console.error("FinSecure API error:", error);
  return res.status(error?.status || 500).json({
    success: false,
    message: error?.message || "Internal server error",
  });
});

module.exports = app;
module.exports.default = app;
module.exports.connectDatabase = connectDatabase;
