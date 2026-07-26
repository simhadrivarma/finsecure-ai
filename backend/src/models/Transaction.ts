const mongoose = require("mongoose");

const moneyToNumber = (value: any) => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const cleaned = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\+/g, "")
    .trim();

  const numberValue = Number(cleaned);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const transactionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    customer: {
      type: String,
      required: true,
      trim: true,
    },

    customerId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    userEmail: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
      index: true,
    },

    accountNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: [0.01, "Transaction amount must be greater than 0"],
      set: moneyToNumber,
    },

    category: {
      type: String,
      default: "Other",
      trim: true,
    },

    description: {
      type: String,
      default: "Transaction",
      trim: true,
    },

    paymentMethod: {
      type: String,
      default: "Bank Transfer",
      trim: true,
    },

    branch: {
      type: String,
      default: "",
      trim: true,
    },

    ifsc: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
    },

    cif: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
    },

    beneficiaryName: {
      type: String,
      default: "",
      trim: true,
    },

    beneficiaryAccount: {
      type: String,
      default: "",
      trim: true,
    },

    beneficiaryIfsc: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
    },

    bankName: {
      type: String,
      default: "",
      trim: true,
    },

    date: {
      type: String,
      required: true,
      trim: true,
    },

    time: {
      type: String,
      required: true,
      trim: true,
    },

    ref: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Success", "Completed", "Pending", "Failed", "Flagged"],
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
    },

    riskReasons: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "transactions",
  }
);

transactionSchema.set("toJSON", {
  transform: (_document: any, returnedObject: any) => {
    delete returnedObject.__v;
    return returnedObject;
  },
});

transactionSchema.set("toObject", {
  transform: (_document: any, returnedObject: any) => {
    delete returnedObject.__v;
    return returnedObject;
  },
});

const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;