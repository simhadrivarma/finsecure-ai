const Transaction = require("../models/transaction.model");

const getDashboard = async (req: any, res: any) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id });

    const totalIncome = transactions
      .filter((t: any) => t.type === "income")
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t: any) => t.type === "expense")
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;

    res.json({
      totalIncome,
      totalExpense,
      balance,
    });
  } catch {
    res.status(500).json({ message: "Error loading dashboard" });
  }
};

module.exports = { getDashboard };