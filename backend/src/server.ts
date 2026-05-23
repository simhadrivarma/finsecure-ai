const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "https://finsecure-ai.vercel.app",
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const isAllowedOrigin = (origin: any) => {
  if (!origin) return true;

  if (allowedOrigins.includes(origin)) return true;

  try {
    const hostname = new URL(origin).hostname;
    if (hostname.endsWith(".vercel.app")) return true;
  } catch (error) {
    return false;
  }

  return false;
};

const corsOptions = {
  origin: function (origin: any, callback: any) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use((req: any, res: any, next: any) => {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(cors(corsOptions));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: any, res: any) => {
  return res.status(200).json({
    success: true,
    message: "FinSecure AI Backend API is running",
  });
});

app.get("/api/health", (req: any, res: any) => {
  return res.status(200).json({
    success: true,
    message: "FinSecure AI API health check passed",
    time: new Date().toISOString(),
  });
});

const mountRoute = (basePath: string, routePaths: string[], label: string) => {
  for (const routePath of routePaths) {
    try {
      const router = require(routePath);
      app.use(basePath, router);
      console.log(`✅ ${label} mounted at ${basePath}`);
      return;
    } catch (error: any) {
      if (error.code !== "MODULE_NOT_FOUND") {
        console.error(`❌ ${label} failed from ${routePath}:`, error.message);
        throw error;
      }
    }
  }

  console.warn(`⚠️ ${label} not found. Skipped ${basePath}`);
};

/* ===============================
   ROUTES
================================ */

mountRoute("/api/auth", ["./routes/authRoutes", "./routes/auth.routes"], "AUTH ROUTES");

mountRoute("/api/admins", ["./routes/adminRoutes", "./routes/admin.routes"], "ADMIN ROUTES");

mountRoute("/api/admin", ["./routes/adminRoutes", "./routes/admin.routes"], "ADMIN ROUTES ALIAS");

mountRoute(
  "/api/customer-auth",
  ["./routes/customerAuthRoutes", "./routes/customer-auth.routes"],
  "CUSTOMER AUTH ROUTES"
);

mountRoute(
  "/api/employees",
  ["./routes/employeeRoutes", "./routes/employee.routes"],
  "STRICT EMPLOYEE ROUTES"
);

mountRoute(
  "/api/branches",
  ["./routes/branchRoutes", "./routes/branch.routes"],
  "STRICT BRANCH ROUTES"
);

mountRoute(
  "/api/customers",
  ["./routes/customerRoutes", "./routes/customer.routes"],
  "STRICT CUSTOMER ROUTES"
);

mountRoute(
  "/api/loans",
  ["./routes/loanRoutes", "./routes/loan.routes"],
  "STRICT LOAN ROUTES"
);

mountRoute(
  "/api/transactions",
  ["./routes/transactionRoutes", "./routes/transaction.routes"],
  "STRICT TRANSACTION ROUTES"
);

mountRoute(
  "/api/admin-transactions",
  ["./routes/adminTransactionRoutes", "./routes/adminTransaction.routes"],
  "STRICT ADMIN TRANSACTION ROUTES"
);

mountRoute(
  "/api/reports",
  ["./routes/reportRoutes", "./routes/report.routes"],
  "STRICT REPORT ROUTES"
);

mountRoute(
  "/api/audit-logs",
  ["./routes/auditLogRoutes", "./routes/audit.routes"],
  "AUDIT LOG ROUTES"
);

mountRoute(
  "/api/dashboard",
  ["./routes/dashboardRoutes", "./routes/dashboard.routes"],
  "DASHBOARD ROUTES"
);

mountRoute(
  "/api/ai",
  ["./routes/aiRoutes", "./routes/ai.routes"],
  "AI ROUTES"
);

mountRoute(
  "/api/profile",
  ["./routes/profileRoutes", "./routes/profile.routes"],
  "PROFILE ROUTES"
);

/* ===============================
   404 HANDLER
================================ */

app.use((req: any, res: any) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* ===============================
   ERROR HANDLER
================================ */

app.use((error: any, req: any, res: any, next: any) => {
  console.error("❌ Server error:", error);

  return res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

/* ===============================
   DATABASE + SERVER START
================================ */

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/finsecure-ai";

mongoose.set("strictQuery", false);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected ✅");

    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Server running on http://127.0.0.1:${PORT}`);
    });
  })
  .catch((error: any) => {
    console.error("Backend startup failed ❌");
    console.error(error.message || error);
    process.exit(1);
  });

process.on("unhandledRejection", (error: any) => {
  console.error("Unhandled Rejection ❌", error);
});

process.on("uncaughtException", (error: any) => {
  console.error("Uncaught Exception ❌", error);
});