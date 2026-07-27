// @ts-nocheck

const mongoose = require("mongoose");

const ADMIN_ROLES = [
  "Super Admin",
  "Admin",
  "Branch Manager",
  "Loan Manager",
  "Loan Officer",
  "Fraud Analyst",
  "Customer Support",
  "Customer Support Executive",
  "Report Analyst",
  "Cashier",
  "Relationship Manager",
  "Admin Officer",
];

const adminSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    adminId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    employeeId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ADMIN_ROLES,
      default: "Branch Manager",
      trim: true,
      index: true,
    },
    branch: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    branchName: {
      type: String,
      default: "",
      trim: true,
    },
    assignedBranch: {
      type: String,
      default: "",
      trim: true,
    },
    branchCode: {
      type: String,
      default: "",
      trim: true,
    },
    branchId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    ifsc: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
      index: true,
    },
    ifscCode: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Active",
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "admins",
  }
);

adminSchema.pre("validate", function () {
  const admin: any = this;

  if (!admin.adminId) admin.adminId = admin.id;
  if (!admin.branchName && admin.branch) admin.branchName = admin.branch;
  if (!admin.branch && admin.branchName) admin.branch = admin.branchName;
  if (!admin.assignedBranch) admin.assignedBranch = admin.branch || admin.branchName || "";
  if (!admin.ifscCode && admin.ifsc) admin.ifscCode = admin.ifsc;
  if (!admin.ifsc && admin.ifscCode) admin.ifsc = admin.ifscCode;
});

adminSchema.set("toJSON", {
  transform: (_doc: any, obj: any) => {
    delete obj.password;
    return obj;
  },
});

adminSchema.set("toObject", {
  transform: (_doc: any, obj: any) => {
    delete obj.password;
    return obj;
  },
});

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);

module.exports = Admin;
module.exports.ADMIN_ROLES = ADMIN_ROLES;
