// @ts-nocheck

const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/authMiddleware");

const router = express.Router();
const protectAdmin = auth.protectAdmin || auth;

const PAGE_SIZE = 50;
const MAX_DB_ROWS = 5000;

const text = (value) => String(value ?? "").trim();
const lower = (value) => text(value).toLowerCase();

const normalizeRole = (value) =>
  lower(value)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");

const isFullAdmin = (role) =>
  ["super admin", "superadmin", "super", "admin"].includes(
    normalizeRole(role)
  );

const money = (value) => {
  const n = Number(
    String(value ?? 0)
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .trim()
  );

  return `₹${(Number.isFinite(n) ? n : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const mask = (value, visible = 4) => {
  const raw = text(value);
  if (!raw) return "-";
  if (raw.length <= visible) return raw;
  return `${"*".repeat(raw.length - visible)}${raw.slice(-visible)}`;
};

const dateValue = (record) => {
  for (const value of [
    record?.createdAt,
    record?.date,
    record?.transactionDate,
    record?.updatedAt,
  ]) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (Number.isFinite(time)) return time;
  }
  return 0;
};

const getRequestedPage = (question) => {
  const match = String(question || "").match(/\bpage\s*(\d+)\b/i);
  const page = match ? Number(match[1]) : 1;
  return Number.isFinite(page) && page > 0 ? page : 1;
};

const paginate = (rows, page) => {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), pages);
  const start = (safePage - 1) * PAGE_SIZE;

  return {
    rows: rows.slice(start, start + PAGE_SIZE),
    page: safePage,
    pages,
    total,
    from: total ? start + 1 : 0,
    to: Math.min(start + PAGE_SIZE, total),
  };
};

const footer = (result, label) => {
  if (!result.total) return `No ${label} records were found.`;

  const lines = [
    `Showing ${result.from}-${result.to} of ${result.total} ${label}.`,
  ];

  if (result.pages > 1) {
    lines.push(
      `Page ${result.page} of ${result.pages}. Ask "${label} page ${
        result.page < result.pages ? result.page + 1 : 1
      }" to continue.`
    );
  }

  return lines.join("\n");
};

const canUseModule = (req, moduleName) => {
  if (typeof req.canAccessModule === "function") {
    return req.canAccessModule(moduleName);
  }
  return isFullAdmin(req.admin?.role);
};

const getAccessFilter = (req, moduleName) => {
  if (typeof req.getAccessFilter === "function") {
    return req.getAccessFilter(moduleName) || {};
  }
  return isFullAdmin(req.admin?.role)
    ? {}
    : { id: "__NO_ACCESS__" };
};

const findExistingCollection = async (db, candidates) => {
  const existing = await db.listCollections({}, { nameOnly: true }).toArray();
  const names = new Set(existing.map((item) => item.name));
  return candidates.find((name) => names.has(name)) || null;
};

const loadCollection = async (
  db,
  candidates,
  filter = {},
  sort = { createdAt: -1 }
) => {
  const name = await findExistingCollection(db, candidates);
  if (!name) return [];

  return db
    .collection(name)
    .find(filter || {})
    .sort(sort)
    .limit(MAX_DB_ROWS)
    .toArray();
};

const secureFields = new Set([
  "password",
  "pass",
  "hashedpassword",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "jwttoken",
  "jwt",
  "otp",
  "pin",
  "cvv",
  "secret",
  "secretkey",
  "aadhaarnumber",
  "aadhaar",
  "pannumber",
  "pan",
  "__v",
]);

const safeRecord = (record) => {
  const safe = {};
  for (const [key, value] of Object.entries(record || {})) {
    if (secureFields.has(String(key).toLowerCase())) continue;
    safe[key] = value;
  }
  return safe;
};

const adminLine = (record, index) => {
  const r = safeRecord(record);
  return [
    `${index}. ${text(r.name || r.adminName) || "Unnamed Admin"}`,
    `Admin ID: ${text(r.id || r.adminId || r._id) || "-"}`,
    `Employee ID: ${text(r.employeeId || r.employeeID) || "-"}`,
    `Role: ${text(r.role) || "-"}`,
    `Phone: ${text(r.phone || r.phoneNumber || r.mobile) || "-"}`,
    `Email: ${text(r.email) || "-"}`,
    `Branch: ${text(r.branch || r.branchName) || "-"}`,
    `IFSC: ${text(r.ifsc || r.ifscCode) || "-"}`,
    `Status: ${text(r.status) || "Active"}`,
  ].join("\n");
};

