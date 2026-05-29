const express = require("express");
const mongoose = require("mongoose");
const AdminTransaction = require("../models/AdminTransaction");

let Customer: any = null;

try {
  Customer = require("../models/Customer");
} catch {
  Customer = null;
}

const authMiddleware = require("../middleware/authMiddleware");
const protectAdmin = authMiddleware.protectAdmin || authMiddleware;

console.log("✅ SECURE ADMIN TRANSACTION ROUTES LOADED");

const router = express.Router();

const generateTransactionId = () => {
  return `TRN${Date.now()}`;
};

const normalizeText = (value: any) => {
  return String(value || "").toLowerCase().trim();
};

const normalizeRole = (role: any) => {
  return normalizeText(role).replace(/_/g, " ").replace(/-/g, " ");
};

const isSuperAdmin = (role: any) => {
  const cleanRole = normalizeRole(role);

  return (
    cleanRole === "super admin" ||
    cleanRole === "superadmin" ||
    cleanRole === "super"
  );
};

const isAdmin = (role: any) => {
  const cleanRole = normalizeRole(role);
  return isSuperAdmin(cleanRole) || cleanRole === "admin";
};

const canViewTransactions = (role: any) => {
  const cleanRole = normalizeRole(role);

  return [
    "super admin",
    "superadmin",
    "super",
    "admin",
    "branch manager",
    "manager",
    "cashier",
    "customer support",
    "customer support executive",
    "fraud analyst",
    "staff",
  ].includes(cleanRole);
};

const canWriteTransactions = (role: any) => {
  const cleanRole = normalizeRole(role);

  return [
    "super admin",
    "superadmin",
    "super",
    "admin",
    "branch manager",
    "manager",
    "cashier",
  ].includes(cleanRole);
};

const canDeleteTransactions = (role: any) => {
  const cleanRole = normalizeRole(role);

  return [
    "super admin",
    "superadmin",
    "super",
    "admin",
    "branch manager",
    "manager",
  ].includes(cleanRole);
};

const moneyToNumber = (value: any) => {
  const clean = String(value || "")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\+/g, "")
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

const noAccessFilter = () => {
  return { id: "__NO_ACCESS__" };
};

const sanitizeAccessFilter = (filter: any) => {
  if (!filter || Object.keys(filter).length === 0) return {};

  if (filter._id === "__NO_ACCESS__") {
    return noAccessFilter();
  }

  return filter;
};

const mergeFilters = (baseFilter: any, accessFilter: any) => {
  const cleanBase = baseFilter || {};
  const cleanAccess = sanitizeAccessFilter(accessFilter || {});

  if (Object.keys(cleanBase).length === 0) return cleanAccess;
  if (Object.keys(cleanAccess).length === 0) return cleanBase;

  return {
    $and: [cleanBase, cleanAccess],
  };
};

const getAdminBranchValues = (admin: any) => {
  return [
    admin?.branch,
    admin?.branchName,
    admin?.assignedBranch,
    admin?.branchCode,
    admin?.branchId,
  ]
    .filter(Boolean)
    .map(normalizeText);
};

const getAdminIfscValues = (admin: any) => {
  return [admin?.ifsc, admin?.ifscCode, admin?.IFSC]
    .filter(Boolean)
    .map(normalizeText);
};

const buildDirectBranchTransactionFilter = (admin: any) => {
  const adminBranches = getAdminBranchValues(admin);
  const adminIfscList = getAdminIfscValues(admin);

  const orConditions: any[] = [];

  adminBranches.forEach((branch: string) => {
    orConditions.push({ branch });
    orConditions.push({ branchName: branch });
    orConditions.push({ assignedBranch: branch });
    orConditions.push({ branchCode: branch });
    orConditions.push({ branchId: branch });
  });

  adminIfscList.forEach((ifsc: string) => {
    orConditions.push({ ifsc });
    orConditions.push({ ifscCode: ifsc });
    orConditions.push({ IFSC: ifsc });
    orConditions.push({ beneficiaryIfsc: ifsc });
  });

  return orConditions;
};

