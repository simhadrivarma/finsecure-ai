// @ts-nocheck

const express = require("express");
const Admin = require("../models/Admin");
const AuditLog = require("../models/AuditLog");
const Employee = require("../models/Employee");
const Branch = require("../models/Branch");
const Customer = require("../models/Customer");
const Loan = require("../models/Loan");
const AdminTransaction = require("../models/AdminTransaction");
const Report = require("../models/Report");
const auth = require("../middleware/authMiddleware");

const router = express.Router();
const protectAdmin = auth.protectAdmin || auth;
const requirePermission = auth.requirePermission;
const canPerform = auth.canPerform;
const normalizeRole = auth.normalizeRole;
const isFullAdminRole = auth.isFullAdminRole;
const mergeFilters = auth.mergeFilters;
const { buildScopedRecordFilter } = require("../utils/accessScope");

const parseMoney = (value: any) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value || "")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\+/g, "")
    .trim();
  const numberValue = Number(cleaned || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatMoney = (amount: number) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const suspiciousTransactionFilter = {
  $or: [
    { risk: { $in: ["Medium", "High"] } },
    { status: { $in: ["Flagged", "Failed"] } },
    { fraudStatus: { $in: ["Under Review", "Confirmed"] } },
  ],
};

const relatedCustomerFilter = (rows: any[]) => {
  const ids = new Set<string>();
  const emails = new Set<string>();
  const accounts = new Set<string>();
  const names = new Set<string>();

  rows.forEach((row) => {
    [row.customerId, row.id].forEach(
      (value) => value && ids.add(String(value))
    );
    [row.email, row.customerEmail, row.userEmail].forEach(
      (value) => value && emails.add(String(value).toLowerCase())
    );
    [row.accountNumber, row.accountNo, row.fromAccount].forEach(
      (value) => value && accounts.add(String(value).toUpperCase())
    );
    [row.customer, row.customerName, row.name].forEach(
      (value) => value && names.add(String(value))
    );
  });

  const conditions: any[] = [];
  if (ids.size) {
    conditions.push(
      { id: { $in: [...ids] } },
      { customerId: { $in: [...ids] } }
    );
  }
  if (emails.size) conditions.push({ email: { $in: [...emails] } });
  if (accounts.size) {
    conditions.push(
      { accountNumber: { $in: [...accounts] } },
      { accountNo: { $in: [...accounts] } }
    );
  }
  if (names.size) {
    conditions.push(
      { name: { $in: [...names] } },
      { customerName: { $in: [...names] } }
    );
  }

  return conditions.length ? { $or: conditions } : auth.noAccessFilter();
};

router.use(protectAdmin);

router.get("/", requirePermission("dashboard", "read"), async (req: any, res: any) => {
  try {
    const role = normalizeRole(req.admin.role);
    const fullAdmin = isFullAdminRole(role);

    const canRead = (moduleName: string) =>
      canPerform(req.admin.role, moduleName, "read");

    const loanScope = canRead("loans")
      ? await buildScopedRecordFilter(req, "loans")
      : auth.noAccessFilter();
    const transactionScope = canRead("transactions")
      ? await buildScopedRecordFilter(req, "transactions")
      : auth.noAccessFilter();

    const adminsPromise = fullAdmin
      ? Admin.find({}).select("-password -__v").lean()
      : Promise.resolve([]);
    const auditPromise = fullAdmin
      ? AuditLog.find({}).select("-__v").lean()
      : Promise.resolve([]);
    const employeesPromise = canRead("employees")
      ? Employee.find(req.getAccessFilter("employees")).select("-__v").lean()
      : Promise.resolve([]);
    const branchesPromise = canRead("branches")
      ? Branch.find(req.getAccessFilter("branches")).select("-__v").lean()
      : Promise.resolve([]);
    const loansPromise = canRead("loans")
      ? Loan.find(loanScope).select("-__v").lean()
      : Promise.resolve([]);
    const reportsPromise = canRead("reports")
      ? Report.find(req.getAccessFilter("reports")).select("-__v").lean()
      : Promise.resolve([]);

    let transactionFilter: any = transactionScope;
    if (role === "fraud analyst") {
      transactionFilter = mergeFilters(
        transactionFilter,
        suspiciousTransactionFilter
      );
    }

    const transactionsPromise = canRead("transactions")
      ? AdminTransaction.find(transactionFilter)
          .select("-__v")
          .sort({ createdAt: -1 })
          .lean()
      : Promise.resolve([]);

    const [admins, auditLogs, employees, branches, loans, reports, transactions] =
      await Promise.all([
        adminsPromise,
        auditPromise,
        employeesPromise,
        branchesPromise,
        loansPromise,
        reportsPromise,
        transactionsPromise,
      ]);

    let customers: any[] = [];
    if (canRead("customers")) {
      let customerFilter: any = req.getAccessFilter("customers");

      if (["loan officer", "loan manager"].includes(role)) {
        customerFilter = relatedCustomerFilter(loans);
      } else if (role === "fraud analyst") {
        customerFilter = relatedCustomerFilter(transactions);
      }

      customers = await Customer.find(customerFilter)
        .select("-password -aadhaarNumber -panNumber -__v")
        .lean();
    }

    const totalBalance = customers.reduce(
      (sum: number, item: any) => sum + parseMoney(item.balance),
      0
    );
    const branchBalance = branches.reduce(
      (sum: number, item: any) => sum + parseMoney(item.balance),
      0
    );
    const totalLoanAmount = loans.reduce(
      (sum: number, item: any) =>
        sum + parseMoney(item.amount || item.loanAmount),
      0
    );
    const transactionVolume = transactions.reduce(
      (sum: number, item: any) => sum + parseMoney(item.amount),
      0
    );

    const activeCustomers = customers.filter((item: any) =>
      ["active", "review"].includes(String(item.status || "").toLowerCase())
    ).length;
    const activeLoans = loans.filter((item: any) =>
      ["active", "approved", "under review", "review"].includes(
        String(item.status || "").toLowerCase()
      )
    ).length;

    const highRiskTransactions = transactions.filter(
      (item: any) => String(item.risk || "").toLowerCase() === "high"
    );
    const mediumRiskTransactions = transactions.filter(
      (item: any) => String(item.risk || "").toLowerCase() === "medium"
    );
    const flaggedTransactions = transactions.filter((item: any) =>
      ["flagged", "failed"].includes(String(item.status || "").toLowerCase())
    );

    const riskDistribution = {
      normal: transactions.filter(
        (item: any) => String(item.risk || "").toLowerCase() === "normal"
      ).length,
      low: transactions.filter(
        (item: any) => String(item.risk || "").toLowerCase() === "low"
      ).length,
      medium: mediumRiskTransactions.length,
      high: highRiskTransactions.length,
    };

    const recentTransactions = transactions.slice(0, 5).map((item: any) => ({
      id: item.id || item.transactionId,
      customer: item.customer || item.customerName,
      amount: item.amount,
      type: item.type,
      status: item.status,
      risk: item.risk,
      riskScore: item.riskScore || 0,
      date: item.date,
      time: item.time,
    }));

    return res.status(200).json({
      success: true,
      message: "Role-scoped dashboard analytics fetched successfully",
      scope: {
        role: req.admin.role,
        branch: req.admin.branch || req.admin.branchName || "All Branches",
        ifsc: req.admin.ifsc || req.admin.ifscCode || "",
      },
      data: {
        totalAdmins: admins.length,
        totalAuditLogs: auditLogs.length,
        totalEmployees: employees.length,
        totalBranches: branches.length,
        totalCustomers: customers.length,
        totalLoans: loans.length,
        totalTransactions: transactions.length,
        totalReports: reports.length,
        activeCustomers,
        activeLoans,
        totalBalance: formatMoney(totalBalance),
        branchBalance: formatMoney(branchBalance),
        totalLoanAmount: formatMoney(totalLoanAmount),
        transactionVolume: formatMoney(transactionVolume),
        highRiskTransactions: highRiskTransactions.length,
        mediumRiskTransactions: mediumRiskTransactions.length,
        flaggedTransactions: flaggedTransactions.length,
        aiRiskAlerts:
          highRiskTransactions.length +
          mediumRiskTransactions.length +
          flaggedTransactions.length,
        riskDistribution,
        recentTransactions,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard analytics",
      error: error.message,
    });
  }
});

module.exports = router;
