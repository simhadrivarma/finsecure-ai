// @ts-nocheck

const mongoose = require("mongoose");

const FINSECURE_IFSC_REGEX = /^FINS0[A-Z0-9]{6}$/;

const moneyToNumber = (value: any) => {
  const clean = String(value ?? "")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .trim();
  if (!clean) return 0;
  const amount = Number(clean);
  return Number.isFinite(amount) ? amount : NaN;
};

const formatMoney = (value: any) => {
  const amount = moneyToNumber(value);
  return Number.isNaN(amount) ? value : `₹${amount.toLocaleString("en-IN")}`;
};

const branchSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true, index: true },
    branchId: { type: String, trim: true, sparse: true, index: true },
    name: { type: String, required: [true, "Branch name is required"], trim: true, index: true },
    branchName: { type: String, default: "", trim: true },
    code: { type: String, default: "", trim: true },
    branchCode: { type: String, default: "", trim: true, index: true },
    address: { type: String, required: [true, "Branch address is required"], trim: true },
    location: { type: String, default: "", trim: true },
    ifsc: {
      type: String,
      required: [true, "IFSC code is required"],
      uppercase: true,
      trim: true,
      unique: true,
      index: true,
      validate: {
        validator: (value: any) => FINSECURE_IFSC_REGEX.test(String(value || "").toUpperCase()),
        message: "IFSC code must be like FINS0001001",
      },
    },
    ifscCode: { type: String, default: "", uppercase: true, trim: true },
    manager: { type: String, required: [true, "Branch manager is required"], trim: true },
    managerName: { type: String, default: "", trim: true },
    managerId: { type: String, default: "", trim: true },
    managerEmail: { type: String, default: "", lowercase: true, trim: true },
    employees: { type: Number, default: 0, min: 0 },
    customers: { type: Number, default: 0, min: 0 },
    balance: {
      type: String,
      default: "₹0",
      set: formatMoney,
      validate: {
        validator: (value: any) => !Number.isNaN(moneyToNumber(value)),
        message: "Total balance must be a valid number",
      },
    },
    loans: {
      type: String,
      default: "₹0",
      set: formatMoney,
      validate: {
        validator: (value: any) => !Number.isNaN(moneyToNumber(value)),
        message: "Total loans must be a valid number",
      },
    },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active", index: true },
    createdBy: { type: String, default: "", trim: true },
    createdByRole: { type: String, default: "", trim: true },
    updatedBy: { type: String, default: "", trim: true },
  },
  { timestamps: true, versionKey: false, collection: "branches" }
);

branchSchema.pre("validate", function () {
  const branch: any = this;
  if (!branch.branchId) branch.branchId = branch.id;
  if (!branch.branchName) branch.branchName = branch.name;
  if (!branch.name) branch.name = branch.branchName;
  if (!branch.ifscCode) branch.ifscCode = branch.ifsc;
  if (!branch.location) branch.location = branch.address;
  if (!branch.managerName) branch.managerName = branch.manager;
});

const Branch = mongoose.models.Branch || mongoose.model("Branch", branchSchema);
module.exports = Branch;
