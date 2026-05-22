const express = require("express");
const Transaction = require("../models/Transaction");
const calculateTransactionRisk = require("../utils/riskScoring");

const router = express.Router();

const generateTransactionId = () => {
  return `TXN${Date.now()}`;
};

router.get("/", async (req: any, res: any) => {
  try {
    const transactions = await Transaction.find({})
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
      error: error.message,
    });
  }
});

router.post("/", async (req: any, res: any) => {
  try {
    const {
      customer,
      accountNumber,
      type,
      amount,
      date,
      time,
      ref,
      status,
    } = req.body;

    if (!customer || !accountNumber || !type || !amount || !date || !time) {
      return res.status(400).json({
        success: false,
        message:
          "Customer, account number, type, amount, date and time are required",
      });
    }

    const aiRisk = calculateTransactionRisk({
      customer,
      accountNumber,
      type,
      amount,
      date,
      time,
      ref,
      status,
    });

    const transaction = await Transaction.create({
      id: generateTransactionId(),
      customer,
      accountNumber,
      type,
      amount,
      date,
      time,
      ref: ref || "",
      status: status || "Success",
      risk: aiRisk.risk,
      riskScore: aiRisk.riskScore,
      riskReasons: aiRisk.riskReasons,
    });

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully with AI risk score",
      data: {
        id: transaction.id,
        customer: transaction.customer,
        accountNumber: transaction.accountNumber,
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date,
        time: transaction.time,
        ref: transaction.ref,
        status: transaction.status,
        risk: transaction.risk,
        riskScore: transaction.riskScore,
        riskReasons: transaction.riskReasons,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to create transaction",
      error: error.message,
    });
  }
});

router.put("/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const existingTransaction = await Transaction.findOne({ id });

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const updatedData = {
      customer: req.body.customer ?? existingTransaction.customer,
      accountNumber:
        req.body.accountNumber ?? existingTransaction.accountNumber,
      type: req.body.type ?? existingTransaction.type,
      amount: req.body.amount ?? existingTransaction.amount,
      date: req.body.date ?? existingTransaction.date,
      time: req.body.time ?? existingTransaction.time,
      ref: req.body.ref ?? existingTransaction.ref,
      status: req.body.status ?? existingTransaction.status,
    };

    const aiRisk = calculateTransactionRisk(updatedData);

    const transaction = await Transaction.findOneAndUpdate(
      { id },
      {
        ...updatedData,
        risk: aiRisk.risk,
        riskScore: aiRisk.riskScore,
        riskReasons: aiRisk.riskReasons,
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .select("-_id -__v")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Transaction updated successfully with AI risk score",
      data: transaction,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to update transaction",
      error: error.message,
    });
  }
});

router.delete("/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOneAndDelete({ id })
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
      error: error.message,
    });
  }
});

module.exports = router;