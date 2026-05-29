const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Branch = require("../models/Branch");
const Admin = require("../models/Admin");

const authMiddleware = require("../middleware/authMiddleware");
const protectAdmin = authMiddleware.protectAdmin || authMiddleware;
const buildAccessFilterFromMiddleware =
  authMiddleware.buildAccessFilter || (() => ({}));

console.log("✅ SECURE FINSECURE BRANCH ROUTES LOADED");

const router = express.Router();

const FINSECURE_IFSC_REGEX = /^FINS0[A-Z0-9]{6}$/;

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.SECRET_KEY ||
  process.env.JWT_PRIVATE_KEY ||
  "finsecure_ai_default_secret";

const generateBranchId = () => {
  return `BRN${Date.now()}`;
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

const isBranchManager = (role: any) => {
  const cleanRole = normalizeRole(role);
  return cleanRole === "branch manager" || cleanRole === "manager";
};

const canViewBranches = (role: any) => {
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
    "cashier",
    "customer support",
    "customer support executive",
    "fraud analyst",
    "report analyst",
    "staff",
  ].includes(cleanRole);
};

const canCreateBranch = (role: any) => {
  return isAdmin(role);
};

const canEditBranch = (role: any) => {
  return isAdmin(role) || isBranchManager(role);
};

const canDeleteBranch = (role: any) => {
  return isAdmin(role);
};

const cleanMoney = (value: any) => {
  const clean = String(value || "")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .trim();

  if (clean === "") return "₹0";

  const numberValue = Number(clean);

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
    return "Duplicate branch data found";
  }

  return error?.message || "Something went wrong";
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

const buildOwnBranchFilter = (admin: any) => {
  const adminBranches = getAdminBranchValues(admin);
  const adminIfscList = getAdminIfscValues(admin);

  const orConditions: any[] = [];

  adminBranches.forEach((branch: string) => {
    orConditions.push({ name: branch });
    orConditions.push({ branchName: branch });
    orConditions.push({ code: branch });
    orConditions.push({ branchCode: branch });
    orConditions.push({ id: branch });
    orConditions.push({ branchId: branch });
  });

  adminIfscList.forEach((ifsc: string) => {
    orConditions.push({ ifsc });
    orConditions.push({ ifscCode: ifsc });
    orConditions.push({ IFSC: ifsc });
  });

  if (!orConditions.length) {
    return noAccessFilter();
  }

  return { $or: orConditions };
};

const buildBranchAccessFilter = (req: any) => {
  const role = req.admin?.role;

  if (!req.admin) {
    return {};
  }

  if (isAdmin(role)) {
    return {};
  }

  if (!canViewBranches(role)) {
    return noAccessFilter();
  }

  if (req.getAccessFilter) {
    const middlewareFilter = req.getAccessFilter("branches");

    if (middlewareFilter && Object.keys(middlewareFilter).length > 0) {
      return sanitizeAccessFilter(middlewareFilter);
    }
  }

  return buildOwnBranchFilter(req.admin);
};

const validateAdminBranchAccessForPayload = (req: any, payload: any) => {
  const role = req.admin?.role;

  if (isAdmin(role)) return "";

  const adminBranches = getAdminBranchValues(req.admin);
  const adminIfscList = getAdminIfscValues(req.admin);

  const branchName = normalizeText(
    payload.name || payload.branchName || payload.code || payload.branchCode
  );

  const branchIfsc = normalizeText(payload.ifsc || payload.ifscCode || payload.IFSC);

  if (!adminBranches.length && !adminIfscList.length) {
    return "Your admin account has no branch assigned. Please contact Super Admin.";
  }

  const branchMatches =
    branchName && adminBranches.some((branch: string) => branch === branchName);

  const ifscMatches =
    branchIfsc && adminIfscList.some((ifsc: string) => ifsc === branchIfsc);

  if (branchMatches || ifscMatches) return "";

  return "Access denied. You can manage only your assigned branch.";
};