const employeeLine = (record, index) => {
  const r = safeRecord(record);
  return [
    `${index}. ${text(r.name || r.employeeName) || "Unnamed Employee"}`,
    `Employee ID: ${text(r.id || r.employeeId || r.employeeID || r._id) || "-"}`,
    `Role: ${text(r.role || r.designation) || "-"}`,
    `Phone: ${text(r.phone || r.phoneNumber || r.mobile) || "-"}`,
    `Email: ${text(r.email) || "-"}`,
    `Branch: ${text(r.branch || r.branchName || r.assignedBranch) || "-"}`,
    `IFSC: ${text(r.ifsc || r.ifscCode) || "-"}`,
    `Joining Date: ${text(r.joiningDate || r.dateOfJoining) || "-"}`,
    `Customers Managed: ${text(r.customers || r.customersManaged) || "0"}`,
    `Status: ${text(r.status) || "Active"}`,
  ].join("\n");
};

const customerLine = (record, index) => {
  const r = safeRecord(record);
  return [
    `${index}. ${text(r.name || r.customerName) || "Unnamed Customer"}`,
    `Customer ID: ${text(r.id || r.customerId || r._id) || "-"}`,
    `Phone: ${text(r.phone || r.phoneNumber || r.mobile) || "-"}`,
    `Email: ${text(r.email) || "-"}`,
    `Account: ${mask(r.accountNumber || r.accountNo, 4)}`,
    `Account Type: ${text(r.accountType) || "-"}`,
    `Balance: ${money(r.balance)}`,
    `Branch: ${text(r.branch || r.branchName) || "-"}`,
    `IFSC: ${text(r.ifsc || r.ifscCode) || "-"}`,
    `CIF: ${mask(r.cif || r.cifNumber, 4)}`,
    `KYC: ${text(r.kyc || r.kycStatus) || "-"}`,
    `Assigned Employee: ${text(r.employee || r.assignedEmployee) || "-"}`,
    `Status: ${text(r.status) || "Active"}`,
  ].join("\n");
};

const branchLine = (record, index) => {
  const r = safeRecord(record);
  return [
    `${index}. ${text(r.name || r.branchName) || "Unnamed Branch"}`,
    `Branch ID: ${text(r.id || r.branchId || r._id) || "-"}`,
    `IFSC: ${text(r.ifsc || r.ifscCode) || "-"}`,
    `Address: ${text(r.address || r.location) || "-"}`,
    `Manager: ${text(r.manager || r.managerName) || "-"}`,
    `Employees: ${text(r.employees) || "0"}`,
    `Customers: ${text(r.customers) || "0"}`,
    `Balance: ${money(r.balance)}`,
    `Loans: ${money(r.loans || r.totalLoans)}`,
    `Status: ${text(r.status) || "Active"}`,
  ].join("\n");
};

const loanLine = (record, index) => {
  const r = safeRecord(record);
  return [
    `${index}. Loan ${text(r.id || r.loanId || r._id) || "-"}`,
    `Customer: ${text(r.customer || r.customerName) || "-"}`,
    `Account: ${mask(r.accountNumber || r.accountNo, 4)}`,
    `Type: ${text(r.type || r.loanType) || "-"}`,
    `Amount: ${money(r.amount || r.loanAmount)}`,
    `Interest: ${text(r.interest || r.interestRate) || "-"}%`,
    `Start Date: ${text(r.startDate) || "-"}`,
    `End Date: ${text(r.endDate) || "-"}`,
    `EMI: ${money(r.emi || r.monthlyEmi)}`,
    `Paid: ${money(r.paid || r.paidAmount)}`,
    `Pending: ${money(r.pending || r.pendingAmount)}`,
    `Officer: ${text(r.officer || r.loanOfficer || r.assignedOfficer) || "-"}`,
    `Status: ${text(r.status) || "-"}`,
  ].join("\n");
};

const transactionLine = (record, index) => {
  const r = safeRecord(record);
  return [
    `${index}. Transaction ${text(r.id || r.transactionId || r._id) || "-"}`,
    `Customer: ${text(r.customer || r.customerName) || "-"}`,
    `Account: ${mask(
      r.accountNumber ||
        r.accountNo ||
        r.fromAccount ||
        r.senderAccountNumber,
      4
    )}`,
    `Type: ${text(r.type || r.transactionType) || "-"}`,
    `Amount: ${money(r.amount)}`,
    `Date: ${text(r.date || r.transactionDate || r.createdAt) || "-"}`,
    `Time: ${text(r.time) || "-"}`,
    `Reference: ${text(r.ref || r.reference || r.referenceNumber) || "-"}`,
    `Status: ${text(r.status) || "-"}`,
    `Risk: ${text(r.risk || r.aiRisk) || "Normal"}`,
    `Risk Score: ${text(r.riskScore) || "-"}`,
    `Description: ${text(r.description || r.note || r.narration) || "-"}`,
  ].join("\n");
};

