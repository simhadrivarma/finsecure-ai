// @ts-nocheck
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
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
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },

    accountNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    aadhaarNumber: {
      type: String,
      default: "",
      trim: true,
    },

    panNumber: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.User || mongoose.model("User", UserSchema);
