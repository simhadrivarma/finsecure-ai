const express = require("express");
const Customer = require("../models/Customer");

const authMiddleware = require("../middleware/authMiddleware");
const protectAdmin = authMiddleware.protectAdmin || authMiddleware;
const requireModuleAccess =
  authMiddleware.requireModuleAccess ||
  (() => (_req: any, _res: any, next: any) => next());

let Loan: any = null;

try {
  Loan = require("../models/Loan");
} catch {
  Loan = null;
}

console.log("✅ SECURE FINSECURE CUSTOMER ROUTES V5 LOADED");

const router = express.Router();

const FINSECURE_IFSC_REGEX = /^FINS0[A-Z0-9]{6}$/;

const generateCustomerId = () => {
  return `CUS${Date.now()}`;
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

const canWriteCustomer = (role: any) => {
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

const cleanMoney = (value: unknown): number => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const cleanedValue = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\+/g, "")
    .trim();

  if (!cleanedValue) {
    return 0;
  }

  const numberValue = Number(cleanedValue);

  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getErrorMessage = (error: any) => {
  if (error?.name === "ValidationError") {
    const firstError = Object.values(error.errors || {})[0] as any;

    return firstError?.message || "Validation failed";
  }

  if (error?.code === 11000) {
    return "Duplicate customer data found";
  }

  return error?.message || "Something went wrong";
};

const validateCustomer = (body: any, isEdit = false) => {
  const name = body.name;
  const email = body.email;
  const phone = body.phone;
  const accountNumber = body.accountNumber;
  const accountType = body.accountType;
  const ifsc = body.ifsc;
  const cif = body.cif;
  const balance = body.balance;
  const branch = body.branch;

  if (!isEdit || name !== undefined) {
    if (!String(name || "").trim()) {
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

  if (!isEdit || accountType !== undefined) {
    if (!String(accountType || "").trim()) {
      return "Account type is required";
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

  if (!isEdit || cif !== undefined) {
    const cifValue = String(cif || "").toUpperCase().trim();

    if (!cifValue) {
      return "CIF number is required";
    }

    if (!/^[A-Z0-9]{6,20}$/.test(cifValue)) {
      return "CIF number must be 6 to 20 letters/numbers";
    }
  }

  if (!isEdit || branch !== undefined) {
    if (!String(branch || "").trim()) {
      return "Branch is required";
    }
  }

  if (email !== undefined && String(email || "").trim()) {
    const emailValue = String(email).trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      return "Please enter a valid email address";
    }
  }

  if (phone !== undefined && String(phone || "").trim()) {
    const digits = String(phone).replace(/\D/g, "");

    if (digits.length !== 10) {
      return "Phone number must be exactly 10 digits";
    }
  }

  if (balance !== undefined && String(balance || "").trim()) {
    const clean = String(balance)
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .trim();

    if (clean && Number.isNaN(Number(clean))) {
      return "Balance must be a valid number";
    }
  }

  return "";
};

const normalizeCustomerPayload = (body: any) => {
  const payload: any = { ...body };

  if (payload.name !== undefined) {
    payload.name = String(payload.name || "").trim();
  }

  if (payload.email !== undefined) {
    payload.email = String(payload.email || "")
      .toLowerCase()
      .trim();
  }

  if (payload.phone !== undefined) {
    payload.phone = String(payload.phone || "").replace(/\D/g, "");
  }

  if (payload.accountNumber !== undefined) {
    payload.accountNumber = String(
      payload.accountNumber || ""
    ).replace(/\D/g, "");
  }

  if (payload.ifsc !== undefined) {
    payload.ifsc = String(payload.ifsc || "")
      .toUpperCase()
      .trim();
  }

  if (payload.cif !== undefined) {
    payload.cif = String(payload.cif || "")
      .toUpperCase()
      .trim();
  }

  if (payload.balance !== undefined && payload.balance !== null) {
    payload.balance = cleanMoney(payload.balance);
  }

  if (payload.branch !== undefined) {
    payload.branch = String(payload.branch || "").trim();
  }

  if (payload.employee !== undefined) {
    payload.employee = String(payload.employee || "").trim();
  }

  return payload;
};

const noAccessFilter = () => {
  return { id: "__NO_ACCESS__" };
};

const sanitizeAccessFilter = (filter: any) => {
  if (!filter || Object.keys(filter).length === 0) {
    return {};
  }

  if (
    filter.id === "__NO_ACCESS__" ||
    filter._id === "__NO_ACCESS__"
  ) {
    return noAccessFilter();
  }

  return filter;
};

const mergeFilters = (baseFilter: any, accessFilter: any) => {
  const cleanBase = baseFilter || {};
  const cleanAccess = sanitizeAccessFilter(accessFilter || {});

  if (Object.keys(cleanBase).length === 0) {
    return cleanAccess;
  }

  if (Object.keys(cleanAccess).length === 0) {
    return cleanBase;
  }

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
  return [
    admin?.ifsc,
    admin?.ifscCode,
    admin?.IFSC,
  ]
    .filter(Boolean)
    .map(normalizeText);
};

const validateAdminBranchAccessForPayload = (
  req: any,
  payload: any
) => {
  const role = req.admin?.role;

  if (isFullAdmin(role)) {
    return "";
  }

  const adminBranches = getAdminBranchValues(req.admin);
  const adminIfscList = getAdminIfscValues(req.admin);

  const customerBranch = normalizeText(
    payload.branch ||
      payload.branchName ||
      payload.assignedBranch
  );

  const customerIfsc = normalizeText(
    payload.ifsc ||
      payload.ifscCode ||
      payload.IFSC
  );

  if (!adminBranches.length && !adminIfscList.length) {
    return "Your admin account has no branch assigned. Please contact Super Admin.";
  }

  const branchMatches =
    customerBranch &&
    adminBranches.some(
      (branch: string) => branch === customerBranch
    );

  const ifscMatches =
    customerIfsc &&
    adminIfscList.some(
      (ifsc: string) => ifsc === customerIfsc
    );

  if (branchMatches || ifscMatches) {
    return "";
  }

  return "Access denied. You can manage customers only for your assigned branch.";
};

const buildQueryFilter = (query: any) => {
  const filter: any = {};

  if (query.accountType) {
    filter.accountType = query.accountType;
  }

  if (query.kyc) {
    filter.kyc = query.kyc;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.branch) {
    filter.$or = [
      { branch: query.branch },
      { branchName: query.branch },
      { ifsc: query.branch },
      { ifscCode: query.branch },
    ];
  }

  if (query.search || query.q) {
    const search = String(
      query.search ||
        query.q ||
        ""
    ).trim();

    if (search) {
      const regex = new RegExp(
        search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        ),
        "i"
      );

      const searchOr = [
        { id: regex },
        { name: regex },
        { email: regex },
        { phone: regex },
        { accountNumber: regex },
        { cif: regex },
        { branch: regex },
        { ifsc: regex },
      ];

      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: searchOr },
        ];

        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }
  }

  return filter;
};

const getCustomerAccessFilter = async (req: any) => {
  const role = req.admin?.role;

  if (isLoanRole(role)) {
    if (!Loan) {
      return noAccessFilter();
    }

    const loanAccessFilter = req.getAccessFilter
      ? sanitizeAccessFilter(
          req.getAccessFilter("loans")
        )
      : {};

    const loans = await Loan.find(loanAccessFilter)
      .select(
        "customerId customerID id email customerEmail userEmail accountNumber accountNo phone phoneNumber cif cifNumber"
      )
      .lean();

    if (!loans.length) {
      return noAccessFilter();
    }

    const ids = new Set<string>();
    const emails = new Set<string>();
    const accounts = new Set<string>();
    const phones = new Set<string>();
    const cifs = new Set<string>();

    loans.forEach((loan: any) => {
      [
        loan.customerId,
        loan.customerID,
        loan.id,
      ].forEach((value) => {
        if (value) {
          ids.add(String(value));
        }
      });

      [
        loan.email,
        loan.customerEmail,
        loan.userEmail,
      ].forEach((value) => {
        if (value) {
          emails.add(
            String(value).toLowerCase()
          );
        }
      });

      [
        loan.accountNumber,
        loan.accountNo,
      ].forEach((value) => {
        if (value) {
          accounts.add(String(value));
        }
      });

      [
        loan.phone,
        loan.phoneNumber,
      ].forEach((value) => {
        if (value) {
          phones.add(String(value));
        }
      });

      [
        loan.cif,
        loan.cifNumber,
      ].forEach((value) => {
        if (value) {
          cifs.add(
            String(value).toUpperCase()
          );
        }
      });
    });

    const orConditions: any[] = [];

    if (ids.size) {
      orConditions.push({
        id: {
          $in: Array.from(ids),
        },
      });

      orConditions.push({
        customerId: {
          $in: Array.from(ids),
        },
      });
    }

    if (emails.size) {
      orConditions.push({
        email: {
          $in: Array.from(emails),
        },
      });

      orConditions.push({
        customerEmail: {
          $in: Array.from(emails),
        },
      });

      orConditions.push({
        userEmail: {
          $in: Array.from(emails),
        },
      });
    }

    if (accounts.size) {
      orConditions.push({
        accountNumber: {
          $in: Array.from(accounts),
        },
      });

      orConditions.push({
        accountNo: {
          $in: Array.from(accounts),
        },
      });
    }

    if (phones.size) {
      orConditions.push({
        phone: {
          $in: Array.from(phones),
        },
      });

      orConditions.push({
        phoneNumber: {
          $in: Array.from(phones),
        },
      });
    }

    if (cifs.size) {
      orConditions.push({
        cif: {
          $in: Array.from(cifs),
        },
      });

      orConditions.push({
        cifNumber: {
          $in: Array.from(cifs),
        },
      });
    }

    if (!orConditions.length) {
      return noAccessFilter();
    }

    return {
      $or: orConditions,
    };
  }

  if (req.getAccessFilter) {
    return sanitizeAccessFilter(
      req.getAccessFilter("customers")
    );
  }

  return {};
};

const findAccessibleCustomerById = async (
  req: any,
  id: string
) => {
  const accessFilter =
    await getCustomerAccessFilter(req);

  const finalFilter = mergeFilters(
    {
      $or: [
        { id },
        { customerId: id },
        { accountNumber: id },
        { email: id },
      ],
    },
    accessFilter
  );

  return Customer.findOne(finalFilter)
    .select("-_id -__v -password")
    .lean();
};

router.use(protectAdmin);

router.use(requireModuleAccess("customers"));

router.get("/", async (req: any, res: any) => {
  try {
    const queryFilter = buildQueryFilter(req.query);
    const accessFilter =
      await getCustomerAccessFilter(req);

    const finalFilter = mergeFilters(
      queryFilter,
      accessFilter
    );

    const customers = await Customer.find(finalFilter)
      .select("-_id -__v -password")
      .sort({
        createdAt: -1,
        id: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: getErrorMessage(error),
    });
  }
});

router.get("/:id", async (req: any, res: any) => {
  try {
    const customer =
      await findAccessibleCustomerById(
        req,
        req.params.id
      );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer not found or you do not have access.",
      });
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
      error: getErrorMessage(error),
    });
  }
});

