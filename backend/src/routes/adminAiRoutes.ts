import express, { Request, Response } from "express";
import mongoose from "mongoose";

const router = express.Router();
const auth = require("../middleware/authMiddleware");
const protectAdmin = auth.protectAdmin || auth;
const canPerform = auth.canPerform;
const normalizeAccessRole = auth.normalizeRole;
const isFullAdminRole = auth.isFullAdminRole;

router.use(protectAdmin);

type BankRecord = Record<string, any>;
type BankData = Record<string, BankRecord[]>;

const hiddenFields = new Set([
  "password",
  "pass",
  "hashedpassword",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "resettoken",
  "otp",
  "secret",
  "apikey",
  "api_key",
  "__v",
]);

const collectionMap: Record<string, string[]> = {
  customers: ["customers", "users", "accounts", "customer"],
  employees: ["employees", "staff", "employee"],
  admins: ["admins", "admin"],
  branches: ["branches", "branch"],
  loans: ["loans", "loan", "loanapplications", "loan_applications"],
  transactions: [
    "transactions",
    "transaction",
    "admintransactions",
    "admin_transactions",
  ],
  auditLogs: ["auditlogs", "auditLogs", "audit_logs", "logs"],
};

function cleanText(value: any) {
  return String(value || "").trim().toLowerCase();
}

function normalText(value: any) {
  return String(value || "").trim();
}

function numberValue(value: any) {
  const n = Number(
    String(value || 0)
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .replace(/\+/g, "")
      .trim()
  );

  return Number.isNaN(n) ? 0 : n;
}

function money(value: any) {
  return `₹${numberValue(value).toLocaleString("en-IN")}`;
}

function isHiddenKey(key: string) {
  return hiddenFields.has(cleanText(key).replace(/_/g, ""));
}

function sanitizeValue(value: any): any {
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === "object" && item !== null ? sanitizeRecord(item) : item
    );
  }

  if (typeof value === "object" && value !== null) {
    return sanitizeRecord(value);
  }

  return value;
}

function sanitizeRecord(record: BankRecord = {}) {
  const safe: BankRecord = {};

  Object.entries(record || {}).forEach(([key, value]) => {
    if (isHiddenKey(key)) return;

    if (key === "_id") {
      safe.id = String(value);
      return;
    }

    safe[key] = sanitizeValue(value);
  });

  return safe;
}

function sanitizeList(records: BankRecord[]) {
  return records.map((item) => sanitizeRecord(item));
}

function normalizeRole(role: any) {
  return cleanText(role).replace(/_/g, " ").replace(/-/g, " ");
}

function isSuperAdmin(role: string) {
  return isFullAdminRole(role);
}

