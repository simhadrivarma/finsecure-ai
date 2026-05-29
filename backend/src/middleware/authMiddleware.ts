const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.SECRET_KEY ||
  process.env.JWT_PRIVATE_KEY ||
  "finsecure_ai_default_secret";

const normalizeText = (value: any) => {
  return String(value || "").toLowerCase().trim();
};

const normalizeRole = (role: any) => {
  return normalizeText(role).replace(/_/g, " ").replace(/-/g, " ");
};

const isSuperAdminRole = (role: any) => {
  const cleanRole = normalizeRole(role);

  return (
    cleanRole === "super admin" ||
    cleanRole === "superadmin" ||
    cleanRole === "super"
  );
};

const MODULE_PERMISSIONS: Record<string, string[]> = {
  "super admin": [
    "dashboard",
    "admins",
    "auditLogs",
    "employees",
    "branches",
    "customers",
    "loans",
    "transactions",
    "aiInsights",
    "reports",
    "settings",
  ],

  admin: [
    "dashboard",
    "employees",
    "branches",
    "customers",
    "loans",
    "transactions",
    "aiInsights",
    "reports",
    "settings",
  ],

  "branch manager": [
    "dashboard",
    "branches",
    "customers",
    "loans",
    "transactions",
    "reports",
    "settings",
  ],

  manager: [
    "dashboard",
    "branches",
    "customers",
    "loans",
    "transactions",
    "reports",
    "settings",
  ],

  staff: ["dashboard", "customers", "transactions", "reports"],

  cashier: ["dashboard", "customers", "transactions"],

  "loan officer": ["dashboard", "customers", "loans", "reports"],

  "loan manager": ["dashboard", "customers", "loans", "reports"],

  "customer support": ["dashboard", "customers", "transactions"],

  "customer support executive": ["dashboard", "customers", "transactions"],

  "fraud analyst": ["dashboard", "transactions", "aiInsights", "reports"],

  "report analyst": ["dashboard", "reports"],
};

const canAccessModule = (role: any, moduleName: string) => {
  const cleanRole = normalizeRole(role);
  const cleanModule = String(moduleName || "").trim();

  if (isSuperAdminRole(cleanRole)) return true;

  return MODULE_PERMISSIONS[cleanRole]?.includes(cleanModule) || false;
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

const buildBranchAccessFilter = (admin: any) => {
  const identity = getAdminIdentity(admin);

  const branchValues = [
    identity.branch,
    identity.branchName,
    identity.branchCode,
    identity.branchId,
  ].filter(Boolean);

  const ifscValues = [identity.ifsc].filter(Boolean);

  const orConditions: any[] = [];

  branchValues.forEach((value) => {
    orConditions.push({ branch: value });
    orConditions.push({ branchName: value });
    orConditions.push({ assignedBranch: value });
    orConditions.push({ branchCode: value });
    orConditions.push({ branchId: value });
  });

  ifscValues.forEach((value) => {
    orConditions.push({ ifsc: value });
    orConditions.push({ ifscCode: value });
    orConditions.push({ IFSC: value });
  });

  if (orConditions.length === 0) {
    return {};
  }

  return { $or: orConditions };
};

const buildLoanOfficerFilter = (admin: any) => {
  const identity = getAdminIdentity(admin);
  const branchFilter = buildBranchAccessFilter(admin);

  const officerConditions = [
    { loanOfficer: identity.name },
    { loanOfficerName: identity.name },
    { assignedOfficer: identity.name },
    { assignedEmployee: identity.name },
    { employee: identity.name },
    { employeeName: identity.name },

    { loanOfficerEmail: identity.email },
    { assignedOfficerEmail: identity.email },
    { assignedEmployeeEmail: identity.email },
    { employeeEmail: identity.email },

    { loanOfficerId: identity.id },
    { assignedOfficerId: identity.id },
    { assignedEmployeeId: identity.id },
    { employeeId: identity.id },
  ].filter((condition: any) => {
    const value = Object.values(condition)[0];
    return Boolean(value);
  });

  const finalConditions = [...officerConditions];

  if (branchFilter.$or?.length) {
    finalConditions.push(...branchFilter.$or);
  }

  if (finalConditions.length === 0) return {};

  return { $or: finalConditions };
};

const buildAccessFilter = (admin: any, moduleName: string) => {
  const role = normalizeRole(admin?.role);

  if (isSuperAdminRole(role)) {
    return {};
  }

  if (moduleName === "admins" || moduleName === "auditLogs") {
    return { _id: "__NO_ACCESS__" };
  }

  if (role === "fraud analyst") {
    if (moduleName === "transactions" || moduleName === "aiInsights") {
      return buildBranchAccessFilter(admin);
    }

    return { _id: "__NO_ACCESS__" };
  }

  if (role === "report analyst") {
    if (moduleName === "reports") {
      return buildBranchAccessFilter(admin);
    }

    return { _id: "__NO_ACCESS__" };
  }

  if (role === "loan officer" || role === "loan manager") {
    if (moduleName === "loans") {
      return buildLoanOfficerFilter(admin);
    }

    if (moduleName === "customers") {
      return buildBranchAccessFilter(admin);
    }

    return { _id: "__NO_ACCESS__" };
  }

  return buildBranchAccessFilter(admin);
};

const protectAdmin = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Login token is required.",
      });
    }

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

    if (searchConditions.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Admin identity missing.",
      });
    }

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

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Admin not found or inactive.",
      });
    }

    const identity = getAdminIdentity(admin);

    req.admin = {
      ...admin,
      ...identity,
    };

    req.adminRole = identity.role;

    req.canAccessModule = (moduleName: string) => {
      return canAccessModule(identity.role, moduleName);
    };

    req.getAccessFilter = (moduleName: string) => {
      return buildAccessFilter(req.admin, moduleName);
    };

    next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please login again.",
      error: error.message,
    });
  }
};

const requireModuleAccess = (moduleName: string) => {
  return (req: any, res: any, next: any) => {
    const role = req.admin?.role;

    if (!role) {
      return res.status(401).json({
        success: false,
        message: "Admin role missing. Please login again.",
      });
    }

    if (!canAccessModule(role, moduleName)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Your role cannot access ${moduleName}.`,
      });
    }

    next();
  };
};

const requireRole = (...allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    const role = normalizeRole(req.admin?.role);
    const allowed = allowedRoles.map(normalizeRole);

    if (isSuperAdminRole(role) || allowed.includes(role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Access denied. Your role is not allowed.",
    });
  };
};

module.exports = protectAdmin;
module.exports.protectAdmin = protectAdmin;
module.exports.requireModuleAccess = requireModuleAccess;
module.exports.requireRole = requireRole;
module.exports.canAccessModule = canAccessModule;
module.exports.buildAccessFilter = buildAccessFilter;
module.exports.buildBranchAccessFilter = buildBranchAccessFilter;
module.exports.buildLoanOfficerFilter = buildLoanOfficerFilter;
module.exports.isSuperAdminRole = isSuperAdminRole;