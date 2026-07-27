const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Customer = require("../models/Customer");

const router = express.Router();

console.log("✅ CUSTOMER AUTH ROUTES V2 NO CREATE LOADED");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const generateAccountNumber = () => {
  return String(Math.floor(1000000000 + Math.random() * 9000000000));
};

const generateCIF = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const cleanCustomer = (customer: any) => {
  const obj = customer.toObject ? customer.toObject() : { ...customer };
  delete obj.password;
  return obj;
};

const createToken = (customer: any) => {
  return jwt.sign(
    {
      id: customer._id,
      email: customer.email,
      role: "Customer",
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const customerAuth = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Customer token missing",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);

    const customer = await Customer.findById(decoded.id);

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Customer not found",
      });
    }

    req.customer = customer;
    next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: "Invalid customer token",
    });
  }
};

router.post("/register", async (req: any, res: any) => {
  try {
    const {
      name,
      customerName,
      email,
      phone,
      phoneNumber,
      password,
      confirmPassword,
      accountType,
      aadhaarNumber,
      panNumber,
      branch,
    } = req.body;

    const finalName = String(name || customerName || "").trim();
    const finalEmail = String(email || "").toLowerCase().trim();
    const finalPhone = String(phone || phoneNumber || "").trim();

    if (!finalName || !finalEmail || !finalPhone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone number and password are required",
      });
    }

    if (!/^\d{10}$/.test(finalPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 10 digits",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password do not match",
      });
    }

    const existingCustomer = await Customer.findOne({ email: finalEmail });

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Customer already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const now = new Date();

    const customerDoc = {
      _id: new mongoose.Types.ObjectId(),
      id: `CUS${Date.now()}`,
      name: finalName,
      customerName: finalName,
      email: finalEmail,
      phone: finalPhone,
      phoneNumber: finalPhone,
      password: hashedPassword,
      accountNumber: generateAccountNumber(),
      accountType: accountType || "Savings Account",
      ifsc: "FINS0002004",
      ifscCode: "FINS0002004",
      cif: generateCIF(),
      cifNumber: generateCIF(),
      aadhaarNumber: aadhaarNumber || "",
      panNumber: panNumber || "",
      branch: branch || "Main Branch",
      assignedEmployee: "",
      balance: 0,
      totalIncome: 0,
      totalExpense: 0,
      kyc: "Pending",
      status: "Pending",
      createdAt: now,
      updatedAt: now,
    };

    await Customer.collection.insertOne(customerDoc);

    const token = createToken(customerDoc);

    return res.status(201).json({
      success: true,
      message: "Customer registered successfully. KYC approval is pending.",
      token,
      data: cleanCustomer(customerDoc),
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Customer already exists with this email or account number",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Customer registration failed",
    });
  }
});

router.post("/login", async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    const finalEmail = String(email || "").toLowerCase().trim();

    if (!finalEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const customer = await Customer.findOne({ email: finalEmail }).select(
      "+password"
    );

    if (!customer || !customer.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid customer email or password",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, customer.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid customer email or password",
      });
    }

    if (customer.status === "Suspended" || customer.status === "Inactive") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active. Please contact bank admin.",
      });
    }

    const token = createToken(customer);

    return res.status(200).json({
      success: true,
      message: "Customer login successful",
      token,
      data: cleanCustomer(customer),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Customer login failed",
    });
  }
});

router.get("/me", customerAuth, async (req: any, res: any) => {
  return res.status(200).json({
    success: true,
    data: cleanCustomer(req.customer),
  });
});

router.post("/ai", customerAuth, async (req: any, res: any) => {
  try {
    const { message } = req.body;
    const customer = req.customer;
    const text = String(message || "").toLowerCase();

    let reply =
      "I am your FinSecure AI customer assistant. I can help with your balance, account details, IFSC, CIF, KYC status, income, expense, and saving tips.";

    if (text.includes("balance")) {
      reply = `Your current account balance is ₹${customer.balance || 0}.`;
    } else if (text.includes("account number")) {
      reply = `Your account number is ${customer.accountNumber}.`;
    } else if (text.includes("ifsc")) {
      reply = `Your IFSC code is ${
        customer.ifscCode || customer.ifsc || "Not available"
      }.`;
    } else if (text.includes("cif")) {
      reply = `Your CIF number is ${
        customer.cifNumber || customer.cif || "Not available"
      }.`;
    } else if (text.includes("kyc")) {
      reply = `Your KYC status is ${customer.kyc || "Pending"}.`;
    } else if (text.includes("income")) {
      reply = `Your total income is ₹${customer.totalIncome || 0}.`;
    } else if (text.includes("expense") || text.includes("spend")) {
      reply = `Your total expense is ₹${customer.totalExpense || 0}.`;
    } else if (text.includes("saving") || text.includes("tips")) {
      reply =
        "Saving tip: Try to save at least 20% of your income, track weekly expenses, and avoid unnecessary spending.";
    }

    return res.status(200).json({
      success: true,
      reply,
      data: {
        name: customer.name,
        accountNumber: customer.accountNumber,
        balance: customer.balance,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Customer AI failed",
    });
  }
});

module.exports = router;