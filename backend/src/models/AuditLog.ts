// @ts-nocheck

const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const generateLogId = () =>
  `LOG-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

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
    action: { type: String, required: true, trim: true, index: true },
    module: { type: String, required: true, trim: true, index: true },
    adminId: { type: String, default: "", trim: true, index: true },
    employeeId: { type: String, default: "", trim: true, index: true },
    adminName: { type: String, required: true, trim: true, default: "FinSecure Admin" },
    adminEmail: { type: String, trim: true, lowercase: true, default: "", index: true },
    adminRole: { type: String, trim: true, default: "Admin", index: true },
    branch: { type: String, default: "", trim: true, index: true },
    branchName: { type: String, default: "", trim: true },
    branchId: { type: String, default: "", trim: true },
    ifsc: { type: String, default: "", uppercase: true, trim: true, index: true },
    ifscCode: { type: String, default: "", uppercase: true, trim: true },
    description: { type: String, required: true, trim: true },
    targetName: { type: String, trim: true, default: "-" },
    status: {
      type: String,
      enum: ["Success", "Failed", "Warning", "Denied"],
      default: "Success",
      trim: true,
      index: true,
    },
    ipAddress: { type: String, trim: true, default: "" },
    userAgent: { type: String, trim: true, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false, collection: "auditlogs" }
);

auditLogSchema.pre("validate", function () {
  const log: any = this;
  if (!log.branchName) log.branchName = log.branch;
  if (!log.ifscCode) log.ifscCode = log.ifsc;
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ module: 1, action: 1, status: 1, createdAt: -1 });
auditLogSchema.index({ branch: 1, ifsc: 1, createdAt: -1 });

const AuditLog =
  mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
