// @ts-nocheck
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET || "secret",
    {
      expiresIn: "7d",
    }
  );
};

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

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      aadhaarNumber,
      panNumber,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    if (!phone) {
      return res.status(400).json({
        message: "Phone number is required",
      });
    }

    if (!aadhaarNumber) {
      return res.status(400).json({
        message: "Aadhaar card number is required",
      });
    }

    if (!panNumber) {
      return res.status(400).json({
        message: "PAN card number is required",
      });
    }

    const existingUser = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: hashedPassword,
      role: role || "customer",
      phone: String(phone).trim(),
      aadhaarNumber: String(aadhaarNumber).trim(),
      panNumber: String(panNumber).toUpperCase().trim(),
    });

    const token = createToken(user);

    res.status(201).json({
      message: "Registration successful",
      token,
      user: cleanUser(user),
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      message: "Registration failed",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = createToken(user);

    res.json({
      message: "Login successful",
      token,
      user: cleanUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed",
    });
  }
});

module.exports = router;