const validateBranch = (body: any, isEdit = false) => {
  const name = body.name;
  const address = body.address;
  const ifsc = body.ifsc;
  const manager = body.manager;
  const employees = body.employees;
  const customers = body.customers;
  const balance = body.balance;
  const loans = body.loans;

  if (!isEdit || name !== undefined) {
    if (!String(name || "").trim()) {
      return "Branch name is required";
    }
  }

  if (!isEdit || address !== undefined) {
    if (!String(address || "").trim()) {
      return "Branch address is required";
    }
  }

  if (!isEdit || ifsc !== undefined) {
    const ifscValue = String(ifsc || "").toUpperCase().trim();

    if (!ifscValue) {
      return "IFSC code is required";
    }

    if (!FINSECURE_IFSC_REGEX.test(ifscValue)) {
      return "IFSC code must be like FINS0001001";
    }
  }

  if (!isEdit || manager !== undefined) {
    if (!String(manager || "").trim()) {
      return "Branch manager is required";
    }
  }

  if (employees !== undefined) {
    const numberValue = Number(employees);

    if (Number.isNaN(numberValue)) {
      return "Employees count must be a valid number";
    }

    if (numberValue < 0) {
      return "Employees count cannot be negative";
    }
  }

  if (customers !== undefined) {
    const numberValue = Number(customers);

    if (Number.isNaN(numberValue)) {
      return "Customers count must be a valid number";
    }

    if (numberValue < 0) {
      return "Customers count cannot be negative";
    }
  }

  if (balance !== undefined && String(balance || "").trim()) {
    const clean = String(balance)
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .trim();

    if (clean && Number.isNaN(Number(clean))) {
      return "Total balance must be a valid number";
    }
  }

  if (loans !== undefined && String(loans || "").trim()) {
    const clean = String(loans)
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .trim();

    if (clean && Number.isNaN(Number(clean))) {
      return "Total loans must be a valid number";
    }
  }

  return "";
};

const normalizeBranchPayload = (body: any) => {
  const payload: any = { ...body };

  if (payload.name !== undefined || payload.branchName !== undefined) {
    payload.name = String(payload.name || payload.branchName || "").trim();
    payload.branchName = payload.name;
  }

  if (payload.address !== undefined || payload.location !== undefined) {
    payload.address = String(payload.address || payload.location || "").trim();
    payload.location = payload.address;
  }

  if (payload.ifsc !== undefined || payload.ifscCode !== undefined) {
    payload.ifsc = String(payload.ifsc || payload.ifscCode || "")
      .toUpperCase()
      .trim();
    payload.ifscCode = payload.ifsc;
  }

  if (payload.manager !== undefined || payload.managerName !== undefined) {
    payload.manager = String(payload.manager || payload.managerName || "").trim();
    payload.managerName = payload.manager;
  }

  if (payload.employees !== undefined) {
    payload.employees = Number(payload.employees || 0);
  }

  if (payload.customers !== undefined) {
    payload.customers = Number(payload.customers || 0);
  }

  if (payload.balance !== undefined) {
    payload.balance = cleanMoney(payload.balance);
  }

  if (payload.loans !== undefined) {
    payload.loans = cleanMoney(payload.loans);
  }

  if (payload.status !== undefined) {
    payload.status = String(payload.status || "Active").trim();
  }

  return payload;
};

const buildQueryFilter = (query: any) => {
  const filter: any = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search || query.q) {
    const search = String(query.search || query.q || "").trim();

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      filter.$or = [
        { id: regex },
        { branchId: regex },
        { name: regex },
        { branchName: regex },
        { address: regex },
        { location: regex },
        { ifsc: regex },
        { ifscCode: regex },
        { manager: regex },
        { managerName: regex },
        { status: regex },
      ];
    }
  }

  return filter;
};

const findAdminFromTokenOptional = async (req: any) => {
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

    return req.admin;
  } catch {
    return null;
  }
};

