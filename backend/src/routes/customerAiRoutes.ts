// @ts-nocheck

const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Customer = require("../models/Customer");
const Transaction = require("../models/Transaction");

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || "finsecure_ai_secret_key";

const cleanText = (value) =>
  String(value ?? "").trim();

const getBearerToken = (req) => {
  const authorization = cleanText(
    req.headers?.authorization
  );

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
};

const protectCustomer = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Customer login token is required.",
      });
    }

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    const role = cleanText(
      decoded?.role
    ).toLowerCase();

    if (role !== "customer") {
      return res.status(403).json({
        success: false,
        message:
          "Only logged-in customers can use Customer AI.",
      });
    }

    const conditions = [];

    const email = cleanText(
      decoded?.email
    ).toLowerCase();

    if (email) {
      conditions.push({ email });
    }

    const id = cleanText(decoded?.id);

    if (id) {
      conditions.push({ id });
      conditions.push({ customerId: id });

      if (mongoose.Types.ObjectId.isValid(id)) {
        conditions.push({
          _id: new mongoose.Types.ObjectId(id),
        });
      }
    }

    if (!conditions.length) {
      return res.status(401).json({
        success: false,
        message:
          "Customer identity is missing from the login token.",
      });
    }

    const customer = await Customer.findOne({
      $or: conditions,
    })
      .select(
        [
          "id",
          "customerId",
          "name",
          "customerName",
          "email",
          "accountNumber",
          "accountType",
          "balance",
          "totalIncome",
          "totalExpense",
          "branch",
          "branchName",
          "ifsc",
          "ifscCode",
          "cif",
          "cifNumber",
          "kyc",
          "status",
        ].join(" ")
      )
      .lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer account was not found.",
      });
    }

    req.customer = customer;
    return next();
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message:
          "Your login session has expired. Please log in again.",
      });
    }

    return res.status(401).json({
      success: false,
      message:
        "Invalid customer login token.",
    });
  }
};

const maskValue = (
  value,
  visibleCharacters = 4
) => {
  const raw = cleanText(value);

  if (!raw) {
    return "-";
  }

  if (raw.length <= visibleCharacters) {
    return raw;
  }

  return `${"*".repeat(
    raw.length - visibleCharacters
  )}${raw.slice(-visibleCharacters)}`;
};

