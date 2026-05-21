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

const adminTransactionSchema = new mongoose.Schema(
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
      required: [true, "Transaction type is required"],
      enum: [
        "UPI Payment",
        "NEFT",
        "RTGS",
        "IMPS",
        "EMI Payment",
        "Cash Deposit",
        "Cash Withdrawal",
        "Card Payment",
      ],
    },

    amount: {
      type: String,
      required: [true, "Amount is required"],
      set: function (value: any) {
        return formatMoney(value);
      },
      validate: {
        validator: function (value: any) {
          const numberValue = moneyToNumber(value);
          return !Number.isNaN(numberValue) && numberValue > 0;
        },
        message: "Amount must be greater than 0",
      },
    },

    date: {
      type: String,
      required: [true, "Transaction date is required"],
      trim: true,
    },

    time: {
      type: String,
      required: [true, "Transaction time is required"],
      trim: true,
    },

    ref: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Success", "Pending", "Failed", "Flagged"],
      default: "Success",
    },

    risk: {
      type: String,
      enum: ["Normal", "Low", "Medium", "High"],
      default: "Normal",
    },

    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    riskReasons: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const AdminTransaction =
  mongoose.models.AdminTransaction ||
  mongoose.model("AdminTransaction", adminTransactionSchema);

module.exports = AdminTransaction;