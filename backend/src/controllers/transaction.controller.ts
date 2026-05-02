const Transaction = require("../models/transaction.model");

// ➕ Add Transaction
exports.addTransaction = async (req: any, res: any) => {
  try {
    const { amount, type, category, description } = req.body;

    const transaction = new Transaction({
      userId: req.user.id, // from JWT middleware
      amount,
      type,
      category,
      description,
    });

    await transaction.save();

    res.status(201).json({
      message: "Transaction added",
      transaction,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// 📥 Get Transactions
exports.getTransactions = async (req: any, res: any) => {
  try {
    const transactions = await Transaction.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};