function roleCanAccess(role: string, module: string) {
  const cleanRole = normalizeRole(role);

  if (isSuperAdmin(cleanRole)) return true;

  const permissions: Record<string, string[]> = {
    admin: [
      "customers",
      "employees",
      "branches",
      "loans",
      "transactions",
      "reports",
    ],
    "branch manager": [
      "customers",
      "employees",
      "branches",
      "loans",
      "transactions",
      "reports",
    ],
    manager: [
      "customers",
      "employees",
      "branches",
      "loans",
      "transactions",
      "reports",
    ],
    staff: ["customers", "branches", "loans", "transactions"],
    cashier: ["customers", "transactions", "branches"],
    "loan officer": ["customers", "loans", "branches"],
    "relationship manager": ["customers", "loans", "branches"],
    "customer support": ["customers", "transactions", "branches"],
    "customer support executive": ["customers", "transactions", "branches"],
    "fraud analyst": ["customers", "transactions", "reports"],
    "report analyst": [
      "customers",
      "employees",
      "branches",
      "loans",
      "transactions",
      "reports",
    ],
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

  const data = await db
    .collection(realName)
    .find({})
    .sort({ createdAt: -1, date: -1, _id: -1 } as any)
    .limit(5000)
    .toArray();

  return sanitizeList(data);
}

function getRecordBranch(record: BankRecord) {
  return cleanText(
    record.branch ||
      record.branchName ||
      record.branch_name ||
      record.branchCode ||
      record.branchId
  );
}

function getRecordIfsc(record: BankRecord) {
  return cleanText(record.ifsc || record.ifscCode || record.IFSC);
}

function filterByBranch(records: BankRecord[], admin: BankRecord, role: string) {
  if (isSuperAdmin(role)) return records;

  const adminBranch = getRecordBranch(admin);
  const adminIfsc = getRecordIfsc(admin);

  if (!adminBranch && !adminIfsc) return [];

  return records.filter((record) => {
    const recordBranch = getRecordBranch(record);
    const recordIfsc = getRecordIfsc(record);

    return (
      (adminBranch && recordBranch === adminBranch) ||
      (adminIfsc && recordIfsc === adminIfsc)
    );
  });
}

function isSuspiciousTransaction(record: BankRecord) {
  const risk = cleanText(record.risk);
  const status = cleanText(record.status);
  const fraudStatus = cleanText(record.fraudStatus);
  const riskScore = numberValue(record.riskScore);

  return (
    ["medium", "high"].includes(risk) ||
    ["flagged", "failed"].includes(status) ||
    ["under review", "confirmed"].includes(fraudStatus) ||
    riskScore >= 50
  );
}

function buildCustomerIdentifiers(customers: BankRecord[]) {
  const identifiers = new Set<string>();

  customers.forEach((customer) => {
    [
      customer.id,
      customer.customerId,
      customer.email,
      customer.accountNumber,
      customer.accountNo,
      customer.name,
      customer.customerName,
    ].forEach((value) => {
      const cleaned = cleanText(value);
      if (cleaned) identifiers.add(cleaned);
    });
  });

  return identifiers;
}

function recordMatchesCustomerIdentifiers(
  record: BankRecord,
  identifiers: Set<string>
) {
  return [
    record.customerId,
    record.id,
    record.email,
    record.customerEmail,
    record.userEmail,
    record.accountNumber,
    record.accountNo,
    record.fromAccount,
    record.customer,
    record.customerName,
    record.name,
  ].some((value) => identifiers.has(cleanText(value)));
}

function maskIdentifier(value: any, visible = 4) {
  const text = normalText(value);
  if (!text) return "-";
  if (text.length <= visible) return "*".repeat(text.length);
  return `${"*".repeat(Math.max(text.length - visible, 4))}${text.slice(-visible)}`;
}

function getId(record: BankRecord) {
  return normalText(
    record.id || record._id || record.customerId || record.employeeId || ""
  );
}

function getCustomerName(record: BankRecord) {
  return normalText(
    record.name ||
      record.customerName ||
      record.fullName ||
      record.username ||
      record.userName ||
      ""
  );
}

function getEmail(record: BankRecord) {
  return normalText(record.email || record.customerEmail || record.userEmail || "");
}

function getAccountNumber(record: BankRecord) {
  return normalText(
    record.accountNumber ||
      record.accountNo ||
      record.account ||
      record.accNo ||
      record.bankAccountNumber ||
      ""
  );
}

function getCif(record: BankRecord) {
  return normalText(record.cif || record.cifNumber || record.CIF || "");
}

function getPhone(record: BankRecord) {
  return normalText(
    record.phone || record.phoneNumber || record.mobile || record.contact || ""
  );
}

function recordSearchText(record: BankRecord) {
  const values = [
    record.id,
    record._id,
    record.name,
    record.customerName,
    record.fullName,
    record.email,
    record.customerEmail,
    record.userEmail,
    record.phone,
    record.phoneNumber,
    record.mobile,
    record.accountNumber,
    record.accountNo,
    record.cif,
    record.cifNumber,
    record.employeeId,
    record.adminId,
    record.branch,
    record.branchName,
    record.ifsc,
    record.ifscCode,
    record.loanId,
    record.transactionId,
    record.reference,
  ];

  return values.map(cleanText).filter(Boolean).join(" ");
}

function findRecord(question: string, records: BankRecord[]) {
  const q = cleanText(question);

  const exact = records.find((record) => {
    const search = recordSearchText(record);
    return search && q.includes(search);
  });

  if (exact) return exact;

  return records.find((record) => {
    const possibleValues = [
      getCustomerName(record),
      getEmail(record),
      getPhone(record),
      getAccountNumber(record),
      getCif(record),
      getId(record),
      record.employeeId,
      record.adminId,
      record.branch,
      record.branchName,
      record.ifsc,
      record.ifscCode,
      record.loanId,
      record.transactionId,
      record.reference,
    ];

    return possibleValues.some((value) => {
      const cleaned = cleanText(value);
      return cleaned && cleaned.length >= 3 && q.includes(cleaned);
    });
  });
}

function labelFromKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatRecord(title: string, record: BankRecord) {
  if (!record) return `${title} not found.`;

  const safe = sanitizeRecord(record);

  const lines = Object.entries(safe)
    .filter(([key]) => !isHiddenKey(key))
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => {
      const finalValue =
        typeof value === "object" ? JSON.stringify(value) : String(value);

      return `• ${labelFromKey(key)}: ${finalValue}`;
    });

  return `${title}\n${lines.length ? lines.join("\n") : "No details found."}`;
}

