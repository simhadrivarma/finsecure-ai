const User = require("../models/user.model");
const Transaction = require("../models/transaction.model");

const getCustomerDetails = async (req: any, res: any) => {
  try {
    const users = await User.find({ role: "customer" }).select("-password");

    const data = await Promise.all(
      users.map(async (user: any) => {
        const transactions = await Transaction.find({ user: user._id });

        const totalIncome = transactions
          .filter((t: any) => t.type === "income")
          .reduce((sum: number, t: any) => sum + t.amount, 0);

        const totalExpense = transactions
          .filter((t: any) => t.type === "expense")
          .reduce((sum: number, t: any) => sum + t.amount, 0);

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          transactionsCount: transactions.length,
        };
      })
    );

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching customer details" });
  }
};

module.exports = {
  getCustomerDetails,
};