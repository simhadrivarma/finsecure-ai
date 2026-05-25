import express, { Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";

const router = express.Router();

type BankRecord = Record<string, any>;

const SECRET =
  process.env.JWT_SECRET ||
  process.env.SECRET_KEY ||
  process.env.JWT_PRIVATE_KEY ||
  "finsecure_ai_secret_key";

const hiddenFields = new Set([
  "password",
  "pass",
  "hashedPassword",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "resetToken",
  "otp",
  "secret",
  "apiKey",
  "__v",
]);

const collectionMap: Record<string, string[]> = {
  customers: ["customers", "users", "accounts"],
  employees: ["employees"],
  admins: ["admins"],
  branches: ["branches"],
  loans: ["loans"],
  transactions: ["transactions", "admintransactions", "admin_transactions"],
  auditLogs: ["auditlogs", "auditLogs", "audit_logs"],
};

function cleanText(value: any) {
  return String(value || "").trim().toLowerCase();
}

function numberValue(value: any) {
  const n = Number(String(value || 0).replace(/₹|,/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

function money(value: any) {
  return `₹${numberValue(value).toLocaleString("en-IN")}`;
}

function sanitizeRecord(record: BankRecord) {
  const safe: BankRecord = {};

  Object.entries(record || {}).forEach(([key, value]) => {
    if (hiddenFields.has(key)) return;

    if (key === "_id") {
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

function sanitizeList(records: BankRecord[]) {
  return records.map(sanitizeRecord);
}

function normalizeRole(role: any) {
  return cleanText(role).replace(/_/g, " ");
}

function isSuperAdmin(role: string) {
  return normalizeRole(role).includes("super admin");
}

function roleCanAccess(role: string, module: string) {
  const cleanRole = normalizeRole(role);

  if (isSuperAdmin(cleanRole)) return true;

  const permissions: Record<string, string[]> = {
    admin: ["customers", "employees", "branches", "loans", "transactions", "reports"],
    "branch manager": ["customers", "employees", "branches", "loans", "transactions", "reports"],
    "loan officer": ["customers", "loans", "branches"],
    "customer support": ["customers", "transactions", "branches"],
    "customer support executive": ["customers", "transactions", "branches"],
    cashier: ["customers", "transactions", "branches"],
    "relationship manager": ["customers", "loans", "branches"],
    "fraud analyst": ["customers", "transactions", "reports"],
    "report analyst": ["customers", "employees", "branches", "loans", "transactions", "reports"],
  };

  return permissions[cleanRole]?.includes(module) || false;
}

async function getCollection(logicalName: string) {
  const db = mongoose.connection.db;
  if (!db) return [];

  const existingCollections = await db.listCollections().toArray();
  const existingNames = existingCollections.map((item) => item.name);

  const possibleNames = collectionMap[logicalName] || [logicalName];
  const realName = possibleNames.find((name) => existingNames.includes(name));

  if (!realName) return [];

  const data = await db.collection(realName).find({}).limit(3000).toArray();
  return sanitizeList(data);
}

function filterByBranch(records: BankRecord[], admin: BankRecord, role: string) {
  if (isSuperAdmin(role)) return records;

  const adminBranch = cleanText(admin.branch || admin.branchName);
  const adminIfsc = cleanText(admin.ifsc || admin.ifscCode);

  if (!adminBranch && !adminIfsc) return records;

  return records.filter((record) => {
    return (
      cleanText(record.branch || record.branchName) === adminBranch ||
      cleanText(record.ifsc || record.ifscCode) === adminIfsc
    );
  });
}

function getAuthUser(req: Request) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : authHeader;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, SECRET) as JwtPayload;

    return {
      id: decoded.id || decoded._id || decoded.userId || "",
      email: decoded.email || "",
      role: decoded.role || "",
      name: decoded.name || "",
    };
  } catch {
    return null;
  }
}

function findRecord(question: string, records: BankRecord[], fields: string[]) {
  const q = cleanText(question);

  return records.find((record) => {
    return fields.some((field) => {
      const value = cleanText(record[field]);
      return value && value.length >= 3 && q.includes(value);
    });
  });
}

function formatRecord(title: string, record: BankRecord) {
  if (!record) return `${title} not found.`;

  const lines = Object.entries(record)
    .filter(([key]) => !hiddenFields.has(key))
    .map(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (char) => char.toUpperCase());

      return `• ${label}: ${value || "-"}`;
    });

  return `${title}\n${lines.join("\n")}`;
}

function calculateEmi(question: string) {
  const q = question.toLowerCase();

  if (!q.includes("emi") && !q.includes("interest")) return "";

  const numbers = q.match(/\d+(\.\d+)?/g)?.map(Number) || [];

  if (numbers.length < 3) {
    return [
      "Loan / Interest Help:",
      "To calculate EMI, ask like this:",
      "Calculate EMI for 500000 loan at 12% for 5 years.",
      "",
      "Formula:",
      "EMI = P × R × (1 + R)^N / ((1 + R)^N - 1)",
      "P = principal, R = monthly interest rate, N = number of months.",
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
    `Principal: ${money(principal)}`,
    `Interest Rate: ${annualRate}% per year`,
    `Tenure: ${years} years`,
    `Monthly EMI: ${money(Math.round(emi))}`,
    `Total Interest: ${money(Math.round(totalInterest))}`,
    `Total Payment: ${money(Math.round(totalPayment))}`,
  ].join("\n");
}

function buildSummary(data: Record<string, BankRecord[]>) {
  const totalCustomerBalance = data.customers.reduce((sum, item) => {
    return sum + numberValue(item.balance);
  }, 0);

  const totalLoanAmount = data.loans.reduce((sum, item) => {
    return sum + numberValue(item.amount || item.loanAmount || item.totalLoans);
  }, 0);

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

function answerQuestion(question: string, data: Record<string, BankRecord[]>, role: string) {
  const q = cleanText(question);

  const emiAnswer = calculateEmi(question);
  if (emiAnswer) return emiAnswer;

  if (
    q.includes("summary") ||
    q.includes("overview") ||
    q.includes("everything") ||
    q.includes("bank details") ||
    q.includes("bank status")
  ) {
    return buildSummary(data);
  }

  if (q.includes("how many customer") || q.includes("customers count")) {
    return `Total customers: ${data.customers.length}`;
  }

  if (q.includes("how many employee") || q.includes("employees count")) {
    return `Total employees: ${data.employees.length}`;
  }

  if (q.includes("how many admin") || q.includes("admins count")) {
    if (!roleCanAccess(role, "admins")) {
      return "You do not have permission to view admin database.";
    }
    return `Total admins: ${data.admins.length}`;
  }

  if (q.includes("how many branch") || q.includes("branches count")) {
    return `Total branches: ${data.branches.length}`;
  }

  if (q.includes("how many transaction") || q.includes("transactions count")) {
    return `Total transactions: ${data.transactions.length}`;
  }

  if (q.includes("how many loan") || q.includes("loans count")) {
    return `Total loans: ${data.loans.length}`;
  }

  const customer = findRecord(question, data.customers, [
    "name",
    "email",
    "phone",
    "accountNumber",
    "cif",
    "cifNumber",
    "id",
    "customerId",
  ]);

  if (customer && q.includes("customer")) {
    const accountNumber = cleanText(customer.accountNumber);
    const customerTransactions = data.transactions.filter(
      (item) =>
        cleanText(item.accountNumber) === accountNumber ||
        cleanText(item.customerEmail) === cleanText(customer.email) ||
        cleanText(item.email) === cleanText(customer.email)
    );

    const customerLoans = data.loans.filter(
      (item) =>
        cleanText(item.accountNumber) === accountNumber ||
        cleanText(item.customerEmail) === cleanText(customer.email) ||
        cleanText(item.email) === cleanText(customer.email)
    );

    return [
      formatRecord("Customer Details", customer),
      "",
      `Transactions Found: ${customerTransactions.length}`,
      `Loans Found: ${customerLoans.length}`,
    ].join("\n");
  }

  const employee = findRecord(question, data.employees, [
    "name",
    "email",
    "phone",
    "employeeId",
    "id",
  ]);

  if (employee && q.includes("employee")) {
    return formatRecord("Employee Details", employee);
  }

  const branch = findRecord(question, data.branches, [
    "name",
    "branchName",
    "ifsc",
    "ifscCode",
    "id",
    "branchId",
  ]);

  if (branch && q.includes("branch")) {
    const branchName = cleanText(branch.name || branch.branchName);
    const branchIfsc = cleanText(branch.ifsc || branch.ifscCode);

    const branchCustomers = data.customers.filter(
      (item) =>
        cleanText(item.branch || item.branchName) === branchName ||
        cleanText(item.ifsc || item.ifscCode) === branchIfsc
    );

    const branchEmployees = data.employees.filter(
      (item) =>
        cleanText(item.branch || item.branchName) === branchName ||
        cleanText(item.ifsc || item.ifscCode) === branchIfsc
    );

    return [
      formatRecord("Branch Details", branch),
      "",
      `Branch Customers: ${branchCustomers.length}`,
      `Branch Employees: ${branchEmployees.length}`,
    ].join("\n");
  }

  if (q.includes("loan")) {
    const pendingLoans = data.loans.filter((item) => cleanText(item.status).includes("pending"));
    const approvedLoans = data.loans.filter((item) => cleanText(item.status).includes("approved"));
    const rejectedLoans = data.loans.filter((item) => cleanText(item.status).includes("rejected"));

    return [
      "Loan Summary",
      `• Total Loans: ${data.loans.length}`,
      `• Pending Loans: ${pendingLoans.length}`,
      `• Approved Loans: ${approvedLoans.length}`,
      `• Rejected Loans: ${rejectedLoans.length}`,
      "Ask with a customer name or account number to see loan details for that customer.",
    ].join("\n");
  }

  if (q.includes("transaction")) {
    return [
      "Transaction Summary",
      `• Total Transactions: ${data.transactions.length}`,
      "Ask with customer name, email, or account number to see customer-specific transactions.",
    ].join("\n");
  }

  if (q.includes("audit")) {
    if (!isSuperAdmin(role)) {
      return "Only Super Admin can view audit log details.";
    }

    const latestLogs = data.auditLogs.slice(-5).reverse();
    if (latestLogs.length === 0) return "No audit logs found.";

    return [
      "Latest Audit Logs",
      ...latestLogs.map((log, index) => {
        return `${index + 1}. ${log.action || "-"} | ${log.module || "-"} | ${
          log.adminName || log.admin || "-"
        } | ${log.createdAt || log.date || "-"}`;
      }),
    ].join("\n");
  }

  return [
    "I can answer bank/admin questions like:",
    "• How many customers do we have?",
    "• Show customer Teja complete details",
    "• Show employee Sri details",
    "• Show branch Gajuwaka details",
    "• How many loans are pending?",
    "• Show transaction summary",
    "• Calculate EMI for 500000 loan at 12% for 5 years",
    "• Show complete bank summary",
  ].join("\n");
}

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req);

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

    const admins = await getCollection("admins");

    const adminProfile =
      admins.find(
        (admin) =>
          cleanText(admin.email) === cleanText(authUser.email) ||
          cleanText(admin.id) === cleanText(authUser.id)
      ) || authUser;

    const role = String(adminProfile.role || authUser.role || "Admin");

    const data: Record<string, BankRecord[]> = {
      customers: roleCanAccess(role, "customers")
        ? filterByBranch(await getCollection("customers"), adminProfile, role)
        : [],
      employees: roleCanAccess(role, "employees")
        ? filterByBranch(await getCollection("employees"), adminProfile, role)
        : [],
      admins: isSuperAdmin(role) ? admins : [],
      branches: roleCanAccess(role, "branches")
        ? filterByBranch(await getCollection("branches"), adminProfile, role)
        : [],
      loans: roleCanAccess(role, "loans")
        ? filterByBranch(await getCollection("loans"), adminProfile, role)
        : [],
      transactions: roleCanAccess(role, "transactions")
        ? filterByBranch(await getCollection("transactions"), adminProfile, role)
        : [],
      auditLogs: isSuperAdmin(role) ? await getCollection("auditLogs") : [],
    };

    const answer = answerQuestion(question, data, role);

    return res.json({
      success: true,
      role,
      answer,
    });
  } catch (error: any) {
    console.error("Admin AI error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Admin AI failed.",
    });
  }
});

export default router;
