const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const Admin = require("../models/Admin");

const authMiddleware = require("../middleware/authMiddleware");
const protectAdmin = authMiddleware.protectAdmin || authMiddleware;
const requireModuleAccess =
  authMiddleware.requireModuleAccess ||
  (() => (_req: any, _res: any, next: any) => next());
const buildAccessFilterFromMiddleware =
  authMiddleware.buildAccessFilter || (() => ({}));
const canAccessModule =
  authMiddleware.canAccessModule || (() => true);

console.log("✅ SECURE FINSECURE LOAN ROUTES LOADED");

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.SECRET_KEY ||
  process.env.JWT_PRIVATE_KEY ||
  "finsecure_ai_default_secret";

const generateLoanId = () => {
  return `LON${Date.now()}`;
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

const isFullAdmin = (role: any) => {
  const cleanRole = normalizeRole(role);
  return isSuperAdmin(cleanRole) || cleanRole === "admin";
};

const isLoanRole = (role: any) => {
  const cleanRole = normalizeRole(role);
  return cleanRole === "loan officer" || cleanRole === "loan manager";
};

const canWriteLoan = (role: any) => {
  const cleanRole = normalizeRole(role);

  return [
    "super admin",
    "superadmin",
    "super",
    "admin",
    "branch manager",
    "manager",
    "loan officer",
    "loan manager",
  ].includes(cleanRole);
};

const canDeleteLoan = (role: any) => {
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
    return "Duplicate loan data found";
  }

  return error?.message || "Something went wrong";
};

