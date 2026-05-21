const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use((req: any, res: any, next: any) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const branchRoutes = require("./routes/branchRoutes");
const customerRoutes = require("./routes/customerRoutes");
const loanRoutes = require("./routes/loanRoutes");
const adminTransactionRoutes = require("./routes/adminTransactionRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");

app.get("/", (req: any, res: any) => {
  res.status(200).json({
    success: true,
    message: "FinSecure AI Backend API is running",
  });
});

app.get("/api", (req: any, res: any) => {
  res.status(200).json({
    success: true,
    message: "FinSecure AI API is ready",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/admin-transactions", adminTransactionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);

app.use((req: any, res: any) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

const startServer = async () => {
  try {
    const mongoURI =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://127.0.0.1:27017/finsecure-ai";

    await mongoose.connect(mongoURI);

    console.log("MongoDB Connected ✅");

    const server = app.listen(PORT, HOST, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Server running on http://127.0.0.1:${PORT}`);
    });

    server.on("error", (error: any) => {
      console.error("Server start failed ❌");
      console.error(error.message);
    });

    server.on("close", () => {
      console.log("Server closed ❌");
    });

    setInterval(() => {
      // Keeps backend process alive during local development.
    }, 1000 * 60 * 60);
  } catch (error: any) {
    console.error("Backend startup failed ❌");
    console.error(error.message);
    process.exit(1);
  }
};

process.on("unhandledRejection", (error: any) => {
  console.error("Unhandled Rejection ❌");
  console.error(error);
});

process.on("uncaughtException", (error: any) => {
  console.error("Uncaught Exception ❌");
  console.error(error);
});

startServer();