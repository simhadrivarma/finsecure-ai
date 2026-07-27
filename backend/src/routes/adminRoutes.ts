// @ts-nocheck

const express = require("express");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const Employee = require("../models/Employee");
const Branch = require("../models/Branch");
const auth = require("../middleware/authMiddleware");

const router = express.Router();
const protectAdmin = auth.protectAdmin || auth;
const requirePermission = auth.requirePermission;

const generateAdminId = () => `ADM${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

const cleanAdmin = (admin: any) => {
  const obj = admin?.toObject ? admin.toObject() : { ...(admin || {}) };
  delete obj.password;
  delete obj.__v;
  return obj;
};

const findByAnyId = (id: string) => ({
  $or: [{ id }, { adminId: id }, { employeeId: id }, ...(require("mongoose").Types.ObjectId.isValid(id) ? [{ _id: id }] : [])],
});

router.use(protectAdmin);
router.use(requirePermission("admins", "read"));

router.get("/", async (_req: any, res: any) => {
  try {
    const admins = await Admin.find({}).select("-password -__v").sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, count: admins.length, data: admins });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch admins" });
  }
});

router.post("/", requirePermission("admins", "create"), async (req: any, res: any) => {
  try {
    const { employeeId, name, email, password, role, branch, branchName, branchId, branchCode, ifsc, ifscCode, status } = req.body || {};

    if (!employeeId || !password || !role) {
      return res.status(400).json({ success: false, message: "Employee ID, password and role are required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const employee = await Employee.findOne({ $or: [{ id: employeeId }, { employeeId }] }).lean();
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee ID was not found. Create the employee first." });
    }

    const selectedBranchName = branch || branchName || employee.branch || employee.branchName || "";
    const selectedIfsc = String(ifsc || ifscCode || employee.ifsc || employee.ifscCode || "").toUpperCase().trim();
    const branchRecord = selectedIfsc
      ? await Branch.findOne({ $or: [{ ifsc: selectedIfsc }, { ifscCode: selectedIfsc }] }).lean()
      : await Branch.findOne({ $or: [{ name: selectedBranchName }, { branchName: selectedBranchName }] }).lean();

    const finalEmail = String(email || employee.email || "").toLowerCase().trim();
    const finalName = String(name || employee.name || "").trim();

    if (!finalName || !finalEmail || !selectedBranchName || !selectedIfsc) {
      return res.status(400).json({ success: false, message: "Name, email, branch and IFSC are required" });
    }

    const duplicate = await Admin.findOne({ $or: [{ email: finalEmail }, { employeeId }] }).lean();
    if (duplicate) {
      return res.status(409).json({ success: false, message: "An admin login already exists for this employee or email" });
    }

    const id = generateAdminId();
    const admin = await Admin.create({
      id,
      adminId: id,
      employeeId: employee.employeeId || employee.id || employeeId,
      name: finalName,
      email: finalEmail,
      password: await bcrypt.hash(String(password), 10),
      role,
      branch: selectedBranchName,
      branchName: selectedBranchName,
      assignedBranch: selectedBranchName,
      branchId: branchId || branchRecord?.branchId || branchRecord?.id || employee.branchId || "",
      branchCode: branchCode || branchRecord?.branchCode || branchRecord?.code || employee.branchCode || "",
      ifsc: selectedIfsc,
      ifscCode: selectedIfsc,
      status: status || "Active",
    });

    return res.status(201).json({ success: true, message: "Admin login created successfully", data: cleanAdmin(admin) });
  } catch (error: any) {
    const message = error?.code === 11000 ? "Admin email or employee ID already exists" : error.message;
    return res.status(400).json({ success: false, message: message || "Failed to create admin" });
  }
});

router.put("/:id", requirePermission("admins", "update"), async (req: any, res: any) => {
  try {
    const update: any = {};
    const allowed = ["employeeId", "name", "email", "role", "branch", "branchName", "assignedBranch", "branchId", "branchCode", "ifsc", "ifscCode", "status"];
    allowed.forEach((field) => {
      if (req.body?.[field] !== undefined) update[field] = req.body[field];
    });

    if (update.email) update.email = String(update.email).toLowerCase().trim();
    if (update.ifsc) update.ifsc = String(update.ifsc).toUpperCase().trim();
    if (update.ifscCode) update.ifscCode = String(update.ifscCode).toUpperCase().trim();
    if (req.body?.password) {
      if (String(req.body.password).length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
      }
      update.password = await bcrypt.hash(String(req.body.password), 10);
    }

    const admin = await Admin.findOneAndUpdate(findByAnyId(req.params.id), update, { new: true, runValidators: true }).select("-password -__v");
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

    return res.status(200).json({ success: true, message: "Admin updated successfully", data: admin });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to update admin" });
  }
});

router.delete("/:id", requirePermission("admins", "delete"), async (req: any, res: any) => {
  try {
    const target = await Admin.findOne(findByAnyId(req.params.id)).lean();
    if (!target) return res.status(404).json({ success: false, message: "Admin not found" });

    if (String(target.id) === String(req.admin.id)) {
      return res.status(400).json({ success: false, message: "You cannot delete your own active admin account" });
    }

    await Admin.deleteOne({ _id: target._id });
    return res.status(200).json({ success: true, message: "Admin deleted successfully", data: cleanAdmin(target) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to delete admin" });
  }
});

module.exports = router;
