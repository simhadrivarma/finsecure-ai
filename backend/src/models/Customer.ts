const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    customerName: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
    },

    password: {
      type: String,
      select: false,
    },

    accountNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    accountType: {
      type: String,
      default: "Savings Account",
      trim: true,
    },

    ifsc: {
      type: String,
      trim: true,
    },

    ifscCode: {
      type: String,
      trim: true,
    },

    cif: {
      type: String,
      trim: true,
    },

    cifNumber: {
      type: String,
      trim: true,
    },

    aadhaarNumber: {
      type: String,
      trim: true,
    },

    panNumber: {
      type: String,
      uppercase: true,
      trim: true,
    },

    balance: {
      type: Number,
      default: 0,
    },

    totalIncome: {
      type: Number,
      default: 0,
    },

    totalExpense: {
      type: Number,
      default: 0,
    },

    branch: {
      type: String,
      default: "Main Branch",
      trim: true,
    },

    assignedEmployee: {
      type: String,
      default: "",
      trim: true,
    },

    kyc: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Pending",
    },

    status: {
      type: String,
      enum: ["Pending", "Active", "Inactive", "Suspended"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.pre("save", function (next: any) {
  if (!this.customerName && this.name) {
    this.customerName = this.name;
  }

  if (!this.name && this.customerName) {
    this.name = this.customerName;
  }

  if (!this.phoneNumber && this.phone) {
    this.phoneNumber = this.phone;
  }

  if (!this.phone && this.phoneNumber) {
    this.phone = this.phoneNumber;
  }

  if (!this.ifscCode && this.ifsc) {
    this.ifscCode = this.ifsc;
  }

  if (!this.ifsc && this.ifscCode) {
    this.ifsc = this.ifscCode;
  }

  if (!this.cifNumber && this.cif) {
    this.cifNumber = this.cif;
  }

  if (!this.cif && this.cifNumber) {
    this.cif = this.cifNumber;
  }

  next();
});

const Customer =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);

module.exports = Customer;