function formatCustomer(record: BankRecord) {
  if (!record) return "Customer not found.";

  return [
    "Customer Complete Details",
    `• Customer ID: ${getId(record) || "-"}`,
    `• Name: ${getCustomerName(record) || "-"}`,
    `• Email: ${getEmail(record) || "-"}`,
    `• Phone: ${getPhone(record) || "-"}`,
    `• Account Number: ${getAccountNumber(record) || "-"}`,
    `• Account Type: ${record.accountType || "-"}`,
    `• IFSC: ${record.ifsc || record.ifscCode || "-"}`,
    `• CIF: ${getCif(record) || "-"}`,
    `• Branch: ${record.branch || record.branchName || "-"}`,
    `• Balance: ${money(record.balance)}`,
    `• Total Income: ${money(record.totalIncome)}`,
    `• Total Expense: ${money(record.totalExpense)}`,
    `• KYC: ${record.kyc || record.kycStatus || "-"}`,
    `• Status: ${record.status || "-"}`,
    `• Aadhaar Number: ${maskIdentifier(record.aadhaarNumber || record.aadhaar, 4)}`,
    `• PAN Number: ${maskIdentifier(record.panNumber || record.pan, 3)}`,
  ].join("\n");
}

function formatEmployee(record: BankRecord) {
  if (!record) return "Employee not found.";

  return [
    "Employee Complete Details",
    `• Employee ID: ${record.employeeId || record.id || "-"}`,
    `• Name: ${record.name || record.employeeName || "-"}`,
    `• Email: ${record.email || "-"}`,
    `• Phone: ${record.phone || record.phoneNumber || "-"}`,
    `• Role: ${record.role || record.designation || "-"}`,
    `• Department: ${record.department || "-"}`,
    `• Branch: ${record.branch || record.branchName || "-"}`,
    `• IFSC: ${record.ifsc || record.ifscCode || "-"}`,
    `• Salary: ${record.salary ? money(record.salary) : "-"}`,
    `• Status: ${record.status || "-"}`,
  ].join("\n");
}

function formatBranch(record: BankRecord) {
  if (!record) return "Branch not found.";

  return [
    "Branch Complete Details",
    `• Branch ID: ${record.id || record.branchId || "-"}`,
    `• Branch Name: ${record.name || record.branchName || "-"}`,
    `• Branch Code: ${record.code || record.branchCode || "-"}`,
    `• IFSC: ${record.ifsc || record.ifscCode || "-"}`,
    `• Location: ${record.location || record.address || "-"}`,
    `• Contact: ${record.contact || record.phone || "-"}`,
    `• Email: ${record.email || "-"}`,
    `• Manager: ${record.manager || record.managerName || "-"}`,
    `• Employees: ${record.employees || record.totalEmployees || 0}`,
    `• Accounts: ${record.accounts || record.totalAccounts || 0}`,
    `• Status: ${record.status || "-"}`,
  ].join("\n");
}