const isValidDate = (value: any) => {
  if (!String(value || "").trim()) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
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

const getAdminIdentity = (admin: any) => {
  return {
    id: admin?.id || admin?._id || admin?.adminId || "",
    name: admin?.name || admin?.adminName || "",
    email: admin?.email || "",
    role: admin?.role || "Admin",
    branch:
      admin?.branch ||
      admin?.branchName ||
      admin?.assignedBranch ||
      admin?.branchCode ||
      "",
    branchName:
      admin?.branchName ||
      admin?.branch ||
      admin?.assignedBranch ||
      "",
    branchCode: admin?.branchCode || admin?.code || "",
    branchId: admin?.branchId || "",
    ifsc: admin?.ifsc || admin?.ifscCode || admin?.IFSC || "",
  };
};

const buildStrictLoanOfficerFilter = (admin: any) => {
  const identity = getAdminIdentity(admin);

  const conditions: any[] = [];

  [
    { officer: identity.name },
    { loanOfficer: identity.name },
    { loanOfficerName: identity.name },
    { assignedOfficer: identity.name },
    { assignedEmployee: identity.name },
    { employee: identity.name },
    { employeeName: identity.name },
  ].forEach((condition) => {
    const value = Object.values(condition)[0];
    if (value) conditions.push(condition);
  });

  [
    { officerEmail: identity.email },
    { loanOfficerEmail: identity.email },
    { assignedOfficerEmail: identity.email },
    { assignedEmployeeEmail: identity.email },
    { employeeEmail: identity.email },
  ].forEach((condition) => {
    const value = Object.values(condition)[0];
    if (value) conditions.push(condition);
  });

  [
    { officerId: identity.id },
    { loanOfficerId: identity.id },
    { assignedOfficerId: identity.id },
    { assignedEmployeeId: identity.id },
    { employeeId: identity.id },
  ].forEach((condition) => {
    const value = Object.values(condition)[0];
    if (value) conditions.push(condition);
  });

  if (!conditions.length) return noAccessFilter();

  return { $or: conditions };
};

const getLoanAccessFilter = (req: any) => {
  const role = req.admin?.role;

  if (isSuperAdmin(role) || normalizeRole(role) === "admin") {
    return {};
  }

  if (isLoanRole(role)) {
    return buildStrictLoanOfficerFilter(req.admin);
  }

  if (req.getAccessFilter) {
    return sanitizeAccessFilter(req.getAccessFilter("loans"));
  }

  return {};
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

const validateAdminBranchAccessForPayload = (req: any, payload: any) => {
  const role = req.admin?.role;

  if (!req.admin) return "";

  if (isFullAdmin(role)) return "";

  const adminBranches = getAdminBranchValues(req.admin);
  const adminIfscList = getAdminIfscValues(req.admin);

  const loanBranch = normalizeText(
    payload.branch || payload.branchName || payload.assignedBranch
  );

  const loanIfsc = normalizeText(payload.ifsc || payload.ifscCode || payload.IFSC);

  if (!adminBranches.length && !adminIfscList.length) {
    return "Your admin account has no branch assigned. Please contact Super Admin.";
  }

  const branchMatches =
    loanBranch && adminBranches.some((branch: string) => branch === loanBranch);

  const ifscMatches =
    loanIfsc && adminIfscList.some((ifsc: string) => ifsc === loanIfsc);

  if (branchMatches || ifscMatches) return "";

  return "Access denied. You can manage loans only for your assigned branch.";
};

const validateLoan = (body: any, isEdit = false) => {
  const customer =
    body.customer || body.customerName || body.fullName || body.name;
  const accountNumber = body.accountNumber;
  const type = body.type || body.loanType;
  const amount = body.amount || body.loanAmount;
  const interest = body.interest || body.interestRate;
  const startDate = body.startDate;
  const endDate = body.endDate;
  const emi = body.emi;
  const paid = body.paid;
  const pending = body.pending;

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
      return "Loan type is required";
    }
  }

  if (!isEdit || amount !== undefined) {
    const numberValue = moneyToNumber(amount);

    if (Number.isNaN(numberValue)) {
      return "Loan amount must be a valid number";
    }

    if (numberValue <= 0) {
      return "Loan amount must be greater than 0";
    }
  }

  if (!isEdit || interest !== undefined) {
    const numberValue = Number(
      String(interest || "").replace(/%/g, "").trim()
    );

    if (Number.isNaN(numberValue)) {
      return "Interest rate must be a valid number";
    }

    if (numberValue < 0 || numberValue > 100) {
      return "Interest rate must be between 0 and 100";
    }
  }

  if (!isEdit || startDate !== undefined) {
    if (!isValidDate(startDate)) {
      return "Start date is required";
    }
  }

  if (!isEdit || endDate !== undefined) {
    if (!isValidDate(endDate)) {
      return "End date is required";
    }
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return "End date cannot be before start date";
    }
  }

  if (emi !== undefined && String(emi || "").trim()) {
    const numberValue = moneyToNumber(emi);

    if (Number.isNaN(numberValue)) {
      return "Monthly EMI must be a valid number";
    }

    if (numberValue < 0) {
      return "Monthly EMI cannot be negative";
    }
  }

  if (paid !== undefined && String(paid || "").trim()) {
    const numberValue = moneyToNumber(paid);

    if (Number.isNaN(numberValue)) {
      return "Paid amount must be a valid number";
    }

    if (numberValue < 0) {
      return "Paid amount cannot be negative";
    }
  }

  if (pending !== undefined && String(pending || "").trim()) {
    const numberValue = moneyToNumber(pending);

    if (Number.isNaN(numberValue)) {
      return "Pending amount must be a valid number";
    }

    if (numberValue < 0) {
      return "Pending amount cannot be negative";
    }
  }

  return "";
};

