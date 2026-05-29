const express = require("express");
const Employee = require("../models/Employee");

const authMiddleware = require("../middleware/authMiddleware");
const protectAdmin = authMiddleware.protectAdmin || authMiddleware;

console.log("✅ SECURE FINSECURE EMPLOYEE ROUTES LOADED");

const router = express.Router();

const FINSECURE_IFSC_REGEX = /^FINS0[A-Z0-9]{6}$/;

const generateEmployeeId = () => {
  return `EMP${Date.now()}`;
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

const canViewEmployees = (role: any) => {
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

const canWriteEmployees = (role: any) => {
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

const canDeleteEmployees = (role: any) => {
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

const getErrorMessage = (error: any) => {
  if (error?.name === "ValidationError") {
    const firstError = Object.values(error.errors || {})[0] as any;
    return firstError?.message || "Validation failed";
  }

  if (error?.code === 11000) {
    return "Duplicate employee data found";
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

const buildEmployeeAccessFilter = (req: any) => {
  const role = req.admin?.role;

  if (isAdmin(role)) {
    return {};
  }

  if (!canViewEmployees(role)) {
    return noAccessFilter();
  }

  if (req.getAccessFilter) {
    const middlewareFilter = req.getAccessFilter("employees");

    if (middlewareFilter && Object.keys(middlewareFilter).length > 0) {
      return sanitizeAccessFilter(middlewareFilter);
    }
  }

  const adminBranches = getAdminBranchValues(req.admin);
  const adminIfscList = getAdminIfscValues(req.admin);

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
  });

  if (!orConditions.length) {
    return noAccessFilter();
  }

  return { $or: orConditions };
};

const validateAdminBranchAccessForPayload = (req: any, payload: any) => {
  const role = req.admin?.role;

  if (isAdmin(role)) return "";

  const adminBranches = getAdminBranchValues(req.admin);
  const adminIfscList = getAdminIfscValues(req.admin);

  const employeeBranch = normalizeText(
    payload.branch || payload.branchName || payload.assignedBranch
  );

  const employeeIfsc = normalizeText(payload.ifsc || payload.ifscCode || payload.IFSC);

  if (!adminBranches.length && !adminIfscList.length) {
    return "Your admin account has no branch assigned. Please contact Super Admin.";
  }

  const branchMatches =
    employeeBranch &&
    adminBranches.some((branch: string) => branch === employeeBranch);

  const ifscMatches =
    employeeIfsc && adminIfscList.some((ifsc: string) => ifsc === employeeIfsc);

  if (branchMatches || ifscMatches) return "";

  return "Access denied. You can manage employees only for your assigned branch.";
};

const validateEmployee = (body: any, isEdit = false) => {
  const name = body.name;
  const role = body.role;
  const email = body.email;
  const phone = body.phone;
  const branch = body.branch;
  const ifsc = body.ifsc;
  const customers = body.customers;

  if (!isEdit || name !== undefined) {
    if (!String(name || "").trim()) {
      return "Employee name is required";
    }
  }

  if (!isEdit || role !== undefined) {
    if (!String(role || "").trim()) {
      return "Employee role is required";
    }
  }

  if (!isEdit || email !== undefined) {
    const emailValue = String(email || "").trim();

    if (!emailValue) {
      return "Email is required";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      return "Please enter a valid email address";
    }
  }

  if (!isEdit || phone !== undefined) {
    const digits = String(phone || "").replace(/\D/g, "");

    if (!digits) {
      return "Phone number is required";
    }

    if (digits.length !== 10) {
      return "Phone number must be exactly 10 digits";
    }
  }

  if (!isEdit || branch !== undefined) {
    if (!String(branch || "").trim()) {
      return "Branch name is required";
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

  if (customers !== undefined) {
    const numberValue = Number(customers);

    if (Number.isNaN(numberValue)) {
      return "Customers managed must be a valid number";
    }

    if (numberValue < 0) {
      return "Customers managed cannot be negative";
    }
  }

  return "";
};

const normalizeEmployeePayload = (body: any) => {
  const payload: any = { ...body };

  if (payload.name !== undefined) {
    payload.name = String(payload.name || "").trim();
  }

  if (payload.role !== undefined) {
    payload.role = String(payload.role || "").trim();
  }

  if (payload.email !== undefined) {
    payload.email = String(payload.email || "").toLowerCase().trim();
  }

  if (payload.phone !== undefined) {
    payload.phone = String(payload.phone || "").replace(/\D/g, "");
  }

  if (payload.joiningDate !== undefined) {
    payload.joiningDate = String(payload.joiningDate || "").trim();
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

  if (payload.customers !== undefined) {
    payload.customers = Number(payload.customers || 0);
  }

  return payload;
};

const buildQueryFilter = (query: any) => {
  const filter: any = {};

  if (query.role) {
    filter.role = query.role;
  }

  if (query.status) {
    filter.status = query.status;
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
        { employeeId: regex },
        { name: regex },
        { employeeName: regex },
        { email: regex },
        { phone: regex },
        { phoneNumber: regex },
        { role: regex },
        { branch: regex },
        { branchName: regex },
        { ifsc: regex },
        { ifscCode: regex },
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

const findAccessibleEmployeeById = async (req: any, id: string) => {
  const accessFilter = buildEmployeeAccessFilter(req);

  const baseFilter = {
    $or: [
      { id },
      { employeeId: id },
      { email: id },
      { phone: id },
    ],
  };

  const finalFilter = mergeFilters(baseFilter, accessFilter);

  return Employee.findOne(finalFilter).select("-_id -__v -password").lean();
};

router.use(protectAdmin);

router.get("/", async (req: any, res: any) => {
  try {
    if (!canViewEmployees(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your role cannot view employees.",
      });
    }

    const queryFilter = buildQueryFilter(req.query);
    const accessFilter = buildEmployeeAccessFilter(req);
    const finalFilter = mergeFilters(queryFilter, accessFilter);

    const employees = await Employee.find(finalFilter)
      .select("-_id -__v -password")
      .sort({ createdAt: -1, id: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
      error: getErrorMessage(error),
    });
  }
});

router.get("/:id", async (req: any, res: any) => {
  try {
    if (!canViewEmployees(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your role cannot view employees.",
      });
    }

    const employee = await findAccessibleEmployeeById(req, req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found or you do not have access.",
      });
    }

    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee",
      error: getErrorMessage(error),
    });
  }
});

router.post("/", async (req: any, res: any) => {
  try {
    if (!canWriteEmployees(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your role cannot create employees.",
      });
    }

    const validationError = validateEmployee(req.body, false);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const payload = normalizeEmployeePayload(req.body);

    const branchAccessError = validateAdminBranchAccessForPayload(req, payload);

    if (branchAccessError) {
      return res.status(403).json({
        success: false,
        message: branchAccessError,
      });
    }

    const employee = await Employee.create({
      id: generateEmployeeId(),
      employeeId: generateEmployeeId(),
      name: payload.name,
      role: payload.role,
      email: payload.email,
      phone: payload.phone,
      joiningDate: payload.joiningDate || "",
      branch: payload.branch,
      branchName: payload.branchName || payload.branch,
      ifsc: payload.ifsc,
      ifscCode: payload.ifscCode || payload.ifsc,
      customers: payload.customers || 0,
      status: payload.status || "Active",
      createdBy: req.admin?.email || req.admin?.name || "",
      createdByRole: req.admin?.role || "",
    });

    const savedEmployee = await Employee.findOne({ id: employee.id })
      .select("-_id -__v -password")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: savedEmployee,
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
    if (!canWriteEmployees(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your role cannot edit employees.",
      });
    }

    const { id } = req.params;

    const existingEmployee = await findAccessibleEmployeeById(req, id);

    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found or you do not have access.",
      });
    }

    const validationError = validateEmployee(req.body, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const updateData = normalizeEmployeePayload(req.body);

    const branchCheckPayload = {
      ...existingEmployee,
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

    const accessFilter = buildEmployeeAccessFilter(req);
    const finalFilter = mergeFilters({ id }, accessFilter);

    const employee = await Employee.findOneAndUpdate(finalFilter, updateData, {
      new: true,
      runValidators: true,
      context: "query",
    })
      .select("-_id -__v -password")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: employee,
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
    if (!canDeleteEmployees(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your role cannot delete employees.",
      });
    }

    const { id } = req.params;

    const accessFilter = buildEmployeeAccessFilter(req);
    const finalFilter = mergeFilters({ id }, accessFilter);

    const employee = await Employee.findOneAndDelete(finalFilter)
      .select("-_id -__v -password")
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found or you do not have access.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
      data: employee,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete employee",
      error: getErrorMessage(error),
    });
  }
});

module.exports = router;