const getBranchCustomerIdentifiers = async (admin: any) => {
  if (!Customer) {
    return {
      emails: [],
      accounts: [],
      phones: [],
      names: [],
      ids: [],
    };
  }

  const adminBranches = getAdminBranchValues(admin);
  const adminIfscList = getAdminIfscValues(admin);

  const customerOr: any[] = [];

  adminBranches.forEach((branch: string) => {
    customerOr.push({ branch });
    customerOr.push({ branchName: branch });
    customerOr.push({ assignedBranch: branch });
    customerOr.push({ branchCode: branch });
    customerOr.push({ branchId: branch });
  });

  adminIfscList.forEach((ifsc: string) => {
    customerOr.push({ ifsc });
    customerOr.push({ ifscCode: ifsc });
    customerOr.push({ IFSC: ifsc });
  });

  if (!customerOr.length) {
    return {
      emails: [],
      accounts: [],
      phones: [],
      names: [],
      ids: [],
    };
  }

  const customers = await Customer.find({ $or: customerOr })
    .select(
      "id customerId name customerName email customerEmail userEmail phone phoneNumber accountNumber accountNo cif cifNumber"
    )
    .lean();

  const emails = new Set<string>();
  const accounts = new Set<string>();
  const phones = new Set<string>();
  const names = new Set<string>();
  const ids = new Set<string>();

  customers.forEach((customer: any) => {
    [
      customer.email,
      customer.customerEmail,
      customer.userEmail,
    ].forEach((value) => value && emails.add(String(value).toLowerCase()));

    [
      customer.accountNumber,
      customer.accountNo,
    ].forEach((value) => value && accounts.add(String(value)));

    [
      customer.phone,
      customer.phoneNumber,
    ].forEach((value) => value && phones.add(String(value)));

    [
      customer.name,
      customer.customerName,
    ].forEach((value) => value && names.add(String(value)));

    [
      customer.id,
      customer.customerId,
    ].forEach((value) => value && ids.add(String(value)));
  });

  return {
    emails: Array.from(emails),
    accounts: Array.from(accounts),
    phones: Array.from(phones),
    names: Array.from(names),
    ids: Array.from(ids),
  };
};

const buildTransactionAccessFilter = async (req: any) => {
  const role = req.admin?.role;

  if (isAdmin(role)) {
    return {};
  }

  if (!canViewTransactions(role)) {
    return noAccessFilter();
  }

  const orConditions: any[] = [];

  orConditions.push(...buildDirectBranchTransactionFilter(req.admin));

  const identifiers = await getBranchCustomerIdentifiers(req.admin);

  if (identifiers.emails.length) {
    orConditions.push({ email: { $in: identifiers.emails } });
    orConditions.push({ customerEmail: { $in: identifiers.emails } });
    orConditions.push({ userEmail: { $in: identifiers.emails } });
  }

  if (identifiers.accounts.length) {
    orConditions.push({ accountNumber: { $in: identifiers.accounts } });
    orConditions.push({ accountNo: { $in: identifiers.accounts } });
    orConditions.push({ fromAccount: { $in: identifiers.accounts } });
  }

  if (identifiers.phones.length) {
    orConditions.push({ phone: { $in: identifiers.phones } });
    orConditions.push({ phoneNumber: { $in: identifiers.phones } });
  }

  if (identifiers.names.length) {
    orConditions.push({ customer: { $in: identifiers.names } });
    orConditions.push({ customerName: { $in: identifiers.names } });
    orConditions.push({ name: { $in: identifiers.names } });
  }

  if (identifiers.ids.length) {
    orConditions.push({ customerId: { $in: identifiers.ids } });
    orConditions.push({ customerID: { $in: identifiers.ids } });
  }

  if (!orConditions.length) {
    return noAccessFilter();
  }

  return { $or: orConditions };
};

