// @ts-nocheck
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config();

const app = express();

/* ===============================
   MIDDLEWARE
================================ */

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

/* ===============================
   DATABASE CONNECTION
================================ */

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  "";

let mongoPromise: any = null;

const connectDatabase = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is missing in Vercel Environment Variables");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!mongoPromise) {
    mongoose.set("strictQuery", false);

    mongoPromise = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
  }

  await mongoPromise;
  return mongoose.connection;
};

connectDatabase().catch((error: any) => {
  console.error("MongoDB initial connection failed:", error.message);
});

const getCollection = async (collectionName: string) => {
  await connectDatabase();

  if (!mongoose.connection.db) {
    throw new Error("MongoDB database is not ready");
  }

  return mongoose.connection.db.collection(collectionName);
};

/* ===============================
   HELPERS
================================ */

const makeId = (prefix: string) => {
  return `${prefix}${Date.now().toString().slice(-8)}`;
};

const cleanMoney = (value: any) => {
  if (value === undefined || value === null || value === "") return 0;

  const numberValue = Number(
    String(value).replace(/₹/g, "").replace(/,/g, "").trim()
  );

  return Number.isNaN(numberValue) ? 0 : numberValue;
};

const formatRecord = (record: any) => {
  if (!record) return record;

  const obj = { ...record };

  if (obj._id) {
    obj._id = String(obj._id);
  }

  return {
    ...obj,
    id: obj.id || String(obj._id || ""),
  };
};

const buildIdQuery = (id: string) => {
  const or: any[] = [{ id }, { accountNumber: id }, { email: id }];

  if (mongoose.Types.ObjectId.isValid(id)) {
    or.push({ _id: new mongoose.Types.ObjectId(id) });
  }

  return { $or: or };
};

const normalizeRecord = async (
  entity: string,
  body: any,
  oldRecord: any = {}
) => {
  const data: any = {
    ...oldRecord,
    ...body,
  };

  delete data._id;
  delete data.__v;

  if (!data.id) {
    const prefixes: any = {
      admin: "ADM",
      employee: "EMP",
      branch: "BR",
      customer: "CUS",
      loan: "LOAN",
      transaction: "TXN",
      report: "REP",
      auditLog: "LOG",
    };

    data.id = makeId(prefixes[entity] || "REC");
  }

  if (entity === "admin") {
    data.name = data.name || "Admin";
    data.email = data.email ? String(data.email).toLowerCase().trim() : "";
    data.role = data.role || "Branch Manager";
    data.status = data.status || "Active";

    if (data.password && !String(data.password).startsWith("$2")) {
      data.password = await bcrypt.hash(String(data.password), 10);
    }
  }

  if (entity === "employee") {
    data.name = data.name || "";
    data.email = data.email ? String(data.email).toLowerCase().trim() : "";
    data.phone = data.phone || "";
    data.role = data.role || "Customer Support Executive";
    data.branch = data.branch || "Main Branch";
    data.ifsc = data.ifsc || "";
    data.customers = Number(data.customers || 0);
    data.status = data.status || "Active";
  }

  if (entity === "branch") {
    data.name = data.name || "";
    data.address = data.address || "";
    data.ifsc = data.ifsc || "";
    data.manager = data.manager || "";
    data.employees = Number(data.employees || 0);
    data.customers = Number(data.customers || 0);
    data.balance = cleanMoney(data.balance);
    data.loans = cleanMoney(data.loans);
    data.status = data.status || "Active";
  }

  if (entity === "customer") {
    data.name = data.name || data.customerName || "";
    data.customerName = data.customerName || data.name || "";

    data.email = data.email ? String(data.email).toLowerCase().trim() : "";

    data.phone = data.phone || data.phoneNumber || "";
    data.phoneNumber = data.phoneNumber || data.phone || "";

    data.accountNumber = String(data.accountNumber || "").trim();
    data.accountType = data.accountType || "Savings Account";

    data.ifsc = data.ifsc || data.ifscCode || "";
    data.ifscCode = data.ifscCode || data.ifsc || "";

    data.cif = data.cif || data.cifNumber || "";
    data.cifNumber = data.cifNumber || data.cif || "";

    data.aadhaarNumber = data.aadhaarNumber || "";
    data.panNumber = data.panNumber ? String(data.panNumber).toUpperCase() : "";

    data.balance = cleanMoney(data.balance);
    data.totalIncome = cleanMoney(data.totalIncome);
    data.totalExpense = cleanMoney(data.totalExpense);

    data.branch = data.branch || "Main Branch";

    data.assignedEmployee =
      data.assignedEmployee || data.employee || data.assignedEmployeeName || "";

    data.employee = data.employee || data.assignedEmployee || "";

    data.kyc = data.kyc || "Pending";
    data.status = data.status || "Active";
  }

  if (entity === "loan") {
    data.customer = data.customer || data.customerName || "";
    data.accountNumber = data.accountNumber || "";
    data.type = data.type || "Personal Loan";
    data.amount = cleanMoney(data.amount);
    data.interest = data.interest || "";
    data.startDate = data.startDate || "";
    data.endDate = data.endDate || "";
    data.emi = cleanMoney(data.emi);
    data.paid = cleanMoney(data.paid);
    data.pending = cleanMoney(data.pending);
    data.officer = data.officer || "";
    data.status = data.status || "Active";
  }

  if (entity === "transaction") {
    data.customer = data.customer || "";
    data.accountNumber = data.accountNumber || "";
    data.type = data.type || "UPI Payment";
    data.amount = cleanMoney(data.amount);
    data.date = data.date || new Date().toISOString().slice(0, 10);
    data.time =
      data.time ||
      new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    data.ref = data.ref || `REF${Date.now()}`;
    data.status = data.status || "Success";
    data.risk = data.risk || "Normal";
    data.riskScore = Number(data.riskScore || 0);
  }

  if (entity === "report") {
    data.title = data.title || "Admin Report";
    data.type = data.type || "Customer";
    data.totalRecords = Number(data.totalRecords || 0);
    data.generatedBy = data.generatedBy || "Admin";
    data.generatedDate =
      data.generatedDate || new Date().toISOString().slice(0, 10);
    data.status = data.status || "Ready";
  }

  if (entity === "auditLog") {
    data.action = data.action || "System";
    data.module = data.module || "Admin";
    data.adminName = data.adminName || "Admin";
    data.adminEmail = data.adminEmail || "admin@finsecure.ai";
    data.adminRole = data.adminRole || "Super Admin";
    data.description = data.description || "Admin action recorded";
    data.status = data.status || "Success";
  }

  data.updatedAt = new Date();

  if (!data.createdAt) {
    data.createdAt = new Date();
  }

  return data;
};

