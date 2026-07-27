// @ts-nocheck

const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true, index: true },
    reportId: { type: String, default: "", trim: true, index: true },
    title: { type: String, required: true, trim: true },
    reportTitle: { type: String, default: "", trim: true },
    type: { type: String, required: true, trim: true, index: true },
    reportType: { type: String, default: "", trim: true, index: true },
    totalRecords: { type: Number, default: 0, min: 0 },
    generatedBy: { type: String, default: "Admin", trim: true },
    generatedById: { type: String, default: "", trim: true },
    generatedDate: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10),
      trim: true,
    },
    branch: { type: String, default: "", trim: true, index: true },
    branchName: { type: String, default: "", trim: true },
    branchId: { type: String, default: "", trim: true },
    branchCode: { type: String, default: "", trim: true },
    ifsc: { type: String, default: "", uppercase: true, trim: true, index: true },
    ifscCode: { type: String, default: "", uppercase: true, trim: true },
    status: {
      type: String,
      enum: ["Ready", "Review", "Pending", "Archived"],
      default: "Pending",
      trim: true,
      index: true,
    },
    createdByRole: { type: String, default: "", trim: true },
    updatedBy: { type: String, default: "", trim: true },
  },
  { timestamps: true, versionKey: false, collection: "reports" }
);

reportSchema.pre("validate", function () {
  const report: any = this;
  if (!report.reportId) report.reportId = report.id;
  if (!report.reportTitle) report.reportTitle = report.title;
  if (!report.title) report.title = report.reportTitle;
  if (!report.reportType) report.reportType = report.type;
  if (!report.type) report.type = report.reportType;
  if (!report.branchName) report.branchName = report.branch;
  if (!report.ifscCode) report.ifscCode = report.ifsc;
});

const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);
module.exports = Report;