const validateAdminBranchAccessForPayload = async (req: any, payload: any) => {
  const role = req.admin?.role;

  if (isAdmin(role)) return "";

  const accessFilter = await buildTransactionAccessFilter(req);

  if (!accessFilter || Object.keys(accessFilter).length === 0) return "";

  if (accessFilter.id === "__NO_ACCESS__") {
    return "Your admin account has no branch assigned. Please contact Super Admin.";
  }

  const checks: any[] = [];

  if (payload.branch) checks.push({ branch: payload.branch });
  if (payload.branchName) checks.push({ branchName: payload.branchName });
  if (payload.ifsc) checks.push({ ifsc: payload.ifsc });
  if (payload.ifscCode) checks.push({ ifscCode: payload.ifscCode });
  if (payload.accountNumber) checks.push({ accountNumber: payload.accountNumber });
  if (payload.email) checks.push({ email: payload.email });
  if (payload.customerEmail) checks.push({ customerEmail: payload.customerEmail });
  if (payload.userEmail) checks.push({ userEmail: payload.userEmail });
  if (payload.customer) checks.push({ customer: payload.customer });
  if (payload.customerName) checks.push({ customerName: payload.customerName });

  if (!checks.length) {
    return "Access denied. Transaction must include customer/account/branch details.";
  }

  const matchingFilter = mergeFilters({ $or: checks }, accessFilter);

  const matchingTransaction = await AdminTransaction.findOne(matchingFilter)
    .select("id")
    .lean();

  if (matchingTransaction) return "";

  const allowedCustomerFilter = mergeFilters(
    {
      $or: checks,
    },
    await buildTransactionAccessFilter(req)
  );

  if (Customer) {
    const customer = await Customer.findOne(allowedCustomerFilter).select("id").lean();
    if (customer) return "";
  }

  return "Access denied. You can manage transactions only for your assigned branch.";
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
  const customer = body.customer || body.customerName || body.name;
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

  payload.customer = String(
    payload.customer || payload.customerName || payload.name || ""
  ).trim();

  payload.customerName = String(
    payload.customerName || payload.customer || ""
  ).trim();

  payload.email = String(
    payload.email || payload.customerEmail || payload.userEmail || ""
  )
    .toLowerCase()
    .trim();

  payload.customerEmail = String(
    payload.customerEmail || payload.email || payload.userEmail || ""
  )
    .toLowerCase()
    .trim();

  payload.userEmail = String(
    payload.userEmail || payload.email || payload.customerEmail || ""
  )
    .toLowerCase()
    .trim();

  if (payload.phone !== undefined || payload.phoneNumber !== undefined) {
    payload.phone = String(payload.phone || payload.phoneNumber || "").replace(
      /\D/g,
      ""
    );
  }

  if (payload.accountNumber !== undefined) {
    payload.accountNumber = String(payload.accountNumber || "").replace(
      /\D/g,
      ""
    );
  }

  if (payload.branch !== undefined || payload.branchName !== undefined) {
    payload.branch = String(payload.branch || payload.branchName || "").trim();
    payload.branchName = payload.branch;
  }

  if (payload.ifsc !== undefined || payload.ifscCode !== undefined) {
    payload.ifsc = String(payload.ifsc || payload.ifscCode || "")
      .toUpperCase()
      .trim();
    payload.ifscCode = payload.ifsc;
  }

  if (payload.amount !== undefined) {
    payload.amount = cleanMoney(payload.amount);
  }

  if (payload.ref !== undefined || payload.reference !== undefined) {
    payload.ref = String(payload.ref || payload.reference || "").trim();
    payload.reference = payload.ref;
  }

  if (payload.type !== undefined) {
    payload.type = String(payload.type || "").trim();
  }

  if (payload.status !== undefined) {
    payload.status = String(payload.status || "Success").trim();
  }

  if (payload.date !== undefined) {
    payload.date = String(payload.date || "").trim();
  }

  if (payload.time !== undefined) {
    payload.time = String(payload.time || "").trim();
  }

  return payload;
};

const buildQueryFilter = (query: any) => {
  const filter: any = {};

  if (query.type) {
    filter.type = query.type;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.risk) {
    filter.risk = query.risk;
  }

  if (query.branch) {
    const branch = String(query.branch);

    filter.$or = [
      { branch },
      { branchName: branch },
      { ifsc: branch },
      { ifscCode: branch },
    ];
  }

  if (query.search || query.q) {
    const search = String(query.search || query.q || "").trim();

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      const searchOr = [
        { id: regex },
        { transactionId: regex },
        { customer: regex },
        { customerName: regex },
        { email: regex },
        { customerEmail: regex },
        { userEmail: regex },
        { accountNumber: regex },
        { type: regex },
        { amount: regex },
        { ref: regex },
        { reference: regex },
        { status: regex },
        { risk: regex },
        { branch: regex },
        { ifsc: regex },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }
  }

  return filter;
};

const findAccessibleTransactionById = async (req: any, id: string) => {
  const accessFilter = await buildTransactionAccessFilter(req);

  const baseOr: any[] = [
    { id },
    { transactionId: id },
    { ref: id },
    { reference: id },
  ];

  if (mongoose.Types.ObjectId.isValid(id)) {
    baseOr.push({ _id: id });
  }

  const finalFilter = mergeFilters({ $or: baseOr }, accessFilter);

  return AdminTransaction.findOne(finalFilter).select("-_id -__v").lean();
};

