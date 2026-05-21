const express = require("express");
const Branch = require("../models/Branch");

console.log("✅ STRICT BRANCH ROUTES LOADED");

const router = express.Router();

const FINSECURE_IFSC_REGEX = /^FINS0[A-Z0-9]{6}$/;

const generateBranchId = () => {
  return `BRN${Date.now()}`;
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

  if (payload.name !== undefined) {
    payload.name = String(payload.name || "").trim();
  }

  if (payload.address !== undefined) {
    payload.address = String(payload.address || "").trim();
  }

  if (payload.ifsc !== undefined) {
    payload.ifsc = String(payload.ifsc || "").toUpperCase().trim();
  }

  if (payload.manager !== undefined) {
    payload.manager = String(payload.manager || "").trim();
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

  return payload;
};

router.get("/", async (req: any, res: any) => {
  try {
    const branches = await Branch.find({})
      .select("-_id -__v")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch branches",
      error: getErrorMessage(error)
    });
  }
});

router.post("/", async (req: any, res: any) => {
  try {
    const validationError = validateBranch(req.body, false);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    const payload = normalizeBranchPayload(req.body);

    const branch = await Branch.create({
      id: generateBranchId(),
      name: payload.name,
      address: payload.address,
      ifsc: payload.ifsc,
      manager: payload.manager,
      employees: payload.employees || 0,
      customers: payload.customers || 0,
      balance: payload.balance || "₹0",
      loans: payload.loans || "₹0",
      status: payload.status || "Active"
    });

    const savedBranch = await Branch.findOne({ id: branch.id })
      .select("-_id -__v")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: savedBranch
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
      error: getErrorMessage(error)
    });
  }
});

router.put("/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const existingBranch = await Branch.findOne({ id });

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found"
      });
    }

    const validationError = validateBranch(req.body, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    const updateData = normalizeBranchPayload(req.body);

    const branch = await Branch.findOneAndUpdate({ id }, updateData, {
      new: true,
      runValidators: true,
      context: "query"
    })
      .select("-_id -__v")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Branch updated successfully",
      data: branch
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
      error: getErrorMessage(error)
    });
  }
});

router.delete("/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const branch = await Branch.findOneAndDelete({ id })
      .select("-_id -__v")
      .lean();

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Branch deleted successfully",
      data: branch
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete branch",
      error: getErrorMessage(error)
    });
  }
});

module.exports = router;