const normalizeLoanPayload = (body: any) => {
  const payload: any = { ...body };

  payload.customer = String(
    payload.customer ||
      payload.customerName ||
      payload.fullName ||
      payload.name ||
      ""
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

  payload.type = String(payload.type || payload.loanType || "").trim();
  payload.loanType = String(payload.loanType || payload.type || "").trim();

  if (payload.interest !== undefined || payload.interestRate !== undefined) {
    payload.interest = String(payload.interest || payload.interestRate || "")
      .replace(/%/g, "")
      .trim();
    payload.interestRate = payload.interest;
  }

  if (payload.amount !== undefined || payload.loanAmount !== undefined) {
    payload.amount = cleanMoney(payload.amount || payload.loanAmount);
    payload.loanAmount = payload.amount;
  }

  if (payload.emi !== undefined) {
    payload.emi = cleanMoney(payload.emi);
  }

  if (payload.paid !== undefined) {
    payload.paid = cleanMoney(payload.paid);
  }

  if (payload.pending !== undefined || payload.totalPayable !== undefined) {
    payload.pending = cleanMoney(payload.pending || payload.totalPayable);
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

  if (payload.cif !== undefined || payload.cifNumber !== undefined) {
    payload.cif = String(payload.cif || payload.cifNumber || "")
      .toUpperCase()
      .trim();
    payload.cifNumber = payload.cif;
  }

  if (payload.officer !== undefined) {
    payload.officer = String(payload.officer || "").trim();
  }

  return payload;
};

const buildQueryFilter = (query: any) => {
  const filter: any = {};

  if (query.type || query.loanType) {
    const type = String(query.type || query.loanType);
    filter.$or = [{ type }, { loanType: type }];
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.branch) {
    const branch = String(query.branch);
    const branchOr = [
      { branch },
      { branchName: branch },
      { ifsc: branch },
      { ifscCode: branch },
    ];

    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: branchOr }];
      delete filter.$or;
    } else {
      filter.$or = branchOr;
    }
  }

  if (query.search || query.q) {
    const search = String(query.search || query.q || "").trim();

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      const searchOr = [
        { id: regex },
        { loanId: regex },
        { customer: regex },
        { customerName: regex },
        { email: regex },
        { customerEmail: regex },
        { userEmail: regex },
        { accountNumber: regex },
        { type: regex },
        { loanType: regex },
        { officer: regex },
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

const findAdminFromToken = async (req: any) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) return null;

    const token = authHeader.split(" ")[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);

    const searchConditions: any[] = [];

    if (decoded.id) {
      searchConditions.push({ id: decoded.id });
      searchConditions.push({ adminId: decoded.id });

      if (mongoose.Types.ObjectId.isValid(decoded.id)) {
        searchConditions.push({ _id: decoded.id });
      }
    }

    if (decoded._id) {
      searchConditions.push({ id: decoded._id });
      searchConditions.push({ adminId: decoded._id });

      if (mongoose.Types.ObjectId.isValid(decoded._id)) {
        searchConditions.push({ _id: decoded._id });
      }
    }

    if (decoded.userId) {
      searchConditions.push({ id: decoded.userId });
      searchConditions.push({ adminId: decoded.userId });

      if (mongoose.Types.ObjectId.isValid(decoded.userId)) {
        searchConditions.push({ _id: decoded.userId });
      }
    }

    if (decoded.email) {
      searchConditions.push({ email: decoded.email });
    }

    if (!searchConditions.length) return null;

    const admin = await Admin.findOne({
      $and: [
        { $or: searchConditions },
        {
          $or: [
            { status: { $exists: false } },
            { status: /^active$/i },
            { status: "Active" },
          ],
        },
      ],
    })
      .select("-password -__v -createdAt -updatedAt")
      .lean();

    if (!admin) return null;

    req.admin = {
      ...admin,
      ...getAdminIdentity(admin),
    };

    req.getAccessFilter = (moduleName: string) => {
      return buildAccessFilterFromMiddleware(req.admin, moduleName);
    };

    req.canAccessModule = (moduleName: string) => {
      return canAccessModule(req.admin.role, moduleName);
    };

    return req.admin;
  } catch {
    return null;
  }
};

const findAccessibleLoanById = async (req: any, id: string) => {
  const accessFilter = getLoanAccessFilter(req);
  const baseOr: any[] = [{ id }, { loanId: id }];

  if (mongoose.Types.ObjectId.isValid(id)) {
    baseOr.push({ _id: id });
  }

  const finalFilter = mergeFilters({ $or: baseOr }, accessFilter);

  return Loan.findOne(finalFilter).select("-_id -__v").lean();
};

