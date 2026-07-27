// @ts-nocheck

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Customer = require("../models/Customer");
const Loan = require("../models/Loan");
const AdminTransaction = require("../models/AdminTransaction");
const Branch = require("../models/Branch");
const auth = require("../middleware/authMiddleware");

const router = express.Router();
const protectAdmin = auth.protectAdmin || auth;
const requirePermission = auth.requirePermission;
const mergeFilters = auth.mergeFilters;
const normalizeRole = auth.normalizeRole;
const isFullAdminRole = auth.isFullAdminRole;
const { buildScopedRecordFilter } = require("../utils/accessScope");

const generateCustomerId = () => `CUS${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

const anyIdFilter = (id: string) => ({
  $or: [
    { id },
    { customerId: id },
    { accountNumber: id },
    { accountNo: id },
    { email: String(id).toLowerCase() },
    ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
  ],
});

const identifiersFilter = (rows: any[]) => {
  const ids = new Set<string>();
  const emails = new Set<string>();
  const accounts = new Set<string>();
  const names = new Set<string>();

  rows.forEach((row) => {
    [row.customerId, row.customerID, row.id].forEach((value) => value && ids.add(String(value)));
    [row.email, row.customerEmail, row.userEmail].forEach((value) => value && emails.add(String(value).toLowerCase()));
    [row.accountNumber, row.accountNo, row.fromAccount].forEach((value) => value && accounts.add(String(value).toUpperCase()));
    [row.customer, row.customerName, row.name].forEach((value) => value && names.add(String(value)));
  });

  const or: any[] = [];
  if (ids.size) or.push({ id: { $in: [...ids] } }, { customerId: { $in: [...ids] } });
  if (emails.size) or.push({ email: { $in: [...emails] } });
  if (accounts.size) or.push({ accountNumber: { $in: [...accounts] } }, { accountNo: { $in: [...accounts] } });
  if (names.size) or.push({ name: { $in: [...names] } }, { customerName: { $in: [...names] } });
  return or.length ? { $or: or } : auth.noAccessFilter();
};

const getCustomerAccessFilter = async (req: any) => {
  const role = normalizeRole(req.admin?.role);
  if (isFullAdminRole(role)) return {};

  if (["loan officer", "loan manager"].includes(role)) {
    const loans = await Loan.find(await buildScopedRecordFilter(req, "loans"))
      .select("id customerId customer customerName email customerEmail userEmail accountNumber accountNo")
      .lean();
    return identifiersFilter(loans);
  }

  if (role === "fraud analyst") {
    const suspicious = {
      $or: [
        { risk: { $in: ["Medium", "High"] } },
        { status: { $in: ["Flagged", "Failed"] } },
        { fraudStatus: { $in: ["Under Review", "Confirmed"] } },
      ],
    };
    const transactions = await AdminTransaction.find(
      mergeFilters(await buildScopedRecordFilter(req, "transactions"), suspicious)
    )
      .select("customerId customer customerName email customerEmail userEmail accountNumber accountNo")
      .lean();
    return identifiersFilter(transactions);
  }

  return req.getAccessFilter("customers");
};

const maskSensitive = (customer: any, role: any) => {
  const item = { ...(customer || {}) };
  delete item.password;
  delete item.__v;

  if (!isFullAdminRole(role) && normalizeRole(role) !== "branch manager" && normalizeRole(role) !== "admin officer") {
    if (item.aadhaarNumber) item.aadhaarNumber = `XXXX-XXXX-${String(item.aadhaarNumber).replace(/\D/g, "").slice(-4)}`;
    if (item.panNumber) item.panNumber = `${String(item.panNumber).slice(0, 2)}*****${String(item.panNumber).slice(-2)}`;
  }

  return item;
};

const cleanPayload = (body: any, role: any, isCreate = false) => {
  const normalizedRole = normalizeRole(role);
  let allowed = [
    "name",
    "customerName",
    "email",
    "phone",
    "phoneNumber",
    "accountNumber",
    "accountNo",
    "accountType",
    "ifsc",
    "ifscCode",
    "cif",
    "cifNumber",
    "aadhaarNumber",
    "panNumber",
    "balance",
    "branch",
    "branchName",
    "branchCode",
    "branchId",
    "employee",
    "assignedEmployee",
    "kyc",
    "status",
  ];

  if (["customer support executive", "relationship manager"].includes(normalizedRole)) {
    allowed = ["name", "customerName", "email", "phone", "phoneNumber", "employee", "assignedEmployee", "kyc"];
  }

  const payload: any = {};
  allowed.forEach((field) => {
    if (body?.[field] !== undefined) payload[field] = body[field];
  });

  if (isCreate && body?.password !== undefined) payload.password = body.password;
  if (payload.name !== undefined) payload.name = String(payload.name).trim();
  if (payload.customerName !== undefined) payload.customerName = String(payload.customerName).trim();
  if (payload.email !== undefined) payload.email = String(payload.email).toLowerCase().trim();
  if (payload.phone !== undefined) payload.phone = String(payload.phone).replace(/\D/g, "");
  if (payload.phoneNumber !== undefined) payload.phoneNumber = String(payload.phoneNumber).replace(/\D/g, "");
  if (payload.accountNumber !== undefined) payload.accountNumber = String(payload.accountNumber).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (payload.ifsc !== undefined) payload.ifsc = String(payload.ifsc).toUpperCase().trim();
  if (payload.ifscCode !== undefined) payload.ifscCode = String(payload.ifscCode).toUpperCase().trim();
  if (payload.cif !== undefined) payload.cif = String(payload.cif).toUpperCase().trim();
  if (payload.cifNumber !== undefined) payload.cifNumber = String(payload.cifNumber).toUpperCase().trim();
  if (payload.balance !== undefined) {
    const amount = Number(String(payload.balance).replace(/₹/g, "").replace(/,/g, ""));
    payload.balance = Number.isFinite(amount) ? amount : 0;
  }
  return payload;
};

const enrichBranch = async (payload: any, existing: any = {}) => {
  const branchName = payload.branch || payload.branchName || existing.branch || existing.branchName || "";
  const ifsc = String(payload.ifsc || payload.ifscCode || existing.ifsc || existing.ifscCode || "").toUpperCase().trim();

  let branch = null;
  if (ifsc) branch = await Branch.findOne({ $or: [{ ifsc }, { ifscCode: ifsc }] }).lean();
  if (!branch && branchName) branch = await Branch.findOne({ $or: [{ name: branchName }, { branchName }] }).lean();

  const finalBranch = branchName || branch?.name || branch?.branchName || "";
  const finalIfsc = ifsc || branch?.ifsc || branch?.ifscCode || "";
  if (!finalBranch || !finalIfsc) throw new Error("Please select a valid branch with IFSC code");

  return {
    ...payload,
    branch: finalBranch,
    branchName: finalBranch,
    branchId: payload.branchId || branch?.branchId || branch?.id || existing.branchId || "",
    branchCode: payload.branchCode || branch?.branchCode || branch?.code || existing.branchCode || "",
    ifsc: finalIfsc,
    ifscCode: finalIfsc,
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

router.use(protectAdmin);

router.get("/", requirePermission("customers", "read"), async (req: any, res: any) => {
  try {
    const query: any = {};
    if (req.query?.status) query.status = req.query.status;
    if (req.query?.kyc) query.kyc = req.query.kyc;
    if (req.query?.accountType) query.accountType = req.query.accountType;
    if (req.query?.search) {
      const regex = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ id: regex }, { name: regex }, { email: regex }, { accountNumber: regex }, { branch: regex }, { ifsc: regex }];
    }

    const customers = await Customer.find(mergeFilters(query, await getCustomerAccessFilter(req)))
      .select("-password -__v")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: customers.length,
      data: customers.map((item) => maskSensitive(item, req.admin.role)),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch customers" });
  }
});

router.get("/:id", requirePermission("customers", "read"), async (req: any, res: any) => {
  try {
    const customer = await Customer.findOne(mergeFilters(anyIdFilter(req.params.id), await getCustomerAccessFilter(req)))
      .select("-password -__v")
      .lean();
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found or access denied" });
    return res.status(200).json({ success: true, data: maskSensitive(customer, req.admin.role) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch customer" });
  }
});

router.post("/", requirePermission("customers", "create"), async (req: any, res: any) => {
  try {
    let payload = await enrichBranch(cleanPayload(req.body, req.admin.role, true));
    if (!belongsToAdminBranch(req, payload)) {
      return res.status(403).json({ success: false, message: "You can create customers only in your assigned branch" });
    }

    const required = ["name", "accountNumber", "accountType", "ifsc", "cif", "branch", "password"];
    const missing = required.find((field) => !String(payload[field] || "").trim());
    if (missing) return res.status(400).json({ success: false, message: `${missing} is required` });
    if (String(payload.password).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const duplicate = await Customer.findOne({
      $or: [
        { accountNumber: payload.accountNumber },
        ...(payload.email ? [{ email: payload.email }] : []),
      ],
    }).lean();
    if (duplicate) return res.status(409).json({ success: false, message: "Customer email or account number already exists" });

    const id = generateCustomerId();
    if (payload.password) payload.password = await bcrypt.hash(String(payload.password), 10);
    const customer = await Customer.create({
      id,
      customerId: id,
      ...payload,
      customerName: payload.customerName || payload.name,
      accountNo: payload.accountNo || payload.accountNumber,
      ifscCode: payload.ifscCode || payload.ifsc,
      cifNumber: payload.cifNumber || payload.cif,
      phoneNumber: payload.phoneNumber || payload.phone || "",
      assignedEmployee: payload.assignedEmployee || payload.employee || "",
      createdBy: req.admin.email || req.admin.name,
      createdByRole: req.admin.role,
    });

    return res.status(201).json({ success: true, message: "Customer created successfully", data: maskSensitive(customer.toObject(), req.admin.role) });
  } catch (error: any) {
    const message = error?.code === 11000 ? "Customer data already exists" : error.message;
    return res.status(400).json({ success: false, message: message || "Failed to create customer" });
  }
});

router.put("/:id", requirePermission("customers", "update"), async (req: any, res: any) => {
  try {
    const access = await getCustomerAccessFilter(req);
    const existing = await Customer.findOne(mergeFilters(anyIdFilter(req.params.id), access)).select("-password").lean();
    if (!existing) return res.status(404).json({ success: false, message: "Customer not found or access denied" });

    let payload = cleanPayload(req.body, req.admin.role, false);
    if (["branch", "branchName", "ifsc", "ifscCode"].some((field) => payload[field] !== undefined)) {
      payload = await enrichBranch(payload, existing);
      if (!belongsToAdminBranch(req, { ...existing, ...payload })) {
        return res.status(403).json({ success: false, message: "You cannot move a customer outside your assigned branch" });
      }
    }
    payload.updatedBy = req.admin.email || req.admin.name;

    const customer = await Customer.findOneAndUpdate(
      mergeFilters(anyIdFilter(req.params.id), access),
      payload,
      { new: true, runValidators: true }
    ).select("-password -__v");

    return res.status(200).json({ success: true, message: "Customer updated successfully", data: maskSensitive(customer.toObject(), req.admin.role) });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to update customer" });
  }
});

router.delete("/:id", requirePermission("customers", "delete"), async (req: any, res: any) => {
  try {
    const customer = await Customer.findOneAndDelete(mergeFilters(anyIdFilter(req.params.id), await getCustomerAccessFilter(req))).select("-password -__v");
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found or access denied" });
    return res.status(200).json({ success: true, message: "Customer deleted successfully", data: maskSensitive(customer.toObject(), req.admin.role) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to delete customer" });
  }
});

module.exports = router;
