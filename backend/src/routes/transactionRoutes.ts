const express = require("express");

const router = express.Router();

const transactions: any[] = [
  {
    id: "TXN001",
    customer: "Ravi Kumar",
    accountNumber: "XXXX XXXX 2101",
    type: "UPI Payment",
    amount: "₹24,500",
    date: "13 May 2026",
    time: "10:42 AM",
    ref: "UPI18382992",
    status: "Success",
    risk: "Normal",
  },
  {
    id: "TXN002",
    customer: "Meena Devi",
    accountNumber: "XXXX XXXX 2102",
    type: "NEFT",
    amount: "₹3,50,000",
    date: "13 May 2026",
    time: "11:12 AM",
    ref: "NEFT773991",
    status: "Flagged",
    risk: "High",
  },
  {
    id: "TXN003",
    customer: "Suresh Babu",
    accountNumber: "XXXX XXXX 2103",
    type: "EMI Payment",
    amount: "₹15,030",
    date: "14 May 2026",
    time: "09:15 AM",
    ref: "EMI998877",
    status: "Success",
    risk: "Normal",
  },
];

const generateTransactionId = () => {
  const maxIdNumber = transactions.reduce((max: number, transaction: any) => {
    const numberPart = Number(transaction.id.replace("TXN", ""));
    return numberPart > max ? numberPart : max;
  }, 0);

  return `TXN${String(maxIdNumber + 1).padStart(3, "0")}`;
};

router.get("/", (req: any, res: any) => {
  return res.status(200).json({
    success: true,
    count: transactions.length,
    data: transactions,
  });
});

router.get("/:id", (req: any, res: any) => {
  const transaction = transactions.find(
    (item: any) => item.id === req.params.id
  );

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Transaction not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: transaction,
  });
});

router.post("/", (req: any, res: any) => {
  const {
    customer,
    accountNumber,
    type,
    amount,
    date,
    time,
    ref,
    status,
    risk,
  } = req.body;

  if (!customer || !accountNumber || !type || !amount || !date || !time) {
    return res.status(400).json({
      success: false,
      message:
        "Customer, account number, transaction type, amount, date and time are required",
    });
  }

  const newTransaction = {
    id: generateTransactionId(),
    customer,
    accountNumber,
    type,
    amount,
    date,
    time,
    ref: ref || `REF${Date.now()}`,
    status: status || "Success",
    risk: risk || "Normal",
  };

  transactions.push(newTransaction);

  return res.status(201).json({
    success: true,
    message: "Transaction created successfully",
    data: newTransaction,
  });
});

router.put("/:id", (req: any, res: any) => {
  const transactionIndex = transactions.findIndex(
    (item: any) => item.id === req.params.id
  );

  if (transactionIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Transaction not found",
    });
  }

  const existingTransaction: any = transactions[transactionIndex];

  const updatedTransaction = {
    ...existingTransaction,
    ...req.body,
    id: existingTransaction.id,
    status: req.body.status || existingTransaction.status,
    risk: req.body.risk || existingTransaction.risk,
  };

  transactions[transactionIndex] = updatedTransaction;

  return res.status(200).json({
    success: true,
    message: "Transaction updated successfully",
    data: updatedTransaction,
  });
});

router.delete("/:id", (req: any, res: any) => {
  const transactionIndex = transactions.findIndex(
    (item: any) => item.id === req.params.id
  );

  if (transactionIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Transaction not found",
    });
  }

  const deletedTransaction: any = transactions.splice(transactionIndex, 1)[0];

  return res.status(200).json({
    success: true,
    message: "Transaction deleted successfully",
    data: deletedTransaction,
  });
});

module.exports = router;