router.get(
  "/",
  protectAdmin,
  requireModuleAccess("loans"),
  async (req: any, res: any) => {
    try {
      const queryFilter = buildQueryFilter(req.query);
      const accessFilter = getLoanAccessFilter(req);
      const finalFilter = mergeFilters(queryFilter, accessFilter);

      const loans = await Loan.find(finalFilter)
        .select("-_id -__v")
        .sort({ createdAt: -1, id: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        count: loans.length,
        data: loans,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch loans",
        error: getErrorMessage(error),
      });
    }
  }
);

router.get(
  "/:id",
  protectAdmin,
  requireModuleAccess("loans"),
  async (req: any, res: any) => {
    try {
      const loan = await findAccessibleLoanById(req, req.params.id);

      if (!loan) {
        return res.status(404).json({
          success: false,
          message: "Loan not found or you do not have access.",
        });
      }

      return res.status(200).json({
        success: true,
        data: loan,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch loan",
        error: getErrorMessage(error),
      });
    }
  }
);

router.post("/", async (req: any, res: any) => {
  try {
    await findAdminFromToken(req);

    if (req.admin) {
      if (!canAccessModule(req.admin.role, "loans")) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Your role cannot access loans.",
        });
      }

      if (!canWriteLoan(req.admin.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Your role cannot create loans.",
        });
      }
    }

    const validationError = validateLoan(req.body, false);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const payload = normalizeLoanPayload(req.body);

    if (req.admin) {
      const branchAccessError = validateAdminBranchAccessForPayload(req, payload);

      if (branchAccessError) {
        return res.status(403).json({
          success: false,
          message: branchAccessError,
        });
      }

      if (isLoanRole(req.admin.role)) {
        const identity = getAdminIdentity(req.admin);
        payload.officer = identity.name;
        payload.officerEmail = identity.email;
        payload.officerId = identity.id;
        payload.loanOfficer = identity.name;
        payload.loanOfficerEmail = identity.email;
        payload.loanOfficerId = identity.id;
      }
    }

    const loan = await Loan.create({
      id: generateLoanId(),
      loanId: generateLoanId(),

      customer: payload.customer,
      customerName: payload.customerName || payload.customer,
      fullName: payload.fullName || payload.customer,

      email: payload.email || "",
      customerEmail: payload.customerEmail || payload.email || "",
      userEmail: payload.userEmail || payload.email || "",
      phone: payload.phone || "",

      customerId: payload.customerId || "",
      accountNumber: payload.accountNumber,
      accountType: payload.accountType || "",

      branch: payload.branch || "",
      branchName: payload.branchName || payload.branch || "",
      ifsc: payload.ifsc || "",
      ifscCode: payload.ifscCode || payload.ifsc || "",
      cif: payload.cif || "",
      cifNumber: payload.cifNumber || payload.cif || "",

      type: payload.type,
      loanType: payload.loanType || payload.type,

      amount: payload.amount,
      loanAmount: payload.loanAmount || payload.amount,
      monthlyIncome: payload.monthlyIncome || 0,
      employmentType: payload.employmentType || "",
      tenure: payload.tenure || "",
      tenureMonths: payload.tenureMonths || "",

      interest: payload.interest,
      interestRate: payload.interestRate || payload.interest,

      startDate: payload.startDate,
      endDate: payload.endDate,
      appliedDate:
        payload.appliedDate || new Date().toLocaleDateString("en-IN"),

      emi: payload.emi || "₹0",
      paid: payload.paid || "₹0",
      pending: payload.pending || "₹0",
      totalPayable: payload.totalPayable || payload.pending || "₹0",

      purpose: payload.purpose || "",
      address: payload.address || "",
      existingLoan: payload.existingLoan || "No",

      officer: payload.officer || "",
      officerEmail: payload.officerEmail || "",
      officerId: payload.officerId || "",
      loanOfficer: payload.loanOfficer || payload.officer || "",
      loanOfficerEmail: payload.loanOfficerEmail || payload.officerEmail || "",
      loanOfficerId: payload.loanOfficerId || payload.officerId || "",

      status: payload.status || "Pending",

      createdBy: req.admin?.email || payload.email || "",
      createdByRole: req.admin?.role || "Customer",
    });

    const savedLoan = await Loan.findOne({ id: loan.id })
      .select("-_id -__v")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Loan created successfully",
      data: savedLoan,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
      error: getErrorMessage(error),
    });
  }
});

