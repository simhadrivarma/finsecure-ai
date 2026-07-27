// @ts-nocheck

const mongoose = require("mongoose");

const moneyToNumber = (value: any) => {
  if (value === undefined || value === null || value === "") return 0;
  const clean = String(value).replace(/₹/g, "").replace(/,/g, "").replace(/\+/g, "").trim();
  const amount = Number(clean || 0);
  return Number.isFinite(amount) ? amount : NaN;
};

const formatMoney = (value: any) => {
  const amount = moneyToNumber(value);
  return Number.isNaN(amount) ? value : `₹${amount.toLocaleString("en-IN")}`;
};

const cleanAccountNumber = (value: any) =>
  String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").trim();

const loanSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true, index: true },
    loanId: { type: String, trim: true, sparse: true, index: true },

    customer: { type: String, required: [true, "Customer name is required"], trim: true },
    customerName: { type: String, default: "", trim: true },
    fullName: { type: String, default: "", trim: true },
    customerId: { type: String, default: "", trim: true, index: true },
    email: { type: String, default: "", lowercase: true, trim: true, index: true },
    customerEmail: { type: String, default: "", lowercase: true, trim: true },
    userEmail: { type: String, default: "", lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },

    accountNumber: {
      type: String,
      required: [true, "Account number is required"],
      uppercase: true,
      trim: true,
      index: true,
      set: cleanAccountNumber,
      validate: {
        validator: (value: any) => {
          const cleaned = cleanAccountNumber(value);
          return cleaned.length >= 9 && cleaned.length <= 20;
        },
        message: "Account number must contain 9 to 20 characters",
      },
    },
    accountType: { type: String, default: "", trim: true },
    cif: { type: String, default: "", uppercase: true, trim: true },
    cifNumber: { type: String, default: "", uppercase: true, trim: true },

    branch: { type: String, default: "", trim: true, index: true },
    branchName: { type: String, default: "", trim: true },
    branchCode: { type: String, default: "", trim: true },
    branchId: { type: String, default: "", trim: true, index: true },
    ifsc: { type: String, default: "", uppercase: true, trim: true, index: true },
    ifscCode: { type: String, default: "", uppercase: true, trim: true },

    type: {
      type: String,
      required: [true, "Loan type is required"],
      enum: ["Home Loan", "Business Loan", "Personal Loan", "Vehicle Loan", "Education Loan", "Gold Loan"],
      trim: true,
      index: true,
    },
    loanType: { type: String, default: "", trim: true },
    amount: {
      type: String,
      required: [true, "Loan amount is required"],
      set: formatMoney,
      validate: {
        validator: (value: any) => {
          const amount = moneyToNumber(value);
          return !Number.isNaN(amount) && amount > 0;
        },
        message: "Loan amount must be greater than 0",
      },
    },
    loanAmount: { type: String, default: "₹0", set: formatMoney },
    monthlyIncome: { type: Number, default: 0, min: 0 },
    employmentType: { type: String, default: "", trim: true },
    tenure: { type: String, default: "", trim: true },
    tenureMonths: { type: String, default: "", trim: true },

    interest: {
      type: String,
      required: [true, "Interest rate is required"],
      trim: true,
      validate: {
        validator: (value: any) => {
          const rate = Number(String(value || "").replace(/%/g, "").trim());
          return Number.isFinite(rate) && rate >= 0 && rate <= 100;
        },
        message: "Interest rate must be between 0 and 100",
      },
    },
    interestRate: { type: String, default: "", trim: true },
    startDate: { type: String, required: [true, "Start date is required"], trim: true },
    endDate: { type: String, required: [true, "End date is required"], trim: true },
    appliedDate: { type: String, default: () => new Date().toISOString().slice(0, 10), trim: true },

    emi: { type: String, default: "₹0", set: formatMoney },
    paid: { type: String, default: "₹0", set: formatMoney },
    pending: { type: String, default: "₹0", set: formatMoney },
    totalPayable: { type: String, default: "₹0", set: formatMoney },

    purpose: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    existingLoan: { type: String, default: "No", trim: true },

    officer: { type: String, default: "", trim: true, index: true },
    officerEmail: { type: String, default: "", lowercase: true, trim: true, index: true },
    officerId: { type: String, default: "", trim: true, index: true },
    loanOfficer: { type: String, default: "", trim: true },
    loanOfficerEmail: { type: String, default: "", lowercase: true, trim: true },
    loanOfficerId: { type: String, default: "", trim: true },
    assignedOfficer: { type: String, default: "", trim: true },
    assignedOfficerEmail: { type: String, default: "", lowercase: true, trim: true },
    assignedOfficerId: { type: String, default: "", trim: true },
    assignedEmployee: { type: String, default: "", trim: true },
    assignedEmployeeEmail: { type: String, default: "", lowercase: true, trim: true },
    assignedEmployeeId: { type: String, default: "", trim: true },

    status: {
      type: String,
      enum: ["Pending", "Review", "Under Review", "Approved", "Rejected", "Active", "Closed", "Defaulted"],
      default: "Pending",
      trim: true,
      index: true,
    },
    decisionNotes: { type: String, default: "", trim: true },
    approvedBy: { type: String, default: "", trim: true },
    approvedAt: { type: Date, default: null },
    createdBy: { type: String, default: "", trim: true },
    createdByRole: { type: String, default: "", trim: true },
    updatedBy: { type: String, default: "", trim: true },
  },
  { timestamps: true, versionKey: false, collection: "loans" }
);

loanSchema.pre("validate", function () {
  const loan: any = this;
  if (!loan.loanId) loan.loanId = loan.id;
  if (!loan.customerName) loan.customerName = loan.customer;
  if (!loan.fullName) loan.fullName = loan.customer;
  if (!loan.loanType) loan.loanType = loan.type;
  if (!loan.loanAmount || loan.loanAmount === "₹0") loan.loanAmount = loan.amount;
  if (!loan.interestRate) loan.interestRate = loan.interest;
  if (!loan.branchName) loan.branchName = loan.branch;
  if (!loan.ifscCode) loan.ifscCode = loan.ifsc;
  if (!loan.cifNumber) loan.cifNumber = loan.cif;
  if (!loan.customerEmail) loan.customerEmail = loan.email;
  if (!loan.userEmail) loan.userEmail = loan.email;
  if (!loan.loanOfficer) loan.loanOfficer = loan.officer;
  if (!loan.loanOfficerEmail) loan.loanOfficerEmail = loan.officerEmail;
  if (!loan.loanOfficerId) loan.loanOfficerId = loan.officerId;
});

const Loan = mongoose.models.Loan || mongoose.model("Loan", loanSchema);
module.exports = Loan;
module.exports.moneyToNumber = moneyToNumber;
module.exports.formatMoney = formatMoney;
