const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

let User: any = null;
let Customer: any = null;
let Admin: any = null;

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
  Customer = require("../models/Customer");
} catch {
  Customer = null;
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

const generateAccountNumber = () => {
  return String(Date.now()).slice(-10) + Math.floor(Math.random() * 1000);
};

const generateCif = () => {
  return `CIF${Date.now().toString().slice(-8)}`;
};

/* CUSTOMER REGISTER */
router.post("/register", async (req: any, res: any) => {
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

    let existingUser = null;
    let existingCustomer = null;

    if (User) {
      existingUser = await User.findOne({ email: normalizedEmail }).select(
        "+password"
      );
    }

    if (Customer) {
      existingCustomer = await Customer.findOne({
        email: normalizedEmail,
      }).select("+password");
    }

    if (existingUser || existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Account already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let createdUser = null;

    if (User) {
      createdUser = await User.create({
        name: String(name).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: role || "customer",
        phone: phone || "",
        aadhaarNumber: aadhaarNumber || "",
        panNumber: panNumber ? String(panNumber).toUpperCase() : "",
      });
    }

    if (Customer) {
      await Customer.create({
        id: `CUS${Date.now()}`,
        name: String(name).trim(),
        customerName: String(name).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: role || "customer",
        phone: phone || "",
        phoneNumber: phone || "",
        aadhaarNumber: aadhaarNumber || "",
        panNumber: panNumber ? String(panNumber).toUpperCase() : "",
        accountNumber: generateAccountNumber(),
        accountType: "Savings Account",
        ifsc: "FINS0001001",
        ifscCode: "FINS0001001",
        cif: generateCif(),
        cifNumber: generateCif(),
        balance: 0,
        totalIncome: 0,
        totalExpense: 0,
        branch: "Main Branch",
        kyc: "Pending",
        status: "Active",
      });
    }

    const finalUser =
      createdUser || {
        _id: Date.now().toString(),
        name,
        email: normalizedEmail,
        role: role || "customer",
        phone,
        aadhaarNumber,
        panNumber,
      };

    const token = createToken(finalUser);
    const safeUser = cleanUser(finalUser);

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

/* ADMIN + CUSTOMER LOGIN */
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
      account = await User.findOne({ email: normalizedEmail }).select(
        "+password"
      );

      if (account) {
        accountType = account.role || "customer";
      }
    }

    if (!account && Customer) {
      account = await Customer.findOne({ email: normalizedEmail }).select(
        "+password"
      );

      if (account) {
        accountType = "customer";
      }
    }

    if (!account && Admin) {
      account = await Admin.findOne({ email: normalizedEmail }).select(
        "+password"
      );

      if (account) {
        accountType = account.role || "admin";
      }
    }

    if (!account || !account.password) {
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