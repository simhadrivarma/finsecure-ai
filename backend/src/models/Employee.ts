// @ts-nocheck

const mongoose = require("mongoose");

const FINSECURE_IFSC_REGEX = /^FINS0[A-Z0-9]{6}$/;

const EMPLOYEE_ROLES = [
  "Branch Manager",
  "Loan Manager",
  "Loan Officer",
  "Customer Support Executive",
  "Customer Support",
  "Cashier",
  "Relationship Manager",
  "Admin Officer",
  "Fraud Analyst",
  "Report Analyst",
];

const employeeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true, index: true },
    employeeId: { type: String, trim: true, sparse: true, index: true },
    name: { type: String, required: [true, "Employee name is required"], trim: true },
    role: {
      type: String,
      required: [true, "Employee role is required"],
      enum: EMPLOYEE_ROLES,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      index: true,
      validate: {
        validator: (value: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "")),
        message: "Please enter a valid email address",
      },
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      set: (value: any) => String(value || "").replace(/\D/g, ""),
      validate: {
        validator: (value: any) => /^\d{10}$/.test(String(value || "")),
        message: "Phone number must be exactly 10 digits",
      },
    },
    joiningDate: { type: String, default: "", trim: true },
    branch: { type: String, required: [true, "Branch name is required"], trim: true, index: true },
    branchName: { type: String, default: "", trim: true },
    assignedBranch: { type: String, default: "", trim: true },
    branchCode: { type: String, default: "", trim: true },
    branchId: { type: String, default: "", trim: true, index: true },
    ifsc: {
      type: String,
      required: [true, "IFSC code is required"],
      trim: true,
      uppercase: true,
      index: true,
      validate: {
        validator: (value: any) => FINSECURE_IFSC_REGEX.test(String(value || "").toUpperCase()),
        message: "IFSC code must be like FINS0001001",
      },
    },
    ifscCode: { type: String, default: "", uppercase: true, trim: true },
    customers: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active", index: true },
    createdBy: { type: String, default: "", trim: true },
    createdByRole: { type: String, default: "", trim: true },
    updatedBy: { type: String, default: "", trim: true },
  },
  { timestamps: true, versionKey: false, collection: "employees" }
);

employeeSchema.pre("validate", function () {
  const employee: any = this;
  if (!employee.employeeId) employee.employeeId = employee.id;
  if (!employee.branchName) employee.branchName = employee.branch;
  if (!employee.assignedBranch) employee.assignedBranch = employee.branch;
  if (!employee.ifscCode) employee.ifscCode = employee.ifsc;
});

const Employee = mongoose.models.Employee || mongoose.model("Employee", employeeSchema);

module.exports = Employee;
module.exports.EMPLOYEE_ROLES = EMPLOYEE_ROLES;
