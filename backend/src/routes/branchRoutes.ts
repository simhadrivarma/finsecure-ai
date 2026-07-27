// @ts-nocheck

const express = require("express");
const mongoose = require("mongoose");
const Branch = require("../models/Branch");
const auth = require("../middleware/authMiddleware");

const router = express.Router();
const protectAdmin = auth.protectAdmin || auth;
const requirePermission = auth.requirePermission;
const mergeFilters = auth.mergeFilters;

const generateBranchId = () => `BRN${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

const anyIdFilter = (id: string) => ({
  $or: [
    { id },
    { branchId: id },
    { ifsc: String(id).toUpperCase() },
    { ifscCode: String(id).toUpperCase() },
    { name: id },
    { branchName: id },
    ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
  ],
});

const cleanPayload = (body: any) => {
  const payload: any = {};
  const allowed = [
    "name",
    "branchName",
    "code",
    "branchCode",
    "address",
    "location",
    "ifsc",
    "ifscCode",
    "manager",
    "managerName",
    "managerId",
    "managerEmail",
    "employees",
    "customers",
    "balance",
    "loans",
    "status",
  ];
  allowed.forEach((field) => {
    if (body?.[field] !== undefined) payload[field] = body[field];
  });
  if (payload.name !== undefined) payload.name = String(payload.name).trim();
  if (payload.branchName !== undefined) payload.branchName = String(payload.branchName).trim();
  if (payload.address !== undefined) payload.address = String(payload.address).trim();
  if (payload.ifsc !== undefined) payload.ifsc = String(payload.ifsc).toUpperCase().trim();
  if (payload.ifscCode !== undefined) payload.ifscCode = String(payload.ifscCode).toUpperCase().trim();
  if (payload.manager !== undefined) payload.manager = String(payload.manager).trim();
  if (payload.employees !== undefined) payload.employees = Number(payload.employees || 0);
  if (payload.customers !== undefined) payload.customers = Number(payload.customers || 0);
  return payload;
};

router.use(protectAdmin);

router.get("/", requirePermission("branches", "read"), async (req: any, res: any) => {
  try {
    const access = req.getAccessFilter("branches");
    const branches = await Branch.find(access).select("-__v").sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, count: branches.length, data: branches });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch branches" });
  }
});

router.get("/:id", requirePermission("branches", "read"), async (req: any, res: any) => {
  try {
    const branch = await Branch.findOne(mergeFilters(anyIdFilter(req.params.id), req.getAccessFilter("branches"))).select("-__v").lean();
    if (!branch) return res.status(404).json({ success: false, message: "Branch not found or access denied" });
    return res.status(200).json({ success: true, data: branch });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch branch" });
  }
});

router.post("/", requirePermission("branches", "create"), async (req: any, res: any) => {
  try {
    const payload = cleanPayload(req.body);
    const name = payload.name || payload.branchName;
    const ifsc = payload.ifsc || payload.ifscCode;
    const manager = payload.manager || payload.managerName;
    if (!name || !payload.address || !ifsc || !manager) {
      return res.status(400).json({ success: false, message: "Branch name, address, IFSC and manager are required" });
    }

    const id = generateBranchId();
    const branch = await Branch.create({
      id,
      branchId: id,
      ...payload,
      name,
      branchName: name,
      ifsc,
      ifscCode: ifsc,
      manager,
      managerName: manager,
      createdBy: req.admin.email || req.admin.name,
      createdByRole: req.admin.role,
    });

    return res.status(201).json({ success: true, message: "Branch created successfully", data: branch });
  } catch (error: any) {
    const message = error?.code === 11000 ? "Branch name or IFSC already exists" : error.message;
    return res.status(400).json({ success: false, message: message || "Failed to create branch" });
  }
});

router.put("/:id", requirePermission("branches", "update"), async (req: any, res: any) => {
  try {
    const filter = mergeFilters(anyIdFilter(req.params.id), req.getAccessFilter("branches"));
    const branch = await Branch.findOneAndUpdate(
      filter,
      { ...cleanPayload(req.body), updatedBy: req.admin.email || req.admin.name },
      { new: true, runValidators: true }
    ).select("-__v");
    if (!branch) return res.status(404).json({ success: false, message: "Branch not found or access denied" });
    return res.status(200).json({ success: true, message: "Branch updated successfully", data: branch });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to update branch" });
  }
});

router.delete("/:id", requirePermission("branches", "delete"), async (req: any, res: any) => {
  try {
    const branch = await Branch.findOneAndDelete(anyIdFilter(req.params.id)).select("-__v");
    if (!branch) return res.status(404).json({ success: false, message: "Branch not found" });
    return res.status(200).json({ success: true, message: "Branch deleted successfully", data: branch });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to delete branch" });
  }
});

module.exports = router;