const formatMoney = (value) => {
  return `₹${Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const identifyIntent = (message) => {
  const question = cleanText(
    message
  ).toLowerCase();

  const restrictedWords = [
    "password",
    "otp",
    "one time password",
    "pin",
    "cvv",
    "jwt",
    "token",
    "secret key",
    "full aadhaar",
    "complete aadhaar",
    "full pan",
    "complete pan",
    "full account number",
    "complete account number",
  ];

  if (
    restrictedWords.some((word) =>
      question.includes(word)
    )
  ) {
    return "RESTRICTED";
  }

  if (
    question.includes("balance") ||
    question.includes("available amount") ||
    question.includes("money in my account")
  ) {
    return "BALANCE";
  }

  if (
    question.includes("interest") ||
    question.includes("interest rate")
  ) {
    return "INTEREST";
  }

  if (
    question.includes("transaction") ||
    question.includes("statement") ||
    question.includes("recent payment")
  ) {
    return "TRANSACTIONS";
  }

  if (
    question.includes("kyc") ||
    question.includes("verification")
  ) {
    return "KYC";
  }

  if (
    question.includes("account details") ||
    question.includes("bank details") ||
    question.includes("branch") ||
    question.includes("ifsc") ||
    question.includes("cif") ||
    question.includes("account number")
  ) {
    return "ACCOUNT_DETAILS";
  }

  return "GENERAL";
};

const createAnswer = (
  intent,
  customer,
  transactions
) => {
  const accountNumber = maskValue(
    customer.accountNumber,
    4
  );

  const cif = maskValue(
    customer.cif || customer.cifNumber,
    4
  );

  const accountType =
    customer.accountType ||
    "Savings Account";

  switch (intent) {
    case "RESTRICTED":
      return (
        "For your security, I cannot reveal passwords, OTPs, PINs, " +
        "CVVs, tokens, complete Aadhaar or PAN numbers, or your complete account number."
      );

    case "BALANCE":
      return (
        `Your current balance is ${formatMoney(
          customer.balance
        )} in your ${accountType} ending in ` +
        `${accountNumber.slice(-4)}.`
      );

    case "INTEREST":
      return (
        "The interest rate is not stored in your current account record. " +
        "Please contact your branch for the applicable savings or loan interest rate."
      );

    case "KYC":
      return `Your KYC status is ${
        customer.kyc || "Pending"
      }.`;

    case "ACCOUNT_DETAILS":
      return [
        `Account holder: ${
          customer.name ||
          customer.customerName ||
          "-"
        }`,
        `Account type: ${accountType}`,
        `Account number: ${accountNumber}`,
        `Branch: ${
          customer.branch ||
          customer.branchName ||
          "-"
        }`,
        `IFSC: ${
          customer.ifsc ||
          customer.ifscCode ||
          "-"
        }`,
        `CIF: ${cif}`,
        `KYC status: ${
          customer.kyc || "Pending"
        }`,
        `Account status: ${
          customer.status || "Active"
        }`,
      ].join("\n");

    case "TRANSACTIONS":
      if (!transactions.length) {
        return (
          "No recent transactions were found for your account."
        );
      }

      return [
        "Your five most recent transactions are:",
        ...transactions.map(
          (transaction, index) => {
            const type =
              transaction.type ||
              "Transaction";

            const status =
              transaction.status ||
              "Completed";

            const date =
              transaction.date ||
              (transaction.createdAt
                ? new Date(
                    transaction.createdAt
                  ).toLocaleDateString(
                    "en-IN"
                  )
                : "-");

            return (
              `${index + 1}. ${type} - ` +
              `${formatMoney(
                transaction.amount
              )} - ${status} - ${date}`
            );
          }
        ),
      ].join("\n");

    default:
      return (
        "I can securely help with your balance, masked account details, " +
        "branch, IFSC, CIF, KYC status and recent transactions. " +
        "I will not reveal passwords, OTPs, PINs, CVVs, tokens or complete identity numbers."
      );
  }
};

router.post(
  "/chat",
  protectCustomer,
  async (req, res) => {
    try {
      const message = cleanText(
        req.body?.message
      );

      if (!message) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a banking question.",
        });
      }

      const customer = req.customer;

      const transactionConditions = [];

      if (customer.accountNumber) {
        transactionConditions.push({
          accountNumber:
            customer.accountNumber,
        });
      }

      if (customer.email) {
        transactionConditions.push({
          userEmail: customer.email,
        });
      }

      if (
        customer.id ||
        customer.customerId
      ) {
        transactionConditions.push({
          customerId:
            customer.id ||
            customer.customerId,
        });
      }

      const transactions =
        transactionConditions.length
          ? await Transaction.find({
              $or: transactionConditions,
            })
              .select(
                "type amount status date time description createdAt"
              )
              .sort({
                createdAt: -1,
              })
              .limit(5)
              .lean()
          : [];

      const intent = identifyIntent(
        message
      );

      const answer = createAnswer(
        intent,
        customer,
        transactions
      );

      return res.status(200).json({
        success: true,
        intent,
        answer,
        data: {
          accountHolder:
            customer.name ||
            customer.customerName ||
            "-",

          accountType:
            customer.accountType ||
            "Savings Account",

          accountNumber: maskValue(
            customer.accountNumber,
            4
          ),

          balance: Number(
            customer.balance || 0
          ),

          branch:
            customer.branch ||
            customer.branchName ||
            "-",

          ifsc:
            customer.ifsc ||
            customer.ifscCode ||
            "-",

          cif: maskValue(
            customer.cif ||
            customer.cifNumber,
            4
          ),

          kycStatus:
            customer.kyc ||
            "Pending",

          accountStatus:
            customer.status ||
            "Active",
        },
      });
    } catch (error) {
      console.error(
        "Customer AI chat error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to process the banking question.",
      });
    }
  }
);

module.exports = router;