const findAccessibleBranchById = async (req: any, id: string) => {
  const accessFilter = buildBranchAccessFilter(req);

  const baseOr: any[] = [
    { id },
    { branchId: id },
    { ifsc: id },
    { ifscCode: id },
    { name: id },
    { branchName: id },
  ];

  if (mongoose.Types.ObjectId.isValid(id)) {
    baseOr.push({ _id: id });
  }

  const finalFilter = mergeFilters({ $or: baseOr }, accessFilter);

  return Branch.findOne(finalFilter).select("-_id -__v").lean();
};

router.get("/", async (req: any, res: any) => {
  try {
    await findAdminFromTokenOptional(req);

    const queryFilter = buildQueryFilter(req.query);
    const accessFilter = buildBranchAccessFilter(req);
    const finalFilter = mergeFilters(queryFilter, accessFilter);

    const branches = await Branch.find(finalFilter)
      .select("-_id -__v")
      .sort({ createdAt: -1, id: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: branches.length,
      data: branches,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch branches",
      error: getErrorMessage(error),
    });
  }
});

router.get("/:id", async (req: any, res: any) => {
  try {
    await findAdminFromTokenOptional(req);

    const branch = await findAccessibleBranchById(req, req.params.id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found or you do not have access.",
      });
    }

    return res.status(200).json({
      success: true,
      data: branch,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch branch",
      error: getErrorMessage(error),
    });
  }
});

router.post("/", protectAdmin, async (req: any, res: any) => {
  try {
    if (!canCreateBranch(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Super Admin/Admin can create branches.",
      });
    }

    const validationError = validateBranch(req.body, false);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const payload = normalizeBranchPayload(req.body);

    const branch = await Branch.create({
      id: generateBranchId(),
      branchId: generateBranchId(),
      name: payload.name,
      branchName: payload.branchName || payload.name,
      address: payload.address,
      location: payload.location || payload.address,
      ifsc: payload.ifsc,
      ifscCode: payload.ifscCode || payload.ifsc,
      manager: payload.manager,
      managerName: payload.managerName || payload.manager,
      employees: payload.employees || 0,
      customers: payload.customers || 0,
      balance: payload.balance || "₹0",
      loans: payload.loans || "₹0",
      status: payload.status || "Active",
      createdBy: req.admin?.email || req.admin?.name || "",
      createdByRole: req.admin?.role || "",
    });

    const savedBranch = await Branch.findOne({ id: branch.id })
      .select("-_id -__v")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: savedBranch,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
      error: getErrorMessage(error),
    });
  }
});

router.put("/:id", protectAdmin, async (req: any, res: any) => {
  try {
    if (!canEditBranch(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your role cannot edit branches.",
      });
    }

    const { id } = req.params;

    const existingBranch = await findAccessibleBranchById(req, id);

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found or you do not have access.",
      });
    }

    const validationError = validateBranch(req.body, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const updateData = normalizeBranchPayload(req.body);

    const branchCheckPayload = {
      ...existingBranch,
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

    const accessFilter = buildBranchAccessFilter(req);

    const baseOr: any[] = [{ id }, { branchId: id }];

    if (mongoose.Types.ObjectId.isValid(id)) {
      baseOr.push({ _id: id });
    }

    const finalFilter = mergeFilters({ $or: baseOr }, accessFilter);

    const branch = await Branch.findOneAndUpdate(finalFilter, updateData, {
      new: true,
      runValidators: true,
      context: "query",
    })
      .select("-_id -__v")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Branch updated successfully",
      data: branch,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
      error: getErrorMessage(error),
    });
  }
});

router.delete("/:id", protectAdmin, async (req: any, res: any) => {
  try {
    if (!canDeleteBranch(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Super Admin/Admin can delete branches.",
      });
    }

    const { id } = req.params;

    const baseOr: any[] = [{ id }, { branchId: id }];

    if (mongoose.Types.ObjectId.isValid(id)) {
      baseOr.push({ _id: id });
    }

    const branch = await Branch.findOneAndDelete({ $or: baseOr })
      .select("-_id -__v")
      .lean();

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Branch deleted successfully",
      data: branch,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete branch",
      error: getErrorMessage(error),
    });
  }
});

module.exports = router;