router.put(
  "/:id",
  protectAdmin,
  requireModuleAccess("loans"),
  async (req: any, res: any) => {
    try {
      if (!canWriteLoan(req.admin?.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Your role cannot edit loans.",
        });
      }

      const { id } = req.params;

      const existingLoan = await findAccessibleLoanById(req, id);

      if (!existingLoan) {
        return res.status(404).json({
          success: false,
          message: "Loan not found or you do not have access.",
        });
      }

      const bodyWithOldDates = {
        ...req.body,
        oldStartDate: existingLoan.startDate,
        oldEndDate: existingLoan.endDate,
      };

      const validationError = validateLoan(bodyWithOldDates, true);

      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError,
        });
      }

      const updateData = normalizeLoanPayload(req.body);

      const branchCheckPayload = {
        ...existingLoan,
        ...updateData,
      };

      const branchAccessError = validateAdminBranchAccessForPayload(
        req,
        branchCheckPayload
      );

      if (branchAccessError) {
        return res.status(403).json({
          success: false,
          message: branchAccessError,
        });
      }

      if (isLoanRole(req.admin?.role)) {
        const identity = getAdminIdentity(req.admin);

        updateData.officer = identity.name;
        updateData.officerEmail = identity.email;
        updateData.officerId = identity.id;
        updateData.loanOfficer = identity.name;
        updateData.loanOfficerEmail = identity.email;
        updateData.loanOfficerId = identity.id;
      }

      const finalStartDate = updateData.startDate || existingLoan.startDate;
      const finalEndDate = updateData.endDate || existingLoan.endDate;

      if (finalStartDate && finalEndDate) {
        const start = new Date(finalStartDate);
        const end = new Date(finalEndDate);

        if (end < start) {
          return res.status(400).json({
            success: false,
            message: "End date cannot be before start date",
          });
        }
      }

      const accessFilter = getLoanAccessFilter(req);

      const baseOr: any[] = [{ id }, { loanId: id }];

      if (mongoose.Types.ObjectId.isValid(id)) {
        baseOr.push({ _id: id });
      }

      const finalFilter = mergeFilters({ $or: baseOr }, accessFilter);

      const loan = await Loan.findOneAndUpdate(finalFilter, updateData, {
        new: true,
        runValidators: true,
        context: "query",
      })
        .select("-_id -__v")
        .lean();

      return res.status(200).json({
        success: true,
        message: "Loan updated successfully",
        data: loan,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: getErrorMessage(error),
        error: getErrorMessage(error),
      });
    }
  }
);

router.delete(
  "/:id",
  protectAdmin,
  requireModuleAccess("loans"),
  async (req: any, res: any) => {
    try {
      if (!canDeleteLoan(req.admin?.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Your role cannot delete loans.",
        });
      }

      const { id } = req.params;

      const accessFilter = getLoanAccessFilter(req);

      const baseOr: any[] = [{ id }, { loanId: id }];

      if (mongoose.Types.ObjectId.isValid(id)) {
        baseOr.push({ _id: id });
      }

      const finalFilter = mergeFilters({ $or: baseOr }, accessFilter);

      const loan = await Loan.findOneAndDelete(finalFilter)
        .select("-_id -__v")
        .lean();

      if (!loan) {
        return res.status(404).json({
          success: false,
          message: "Loan not found or you do not have access.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Loan deleted successfully",
        data: loan,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete loan",
        error: getErrorMessage(error),
      });
    }
  }
);

module.exports = router;