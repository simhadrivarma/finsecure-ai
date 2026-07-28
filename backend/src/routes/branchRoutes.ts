// @ts-nocheck

const express = require("express");
const mongoose = require("mongoose");
const Branch = require("../models/Branch");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

const protectAdmin = auth.protectAdmin || auth;
const requirePermission = auth.requirePermission;
const mergeFilters =
  auth.mergeFilters ||
  ((...filters: any[]) => ({
    $and: filters.filter(
      (filter) =>
        filter &&
        typeof filter === "object" &&
        Object.keys(filter).length > 0
    ),
  }));

const generateBranchId = () =>
  `BRN${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

const getAccessFilter = (req: any) => {
  if (typeof req.getAccessFilter === "function") {
    return req.getAccessFilter("branches") || {};
  }

  return {};
};

const anyIdFilter = (id: string) => {
  const value = String(id || "").trim();
  const upperValue = value.toUpperCase();

  return {
    $or: [
      { id: value },
      { branchId: value },
      { code: value },
      { branchCode: value },
      { ifsc: upperValue },
      { ifscCode: upperValue },
      { name: value },
      { branchName: value },
      ...(mongoose.Types.ObjectId.isValid(value)
        ? [{ _id: value }]
        : []),
    ],
  };
};

const cleanText = (value: any) =>
  value === undefined || value === null
    ? ""
    : String(value).trim();

const cleanPayload = (body: any) => {
  const payload: any = {};

  const allowedFields = [
    "name",
    "branchName",
    "code",
    "branchCode",
    "address",
    "location",
    "ifsc",
    "ifscCode",
    "manager",
    "managerName",
    "managerId",
    "managerEmail",
    "employees",
    "customers",
    "balance",
    "loans",
    "status",
  ];

  allowedFields.forEach((field) => {
    if (body?.[field] !== undefined) {
      payload[field] = body[field];
    }
  });

  const name = cleanText(payload.name || payload.branchName);
  if (name) {
    payload.name = name;
    payload.branchName = name;
  }

  const code = cleanText(payload.code || payload.branchCode);
  if (code) {
    payload.code = code;
    payload.branchCode = code;
  }

  const ifsc = cleanText(payload.ifsc || payload.ifscCode).toUpperCase();
  if (ifsc) {
    payload.ifsc = ifsc;
    payload.ifscCode = ifsc;
  }

  const manager = cleanText(payload.manager || payload.managerName);
  if (manager) {
    payload.manager = manager;
    payload.managerName = manager;
  }

  if (payload.address !== undefined) {
    payload.address = cleanText(payload.address);
  }

  if (payload.location !== undefined) {
    payload.location = cleanText(payload.location);
  }

  if (payload.managerId !== undefined) {
    payload.managerId = cleanText(payload.managerId);
  }

  if (payload.managerEmail !== undefined) {
    payload.managerEmail = cleanText(payload.managerEmail).toLowerCase();
  }

  if (payload.status !== undefined) {
    payload.status = cleanText(payload.status) || "Active";
  }

  if (payload.employees !== undefined) {
    payload.employees = Number(payload.employees || 0);
  }

  if (payload.customers !== undefined) {
    payload.customers = Number(payload.customers || 0);
  }

  if (payload.balance !== undefined) {
    payload.balance = Number(payload.balance || 0);
  }

  if (payload.loans !== undefined) {
    payload.loans = Number(payload.loans || 0);
  }

  return payload;
};

const normalisePublicBranch = (branch: any) => {
  const row =
    branch && typeof branch.toObject === "function"
      ? branch.toObject()
      : { ...branch };

  const name = cleanText(
    row.name ||
      row.branchName ||
      row.location ||
      row.code ||
      row.branchCode
  );

  const ifsc = cleanText(row.ifsc || row.ifscCode).toUpperCase();

  return {
    _id: row._id,
    id: row.id || row.branchId || row._id,
    branchId: row.branchId || row.id || row._id,
    name,
    branchName: name,
    code: row.code || row.branchCode || "",
    branchCode: row.branchCode || row.code || "",
    address: row.address || "",
    location: row.location || "",
    ifsc,
    ifscCode: ifsc,
    status: row.status || "Active",
  };
};

/*
 * PUBLIC ROUTE
 * Customer registration happens before login, so this route must stay above
 * router.use(protectAdmin). Only safe branch fields are returned.
 */
router.get("/public", async (_req: any, res: any) => {
  try {
    const rows = await Branch.find({})
      .select(
        "_id id branchId name branchName code branchCode address location ifsc ifscCode status"
      )
      .sort({ name: 1, branchName: 1, createdAt: 1 })
      .lean();

    const blockedStatuses = new Set([
      "inactive",
      "closed",
      "disabled",
      "deleted",
      "suspended",
    ]);

    const branches = rows
      .map(normalisePublicBranch)
      .filter((branch: any) => {
        const status = cleanText(branch.status).toLowerCase();

        return Boolean(branch.name) && !blockedStatuses.has(status);
      });

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      success: true,
      count: branches.length,
      data: branches,
      branches,
    });
  } catch (error: any) {
    console.error("Public branch list error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to load branches",
      count: 0,
      data: [],
      branches: [],
    });
  }
});

/*
 * All routes below this point require an authenticated staff/admin user.
 */
router.use(protectAdmin);

router.get(
  "/",
  requirePermission("branches", "read"),
  async (req: any, res: any) => {
    try {
      const accessFilter = getAccessFilter(req);

      const branches = await Branch.find(accessFilter)
        .select("-__v")
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        count: branches.length,
        data: branches,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to fetch branches",
      });
    }
  }
);

router.get(
  "/:id",
  requirePermission("branches", "read"),
  async (req: any, res: any) => {
    try {
      const branch = await Branch.findOne(
        mergeFilters(
          anyIdFilter(req.params.id),
          getAccessFilter(req)
        )
      )
        .select("-__v")
        .lean();

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found or access denied",
        });
      }

      return res.status(200).json({
        success: true,
        data: branch,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to fetch branch",
      });
    }
  }
);

router.post(
  "/",
  requirePermission("branches", "create"),
  async (req: any, res: any) => {
    try {
      const payload = cleanPayload(req.body);

      const name = payload.name || payload.branchName;
      const ifsc = payload.ifsc || payload.ifscCode;
      const manager = payload.manager || payload.managerName;

      if (!name || !payload.address || !ifsc || !manager) {
        return res.status(400).json({
          success: false,
          message:
            "Branch name, address, IFSC and manager are required",
        });
      }

      const id = generateBranchId();

      const branch = await Branch.create({
        id,
        branchId: id,
        ...payload,
        name,
        branchName: name,
        ifsc,
        ifscCode: ifsc,
        manager,
        managerName: manager,
        status: payload.status || "Active",
        createdBy:
          req.admin?.email ||
          req.admin?.name ||
          "system",
        createdByRole:
          req.admin?.role ||
          "Admin",
      });

      return res.status(201).json({
        success: true,
        message: "Branch created successfully",
        data: branch,
      });
    } catch (error: any) {
      const message =
        error?.code === 11000
          ? "Branch name or IFSC already exists"
          : error?.message;

      return res.status(400).json({
        success: false,
        message: message || "Failed to create branch",
      });
    }
  }
);

router.put(
  "/:id",
  requirePermission("branches", "update"),
  async (req: any, res: any) => {
    try {
      const filter = mergeFilters(
        anyIdFilter(req.params.id),
        getAccessFilter(req)
      );

      const branch = await Branch.findOneAndUpdate(
        filter,
        {
          ...cleanPayload(req.body),
          updatedBy:
            req.admin?.email ||
            req.admin?.name ||
            "system",
          updatedAt: new Date(),
        },
        {
          new: true,
          runValidators: true,
        }
      ).select("-__v");

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found or access denied",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Branch updated successfully",
        data: branch,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error?.message || "Failed to update branch",
      });
    }
  }
);

router.delete(
  "/:id",
  requirePermission("branches", "delete"),
  async (req: any, res: any) => {
    try {
      const filter = mergeFilters(
        anyIdFilter(req.params.id),
        getAccessFilter(req)
      );

      const branch = await Branch.findOneAndDelete(filter).select(
        "-__v"
      );

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found or access denied",
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
        message: error?.message || "Failed to delete branch",
      });
    }
  }
);

module.exports = router;