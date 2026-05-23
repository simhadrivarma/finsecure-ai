const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

let User: any;
let Admin: any;

try {
  User = require("../models/User");
} catch {
  try {
    User = require("../models/user.model");
  } catch {
    User = null;
  }
}

try {
  Admin = require("../models/Admin");
} catch {
  Admin = null;
}

const JWT_SECRET = process.env.JWT_SECRET || "finsecure_ai_secret_key";

const createToken = (user: any) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role || "customer",
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const cleanUser = (user: any) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
};

/* CUSTOMER / USER REGISTER */
router.post("/register", async (req: any, res: any) => {
  try {
    if (!User) {
      return res.status(500).json({
        success: false,
        message: "User model not found. Please check backend/src/models/User.ts",
      });
    }

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
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Account already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "customer",
      phone: phone || "",
      aadhaarNumber: aadhaarNumber || "",
      panNumber: panNumber ? String(panNumber).toUpperCase() : "",
    });

    const token = createToken(user);
    const safeUser = cleanUser(user);

    return res.status(201).json({
      success: true,
      message: "Registered successfully",
      user: safeUser,
      data: safeUser,
      token,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
});

/* LOGIN FOR CUSTOMER + ADMIN */
router.post("/login", async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    let account = null;
    let accountType = "customer";

    if (User) {
      account = await User.findOne({ email: normalizedEmail });
      accountType = account?.role || "customer";
    }

    if (!account && Admin) {
      account = await Admin.findOne({ email: normalizedEmail });
      accountType = account?.role || "admin";
    }

    if (!account) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, account.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const safeUser = {
      ...cleanUser(account),
      role: account.role || accountType,
    };

    const token = createToken(safeUser);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: safeUser,
      data: safeUser,
      token,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
});

module.exports = router;