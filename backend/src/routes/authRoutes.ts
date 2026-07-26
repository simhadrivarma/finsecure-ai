// @ts-nocheck

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

let User: any = null;
let Customer: any = null;
let Admin: any = null;

/* LOAD USER MODEL */
try {
  User = require("../models/User");
} catch {
  try {
    User = require("../models/user.model");
  } catch {
    User = null;
  }
}

/* LOAD CUSTOMER MODEL */
try {
  Customer = require("../models/Customer");
} catch {
  Customer = null;
}

/* LOAD ADMIN MODEL */
try {
  Admin = require("../models/Admin");
} catch {
  Admin = null;
}

/* JWT SECRET */
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  return secret;
};

/* GENERATE CUSTOMER ACCOUNT NUMBER */
const generateAccountNumber = () => {
  const timePart = Date.now().toString().slice(-10);
  const randomPart = Math.floor(1000 + Math.random() * 9000);

  return `FS${timePart}${randomPart}`;
};

/* GENERATE CIF NUMBER */
const generateCif = () => {
  const timePart = Date.now().toString().slice(-8);
  const randomPart = Math.floor(10 + Math.random() * 90);

  return `CIF${timePart}${randomPart}`;
};

/* CREATE JWT TOKEN */
const createToken = (user: any) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role || "customer",
    },
    getJwtSecret(),
    {
      expiresIn: "7d",
    }
  );
};

/* REMOVE PASSWORD FROM RESPONSE */
const cleanUser = (user: any) => {
  const object = user?.toObject
    ? user.toObject()
    : { ...(user || {}) };

  delete object.password;

  return object;
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

    const normalizedEmail = String(email)
      .toLowerCase()
      .trim();

    let existingUser = null;
    let existingCustomer = null;

    if (User) {
      existingUser = await User.findOne({
        email: normalizedEmail,
      });
    }

    if (Customer) {
      existingCustomer = await Customer.findOne({
        email: normalizedEmail,
      });
    }

    if (existingUser || existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Account already exists with this email",
      });
    }

    if (!User && !Customer) {
      return res.status(500).json({
        success: false,
        message: "Customer database models are unavailable",
      });
    }

    const hashedPassword = await bcrypt.hash(
      String(password),
      10
    );

    /*
      Create these values only once so the User and Customer
      collections receive exactly the same account details.
    */
    const accountNumber = generateAccountNumber();
    const cifNumber = generateCif();
    const customerRole = role || "customer";

    let createdUser = null;
    let createdCustomer = null;

    if (User) {
      createdUser = await User.create({
        name: String(name).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: customerRole,
        accountNumber,
        phone: phone || "",
        aadhaarNumber: aadhaarNumber || "",
        panNumber: panNumber
          ? String(panNumber).toUpperCase()
          : "",
      });
    }

    if (Customer) {
      createdCustomer = await Customer.create({
        id: `CUS${Date.now()}`,
        name: String(name).trim(),
        customerName: String(name).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: customerRole,

        phone: phone || "",
        phoneNumber: phone || "",

        aadhaarNumber: aadhaarNumber || "",

        panNumber: panNumber
          ? String(panNumber).toUpperCase()
          : "",

        accountNumber,
        accountType: "Savings Account",

        ifsc: "FINS0001001",
        ifscCode: "FINS0001001",

        cif: cifNumber,
        cifNumber,

        balance: 0,
        totalIncome: 0,
        totalExpense: 0,

        branch: "Main Branch",
        kyc: "Pending",
        status: "Active",
      });
    }

    const finalUser =
      createdUser ||
      createdCustomer || {
        _id: Date.now().toString(),
        id: `CUS${Date.now()}`,
        name: String(name).trim(),
        customerName: String(name).trim(),
        email: normalizedEmail,
        role: customerRole,
        accountNumber,
        accountType: "Savings Account",
        phone: phone || "",
        aadhaarNumber: aadhaarNumber || "",
        panNumber: panNumber
          ? String(panNumber).toUpperCase()
          : "",
      };

    const safeUser = cleanUser(finalUser);

    /*
      Make sure account details are included in the registration
      response even when the primary response comes from User.
    */
    safeUser.accountNumber =
      safeUser.accountNumber || accountNumber;

    safeUser.accountType =
      safeUser.accountType || "Savings Account";

    safeUser.ifsc =
      safeUser.ifsc || "FINS0001001";

    safeUser.ifscCode =
      safeUser.ifscCode || "FINS0001001";

    safeUser.cif =
      safeUser.cif || cifNumber;

    safeUser.cifNumber =
      safeUser.cifNumber || cifNumber;

    safeUser.balance =
      Number(safeUser.balance || 0);

    safeUser.totalIncome =
      Number(safeUser.totalIncome || 0);

    safeUser.totalExpense =
      Number(safeUser.totalExpense || 0);

    const token = createToken(safeUser);

    return res.status(201).json({
      success: true,
      message: "Registered successfully",
      user: safeUser,
      data: safeUser,
      token,
    });
  } catch (error: any) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Registration failed",
    });
  }
});

