// @ts-nocheck

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Customer = require("../models/Customer");
const Admin = require("../models/Admin");
const Employee = require("../models/Employee");
const authMiddleware = require("../middleware/authMiddleware");
const protectAdmin = authMiddleware.protectAdmin || authMiddleware;

const router = express.Router();

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return secret;
};

const generateAccountNumber = () =>
  `FS${Date.now().toString().slice(-10)}${Math.floor(1000 + Math.random() * 9000)}`;

const generateCif = () =>
  `CIF${Date.now().toString().slice(-8)}${Math.floor(10 + Math.random() * 90)}`;

const generateCustomerId = () =>
  `CUS${Date.now().toString().slice(-10)}${Math.floor(100 + Math.random() * 900)}`;

const cleanObject = (document: any) => {
  const object = document?.toObject ? document.toObject() : { ...(document || {}) };
  delete object.password;
  delete object.__v;
  return object;
};


const hydrateAdminScope = async (admin: any) => {
  if (!admin) return admin;

  const role = String(admin.role || "").toLowerCase().trim();
  if (["super admin", "superadmin", "admin"].includes(role)) return admin;

  const conditions: any[] = [];
  if (admin.employeeId) {
    conditions.push({ id: admin.employeeId }, { employeeId: admin.employeeId });
  }
  if (admin.email) conditions.push({ email: String(admin.email).toLowerCase() });
  if (!conditions.length) return admin;

  const employee = await Employee.findOne({ $or: conditions }).lean();
  if (!employee) return admin;

  const branch = admin.branch || admin.branchName || employee.branch || employee.branchName || "";
  const ifsc = String(
    admin.ifsc || admin.ifscCode || employee.ifsc || employee.ifscCode || ""
  ).toUpperCase().trim();

  admin.employeeId = admin.employeeId || employee.employeeId || employee.id || "";
  admin.branch = branch;
  admin.branchName = admin.branchName || branch;
  admin.assignedBranch = admin.assignedBranch || branch;
  admin.branchId = admin.branchId || employee.branchId || "";
  admin.branchCode = admin.branchCode || employee.branchCode || "";
  admin.ifsc = ifsc;
  admin.ifscCode = admin.ifscCode || ifsc;
  return admin;
};

const createToken = (user: any) => {
  const payload = {
    id: user._id || user.id,
    adminId: user.adminId || user.id || "",
    employeeId: user.employeeId || "",
    email: user.email,
    role: user.role || "customer",
    branch: user.branch || user.branchName || "",
    branchName: user.branchName || user.branch || "",
    branchId: user.branchId || "",
    branchCode: user.branchCode || "",
    ifsc: user.ifsc || user.ifscCode || "",
    accountNumber: user.accountNumber || "",
  };

  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
};

