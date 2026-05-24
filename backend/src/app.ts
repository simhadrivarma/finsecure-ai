// @ts-nocheck

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transaction.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://finsecure-ai.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let cachedConnection = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in Vercel Environment Variables");
  }

  cachedConnection = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
  });

  console.log("✅ MongoDB Connected");
  return cachedConnection;
}

app.get("/", (req, res) => {
  res.send("FinSecure AI Backend Running 🚀");
});

app.get("/api/health", async (req, res) => {
  try {
    await connectDB();

    return res.status(200).json({
      success: true,
      message: "FinSecure AI Backend Health OK",
      mongoState: mongoose.connection.readyState,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
      mongoState: mongoose.connection.readyState,
    });
  }
});

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/dashboard", dashboardRoutes);

// existing routes above
app.use("/api/auth", authRoutes);
app.use("/api/admins", adminRoutes);
// other routes...

// ✅ PASTE DIRECT CUSTOMER ROUTES HERE

app.get("/api/customers", async (req: any, res: any) => {
  // customer route code
});

app.post("/api/customers", async (req: any, res: any) => {
  // customer route code
});

/* ===============================
   ADMIN CRUD FALLBACK ROUTES
   This makes all AdminPanel buttons work
================================ */

const createAdminCrudFallbackRoutes = require("./routes/adminCrudFallbackRoutes");

app.use(
  "/api/admins",
  createAdminCrudFallbackRoutes("admin", "admins")
);

app.use(
  "/api/employees",
  createAdminCrudFallbackRoutes("employee", "employees")
);

app.use(
  "/api/branches",
  createAdminCrudFallbackRoutes("branch", "branches")
);

app.use(
  "/api/customers",
  createAdminCrudFallbackRoutes("customer", "customers")
);

app.use(
  "/api/loans",
  createAdminCrudFallbackRoutes("loan", "loans")
);

app.use(
  "/api/admin-transactions",
  createAdminCrudFallbackRoutes("transaction", "admintransactions")
);

app.use(
  "/api/reports",
  createAdminCrudFallbackRoutes("report", "reports")
);

app.use(
  "/api/audit-logs",
  createAdminCrudFallbackRoutes("auditLog", "auditlogs")
);

app.use(
  "/api/dashboard",
  createAdminCrudFallbackRoutes.createDashboardRouter()
);

// ❌ 404 handler must stay below customer routes
app.use((req: any, res: any) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

module.exports = app;

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

export default app;
module.exports = app;