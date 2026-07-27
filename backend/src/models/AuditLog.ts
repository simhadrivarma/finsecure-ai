// @ts-nocheck

const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const generateLogId = () => {
  return `LOG-${Date.now()}-${randomUUID().slice(0, 8)}`;
};

const auditLogSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: generateLogId,
      trim: true,
    },

    action: {
      type: String,
      required: [true, "Audit action is required"],
      trim: true,
      index: true,
    },

    module: {
      type: String,
      required: [true, "Audit module is required"],
      trim: true,
      index: true,
    },

    adminName: {
      type: String,
      required: [true, "Admin name is required"],
      trim: true,
      default: "FinSecure Admin",
    },

    adminEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      index: true,
    },

    adminRole: {
      type: String,
      trim: true,
      default: "Super Admin",
      index: true,
    },

    description: {
      type: String,
      required: [true, "Audit description is required"],
      trim: true,
    },

    targetName: {
      type: String,
      trim: true,
      default: "-",
    },

    status: {
      type: String,
      enum: [
        "Success",
        "Failed",
        "Warning",
        "Denied",
      ],
      default: "Success",
      trim: true,
      index: true,
    },

    ipAddress: {
      type: String,
      trim: true,
      default: "",
    },

    userAgent: {
      type: String,
      trim: true,
      default: "",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "auditlogs",
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({
  module: 1,
  action: 1,
  status: 1,
  createdAt: -1,
});

auditLogSchema.set("toJSON", {
  transform: (_document: any, returnedObject: any) => {
    delete returnedObject.__v;
    return returnedObject;
  },
});

auditLogSchema.set("toObject", {
  transform: (_document: any, returnedObject: any) => {
    delete returnedObject.__v;
    return returnedObject;
  },
});

const AuditLog =
  mongoose.models.AuditLog ||
  mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;