/* ===============================
   HEALTH ROUTES
================================ */

app.get("/", (req: any, res: any) => {
  res.send("FinSecure AI Backend Running 🚀");
});

app.get("/api/health", async (req: any, res: any) => {
  try {
    await connectDatabase();

    return res.status(200).json({
      success: true,
      message: "FinSecure AI Backend Health OK",
      mongoState: mongoose.connection.readyState,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
      mongoState: mongoose.connection.readyState,
    });
  }
});

/* ===============================
   DIRECT AUTH ROUTES
================================ */

app.post("/api/auth/login", async (req: any, res: any) => {
  try {
    const jwt = require("jsonwebtoken");
    const bcrypt = require("bcryptjs");

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    await connectDatabase();

    const usersCollection = await getCollection("users");
    const adminsCollection = await getCollection("admins");

    let account =
      (await adminsCollection.findOne({ email: normalizedEmail })) ||
      (await usersCollection.findOne({ email: normalizedEmail }));

    if (!account) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      String(password),
      String(account.password || "")
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const safeUser = {
      ...account,
      _id: String(account._id),
      id: account.id || String(account._id),
      role: account.role || "customer",
    };

    delete safeUser.password;

    const token = jwt.sign(
      {
        id: safeUser._id,
        email: safeUser.email,
        role: safeUser.role,
      },
      process.env.JWT_SECRET || "finsecure_ai_secret_key",
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: safeUser,
      data: safeUser,
      token,
    });
  } catch (error: any) {
    console.error("Direct login failed:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
});

app.post("/api/auth/register", async (req: any, res: any) => {
  try {
    const bcrypt = require("bcryptjs");
    const jwt = require("jsonwebtoken");

    const { name, email, password, role, phone, aadhaarNumber, panNumber } =
      req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    await connectDatabase();

    const usersCollection = await getCollection("users");

    const existingUser = await usersCollection.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Account already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const userPayload = {
      id: makeId("CUS"),
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "customer",
      phone: phone || "",
      aadhaarNumber: aadhaarNumber || "",
      panNumber: panNumber ? String(panNumber).toUpperCase() : "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const inserted = await usersCollection.insertOne(userPayload);

    const safeUser = {
      ...userPayload,
      _id: String(inserted.insertedId),
    };

    delete safeUser.password;

    const token = jwt.sign(
      {
        id: safeUser._id,
        email: safeUser.email,
        role: safeUser.role,
      },
      process.env.JWT_SECRET || "finsecure_ai_secret_key",
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Registered successfully",
      user: safeUser,
      data: safeUser,
      token,
    });
  } catch (error: any) {
    console.error("Direct register failed:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
});

/* ===============================
   ADMIN PANEL CRUD ROUTES
================================ */

const createCrudRoutes = (
  apiPath: string,
  entity: string,
  collectionName: string
) => {
  app.get(apiPath, async (req: any, res: any) => {
    try {
      const collection = await getCollection(collectionName);

      const rows = await collection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        count: rows.length,
        data: rows.map(formatRecord),
      });
    } catch (error: any) {
      console.error(`${entity} GET failed:`, error);

      return res.status(500).json({
        success: false,
        message: error.message || `Failed to load ${entity}`,
      });
    }
  });

  app.post(apiPath, async (req: any, res: any) => {
    try {
      const collection = await getCollection(collectionName);
      const payload = await normalizeRecord(entity, req.body);

      if (entity === "customer" && !payload.name) {
        return res.status(400).json({
          success: false,
          message: "Customer name is required",
        });
      }

      if (entity === "customer" && !payload.accountNumber) {
        return res.status(400).json({
          success: false,
          message: "Account number is required",
        });
      }

      if (entity === "branch" && !payload.name) {
        return res.status(400).json({
          success: false,
          message: "Branch name is required",
        });
      }

      if (entity === "employee" && !payload.name) {
        return res.status(400).json({
          success: false,
          message: "Employee name is required",
        });
      }

      if (entity === "admin" && !payload.email) {
        return res.status(400).json({
          success: false,
          message: "Admin email is required",
        });
      }

      if (payload.email) {
        const existingEmail = await collection.findOne({
          email: payload.email,
        });

        if (existingEmail) {
          return res.status(409).json({
            success: false,
            message: `${entity} already exists with this email`,
          });
        }
      }

      if (payload.accountNumber) {
        const existingAccount = await collection.findOne({
          accountNumber: payload.accountNumber,
        });

        if (existingAccount) {
          return res.status(409).json({
            success: false,
            message: `${entity} already exists with this account number`,
          });
        }
      }

      const inserted = await collection.insertOne(payload);

      const created = await collection.findOne({
        _id: inserted.insertedId,
      });

      return res.status(201).json({
        success: true,
        message: `${entity} created successfully`,
        data: formatRecord(created || payload),
      });
    } catch (error: any) {
      console.error(`${entity} POST failed:`, error);

      return res.status(500).json({
        success: false,
        message: error.message || `Failed to create ${entity}`,
      });
    }
  });

  app.get(`${apiPath}/:id`, async (req: any, res: any) => {
    try {
      const collection = await getCollection(collectionName);

      const record = await collection.findOne(buildIdQuery(req.params.id));

      if (!record) {
        return res.status(404).json({
          success: false,
          message: `${entity} not found`,
        });
      }

      return res.status(200).json({
        success: true,
        data: formatRecord(record),
      });
    } catch (error: any) {
      console.error(`${entity} GET ONE failed:`, error);

      return res.status(500).json({
        success: false,
        message: error.message || `Failed to load ${entity}`,
      });
    }
  });

  app.put(`${apiPath}/:id`, async (req: any, res: any) => {
    try {
      const collection = await getCollection(collectionName);

      const existing = await collection.findOne(buildIdQuery(req.params.id));

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: `${entity} not found`,
        });
      }

      const payload = await normalizeRecord(entity, req.body, existing);

      await collection.updateOne(buildIdQuery(req.params.id), {
        $set: payload,
      });

      const updated = await collection.findOne(buildIdQuery(req.params.id));

      return res.status(200).json({
        success: true,
        message: `${entity} updated successfully`,
        data: formatRecord(updated || payload),
      });
    } catch (error: any) {
      console.error(`${entity} PUT failed:`, error);

      return res.status(500).json({
        success: false,
        message: error.message || `Failed to update ${entity}`,
      });
    }
  });

  app.delete(`${apiPath}/:id`, async (req: any, res: any) => {
    try {
      const collection = await getCollection(collectionName);

      const result = await collection.deleteOne(buildIdQuery(req.params.id));

      if (!result.deletedCount) {
        return res.status(404).json({
          success: false,
          message: `${entity} not found`,
        });
      }

      return res.status(200).json({
        success: true,
        message: `${entity} deleted successfully`,
      });
    } catch (error: any) {
      console.error(`${entity} DELETE failed:`, error);

      return res.status(500).json({
        success: false,
        message: error.message || `Failed to delete ${entity}`,
      });
    }
  });
};

