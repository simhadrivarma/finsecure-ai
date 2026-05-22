const express = require("express");
const Customer = require("../models/Customer");

console.log("✅ STRICT FINSECURE CUSTOMER ROUTES LOADED");

const router = express.Router();

const FINSECURE_IFSC_REGEX = /^FINS0[A-Z0-9]{6}$/;

const generateCustomerId = () => {
  return `CUS${Date.now()}`;
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
    payload.email = String(payload.email || "").toLowerCase().trim();
  }

  if (payload.phone !== undefined) {
    payload.phone = String(payload.phone || "").replace(/\D/g, "");
  }

  if (payload.accountNumber !== undefined) {
    payload.accountNumber = String(payload.accountNumber || "").replace(
      /\D/g,
      ""
    );
  }

  if (payload.ifsc !== undefined) {
    payload.ifsc = String(payload.ifsc || "").toUpperCase().trim();
  }

  if (payload.cif !== undefined) {
    payload.cif = String(payload.cif || "").toUpperCase().trim();
  }

  if (payload.balance !== undefined) {
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

router.get("/", async (req: any, res: any) => {
  try {
    const customers = await Customer.find({})
      .select("-_id -__v")
      .sort({ createdAt: -1 })
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

router.post("/", async (req: any, res: any) => {
  try {
    const validationError = validateCustomer(req.body, false);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const payload = normalizeCustomerPayload(req.body);

    const customer = await Customer.create({
      id: generateCustomerId(),
      name: payload.name,
      email: payload.email || "",
      phone: payload.phone || "",
      accountNumber: payload.accountNumber,
      accountType: payload.accountType,
      ifsc: payload.ifsc,
      cif: payload.cif,
      balance: payload.balance || "₹0",
      branch: payload.branch,
      employee: payload.employee || "",
      kyc: payload.kyc || "Pending",
      status: payload.status || "Active",
    });

    const savedCustomer = await Customer.findOne({ id: customer.id })
      .select("-_id -__v")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
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
    const { id } = req.params;

    const existingCustomer = await Customer.findOne({ id });

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const validationError = validateCustomer(req.body, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const updateData = normalizeCustomerPayload(req.body);

    const customer = await Customer.findOneAndUpdate({ id }, updateData, {
      new: true,
      runValidators: true,
      context: "query",
    })
      .select("-_id -__v")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
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
    const { id } = req.params;

    const customer = await Customer.findOneAndDelete({ id })
      .select("-_id -__v")
      .lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
      data: customer,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete customer",
      error: getErrorMessage(error),
    });
  }
});

module.exports = router;