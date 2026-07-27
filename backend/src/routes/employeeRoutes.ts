// @ts-nocheck

const express = require("express");
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Branch = require("../models/Branch");
const auth = require("../middleware/authMiddleware");

const router = express.Router();
const protectAdmin = auth.protectAdmin || auth;
const requirePermission = auth.requirePermission;
const mergeFilters = auth.mergeFilters;
const isFullAdminRole = auth.isFullAdminRole;

const generateEmployeeId = () => `EMP${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

const anyIdFilter = (id: string) => ({
  $or: [
    { id },
    { employeeId: id },
    { email: String(id).toLowerCase() },
    ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
  ],
});

const cleanPayload = (body: any) => {
  const payload: any = {};
  const allowed = [
    "name",
    "role",
    "email",
    "phone",
    "joiningDate",
    "branch",
    "branchName",
    "assignedBranch",
    "branchCode",
    "branchId",
    "ifsc",
    "ifscCode",
    "customers",
    "status",
  ];

  allowed.forEach((field) => {
    if (body?.[field] !== undefined) payload[field] = body[field];
  });

  if (payload.name !== undefined) payload.name = String(payload.name).trim();
  if (payload.email !== undefined) payload.email = String(payload.email).toLowerCase().trim();
  if (payload.phone !== undefined) payload.phone = String(payload.phone).replace(/\D/g, "");
  if (payload.branch !== undefined) payload.branch = String(payload.branch).trim();
  if (payload.branchName !== undefined) payload.branchName = String(payload.branchName).trim();
  if (payload.ifsc !== undefined) payload.ifsc = String(payload.ifsc).toUpperCase().trim();
  if (payload.ifscCode !== undefined) payload.ifscCode = String(payload.ifscCode).toUpperCase().trim();
  if (payload.customers !== undefined) payload.customers = Number(payload.customers || 0);

  return payload;
};

const enrichBranch = async (payload: any, existing: any = {}) => {
  const branchName = payload.branch || payload.branchName || existing.branch || existing.branchName || "";
  const ifsc = String(payload.ifsc || payload.ifscCode || existing.ifsc || existing.ifscCode || "").toUpperCase().trim();

  let branch = null;
  if (ifsc) branch = await Branch.findOne({ $or: [{ ifsc }, { ifscCode: ifsc }] }).lean();
  if (!branch && branchName) {
    branch = await Branch.findOne({ $or: [{ name: branchName }, { branchName }] }).lean();
  }

  if (!branch && (!branchName || !ifsc)) {
    throw new Error("Please select a valid branch with IFSC code");
  }

  const finalBranch = branchName || branch?.name || branch?.branchName || "";
  const finalIfsc = ifsc || branch?.ifsc || branch?.ifscCode || "";

  return {
    ...payload,
    branch: finalBranch,
    branchName: finalBranch,
    assignedBranch: finalBranch,
    branchId: payload.branchId || branch?.branchId || branch?.id || existing.branchId || "",
    branchCode: payload.branchCode || branch?.branchCode || branch?.code || existing.branchCode || "",
    ifsc: finalIfsc,
    ifscCode: finalIfsc,
  };
};

const validateOwnBranch = (req: any, payload: any) => {
  if (isFullAdminRole(req.admin?.role)) return true;
  const access = req.getAccessFilter("employees");
  if (!access || auth.isNoAccessFilter(access)) return false;

  const adminIfsc = String(req.admin?.ifsc || req.admin?.ifscCode || "").toUpperCase();
  const itemIfsc = String(payload.ifsc || payload.ifscCode || "").toUpperCase();
  const adminBranch = String(req.admin?.branch || req.admin?.branchName || "").trim().toLowerCase();
  const itemBranch = String(payload.branch || payload.branchName || "").trim().toLowerCase();
  return Boolean((adminIfsc && adminIfsc === itemIfsc) || (adminBranch && adminBranch === itemBranch));
};

router.use(protectAdmin);

router.get("/", requirePermission("employees", "read"), async (req: any, res: any) => {
  try {
    const access = req.getAccessFilter("employees");
    const query: any = {};
    if (req.query?.role) query.role = req.query.role;
    if (req.query?.status) query.status = req.query.status;
    if (req.query?.search) {
      const regex = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ id: regex }, { employeeId: regex }, { name: regex }, { email: regex }, { branch: regex }, { ifsc: regex }];
    }

    const employees = await Employee.find(mergeFilters(query, access)).select("-__v").sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, count: employees.length, data: employees });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch employees" });
  }
});

router.get("/:id", requirePermission("employees", "read"), async (req: any, res: any) => {
  try {
    const employee = await Employee.findOne(mergeFilters(anyIdFilter(req.params.id), req.getAccessFilter("employees"))).select("-__v").lean();
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found or access denied" });
    return res.status(200).json({ success: true, data: employee });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch employee" });
  }
});

router.post("/", requirePermission("employees", "create"), async (req: any, res: any) => {
  try {
    let payload = await enrichBranch(cleanPayload(req.body));
    if (!validateOwnBranch(req, payload)) {
      return res.status(403).json({ success: false, message: "You can create employees only in your assigned branch" });
    }

    const required = ["name", "role", "email", "phone", "branch", "ifsc"];
    const missing = required.find((field) => !String(payload[field] || "").trim());
    if (missing) return res.status(400).json({ success: false, message: `${missing} is required` });

    const duplicate = await Employee.findOne({ $or: [{ email: payload.email }, { phone: payload.phone }] }).lean();
    if (duplicate) return res.status(409).json({ success: false, message: "Employee email or phone already exists" });

    const id = generateEmployeeId();
    const employee = await Employee.create({
      id,
      employeeId: id,
      ...payload,
      createdBy: req.admin.email || req.admin.name,
      createdByRole: req.admin.role,
    });

    return res.status(201).json({ success: true, message: "Employee created successfully", data: employee });
  } catch (error: any) {
    const message = error?.code === 11000 ? "Employee data already exists" : error.message;
    return res.status(400).json({ success: false, message: message || "Failed to create employee" });
  }
});

router.put("/:id", requirePermission("employees", "update"), async (req: any, res: any) => {
  try {
    const access = req.getAccessFilter("employees");
    const existing = await Employee.findOne(mergeFilters(anyIdFilter(req.params.id), access)).lean();
    if (!existing) return res.status(404).json({ success: false, message: "Employee not found or access denied" });

    let payload = await enrichBranch(cleanPayload(req.body), existing);
    if (!validateOwnBranch(req, { ...existing, ...payload })) {
      return res.status(403).json({ success: false, message: "You can update employees only in your assigned branch" });
    }
    payload.updatedBy = req.admin.email || req.admin.name;

    const employee = await Employee.findOneAndUpdate(
      mergeFilters(anyIdFilter(req.params.id), access),
      payload,
      { new: true, runValidators: true }
    ).select("-__v");

    return res.status(200).json({ success: true, message: "Employee updated successfully", data: employee });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to update employee" });
  }
});

router.delete("/:id", requirePermission("employees", "delete"), async (req: any, res: any) => {
  try {
    const employee = await Employee.findOneAndDelete(mergeFilters(anyIdFilter(req.params.id), req.getAccessFilter("employees"))).select("-__v");
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found or access denied" });
    return res.status(200).json({ success: true, message: "Employee deleted successfully", data: employee });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to delete employee" });
  }
});

module.exports = router;
