const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const protectAdmin = require("../middleware/authMiddleware");

const router = express.Router();

const createToken = (admin: any) => {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    },
    process.env.JWT_SECRET || "finsecure_ai_default_secret",
    {
      expiresIn: "7d",
    }
  );
};

const defaultAdmins = [
  {
    id: "ADM001",
    name: "FinSecure Super Admin",
    email: "admin@finsecure.ai",
    password: "admin123",
    role: "Super Admin",
    status: "Active",
  },
  {
    id: "ADM002",
    name: "Ramesh Branch Manager",
    email: "manager@finsecure.ai",
    password: "manager123",
    role: "Branch Manager",
    status: "Active",
  },
  {
    id: "ADM003",
    name: "Priya Loan Officer",
    email: "loan@finsecure.ai",
    password: "loan123",
    role: "Loan Officer",
    status: "Active",
  },
  {
    id: "ADM004",
    name: "Fraud Analyst",
    email: "fraud@finsecure.ai",
    password: "fraud123",
    role: "Fraud Analyst",
    status: "Active",
  },
  {
    id: "ADM005",
    name: "Customer Support",
    email: "support@finsecure.ai",
    password: "support123",
    role: "Customer Support",
    status: "Active",
  },
  {
    id: "ADM006",
    name: "Report Analyst",
    email: "reports@finsecure.ai",
    password: "reports123",
    role: "Report Analyst",
    status: "Active",
  },
];

const seedDefaultAdmins = async () => {
  for (const adminData of defaultAdmins) {
    const existingAdmin = await Admin.findOne({ email: adminData.email });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminData.password, 10);

      await Admin.create({
        id: adminData.id,
        name: adminData.name,
        email: adminData.email,
        password: hashedPassword,
        role: adminData.role,
        status: adminData.status,
      });
    }
  }
};

router.post("/login", async (req: any, res: any) => {
  try {
    await seedDefaultAdmins();

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const admin = await Admin.findOne({
      email: String(email).toLowerCase().trim(),
    })
      .select("+password")
      .lean();

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (admin.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, admin.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = createToken(admin);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});

router.get("/me", protectAdmin, async (req: any, res: any) => {
  return res.status(200).json({
    success: true,
    message: "Admin profile fetched successfully",
    data: req.admin,
  });
});

router.put("/profile", protectAdmin, async (req: any, res: any) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const existingAdmin = await Admin.findOne({
      email: normalizedEmail,
      id: { $ne: req.admin.id },
    }).lean();

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Another admin already exists with this email",
      });
    }

    const updatedAdmin = await Admin.findOneAndUpdate(
      { id: req.admin.id },
      {
        name: String(name).trim(),
        email: normalizedEmail,
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .select("-_id -__v -password -createdAt -updatedAt")
      .lean();

    if (!updatedAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const token = createToken(updatedAdmin);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      token,
      data: updatedAdmin,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
});

router.put("/change-password", protectAdmin, async (req: any, res: any) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const admin = await Admin.findOne({ id: req.admin.id }).select("+password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      admin.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    admin.password = await bcrypt.hash(newPassword, 10);

    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message,
    });
  }
});

module.exports = router;