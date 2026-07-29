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
   DATABASE
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
 
const generateAccountNumber = () => {
  const timePart = Date.now().toString().slice(-8);
  const randomPart = Math.floor(100 + Math.random() * 900).toString();
  return `${timePart}${randomPart}`;
};
 
const generateCifNumber = () => {
  const timePart = Date.now().toString().slice(-8);
  const randomPart = Math.floor(10 + Math.random() * 90).toString();
  return `CIF${timePart}${randomPart}`;
};
 
const getIfscByBranch = (branchName: string) => {
  const branch = String(branchName || "Main Branch").toLowerCase();
 
  if (branch.includes("gajuwaka")) return "FINS0001008";
  if (branch.includes("jagadamba")) return "FINS0001009";
  if (branch.includes("autonagar")) return "FINS0001010";
  if (branch.includes("auto nagar")) return "FINS0001010";
  if (branch.includes("bc road")) return "FINS0001011";
  if (branch.includes("b c road")) return "FINS0001011";
 
  return "FINS0001001";
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
 
const getDefaultCustomerPassword = (customer: any) => {
  const phoneDigits = String(customer.phone || customer.phoneNumber || "").replace(
    /\D/g,
    ""
  );
 
  if (phoneDigits.length >= 6) {
    return phoneDigits.slice(-6);
  }
 
  const accountDigits = String(customer.accountNumber || "").replace(/\D/g, "");
 
  if (accountDigits.length >= 6) {
    return accountDigits.slice(-6);
  }
 
  return "123456";
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
    data.ifsc = data.ifsc || getIfscByBranch(data.branch);
    data.customers = Number(data.customers || 0);
    data.status = data.status || "Active";
  }
 
  if (entity === "branch") {
    data.name = data.name || "";
    data.address = data.address || "";
    data.ifsc = data.ifsc || getIfscByBranch(data.name);
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
 
    data.branch = data.branch || "Main Branch";
 
    data.accountNumber = String(data.accountNumber || "").trim();
    if (!data.accountNumber) {
      data.accountNumber = generateAccountNumber();
    }
 
    data.accountType = data.accountType || "Savings Account";
 
    data.ifsc = data.ifsc || data.ifscCode || "";
    if (!data.ifsc) {
      data.ifsc = getIfscByBranch(data.branch);
    }
 
    data.ifscCode = data.ifscCode || data.ifsc || "";
 
    data.cif = data.cif || data.cifNumber || "";
    if (!data.cif) {
      data.cif = generateCifNumber();
    }
 
    data.cifNumber = data.cifNumber || data.cif || "";
 
    data.aadhaarNumber = data.aadhaarNumber || "";
    data.panNumber = data.panNumber ? String(data.panNumber).toUpperCase() : "";
 
    data.balance = cleanMoney(data.balance);
    data.totalIncome = cleanMoney(data.totalIncome);
    data.totalExpense = cleanMoney(data.totalExpense);
 
    data.assignedEmployee =
      data.assignedEmployee || data.employee || data.assignedEmployeeName || "";
 
    data.employee = data.employee || data.assignedEmployee || "";
 
    data.kyc = data.kyc || "Pending";
    data.status = data.status || "Active";
    data.role = "customer";
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
    data.customer = data.customer || data.customerName || "";
    data.accountNumber = data.accountNumber || "";
    data.email = data.email ? String(data.email).toLowerCase().trim() : "";
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
   SYNC HELPERS
================================ */
 
const syncCustomerToLoginUser = async (customerData: any, plainPassword?: any) => {
  if (!customerData?.email) return;
 
  const usersCollection = await getCollection("users");
 
  const email = String(customerData.email).toLowerCase().trim();
 
  const existingUser = await usersCollection.findOne({ email });
 
  const defaultPassword =
    plainPassword || customerData.password || getDefaultCustomerPassword(customerData);
 
  const finalBranch = customerData.branch || "Main Branch";
  const finalAccountNumber =
    customerData.accountNumber || generateAccountNumber();
  const finalIfsc =
    customerData.ifsc || customerData.ifscCode || getIfscByBranch(finalBranch);
  const finalCif = customerData.cif || customerData.cifNumber || generateCifNumber();
 
  const userPayload: any = {
    name: customerData.name || customerData.customerName || "Customer",
    customerName: customerData.customerName || customerData.name || "Customer",
    email,
    role: "customer",
    phone: customerData.phone || customerData.phoneNumber || "",
    phoneNumber: customerData.phoneNumber || customerData.phone || "",
    accountNumber: finalAccountNumber,
    accountType: customerData.accountType || "Savings Account",
    ifsc: finalIfsc,
    ifscCode: finalIfsc,
    cif: finalCif,
    cifNumber: finalCif,
    aadhaarNumber: customerData.aadhaarNumber || "",
    panNumber: customerData.panNumber || "",
    balance: cleanMoney(customerData.balance),
    totalIncome: cleanMoney(customerData.totalIncome),
    totalExpense: cleanMoney(customerData.totalExpense),
    branch: finalBranch,
    assignedEmployee: customerData.assignedEmployee || customerData.employee || "",
    kyc: customerData.kyc || "Pending",
    status: customerData.status || "Active",
    updatedAt: new Date(),
  };
 
  if (existingUser) {
    await usersCollection.updateOne(
      { email },
      {
        $set: userPayload,
      }
    );
    return;
  }
 
  userPayload.id = customerData.id || makeId("CUS");
  userPayload.password = await bcrypt.hash(String(defaultPassword), 10);
  userPayload.createdAt = new Date();
 
  await usersCollection.insertOne(userPayload);
};
 
const syncUserToCustomerRecord = async (userData: any) => {
  if (!userData?.email) return null;
 
  const customersCollection = await getCollection("customers");
 
  const email = String(userData.email).toLowerCase().trim();
 
  const finalBranch = userData.branch || "Main Branch";
  const finalAccountNumber = userData.accountNumber || generateAccountNumber();
  const finalIfsc = userData.ifsc || userData.ifscCode || getIfscByBranch(finalBranch);
  const finalCif = userData.cif || userData.cifNumber || generateCifNumber();
 
  const customerPayload = await normalizeRecord("customer", {
    id: userData.id || makeId("CUS"),
    name: userData.name || userData.customerName || "Customer",
    customerName: userData.customerName || userData.name || "Customer",
    email,
    phone: userData.phone || userData.phoneNumber || "",
    phoneNumber: userData.phoneNumber || userData.phone || "",
    accountNumber: finalAccountNumber,
    accountType: userData.accountType || "Savings Account",
    ifsc: finalIfsc,
    ifscCode: finalIfsc,
    cif: finalCif,
    cifNumber: finalCif,
    aadhaarNumber: userData.aadhaarNumber || "",
    panNumber: userData.panNumber || "",
    balance: cleanMoney(userData.balance),
    totalIncome: cleanMoney(userData.totalIncome),
    totalExpense: cleanMoney(userData.totalExpense),
    branch: finalBranch,
    assignedEmployee: userData.assignedEmployee || userData.employee || "",
    kyc: userData.kyc || "Pending",
    status: userData.status || "Active",
  });
 
  const createdAtForInsert = customerPayload.createdAt || new Date();
 
  delete customerPayload.createdAt;
 
  await customersCollection.updateOne(
    { email },
    {
      $set: customerPayload,
      $setOnInsert: {
        createdAt: createdAtForInsert,
      },
    },
    { upsert: true }
  );
 
  return await customersCollection.findOne({ email });
};
 
const applyTransactionToCustomerBalance = async (transaction: any) => {
  const amount = cleanMoney(transaction.amount);
 
  if (!amount || amount <= 0) return;
 
  const type = String(transaction.type || "").toLowerCase();
 
  const isCredit =
    type.includes("deposit") ||
    type.includes("credit") ||
    type.includes("income") ||
    transaction.direction === "credit";
 
  const isDebit =
    type.includes("withdraw") ||
    type.includes("debit") ||
    type.includes("expense") ||
    type.includes("upi") ||
    type.includes("transfer") ||
    transaction.direction === "debit";
 
  if (!isCredit && !isDebit) return;
 
  const customersCollection = await getCollection("customers");
 
  const query: any = {};
 
  if (transaction.accountNumber) {
    query.accountNumber = String(transaction.accountNumber);
  } else if (transaction.email) {
    query.email = String(transaction.email).toLowerCase().trim();
  } else {
    return;
  }
 
  await customersCollection.updateOne(query, {
    $inc: {
      balance: isCredit ? amount : -amount,
      totalIncome: isCredit ? amount : 0,
      totalExpense: isDebit ? amount : 0,
    },
    $set: {
      updatedAt: new Date(),
    },
  });
 
  const updatedCustomer = await customersCollection.findOne(query);
 
  if (updatedCustomer) {
    await syncCustomerToLoginUser(updatedCustomer);
  }
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
    const customersCollection = await getCollection("customers");
 
    let account =
      (await adminsCollection.findOne({ email: normalizedEmail })) ||
      (await usersCollection.findOne({ email: normalizedEmail }));
 
    if (!account) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
 
    let isPasswordCorrect = false;
 
    if (account.password && String(account.password).startsWith("$2")) {
      isPasswordCorrect = await bcrypt.compare(String(password), String(account.password));
    } else {
      isPasswordCorrect = String(password) === String(account.password || "");
    }
 
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
 
    let customerProfile = null;
 
    const accountRole = String(account.role || "").toLowerCase();
 
    if (!accountRole.includes("admin") && !accountRole.includes("super")) {
      customerProfile = await customersCollection.findOne({ email: normalizedEmail });
 
      if (!customerProfile) {
        customerProfile = await syncUserToCustomerRecord(account);
      }
    }
 
    const safeUser = {
      ...(customerProfile || {}),
      ...account,
      ...(customerProfile || {}),
      _id: String((customerProfile || account)._id || account._id),
      id:
        (customerProfile && (customerProfile.id || String(customerProfile._id))) ||
        account.id ||
        String(account._id),
      role: account.role || customerProfile?.role || "customer",
      email: normalizedEmail,
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
      user: formatRecord(safeUser),
      data: formatRecord(safeUser),
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
    const jwt = require("jsonwebtoken");
 
    const {
      name,
      email,
      password,
      role,
      phone,
      phoneNumber,
      aadhaarNumber,
      panNumber,
      accountNumber,
      accountType,
      ifsc,
      ifscCode,
      cif,
      cifNumber,
      branch,
    } = req.body;
 
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
 
    const userId = makeId("CUS");
 
    const finalBranch = branch || "Main Branch";
    const finalAccountNumber = accountNumber || generateAccountNumber();
    const finalIfsc = ifsc || ifscCode || getIfscByBranch(finalBranch);
    const finalCif = cif || cifNumber || generateCifNumber();
 
    const hashedPassword = await bcrypt.hash(String(password), 10);
 
    const userPayload = {
      id: userId,
      name: String(name).trim(),
      customerName: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "customer",
      phone: phone || phoneNumber || "",
      phoneNumber: phoneNumber || phone || "",
      aadhaarNumber: aadhaarNumber || "",
      panNumber: panNumber ? String(panNumber).toUpperCase() : "",
      accountNumber: finalAccountNumber,
      accountType: accountType || "Savings Account",
      ifsc: finalIfsc,
      ifscCode: finalIfsc,
      cif: finalCif,
      cifNumber: finalCif,
      balance: 0,
      totalIncome: 0,
      totalExpense: 0,
      branch: finalBranch,
      kyc: "Pending",
      status: "Active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
 
    const inserted = await usersCollection.insertOne(userPayload);
 
    const customerRecord = await syncUserToCustomerRecord({
      ...userPayload,
      _id: inserted.insertedId,
    });
 
    const safeUser = {
      ...(customerRecord || userPayload),
      _id: String((customerRecord && customerRecord._id) || inserted.insertedId),
      id: (customerRecord && customerRecord.id) || userId,
      role: "customer",
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
      user: formatRecord(safeUser),
      data: formatRecord(safeUser),
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
   CUSTOMER PROFILE ROUTES
================================ */
 
app.get("/api/customer/profile", async (req: any, res: any) => {
  try {
    const jwt = require("jsonwebtoken");
 
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");
 
    let email = req.query.email ? String(req.query.email).toLowerCase().trim() : "";
 
    if (!email && token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "finsecure_ai_secret_key"
      );
      email = String(decoded.email || "").toLowerCase().trim();
    }
 
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email or token is required",
      });
    }
 
    const customersCollection = await getCollection("customers");
 
    const customer = await customersCollection.findOne({ email });
 
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer profile not found",
      });
    }
 
    return res.status(200).json({
      success: true,
      data: formatRecord(customer),
      user: formatRecord(customer),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load customer profile",
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
 
      if (payload.email && entity !== "transaction") {
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
 
      if (payload.accountNumber && entity !== "transaction") {
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
 
                 if (entity === "admin" || collectionName === "admins") {
        const employeeId = String(
          payload.employeeId ||
            payload.employeeID ||
            req.body.employeeId ||
            req.body.employeeID ||
            ""
        ).trim();
 
        if (!employeeId) {
          return res.status(400).json({
            success: false,
            message: "Employee ID is required to create an admin.",
          });
        }
 
        const employeeCollection = await getCollection("employees");
 
        const employee = await employeeCollection.findOne({
          $or: [
            { id: employeeId },
            { employeeId: employeeId },
            { employeeID: employeeId },
          ],
        });
 
        if (!employee) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid Employee ID. Please enter a valid employee ID from Employee Management.",
          });
        }
 
        const possibleEmployeeIds = [
          employeeId,
          employee.employeeId,
          employee.employeeID,
          employee.id,
        ]
          .map((value) => String(value || "").trim())
          .filter((value) => value.length > 0);
 
        const uniqueEmployeeIds = [...new Set(possibleEmployeeIds)];
 
        let existingAdminForEmployee: any = null;
 
        if (uniqueEmployeeIds.length > 0) {
          existingAdminForEmployee = await collection.findOne({
            $or: uniqueEmployeeIds.flatMap((id) => [
              { employeeId: id },
              { employeeID: id },
            ]),
          });
        }
 
        if (existingAdminForEmployee) {
          const existingEmployeeId = String(
            existingAdminForEmployee.employeeId ||
              existingAdminForEmployee.employeeID ||
              ""
          ).trim();
 
          const existingAdminLabel =
            existingAdminForEmployee.name ||
            existingAdminForEmployee.email ||
            existingAdminForEmployee.id ||
            "Existing Admin";
 
          const isRealDuplicate =
            existingEmployeeId.length > 0 &&
            uniqueEmployeeIds.includes(existingEmployeeId);
 
          if (isRealDuplicate) {
            return res.status(409).json({
              success: false,
              message: `This employee already has an admin account: ${existingAdminLabel}`,
            });
          }
        }
 
        const employeeBranch =
          employee.branch ||
          employee.branchName ||
          employee.assignedBranch ||
          "";
 
        const employeeIfsc =
          employee.ifsc ||
          employee.ifscCode ||
          employee.IFSC ||
          "";
 
        if (!employeeBranch) {
          return res.status(400).json({
            success: false,
            message:
              "This employee does not have a branch assigned. Please update employee details first.",
          });
        }
 
        if (!employeeIfsc) {
          return res.status(400).json({
            success: false,
            message:
              "This employee does not have an IFSC code assigned. Please update employee details first.",
          });
        }
 
        payload.employeeId =
          employee.employeeId ||
          employee.employeeID ||
          employee.id ||
          employeeId;
 
        payload.employeeID = payload.employeeId;
        payload.employeeName = employee.name || employee.employeeName || "";
 
        payload.name =
          payload.name ||
          employee.name ||
          employee.employeeName ||
          "";
 
        payload.email =
          payload.email ||
          employee.email ||
          employee.employeeEmail ||
          "";
 
        payload.branch = employeeBranch;
        payload.branchName = employeeBranch;
        payload.ifsc = String(employeeIfsc).toUpperCase().trim();
        payload.ifscCode = payload.ifsc;
      }
 
      const inserted = await collection.insertOne(payload);
 
      const created = await collection.findOne({
        _id: inserted.insertedId,
      });
 
      if (entity === "customer") {
        await syncCustomerToLoginUser(created || payload, req.body.password);
      }
 
      if (entity === "transaction") {
        await applyTransactionToCustomerBalance(created || payload);
      }
 
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
 
      if (entity === "customer") {
        await syncCustomerToLoginUser(updated || payload, req.body.password);
      }
 
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
 
      const record = await collection.findOne(buildIdQuery(req.params.id));
 
      const result = await collection.deleteOne(buildIdQuery(req.params.id));
 
      if (!result.deletedCount) {
        return res.status(404).json({
          success: false,
          message: `${entity} not found`,
        });
      }
 
      if (entity === "customer" && record?.email) {
        const usersCollection = await getCollection("users");
        await usersCollection.deleteOne({
          email: String(record.email).toLowerCase().trim(),
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
 
const secureEmployeeRoutes = require("./routes/employeeRoutes");
const secureBranchRoutes = require("./routes/branchRoutes");
const secureCustomerRoutes = require("./routes/customerRoutes");
const secureLoanRoutes = require("./routes/loanRoutes");
const secureAdminTransactionRoutes = require("./routes/adminTransactionRoutes");
const customerAiRoutes = require("./routes/customerAiRoutes");
 
app.use("/api/employees", secureEmployeeRoutes.default || secureEmployeeRoutes);
app.use("/api/branches", secureBranchRoutes.default || secureBranchRoutes);
app.use("/api/customers", secureCustomerRoutes.default || secureCustomerRoutes);
app.use("/api/loans", secureLoanRoutes.default || secureLoanRoutes);
app.use(
  "/api/admin-transactions",
  secureAdminTransactionRoutes.default || secureAdminTransactionRoutes
);
app.use(
  "/api/customer-ai",
  customerAiRoutes.default || customerAiRoutes
);
 
// Keep this for customer dashboard income/expense transactions for now.
// Do not replace this yet, otherwise customer dashboard may stop saving transactions.
createCrudRoutes("/api/transactions", "transaction", "admintransactions");
 
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
        .limit(10)
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
        customers: customers.map(formatRecord),
        employees: employees.map(formatRecord),
        branches: branches.map(formatRecord),
        loans: loans.map(formatRecord),
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
   OPTIONAL OLD AI ROUTES
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
  "/api/ai",
  ["./routes/ai.routes", "./routes/aiRoutes"],
  "AI ROUTES"
);
 
app.post("/api/admin-ai/chat", async (req: any, res: any) => {
  try {
    const mongoose = require("mongoose");
 
    const question = String(req.body?.message || "").toLowerCase().trim();
 
    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required.",
      });
    }
 
    if (mongoose.connection.readyState !== 1) {
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    MONGO_URI;
 
  if (!mongoUri) {
    return res.status(500).json({
      success: false,
      message: "MongoDB URI is missing in backend environment variables.",
    });
  }
 
  await mongoose.connect(mongoUri);
}
 
if (mongoose.connection.readyState !== 1) {
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    MONGO_URI;
 
  if (!mongoUri) {
    return res.status(500).json({
      success: false,
      message: "MongoDB URI is missing in backend environment variables.",
    });
  }
 
  await mongoose.connect(mongoUri);
}
 
const db = mongoose.connection.db;
 
if (!db) {
  return res.status(500).json({
    success: false,
    message: "Database connected but DB object not ready.",
  });
}
 
    const getCollection = async (names: string[]) => {
      const collections = await db.listCollections().toArray();
      const existingNames = collections.map((item: any) => item.name);
      const collectionName = names.find((name) => existingNames.includes(name));
 
      if (!collectionName) return [];
 
      return await db.collection(collectionName).find({}).limit(2000).toArray();
    };
 
    const cleanRecord = (record: any) => {
      const hiddenFields = [
        "password",
        "pass",
        "hashedPassword",
        "passwordHash",
        "token",
        "accessToken",
        "refreshToken",
        "__v",
      ];
 
      const safe: any = {};
 
      Object.entries(record || {}).forEach(([key, value]) => {
        if (hiddenFields.includes(key)) return;
 
        if (key === "_id") {
          safe._id = String(value);
          safe.id = String(value);
          return;
        }
 
        safe[key] = value;
      });
 
      return safe;
    };
 
    const formatMoney = (value: any) => {
      const numberValue = Number(String(value || 0).replace(/₹|,/g, ""));
      return `₹${Number.isNaN(numberValue) ? 0 : numberValue.toLocaleString("en-IN")}`;
    };
 
    const formatRecord = (title: string, record: any) => {
      const safe = cleanRecord(record);
 
      const lines = Object.entries(safe).map(([key, value]) => {
        const label = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (char) => char.toUpperCase());
 
        return `• ${label}: ${value || "-"}`;
      });
 
      return `${title}\n${lines.join("\n")}`;
    };
 
    const customers = await getCollection(["customers", "customer"]);
    const employees = await getCollection(["employees", "employee"]);
    const admins = await getCollection(["admins", "admin"]);
    const branches = await getCollection(["branches", "branch"]);
    const loans = await getCollection(["loans", "loan"]);
    const transactions = await getCollection(["transactions", "transaction"]);
    const auditLogs = await getCollection(["auditlogs", "auditLogs", "audit_logs"]);
 
    const totalCustomerBalance = customers.reduce((sum: number, item: any) => {
      return sum + Number(String(item.balance || 0).replace(/₹|,/g, ""));
    }, 0);
 
    const totalLoanAmount = loans.reduce((sum: number, item: any) => {
      return (
        sum +
        Number(
          String(item.loanAmount || item.amount || item.totalLoans || 0).replace(/₹|,/g, "")
        )
      );
    }, 0);
 
    let answer = "";
 
    if (
      question.includes("customer") &&
      (question.includes("count") ||
        question.includes("total") ||
        question.includes("how many") ||
        question.includes("number"))
    ) {
      answer = `Total customers: ${customers.length}`;
    } else if (
      question.includes("employee") &&
      (question.includes("count") ||
        question.includes("total") ||
        question.includes("how many") ||
        question.includes("number"))
    ) {
      answer = `Total employees: ${employees.length}`;
    } else if (
      question.includes("admin") &&
      (question.includes("count") ||
        question.includes("total") ||
        question.includes("how many") ||
        question.includes("number"))
    ) {
      answer = `Total admins: ${admins.length}`;
    } else if (
      question.includes("branch") &&
      (question.includes("count") ||
        question.includes("total") ||
        question.includes("how many") ||
        question.includes("number"))
    ) {
      answer = `Total branches: ${branches.length}`;
    } else if (
      question.includes("loan") &&
      (question.includes("count") ||
        question.includes("total") ||
        question.includes("how many") ||
        question.includes("number"))
    ) {
      answer = `Total loans: ${loans.length}`;
    } else if (
      question.includes("transaction") &&
      (question.includes("count") ||
        question.includes("total") ||
        question.includes("how many") ||
        question.includes("number"))
    ) {
      answer = `Total transactions: ${transactions.length}`;
    } else if (question.includes("balance")) {
      answer = `Total customer balance: ${formatMoney(totalCustomerBalance)}`;
    } else if (
      question.includes("summary") ||
      question.includes("overview") ||
      question.includes("bank details") ||
      question.includes("everything")
    ) {
      answer = [
        "FinSecure Bank Summary",
        `• Total Customers: ${customers.length}`,
        `• Total Employees: ${employees.length}`,
        `• Total Admins: ${admins.length}`,
        `• Total Branches: ${branches.length}`,
        `• Total Loans: ${loans.length}`,
        `• Total Transactions: ${transactions.length}`,
        `• Total Audit Logs: ${auditLogs.length}`,
        `• Total Customer Balance: ${formatMoney(totalCustomerBalance)}`,
        `• Total Loan Amount: ${formatMoney(totalLoanAmount)}`,
      ].join("\n");
    } else {
      const findCustomer = customers.find((customer: any) => {
        const searchText = [
          customer.name,
          customer.customerName,
          customer.email,
          customer.phone,
          customer.phoneNumber,
          customer.accountNumber,
          customer.cif,
          customer.cifNumber,
          customer.customerId,
          customer.id,
        ]
          .join(" ")
          .toLowerCase();
 
        return searchText && question.split(" ").some((word) => word.length > 2 && searchText.includes(word));
      });
 
      const findEmployee = employees.find((employee: any) => {
        const searchText = [
          employee.name,
          employee.employeeName,
          employee.email,
          employee.phone,
          employee.phoneNumber,
          employee.employeeId,
          employee.id,
        ]
          .join(" ")
          .toLowerCase();
 
        return searchText && question.split(" ").some((word) => word.length > 2 && searchText.includes(word));
      });
 
      const findBranch = branches.find((branch: any) => {
        const searchText = [
          branch.name,
          branch.branchName,
          branch.ifsc,
          branch.ifscCode,
          branch.branchId,
          branch.id,
        ]
          .join(" ")
          .toLowerCase();
 
        return searchText && question.split(" ").some((word) => word.length > 2 && searchText.includes(word));
      });
 
      if (findCustomer) {
        answer = formatRecord("Customer Details", findCustomer);
      } else if (findEmployee) {
        answer = formatRecord("Employee Details", findEmployee);
      } else if (findBranch) {
        answer = formatRecord("Branch Details", findBranch);
      } else {
        answer = [
          "I can answer questions like:",
          "• Total customers",
          "• Employees count",
          "• Total branches",
          "• Total loans",
          "• Total transactions",
          "• Total balance",
          "• Complete bank summary",
          "• Show customer Teja details",
          "• Show employee Sri details",
          "• Show branch Gajuwaka details",
        ].join("\n");
      }
    }
 
    return res.status(200).json({
      success: true,
      answer,
    });
  } catch (error: any) {
    console.error("Admin AI direct route error:", error);
 
    return res.status(500).json({
      success: false,
      message: error.message || "Admin AI failed.",
    });
  }
});
 
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