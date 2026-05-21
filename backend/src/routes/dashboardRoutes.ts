const express = require("express");

const Admin = require("../models/Admin");
const AuditLog = require("../models/AuditLog");
const Employee = require("../models/Employee");
const Branch = require("../models/Branch");
const Customer = require("../models/Customer");
const Loan = require("../models/Loan");
const Transaction = require("../models/Transaction");
const Report = require("../models/Report");

const router = express.Router();

const parseMoney = (value: any) => {
  if (typeof value === "number") return value;

  const cleaned = String(value || "")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .trim();

  const numberValue = Number(cleaned);

  return Number.isNaN(numberValue) ? 0 : numberValue;
};

const formatMoney = (amount: number) => {
  return `₹${amount.toLocaleString("en-IN")}`;
};

router.get("/", async (req: any, res: any) => {
  try {
    const [
      admins,
      auditLogs,
      employees,
      branches,
      customers,
      loans,
      transactions,
      reports,
    ] = await Promise.all([
      Admin.find({}).select("-_id -__v -password").lean(),
      AuditLog.find({}).select("-_id -__v").lean(),
      Employee.find({}).select("-_id -__v").lean(),
      Branch.find({}).select("-_id -__v").lean(),
      Customer.find({}).select("-_id -__v").lean(),
      Loan.find({}).select("-_id -__v").lean(),
      Transaction.find({}).select("-_id -__v").sort({ createdAt: -1 }).lean(),
      Report.find({}).select("-_id -__v").lean(),
    ]);

    const totalBalance = customers.reduce(
      (sum: number, item: any) => sum + parseMoney(item.balance),
      0
    );

    const branchBalance = branches.reduce(
      (sum: number, item: any) => sum + parseMoney(item.balance),
      0
    );

    const totalLoanAmount = loans.reduce(
      (sum: number, item: any) => sum + parseMoney(item.amount),
      0
    );

    const transactionVolume = transactions.reduce(
      (sum: number, item: any) => sum + parseMoney(item.amount),
      0
    );

    const activeCustomers = customers.filter(
      (item: any) => String(item.status || "").toLowerCase() === "active"
    ).length;

    const activeLoans = loans.filter(
      (item: any) => String(item.status || "").toLowerCase() === "active"
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
      id: item.id,
      customer: item.customer,
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
      message: "Dashboard analytics fetched successfully",
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