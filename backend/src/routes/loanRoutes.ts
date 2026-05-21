const express = require("express");
const Loan = require("../models/Loan");

console.log("✅ STRICT LOAN ROUTES LOADED");

const router = express.Router();

const generateLoanId = () => {
  return `LON${Date.now()}`;
};

const moneyToNumber = (value: any) => {
  const clean = String(value || "")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .trim();

  if (clean === "") return 0;

  const numberValue = Number(clean);
  return Number.isNaN(numberValue) ? NaN : numberValue;
};

const cleanMoney = (value: any) => {
  const numberValue = moneyToNumber(value);

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
    return "Duplicate loan data found";
  }

  return error?.message || "Something went wrong";
};

const isValidDate = (value: any) => {
  if (!String(value || "").trim()) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const validateLoan = (body: any, isEdit = false) => {
  const customer = body.customer;
  const accountNumber = body.accountNumber;
  const type = body.type;
  const amount = body.amount;
  const interest = body.interest;
  const startDate = body.startDate;
  const endDate = body.endDate;
  const emi = body.emi;
  const paid = body.paid;
  const pending = body.pending;

  if (!isEdit || customer !== undefined) {
    if (!String(customer || "").trim()) {
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

  if (!isEdit || type !== undefined) {
    if (!String(type || "").trim()) {
      return "Loan type is required";
    }
  }

  if (!isEdit || amount !== undefined) {
    const numberValue = moneyToNumber(amount);

    if (Number.isNaN(numberValue)) {
      return "Loan amount must be a valid number";
    }

    if (numberValue <= 0) {
      return "Loan amount must be greater than 0";
    }
  }

  if (!isEdit || interest !== undefined) {
    const numberValue = Number(
      String(interest || "").replace(/%/g, "").trim()
    );

    if (Number.isNaN(numberValue)) {
      return "Interest rate must be a valid number";
    }

    if (numberValue < 0 || numberValue > 100) {
      return "Interest rate must be between 0 and 100";
    }
  }

  if (!isEdit || startDate !== undefined) {
    if (!isValidDate(startDate)) {
      return "Start date is required";
    }
  }

  if (!isEdit || endDate !== undefined) {
    if (!isValidDate(endDate)) {
      return "End date is required";
    }
  }

  const finalStartDate = startDate || body.oldStartDate;
  const finalEndDate = endDate || body.oldEndDate;

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return "End date cannot be before start date";
    }
  }

  if (emi !== undefined && String(emi || "").trim()) {
    const numberValue = moneyToNumber(emi);

    if (Number.isNaN(numberValue)) {
      return "Monthly EMI must be a valid number";
    }

    if (numberValue < 0) {
      return "Monthly EMI cannot be negative";
    }
  }

  if (paid !== undefined && String(paid || "").trim()) {
    const numberValue = moneyToNumber(paid);

    if (Number.isNaN(numberValue)) {
      return "Paid amount must be a valid number";
    }

    if (numberValue < 0) {
      return "Paid amount cannot be negative";
    }
  }

  if (pending !== undefined && String(pending || "").trim()) {
    const numberValue = moneyToNumber(pending);

    if (Number.isNaN(numberValue)) {
      return "Pending amount must be a valid number";
    }

    if (numberValue < 0) {
      return "Pending amount cannot be negative";
    }
  }

  return "";
};

const normalizeLoanPayload = (body: any) => {
  const payload: any = { ...body };

  if (payload.customer !== undefined) {
    payload.customer = String(payload.customer || "").trim();
  }

  if (payload.accountNumber !== undefined) {
    payload.accountNumber = String(payload.accountNumber || "").replace(
      /\D/g,
      ""
    );
  }

  if (payload.interest !== undefined) {
    payload.interest = String(payload.interest || "").replace(/%/g, "").trim();
  }

  if (payload.amount !== undefined) {
    payload.amount = cleanMoney(payload.amount);
  }

  if (payload.emi !== undefined) {
    payload.emi = cleanMoney(payload.emi);
  }

  if (payload.paid !== undefined) {
    payload.paid = cleanMoney(payload.paid);
  }

  if (payload.pending !== undefined) {
    payload.pending = cleanMoney(payload.pending);
  }

  if (payload.officer !== undefined) {
    payload.officer = String(payload.officer || "").trim();
  }

  return payload;
};

router.get("/", async (req: any, res: any) => {
  try {
    const loans = await Loan.find({})
      .select("-_id -__v")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: loans.length,
      data: loans,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch loans",
      error: getErrorMessage(error),
    });
  }
});

router.post("/", async (req: any, res: any) => {
  try {
    const validationError = validateLoan(req.body, false);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const payload = normalizeLoanPayload(req.body);

    const loan = await Loan.create({
      id: generateLoanId(),
      customer: payload.customer,
      accountNumber: payload.accountNumber,
      type: payload.type,
      amount: payload.amount,
      interest: payload.interest,
      startDate: payload.startDate,
      endDate: payload.endDate,
      emi: payload.emi || "₹0",
      paid: payload.paid || "₹0",
      pending: payload.pending || "₹0",
      officer: payload.officer || "",
      status: payload.status || "Active",
    });

    const savedLoan = await Loan.findOne({ id: loan.id })
      .select("-_id -__v")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Loan created successfully",
      data: savedLoan,
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

    const existingLoan = await Loan.findOne({ id });

    if (!existingLoan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    const bodyWithOldDates = {
      ...req.body,
      oldStartDate: existingLoan.startDate,
      oldEndDate: existingLoan.endDate,
    };

    const validationError = validateLoan(bodyWithOldDates, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const updateData = normalizeLoanPayload(req.body);

    const finalStartDate = updateData.startDate || existingLoan.startDate;
    const finalEndDate = updateData.endDate || existingLoan.endDate;

    if (finalStartDate && finalEndDate) {
      const start = new Date(finalStartDate);
      const end = new Date(finalEndDate);

      if (end < start) {
        return res.status(400).json({
          success: false,
          message: "End date cannot be before start date",
        });
      }
    }

    const loan = await Loan.findOneAndUpdate({ id }, updateData, {
      new: true,
      runValidators: true,
      context: "query",
    })
      .select("-_id -__v")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Loan updated successfully",
      data: loan,
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

    const loan = await Loan.findOneAndDelete({ id })
      .select("-_id -__v")
      .lean();

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Loan deleted successfully",
      data: loan,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete loan",
      error: getErrorMessage(error),
    });
  }
});

module.exports = router;