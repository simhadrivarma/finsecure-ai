// @ts-nocheck

const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "finsecure_ai_secret_key";

const HIDDEN_FIELDS = [
  "password",
  "pass",
  "hashedPassword",
  "passwordHash",
  "resetToken",
  "token",
  "accessToken",
  "refreshToken",
  "otp",
  "__v",
];

const COLLECTIONS = {
  customers: ["customers", "customer"],
  employees: ["employees", "employee"],
  admins: ["admins", "admin"],
  branches: ["branches", "branch"],
  loans: ["loans", "loan"],
  transactions: ["transactions", "transaction"],
  auditLogs: ["auditlogs", "auditLogs", "audit_logs"],
};

function cleanText(value) {
  return String(value || "").trim().toLowerCase();
}

function toNumber(value) {
  const n = Number(String(value || 0).replace(/₹|,/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

function money(value) {
  return `₹${toNumber(value).toLocaleString("en-IN")}`;
}

function isHiddenField(key) {
  return HIDDEN_FIELDS.includes(String(key));
}

function cleanRecord(record) {
  const safe = {};

  Object.entries(record || {}).forEach(([key, value]) => {
    if (isHiddenField(key)) return;

    if (key === "_id") {
      safe._id = String(value);
      safe.id = String(value);
      return;
    }

    if (value instanceof Date) {
      safe[key] = value.toISOString();
      return;
    }

    safe[key] = value;
  });

  return safe;
}

function getToken(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.replace("Bearer ", "").trim();
  return auth.trim();
}

function getUserFromToken(req) {
  const token = getToken(req);

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("Admin AI token error:", error.message);
    return null;
  }
}

function normalizeRole(role) {
  return cleanText(role).replace(/_/g, " ");
}

function isSuperAdmin(role) {
  const r = normalizeRole(role);
  return r.includes("super admin") || r === "super";
}

function canAccess(role, moduleName) {
  const r = normalizeRole(role);

  if (isSuperAdmin(r)) return true;

  const permissions = {
    admin: ["customers", "employees", "branches", "loans", "transactions"],
    "branch manager": ["customers", "employees", "branches", "loans", "transactions"],
    manager: ["customers", "employees", "branches", "loans", "transactions"],
    "loan officer": ["customers", "loans", "branches"],
    cashier: ["customers", "transactions", "branches"],
    "customer support": ["customers", "transactions", "branches"],
    "customer support executive": ["customers", "transactions", "branches"],
    "relationship manager": ["customers", "loans", "branches"],
    "fraud analyst": ["customers", "transactions"],
  };

  return permissions[r]?.includes(moduleName) || false;
}

async function getExistingCollectionName(possibleNames) {
  const db = mongoose.connection?.db;

  if (!db) {
    return null;
  }

  const collections = await db.listCollections().toArray();
  const existing = collections.map((item) => item.name);

  return possibleNames.find((name) => existing.includes(name)) || null;
}

async function loadCollection(type) {
  try {
    const db = mongoose.connection?.db;

    if (!db) {
      console.warn("Admin AI: MongoDB db not ready");
      return [];
    }

    const collectionName = await getExistingCollectionName(COLLECTIONS[type] || [type]);

    if (!collectionName) {
      console.warn(`Admin AI: collection not found for ${type}`);
      return [];
    }

    const records = await db.collection(collectionName).find({}).limit(3000).toArray();

    return records.map(cleanRecord);
  } catch (error) {
    console.error(`Admin AI load ${type} error:`, error.message);
    return [];
  }
}

function filterByBranch(records, admin, role) {
  if (isSuperAdmin(role)) return records;

  const adminBranch = cleanText(admin.branch || admin.branchName);
  const adminIfsc = cleanText(admin.ifsc || admin.ifscCode);

  if (!adminBranch && !adminIfsc) {
    return records;
  }

  return records.filter((record) => {
    const recordBranch = cleanText(record.branch || record.branchName);
    const recordIfsc = cleanText(record.ifsc || record.ifscCode);

    return recordBranch === adminBranch || recordIfsc === adminIfsc;
  });
}

function findByQuestion(question, records, fields) {
  const q = cleanText(question);

  return records.find((record) => {
    return fields.some((field) => {
      const value = cleanText(record[field]);
      return value && value.length >= 3 && q.includes(value);
    });
  });
}

function formatRecord(title, record) {
  if (!record) return `${title} not found.`;

  const lines = Object.entries(record)
    .filter(([key]) => !isHiddenField(key))
    .map(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (char) => char.toUpperCase());

      return `• ${label}: ${value === "" || value === null || value === undefined ? "-" : value}`;
    });

  return `${title}\n${lines.join("\n")}`;
}

