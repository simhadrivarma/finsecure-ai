// @ts-nocheck

const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Loan = require("../models/Loan");
const Customer = require("../models/Customer");
const Admin = require("../models/Admin");
const auth = require("../middleware/authMiddleware");

const router = express.Router();
const protectAdmin = auth.protectAdmin || auth;
const requirePermission = auth.requirePermission;
const mergeFilters = auth.mergeFilters;
const normalizeRole = auth.normalizeRole;
const isFullAdminRole = auth.isFullAdminRole;
const { buildScopedRecordFilter } = require("../utils/accessScope");

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return secret;
};

const generateLoanId = () => `LON${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

const anyIdFilter = (id: string) => ({
  $or: [{ id }, { loanId: id }, ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : [])],
});

const moneyToNumber = (value: any) => {
  const amount = Number(String(value ?? "").replace(/₹/g, "").replace(/,/g, "").replace(/%/g, "").trim() || 0);
  return Number.isFinite(amount) ? amount : 0;
};

const getCustomer = async (payload: any) => {
  const or: any[] = [];
  if (payload.accountNumber) or.push({ accountNumber: String(payload.accountNumber).toUpperCase() }, { accountNo: String(payload.accountNumber).toUpperCase() });
  if (payload.customerId) or.push({ id: payload.customerId }, { customerId: payload.customerId });
  if (payload.email) or.push({ email: String(payload.email).toLowerCase() });
  return or.length ? Customer.findOne({ $or: or }).select("-password").lean() : null;
};

const cleanPayload = (body: any, role: any = "") => {
  const normalizedRole = normalizeRole(role);
  let allowed = [
    "customer", "customerName", "fullName", "customerId", "email", "customerEmail", "userEmail", "phone",
    "accountNumber", "accountType", "cif", "cifNumber",
    "branch", "branchName", "branchCode", "branchId", "ifsc", "ifscCode",
    "type", "loanType", "amount", "loanAmount", "monthlyIncome", "employmentType", "tenure", "tenureMonths",
    "interest", "interestRate", "startDate", "endDate", "appliedDate", "emi", "paid", "pending", "totalPayable",
    "purpose", "address", "existingLoan",
    "officer", "officerEmail", "officerId", "loanOfficer", "loanOfficerEmail", "loanOfficerId",
    "assignedOfficer", "assignedOfficerEmail", "assignedOfficerId",
    "status", "decisionNotes"
  ];

  if (normalizedRole === "loan officer") {
    allowed = [
      "customer", "customerName", "fullName", "customerId", "email",
      "customerEmail", "userEmail", "phone", "accountNumber", "accountType",
      "cif", "cifNumber", "branch", "branchName", "branchCode", "branchId",
      "ifsc", "ifscCode", "type", "loanType", "amount", "loanAmount",
      "monthlyIncome", "employmentType", "tenure", "tenureMonths",
      "interest", "interestRate", "startDate", "endDate", "emi", "paid",
      "pending", "totalPayable", "purpose", "existingLoan", "status",
      "decisionNotes"
    ];
  }

  const payload: any = {};
  allowed.forEach((field) => {
    if (body?.[field] !== undefined) payload[field] = body[field];
  });

  const textFields = ["customer", "customerName", "fullName", "type", "loanType", "branch", "branchName", "purpose", "address", "officer", "loanOfficer", "status", "decisionNotes"];
  textFields.forEach((field) => {
    if (payload[field] !== undefined) payload[field] = String(payload[field]).trim();
  });
  ["email", "customerEmail", "userEmail", "officerEmail", "loanOfficerEmail", "assignedOfficerEmail"].forEach((field) => {
    if (payload[field] !== undefined) payload[field] = String(payload[field]).toLowerCase().trim();
  });
  if (payload.accountNumber !== undefined) payload.accountNumber = String(payload.accountNumber).toUpperCase().replace(/[^A-Z0-9]/g, "");
  ["ifsc", "ifscCode", "cif", "cifNumber"].forEach((field) => {
    if (payload[field] !== undefined) payload[field] = String(payload[field]).toUpperCase().trim();
  });
  if (payload.monthlyIncome !== undefined) payload.monthlyIncome = moneyToNumber(payload.monthlyIncome);
  return payload;
};

const enrichFromCustomer = (payload: any, customer: any) => {
  if (!customer) return payload;
  return {
    ...payload,
    customer: payload.customer || customer.name || customer.customerName,
    customerName: payload.customerName || customer.customerName || customer.name,
    fullName: payload.fullName || customer.name || customer.customerName,
    customerId: payload.customerId || customer.customerId || customer.id,
    email: payload.email || customer.email || "",
    customerEmail: payload.customerEmail || customer.email || "",
    userEmail: payload.userEmail || customer.email || "",
    phone: payload.phone || customer.phone || customer.phoneNumber || "",
    accountNumber: payload.accountNumber || customer.accountNumber || customer.accountNo,
    accountType: payload.accountType || customer.accountType || "",
    cif: payload.cif || customer.cif || customer.cifNumber || "",
    cifNumber: payload.cifNumber || customer.cifNumber || customer.cif || "",
    branch: payload.branch || customer.branch || customer.branchName || "",
    branchName: payload.branchName || customer.branchName || customer.branch || "",
    branchCode: payload.branchCode || customer.branchCode || "",
    branchId: payload.branchId || customer.branchId || "",
    ifsc: payload.ifsc || customer.ifsc || customer.ifscCode || "",
    ifscCode: payload.ifscCode || customer.ifscCode || customer.ifsc || "",
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

const assignCurrentOfficer = (req: any, payload: any) => {
  const identity = auth.getAdminIdentity(req.admin);
  return {
    ...payload,
    officer: identity.name,
    officerEmail: identity.email,
    officerId: identity.employeeId || identity.id,
    loanOfficer: identity.name,
    loanOfficerEmail: identity.email,
    loanOfficerId: identity.employeeId || identity.id,
    assignedOfficer: identity.name,
    assignedOfficerEmail: identity.email,
    assignedOfficerId: identity.employeeId || identity.id,
  };
};

const validateLoan = (payload: any, isEdit = false) => {
  if (!isEdit) {
    const required = ["customer", "accountNumber", "type", "amount", "interest", "startDate", "endDate"];
    const missing = required.find((field) => !String(payload[field] || "").trim());
    if (missing) return `${missing} is required`;
  }
  if (payload.startDate && payload.endDate && new Date(payload.endDate) < new Date(payload.startDate)) {
    return "End date cannot be before start date";
  }
  if (payload.amount !== undefined && moneyToNumber(payload.amount) <= 0) return "Loan amount must be greater than 0";
  return "";
};

const optionalActor = async (req: any, res: any, next: any) => {
  try {
    const header = String(req.headers.authorization || "");
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Login is required to submit a loan" });
    }
    const decoded: any = jwt.verify(header.slice(7), getJwtSecret());
    if (normalizeRole(decoded.role) !== "customer") {
      return protectAdmin(req, res, next);
    }

    const customer = await Customer.findOne({
      $or: [
        ...(decoded.email ? [{ email: String(decoded.email).toLowerCase() }] : []),
        ...(decoded.accountNumber ? [{ accountNumber: decoded.accountNumber }] : []),
        ...(decoded.id ? [{ id: decoded.id }, { customerId: decoded.id }] : []),
      ],
    }).select("-password").lean();

    if (!customer) return res.status(401).json({ success: false, message: "Customer account not found" });
    req.customer = customer;
    req.user = customer;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid login token" });
  }
};

router.get("/", protectAdmin, requirePermission("loans", "read"), async (req: any, res: any) => {
  try {
    const query: any = {};
    if (req.query?.status) query.status = req.query.status;
    if (req.query?.type) query.type = req.query.type;
    if (req.query?.search) {
      const regex = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ id: regex }, { customer: regex }, { accountNumber: regex }, { officer: regex }, { branch: regex }];
    }
    const loans = await Loan.find(mergeFilters(query, await buildScopedRecordFilter(req, "loans"))).select("-__v").sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, count: loans.length, data: loans });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch loans" });
  }
});

router.get("/:id", protectAdmin, requirePermission("loans", "read"), async (req: any, res: any) => {
  try {
    const loan = await Loan.findOne(mergeFilters(anyIdFilter(req.params.id), await buildScopedRecordFilter(req, "loans"))).select("-__v").lean();
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found or access denied" });
    return res.status(200).json({ success: true, data: loan });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch loan" });
  }
});

router.post("/", optionalActor, async (req: any, res: any) => {
  try {
    const isCustomer = Boolean(req.customer);
    if (!isCustomer && !req.can("loans", "create")) {
      return res.status(403).json({ success: false, message: "Your role cannot create loans" });
    }

    let payload = cleanPayload(req.body, req.admin?.role || "customer");
    const customer = isCustomer ? req.customer : await getCustomer(payload);
    payload = enrichFromCustomer(payload, customer);

    if (isCustomer) {
      payload = {
        ...payload,
        customer: customer.name || customer.customerName,
        customerName: customer.customerName || customer.name,
        customerId: customer.customerId || customer.id,
        email: customer.email || "",
        customerEmail: customer.email || "",
        userEmail: customer.email || "",
        accountNumber: customer.accountNumber,
        accountType: customer.accountType || "",
        branch: customer.branch || customer.branchName || "",
        branchName: customer.branchName || customer.branch || "",
        branchId: customer.branchId || "",
        branchCode: customer.branchCode || "",
        ifsc: customer.ifsc || customer.ifscCode || "",
        ifscCode: customer.ifscCode || customer.ifsc || "",
        cif: customer.cif || customer.cifNumber || "",
        cifNumber: customer.cifNumber || customer.cif || "",
        status: "Pending",
      };
    } else {
      if (!belongsToAdminBranch(req, payload)) {
        return res.status(403).json({ success: false, message: "You can create loans only for customers in your assigned branch" });
      }
      if (normalizeRole(req.admin.role) === "loan officer") payload = assignCurrentOfficer(req, payload);
    }

    const validationError = validateLoan(payload, false);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const id = generateLoanId();
    const loan = await Loan.create({
      id,
      loanId: id,
      ...payload,
      loanType: payload.loanType || payload.type,
      loanAmount: payload.loanAmount || payload.amount,
      interestRate: payload.interestRate || payload.interest,
      createdBy: isCustomer ? customer.email : req.admin.email || req.admin.name,
      createdByRole: isCustomer ? "Customer" : req.admin.role,
    });

    return res.status(201).json({ success: true, message: "Loan created successfully", data: loan });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to create loan" });
  }
});

router.put("/:id", protectAdmin, requirePermission("loans", "update"), async (req: any, res: any) => {
  try {
    const access = await buildScopedRecordFilter(req, "loans");
    const existing = await Loan.findOne(mergeFilters(anyIdFilter(req.params.id), access)).lean();
    if (!existing) return res.status(404).json({ success: false, message: "Loan not found or access denied" });

    let payload = cleanPayload(req.body, req.admin.role);
    const role = normalizeRole(req.admin.role);
    const finalStatus = payload.status || existing.status;

    if (["Approved", "Rejected"].includes(finalStatus) && !req.can("loans", "approve")) {
      return res.status(403).json({ success: false, message: "Your role cannot approve or reject loans" });
    }
    if (role === "loan officer") payload = assignCurrentOfficer(req, payload);
    if (["Approved", "Rejected"].includes(finalStatus)) {
      payload.approvedBy = req.admin.email || req.admin.name;
      payload.approvedAt = new Date();
    }

    const validationError = validateLoan({ ...existing, ...payload }, true);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    payload.updatedBy = req.admin.email || req.admin.name;

    const loan = await Loan.findOneAndUpdate(
      mergeFilters(anyIdFilter(req.params.id), access),
      payload,
      { new: true, runValidators: true }
    ).select("-__v");

    return res.status(200).json({ success: true, message: "Loan updated successfully", data: loan });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to update loan" });
  }
});

router.delete("/:id", protectAdmin, requirePermission("loans", "delete"), async (req: any, res: any) => {
  try {
    const loan = await Loan.findOneAndDelete(mergeFilters(anyIdFilter(req.params.id), await buildScopedRecordFilter(req, "loans"))).select("-__v");
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found or access denied" });
    return res.status(200).json({ success: true, message: "Loan deleted successfully", data: loan });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to delete loan" });
  }
});

module.exports = router;