function formatLoan(record: BankRecord, index?: number) {
  const prefix = typeof index === "number" ? `${index + 1}. ` : "";

  return [
    `${prefix}${record.loanType || record.type || "Loan"}`,
    `   Loan ID: ${record.loanId || record.id || "-"}`,
    `   Customer: ${record.customer || record.customerName || record.fullName || "-"}`,
    `   Email: ${record.email || record.customerEmail || record.userEmail || "-"}`,
    `   Account: ${record.accountNumber || "-"}`,
    `   Amount: ${money(record.amount || record.loanAmount)}`,
    `   Interest: ${record.interest || record.interestRate || "-"}`,
    `   Tenure: ${record.tenure || record.tenureMonths || "-"}`,
    `   EMI: ${record.emi ? money(record.emi) : "-"}`,
    `   Paid: ${record.paid ? money(record.paid) : money(0)}`,
    `   Pending: ${record.pending ? money(record.pending) : "-"}`,
    `   Status: ${record.status || "-"}`,
    `   Applied Date: ${record.appliedDate || record.createdAt || "-"}`,
  ].join("\n");
}

function formatTransaction(record: BankRecord, index?: number) {
  const prefix = typeof index === "number" ? `${index + 1}. ` : "";

  return [
    `${prefix}${record.transactionId || record.id || record.reference || "Transaction"}`,
    `   Customer: ${record.customer || record.customerName || record.name || "-"}`,
    `   Email: ${record.email || record.customerEmail || record.userEmail || "-"}`,
    `   Account: ${record.accountNumber || "-"}`,
    `   Type: ${record.type || record.transactionType || "-"}`,
    `   Amount: ${money(record.amount)}`,
    `   Category: ${record.category || "-"}`,
    `   Date: ${record.date || record.createdAt || "-"}`,
    `   Time: ${record.time || "-"}`,
    `   Status: ${record.status || "-"}`,
    `   AI Risk: ${record.risk || record.aiRisk || record.riskLevel || "Normal"}`,
    `   Risk Score: ${record.riskScore || 0}`,
    `   Reference: ${record.reference || record.referenceNo || "-"}`,
    `   Description: ${record.description || record.notes || "-"}`,
  ].join("\n");
}

function relatedToCustomer(record: BankRecord, customer: BankRecord) {
  const customerEmail = cleanText(getEmail(customer));
  const accountNumber = cleanText(getAccountNumber(customer));
  const customerId = cleanText(getId(customer));
  const customerName = cleanText(getCustomerName(customer));
  const phone = cleanText(getPhone(customer));
  const cif = cleanText(getCif(customer));

  const recordEmail = cleanText(record.email || record.customerEmail || record.userEmail);
  const recordAccount = cleanText(record.accountNumber || record.accountNo || record.account);
  const recordCustomerId = cleanText(record.customerId || record.customerID || record.id);
  const recordCustomerName = cleanText(
    record.customer || record.customerName || record.fullName || record.name
  );
  const recordPhone = cleanText(record.phone || record.phoneNumber || record.mobile);
  const recordCif = cleanText(record.cif || record.cifNumber);

  return (
    (!!customerEmail && recordEmail === customerEmail) ||
    (!!accountNumber && recordAccount === accountNumber) ||
    (!!customerId && recordCustomerId === customerId) ||
    (!!customerName && recordCustomerName === customerName) ||
    (!!phone && recordPhone === phone) ||
    (!!cif && recordCif === cif)
  );
}

function formatList(title: string, records: BankRecord[], formatter: Function, limit = 15) {
  if (!records.length) return `${title}\nNo records found.`;

  const selected = records.slice(0, limit);

  const lines = selected.map((record, index) => formatter(record, index));

  const extra =
    records.length > limit
      ? `\nShowing ${limit} of ${records.length} records. Ask more specific name/email/account number for full details.`
      : "";

  return [`${title} (${records.length})`, ...lines, extra].filter(Boolean).join("\n\n");
}

