// @ts-nocheck

const mongoose = require("mongoose");

/* Generate a unique customer ID */
const generateCustomerId = () => {
  const timePart = Date.now().toString().slice(-10);
  const randomPart = Math.floor(100 + Math.random() * 900);

  return `CUS${timePart}${randomPart}`;
};

/* Generate a unique bank account number */
const generateAccountNumber = () => {
  const timePart = Date.now().toString().slice(-10);
  const randomPart = Math.floor(1000 + Math.random() * 9000);

  return `FS${timePart}${randomPart}`;
};

/* Generate a unique CIF number */
const generateCifNumber = () => {
  const timePart = Date.now().toString().slice(-8);
  const randomPart = Math.floor(100 + Math.random() * 900);

  return `CIF${timePart}${randomPart}`;
};

/* Convert currency-formatted values into numbers */
const convertToNumber = (value: any) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return 0;
  }

  const cleanedValue = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\+/g, "")
    .trim();

  const numericValue = Number(cleanedValue);

  return Number.isFinite(numericValue)
    ? numericValue
    : 0;
};

const customerSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },

    customerId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },

    customerName: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },

    password: {
      type: String,
      select: false,
      default: "",
    },

    role: {
      type: String,
      enum: ["customer"],
      default: "customer",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },

    accountNumber: {
      type: String,
      required: [true, "Account number is required"],
      unique: true,
      trim: true,
      index: true,
    },

    accountNo: {
      type: String,
      trim: true,
      default: "",
    },

    accountType: {
      type: String,
      required: [true, "Account type is required"],
      default: "Savings Account",
      trim: true,
    },

    ifsc: {
      type: String,
      required: [true, "IFSC code is required"],
      uppercase: true,
      trim: true,
      default: "FINS0001001",
      index: true,
    },

    ifscCode: {
      type: String,
      uppercase: true,
      trim: true,
      default: "FINS0001001",
    },

    cif: {
      type: String,
      required: [true, "CIF number is required"],
      uppercase: true,
      trim: true,
      index: true,
    },

    cifNumber: {
      type: String,
      uppercase: true,
      trim: true,
      default: "",
    },

    aadhaarNumber: {
      type: String,
      trim: true,
      default: "",
    },

    panNumber: {
      type: String,
      uppercase: true,
      trim: true,
      default: "",
    },

    balance: {
      type: Number,
      default: 0,
      min: [0, "Balance cannot be negative"],
      set: convertToNumber,
    },

    totalIncome: {
      type: Number,
      default: 0,
      min: 0,
      set: convertToNumber,
    },

    totalExpense: {
      type: Number,
      default: 0,
      min: 0,
      set: convertToNumber,
    },

    transactionsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    branch: {
      type: String,
      required: [true, "Branch is required"],
      default: "Main Branch",
      trim: true,
      index: true,
    },

    branchName: {
      type: String,
      trim: true,
      default: "",
    },

    branchCode: {
      type: String,
      trim: true,
      default: "",
    },

    branchId: {
      type: String,
      trim: true,
      default: "",
    },

    employee: {
      type: String,
      trim: true,
      default: "",
    },

    assignedEmployee: {
      type: String,
      trim: true,
      default: "",
    },

    kyc: {
      type: String,
      enum: {
        values: ["Pending", "Verified", "Rejected"],
        message: "Invalid KYC status",
      },
      default: "Pending",
    },

    status: {
      type: String,
      enum: {
        values: [
          "Pending",
          "Active",
          "Inactive",
          "Suspended",
        ],
        message: "Invalid customer status",
      },
      default: "Active",
    },

    createdBy: {
      type: String,
      trim: true,
      default: "",
    },

    createdByRole: {
      type: String,
      trim: true,
      default: "",
    },

    updatedBy: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    strict: true,
    versionKey: false,
    collection: "customers",
  }
);

/*
  Mongoose validation middleware.

  This middleware does not use the old next() callback.
*/
customerSchema.pre("validate", function () {
  const customer: any = this;

  if (!customer.id && customer.customerId) {
    customer.id = customer.customerId;
  }

  if (!customer.id) {
    customer.id = generateCustomerId();
  }

  if (!customer.customerId) {
    customer.customerId = customer.id;
  }

  if (!customer.name && customer.customerName) {
    customer.name = customer.customerName;
  }

  if (!customer.customerName && customer.name) {
    customer.customerName = customer.name;
  }

  if (!customer.phone && customer.phoneNumber) {
    customer.phone = customer.phoneNumber;
  }

  if (!customer.phoneNumber && customer.phone) {
    customer.phoneNumber = customer.phone;
  }

  if (!customer.accountNumber && customer.accountNo) {
    customer.accountNumber = customer.accountNo;
  }

  if (!customer.accountNumber) {
    customer.accountNumber = generateAccountNumber();
  }

  if (!customer.accountNo) {
    customer.accountNo = customer.accountNumber;
  }

  if (!customer.ifsc && customer.ifscCode) {
    customer.ifsc = customer.ifscCode;
  }

  if (!customer.ifsc) {
    customer.ifsc = "FINS0001001";
  }

  if (!customer.ifscCode) {
    customer.ifscCode = customer.ifsc;
  }

  if (!customer.cif && customer.cifNumber) {
    customer.cif = customer.cifNumber;
  }

  if (!customer.cif) {
    customer.cif = generateCifNumber();
  }

  if (!customer.cifNumber) {
    customer.cifNumber = customer.cif;
  }

  if (!customer.branch && customer.branchName) {
    customer.branch = customer.branchName;
  }

  if (!customer.branch) {
    customer.branch = "Main Branch";
  }

  if (!customer.branchName) {
    customer.branchName = customer.branch;
  }

  if (
    !customer.assignedEmployee &&
    customer.employee
  ) {
    customer.assignedEmployee = customer.employee;
  }

  if (
    !customer.employee &&
    customer.assignedEmployee
  ) {
    customer.employee = customer.assignedEmployee;
  }

  if (!customer.role) {
    customer.role = "customer";
  }
});

/* Remove sensitive fields from API responses */
customerSchema.set("toJSON", {
  transform: (
    _document: any,
    returnedObject: any
  ) => {
    delete returnedObject.password;
    delete returnedObject.__v;

    return returnedObject;
  },
});

customerSchema.set("toObject", {
  transform: (
    _document: any,
    returnedObject: any
  ) => {
    delete returnedObject.password;
    delete returnedObject.__v;

    return returnedObject;
  },
});

const Customer =
  mongoose.models.Customer ||
  mongoose.model("Customer", customerSchema);

module.exports = Customer;