const auditLine = (record, index) => {
  const r = safeRecord(record);
  return [
    `${index}. ${text(r.action) || "Audit Event"}`,
    `Module: ${text(r.module) || "-"}`,
    `Admin: ${text(r.adminName || r.adminEmail) || "-"}`,
    `Target: ${text(r.targetName) || "-"}`,
    `Description: ${text(r.description) || "-"}`,
    `Status: ${text(r.status) || "-"}`,
    `Created: ${text(r.createdAt) || "-"}`,
  ].join("\n");
};

const findSpecific = (question, records, fields) => {
  const q = lower(question);

  const scored = records
    .map((record) => {
      let score = 0;

      for (const field of fields) {
        const value = lower(record?.[field]);
        if (!value || value.length < 2) continue;
        if (q.includes(value)) {
          score += value.includes("@") ? 8 : value.length > 8 ? 6 : 4;
        }
      }

      return { record, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.record || null;
};

const transactionBelongsToCustomer = (transaction, customer) => {
  const account = text(customer?.accountNumber || customer?.accountNo);
  const email = lower(customer?.email);
  const id = text(customer?.id || customer?.customerId || customer?._id);

  const txAccounts = [
    transaction?.accountNumber,
    transaction?.accountNo,
    transaction?.fromAccount,
    transaction?.toAccount,
    transaction?.senderAccountNumber,
    transaction?.receiverAccountNumber,
  ].map(text);

  const txEmails = [
    transaction?.email,
    transaction?.userEmail,
    transaction?.customerEmail,
  ].map(lower);

  const txIds = [
    transaction?.customerId,
    transaction?.customerID,
    transaction?.userId,
  ].map(text);

  return (
    (account && txAccounts.includes(account)) ||
    (email && txEmails.includes(email)) ||
    (id && txIds.includes(id))
  );
};

router.get("/health", protectAdmin, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "FinSecure Admin AI is active",
    admin: req.admin?.name || "Admin",
    role: req.admin?.role || "Admin",
  });
});