function calculateEmi(question: string) {
  const q = cleanText(question);

  if (!q.includes("emi") && !q.includes("interest")) return "";

  const numbers = q.match(/\d+(\.\d+)?/g)?.map(Number) || [];

  if (numbers.length < 3) {
    return [
      "Loan / Interest Help",
      "Ask like this:",
      "Calculate EMI for 500000 loan at 12% for 5 years",
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

function buildSummary(data: BankData) {
  const totalCustomerBalance = data.customers.reduce(
    (sum, item) => sum + numberValue(item.balance),
    0
  );

  const totalIncome = data.transactions.reduce((sum, item) => {
    const type = cleanText(item.type || item.transactionType);
    return type.includes("income") || type.includes("credit") || type.includes("deposit")
      ? sum + numberValue(item.amount)
      : sum;
  }, 0);

  const totalExpense = data.transactions.reduce((sum, item) => {
    const type = cleanText(item.type || item.transactionType);
    return type.includes("expense") ||
      type.includes("debit") ||
      type.includes("transfer") ||
      type.includes("withdraw")
      ? sum + numberValue(item.amount)
      : sum;
  }, 0);

  const totalLoanAmount = data.loans.reduce(
    (sum, item) => sum + numberValue(item.amount || item.loanAmount),
    0
  );

  const pendingLoans = data.loans.filter((item) =>
    cleanText(item.status).includes("pending")
  );

  const highRiskTransactions = data.transactions.filter((item) => {
    const risk = cleanText(item.risk || item.aiRisk || item.riskLevel);
    const status = cleanText(item.status);
    const score = numberValue(item.riskScore);

    return (
      risk.includes("high") ||
      risk.includes("flag") ||
      status.includes("failed") ||
      status.includes("flag") ||
      score >= 70
    );
  });

  return [
    "FinSecure Live Bank Summary",
    `• Customers: ${data.customers.length}`,
    `• Employees: ${data.employees.length}`,
    `• Admins: ${data.admins.length}`,
    `• Branches: ${data.branches.length}`,
    `• Loans: ${data.loans.length}`,
    `• Pending Loans: ${pendingLoans.length}`,
    `• Transactions: ${data.transactions.length}`,
    `• Audit Logs: ${data.auditLogs.length}`,
    `• Total Customer Balance: ${money(totalCustomerBalance)}`,
    `• Transaction Income: ${money(totalIncome)}`,
    `• Transaction Expense: ${money(totalExpense)}`,
    `• Total Loan Amount: ${money(totalLoanAmount)}`,
    `• AI Risk Alerts: ${highRiskTransactions.length}`,
    "",
    "Ask examples:",
    "• Show customer Prabhas complete details",
    "• Show customer account number 99887744562 transactions",
    "• Show all pending loans",
    "• Show latest transactions",
    "• Show employee Sri details",
    "• Show branch Gajuwaka details",
  ].join("\n");
}

function answerCustomerQuestion(question: string, data: BankData) {
  const q = cleanText(question);
  const customer = findRecord(question, data.customers);

  if (customer) {
    const customerTransactions = data.transactions.filter((item) =>
      relatedToCustomer(item, customer)
    );

    const customerLoans = data.loans.filter((item) => relatedToCustomer(item, customer));

    if (q.includes("transaction")) {
      return formatList(
        `Transactions for ${getCustomerName(customer) || getEmail(customer)}`,
        customerTransactions,
        formatTransaction,
        20
      );
    }

    if (q.includes("loan")) {
      return formatList(
        `Loans for ${getCustomerName(customer) || getEmail(customer)}`,
        customerLoans,
        formatLoan,
        20
      );
    }

    return [
      formatCustomer(customer),
      "",
      formatList("Customer Transactions", customerTransactions, formatTransaction, 10),
      "",
      formatList("Customer Loans", customerLoans, formatLoan, 10),
    ].join("\n");
  }

  if (
    q.includes("all customer") ||
    q.includes("customers list") ||
    q.includes("every customer")
  ) {
    return formatList("All Customers", data.customers, formatCustomer, 20);
  }

  return "";
}

function answerEmployeeQuestion(question: string, data: BankData) {
  const q = cleanText(question);
  const employee = findRecord(question, data.employees);

  if (employee) return formatEmployee(employee);

  if (
    q.includes("all employee") ||
    q.includes("employees list") ||
    q.includes("every employee")
  ) {
    return formatList("All Employees", data.employees, formatEmployee, 20);
  }

  return "";
}

function answerBranchQuestion(question: string, data: BankData) {
  const q = cleanText(question);
  const branch = findRecord(question, data.branches);

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

    const branchLoans = data.loans.filter((item) => {
      return (
        cleanText(item.branch || item.branchName) === branchName ||
        cleanText(item.ifsc || item.ifscCode) === branchIfsc
      );
    });

    const branchTransactions = data.transactions.filter((item) => {
      return (
        cleanText(item.branch || item.branchName) === branchName ||
        cleanText(item.ifsc || item.ifscCode) === branchIfsc
      );
    });

    return [
      formatBranch(branch),
      "",
      `Branch Customers: ${branchCustomers.length}`,
      `Branch Employees: ${branchEmployees.length}`,
      `Branch Loans: ${branchLoans.length}`,
      `Branch Transactions: ${branchTransactions.length}`,
      "",
      formatList("Latest Branch Transactions", branchTransactions, formatTransaction, 5),
    ].join("\n");
  }

  if (
    q.includes("all branch") ||
    q.includes("branches list") ||
    q.includes("every branch")
  ) {
    return formatList("All Branches", data.branches, formatBranch, 20);
  }

  return "";
}

function answerLoanQuestion(question: string, data: BankData) {
  const q = cleanText(question);

  const customer = findRecord(question, data.customers);
  if (customer) {
    const customerLoans = data.loans.filter((item) => relatedToCustomer(item, customer));
    return formatList(
      `Loans for ${getCustomerName(customer) || getEmail(customer)}`,
      customerLoans,
      formatLoan,
      20
    );
  }

  const loan = findRecord(question, data.loans);
  if (loan) return formatLoan(loan);

  let loans = data.loans;

  if (q.includes("pending")) {
    loans = loans.filter((item) => cleanText(item.status).includes("pending"));
    return formatList("Pending Loans", loans, formatLoan, 20);
  }

  if (q.includes("approved")) {
    loans = loans.filter((item) => cleanText(item.status).includes("approved"));
    return formatList("Approved Loans", loans, formatLoan, 20);
  }

  if (q.includes("rejected")) {
    loans = loans.filter((item) => cleanText(item.status).includes("rejected"));
    return formatList("Rejected Loans", loans, formatLoan, 20);
  }

  if (
    q.includes("all loan") ||
    q.includes("loan list") ||
    q.includes("every loan") ||
    q.includes("loans")
  ) {
    return formatList("All Loans", loans, formatLoan, 20);
  }

  return "";
}

function answerTransactionQuestion(question: string, data: BankData) {
  const q = cleanText(question);

  const customer = findRecord(question, data.customers);
  if (customer) {
    const customerTransactions = data.transactions.filter((item) =>
      relatedToCustomer(item, customer)
    );

    return formatList(
      `Transactions for ${getCustomerName(customer) || getEmail(customer)}`,
      customerTransactions,
      formatTransaction,
      25
    );
  }

  const transaction = findRecord(question, data.transactions);
  if (transaction) return formatTransaction(transaction);

  let transactions = data.transactions;

  if (q.includes("failed")) {
    transactions = transactions.filter((item) =>
      cleanText(item.status).includes("failed")
    );
    return formatList("Failed Transactions", transactions, formatTransaction, 25);
  }

  if (q.includes("success")) {
    transactions = transactions.filter((item) =>
      cleanText(item.status).includes("success")
    );
    return formatList("Successful Transactions", transactions, formatTransaction, 25);
  }

  if (q.includes("high risk") || q.includes("risky") || q.includes("flagged")) {
    transactions = transactions.filter((item) => {
      const risk = cleanText(item.risk || item.aiRisk || item.riskLevel);
      const status = cleanText(item.status);
      const score = numberValue(item.riskScore);

      return (
        risk.includes("high") ||
        risk.includes("flag") ||
        status.includes("flag") ||
        score >= 70
      );
    });

    return formatList("Risky / Flagged Transactions", transactions, formatTransaction, 25);
  }

  if (
    q.includes("latest") ||
    q.includes("recent") ||
    q.includes("all transaction") ||
    q.includes("transaction list") ||
    q.includes("every transaction") ||
    q.includes("transactions")
  ) {
    return formatList("Latest Transactions", transactions, formatTransaction, 25);
  }

  return "";
}

function answerAdminQuestion(question: string, data: BankData, role: string) {
  const q = cleanText(question);

  if (!q.includes("admin")) return "";

  if (!isSuperAdmin(role)) {
    return "Only Super Admin can view admin database details.";
  }

  const admin = findRecord(question, data.admins);

  if (admin) return formatRecord("Admin Complete Details", admin);

  if (
    q.includes("all admin") ||
    q.includes("admins list") ||
    q.includes("every admin")
  ) {
    return formatList(
      "All Admins",
      data.admins,
      (record: BankRecord, index: number) => formatRecord(`${index + 1}. Admin`, record),
      20
    );
  }

  return "";
}

function answerAuditQuestion(data: BankData, role: string) {
  if (!isSuperAdmin(role)) {
    return "Only Super Admin can view audit log details.";
  }

  const latestLogs = data.auditLogs.slice(0, 25);

  if (!latestLogs.length) return "No audit logs found.";

  return [
    `Latest Audit Logs (${data.auditLogs.length})`,
    ...latestLogs.map((log, index) => {
      return `${index + 1}. ${log.action || "-"} | ${log.module || "-"} | ${
        log.adminName || log.admin || log.user || "-"
      } | ${log.createdAt || log.date || "-"}`;
    }),
  ].join("\n");
}

function answerQuestion(question: string, data: BankData, role: string) {
  const q = cleanText(question);

  const emiAnswer = calculateEmi(question);
  if (emiAnswer) return emiAnswer;

  if (
    q.includes("summary") ||
    q.includes("overview") ||
    q.includes("everything") ||
    q.includes("complete bank") ||
    q.includes("bank details") ||
    q.includes("bank status") ||
    q.includes("what data") ||
    q.includes("all data")
  ) {
    return buildSummary(data);
  }

  if (
    q.includes("how many customer") ||
    q.includes("customers count") ||
    q.includes("total customers")
  ) {
    return `Total customers: ${data.customers.length}`;
  }

  if (
    q.includes("how many employee") ||
    q.includes("employees count") ||
    q.includes("total employees")
  ) {
    return `Total employees: ${data.employees.length}`;
  }

  if (
    q.includes("how many admin") ||
    q.includes("admins count") ||
    q.includes("total admins")
  ) {
    if (!isSuperAdmin(role)) {
      return "Only Super Admin can view admin count.";
    }

    return `Total admins: ${data.admins.length}`;
  }

  if (
    q.includes("how many branch") ||
    q.includes("branches count") ||
    q.includes("total branches")
  ) {
    return `Total branches: ${data.branches.length}`;
  }

  if (
    q.includes("how many transaction") ||
    q.includes("transactions count") ||
    q.includes("total transactions")
  ) {
    return `Total transactions: ${data.transactions.length}`;
  }

  if (
    q.includes("how many loan") ||
    q.includes("loans count") ||
    q.includes("total loans")
  ) {
    return `Total loans: ${data.loans.length}`;
  }

  if (q.includes("audit") || q.includes("log")) {
    return answerAuditQuestion(data, role);
  }

  const adminAnswer = answerAdminQuestion(question, data, role);
  if (adminAnswer) return adminAnswer;

  if (q.includes("customer") || q.includes("account") || q.includes("cif")) {
    const answer = answerCustomerQuestion(question, data);
    if (answer) return answer;
  }

  if (q.includes("employee") || q.includes("staff")) {
    const answer = answerEmployeeQuestion(question, data);
    if (answer) return answer;
  }

  if (q.includes("branch") || q.includes("ifsc")) {
    const answer = answerBranchQuestion(question, data);
    if (answer) return answer;
  }

  if (q.includes("loan") || q.includes("emi")) {
    const answer = answerLoanQuestion(question, data);
    if (answer) return answer;
  }

  if (q.includes("transaction") || q.includes("transfer") || q.includes("payment")) {
    const answer = answerTransactionQuestion(question, data);
    if (answer) return answer;
  }

  const genericCustomer = findRecord(question, data.customers);
  if (genericCustomer) {
    return answerCustomerQuestion(question, data);
  }

  const genericEmployee = findRecord(question, data.employees);
  if (genericEmployee) {
    return formatEmployee(genericEmployee);
  }

  const genericBranch = findRecord(question, data.branches);
  if (genericBranch) {
    return answerBranchQuestion(question, data);
  }

  return [
    "I can answer live bank/admin questions like:",
    "• Total customers",
    "• Show customer Prabhas complete details",
    "• Show customer Prabhas transactions",
    "• Show customer account number 99887744562 details",
    "• Show employee Sri details",
    "• Show branch Gajuwaka details",
    "• Show all pending loans",
    "• Show latest transactions",
    "• Show failed transactions",
    "• Show risky transactions",
    "• Calculate EMI for 500000 loan at 12% for 5 years",
    "• Show complete bank summary",
    "",
    "I do not show passwords, tokens, OTPs, or secret keys.",
  ].join("\n");
}

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const adminProfile = (req as any).admin || {};
    const role = String(adminProfile.role || "").trim();

    if (!canPerform(role, "ai insights", "read")) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your role cannot use Admin AI Insights.",
      });
    }

    const question = String(req.body?.message || "").trim();

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required.",
      });
    }

    const cleanRole = normalizeAccessRole(role);
    const fullAdmin = isFullAdminRole(cleanRole);

    const [allCustomers, allTransactions, allReports, allEmployees, allBranches, allLoans, allAdmins, allAuditLogs] =
      await Promise.all([
        getCollection("customers"),
        getCollection("transactions"),
        getCollection("reports"),
        getCollection("employees"),
        getCollection("branches"),
        getCollection("loans"),
        getCollection("admins"),
        getCollection("auditLogs"),
      ]);

    let scopedCustomers = fullAdmin
      ? allCustomers
      : filterByBranch(allCustomers, adminProfile, role);
    const scopedCustomerIdentifiers = buildCustomerIdentifiers(scopedCustomers);

    let scopedTransactions = fullAdmin
      ? allTransactions
      : allTransactions.filter(
          (transaction) =>
            filterByBranch([transaction], adminProfile, role).length > 0 ||
            recordMatchesCustomerIdentifiers(
              transaction,
              scopedCustomerIdentifiers
            )
        );

    if (cleanRole === "fraud analyst") {
      scopedTransactions = scopedTransactions.filter(isSuspiciousTransaction);
      const suspiciousIdentifiers = new Set<string>();
      scopedTransactions.forEach((transaction) => {
        [
          transaction.customerId,
          transaction.email,
          transaction.customerEmail,
          transaction.userEmail,
          transaction.accountNumber,
          transaction.accountNo,
          transaction.fromAccount,
          transaction.customer,
          transaction.customerName,
        ].forEach((value) => {
          const cleaned = cleanText(value);
          if (cleaned) suspiciousIdentifiers.add(cleaned);
        });
      });
      scopedCustomers = scopedCustomers.filter((customer) =>
        recordMatchesCustomerIdentifiers(customer, suspiciousIdentifiers)
      );
    }

    const data: BankData = {
      customers: roleCanAccess(role, "customers") ? scopedCustomers : [],
      employees: roleCanAccess(role, "employees")
        ? fullAdmin
          ? allEmployees
          : filterByBranch(allEmployees, adminProfile, role)
        : [],
      admins: fullAdmin ? allAdmins : [],
      branches: roleCanAccess(role, "branches")
        ? fullAdmin
          ? allBranches
          : filterByBranch(allBranches, adminProfile, role)
        : [],
      loans: roleCanAccess(role, "loans")
        ? fullAdmin
          ? allLoans
          : filterByBranch(allLoans, adminProfile, role)
        : [],
      transactions: roleCanAccess(role, "transactions")
        ? scopedTransactions
        : [],
      reports: roleCanAccess(role, "reports")
        ? fullAdmin
          ? allReports
          : filterByBranch(allReports, adminProfile, role)
        : [],
      auditLogs: fullAdmin ? allAuditLogs : [],
    };

    const answer = answerQuestion(question, data, role);

    return res.json({
      success: true,
      role,
      answer,
      reply: answer,
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