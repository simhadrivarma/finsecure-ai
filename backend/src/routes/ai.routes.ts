// @ts-nocheck
const express = require("express");

const router = express.Router();

const money = (amount) => {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
};

const mask = (value, visible = 4) => {
  if (!value) return "Not added";
  const text = String(value);
  if (text.length <= visible) return text;
  return `${"X".repeat(text.length - visible)}${text.slice(-visible)}`;
};

const lower = (text) => String(text || "").toLowerCase();

const getGeneralKnowledgeAnswer = (q) => {
  if (q.includes("president") && q.includes("india")) {
    return `The President of India is Smt. Droupadi Murmu.

Note: This is a saved answer. Current political positions can change.`;
  }

  if (q.includes("prime minister") && q.includes("india")) {
    return `The Prime Minister of India is Narendra Modi.

Note: This is a saved answer. Current political positions can change.`;
  }

  if (
    q.includes("invented the computer") ||
    q.includes("inventor of computer") ||
    q.includes("father of computer")
  ) {
    return `Charles Babbage is known as the Father of the Computer.

He designed the Difference Engine and Analytical Engine.`;
  }

  if (q.includes("capital of india")) {
    return `The capital of India is New Delhi.`;
  }

  if (q.includes("capital of usa") || q.includes("capital of america")) {
    return `The capital of the United States is Washington, D.C.`;
  }

  if (q.includes("largest planet")) {
    return `Jupiter is the largest planet in our Solar System.`;
  }

  if (q.includes("smallest planet")) {
    return `Mercury is the smallest planet in our Solar System.`;
  }

  if (q.includes("taj mahal")) {
    return `The Taj Mahal is in Agra, Uttar Pradesh, India.

It was built by Mughal emperor Shah Jahan in memory of Mumtaz Mahal.`;
  }

  if (q.includes("national animal of india")) {
    return `The national animal of India is the Bengal Tiger.`;
  }

  if (q.includes("national bird of india")) {
    return `The national bird of India is the Indian Peacock.`;
  }

  if (q.includes("national flower of india")) {
    return `The national flower of India is the Lotus.`;
  }

  if (q.includes("invented telephone")) {
    return `Alexander Graham Bell is widely credited with inventing the telephone.`;
  }

  if (q.includes("invented light bulb") || q.includes("invented bulb")) {
    return `Thomas Edison is commonly credited with developing the practical electric light bulb.`;
  }

  if (q.includes("who are you") || q.includes("what are you")) {
    return `I am your FinSecure AI Assistant.

I can help with your banking details, financial report, transactions, investments, loans, transfers, branches, profile details, and basic general knowledge.`;
  }

  return null;
};

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "AI route running",
    mode: "Free rule-based AI",
  });
});

