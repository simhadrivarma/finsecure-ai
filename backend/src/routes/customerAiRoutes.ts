// @ts-nocheck

const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Customer = require("../models/Customer");
const Loan = require("../models/Loan");

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || "finsecure_ai_secret_key";

const cleanText = (value) =>
  String(value ?? "").trim();

const normalizeText = (value) =>
  cleanText(value).toLowerCase();

const getBearerToken = (req) => {
  const authorization = cleanText(
    req.headers?.authorization
  );

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
};

const moneyToNumber = (value) => {
  const cleaned = String(value ?? 0)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\+/g, "")
    .trim();

  const numberValue = Number(cleaned || 0);
  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
};

const formatMoney = (value) => {
  return `₹${moneyToNumber(value).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
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

const maskPhone = (value) => {
  const digits = String(value || "").replace(
    /\D/g,
    ""
  );

  if (!digits) return "-";
  if (digits.length <= 4) return digits;

  return `${"*".repeat(
    Math.max(0, digits.length - 4)
  )}${digits.slice(-4)}`;
};

const maskEmail = (value) => {
  const email = normalizeText(value);

  if (!email || !email.includes("@")) {
    return "-";
  }

  const [name, domain] = email.split("@");

  if (!name) return `***@${domain}`;

  return `${name.slice(0, 2)}***@${domain}`;
};

const getCustomerIdentityConditions = (
  customer
) => {
  const conditions = [];

  const email = normalizeText(
    customer?.email
  );

  const accountNumber = cleanText(
    customer?.accountNumber
  );

  const customerId = cleanText(
    customer?.id || customer?.customerId
  );

  if (email) {
    conditions.push({ userEmail: email });
    conditions.push({ email });
    conditions.push({ customerEmail: email });
  }

  if (accountNumber) {
    conditions.push({
      accountNumber,
    });
  }

  if (customerId) {
    conditions.push({
      customerId,
    });
  }

  return conditions;
};

const protectCustomer = async (
  req,
  res,
  next
) => {
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

    const role = normalizeText(
      decoded?.role
    );

    if (role !== "customer") {
      return res.status(403).json({
        success: false,
        message:
          "Only logged-in customers can use Customer AI.",
      });
    }

    const conditions = [];

    const email = normalizeText(
      decoded?.email
    );

    if (email) {
      conditions.push({ email });
    }

    const id = cleanText(decoded?.id);

    if (id) {
      conditions.push({ id });
      conditions.push({
        customerId: id,
      });

      if (
        mongoose.Types.ObjectId.isValid(id)
      ) {
        conditions.push({
          _id: new mongoose.Types.ObjectId(
            id
          ),
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

    const customer =
      await Customer.findOne({
        $or: conditions,
      })
        .select(
          [
            "id",
            "customerId",
            "name",
            "customerName",
            "email",
            "phone",
            "phoneNumber",
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
    req.customerToken = decoded;

    return next();
  } catch (error) {
    if (
      error?.name === "TokenExpiredError"
    ) {
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

const findCollectionRecords = async (
  collectionName,
  filter,
  limit = 10
) => {
  if (!mongoose.connection.db) {
    return [];
  }

  try {
    return await mongoose.connection.db
      .collection(collectionName)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  } catch {
    return [];
  }
};

const loadTransactions = async (
  customer
) => {
  const conditions =
    getCustomerIdentityConditions(customer);

  if (!conditions.length) {
    return [];
  }

  const filter = {
    $or: conditions,
  };

  const [
    adminTransactions,
    transactions,
  ] = await Promise.all([
    findCollectionRecords(
      "admintransactions",
      filter,
      10
    ),
    findCollectionRecords(
      "transactions",
      filter,
      10
    ),
  ]);

  const merged = [
    ...adminTransactions,
    ...transactions,
  ];

  const seen = new Set();

  return merged
    .filter((item) => {
      const key = String(
        item.id ||
          item.ref ||
          item._id ||
          `${item.date}-${item.time}-${item.amount}-${item.type}`
      );

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const aTime = new Date(
        a.createdAt || a.date || 0
      ).getTime();

      const bTime = new Date(
        b.createdAt || b.date || 0
      ).getTime();

      return bTime - aTime;
    })
    .slice(0, 10);
};

const loadLoans = async (customer) => {
  const email = normalizeText(
    customer?.email
  );

  const accountNumber = cleanText(
    customer?.accountNumber
  );

  const customerId = cleanText(
    customer?.id || customer?.customerId
  );

  const conditions = [];

  if (email) {
    conditions.push({ email });
    conditions.push({
      customerEmail: email,
    });
    conditions.push({
      userEmail: email,
    });
  }

  if (accountNumber) {
    conditions.push({
      accountNumber,
    });
  }

  if (customerId) {
    conditions.push({
      customerId,
    });
  }

  if (!conditions.length) {
    return [];
  }

  return Loan.find({
    $or: conditions,
  })
    .select(
      [
        "id",
        "loanId",
        "type",
        "loanType",
        "amount",
        "loanAmount",
        "interest",
        "interestRate",
        "tenure",
        "tenureMonths",
        "emi",
        "paid",
        "pending",
        "totalPayable",
        "status",
        "appliedDate",
        "startDate",
        "endDate",
        "purpose",
        "createdAt",
      ].join(" ")
    )
    .sort({
      createdAt: -1,
    })
    .limit(10)
    .lean();
};

const loadSupportTickets = async (
  customer
) => {
  const email = normalizeText(
    customer?.email
  );

  if (!email) {
    return [];
  }

  return findCollectionRecords(
    "supporttickets",
    {
      customerEmail: email,
    },
    10
  );
};

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

const identifyIntent = (message) => {
  const q = normalizeText(message);

  if (
    restrictedWords.some((word) =>
      q.includes(word)
    )
  ) {
    return "RESTRICTED";
  }

  if (
    [
      "hi",
      "hello",
      "hey",
      "hii",
      "hiii",
      "good morning",
      "good afternoon",
      "good evening",
    ].includes(q)
  ) {
    return "GREETING";
  }

  if (
    q === "thanks" ||
    q === "thank you" ||
    q === "thankyou"
  ) {
    return "THANKS";
  }

  if (
    q.includes("other customer") ||
    q.includes("someone else") ||
    q.includes("another customer") ||
    q.includes("customer details for")
  ) {
    return "OTHER_CUSTOMER";
  }

  if (
    q.includes("full overview") ||
    q.includes("account overview") ||
    q.includes("all my details") ||
    q.includes("financial overview")
  ) {
    return "OVERVIEW";
  }

  if (
    q.includes("support ticket") ||
    q.includes("ticket status") ||
    q.includes("complaint") ||
    q.includes("customer care")
  ) {
    return "SUPPORT";
  }

  if (
    q.includes("fraud") ||
    q.includes("unauthorized") ||
    q.includes("suspicious") ||
    q.includes("scam")
  ) {
    return "FRAUD";
  }

  if (
    q.includes("loan") ||
    q.includes("emi")
  ) {
    return "LOANS";
  }

  if (
    q.includes("investment") ||
    q.includes("invest")
  ) {
    return "INVESTMENTS";
  }

  if (
    q.includes("transfer") ||
    q.includes("beneficiary")
  ) {
    return "TRANSFERS";
  }

  if (
    q.includes("income")
  ) {
    return "INCOME";
  }

  if (
    q.includes("expense") ||
    q.includes("spent")
  ) {
    return "EXPENSE";
  }

  if (
    q.includes("transaction") ||
    q.includes("statement") ||
    q.includes("recent payment")
  ) {
    return "TRANSACTIONS";
  }

  if (
    q.includes("balance") ||
    q.includes("available amount") ||
    q.includes("money in my account")
  ) {
    return "BALANCE";
  }

  if (
    q.includes("kyc") ||
    q.includes("verification")
  ) {
    return "KYC";
  }

  if (
    q.includes("ifsc")
  ) {
    return "IFSC";
  }

  if (
    q.includes("cif")
  ) {
    return "CIF";
  }

  if (
    q.includes("branch")
  ) {
    return "BRANCH";
  }

  if (
    q.includes("customer id") ||
    q.includes("customer number")
  ) {
    return "CUSTOMER_ID";
  }

  if (
    q.includes("account details") ||
    q.includes("bank details") ||
    q.includes("my details") ||
    q.includes("account number") ||
    q.includes("profile")
  ) {
    return "ACCOUNT_DETAILS";
  }

  if (
    q.includes("help") ||
    q.includes("what can you do")
  ) {
    return "HELP";
  }

  return "GENERAL";
};

const transactionTypeText = (item) =>
  cleanText(
    item.type ||
      item.transactionType ||
      item.category ||
      "Transaction"
  );

const isIncomeTransaction = (item) => {
  const type = normalizeText(
    transactionTypeText(item)
  );

  return (
    type.includes("income") ||
    type.includes("credit") ||
    type.includes("deposit")
  );
};

const isExpenseTransaction = (item) => {
  const type = normalizeText(
    transactionTypeText(item)
  );

  return (
    type.includes("expense") ||
    type.includes("debit") ||
    type.includes("withdraw") ||
    type.includes("transfer")
  );
};

const safeDate = (item) => {
  if (item.date) {
    return item.date;
  }

  if (item.createdAt) {
    return new Date(
      item.createdAt
    ).toLocaleDateString("en-IN");
  }

  return "-";
};

const createAnswer = ({
  intent,
  customer,
  transactions,
  loans,
  tickets,
}) => {
  const name =
    customer.name ||
    customer.customerName ||
    "Customer";

  const customerId =
    customer.id ||
    customer.customerId ||
    "-";

  const accountNumber = maskValue(
    customer.accountNumber,
    4
  );

  const accountType =
    customer.accountType ||
    "Savings Account";

  const branch =
    customer.branch ||
    customer.branchName ||
    "-";

  const ifsc =
    customer.ifsc ||
    customer.ifscCode ||
    "-";

  const cif = maskValue(
    customer.cif ||
      customer.cifNumber,
    4
  );

  const incomeTransactions =
    transactions.filter(
      isIncomeTransaction
    );

  const expenseTransactions =
    transactions.filter(
      isExpenseTransaction
    );

  const recentIncome =
    incomeTransactions.reduce(
      (sum, item) =>
        sum + moneyToNumber(item.amount),
      0
    );

  const recentExpense =
    expenseTransactions.reduce(
      (sum, item) =>
        sum + moneyToNumber(item.amount),
      0
    );

  const transfers =
    transactions.filter((item) => {
      const combined = normalizeText(
        `${item.type || ""} ${
          item.category || ""
        } ${item.description || ""}`
      );

      return (
        combined.includes("transfer") ||
        Boolean(item.beneficiaryName)
      );
    });

  switch (intent) {
    case "RESTRICTED":
      return (
        "For your security, I cannot display or request passwords, OTPs, PINs, CVVs, login tokens, complete Aadhaar/PAN values or your complete account number.\n\n" +
        "I can still help with safe account information and customer-care support."
      );

    case "OTHER_CUSTOMER":
      return (
        "For privacy and security, I can access only the banking information linked to your authenticated FinSecure account.\n\n" +
        "I cannot search for or display another customer’s banking information."
      );

    case "GREETING":
      return (
        `Hey ${name}! 👋\n\nHow can I assist you today?\n\n` +
        "I can securely help with your balance, account details, transactions, transfers, loans, KYC, branch information and customer-care requests."
      );

    case "THANKS":
      return (
        "You're welcome! 😊 I’m always here to help with your FinSecure banking services and customer-care requests."
      );

    case "BALANCE":
      return (
        `Certainly. Your current available balance is ${formatMoney(
          customer.balance
        )}.\n\n` +
        `Account: ${accountType} ending in ${accountNumber.slice(
          -4
        )}.\n\nWould you like to see your recent transactions as well?`
      );

    case "CUSTOMER_ID":
      return `Your FinSecure Customer ID is ${customerId}.`;

    case "ACCOUNT_DETAILS":
      return [
        "Certainly. Here is your secure FinSecure account overview:",
        "",
        `Customer Name: ${name}`,
        `Customer ID: ${customerId}`,
        `Registered Email: ${maskEmail(
          customer.email
        )}`,
        `Registered Mobile: ${maskPhone(
          customer.phone ||
            customer.phoneNumber
        )}`,
        `Account Type: ${accountType}`,
        `Account Number: ${accountNumber}`,
        `Available Balance: ${formatMoney(
          customer.balance
        )}`,
        `Branch: ${branch}`,
        `IFSC: ${ifsc}`,
        `CIF: ${cif}`,
        `KYC Status: ${
          customer.kyc || "Pending"
        }`,
        `Account Status: ${
          customer.status || "Active"
        }`,
      ].join("\n");

    case "KYC":
      return (
        `Your KYC status is ${
          customer.kyc || "Pending"
        }.\n\n` +
        "If you need help with KYC, I can also create a customer-care support request."
      );

    case "IFSC":
      return `Your registered branch IFSC code is ${ifsc}.`;

    case "CIF":
      return `Your masked CIF number is ${cif}.`;

    case "BRANCH":
      return (
        `Your registered branch is ${branch}.\n` +
        `IFSC: ${ifsc}`
      );

    case "TRANSACTIONS":
      if (!transactions.length) {
        return (
          "I could not find any recent transactions for your authenticated account."
        );
      }

      return [
        "Here are your latest transactions:",
        "",
        ...transactions
          .slice(0, 5)
          .map((item, index) => {
            return (
              `${index + 1}. ${transactionTypeText(
                item
              )}\n` +
              `Amount: ${formatMoney(
                item.amount
              )}\n` +
              `Status: ${
                item.status || "Completed"
              }\n` +
              `Date: ${safeDate(item)}`
            );
          }),
      ].join("\n");

    case "INCOME":
      return (
        `Your stored account total income is ${formatMoney(
          customer.totalIncome
        )}.\n\n` +
        `Income represented in the latest retrieved transactions: ${formatMoney(
          recentIncome
        )}.`
      );

    case "EXPENSE":
      return (
        `Your stored account total expense is ${formatMoney(
          customer.totalExpense
        )}.\n\n` +
        `Expenses represented in the latest retrieved transactions: ${formatMoney(
          recentExpense
        )}.`
      );

    case "TRANSFERS":
      if (!transfers.length) {
        return (
          "I could not find any recent fund-transfer records for your authenticated account."
        );
      }

      return [
        "Here are your latest fund transfers:",
        "",
        ...transfers
          .slice(0, 5)
          .map((item, index) => {
            return (
              `${index + 1}. ${
                item.beneficiaryName
                  ? `To ${item.beneficiaryName}`
                  : "Fund Transfer"
              }\n` +
              `Amount: ${formatMoney(
                item.amount
              )}\n` +
              `Status: ${
                item.status || "Completed"
              }\n` +
              `Date: ${safeDate(item)}`
            );
          }),
      ].join("\n");

    case "LOANS":
      if (!loans.length) {
        return (
          "I could not find any loan applications linked to your authenticated account.\n\nYou can apply from the Apply for Loan section."
        );
      }

      return [
        "Here are your latest loan records:",
        "",
        ...loans
          .slice(0, 5)
          .map((loan, index) => {
            return (
              `${index + 1}. ${
                loan.loanType ||
                loan.type ||
                "Loan"
              }\n` +
              `Loan ID: ${
                loan.loanId ||
                loan.id ||
                "-"
              }\n` +
              `Amount: ${formatMoney(
                loan.amount ||
                  loan.loanAmount
              )}\n` +
              `EMI: ${formatMoney(
                loan.emi
              )}\n` +
              `Tenure: ${
                loan.tenure ||
                loan.tenureMonths ||
                "-"
              }\n` +
              `Status: ${
                loan.status || "Pending"
              }`
            );
          }),
      ].join("\n");

    case "SUPPORT":
      if (!tickets.length) {
        return (
          "You currently have no support tickets.\n\n" +
          'To create one, type “Create support ticket” and I will guide you.'
        );
      }

      return [
        "Here are your latest customer-care requests:",
        "",
        ...tickets
          .slice(0, 5)
          .map((ticket, index) => {
            return (
              `${index + 1}. ${
                ticket.ticketId ||
                ticket.id ||
                "Ticket"
              }\n` +
              `Issue: ${
                ticket.subject ||
                ticket.category ||
                "Support request"
              }\n` +
              `Priority: ${
                ticket.priority ||
                "Medium"
              }\n` +
              `Status: ${
                ticket.status || "Open"
              }`
            );
          }),
        "",
        'You can type “Create support ticket” if you need additional help.',
      ].join("\n");

    case "FRAUD":
      return (
        "I can help you report suspected fraud or an unauthorized transaction immediately.\n\n" +
        "Please use the Customer Care option in this chat and describe the suspicious transaction. The request will be marked as urgent.\n\n" +
        "Never share your OTP, PIN, CVV, password or complete card number."
      );

    case "INVESTMENTS":
      return (
        "I cannot yet retrieve verified real-time investment records from the secure banking database because the Investments module is not currently synchronized to a backend investment API.\n\n" +
        "Please use the Investments section for the current browser-side view. Once the investment API is connected, I can include verified investment data here."
      );

    case "OVERVIEW":
      return [
        `Here is your FinSecure overview, ${name}:`,
        "",
        `Customer ID: ${customerId}`,
        `Account: ${accountType} - ${accountNumber}`,
        `Available Balance: ${formatMoney(
          customer.balance
        )}`,
        `KYC: ${
          customer.kyc || "Pending"
        }`,
        `Account Status: ${
          customer.status || "Active"
        }`,
        `Recent Transactions Found: ${transactions.length}`,
        `Loan Records Found: ${loans.length}`,
        `Support Tickets Found: ${tickets.length}`,
        "",
        "For security, confidential authentication information is never displayed.",
      ].join("\n");

    case "HELP":
      return (
        "Of course. I can help you with:\n\n" +
        "• Current balance\n" +
        "• Safe account details\n" +
        "• Recent transactions\n" +
        "• Fund transfers\n" +
        "• Loan status and EMI\n" +
        "• KYC, branch, IFSC and CIF\n" +
        "• Support tickets and complaints\n" +
        "• Fraud/security reporting\n\n" +
        "Just ask naturally, for example: “Show my loan status” or “I need customer care.”"
      );

    default:
      return (
        "I’m your secure FinSecure banking and customer-care assistant.\n\n" +
        "Please ask me about your balance, account details, transactions, transfers, loans, KYC, branch information or support requests.\n\n" +
        "I can access only the records linked to your authenticated customer account."
      );
  }
};

router.get(
  "/health",
  (_req, res) => {
    res.json({
      success: true,
      message:
        "Secure Customer AI route is running.",
    });
  }
);

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

      const [
        transactions,
        loans,
        tickets,
      ] = await Promise.all([
        loadTransactions(customer),
        loadLoans(customer),
        loadSupportTickets(customer),
      ]);

      const intent =
        identifyIntent(message);

      const answer = createAnswer({
        intent,
        customer,
        transactions,
        loans,
        tickets,
      });

      return res.status(200).json({
        success: true,
        intent,
        answer,
        data: {
          customerId:
            customer.id ||
            customer.customerId ||
            "-",

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

          balance: moneyToNumber(
            customer.balance
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

          transactionCount:
            transactions.length,

          loanCount: loans.length,

          supportTicketCount:
            tickets.length,
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
          "Unable to process your secure banking request right now.",
      });
    }
  }
);

module.exports = router;