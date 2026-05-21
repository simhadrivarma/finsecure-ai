const mongoose = require("mongoose");

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

const loanSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    customer: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
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

    type: {
      type: String,
      required: [true, "Loan type is required"],
      enum: [
        "Home Loan",
        "Business Loan",
        "Personal Loan",
        "Vehicle Loan",
        "Education Loan",
        "Gold Loan",
      ],
    },

    amount: {
      type: String,
      required: [true, "Loan amount is required"],
      set: function (value: any) {
        return formatMoney(value);
      },
      validate: {
        validator: function (value: any) {
          const numberValue = moneyToNumber(value);
          return !Number.isNaN(numberValue) && numberValue > 0;
        },
        message: "Loan amount must be greater than 0",
      },
    },

    interest: {
      type: String,
      required: [true, "Interest rate is required"],
      trim: true,
      validate: {
        validator: function (value: any) {
          const numberValue = Number(String(value || "").replace(/%/g, "").trim());
          return !Number.isNaN(numberValue) && numberValue >= 0 && numberValue <= 100;
        },
        message: "Interest rate must be between 0 and 100",
      },
    },

    startDate: {
      type: String,
      required: [true, "Start date is required"],
      trim: true,
    },

    endDate: {
      type: String,
      required: [true, "End date is required"],
      trim: true,
    },

    emi: {
      type: String,
      default: "₹0",
      set: function (value: any) {
        return formatMoney(value);
      },
      validate: {
        validator: function (value: any) {
          const numberValue = moneyToNumber(value);
          return !Number.isNaN(numberValue) && numberValue >= 0;
        },
        message: "Monthly EMI must be a valid number",
      },
    },

    paid: {
      type: String,
      default: "₹0",
      set: function (value: any) {
        return formatMoney(value);
      },
      validate: {
        validator: function (value: any) {
          const numberValue = moneyToNumber(value);
          return !Number.isNaN(numberValue) && numberValue >= 0;
        },
        message: "Paid amount must be a valid number",
      },
    },

    pending: {
      type: String,
      default: "₹0",
      set: function (value: any) {
        return formatMoney(value);
      },
      validate: {
        validator: function (value: any) {
          const numberValue = moneyToNumber(value);
          return !Number.isNaN(numberValue) && numberValue >= 0;
        },
        message: "Pending amount must be a valid number",
      },
    },

    officer: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Active", "Closed", "Review", "Defaulted"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

const Loan = mongoose.models.Loan || mongoose.model("Loan", loanSchema);

module.exports = Loan;