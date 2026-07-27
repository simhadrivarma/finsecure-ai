// @ts-nocheck

const express = require("express");
const mongoose = require("mongoose");
const AdminTransaction = require("../models/AdminTransaction");
const Customer = require("../models/Customer");
const auth = require("../middleware/authMiddleware");

const router = express.Router();
const protectAdmin = auth.protectAdmin || auth;
const requirePermission = auth.requirePermission;
const mergeFilters = auth.mergeFilters;
const normalizeRole = auth.normalizeRole;
const isFullAdminRole = auth.isFullAdminRole;
const { buildScopedRecordFilter } = require("../utils/accessScope");

const generateTransactionId = () => `TRN${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

const anyIdFilter = (id: string) => ({
  $or: [
    { id },
    { transactionId: id },
    { ref: id },
    { reference: id },
    ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
  ],
});

const moneyToNumber = (value: any) => {
  const amount = Number(String(value ?? "").replace(/₹/g, "").replace(/,/g, "").replace(/\+/g, "").trim() || 0);
  return Number.isFinite(amount) ? amount : 0;
};

const calculateRisk = (transaction: any) => {
  const amount = moneyToNumber(transaction.amount);
  const status = String(transaction.status || "Success");
  const type = String(transaction.type || "");
  const time = String(transaction.time || "");
  const reasons: string[] = [];
  let score = 0;

  if (amount >= 1000000) {
    score += 45;
    reasons.push("Very high transaction amount");
  } else if (amount >= 500000) {
    score += 30;
    reasons.push("High transaction amount");
  } else if (amount >= 100000) {
    score += 15;
    reasons.push("Large transaction amount");
  }
  if (status === "Flagged") {
    score += 40;
    reasons.push("Transaction status is flagged");
  }
  if (status === "Failed") {
    score += 25;
    reasons.push("Transaction failed");
  }
  if (["RTGS", "IMPS"].includes(type) && amount >= 500000) {
    score += 15;
    reasons.push("High-value fast transfer method");
  }
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
    const hour = Number(time.split(":")[0]);
    if (hour >= 22 || hour < 5) {
      score += 20;
      reasons.push("Transaction occurred during unusual night hours");
    }
  }

  score = Math.min(score, 100);
  const risk = score >= 70 ? "High" : score >= 40 ? "Medium" : score >= 15 ? "Low" : "Normal";
  if (!reasons.length) reasons.push("No major risk detected");
  return { risk, riskScore: score, riskReasons: reasons };
};

const suspiciousFilter = {
  $or: [
    { risk: { $in: ["Medium", "High"] } },
    { status: { $in: ["Flagged", "Failed"] } },
    { fraudStatus: { $in: ["Under Review", "Confirmed"] } },
  ],
};

const getTransactionAccessFilter = async (req: any) => {
  const branchScope = await buildScopedRecordFilter(req, "transactions");
  return normalizeRole(req.admin?.role) === "fraud analyst"
    ? mergeFilters(branchScope, suspiciousFilter)
    : branchScope;
};

const findCustomer = async (payload: any) => {
  const or: any[] = [];
  if (payload.accountNumber) or.push({ accountNumber: String(payload.accountNumber).toUpperCase() }, { accountNo: String(payload.accountNumber).toUpperCase() });
  if (payload.customerId) or.push({ id: payload.customerId }, { customerId: payload.customerId });
  if (payload.email) or.push({ email: String(payload.email).toLowerCase() });
  return or.length ? Customer.findOne({ $or: or }).select("-password").lean() : null;
};

const cleanPayload = (body: any, role: any) => {
  const normalizedRole = normalizeRole(role);
  let allowed = [
    "customer", "customerName", "customerId", "email", "customerEmail", "userEmail", "phone",
    "accountNumber", "accountNo", "fromAccount", "branch", "branchName", "branchCode", "branchId", "ifsc", "ifscCode", "cif",
    "type", "amount", "category", "description", "paymentMethod", "date", "time", "ref", "reference", "status",
    "fraudStatus", "fraudNotes"
  ];

  if (normalizedRole === "fraud analyst") {
    allowed = ["status", "risk", "riskScore", "riskReasons", "fraudStatus", "fraudNotes"];
  }

  const payload: any = {};
  allowed.forEach((field) => {
    if (body?.[field] !== undefined) payload[field] = body[field];
  });

  ["customer", "customerName", "branch", "branchName", "type", "category", "description", "paymentMethod", "status", "fraudStatus", "fraudNotes"].forEach((field) => {
    if (payload[field] !== undefined) payload[field] = String(payload[field]).trim();
  });
  ["email", "customerEmail", "userEmail"].forEach((field) => {
    if (payload[field] !== undefined) payload[field] = String(payload[field]).toLowerCase().trim();
  });
  ["accountNumber", "accountNo", "fromAccount", "ifsc", "ifscCode", "cif"].forEach((field) => {
    if (payload[field] !== undefined) payload[field] = String(payload[field]).toUpperCase().replace(/[^A-Z0-9]/g, "");
  });
  return payload;
};

const enrichFromCustomer = (payload: any, customer: any) => {
  if (!customer) return payload;
  return {
    ...payload,
    customer: payload.customer || customer.name || customer.customerName,
    customerName: payload.customerName || customer.customerName || customer.name,
    customerId: payload.customerId || customer.customerId || customer.id,
    email: payload.email || customer.email || "",
    customerEmail: payload.customerEmail || customer.email || "",
    userEmail: payload.userEmail || customer.email || "",
    phone: payload.phone || customer.phone || customer.phoneNumber || "",
    accountNumber: payload.accountNumber || customer.accountNumber || customer.accountNo,
    accountNo: payload.accountNo || customer.accountNo || customer.accountNumber,
    fromAccount: payload.fromAccount || customer.accountNumber || customer.accountNo,
    branch: payload.branch || customer.branch || customer.branchName || "",
    branchName: payload.branchName || customer.branchName || customer.branch || "",
    branchCode: payload.branchCode || customer.branchCode || "",
    branchId: payload.branchId || customer.branchId || "",
    ifsc: payload.ifsc || customer.ifsc || customer.ifscCode || "",
    ifscCode: payload.ifscCode || customer.ifscCode || customer.ifsc || "",
    cif: payload.cif || customer.cif || customer.cifNumber || "",
  };
};

const belongsToAdminBranch = (req: any, payload: any) => {
  if (isFullAdminRole(req.admin?.role)) return true;
  const adminIfsc = String(req.admin?.ifsc || req.admin?.ifscCode || "").toUpperCase();
  const itemIfsc = String(payload.ifsc || payload.ifscCode || "").toUpperCase();
  const adminBranch = String(req.admin?.branch || req.admin?.branchName || "").trim().toLowerCase();
  const itemBranch = String(payload.branch || payload.branchName || "").trim().toLowerCase();
  return Boolean((adminIfsc && adminIfsc === itemIfsc) || (adminBranch && adminBranch === itemBranch));
};

const validateTransaction = (payload: any, isEdit = false) => {
  if (!isEdit) {
    const required = ["customer", "accountNumber", "type", "amount", "date", "time"];
    const missing = required.find((field) => !String(payload[field] || "").trim());
    if (missing) return `${missing} is required`;
  }
  if (payload.amount !== undefined && moneyToNumber(payload.amount) <= 0) return "Amount must be greater than 0";
  if (payload.time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(String(payload.time))) return "Transaction time must be in HH:MM format";
  return "";
};

router.use(protectAdmin);

router.get("/", requirePermission("transactions", "read"), async (req: any, res: any) => {
  try {
    const query: any = {};
    if (req.query?.status) query.status = req.query.status;
    if (req.query?.risk) query.risk = req.query.risk;
    if (req.query?.type) query.type = req.query.type;
    if (req.query?.search) {
      const regex = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ id: regex }, { customer: regex }, { accountNumber: regex }, { ref: regex }, { branch: regex }];
    }

    const transactions = await AdminTransaction.find(mergeFilters(query, await getTransactionAccessFilter(req)))
      .select("-__v")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, count: transactions.length, data: transactions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch transactions" });
  }
});

router.get("/:id", requirePermission("transactions", "read"), async (req: any, res: any) => {
  try {
    const transaction = await AdminTransaction.findOne(mergeFilters(anyIdFilter(req.params.id), await getTransactionAccessFilter(req))).select("-__v").lean();
    if (!transaction) return res.status(404).json({ success: false, message: "Transaction not found or access denied" });
    return res.status(200).json({ success: true, data: transaction });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch transaction" });
  }
});

router.post("/", requirePermission("transactions", "create"), async (req: any, res: any) => {
  try {
    let payload = cleanPayload(req.body, req.admin.role);
    payload = enrichFromCustomer(payload, await findCustomer(payload));
    if (!belongsToAdminBranch(req, payload)) {
      return res.status(403).json({ success: false, message: "You can create transactions only for customers in your assigned branch" });
    }

    const validationError = validateTransaction(payload, false);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const risk = calculateRisk(payload);
    const id = generateTransactionId();
    const transaction = await AdminTransaction.create({
      id,
      transactionId: id,
      ...payload,
      ...risk,
      ref: payload.ref || `REF${Date.now()}`,
      reference: payload.reference || payload.ref || `REF${Date.now()}`,
      createdBy: req.admin.email || req.admin.name,
      createdByRole: req.admin.role,
    });

    return res.status(201).json({ success: true, message: "Transaction created successfully", data: transaction });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to create transaction" });
  }
});

router.put("/:id", requirePermission("transactions", "update"), async (req: any, res: any) => {
  try {
    const access = await getTransactionAccessFilter(req);
    const existing = await AdminTransaction.findOne(mergeFilters(anyIdFilter(req.params.id), access)).lean();
    if (!existing) return res.status(404).json({ success: false, message: "Transaction not found or access denied" });

    const role = normalizeRole(req.admin.role);
    const payload = cleanPayload(req.body, req.admin.role);

    if (role === "fraud analyst") {
      payload.reviewedBy = req.admin.email || req.admin.name;
      payload.reviewedById = req.admin.employeeId || req.admin.id;
      payload.reviewedAt = new Date();
      if (payload.status === "Resolved") payload.fraudStatus = "Resolved";
    } else {
      const validationError = validateTransaction({ ...existing, ...payload }, true);
      if (validationError) return res.status(400).json({ success: false, message: validationError });
      const risk = calculateRisk({ ...existing, ...payload });
      payload.risk = risk.risk;
      payload.riskScore = risk.riskScore;
      payload.riskReasons = risk.riskReasons;
    }
    payload.updatedBy = req.admin.email || req.admin.name;

    const transaction = await AdminTransaction.findOneAndUpdate(
      mergeFilters(anyIdFilter(req.params.id), access),
      payload,
      { new: true, runValidators: true }
    ).select("-__v");

    return res.status(200).json({ success: true, message: "Transaction updated successfully", data: transaction });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to update transaction" });
  }
});

router.delete("/:id", requirePermission("transactions", "delete"), async (req: any, res: any) => {
  try {
    const transaction = await AdminTransaction.findOneAndDelete(mergeFilters(anyIdFilter(req.params.id), await getTransactionAccessFilter(req))).select("-__v");
    if (!transaction) return res.status(404).json({ success: false, message: "Transaction not found or access denied" });
    return res.status(200).json({ success: true, message: "Transaction deleted successfully", data: transaction });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to delete transaction" });
  }
});

module.exports = router;