createCrudRoutes("/api/admins", "admin", "admins");
createCrudRoutes("/api/employees", "employee", "employees");
createCrudRoutes("/api/branches", "branch", "branches");
createCrudRoutes("/api/customers", "customer", "customers");
createCrudRoutes("/api/loans", "loan", "loans");
createCrudRoutes("/api/admin-transactions", "transaction", "admintransactions");
createCrudRoutes("/api/reports", "report", "reports");
createCrudRoutes("/api/audit-logs", "auditLog", "auditlogs");

/* ===============================
   DASHBOARD ROUTE
================================ */

app.get("/api/dashboard", async (req: any, res: any) => {
  try {
    const customersCollection = await getCollection("customers");
    const employeesCollection = await getCollection("employees");
    const branchesCollection = await getCollection("branches");
    const loansCollection = await getCollection("loans");
    const transactionsCollection = await getCollection("admintransactions");
    const reportsCollection = await getCollection("reports");
    const auditLogsCollection = await getCollection("auditlogs");

    const [
      customers,
      employees,
      branches,
      loans,
      transactions,
      reports,
      auditLogs,
    ] = await Promise.all([
      customersCollection.find({}).toArray(),
      employeesCollection.find({}).toArray(),
      branchesCollection.find({}).toArray(),
      loansCollection.find({}).toArray(),
      transactionsCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
      reportsCollection.find({}).toArray(),
      auditLogsCollection.find({}).toArray(),
    ]);

    const totalBalance = customers.reduce(
      (sum: number, item: any) => sum + Number(item.balance || 0),
      0
    );

    const totalLoanAmount = loans.reduce(
      (sum: number, item: any) => sum + Number(item.amount || 0),
      0
    );

    const transactionVolume = transactions.reduce(
      (sum: number, item: any) => sum + Number(item.amount || 0),
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        totalCustomers: customers.length,
        activeCustomers: customers.filter((c: any) => c.status === "Active")
          .length,

        totalEmployees: employees.length,
        totalBranches: branches.length,

        totalLoans: loans.length,
        activeLoans: loans.filter((l: any) => l.status === "Active").length,

        totalReports: reports.length,
        totalAuditLogs: auditLogs.length,

        totalBalance: `₹${totalBalance.toLocaleString("en-IN")}`,
        branchBalance: `₹${totalBalance.toLocaleString("en-IN")}`,
        totalLoanAmount: `₹${totalLoanAmount.toLocaleString("en-IN")}`,
        transactionVolume: `₹${transactionVolume.toLocaleString("en-IN")}`,

        aiRiskAlerts: transactions.filter((t: any) =>
          ["High", "Medium", "Flagged"].includes(t.risk || t.status)
        ).length,

        riskDistribution: {
          normal: transactions.filter((t: any) => t.risk === "Normal").length,
          low: transactions.filter((t: any) => t.risk === "Low").length,
          medium: transactions.filter((t: any) => t.risk === "Medium").length,
          high: transactions.filter((t: any) => t.risk === "High").length,
        },

        recentTransactions: transactions.map(formatRecord),
      },
    });
  } catch (error: any) {
    console.error("dashboard GET failed:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Dashboard failed",
    });
  }
});

