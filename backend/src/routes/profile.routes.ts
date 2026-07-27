// @ts-nocheck
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const cleanUser = (user) => {
  return {
    id: user._id,
    name: user.name || "",
    email: user.email || "",
    role: user.role || "customer",
    phone: user.phone || "",
    aadhaarNumber: user.aadhaarNumber || "",
    panNumber: user.panNumber || "",
  };
};

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
};

router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      user: cleanUser(user),
    });
  } catch (error) {
    console.error("Profile load error:", error);

    res.status(500).json({
      message: "Profile loading failed",
    });
  }
});

router.put("/update", protect, async (req, res) => {
  try {
    const { name, email, phone, aadhaarNumber, panNumber } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        name: String(name || "").trim(),
        email: String(email || "").toLowerCase().trim(),
        phone: String(phone || "").trim(),
        aadhaarNumber: String(aadhaarNumber || "").trim(),
        panNumber: String(panNumber || "").toUpperCase().trim(),
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "Profile updated successfully",
      user: cleanUser(user),
    });
  } catch (error) {
    console.error("Profile update error:", error);

    res.status(500).json({
      message: "Profile update failed",
    });
  }
});

router.put("/reset-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "All password fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New password and confirm password do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    res.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Password reset error:", error);

    res.status(500).json({
      message: "Password reset failed",
    });
  }
});

module.exports = router;