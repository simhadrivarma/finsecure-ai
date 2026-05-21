const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    customer: {
      type: String,
      required: true,
      trim: true,
    },

    accountNumber: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: String,
      required: true,
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

const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;