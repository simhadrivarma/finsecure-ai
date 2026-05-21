const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");

const getAdmins = async (req: any, res: any) => {
  try {
    const admins = await Admin.find({})
      .select("-_id -__v -password -createdAt -updatedAt")
      .sort({ id: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admins",
      error: error.message,
    });
  }
};

const createAdmin = async (req: any, res: any) => {
  try {
    const { name, email, password, role, status } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and role are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const existingAdmin = await Admin.findOne({ email: normalizedEmail }).lean();

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
      email: normalizedEmail,
      password: hashedPassword,
      role,
      status: status || "Active",
    });

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
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
      message: "Failed to create admin",
      error: error.message,
    });
  }
};

const updateAdmin = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status } = req.body;

    const admin = await Admin.findOne({ id });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (email && String(email).toLowerCase().trim() !== admin.email) {
      const existingAdmin = await Admin.findOne({
        email: String(email).toLowerCase().trim(),
      }).lean();

      if (existingAdmin) {
        return res.status(409).json({
          success: false,
          message: "Another admin already exists with this email",
        });
      }

      admin.email = String(email).toLowerCase().trim();
    }

    if (name) admin.name = String(name).trim();
    if (role) admin.role = role;
    if (status) admin.status = status;

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }

      admin.password = await bcrypt.hash(password, 10);
    }

    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Admin updated successfully",
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
      message: "Failed to update admin",
      error: error.message,
    });
  }
};

const deleteAdmin = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (req.admin && req.admin.id === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own admin account",
      });
    }

    const admin = await Admin.findOneAndDelete({ id });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
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
      message: "Failed to delete admin",
      error: error.message,
    });
  }
};

module.exports = {
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
};