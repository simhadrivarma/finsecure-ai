
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

/*
 * This value must exactly match the JWT secret used in app.ts
 * when generating the login token.
 */
const JWT_SECRET =
  process.env.JWT_SECRET || "finsecure_ai_secret_key";

const normalizeText = (value: any): string => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

const normalizeRole = (value: any): string => {
  return normalizeText(value)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
};

const normalizeModuleName = (value: any): string => {
  return String(value ?? "")
    .trim()
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .toLowerCase();
};

const isSuperAdminRole = (role: any): boolean => {
  const normalizedRole = normalizeRole(role);

  return [
    "super admin",
    "superadmin",
    "super",
  ].includes(normalizedRole);
};

const isFullAdminRole = (role: any): boolean => {
  const normalizedRole = normalizeRole(role);

  return (
    isSuperAdminRole(normalizedRole) ||
    normalizedRole === "admin"
  );
};

/*
 * Module permissions by role.
 */
const MODULE_PERMISSIONS: Record<string, string[]> = {
  "super admin": [
    "dashboard",
    "admins",
    "audit logs",
    "employees",
    "branches",
    "customers",
    "loans",
    "transactions",
    "ai insights",
    "reports",
    "settings",
  ],

  superadmin: [
    "dashboard",
    "admins",
    "audit logs",
    "employees",
    "branches",
    "customers",
    "loans",
    "transactions",
    "ai insights",
    "reports",
    "settings",
  ],

  super: [
    "dashboard",
    "admins",
    "audit logs",
    "employees",
    "branches",
    "customers",
    "loans",
    "transactions",
    "ai insights",
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
    "ai insights",
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

  staff: [
    "dashboard",
    "customers",
    "transactions",
    "reports",
  ],

  cashier: [
    "dashboard",
    "customers",
    "transactions",
  ],

  "loan officer": [
    "dashboard",
    "customers",
    "loans",
    "reports",
  ],

  "loan manager": [
    "dashboard",
    "customers",
    "loans",
    "reports",
  ],

  "customer support": [
    "dashboard",
    "customers",
    "transactions",
  ],

  "customer support executive": [
    "dashboard",
    "customers",
    "transactions",
  ],

  "relationship manager": [
    "dashboard",
    "customers",
    "loans",
    "reports",
  ],

  "admin officer": [
    "dashboard",
    "employees",
    "customers",
    "settings",
  ],

  "fraud analyst": [
    "dashboard",
    "transactions",
    "ai insights",
    "reports",
  ],

  "report analyst": [
    "dashboard",
    "reports",
  ],
};

const canAccessModule = (
  role: any,
  moduleName: string
): boolean => {
  const normalizedRole = normalizeRole(role);
  const normalizedModule = normalizeModuleName(moduleName);

  if (isSuperAdminRole(normalizedRole)) {
    return true;
  }

  const allowedModules =
    MODULE_PERMISSIONS[normalizedRole] || [];

  return allowedModules.includes(normalizedModule);
};

/*
 * Returns a consistent admin identity object.
 */
const getAdminIdentity = (admin: any) => {
  return {
    id:
      admin?.id ||
      admin?.adminId ||
      admin?.employeeId ||
      admin?._id ||
      "",

    adminId:
      admin?.adminId ||
      admin?.id ||
      admin?._id ||
      "",

    employeeId:
      admin?.employeeId ||
      admin?.employeeID ||
      "",

    name:
      admin?.name ||
      admin?.adminName ||
      admin?.employeeName ||
      "",

    email: String(admin?.email || "")
      .trim()
      .toLowerCase(),

    role:
      admin?.role ||
      "Admin",

    branch:
      admin?.branch ||
      admin?.branchName ||
      admin?.assignedBranch ||
      "",

    branchName:
      admin?.branchName ||
      admin?.branch ||
      admin?.assignedBranch ||
      "",

    assignedBranch:
      admin?.assignedBranch ||
      admin?.branch ||
      admin?.branchName ||
      "",

    branchCode:
      admin?.branchCode ||
      admin?.code ||
      "",

    branchId:
      admin?.branchId ||
      "",

    ifsc:
      admin?.ifsc ||
      admin?.ifscCode ||
      admin?.IFSC ||
      "",

    ifscCode:
      admin?.ifscCode ||
      admin?.ifsc ||
      admin?.IFSC ||
      "",

    status:
      admin?.status ||
      "Active",
  };
};

const uniqueNonEmptyValues = (values: any[]): string[] => {
  return [
    ...new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
    ),
  ];
};

/*
 * Limits records to the logged-in admin's branch or IFSC.
 */