/* ADMIN AND CUSTOMER LOGIN */
router.post("/login", async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = String(email)
      .toLowerCase()
      .trim();

    let account = null;
    let accountType = "customer";
    let customerRecord = null;

    /*
      Search the User collection first.
    */
    if (User) {
      account = await User.findOne({
        email: normalizedEmail,
      }).select("+password");

      if (account) {
        accountType =
          account.role || "customer";
      }
    }

    /*
      Load the Customer record as well because it may contain
      banking details such as account number, CIF and balance.
    */
    if (Customer) {
      customerRecord = await Customer.findOne({
        email: normalizedEmail,
      }).select("+password");

      if (!account && customerRecord) {
        account = customerRecord;
        accountType = "customer";
      }
    }

    /*
      Search Admin only when no customer/user account was found.
    */
    if (!account && Admin) {
      account = await Admin.findOne({
        email: normalizedEmail,
      }).select("+password");

      if (account) {
        accountType =
          account.role || "admin";
      }
    }

    if (!account || !account.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect =
      await bcrypt.compare(
        String(password),
        account.password
      );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const normalizedRole = String(
      account.role || accountType
    ).toLowerCase();

    /*
      Fix missing account numbers for existing customer accounts.
    */
    if (normalizedRole === "customer") {
      const existingAccountNumber =
        account.accountNumber ||
        customerRecord?.accountNumber ||
        "";

      const accountNumber =
        existingAccountNumber ||
        generateAccountNumber();

      /*
        Save the account number in the account used for login.
      */
      if (!account.accountNumber) {
        account.accountNumber = accountNumber;
        await account.save();
      }

      /*
        Save the same account number in the Customer collection.
      */
      if (Customer) {
        if (!customerRecord) {
          const generatedCif = generateCif();

          customerRecord = await Customer.create({
            id: `CUS${Date.now()}`,
            name:
              account.name ||
              account.customerName ||
              "Customer",
            customerName:
              account.customerName ||
              account.name ||
              "Customer",
            email: normalizedEmail,
            password: account.password,
            role: "customer",

            phone: account.phone || "",
            phoneNumber:
              account.phoneNumber ||
              account.phone ||
              "",

            aadhaarNumber:
              account.aadhaarNumber || "",

            panNumber:
              account.panNumber || "",

            accountNumber,
            accountType: "Savings Account",

            ifsc: "FINS0001001",
            ifscCode: "FINS0001001",

            cif: generatedCif,
            cifNumber: generatedCif,

            balance: 0,
            totalIncome: 0,
            totalExpense: 0,

            branch: "Main Branch",
            kyc: "Pending",
            status: "Active",
          });
        } else if (!customerRecord.accountNumber) {
          customerRecord.accountNumber =
            accountNumber;

          await customerRecord.save();
        }
      }
    }

    /*
      Build the response by combining User login details
      with Customer banking details.
    */
    const cleanedAccount = cleanUser(account);
    const cleanedCustomer = customerRecord
      ? cleanUser(customerRecord)
      : {};

    const safeUser = {
      ...cleanedCustomer,
      ...cleanedAccount,

      role:
        cleanedAccount.role ||
        cleanedCustomer.role ||
        accountType,

      accountNumber:
        cleanedAccount.accountNumber ||
        cleanedCustomer.accountNumber ||
        "",

      accountType:
        cleanedCustomer.accountType ||
        cleanedAccount.accountType ||
        "Savings Account",

      ifsc:
        cleanedCustomer.ifsc ||
        cleanedCustomer.ifscCode ||
        cleanedAccount.ifsc ||
        cleanedAccount.ifscCode ||
        "FINS0001001",

      ifscCode:
        cleanedCustomer.ifscCode ||
        cleanedCustomer.ifsc ||
        cleanedAccount.ifscCode ||
        cleanedAccount.ifsc ||
        "FINS0001001",

      cif:
        cleanedCustomer.cif ||
        cleanedCustomer.cifNumber ||
        cleanedAccount.cif ||
        cleanedAccount.cifNumber ||
        "",

      cifNumber:
        cleanedCustomer.cifNumber ||
        cleanedCustomer.cif ||
        cleanedAccount.cifNumber ||
        cleanedAccount.cif ||
        "",

      balance: Number(
        cleanedCustomer.balance ??
          cleanedAccount.balance ??
          0
      ),

      totalIncome: Number(
        cleanedCustomer.totalIncome ??
          cleanedAccount.totalIncome ??
          0
      ),

      totalExpense: Number(
        cleanedCustomer.totalExpense ??
          cleanedAccount.totalExpense ??
          0
      ),
    };

    delete safeUser.password;

    const token = createToken(safeUser);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: safeUser,
      data: safeUser,
      token,
    });
  } catch (error: any) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Login failed",
    });
  }
});

module.exports = router;