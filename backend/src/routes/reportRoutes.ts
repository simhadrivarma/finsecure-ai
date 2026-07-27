// @ts-nocheck

const express = require("express");
const mongoose = require("mongoose");
const Report = require("../models/Report");
const auth = require("../middleware/authMiddleware");

const router = express.Router();
const protectAdmin = auth.protectAdmin || auth;
const requirePermission = auth.requirePermission;
const mergeFilters = auth.mergeFilters;
const isFullAdminRole = auth.isFullAdminRole;

const generateReportId = () =>
  `RPT${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

const anyIdFilter = (id: string) => ({
  $or: [
    { id },
    { reportId: id },
    ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
  ],
});

const cleanPayload = (body: any) => {
  const payload: any = {};
  const allowed = [
    "title",
    "reportTitle",
    "type",
    "reportType",
    "totalRecords",
    "generatedBy",
    "generatedDate",
    "branch",
    "branchName",
    "branchId",
    "branchCode",
    "ifsc",
    "ifscCode",
    "status",
  ];

  allowed.forEach((field) => {
    if (body?.[field] !== undefined) payload[field] = body[field];
  });

  const title = String(payload.title || payload.reportTitle || "").trim();
  const type = String(payload.type || payload.reportType || "").trim();
  if (title) {
    payload.title = title;
    payload.reportTitle = title;
  }
  if (type) {
    payload.type = type;
    payload.reportType = type;
  }
  if (payload.totalRecords !== undefined) {
    payload.totalRecords = Math.max(0, Number(payload.totalRecords || 0));
  }
  if (payload.ifsc !== undefined) {
    payload.ifsc = String(payload.ifsc).toUpperCase().trim();
  }
  if (payload.ifscCode !== undefined) {
    payload.ifscCode = String(payload.ifscCode).toUpperCase().trim();
  }

  return payload;
};

const applyAdminScope = (req: any, payload: any) => {
  if (isFullAdminRole(req.admin?.role)) return payload;

  const branch = req.admin.branch || req.admin.branchName || "";
  const ifsc = String(req.admin.ifsc || req.admin.ifscCode || "")
    .toUpperCase()
    .trim();

  return {
    ...payload,
    branch,
    branchName: branch,
    branchId: req.admin.branchId || "",
    branchCode: req.admin.branchCode || "",
    ifsc,
    ifscCode: ifsc,
  };
};

router.use(protectAdmin);

router.get("/", requirePermission("reports", "read"), async (req: any, res: any) => {
  try {
    const query: any = {};
    if (req.query?.status) query.status = String(req.query.status).trim();
    if (req.query?.type) {
      query.$or = [
        { type: String(req.query.type).trim() },
        { reportType: String(req.query.type).trim() },
      ];
    }

    const reports = await Report.find(
      mergeFilters(query, req.getAccessFilter("reports"))
    )
      .select("-__v")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reports",
    });
  }
});

router.get("/:id", requirePermission("reports", "read"), async (req: any, res: any) => {
  try {
    const report = await Report.findOne(
      mergeFilters(anyIdFilter(req.params.id), req.getAccessFilter("reports"))
    )
      .select("-__v")
      .lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found or access denied",
      });
    }

    return res.status(200).json({ success: true, data: report });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch report",
    });
  }
});

router.post("/", requirePermission("reports", "create"), async (req: any, res: any) => {
  try {
    let payload = applyAdminScope(req, cleanPayload(req.body));
    if (!payload.title || !payload.type) {
      return res.status(400).json({
        success: false,
        message: "Report title and report type are required",
      });
    }

    const id = generateReportId();
    const report = await Report.create({
      id,
      reportId: id,
      ...payload,
      generatedBy: payload.generatedBy || req.admin.name || req.admin.email,
      generatedById: req.admin.employeeId || req.admin.id || "",
      generatedDate:
        payload.generatedDate || new Date().toISOString().slice(0, 10),
      createdByRole: req.admin.role,
    });

    return res.status(201).json({
      success: true,
      message: "Report created successfully",
      data: report,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create report",
    });
  }
});

router.put("/:id", requirePermission("reports", "update"), async (req: any, res: any) => {
  try {
    const access = req.getAccessFilter("reports");
    const existing = await Report.findOne(
      mergeFilters(anyIdFilter(req.params.id), access)
    ).lean();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Report not found or access denied",
      });
    }

    const payload = applyAdminScope(req, cleanPayload(req.body));
    payload.updatedBy = req.admin.email || req.admin.name;

    const report = await Report.findOneAndUpdate(
      mergeFilters(anyIdFilter(req.params.id), access),
      payload,
      { new: true, runValidators: true }
    ).select("-__v");

    return res.status(200).json({
      success: true,
      message: "Report updated successfully",
      data: report,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update report",
    });
  }
});

router.delete("/:id", requirePermission("reports", "delete"), async (req: any, res: any) => {
  try {
    const report = await Report.findOneAndDelete(
      mergeFilters(anyIdFilter(req.params.id), req.getAccessFilter("reports"))
    ).select("-__v");

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found or access denied",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Report deleted successfully",
      data: report,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete report",
    });
  }
});

module.exports = router;