router.use(protectAdmin);

router.get("/", async (req: any, res: any) => {
  try {
    if (!canViewTransactions(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your role cannot view transactions.",
      });
    }

    const queryFilter = buildQueryFilter(req.query);
    const accessFilter = await buildTransactionAccessFilter(req);
    const finalFilter = mergeFilters(queryFilter, accessFilter);

    const transactions = await AdminTransaction.find(finalFilter)
      .select("-_id -__v")
      .sort({ createdAt: -1, id: -1 })
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

router.get("/:id", async (req: any, res: any) => {
  try {
    if (!canViewTransactions(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your role cannot view transactions.",
      });
    }

    const transaction = await findAccessibleTransactionById(req, req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found or you do not have access.",
      });
    }

    return res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transaction",
      error: getErrorMessage(error),
    });
  }
});

router.post("/", async (req: any, res: any) => {
  try {
    if (!canWriteTransactions(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your role cannot create transactions.",
      });
    }

    const validationError = validateTransaction(req.body, false);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const payload = normalizeTransactionPayload(req.body);

    const branchAccessError = await validateAdminBranchAccessForPayload(
      req,
      payload
    );

    if (branchAccessError) {
      return res.status(403).json({
        success: false,
        message: branchAccessError,
      });
    }

    const aiRisk = calculateRisk(payload);

    const transaction = await AdminTransaction.create({
      id: generateTransactionId(),
      transactionId: generateTransactionId(),

      customer: payload.customer,
      customerName: payload.customerName || payload.customer,
      email: payload.email || "",
      customerEmail: payload.customerEmail || payload.email || "",
      userEmail: payload.userEmail || payload.email || "",

      customerId: payload.customerId || "",
      accountNumber: payload.accountNumber,
      branch: payload.branch || "",
      branchName: payload.branchName || payload.branch || "",
      ifsc: payload.ifsc || "",
      ifscCode: payload.ifscCode || payload.ifsc || "",

      type: payload.type,
      amount: payload.amount,
      category: payload.category || "",
      description: payload.description || "",
      paymentMethod: payload.paymentMethod || "",

      date: payload.date,
      time: payload.time,
      ref: payload.ref || "",
      reference: payload.reference || payload.ref || "",

      status: payload.status || "Success",
      risk: aiRisk.risk,
      riskScore: aiRisk.riskScore,
      riskReasons: aiRisk.riskReasons,

      createdBy: req.admin?.email || req.admin?.name || "",
      createdByRole: req.admin?.role || "",
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
    if (!canWriteTransactions(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your role cannot edit transactions.",
      });
    }

    const { id } = req.params;

    const existingTransaction = await findAccessibleTransactionById(req, id);

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found or you do not have access.",
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

    const branchCheckPayload = {
      ...existingTransaction,
      ...updateData,
    };

    const branchAccessError = await validateAdminBranchAccessForPayload(
      req,
      branchCheckPayload
    );

    if (branchAccessError) {
      return res.status(403).json({
        success: false,
        message: branchAccessError,
      });
    }

    const riskBase = {
      ...existingTransaction,
      ...updateData,
    };

    const aiRisk = calculateRisk(riskBase);

    updateData.risk = aiRisk.risk;
    updateData.riskScore = aiRisk.riskScore;
    updateData.riskReasons = aiRisk.riskReasons;

    const accessFilter = await buildTransactionAccessFilter(req);

    const baseOr: any[] = [
      { id },
      { transactionId: id },
      { ref: id },
      { reference: id },
    ];

    if (mongoose.Types.ObjectId.isValid(id)) {
      baseOr.push({ _id: id });
    }

    const finalFilter = mergeFilters({ $or: baseOr }, accessFilter);

    const transaction = await AdminTransaction.findOneAndUpdate(
      finalFilter,
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
    if (!canDeleteTransactions(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your role cannot delete transactions.",
      });
    }

    const { id } = req.params;

    const accessFilter = await buildTransactionAccessFilter(req);

    const baseOr: any[] = [
      { id },
      { transactionId: id },
      { ref: id },
      { reference: id },
    ];

    if (mongoose.Types.ObjectId.isValid(id)) {
      baseOr.push({ _id: id });
    }

    const finalFilter = mergeFilters({ $or: baseOr }, accessFilter);

    const transaction = await AdminTransaction.findOneAndDelete(finalFilter)
      .select("-_id -__v")
      .lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found or you do not have access.",
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