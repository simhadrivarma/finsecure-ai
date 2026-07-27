// @ts-nocheck

const mongoose = require("mongoose");

const moneyToNumber = (value: any) => {
  const clean = String(value ?? "")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\+/g, "")
    .trim();
  const amount = Number(clean || 0);
  return Number.isFinite(amount) ? amount : NaN;
};

const formatMoney = (value: any) => {
  const amount = moneyToNumber(value);
  return Number.isNaN(amount) ? value : `₹${amount.toLocaleString("en-IN")}`;
};

const adminTransactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true, index: true },
    transactionId: { type: String, trim: true, sparse: true, index: true },
    customer: { type: String, required: [true, "Customer name is required"], trim: true },
    customerName: { type: String, default: "", trim: true },
    customerId: { type: String, default: "", trim: true, index: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    customerEmail: { type: String, default: "", lowercase: true, trim: true },
    userEmail: { type: String, default: "", lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },
    accountNumber: {
      type: String,
      required: [true, "Account number is required"],
      uppercase: true,
      trim: true,
      index: true,
    },
    accountNo: { type: String, default: "", uppercase: true, trim: true },
    fromAccount: { type: String, default: "", uppercase: true, trim: true },
    branch: { type: String, default: "", trim: true, index: true },
    branchName: { type: String, default: "", trim: true },
    branchCode: { type: String, default: "", trim: true },
    branchId: { type: String, default: "", trim: true },
    ifsc: { type: String, default: "", uppercase: true, trim: true, index: true },
    ifscCode: { type: String, default: "", uppercase: true, trim: true },
    cif: { type: String, default: "", uppercase: true, trim: true },

    type: {
      type: String,
      required: [true, "Transaction type is required"],
      enum: ["UPI Payment", "NEFT", "RTGS", "IMPS", "EMI Payment", "Cash Deposit", "Cash Withdrawal", "Card Payment"],
      index: true,
    },
    amount: {
      type: String,
      required: [true, "Amount is required"],
      set: formatMoney,
      validate: {
        validator: (value: any) => {
          const amount = moneyToNumber(value);
          return !Number.isNaN(amount) && amount > 0;
        },
        message: "Amount must be greater than 0",
      },
    },
    category: { type: String, default: "Other", trim: true },
    description: { type: String, default: "Transaction", trim: true },
    paymentMethod: { type: String, default: "Bank Transfer", trim: true },
    date: { type: String, required: [true, "Transaction date is required"], trim: true, index: true },
    time: { type: String, required: [true, "Transaction time is required"], trim: true },
    ref: { type: String, default: "", trim: true, index: true },
    reference: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["Success", "Completed", "Pending", "Failed", "Flagged", "Resolved"],
      default: "Success",
      index: true,
    },
    risk: { type: String, enum: ["Normal", "Low", "Medium", "High"], default: "Normal", index: true },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    riskReasons: { type: [String], default: [] },
    fraudStatus: { type: String, enum: ["Not Reviewed", "Under Review", "Confirmed", "Cleared", "Resolved"], default: "Not Reviewed", index: true },
    fraudNotes: { type: String, default: "", trim: true },
    reviewedBy: { type: String, default: "", trim: true },
    reviewedById: { type: String, default: "", trim: true },
    reviewedAt: { type: Date, default: null },
    createdBy: { type: String, default: "", trim: true },
    createdByRole: { type: String, default: "", trim: true },
    updatedBy: { type: String, default: "", trim: true },
  },
  { timestamps: true, versionKey: false, collection: "admintransactions" }
);

adminTransactionSchema.pre("validate", function () {
  const tx: any = this;
  if (!tx.transactionId) tx.transactionId = tx.id;
  if (!tx.customerName) tx.customerName = tx.customer;
  if (!tx.customerEmail) tx.customerEmail = tx.email;
  if (!tx.userEmail) tx.userEmail = tx.email;
  if (!tx.accountNo) tx.accountNo = tx.accountNumber;
  if (!tx.fromAccount) tx.fromAccount = tx.accountNumber;
  if (!tx.branchName) tx.branchName = tx.branch;
  if (!tx.ifscCode) tx.ifscCode = tx.ifsc;
  if (!tx.reference) tx.reference = tx.ref;
});

const AdminTransaction =
  mongoose.models.AdminTransaction || mongoose.model("AdminTransaction", adminTransactionSchema);

module.exports = AdminTransaction;
module.exports.moneyToNumber = moneyToNumber;
module.exports.formatMoney = formatMoney;