function calculateEmi(question) {
  const q = cleanText(question);

  if (!q.includes("emi") && !q.includes("interest")) return "";

  const numbers = q.match(/\d+(\.\d+)?/g)?.map(Number) || [];

  if (numbers.length < 3) {
    return [
      "Loan / Interest Help",
      "Ask like this:",
      "Calculate EMI for 500000 loan at 12% for 5 years",
      "",
      "EMI formula:",
      "EMI = P × R × (1 + R)^N / ((1 + R)^N - 1)",
      "P = loan amount, R = monthly interest rate, N = number of months.",
    ].join("\n");
  }

  const principal = numbers[0];
  const annualRate = numbers[1];
  const years = numbers[2];

  const monthlyRate = annualRate / 12 / 100;
  const months = years * 12;

  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);

  const totalPayment = emi * months;
  const totalInterest = totalPayment - principal;

  return [
    "Loan EMI Calculation",
    `• Principal: ${money(principal)}`,
    `• Interest Rate: ${annualRate}% per year`,
    `• Tenure: ${years} years`,
    `• Monthly EMI: ${money(Math.round(emi))}`,
    `• Total Interest: ${money(Math.round(totalInterest))}`,
    `• Total Payment: ${money(Math.round(totalPayment))}`,
  ].join("\n");
}

function buildBankSummary(data) {
  const totalCustomerBalance = data.customers.reduce(
    (sum, item) => sum + toNumber(item.balance),
    0
  );

  const totalLoanAmount = data.loans.reduce(
    (sum, item) => sum + toNumber(item.amount || item.loanAmount || item.totalLoans),
    0
  );

  return [
    "FinSecure Bank Summary",
    `• Customers: ${data.customers.length}`,
    `• Employees: ${data.employees.length}`,
    `• Admins: ${data.admins.length}`,
    `• Branches: ${data.branches.length}`,
    `• Loans: ${data.loans.length}`,
    `• Transactions: ${data.transactions.length}`,
    `• Audit Logs: ${data.auditLogs.length}`,
    `• Total Customer Balance: ${money(totalCustomerBalance)}`,
    `• Total Loan Amount: ${money(totalLoanAmount)}`,
  ].join("\n");
}

