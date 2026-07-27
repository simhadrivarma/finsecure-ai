// @ts-nocheck

const express = require("express");
const { randomUUID } = require("crypto");
const AuditLog = require("../models/AuditLog");
const auth = require("../middleware/authMiddleware");

const router = express.Router();
const protectAdmin = auth.protectAdmin || auth;
const requirePermission = auth.requirePermission;

router.use(protectAdmin);

/* Only Super Admin/Admin can read the complete permanent audit history. */
router.get(
  "/",
  requirePermission("audit logs", "read"),
  async (req: any, res: any) => {
    try {
      const query: Record<string, any> = {};

      ["status", "module", "action", "adminRole", "branch", "ifsc"].forEach(
        (field) => {
          if (req.query?.[field]) query[field] = String(req.query[field]).trim();
        }
      );

      if (req.query?.adminEmail) {
        query.adminEmail = String(req.query.adminEmail).toLowerCase().trim();
      }

      const requestedLimit = Number(req.query?.limit || 1000);
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(Math.floor(requestedLimit), 1), 5000)
        : 1000;

      const logs = await AuditLog.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return res.status(200).json({
        success: true,
        count: logs.length,
        data: logs,
        logs,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to load audit logs",
      });
    }
  }
);

/*
 * Every authenticated staff role may create an audit event for an action it
 * performed. Identity, role and branch are taken from the verified session,
 * not from editable browser fields.
 */
router.post("/", async (req: any, res: any) => {
  try {
    const { id, action, module, description, targetName, status, metadata } =
      req.body || {};

    if (!action || !module || !description) {
      return res.status(400).json({
        success: false,
        message: "Action, module and description are required",
      });
    }

    const logId =
      String(id || "").trim() ||
      `LOG-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const allowedStatuses = new Set([
      "Success",
      "Failed",
      "Warning",
      "Denied",
    ]);
    const requestedStatus = String(status || "Success").trim();
    const safeStatus = allowedStatuses.has(requestedStatus)
      ? requestedStatus
      : "Success";

    const forwardedIp = String(req.headers["x-forwarded-for"] || "")
      .split(",")[0]
      .trim();
    const branch = req.admin.branch || req.admin.branchName || "";
    const ifsc = String(req.admin.ifsc || req.admin.ifscCode || "")
      .toUpperCase()
      .trim();

    const payload = {
      id: logId,
      action: String(action).trim(),
      module: String(module).trim(),
      adminId: req.admin.adminId || req.admin.id || "",
      employeeId: req.admin.employeeId || "",
      adminName: req.admin.name || req.admin.email || "FinSecure Admin",
      adminEmail: String(req.admin.email || "").toLowerCase().trim(),
      adminRole: req.admin.role || "Admin",
      branch,
      branchName: branch,
      branchId: req.admin.branchId || "",
      ifsc,
      ifscCode: ifsc,
      description: String(description).trim(),
      targetName: String(targetName || "-").trim(),
      status: safeStatus,
      ipAddress:
        forwardedIp || String(req.ip || req.socket?.remoteAddress || "").trim(),
      userAgent: String(req.headers["user-agent"] || "").trim(),
      metadata:
        metadata && typeof metadata === "object" && !Array.isArray(metadata)
          ? metadata
          : {},
    };

    const savedLog = await AuditLog.findOneAndUpdate(
      { id: logId },
      { $setOnInsert: payload },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Audit log saved permanently",
      data: savedLog,
      log: savedLog,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save audit log",
    });
  }
});

/* Audit history is permanent and cannot be cleared from the application. */
router.delete(
  "/",
  requirePermission("audit logs", "delete"),
  async (_req: any, res: any) =>
    res.status(403).json({
      success: false,
      message: "Audit logs are permanent and cannot be cleared",
    })
);

module.exports = router;