router.post("/register", async (req: any, res: any) => {
  try {
    const { name, email, password, phone, aadhaarNumber, panNumber } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password are required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await Promise.all([
      User.findOne({ email: normalizedEmail }).lean(),
      Customer.findOne({ email: normalizedEmail }).lean(),
      Admin.findOne({ email: normalizedEmail }).lean(),
    ]);

    if (existing.some(Boolean)) {
      return res.status(409).json({ success: false, message: "Account already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const accountNumber = generateAccountNumber();
    const cif = generateCif();
    const customerId = generateCustomerId();

    const [user, customer] = await Promise.all([
      User.create({
        name: String(name).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "customer",
        accountNumber,
        phone: phone || "",
        aadhaarNumber: aadhaarNumber || "",
        panNumber: panNumber ? String(panNumber).toUpperCase() : "",
      }),
      Customer.create({
        id: customerId,
        customerId,
        name: String(name).trim(),
        customerName: String(name).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "customer",
        phone: phone || "",
        phoneNumber: phone || "",
        aadhaarNumber: aadhaarNumber || "",
        panNumber: panNumber ? String(panNumber).toUpperCase() : "",
        accountNumber,
        accountNo: accountNumber,
        accountType: "Savings Account",
        ifsc: "FINS0001001",
        ifscCode: "FINS0001001",
        cif,
        cifNumber: cif,
        balance: 0,
        branch: "Main Branch",
        branchName: "Main Branch",
        kyc: "Pending",
        status: "Active",
      }),
    ]);

    const safeUser = {
      ...cleanObject(customer),
      ...cleanObject(user),
      id: customerId,
      customerId,
      accountNumber,
      accountType: "Savings Account",
      ifsc: "FINS0001001",
      ifscCode: "FINS0001001",
      cif,
      cifNumber: cif,
      role: "customer",
    };

    return res.status(201).json({
      success: true,
      message: "Registered successfully",
      user: safeUser,
      data: safeUser,
      token: createToken(safeUser),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Registration failed" });
  }
});

router.post("/login", async (req: any, res: any) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    /* Admin/employee access is stored in Admin. */
    const admin = await Admin.findOne({ email: normalizedEmail }).select("+password");

    if (admin) {
      if (String(admin.status || "Active").toLowerCase() !== "active") {
        return res.status(403).json({ success: false, message: "This admin account is inactive" });
      }

      const valid = await bcrypt.compare(String(password), admin.password || "");
      if (!valid) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }

      await hydrateAdminScope(admin);
      admin.lastLoginAt = new Date();
      await admin.save();

      const safeAdmin = cleanObject(admin);
      const token = createToken(safeAdmin);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        user: safeAdmin,
        data: safeAdmin,
        token,
      });
    }

    /* Customer login remains supported for the customer website. */
    let user = await User.findOne({ email: normalizedEmail }).select("+password");
    let customer = await Customer.findOne({ email: normalizedEmail }).select("+password");
    const account = user || customer;

    if (!account || !account.password) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(String(password), account.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    let accountNumber = account.accountNumber || customer?.accountNumber || "";
    if (!accountNumber) accountNumber = generateAccountNumber();

    if (user && !user.accountNumber) {
      user.accountNumber = accountNumber;
      await user.save();
    }

    if (!customer) {
      const cif = generateCif();
      const customerId = generateCustomerId();
      customer = await Customer.create({
        id: customerId,
        customerId,
        name: account.name || "Customer",
        customerName: account.name || "Customer",
        email: normalizedEmail,
        password: account.password,
        role: "customer",
        accountNumber,
        accountNo: accountNumber,
        accountType: "Savings Account",
        ifsc: "FINS0001001",
        ifscCode: "FINS0001001",
        cif,
        cifNumber: cif,
        branch: "Main Branch",
        branchName: "Main Branch",
        balance: 0,
        kyc: "Pending",
        status: "Active",
      });
    } else if (!customer.accountNumber) {
      customer.accountNumber = accountNumber;
      customer.accountNo = accountNumber;
      await customer.save();
    }

    const safeUser = {
      ...cleanObject(user || {}),
      ...cleanObject(customer),
      role: "customer",
      accountNumber,
      balance: Number(customer.balance || 0),
    };

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: safeUser,
      data: safeUser,
      token: createToken(safeUser),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Login failed" });
  }
});

router.get("/profile", protectAdmin, async (req: any, res: any) => {
  return res.status(200).json({ success: true, data: req.admin });
});

router.put("/profile", protectAdmin, async (req: any, res: any) => {
  try {
    const allowed: any = {};
    ["name", "phone"].forEach((field) => {
      if (req.body?.[field] !== undefined) allowed[field] = String(req.body[field]).trim();
    });

    const updated = await Admin.findOneAndUpdate(
      { id: req.admin.id },
      allowed,
      { new: true, runValidators: true }
    ).select("-password -__v");

    if (!updated) {
      return res.status(404).json({ success: false, message: "Admin profile not found" });
    }

    const safeAdmin = cleanObject(updated);
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: safeAdmin,
      token: createToken(safeAdmin),
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Profile update failed" });
  }
});

router.put("/change-password", protectAdmin, async (req: any, res: any) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }
    if (confirmPassword !== undefined && String(newPassword) !== String(confirmPassword)) {
      return res.status(400).json({ success: false, message: "New password and confirmation do not match" });
    }

    const admin = await Admin.findOne({ id: req.admin.id }).select("+password");
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin account not found" });
    }

    const valid = await bcrypt.compare(String(currentPassword), admin.password || "");
    if (!valid) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    admin.password = await bcrypt.hash(String(newPassword), 10);
    await admin.save();

    return res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Password change failed" });
  }
});

module.exports = router;
