const mongoose = require("mongoose");

const FINSECURE_IFSC_REGEX = /^FINS0[A-Z0-9]{6}$/;

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
      required: [true, "Employee name is required"],
      trim: true,
    },

    role: {
      type: String,
      required: [true, "Employee role is required"],
      enum: [
        "Branch Manager",
        "Loan Officer",
        "Customer Support Executive",
        "Cashier",
        "Relationship Manager",
        "Admin Officer",
        "Fraud Analyst",
      ],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      set: function (value: any) {
        return String(value || "").toLowerCase().trim();
      },
      validate: {
        validator: function (value: any) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
        },
        message: "Please enter a valid email address",
      },
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      set: function (value: any) {
        return String(value || "").replace(/\D/g, "");
      },
      validate: {
        validator: function (value: any) {
          return /^\d{10}$/.test(String(value || ""));
        },
        message: "Phone number must be exactly 10 digits",
      },
    },

    joiningDate: {
      type: String,
      default: "",
      trim: true,
    },

    branch: {
      type: String,
      required: [true, "Branch name is required"],
      trim: true,
    },

    ifsc: {
      type: String,
      required: [true, "IFSC code is required"],
      trim: true,
      uppercase: true,
      set: function (value: any) {
        return String(value || "").toUpperCase().trim();
      },
      validate: {
        validator: function (value: any) {
          return FINSECURE_IFSC_REGEX.test(String(value || "").toUpperCase());
        },
        message: "IFSC code must be like FINS0001001",
      },
    },

    customers: {
      type: Number,
      default: 0,
      min: [0, "Customers managed cannot be negative"],
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

const Employee =
  mongoose.models.Employee || mongoose.model("Employee", employeeSchema);

module.exports = Employee;