function answerQuestion(question, data, role) {
  const q = cleanText(question);

  const emiAnswer = calculateEmi(question);
  if (emiAnswer) return emiAnswer;

  if (
    q.includes("summary") ||
    q.includes("overview") ||
    q.includes("bank details") ||
    q.includes("everything") ||
    q.includes("complete bank")
  ) {
    return buildBankSummary(data);
  }

  if (q.includes("employee") && (q.includes("how many") || q.includes("number") || q.includes("count"))) {
    return `Total employees: ${data.employees.length}`;
  }

  if (q.includes("customer") && (q.includes("how many") || q.includes("number") || q.includes("count"))) {
    return `Total customers: ${data.customers.length}`;
  }

  if (q.includes("admin") && (q.includes("how many") || q.includes("number") || q.includes("count"))) {
    if (!isSuperAdmin(role)) return "You do not have permission to view admin database.";
    return `Total admins: ${data.admins.length}`;
  }

  if (q.includes("branch") && (q.includes("how many") || q.includes("number") || q.includes("count"))) {
    return `Total branches: ${data.branches.length}`;
  }

  if (q.includes("loan") && (q.includes("how many") || q.includes("number") || q.includes("count"))) {
    return `Total loans: ${data.loans.length}`;
  }

  if (q.includes("transaction") && (q.includes("how many") || q.includes("number") || q.includes("count"))) {
    return `Total transactions: ${data.transactions.length}`;
  }

  const customer = findByQuestion(question, data.customers, [
    "name",
    "customerName",
    "email",
    "phone",
    "phoneNumber",
    "accountNumber",
    "cif",
    "cifNumber",
    "customerId",
    "id",
  ]);

  if (customer) {
    const accountNumber = cleanText(customer.accountNumber);
    const email = cleanText(customer.email);

    const customerTransactions = data.transactions.filter((item) => {
      return (
        cleanText(item.accountNumber) === accountNumber ||
        cleanText(item.email) === email ||
        cleanText(item.customerEmail) === email
      );
    });

    const customerLoans = data.loans.filter((item) => {
      return (
        cleanText(item.accountNumber) === accountNumber ||
        cleanText(item.email) === email ||
        cleanText(item.customerEmail) === email
      );
    });

    return [
      formatRecord("Customer Details", customer),
      "",
      `Transactions Found: ${customerTransactions.length}`,
      `Loans Found: ${customerLoans.length}`,
    ].join("\n");
  }

  const employee = findByQuestion(question, data.employees, [
    "name",
    "employeeName",
    "email",
    "phone",
    "phoneNumber",
    "employeeId",
    "id",
  ]);

  if (employee) {
    return formatRecord("Employee Details", employee);
  }

  const branch = findByQuestion(question, data.branches, [
    "name",
    "branchName",
    "ifsc",
    "ifscCode",
    "branchId",
    "id",
  ]);

  if (branch) {
    const branchName = cleanText(branch.name || branch.branchName);
    const branchIfsc = cleanText(branch.ifsc || branch.ifscCode);

    const branchCustomers = data.customers.filter((item) => {
      return (
        cleanText(item.branch || item.branchName) === branchName ||
        cleanText(item.ifsc || item.ifscCode) === branchIfsc
      );
    });

    const branchEmployees = data.employees.filter((item) => {
      return (
        cleanText(item.branch || item.branchName) === branchName ||
        cleanText(item.ifsc || item.ifscCode) === branchIfsc
      );
    });

    return [
      formatRecord("Branch Details", branch),
      "",
      `Branch Customers: ${branchCustomers.length}`,
      `Branch Employees: ${branchEmployees.length}`,
    ].join("\n");
  }

  if (q.includes("loan")) {
    const pending = data.loans.filter((item) => cleanText(item.status).includes("pending"));
    const approved = data.loans.filter((item) => cleanText(item.status).includes("approved"));
    const rejected = data.loans.filter((item) => cleanText(item.status).includes("rejected"));

    return [
      "Loan Summary",
      `• Total Loans: ${data.loans.length}`,
      `• Pending Loans: ${pending.length}`,
      `• Approved Loans: ${approved.length}`,
      `• Rejected Loans: ${rejected.length}`,
      "Ask with customer name or account number to get customer loan details.",
    ].join("\n");
  }

  if (q.includes("audit")) {
    if (!isSuperAdmin(role)) return "Only Super Admin can view audit logs.";

    const latest = data.auditLogs.slice(-5).reverse();

    if (latest.length === 0) return "No audit logs found.";

    return [
      "Latest Audit Logs",
      ...latest.map((log, index) => {
        return `${index + 1}. ${log.action || "-"} | ${log.module || "-"} | ${
          log.adminName || log.admin || "-"
        } | ${log.createdAt || log.date || "-"}`;
      }),
    ].join("\n");
  }

  return [
    "I can answer bank/admin questions like:",
    "• How many employees do we have?",
    "• How many customers do we have?",
    "• Show customer Teja full details",
    "• Show employee Sri details",
    "• Show branch Gajuwaka details",
    "• Show complete bank summary",
    "• How many loans are pending?",
    "• Calculate EMI for 500000 loan at 12% for 5 years",
  ].join("\n");
}

router.post("/chat", async (req, res) => {
  try {
    const authUser = getUserFromToken(req);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
    }

    const question = String(req.body?.message || "").trim();

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required.",
      });
    }

    const admins = await loadCollection("admins");

    const adminProfile =
      admins.find((admin) => {
        return (
          cleanText(admin.email) === cleanText(authUser.email) ||
          cleanText(admin.id) === cleanText(authUser.id) ||
          cleanText(admin._id) === cleanText(authUser.id)
        );
      }) || authUser;

    const role = adminProfile.role || authUser.role || req.body?.role || "Admin";

    const rawData = {
      customers: canAccess(role, "customers") ? await loadCollection("customers") : [],
      employees: canAccess(role, "employees") ? await loadCollection("employees") : [],
      admins: isSuperAdmin(role) ? admins : [],
      branches: canAccess(role, "branches") ? await loadCollection("branches") : [],
      loans: canAccess(role, "loans") ? await loadCollection("loans") : [],
      transactions: canAccess(role, "transactions") ? await loadCollection("transactions") : [],
      auditLogs: isSuperAdmin(role) ? await loadCollection("auditLogs") : [],
    };

    const data = {
      customers: filterByBranch(rawData.customers, adminProfile, role),
      employees: filterByBranch(rawData.employees, adminProfile, role),
      admins: rawData.admins,
      branches: filterByBranch(rawData.branches, adminProfile, role),
      loans: filterByBranch(rawData.loans, adminProfile, role),
      transactions: filterByBranch(rawData.transactions, adminProfile, role),
      auditLogs: rawData.auditLogs,
    };

    const answer = answerQuestion(question, data, role);

    return res.status(200).json({
      success: true,
      role,
      answer,
    });
  } catch (error) {
    console.error("Admin AI route error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Admin AI failed.",
    });
  }
});

module.exports = router;