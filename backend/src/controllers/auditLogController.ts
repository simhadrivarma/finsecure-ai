const AuditLog = require("../models/AuditLog");

const getAuditLogs = async (req: any, res: any) => {
  try {
    const logs = await AuditLog.find({})
      .select("-_id -__v")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
      error: error.message,
    });
  }
};

const clearAuditLogs = async (req: any, res: any) => {
  try {
    await AuditLog.deleteMany({});

    return res.status(200).json({
      success: true,
      message: "Audit logs cleared successfully",
      data: [],
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to clear audit logs",
      error: error.message,
    });
  }
};

module.exports = {
  getAuditLogs,
  clearAuditLogs,
};