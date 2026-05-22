const AuditLog = require("../models/AuditLog");

const createAuditLog = async ({
  req,
  admin,
  action,
  module,
  description,
  targetId = "",
  targetName = "",
  status = "Success",
}: any) => {
  try {
    const currentAdmin = admin || req?.admin || {};

    await AuditLog.create({
      id: `AUD${Date.now()}${Math.floor(Math.random() * 1000)}`,
      adminId: currentAdmin.id || "",
      adminName: currentAdmin.name || "",
      adminEmail: currentAdmin.email || "",
      adminRole: currentAdmin.role || "",
      action,
      module,
      description,
      targetId,
      targetName,
      status,
      ipAddress:
        req?.headers?.["x-forwarded-for"] ||
        req?.socket?.remoteAddress ||
        req?.ip ||
        "",
      userAgent: req?.headers?.["user-agent"] || "",
    });
  } catch (error: any) {
    console.log("Audit log creation failed:", error.message);
  }
};

module.exports = createAuditLog;