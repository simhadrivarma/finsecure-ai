// @ts-nocheck

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const Employee = require("../models/Employee");

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
};

const normalizeText = (value: any) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const normalizeRole = (value: any) => {
  const role = normalizeText(value)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");

  const aliases: Record<string, string> = {
    superadmin: "super admin",
    super: "super admin",
    "super administrator": "super admin",
    manager: "branch manager",
    "customer support": "customer support executive",
    "support executive": "customer support executive",
    "reports analyst": "report analyst",
    "loan staff": "loan officer",
  };

  return aliases[role] || role;
};

const normalizeModuleName = (value: any) => {
  const moduleName = normalizeText(value)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");

  const aliases: Record<string, string> = {
    admin: "admins",
    employee: "employees",
    branch: "branches",
    customer: "customers",
    loan: "loans",
    transaction: "transactions",
    report: "reports",
    auditlog: "audit logs",
    "audit log": "audit logs",
    ai: "ai insights",
    setting: "settings",
  };

  return aliases[moduleName] || moduleName;
};

const normalizeAction = (value: any) => normalizeText(value || "read");

const NO_ACCESS_FILTER = Object.freeze({ id: "__NO_ACCESS__" });
const noAccessFilter = () => ({ ...NO_ACCESS_FILTER });

const isNoAccessFilter = (filter: any) =>
  Boolean(
    filter &&
      (filter.id === "__NO_ACCESS__" || filter._id === "__NO_ACCESS__")
  );

const isSuperAdminRole = (role: any) => normalizeRole(role) === "super admin";
const isFullAdminRole = (role: any) =>
  ["super admin", "admin"].includes(normalizeRole(role));

/*
 * Complete role/action permission matrix.
 * Every protected route checks this matrix. Frontend menu visibility is only
 * a convenience and is never the security boundary.
 */
const ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  "super admin": {
    "*": [
      "read",
      "create",
      "update",
      "delete",
      "approve",
      "assign",
      "flag",
      "resolve",
      "export",
    ],
  },
  admin: {
    "*": [
      "read",
      "create",
      "update",
      "delete",
      "approve",
      "assign",
      "flag",
      "resolve",
      "export",
    ],
  },
  "branch manager": {
    dashboard: ["read"],
    employees: ["read", "create", "update", "export"],
    branches: ["read", "update", "export"],
    customers: ["read", "create", "update", "export"],
    loans: ["read", "create", "update", "approve", "assign", "export"],
    transactions: ["read", "create", "update", "flag", "export"],
    reports: ["read", "create", "update", "export"],
    settings: ["read", "update"],
  },
  "loan manager": {
    dashboard: ["read"],
    customers: ["read", "export"],
    loans: ["read", "create", "update", "approve", "assign", "export"],
    reports: ["read", "export"],
    settings: ["read", "update"],
  },
  "loan officer": {
    dashboard: ["read"],
    customers: ["read"],
    loans: ["read", "create", "update"],
    settings: ["read", "update"],
  },
  "fraud analyst": {
    dashboard: ["read"],
    customers: ["read"],
    transactions: ["read", "update", "flag", "resolve", "export"],
    "ai insights": ["read"],
    reports: ["read", "export"],
    settings: ["read", "update"],
  },
  "customer support executive": {
    dashboard: ["read"],
    customers: ["read", "update"],
    transactions: ["read"],
    settings: ["read", "update"],
  },
  "report analyst": {
    dashboard: ["read"],
    reports: ["read", "create", "update", "export"],
    settings: ["read", "update"],
  },
  cashier: {
    dashboard: ["read"],
    customers: ["read"],
    transactions: ["read", "create"],
    settings: ["read", "update"],
  },
  "relationship manager": {
    dashboard: ["read"],
    customers: ["read", "update", "export"],
    loans: ["read", "export"],
    reports: ["read", "export"],
    settings: ["read", "update"],
  },
  "admin officer": {
    dashboard: ["read"],
    employees: ["read", "create", "update", "export"],
    branches: ["read"],
    customers: ["read", "create", "update", "export"],
    settings: ["read", "update"],
  },
};

