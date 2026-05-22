const express = require("express");
const Report = require("../models/Report");

const router = express.Router();

console.log("✅ STRICT REPORT ROUTES LOADED");

router.get("/", async (req: any, res: any) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: reports,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reports",
    });
  }
});

router.post("/", async (req: any, res: any) => {
  try {
    const {
      title,
      reportTitle,
      reportType,
      type,
      totalRecords,
      generatedBy,
      generatedDate,
      status,
    } = req.body;

    const finalTitle = title || reportTitle;
    const finalReportType = reportType || type;

    if (!finalTitle) {
      return res.status(400).json({
        success: false,
        message: "Report title is required",
      });
    }

    if (!finalReportType) {
      return res.status(400).json({
        success: false,
        message: "Report type is required",
      });
    }

    const report = await Report.create({
      title: finalTitle,
      reportType: finalReportType,
      totalRecords: Number(totalRecords || 0),
      generatedBy: generatedBy || "Admin",
      generatedDate: generatedDate || new Date().toISOString().slice(0, 10),
      status: status || "Pending",
    });

    return res.status(201).json({
      success: true,
      message: "Report created successfully",
      data: report,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create report",
    });
  }
});

router.put("/:id", async (req: any, res: any) => {
  try {
    const {
      title,
      reportTitle,
      reportType,
      type,
      totalRecords,
      generatedBy,
      generatedDate,
      status,
    } = req.body;

    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id,
      {
        title: title || reportTitle,
        reportType: reportType || type,
        totalRecords: Number(totalRecords || 0),
        generatedBy: generatedBy || "Admin",
        generatedDate: generatedDate || new Date().toISOString().slice(0, 10),
        status: status || "Pending",
      },
      { new: true, runValidators: true }
    );

    if (!updatedReport) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Report updated successfully",
      data: updatedReport,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update report",
    });
  }
});

router.delete("/:id", async (req: any, res: any) => {
  try {
    const deletedReport = await Report.findByIdAndDelete(req.params.id);

    if (!deletedReport) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete report",
    });
  }
});

module.exports = router;