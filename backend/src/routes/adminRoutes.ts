const express = require("express");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");

const router = express.Router();

console.log("✅ STRICT ADMIN ROUTES LOADED");

const cleanAdmin = (admin: any) => {
  const obj = admin.toObject ? admin.toObject() : admin;
  delete obj.password;
  return obj;
};

router.get("/", async (req: any, res: any) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 }).select("-password");

    return res.status(200).json({
      success: true,
      data: admins,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch admins",
    });
  }
});

router.post("/", async (req: any, res: any) => {
  try {
    const { name, email, password, role, status } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and role are required",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const existingAdmin = await Admin.findOne({
      email: String(email).toLowerCase().trim(),
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Admin already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      id: `ADM${Date.now()}`,
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: hashedPassword,
      role: String(role).trim(),
      status: status || "Active",
    });

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: cleanAdmin(admin),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create admin",
    });
  }
});

router.put("/:id", async (req: any, res: any) => {
  try {
    const { name, email, password, role, status } = req.body;

    const updateData: any = {};

    if (name) updateData.name = String(name).trim();
    if (email) updateData.email = String(email).toLowerCase().trim();
    if (role) updateData.role = String(role).trim();
    if (status) updateData.status = status;

    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }

      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!updatedAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      data: updatedAdmin,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update admin",
    });
  }
});

router.delete("/:id", async (req: any, res: any) => {
  try {
    const deletedAdmin = await Admin.findByIdAndDelete(req.params.id);

    if (!deletedAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete admin",
    });
  }
});

module.exports = router;