const canPerform = (role: any, moduleName: any, action: any = "read") => {
  const cleanRole = normalizeRole(role);
  const cleanModule = normalizeModuleName(moduleName);
  const cleanAction = normalizeAction(action);
  const rolePermissions = ROLE_PERMISSIONS[cleanRole];

  if (!rolePermissions) return false;

  const actions = rolePermissions[cleanModule] || rolePermissions["*"] || [];
  return actions.includes(cleanAction);
};

const canAccessModule = (role: any, moduleName: any) =>
  canPerform(role, moduleName, "read");

const getAdminIdentity = (admin: any) => ({
  id: admin?.id || admin?.adminId || admin?._id || "",
  adminId: admin?.adminId || admin?.id || admin?._id || "",
  employeeId:
    admin?.employeeId || admin?.employeeID || admin?.staffId || "",
  name: admin?.name || admin?.adminName || admin?.employeeName || "",
  email: String(admin?.email || "").trim().toLowerCase(),
  role: admin?.role || "",
  branch: admin?.branch || admin?.branchName || admin?.assignedBranch || "",
  branchName:
    admin?.branchName || admin?.branch || admin?.assignedBranch || "",
  assignedBranch:
    admin?.assignedBranch || admin?.branch || admin?.branchName || "",
  branchCode: admin?.branchCode || admin?.code || "",
  branchId: admin?.branchId || "",
  ifsc: String(admin?.ifsc || admin?.ifscCode || admin?.IFSC || "")
    .trim()
    .toUpperCase(),
  ifscCode: String(admin?.ifscCode || admin?.ifsc || admin?.IFSC || "")
    .trim()
    .toUpperCase(),
  status: admin?.status || "Active",
});

const uniqueValues = (values: any[]) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

const escapeRegExp = (value: any) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const exactInsensitive = (value: any) =>
  new RegExp(`^${escapeRegExp(value)}$`, "i");

const mergeFilters = (...filters: any[]) => {
  const usable = filters.filter(
    (filter) => filter && Object.keys(filter).length > 0
  );

  if (usable.some(isNoAccessFilter)) return noAccessFilter();
  if (usable.length === 0) return {};
  if (usable.length === 1) return usable[0];
  return { $and: usable };
};

const buildBranchAccessFilter = (
  admin: any,
  options: {
    branchFields?: string[];
    ifscFields?: string[];
    idFields?: string[];
  } = {}
) => {
  const identity = getAdminIdentity(admin);

  if (isFullAdminRole(identity.role)) return {};

  const branchFields = options.branchFields || [
    "branch",
    "branchName",
    "assignedBranch",
    "branchCode",
    "branchId",
  ];
  const ifscFields = options.ifscFields || ["ifsc", "ifscCode", "IFSC"];
  const idFields = options.idFields || [];

  const branchValues = uniqueValues([
    identity.branch,
    identity.branchName,
    identity.assignedBranch,
    identity.branchCode,
    identity.branchId,
  ]);
  const ifscValues = uniqueValues([identity.ifsc, identity.ifscCode]).map(
    (value) => value.toUpperCase()
  );

  const conditions: any[] = [];

  branchValues.forEach((value) => {
    branchFields.forEach((field) => {
      conditions.push({ [field]: exactInsensitive(value) });
    });
  });

  ifscValues.forEach((value) => {
    ifscFields.forEach((field) => {
      conditions.push({ [field]: value });
    });
  });

  idFields.forEach((field) => {
    if (identity.branchId) conditions.push({ [field]: identity.branchId });
  });

  return conditions.length ? { $or: conditions } : noAccessFilter();
};

