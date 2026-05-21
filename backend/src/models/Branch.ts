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

const branchSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    name: {
      type: String,
      required: [true, "Branch name is required"],
      trim: true
    },

    address: {
      type: String,
      required: [true, "Branch address is required"],
      trim: true
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
        message: "IFSC code must be like FINS0001001"
      }
    },

    manager: {
      type: String,
      required: [true, "Branch manager is required"],
      trim: true
    },

    employees: {
      type: Number,
      default: 0,
      min: [0, "Employees count cannot be negative"]
    },

    customers: {
      type: Number,
      default: 0,
      min: [0, "Customers count cannot be negative"]
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
        message: "Total balance must be a valid number"
      }
    },

    loans: {
      type: String,
      default: "₹0",
      set: function (value: any) {
        return formatMoney(value);
      },
      validate: {
        validator: function (value: any) {
          return !Number.isNaN(moneyToNumber(value));
        },
        message: "Total loans must be a valid number"
      }
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    }
  },
  {
    timestamps: true
  }
);

const Branch =
  mongoose.models.Branch || mongoose.model("Branch", branchSchema);

module.exports = Branch;