const buildBranchAccessFilter = (admin: any) => {
  const identity = getAdminIdentity(admin);

  if (isFullAdminRole(identity.role)) {
    return {};
  }

  const branchValues = uniqueNonEmptyValues([
    identity.branch,
    identity.branchName,
    identity.assignedBranch,
    identity.branchCode,
    identity.branchId,
  ]);

  const ifscValues = uniqueNonEmptyValues([
    identity.ifsc,
    identity.ifscCode,
  ]).map((value) => value.toUpperCase());

  const conditions: any[] = [];

  branchValues.forEach((branchValue) => {
    conditions.push({ branch: branchValue });
    conditions.push({ branchName: branchValue });
    conditions.push({ assignedBranch: branchValue });
    conditions.push({ branchCode: branchValue });
    conditions.push({ branchId: branchValue });
  });

  ifscValues.forEach((ifscValue) => {
    conditions.push({ ifsc: ifscValue });
    conditions.push({ ifscCode: ifscValue });
    conditions.push({ IFSC: ifscValue });
  });

  /*
   * Never return an empty filter for restricted users.
   * An empty filter would expose every record.
   */
  if (conditions.length === 0) {
    return {
      id: "__NO_ACCESS__",
    };
  }

  return {
    $or: conditions,
  };
};

/*
 * Loan officers can access loans assigned to them.
 * The branch condition is applied together with the officer condition.
 */
const buildLoanOfficerFilter = (admin: any) => {
  const identity = getAdminIdentity(admin);
  const branchFilter = buildBranchAccessFilter(admin);

  const officerConditions: any[] = [];

  if (identity.name) {
    officerConditions.push({ loanOfficer: identity.name });
    officerConditions.push({ loanOfficerName: identity.name });
    officerConditions.push({ assignedOfficer: identity.name });
    officerConditions.push({ assignedEmployee: identity.name });
    officerConditions.push({ employee: identity.name });
    officerConditions.push({ employeeName: identity.name });
    officerConditions.push({ officer: identity.name });
  }

  if (identity.email) {
    officerConditions.push({
      loanOfficerEmail: identity.email,
    });

    officerConditions.push({
      assignedOfficerEmail: identity.email,
    });

    officerConditions.push({
      assignedEmployeeEmail: identity.email,
    });

    officerConditions.push({
      employeeEmail: identity.email,
    });

    officerConditions.push({
      officerEmail: identity.email,
    });
  }

  if (identity.employeeId) {
    officerConditions.push({
      loanOfficerId: identity.employeeId,
    });

    officerConditions.push({
      assignedOfficerId: identity.employeeId,
    });

    officerConditions.push({
      assignedEmployeeId: identity.employeeId,
    });

    officerConditions.push({
      employeeId: identity.employeeId,
    });

    officerConditions.push({
      officerId: identity.employeeId,
    });
  }

  if (identity.id) {
    officerConditions.push({
      loanOfficerId: identity.id,
    });

    officerConditions.push({
      assignedOfficerId: identity.id,
    });

    officerConditions.push({
      assignedEmployeeId: identity.id,
    });
  }

  if (officerConditions.length === 0) {
    return {
      id: "__NO_ACCESS__",
    };
  }

  if (
    branchFilter &&
    Object.keys(branchFilter).length > 0 &&
    branchFilter.id !== "__NO_ACCESS__"
  ) {
    return {
      $and: [
        branchFilter,
        {
          $or: officerConditions,
        },
      ],
    };
  }

  return {
    $or: officerConditions,
  };
};

/*
 * Creates a role- and branch-based database filter.
 */
const buildAccessFilter = (
  admin: any,
  moduleName: string
) => {
  const role = normalizeRole(admin?.role);
  const normalizedModule = normalizeModuleName(moduleName);

  if (isFullAdminRole(role)) {
    return {};
  }

  if (
    normalizedModule === "admins" ||
    normalizedModule === "audit logs"
  ) {
    return {
      id: "__NO_ACCESS__",
    };
  }

  if (role === "fraud analyst") {
    if (
      normalizedModule === "transactions" ||
      normalizedModule === "ai insights"
    ) {
      return buildBranchAccessFilter(admin);
    }

    return {
      id: "__NO_ACCESS__",
    };
  }

  if (role === "report analyst") {
    if (normalizedModule === "reports") {
      return buildBranchAccessFilter(admin);
    }

    return {
      id: "__NO_ACCESS__",
    };
  }

  if (
    role === "loan officer" ||
    role === "loan manager"
  ) {
    if (normalizedModule === "loans") {
      return buildLoanOfficerFilter(admin);
    }

    if (normalizedModule === "customers") {
      return buildBranchAccessFilter(admin);
    }

    return {
      id: "__NO_ACCESS__",
    };
  }

  return buildBranchAccessFilter(admin);
};

const getBearerToken = (req: any): string => {
  const authorization = String(
    req.headers?.authorization || ""
  ).trim();

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
};