/* ===============================
   OLD AUTH ROUTES ONLY
================================ */

const mountRoute = (path: string, possibleFiles: string[], label: string) => {
  for (const file of possibleFiles) {
    try {
      const route = require(file);
      app.use(path, route);
      console.log(`Mounted ${label}: ${path} from ${file}`);
      return;
    } catch (error: any) {
      console.warn(`Skipped ${label} from ${file}: ${error.message}`);
    }
  }

  console.warn(`No route mounted for ${label}: ${path}`);
};

mountRoute(
  "/api/auth",
  [
    "./routes/authRoutes",
    "./routes/auth.routes",
    "./routes/customerAuthRoutes",
    "./routes/customerAuth.routes",
  ],
  "AUTH ROUTES"
);

mountRoute(
  "/api/customer-auth",
  ["./routes/customerAuthRoutes", "./routes/customerAuth.routes"],
  "CUSTOMER AUTH ROUTES"
);

mountRoute(
  "/api/transactions",
  ["./routes/transactionRoutes", "./routes/transaction.routes"],
  "CUSTOMER TRANSACTION ROUTES"
);

mountRoute(
  "/api/ai",
  ["./routes/ai.routes", "./routes/aiRoutes"],
  "AI ROUTES"
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
  console.error("Unhandled backend error:", error);

  return res.status(500).json({
    success: false,
    message: error.message || "Internal Server Error",
  });
});

module.exports = app;