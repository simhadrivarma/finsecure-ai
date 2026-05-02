const Transaction = require("../models/transaction.model");

exports.getDashboard = async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const transactions = await Transaction.find({ userId });

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t: any) => {
      if (t.type === "income") totalIncome += t.amount;
      else totalExpense += t.amount;
    });

    const balance = totalIncome - totalExpense;

    res.json({
      totalIncome,
      totalExpense,
      balance,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};