const buildAssignmentFilter = (admin: any, kind: "loan" | "customer") => {
  const identity = getAdminIdentity(admin);
  const conditions: any[] = [];

  const nameFields =
    kind === "loan"
      ? [
          "officer",
          "loanOfficer",
          "loanOfficerName",
          "assignedOfficer",
          "assignedEmployee",
          "employee",
          "employeeName",
        ]
      : [
          "employee",
          "assignedEmployee",
          "relationshipManager",
          "relationshipManagerName",
        ];

  const emailFields =
    kind === "loan"
      ? [
          "officerEmail",
          "loanOfficerEmail",
          "assignedOfficerEmail",
          "assignedEmployeeEmail",
          "employeeEmail",
        ]
      : [
          "employeeEmail",
          "assignedEmployeeEmail",
          "relationshipManagerEmail",
        ];

  const idFields =
    kind === "loan"
      ? [
          "officerId",
          "loanOfficerId",
          "assignedOfficerId",
          "assignedEmployeeId",
          "employeeId",
        ]
      : ["employeeId", "assignedEmployeeId", "relationshipManagerId"];

  if (identity.name) {
    nameFields.forEach((field) =>
      conditions.push({ [field]: exactInsensitive(identity.name) })
    );
  }
  if (identity.email) {
    emailFields.forEach((field) => conditions.push({ [field]: identity.email }));
  }
  uniqueValues([identity.employeeId, identity.id]).forEach((id) => {
    idFields.forEach((field) => conditions.push({ [field]: id }));
  });

  return conditions.length ? { $or: conditions } : noAccessFilter();
};

const buildLoanOfficerFilter = (admin: any) =>
  mergeFilters(
    buildBranchAccessFilter(admin),
    buildAssignmentFilter(admin, "loan")
  );

const buildAccessFilter = (admin: any, moduleName: any) => {
  const role = normalizeRole(admin?.role);
  const module = normalizeModuleName(moduleName);

  if (isFullAdminRole(role)) return {};
  if (!canAccessModule(role, module)) return noAccessFilter();

  if (["admins", "audit logs"].includes(module)) return noAccessFilter();

  if (module === "branches") {
    return buildBranchAccessFilter(admin, {
      branchFields: ["name", "branchName", "code", "branchCode"],
      ifscFields: ["ifsc", "ifscCode", "IFSC"],
      idFields: ["id", "branchId"],
    });
  }

  if (module === "loans") {
    if (role === "loan officer") return buildLoanOfficerFilter(admin);
    if (role === "relationship manager") {
      return mergeFilters(
        buildBranchAccessFilter(admin),
        buildAssignmentFilter(admin, "loan")
      );
    }
  }

  if (module === "customers" && role === "relationship manager") {
    return mergeFilters(
      buildBranchAccessFilter(admin),
      buildAssignmentFilter(admin, "customer")
    );
  }

  return buildBranchAccessFilter(admin);
};

const getBearerToken = (req: any) => {
  const value = String(req.headers?.authorization || "").trim();
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
};

const buildAdminSearchConditions = (decoded: any) => {
  const conditions: any[] = [];
  const ids = uniqueValues([
    decoded?.id,
    decoded?._id,
    decoded?.userId,
    decoded?.adminId,
    decoded?.employeeId,
  ]);

  ids.forEach((id) => {
    conditions.push({ id });
    conditions.push({ adminId: id });
    conditions.push({ employeeId: id });
    if (mongoose.Types.ObjectId.isValid(id)) conditions.push({ _id: id });
  });

  const email = String(decoded?.email || "").trim().toLowerCase();
  if (email) conditions.push({ email });

  return conditions;
};

/*
 * Older admin records were created before branch and employee fields existed.
 * This safely fills missing scope values by matching the corresponding Employee
 * record by employee ID or email. It never grants unrestricted access when no
 * employee match exists.
 */
const hydrateLegacyAdminScope = async (admin: any) => {
  if (!admin || isFullAdminRole(admin.role)) return admin;

  const hasScope = Boolean(
    admin.branch || admin.branchName || admin.ifsc || admin.ifscCode
  );
  const hasEmployeeId = Boolean(admin.employeeId);
  if (hasScope && hasEmployeeId) return admin;

  const conditions: any[] = [];
  if (admin.employeeId) {
    conditions.push({ id: admin.employeeId }, { employeeId: admin.employeeId });
  }
  if (admin.email) conditions.push({ email: String(admin.email).toLowerCase() });

  if (!conditions.length) return admin;

  const employee = await Employee.findOne({ $or: conditions }).lean();
  if (!employee) return admin;

  const branch = employee.branch || employee.branchName || "";
  const ifsc = String(employee.ifsc || employee.ifscCode || "")
    .trim()
    .toUpperCase();

  const update = {
    employeeId: admin.employeeId || employee.employeeId || employee.id || "",
    branch: admin.branch || admin.branchName || branch,
    branchName: admin.branchName || admin.branch || branch,
    assignedBranch: admin.assignedBranch || branch,
    branchCode: admin.branchCode || employee.branchCode || "",
    branchId: admin.branchId || employee.branchId || "",
    ifsc: admin.ifsc || admin.ifscCode || ifsc,
    ifscCode: admin.ifscCode || admin.ifsc || ifsc,
  };

  await Admin.updateOne({ _id: admin._id }, { $set: update });
  return { ...admin, ...update };
};

