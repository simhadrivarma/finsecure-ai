const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    reportType: {
      type: String,
      required: true,
      trim: true,
    },
    totalRecords: {
      type: Number,
      default: 0,
    },
    generatedBy: {
      type: String,
      default: "Admin",
      trim: true,
    },
    generatedDate: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10),
    },
    status: {
      type: String,
      default: "Pending",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);

module.exports = Report;