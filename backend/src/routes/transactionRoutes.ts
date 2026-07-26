const express = require("express");
const jwt = require("jsonwebtoken");

const Transaction = require("../models/Transaction");
const Customer = require("../models/Customer");
const User = require("../models/User");
const calculateTransactionRisk = require("../utils/riskScoring");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const generateTransactionId = () => {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `TXN${Date.now()}${randomPart}`;
};

const normaliseEmail = (value: any) =>
  String(value || "").toLowerCase().trim();

const normaliseAccountNumber = (value: any) =>
  String(value || "")
    .toUpperCase()
    .replace(/\s/g, "")
    .trim();

const moneyToNumber = (value: any) => {
  const cleaned = String(value ?? "")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\+/g, "")
    .trim();

  const numberValue = Number(cleaned);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const isCustomerRole = (role: any) => {
  const normalisedRole = String(role || "customer")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .trim();

  return normalisedRole === "customer";
};

const getBearerToken = (req: any) => {
  const authorization = String(req.headers?.authorization || "").trim();

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
};

const protectCustomer = async (req: any, res: any, next: any) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Login token is required",
      });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (!isCustomerRole(decoded?.role)) {
      return res.status(403).json({
        success: false,
        message: "This transaction route is available only to customers",
      });
    }

    const email = normaliseEmail(decoded?.email);

    if (!email) {
      return res.status(401).json({
        success: false,
        message: "Customer email is missing from the login token",
      });
    }

    const [customerRecord, userRecord] = await Promise.all([
      Customer.findOne({ email }).lean(),
      User.findOne({ email }).lean(),
    ]);

    const customer = customerRecord || userRecord;

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Customer account was not found",
      });
    }

    const accountNumber = normaliseAccountNumber(
      customerRecord?.accountNumber || userRecord?.accountNumber
    );

    if (!accountNumber) {
      return res.status(400).json({
        success: false,
        message: "Customer account number is missing",
      });
    }

    req.customerAuth = {
      id:
        customerRecord?.id ||
        customerRecord?.customerId ||
        userRecord?.id ||
        userRecord?._id ||
        decoded?.id ||
        "",
      name:
        customerRecord?.name ||
        customerRecord?.customerName ||
        userRecord?.name ||
        "Customer",
      email,
      accountNumber,
      branch: customerRecord?.branch || userRecord?.branch || "",
      ifsc:
        customerRecord?.ifsc ||
        customerRecord?.ifscCode ||
        userRecord?.ifsc ||
        userRecord?.ifscCode ||
        "",
      cif:
        customerRecord?.cif ||
        customerRecord?.cifNumber ||
        userRecord?.cif ||
        userRecord?.cifNumber ||
        "",
    };

    next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired login token",
      error: error.message,
    });
  }
};

const buildOwnershipFilter = (identity: any) => {
  const conditions: any[] = [];

  if (identity?.accountNumber) {
    conditions.push({ accountNumber: identity.accountNumber });
  }

  if (identity?.email) {
    conditions.push({ userEmail: identity.email });
  }

  return conditions.length ? { $or: conditions } : { id: "__NO_ACCESS__" };
};

const calculateSummary = (transactions: any[] = []) => {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((transaction) => {
    const status = String(transaction.status || "Success").toLowerCase();

    if (["failed", "pending", "flagged", "rejected"].includes(status)) {
      return;
    }

    const type = String(
      transaction.type || transaction.transactionType || ""
    ).toLowerCase();
    const amount = moneyToNumber(transaction.amount);

    if (
      type.includes("income") ||
      type.includes("credit") ||
      type.includes("deposit")
    ) {
      totalIncome += amount;
      return;
    }

    if (
      type.includes("expense") ||
      type.includes("debit") ||
      type.includes("withdraw") ||
      type.includes("transfer")
    ) {
      totalExpense += amount;
    }
  });

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
};

const getOwnedTransactions = async (identity: any) => {
  return Transaction.find(buildOwnershipFilter(identity))
    .sort({ createdAt: -1, date: -1, time: -1 })
    .lean();
};

