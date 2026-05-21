const express = require("express");
const Employee = require("../models/Employee");

console.log("✅ STRICT EMPLOYEE ROUTES LOADED");

const router = express.Router();

const FINSECURE_IFSC_REGEX = /^FINS0[A-Z0-9]{6}$/;

const generateEmployeeId = () => {
  return `EMP${Date.now()}`;
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

  if (payload.email !== undefined) {
    payload.email = String(payload.email || "").toLowerCase().trim();
  }

  if (payload.phone !== undefined) {
    payload.phone = String(payload.phone || "").replace(/\D/g, "");
  }

  if (payload.branch !== undefined) {
    payload.branch = String(payload.branch || "").trim();
  }

  if (payload.ifsc !== undefined) {
    payload.ifsc = String(payload.ifsc || "").toUpperCase().trim();
  }

  if (payload.customers !== undefined) {
    payload.customers = Number(payload.customers || 0);
  }

  return payload;
};

router.get("/", async (req: any, res: any) => {
  try {
    const employees = await Employee.find({})
      .select("-_id -__v")
      .sort({ createdAt: -1 })
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

router.post("/", async (req: any, res: any) => {
  try {
    const validationError = validateEmployee(req.body, false);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const payload = normalizeEmployeePayload(req.body);

    const employee = await Employee.create({
      id: generateEmployeeId(),
      name: payload.name,
      role: payload.role,
      email: payload.email,
      phone: payload.phone,
      joiningDate: payload.joiningDate || "",
      branch: payload.branch,
      ifsc: payload.ifsc,
      customers: payload.customers || 0,
      status: payload.status || "Active",
    });

    const savedEmployee = await Employee.findOne({ id: employee.id })
      .select("-_id -__v")
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
    const { id } = req.params;

    const existingEmployee = await Employee.findOne({ id });

    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
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

    const employee = await Employee.findOneAndUpdate({ id }, updateData, {
      new: true,
      runValidators: true,
      context: "query",
    })
      .select("-_id -__v")
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
    const { id } = req.params;

    const employee = await Employee.findOneAndDelete({ id })
      .select("-_id -__v")
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
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