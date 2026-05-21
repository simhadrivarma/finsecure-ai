const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    joiningDate: {
      type: String,
      default: "",
      trim: true,
    },
    branch: {
      type: String,
      required: true,
      trim: true,
    },
    ifsc: {
      type: String,
      required: true,
      trim: true,
    },
    customers: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: "Active",
      enum: ["Active", "Inactive"],
    },
  },
  {
    timestamps: true,
  }
);

const Employee =
  mongoose.models.Employee || mongoose.model("Employee", employeeSchema);

module.exports = Employee;