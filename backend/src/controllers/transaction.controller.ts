const Transaction = require("../models/transaction.model");

const getTransactions = async (req: any, res: any) => {
  try {
    const transactions = await Transaction.find({
      user: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching transactions" });
  }
};

const addTransaction = async (req: any, res: any) => {
  try {
    const { amount, type, category, description } = req.body;

    const transaction = await Transaction.create({
      user: req.user.id,
      amount,
      type,
      category,
      description,
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: "Error adding transaction" });
  }
};

const deleteTransaction = async (req: any, res: any) => {
  try {
    await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    res.json({ message: "Transaction deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting transaction" });
  }
};

module.exports = {
  getTransactions,
  addTransaction,
  deleteTransaction,
};