const protectAdmin = async (req: any, res: any, next: any) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Login token is required.",
      });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    const searchConditions = buildAdminSearchConditions(decoded);

    if (!searchConditions.length) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Admin identity is missing.",
      });
    }

    let admin = await Admin.findOne({
      $and: [
        { $or: searchConditions },
        {
          $or: [{ status: { $exists: false } }, { status: /^active$/i }],
        },
      ],
    })
      .select("-password -__v")
      .lean();

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin account was not found or is inactive.",
      });
    }

    admin = await hydrateLegacyAdminScope(admin);
    const identity = getAdminIdentity(admin);

    req.admin = { ...admin, ...identity };
    req.user = req.admin;
    req.adminRole = identity.role;
    req.permissions = ROLE_PERMISSIONS[normalizeRole(identity.role)] || {};
    req.can = (moduleName: any, action: any = "read") =>
      canPerform(identity.role, moduleName, action);
    req.canAccessModule = (moduleName: any) =>
      canAccessModule(identity.role, moduleName);
    req.getAccessFilter = (moduleName: any) =>
      buildAccessFilter(req.admin, moduleName);

    return next();
  } catch (error: any) {
    const expired = error?.name === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      message: expired
        ? "Your login session has expired. Please login again."
        : "Invalid login token. Please login again.",
    });
  }
};

const requirePermission = (moduleName: any, action: any = "read") =>
  (req: any, res: any, next: any) => {
    const role = req.admin?.role || req.user?.role;
    if (!role) {
      return res.status(401).json({
        success: false,
        message: "Login is required.",
      });
    }

    if (!canPerform(role, moduleName, action)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Your role cannot ${action} ${moduleName}.`,
      });
    }

    return next();
  };

const requireModuleAccess = (moduleName: any) =>
  requirePermission(moduleName, "read");

const requireRole = (...allowedRoles: any[]) => {
  const allowed = allowedRoles.map(normalizeRole);
  return (req: any, res: any, next: any) => {
    const role = normalizeRole(req.admin?.role || req.user?.role);
    if (isSuperAdminRole(role) || allowed.includes(role)) return next();
    return res.status(403).json({
      success: false,
      message: "Access denied. Your role is not allowed.",
    });
  };
};

module.exports = protectAdmin;
module.exports.default = protectAdmin;
module.exports.protectAdmin = protectAdmin;
module.exports.authMiddleware = protectAdmin;
module.exports.requirePermission = requirePermission;
module.exports.requireModuleAccess = requireModuleAccess;
module.exports.requireRole = requireRole;
module.exports.authorizeRoles = requireRole;
module.exports.canPerform = canPerform;
module.exports.canAccessModule = canAccessModule;
module.exports.normalizeRole = normalizeRole;
module.exports.normalizeModuleName = normalizeModuleName;
module.exports.getAdminIdentity = getAdminIdentity;
module.exports.buildAccessFilter = buildAccessFilter;
module.exports.buildBranchAccessFilter = buildBranchAccessFilter;
module.exports.buildLoanOfficerFilter = buildLoanOfficerFilter;
module.exports.buildAssignmentFilter = buildAssignmentFilter;
module.exports.mergeFilters = mergeFilters;
module.exports.noAccessFilter = noAccessFilter;
module.exports.isNoAccessFilter = isNoAccessFilter;
module.exports.isSuperAdminRole = isSuperAdminRole;
module.exports.isFullAdminRole = isFullAdminRole;
module.exports.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