const buildAdminSearchConditions = (decoded: any) => {
  const conditions: any[] = [];

  const possibleIds = uniqueNonEmptyValues([
    decoded?.id,
    decoded?._id,
    decoded?.userId,
    decoded?.adminId,
    decoded?.employeeId,
  ]);

  possibleIds.forEach((possibleId) => {
    conditions.push({ id: possibleId });
    conditions.push({ adminId: possibleId });
    conditions.push({ employeeId: possibleId });
    conditions.push({ employeeID: possibleId });

    if (mongoose.Types.ObjectId.isValid(possibleId)) {
      conditions.push({
        _id: new mongoose.Types.ObjectId(possibleId),
      });
    }
  });

  const email = String(decoded?.email || "")
    .trim()
    .toLowerCase();

  if (email) {
    conditions.push({ email });
  }

  return conditions;
};

/*
 * Main admin authentication middleware.
 */
const protectAdmin = async (
  req: any,
  res: any,
  next: any
) => {
  try {
    if (typeof next !== "function") {
      return res.status(500).json({
        success: false,
        message:
          "Authentication middleware was mounted incorrectly.",
      });
    }

    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Access denied. Login token is required.",
      });
    }

    const decoded: any = jwt.verify(
      token,
      JWT_SECRET
    );

    const searchConditions =
      buildAdminSearchConditions(decoded);

    if (searchConditions.length === 0) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid token. Admin identity is missing.",
      });
    }

    const admin = await Admin.findOne({
      $and: [
        {
          $or: searchConditions,
        },
        {
          $or: [
            {
              status: {
                $exists: false,
              },
            },
            {
              status: /^active$/i,
            },
          ],
        },
      ],
    })
      .select(
        "-password -__v -createdAt -updatedAt"
      )
      .lean();

    if (!admin) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid token. Admin was not found or is inactive.",
      });
    }

    const identity = getAdminIdentity(admin);

    req.admin = {
      ...admin,
      ...identity,
    };

    /*
     * Some older routes use req.user.
     */
    req.user = req.admin;
    req.adminRole = identity.role;

    req.canAccessModule = (
      moduleName: string
    ): boolean => {
      return canAccessModule(
        identity.role,
        moduleName
      );
    };

    req.getAccessFilter = (
      moduleName: string
    ) => {
      return buildAccessFilter(
        req.admin,
        moduleName
      );
    };

    return next();
  } catch (error: any) {
    console.error(
      "Admin authentication failed:",
      error
    );

    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message:
          "Your login session has expired. Please login again.",
      });
    }

    if (error?.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message:
          "Invalid login token. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      message:
        "Authentication failed. Please login again.",
      error:
        error?.message ||
        "Unknown authentication error",
    });
  }
};

/*
 * Checks whether the logged-in role can access a module.
 */
const requireModuleAccess = (
  moduleName: string
) => {
  return (
    req: any,
    res: any,
    next: any
  ) => {
    try {
      if (typeof next !== "function") {
        return res.status(500).json({
          success: false,
          message:
            "Module middleware was mounted incorrectly.",
        });
      }

      const role =
        req.admin?.role ||
        req.user?.role;

      if (!role) {
        return res.status(401).json({
          success: false,
          message:
            "Admin role is missing. Please login again.",
        });
      }

      if (!canAccessModule(role, moduleName)) {
        return res.status(403).json({
          success: false,
          message:
            `Access denied. Your role cannot access ${moduleName}.`,
        });
      }

      return next();
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Module access validation failed.",
      });
    }
  };
};

/*
 * Allows only the roles supplied to this function.
 */
const requireRole = (
  ...allowedRoles: string[]
) => {
  const normalizedAllowedRoles =
    allowedRoles.map(normalizeRole);

  return (
    req: any,
    res: any,
    next: any
  ) => {
    try {
      if (typeof next !== "function") {
        return res.status(500).json({
          success: false,
          message:
            "Role middleware was mounted incorrectly.",
        });
      }

      const role = normalizeRole(
        req.admin?.role ||
        req.user?.role
      );

      if (
        isSuperAdminRole(role) ||
        normalizedAllowedRoles.includes(role)
      ) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message:
          "Access denied. Your role is not allowed.",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Role validation failed.",
      });
    }
  };
};

/*
 * Compatible with every import style currently used
 * in the FinSecure backend.
 */
module.exports = protectAdmin;

module.exports.default = protectAdmin;
module.exports.protectAdmin = protectAdmin;
module.exports.authMiddleware = protectAdmin;

module.exports.requireModuleAccess =
  requireModuleAccess;

module.exports.requireRole = requireRole;
module.exports.authorizeRoles = requireRole;

module.exports.canAccessModule =
  canAccessModule;

module.exports.buildAccessFilter =
  buildAccessFilter;

module.exports.buildBranchAccessFilter =
  buildBranchAccessFilter;

module.exports.buildLoanOfficerFilter =
  buildLoanOfficerFilter;
module.exports.isSuperAdminRole =
  isSuperAdminRole;