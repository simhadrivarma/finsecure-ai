const express = require("express");
const AdminTransaction = require("../models/AdminTransaction");

console.log("✅ STRICT ADMIN TRANSACTION ROUTES LOADED");

const router = express.Router();

const generateTransactionId = () => {
  return `TRN${Date.now()}`;
};

const moneyToNumber = (value: any) => {
  const clean = String(value || "")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .trim();

  if (clean === "") return 0;

  const numberValue = Number(clean);
  return Number.isNaN(numberValue) ? NaN : numberValue;
};

const cleanMoney = (value: any) => {
  const numberValue = moneyToNumber(value);

  if (Number.isNaN(numberValue)) {
    return value;
  }

  return `₹${numberValue.toLocaleString("en-IN")}`;
};

const getErrorMessage = (error: any) => {
  if (error?.name === "ValidationError") {
    const firstError = Object.values(error.errors || {})[0] as any;
    return firstError?.message || "Validation failed";
  }

  if (error?.code === 11000) {
    return "Duplicate transaction data found";
  }

  return error?.message || "Something went wrong";
};

const isValidDate = (value: any) => {
  if (!String(value || "").trim()) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const isValidTime = (value: any) => {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || "").trim());
};

const calculateRisk = (transaction: any) => {
  const amount = moneyToNumber(transaction.amount);
  const status = String(transaction.status || "Success");
  const type = String(transaction.type || "");
  const time = String(transaction.time || "");
  const reasons: string[] = [];
  let score = 0;

  if (amount >= 1000000) {
    score += 45;
    reasons.push("Very high transaction amount");
  } else if (amount >= 500000) {
    score += 30;
    reasons.push("High transaction amount");
  } else if (amount >= 100000) {
    score += 15;
    reasons.push("Large transaction amount");
  }

  if (status === "Flagged") {
    score += 40;
    reasons.push("Transaction status is flagged");
  }

  if (status === "Failed") {
    score += 25;
    reasons.push("Transaction failed");
  }

  if (["RTGS", "IMPS"].includes(type) && amount >= 500000) {
    score += 15;
    reasons.push("High-value fast transfer method");
  }

  if (isValidTime(time)) {
    const hour = Number(time.split(":")[0]);

    if (hour >= 22 || hour < 5) {
      score += 20;
      reasons.push("Transaction happened during unusual night hours");
    }
  }

  if (score > 100) {
    score = 100;
  }

  let risk = "Normal";

  if (score >= 70) {
    risk = "High";
  } else if (score >= 40) {
    risk = "Medium";
  } else if (score >= 15) {
    risk = "Low";
  }

  if (reasons.length === 0) {
    reasons.push("No major risk detected");
  }

  return {
    risk,
    riskScore: score,
    riskReasons: reasons,
  };
};

const validateTransaction = (body: any, isEdit = false) => {
  const customer = body.customer;
  const accountNumber = body.accountNumber;
  const type = body.type;
  const amount = body.amount;
  const date = body.date;
  const time = body.time;
  const status = body.status;
  const risk = body.risk;

  if (!isEdit || customer !== undefined) {
    if (!String(customer || "").trim()) {
      return "Customer name is required";
    }
  }

  if (!isEdit || accountNumber !== undefined) {
    const digits = String(accountNumber || "").replace(/\D/g, "");

    if (!digits) {
      return "Account number is required";
    }

    if (digits.length < 9 || digits.length > 18) {
      return "Account number must be 9 to 18 digits";
    }
  }

  if (!isEdit || type !== undefined) {
    if (!String(type || "").trim()) {
      return "Transaction type is required";
    }
  }

  if (!isEdit || amount !== undefined) {
    const numberValue = moneyToNumber(amount);

    if (Number.isNaN(numberValue)) {
      return "Amount must be a valid number";
    }

    if (numberValue <= 0) {
      return "Amount must be greater than 0";
    }
  }

  if (!isEdit || date !== undefined) {
    if (!isValidDate(date)) {
      return "Transaction date is required";
    }
  }

  if (!isEdit || time !== undefined) {
    if (!isValidTime(time)) {
      return "Transaction time must be in HH:MM format";
    }
  }

  if (status !== undefined) {
    const allowedStatus = ["Success", "Pending", "Failed", "Flagged"];

    if (!allowedStatus.includes(status)) {
      return "Invalid transaction status";
    }
  }

  if (risk !== undefined) {
    const allowedRisk = ["Normal", "Low", "Medium", "High"];

    if (!allowedRisk.includes(risk)) {
      return "Invalid transaction risk";
    }
  }

  return "";
};

const normalizeTransactionPayload = (body: any) => {
  const payload: any = { ...body };

  if (payload.customer !== undefined) {
    payload.customer = String(payload.customer || "").trim();
  }

  if (payload.accountNumber !== undefined) {
    payload.accountNumber = String(payload.accountNumber || "").replace(
      /\D/g,
      ""
    );
  }

  if (payload.amount !== undefined) {
    payload.amount = cleanMoney(payload.amount);
  }

  if (payload.ref !== undefined) {
    payload.ref = String(payload.ref || "").trim();
  }

  return payload;
};

router.get("/", async (req: any, res: any) => {
  try {
    const transactions = await AdminTransaction.find({})
      .select("-_id -__v")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
      error: getErrorMessage(error),
    });
  }
});

router.post("/", async (req: any, res: any) => {
  try {
    const validationError = validateTransaction(req.body, false);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const payload = normalizeTransactionPayload(req.body);
    const aiRisk = calculateRisk(payload);

    const transaction = await AdminTransaction.create({
      id: generateTransactionId(),
      customer: payload.customer,
      accountNumber: payload.accountNumber,
      type: payload.type,
      amount: payload.amount,
      date: payload.date,
      time: payload.time,
      ref: payload.ref || "",
      status: payload.status || "Success",
      risk: aiRisk.risk,
      riskScore: aiRisk.riskScore,
      riskReasons: aiRisk.riskReasons,
    });

    const savedTransaction = await AdminTransaction.findOne({
      id: transaction.id,
    })
      .select("-_id -__v")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: savedTransaction,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
      error: getErrorMessage(error),
    });
  }
});

router.put("/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const existingTransaction = await AdminTransaction.findOne({ id });

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const validationError = validateTransaction(req.body, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const updateData = normalizeTransactionPayload(req.body);

    const riskBase = {
      ...existingTransaction.toObject(),
      ...updateData,
    };

    const aiRisk = calculateRisk(riskBase);

    updateData.risk = aiRisk.risk;
    updateData.riskScore = aiRisk.riskScore;
    updateData.riskReasons = aiRisk.riskReasons;

    const transaction = await AdminTransaction.findOneAndUpdate(
      { id },
      updateData,
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    )
      .select("-_id -__v")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      data: transaction,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
      error: getErrorMessage(error),
    });
  }
});

router.delete("/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const transaction = await AdminTransaction.findOneAndDelete({ id })
      .select("-_id -__v")
      .lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
      data: transaction,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete transaction",
      error: getErrorMessage(error),
    });
  }
});

module.exports = router;