router.post("/", async (req: any, res: any) => {
  try {
    if (!canWriteCustomer(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Your role cannot create customers.",
      });
    }

    const validationError = validateCustomer(
      req.body,
      false
    );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const payload =
      normalizeCustomerPayload(req.body);

    const branchAccessError =
      validateAdminBranchAccessForPayload(
        req,
        payload
      );

    if (branchAccessError) {
      return res.status(403).json({
        success: false,
        message: branchAccessError,
      });
    }

    const customer = await Customer.create({
      id: generateCustomerId(),
      name: payload.name,
      email: payload.email || "",
      phone: payload.phone || "",
      accountNumber: payload.accountNumber,
      accountType: payload.accountType,
      ifsc: payload.ifsc,
      cif: payload.cif,

      // Important: balance is stored only as a number.
      balance: cleanMoney(payload.balance),

      branch: payload.branch,
      employee: payload.employee || "",
      kyc: payload.kyc || "Pending",
      status: payload.status || "Active",
      createdBy:
        req.admin?.email ||
        req.admin?.name ||
        "",
      createdByRole:
        req.admin?.role ||
        "",
    });

    const savedCustomer =
      await Customer.findOne({
        id: customer.id,
      })
        .select("-_id -__v -password")
        .lean();

    return res.status(201).json({
      success: true,
      message:
        "Customer created successfully",
      data: savedCustomer,
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
    if (!canWriteCustomer(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Your role cannot edit customers.",
      });
    }

    const { id } = req.params;

    const existingCustomer =
      await findAccessibleCustomerById(
        req,
        id
      );

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer not found or you do not have access.",
      });
    }

    const validationError = validateCustomer(
      req.body,
      true
    );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const updateData =
      normalizeCustomerPayload(req.body);

    const branchCheckPayload = {
      ...existingCustomer,
      ...updateData,
    };

    const branchAccessError =
      validateAdminBranchAccessForPayload(
        req,
        branchCheckPayload
      );

    if (branchAccessError) {
      return res.status(403).json({
        success: false,
        message: branchAccessError,
      });
    }

    const accessFilter =
      await getCustomerAccessFilter(req);

    const finalFilter = mergeFilters(
      {
        $or: [
          { id },
          { customerId: id },
          { accountNumber: id },
          { email: id },
        ],
      },
      accessFilter
    );

    const customer =
      await Customer.findOneAndUpdate(
        finalFilter,
        updateData,
        {
          new: true,
          runValidators: true,
          context: "query",
        }
      )
        .select("-_id -__v -password")
        .lean();

    return res.status(200).json({
      success: true,
      message:
        "Customer updated successfully",
      data: customer,
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
    if (!canWriteCustomer(req.admin?.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Your role cannot delete customers.",
      });
    }

    const { id } = req.params;

    const accessFilter =
      await getCustomerAccessFilter(req);

    const finalFilter = mergeFilters(
      {
        $or: [
          { id },
          { customerId: id },
          { accountNumber: id },
          { email: id },
        ],
      },
      accessFilter
    );

    const customer =
      await Customer.findOneAndDelete(
        finalFilter
      )
        .select("-_id -__v -password")
        .lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer not found or you do not have access.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Customer deleted successfully",
      data: customer,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        "Failed to delete customer",
      error: getErrorMessage(error),
    });
  }
});

module.exports = router;