router.post("/chat", protectAdmin, async (req, res) => {
  try {
    const originalQuestion = text(req.body?.message);
    const question = lower(originalQuestion);

    if (!originalQuestion) {
      return res.status(400).json({
        success: false,
        message: "Please enter an Admin AI question.",
      });
    }

    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return res.status(503).json({
        success: false,
        message: "Database is not ready. Please try again in a moment.",
      });
    }

    const db = mongoose.connection.db;
    const adminName = text(req.admin?.name || req.admin?.adminName) || "Admin";
    const adminRole = text(req.admin?.role) || "Admin";
    const fullAdmin = isFullAdmin(adminRole);

    if (
      /^(hi|hello|hey|hello there|hi there|namaste|good morning|good afternoon|good evening)[!. ]*$/i.test(
        originalQuestion
      )
    ) {
      return res.status(200).json({
        success: true,
        answer: [
          `Hello ${adminName}. Welcome to FinSecure Admin AI.`,
          `You are signed in as ${adminRole}.`,
          "",
          "I can securely retrieve live banking information from MongoDB according to your role and access scope, including:",
          "• Admin, employee and customer records with permitted phone and contact information",
          "• Branch information and operational counts",
          "• Loans, interest, EMI, paid and pending amounts",
          "• Transaction history from the earliest record to the latest record",
          "• Transaction status, references and AI risk information",
          "• Bank totals, summaries and audit information where your role permits",
          "",
          "For security, I never reveal passwords, OTPs, PINs, CVVs, authentication tokens, full Aadhaar numbers or full PAN numbers.",
        ].join("\n"),
      });
    }

    const page = getRequestedPage(question);

    const customerAllowed = canUseModule(req, "customers");
    const employeeAllowed = canUseModule(req, "employees");
    const branchAllowed = canUseModule(req, "branches");
    const loanAllowed = canUseModule(req, "loans");
    const transactionAllowed = canUseModule(req, "transactions");
    const adminAllowed = canUseModule(req, "admins");
    const auditAllowed = canUseModule(req, "audit logs");

    const customers = customerAllowed
      ? await loadCollection(
          db,
          ["customers", "customer"],
          getAccessFilter(req, "customers")
        )
      : [];

    const employees = employeeAllowed
      ? await loadCollection(
          db,
          ["employees", "employee"],
          getAccessFilter(req, "employees")
        )
      : [];

    const branches = branchAllowed
      ? await loadCollection(
          db,
          ["branches", "branch"],
          getAccessFilter(req, "branches")
        )
      : [];

    const admins =
      adminAllowed || fullAdmin
        ? await loadCollection(db, ["admins", "admin"], {})
        : [];

    const loans = loanAllowed
      ? await loadCollection(
          db,
          ["loans", "loan"],
          getAccessFilter(req, "loans")
        )
      : [];

    let transactions = [];

    if (transactionAllowed) {
      const transactionCollection = await findExistingCollection(db, [
        "admintransactions",
        "adminTransactions",
        "transactions",
        "transaction",
      ]);

      if (transactionCollection) {
        if (fullAdmin) {
          transactions = await db
            .collection(transactionCollection)
            .find({})
            .limit(MAX_DB_ROWS)
            .toArray();
        } else {
          const directFilter = getAccessFilter(req, "transactions");

          const accounts = [
            ...new Set(
              customers
                .map((item) => text(item.accountNumber || item.accountNo))
                .filter(Boolean)
            ),
          ];

          const emails = [
            ...new Set(
              customers.map((item) => lower(item.email)).filter(Boolean)
            ),
          ];

          const ids = [
            ...new Set(
              customers
                .map((item) => text(item.id || item.customerId || item._id))
                .filter(Boolean)
            ),
          ];

          const linked = [];

          if (accounts.length) {
            for (const field of [
              "accountNumber",
              "accountNo",
              "fromAccount",
              "toAccount",
              "senderAccountNumber",
              "receiverAccountNumber",
            ]) {
              linked.push({ [field]: { $in: accounts } });
            }
          }

          if (emails.length) {
            linked.push({ email: { $in: emails } });
            linked.push({ userEmail: { $in: emails } });
            linked.push({ customerEmail: { $in: emails } });
          }

          if (ids.length) {
            linked.push({ customerId: { $in: ids } });
          }

          let transactionFilter = directFilter;

          if (linked.length && directFilter?.id !== "__NO_ACCESS__") {
            transactionFilter = {
              $or: [...(directFilter?.$or || []), ...linked],
            };
          }

          transactions = await db
            .collection(transactionCollection)
            .find(transactionFilter || {})
            .limit(MAX_DB_ROWS)
            .toArray();
        }
      }
    }

    const auditLogs = auditAllowed
      ? await loadCollection(
          db,
          ["auditlogs", "auditLogs", "audit_logs"],
          getAccessFilter(req, "audit logs")
        )
      : [];

    const totalCustomerBalance = customers.reduce(
      (sum, item) =>
        sum +
        Number(
          String(item.balance || 0).replace(/₹|,/g, "")
        ),
      0
    );

    const totalLoanAmount = loans.reduce(
      (sum, item) =>
        sum +
        Number(
          String(item.amount || item.loanAmount || 0).replace(/₹|,/g, "")
        ),
      0
    );

    const totalTransactionVolume = transactions.reduce(
      (sum, item) =>
        sum +
        Number(
          String(item.amount || 0).replace(/₹|,/g, "")
        ),
      0
    );

    const customer = findSpecific(question, customers, [
      "name",
      "customerName",
      "email",
      "phone",
      "phoneNumber",
      "customerId",
      "id",
      "accountNumber",
      "accountNo",
      "cif",
      "cifNumber",
    ]);

    const employee = findSpecific(question, employees, [
      "name",
      "employeeName",
      "email",
      "phone",
      "phoneNumber",
      "employeeId",
      "employeeID",
      "id",
    ]);

    const adminRecord = findSpecific(question, admins, [
      "name",
      "adminName",
      "email",
      "phone",
      "phoneNumber",
      "adminId",
      "employeeId",
      "id",
    ]);

    const branch = findSpecific(question, branches, [
      "name",
      "branchName",
      "ifsc",
      "ifscCode",
      "branchId",
      "id",
    ]);

    let answer = "";

    if (question.includes("help") || question.includes("what can you do")) {
      answer = [
        `Hello ${adminName}. FinSecure Admin AI can answer live banking questions permitted for your ${adminRole} role.`,
        "",
        '• "Show complete bank summary"',
        '• "Show all customers with phone numbers"',
        '• "Show customer Kishore details"',
        '• "Show all employees with phone numbers"',
        '• "Show employee Ravi details"',
        '• "Show all admins"',
        '• "Show all branches"',
        '• "Show all loans"',
        '• "Show complete transaction history from start to end"',
        '• "Show transactions page 2"',
        '• "Show Kishore transaction history"',
      ].join("\n");
    } else if (
      (question.includes("summary") ||
        question.includes("overview") ||
        question.includes("bank details") ||
        question.includes("everything")) &&
      !question.includes("transaction")
    ) {
      answer = [
        "FinSecure Bank — Live Administrative Summary",
        `Generated for: ${adminName} (${adminRole})`,
        "",
        `• Customers available to your role: ${customers.length}`,
        `• Employees available to your role: ${employees.length}`,
        `• Admins available to your role: ${admins.length}`,
        `• Branches available to your role: ${branches.length}`,
        `• Loans available to your role: ${loans.length}`,
        `• Transactions available to your role: ${transactions.length}`,
        `• Audit logs available to your role: ${auditLogs.length}`,
        `• Customer balance total: ${money(totalCustomerBalance)}`,
        `• Loan amount total: ${money(totalLoanAmount)}`,
        `• Transaction volume: ${money(totalTransactionVolume)}`,
        "",
        "All values are read from the current database when this message is requested.",
      ].join("\n");
    } else if (
      question.includes("customer") &&
      /(how many|count|total)/.test(question)
    ) {
      answer = `Total customers available to your role: ${customers.length}`;
    } else if (
      question.includes("employee") &&
      /(how many|count|total)/.test(question)
    ) {
      answer = `Total employees available to your role: ${employees.length}`;
    } else if (
      question.includes("admin") &&
      /(how many|count|total)/.test(question)
    ) {
      answer =
        adminAllowed || fullAdmin
          ? `Total admins: ${admins.length}`
          : "Your role is not permitted to access Admin Management data.";
    } else if (
      question.includes("branch") &&
      /(how many|count|total)/.test(question)
    ) {
      answer = `Total branches available to your role: ${branches.length}`;
    } else if (
      question.includes("loan") &&
      /(how many|count|total)/.test(question)
    ) {
      answer = `Total loans available to your role: ${loans.length}`;
    } else if (
      question.includes("transaction") &&
      /(how many|count|total)/.test(question)
    ) {
      answer = [
        `Total transactions available to your role: ${transactions.length}`,
        `Total transaction volume: ${money(totalTransactionVolume)}`,
      ].join("\n");
    } else if (customer && question.includes("transaction")) {
      const customerTransactions = transactions
        .filter((item) => transactionBelongsToCustomer(item, customer))
        .sort((a, b) => dateValue(a) - dateValue(b));

      const result = paginate(customerTransactions, page);

      answer = [
        `Complete Transaction History — ${
          customer.name || customer.customerName || "Customer"
        }`,
        `Customer phone: ${text(customer.phone || customer.phoneNumber) || "-"}`,
        `Account: ${mask(customer.accountNumber || customer.accountNo, 4)}`,
        "",
        ...result.rows.map((item, offset) =>
          transactionLine(item, result.from + offset)
        ),
        "",
        footer(result, "transactions"),
      ].join("\n\n");
    } else if (question.includes("transaction")) {
      if (!transactionAllowed) {
        answer = "Your role is not permitted to access transaction information.";
      } else {
        const chronological =
          question.includes("start to end") ||
          question.includes("starting to ending") ||
          question.includes("beginning to end") ||
          question.includes("oldest") ||
          question.includes("complete");

        const sorted = [...transactions].sort((a, b) =>
          chronological
            ? dateValue(a) - dateValue(b)
            : dateValue(b) - dateValue(a)
        );

        const result = paginate(sorted, page);

        answer = [
          chronological
            ? "Complete Transaction History — Oldest to Latest"
            : "Transaction History — Latest First",
          "",
          ...result.rows.map((item, offset) =>
            transactionLine(item, result.from + offset)
          ),
          "",
          footer(result, "transactions"),
        ].join("\n\n");
      }
    } else if (customer) {
      answer = [
        "Customer Details",
        customerLine(customer, 1).replace(/^1\. /, ""),
        "",
        "Security note: Aadhaar, PAN, passwords, OTPs, PINs, CVVs and authentication tokens are never displayed.",
      ].join("\n");
    } else if (employee) {
      answer = [
        "Employee Details",
        employeeLine(employee, 1).replace(/^1\. /, ""),
      ].join("\n");
    } else if (adminRecord) {
      answer =
        adminAllowed || fullAdmin
          ? [
              "Admin Details",
              adminLine(adminRecord, 1).replace(/^1\. /, ""),
            ].join("\n")
          : "Your role is not permitted to access Admin Management data.";
    } else if (branch) {
      answer = [
        "Branch Details",
        branchLine(branch, 1).replace(/^1\. /, ""),
      ].join("\n");
    } else if (
      question.includes("all customer") ||
      question.includes("every customer") ||
      (question.includes("customer") && question.includes("details"))
    ) {
      if (!customerAllowed) {
        answer = "Your role is not permitted to access customer information.";
      } else {
        const result = paginate(customers, page);
        answer = [
          "Customer Directory",
          "",
          ...result.rows.map((item, offset) =>
            customerLine(item, result.from + offset)
          ),
          "",
          footer(result, "customers"),
        ].join("\n\n");
      }
    } else if (
      question.includes("all employee") ||
      question.includes("every employee") ||
      (question.includes("employee") && question.includes("details"))
    ) {
      if (!employeeAllowed) {
        answer = "Your role is not permitted to access employee information.";
      } else {
        const result = paginate(employees, page);
        answer = [
          "Employee Directory",
          "",
          ...result.rows.map((item, offset) =>
            employeeLine(item, result.from + offset)
          ),
          "",
          footer(result, "employees"),
        ].join("\n\n");
      }
    } else if (
      question.includes("all admin") ||
      question.includes("every admin") ||
      (question.includes("admin") && question.includes("details"))
    ) {
      if (!(adminAllowed || fullAdmin)) {
        answer = "Your role is not permitted to access Admin Management data.";
      } else {
        const result = paginate(admins, page);
        answer = [
          "Admin Directory",
          "",
          ...result.rows.map((item, offset) =>
            adminLine(item, result.from + offset)
          ),
          "",
          footer(result, "admins"),
        ].join("\n\n");
      }
    } else if (
      question.includes("all branch") ||
      question.includes("every branch") ||
      (question.includes("branch") && question.includes("details"))
    ) {
      if (!branchAllowed) {
        answer = "Your role is not permitted to access branch information.";
      } else {
        const result = paginate(branches, page);
        answer = [
          "Branch Directory",
          "",
          ...result.rows.map((item, offset) =>
            branchLine(item, result.from + offset)
          ),
          "",
          footer(result, "branches"),
        ].join("\n\n");
      }
    } else if (
      question.includes("loan") &&
      (question.includes("all") ||
        question.includes("details") ||
        question.includes("interest") ||
        question.includes("emi"))
    ) {
      if (!loanAllowed) {
        answer = "Your role is not permitted to access loan information.";
      } else {
        const result = paginate(loans, page);
        answer = [
          "Loan Directory",
          "",
          ...result.rows.map((item, offset) =>
            loanLine(item, result.from + offset)
          ),
          "",
          footer(result, "loans"),
        ].join("\n\n");
      }
    } else if (
      question.includes("audit") ||
      question.includes("activity log")
    ) {
      if (!auditAllowed) {
        answer = "Your role is not permitted to access audit logs.";
      } else {
        const result = paginate(auditLogs, page);
        answer = [
          "Audit Log",
          "",
          ...result.rows.map((item, offset) =>
            auditLine(item, result.from + offset)
          ),
          "",
          footer(result, "audit logs"),
        ].join("\n\n");
      }
    } else if (question.includes("balance")) {
      answer = `Total customer balance available to your role: ${money(
        totalCustomerBalance
      )}`;
    } else {
      answer = [
        `I could not identify a specific banking request, ${adminName}.`,
        "",
        'Try "Hi", "Show complete bank summary", "Show all customers with phone numbers",',
        '"Show all employees with phone numbers", "Show all admins",',
        '"Show complete transaction history from start to end", or "Help".',
      ].join("\n");
    }

    return res.status(200).json({
      success: true,
      answer,
      meta: {
        generatedAt: new Date().toISOString(),
        admin: adminName,
        role: adminRole,
        liveData: true,
      },
    });
  } catch (error) {
    console.error("Advanced Admin AI error:", error);

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "FinSecure Admin AI could not process the request.",
    });
  }
});

module.exports = router;