const syncCustomerBalance = async (identity: any) => {
  const transactions = await getOwnedTransactions(identity);
  const summary = calculateSummary(transactions);

  const customerConditions: any[] = [];

  if (identity?.email) {
    customerConditions.push({ email: identity.email });
  }

  if (identity?.accountNumber) {
    customerConditions.push({ accountNumber: identity.accountNumber });
  }

  if (customerConditions.length) {
    await Customer.updateMany(
      { $or: customerConditions },
      {
        $set: {
          totalIncome: summary.totalIncome,
          totalExpense: summary.totalExpense,
          balance: summary.balance,
          transactionsCount: transactions.length,
        },
      }
    );
  }

  return { transactions, summary };
};

router.use(protectCustomer);

router.get("/", async (req: any, res: any) => {
  try {
    const { transactions, summary } = await syncCustomerBalance(
      req.customerAuth
    );

    return res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
      summary,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer transactions",
      error: error.message,
    });
  }
});

router.post("/", async (req: any, res: any) => {
  try {
    const identity = req.customerAuth;
    const type = String(req.body.type || "").toLowerCase().trim();
    const amount = moneyToNumber(req.body.amount);

    if (!type || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Transaction type and a valid amount are required",
      });
    }

    const currentTransactions = await getOwnedTransactions(identity);
    const currentSummary = calculateSummary(currentTransactions);

    const isExpense =
      type.includes("expense") ||
      type.includes("debit") ||
      type.includes("withdraw") ||
      type.includes("transfer");

    if (isExpense && amount > currentSummary.balance) {
      return res.status(400).json({
        success: false,
        message: "Insufficient account balance",
        summary: currentSummary,
      });
    }

    const date =
      String(req.body.date || "").trim() ||
      new Date().toISOString().split("T")[0];
    const time =
      String(req.body.time || "").trim() ||
      new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });

    const requestedStatus = String(req.body.status || "Success").trim();
    const status = requestedStatus === "Completed" ? "Completed" : "Success";

    const riskInput = {
      customer: identity.name,
      accountNumber: identity.accountNumber,
      type,
      amount,
      date,
      time,
      ref: req.body.ref || "",
      status,
    };

    const aiRisk = calculateTransactionRisk(riskInput);

    const transaction = await Transaction.create({
      id: generateTransactionId(),
      customer: identity.name,
      customerId: identity.id,
      userEmail: identity.email,
      accountNumber: identity.accountNumber,
      type,
      amount,
      category: req.body.category || "Other",
      description: req.body.description || "Transaction",
      paymentMethod: req.body.paymentMethod || "Bank Transfer",
      branch: identity.branch || req.body.branch || "",
      ifsc: identity.ifsc || req.body.ifsc || "",
      cif: identity.cif || req.body.cif || "",
      beneficiaryName: req.body.beneficiaryName || "",
      beneficiaryAccount: req.body.beneficiaryAccount || "",
      beneficiaryIfsc: req.body.beneficiaryIfsc || "",
      bankName: req.body.bankName || "",
      date,
      time,
      ref: req.body.ref || "",
      status,
      risk: aiRisk.risk,
      riskScore: aiRisk.riskScore,
      riskReasons: aiRisk.riskReasons,
    });

    const { summary } = await syncCustomerBalance(identity);

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: transaction.toObject(),
      summary,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to create transaction",
      error: error.message,
    });
  }
});

router.put("/:id", async (req: any, res: any) => {
  try {
    const ownershipFilter = buildOwnershipFilter(req.customerAuth);

    const transaction = await Transaction.findOne({
      $and: [{ id: req.params.id }, ownershipFilter],
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    [
      "type",
      "amount",
      "category",
      "description",
      "paymentMethod",
      "date",
      "time",
      "status",
    ].forEach((field) => {
      if (req.body[field] !== undefined) {
        transaction[field] = req.body[field];
      }
    });

    await transaction.save();
    const { summary } = await syncCustomerBalance(req.customerAuth);

    return res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      data: transaction.toObject(),
      summary,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to update transaction",
      error: error.message,
    });
  }
});

router.delete("/:id", async (req: any, res: any) => {
  try {
    const ownershipFilter = buildOwnershipFilter(req.customerAuth);

    const transaction = await Transaction.findOneAndDelete({
      $and: [{ id: req.params.id }, ownershipFilter],
    }).lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found or does not belong to this customer",
      });
    }

    const { summary } = await syncCustomerBalance(req.customerAuth);

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
      data: transaction,
      summary,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete transaction",
      error: error.message,
    });
  }
});

module.exports = router;