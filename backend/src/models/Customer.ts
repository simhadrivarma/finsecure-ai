const mongoose = require("mongoose");

const FINSECURE_IFSC_REGEX = /^FINS0[A-Z0-9]{6}$/;

const moneyToNumber = (value: any) => {
  const clean = String(value || "")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .trim();

  if (clean === "") return 0;

  const numberValue = Number(clean);

  return Number.isNaN(numberValue) ? NaN : numberValue;
};

const formatMoney = (value: any) => {
  const numberValue = moneyToNumber(value);

  if (Number.isNaN(numberValue)) {
    return value;
  }

  return `₹${numberValue.toLocaleString("en-IN")}`;
};

const customerSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      set: function (value: any) {
        return String(value || "").toLowerCase().trim();
      },
      validate: {
        validator: function (value: any) {
          if (!value) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
        },
        message: "Please enter a valid email address",
      },
    },

    phone: {
      type: String,
      trim: true,
      set: function (value: any) {
        return String(value || "").replace(/\D/g, "");
      },
      validate: {
        validator: function (value: any) {
          if (!value) return true;
          return /^\d{10}$/.test(String(value));
        },
        message: "Phone number must be exactly 10 digits",
      },
    },

    accountNumber: {
      type: String,
      required: [true, "Account number is required"],
      trim: true,
      set: function (value: any) {
        return String(value || "").replace(/\D/g, "");
      },
      validate: {
        validator: function (value: any) {
          const digits = String(value || "").replace(/\D/g, "");
          return digits.length >= 9 && digits.length <= 18;
        },
        message: "Account number must be 9 to 18 digits",
      },
    },

    accountType: {
      type: String,
      required: [true, "Account type is required"],
      enum: [
        "Savings Account",
        "Current Account",
        "Salary Account",
        "Fixed Deposit Account",
        "Loan Account",
      ],
    },

    ifsc: {
      type: String,
      required: [true, "IFSC code is required"],
      trim: true,
      uppercase: true,
      set: function (value: any) {
        return String(value || "").toUpperCase().trim();
      },
      validate: {
        validator: function (value: any) {
          return FINSECURE_IFSC_REGEX.test(String(value || "").toUpperCase());
        },
        message: "IFSC code must be like FINS0001001",
      },
    },

    cif: {
      type: String,
      required: [true, "CIF number is required"],
      trim: true,
      uppercase: true,
      set: function (value: any) {
        return String(value || "").toUpperCase().trim();
      },
      validate: {
        validator: function (value: any) {
          return /^[A-Z0-9]{6,20}$/.test(String(value || "").toUpperCase());
        },
        message: "CIF number must be 6 to 20 letters/numbers",
      },
    },

    balance: {
      type: String,
      default: "₹0",
      set: function (value: any) {
        return formatMoney(value);
      },
      validate: {
        validator: function (value: any) {
          return !Number.isNaN(moneyToNumber(value));
        },
        message: "Balance must be a valid number",
      },
    },

    branch: {
      type: String,
      required: [true, "Branch is required"],
      trim: true,
    },

    employee: {
      type: String,
      default: "",
      trim: true,
    },

    kyc: {
      type: String,
      enum: ["Verified", "Pending", "Rejected"],
      default: "Pending",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Review", "Blocked"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

const Customer =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);

module.exports = Customer;