router.post("/chat", (req, res) => {
  const { message, page, userName, role, context } = req.body;

  const q = lower(message);

  const dashboard = context?.dashboard || {};
  const transactions = Array.isArray(context?.transactions)
    ? context.transactions
    : [];
  const investments = Array.isArray(context?.investments)
    ? context.investments
    : [];
  const transfers = Array.isArray(context?.transfers) ? context.transfers : [];
  const loans = Array.isArray(context?.loans) ? context.loans : [];
  const branches = Array.isArray(context?.branches) ? context.branches : [];
  const profile = context?.profile || {};

  const totalIncome = Number(dashboard.totalIncome || 0);
  const totalExpense = Number(dashboard.totalExpense || 0);
  const balance = Number(dashboard.balance || 0);

  const totalInvestment = investments.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const totalExpectedReturn = investments.reduce(
    (sum, item) => sum + Number(item.expectedReturn || 0),
    0
  );

  let reply = "";

  if (
    q.includes("summary") ||
    q.includes("dashboard") ||
    q.includes("overview") ||
    q.includes("report") ||
    q.includes("all details") ||
    q.includes("full details") ||
    q.includes("financial report")
  ) {
    reply = `Hello ${userName || "Customer"} 👑

Here is your complete FinSecure financial report:

💰 Total Income: ${money(totalIncome)}
💸 Total Expense: ${money(totalExpense)}
🏦 Available Balance: ${money(balance)}
📈 Total Investments: ${money(totalInvestment)}
✨ Expected Investment Returns: ${money(totalExpectedReturn)}
📄 Total Transactions: ${transactions.length}
💳 Fund Transfers: ${transfers.length}
🏛️ Loan Applications: ${loans.length}
🏢 Branches Available: ${branches.length}

Current Page: ${page || "Dashboard"}
User Role: ${role || "Customer"}`;
  } else if (
    q.includes("transaction") ||
    q.includes("statement") ||
    q.includes("income") ||
    q.includes("expense")
  ) {
    if (transactions.length === 0) {
      reply = `No transactions found yet.

You can add income or expense from the dashboard using Add New Entry.`;
    } else {
      const list = transactions
        .map((t, index) => {
          return `${index + 1}. ${String(
            t.type || "transaction"
          ).toUpperCase()}
Description: ${t.description || "No description"}
Category: ${t.category || "Other"}
Amount: ${money(t.amount)}
Payment Method: ${t.paymentMethod || "Not added"}
Date: ${
            t.date ? new Date(t.date).toLocaleDateString("en-IN") : "Not added"
          }`;
        })
        .join("\n\n");

      reply = `Here are your transaction details:

Total Income: ${money(totalIncome)}
Total Expense: ${money(totalExpense)}
Balance: ${money(balance)}

Transactions:
${list}`;
    }
  } else if (q.includes("balance") || q.includes("account")) {
    reply = `Your account details:

Account Holder: ${profile.name || userName || "Customer"}
Email: ${profile.email || "Not added"}
Phone: ${profile.phone || "Not added"}
Aadhaar: ${mask(profile.aadhaarNumber)}
PAN: ${mask(profile.panNumber)}
Account Type: FinSecure Royal Account
Account Number: XXXX XXXX XXXX 5678

Available Balance: ${money(balance)}
Total Income: ${money(totalIncome)}
Total Expense: ${money(totalExpense)}`;
  } else if (q.includes("investment") || q.includes("invest")) {
    if (investments.length === 0) {
      reply = `No investments added yet.

You can add Fixed Deposit, Mutual Fund, Gold Investment, Stocks, Bonds, or Insurance Plan from the Investments section.`;
    } else {
      const list = investments
        .map((item, index) => {
          return `${index + 1}. ${item.investmentType || "Investment"}
Amount: ${money(item.amount)}
Duration: ${item.duration || "Not added"}
Risk Level: ${item.riskLevel || "Not added"}
Expected Return: ${money(item.expectedReturn)}
Nominee: ${item.nomineeName || "Not added"}
Status: ${item.status || "Active"}`;
        })
        .join("\n\n");

      reply = `Your investment summary:

Total Investment: ${money(totalInvestment)}
Expected Returns: ${money(totalExpectedReturn)}
Active Investments: ${investments.length}

Investment Details:
${list}`;
    }
  } else if (q.includes("loan")) {
    if (loans.length === 0) {
      reply = `No loan applications found.

You can apply for Personal Loan, Home Loan, Vehicle Loan, Education Loan, or Business Loan from Apply for Loan section.`;
    } else {
      const list = loans
        .map((loan, index) => {
          return `${index + 1}. ${loan.loanType || "Loan"}
Amount: ${money(loan.amount)}
Monthly Income: ${money(loan.monthlyIncome)}
Employment Type: ${loan.employmentType || "Not added"}
Tenure: ${loan.tenure || "Not added"}
Purpose: ${loan.purpose || "Not added"}
Status: ${loan.status || "Pending"}`;
        })
        .join("\n\n");

      reply = `Your loan application details:

${list}`;
    }
  } else if (q.includes("transfer") || q.includes("fund")) {
    if (transfers.length === 0) {
      reply = `No fund transfers found.

You can make a new transfer from the Fund Transfer section.`;
    } else {
      const list = transfers
        .map((transfer, index) => {
          return `${index + 1}. Beneficiary: ${
            transfer.beneficiaryName || "Not added"
          }
Bank: ${transfer.bankName || "Not added"}
Account: ${mask(transfer.beneficiaryAccount)}
IFSC: ${transfer.ifsc || "Not added"}
Amount: ${money(transfer.amount)}
Type: ${transfer.transferType || "Not added"}
Status: ${transfer.status || "Success"}`;
        })
        .join("\n\n");

      reply = `Your fund transfer details:

${list}`;
    }
  } else if (q.includes("branch")) {
    const list = branches
      .map((branch, index) => {
        return `${index + 1}. ${branch.name || "Branch"}
Code: ${branch.code || "Not added"}
Location: ${branch.location || "Not added"}
Employees: ${branch.employees || 0}
Accounts: ${branch.accounts || 0}`;
      })
      .join("\n\n");

    reply = `Available branch details:

${list || "No branches found."}`;
  } else if (
    q.includes("profile") ||
    q.includes("settings") ||
    q.includes("phone") ||
    q.includes("aadhaar") ||
    q.includes("aadhar") ||
    q.includes("pan")
  ) {
    reply = `Your registered profile details:

Name: ${profile.name || userName || "Not added"}
Email: ${profile.email || "Not added"}
Phone: ${profile.phone || "Not added"}
Aadhaar Number: ${mask(profile.aadhaarNumber)}
PAN Number: ${mask(profile.panNumber)}

You can edit these details from Settings.`;
  } else {
    const generalAnswer = getGeneralKnowledgeAnswer(q);

    if (generalAnswer) {
      reply = generalAnswer;
    } else {
      reply = `I can help you with banking and basic general knowledge questions.

Banking:
1. Balance
2. Transactions
3. Income and expense
4. Investments
5. Loans
6. Fund transfers
7. Branches
8. Profile details
9. Full financial report

General knowledge:
1. Who invented the computer?
2. Who is the President of India?
3. What is the capital of India?
4. What is the largest planet?
5. Who invented the telephone?

Try asking:
"Give full financial report"
"Show my transactions"
"Tell my balance"
"Who invented the computer?"`;
    }
  }

  res.json({
    success: true,
    reply,
  });
});

module.exports = router;