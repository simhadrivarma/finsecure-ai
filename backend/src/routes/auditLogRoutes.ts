const express = require("express");

const {
  getAuditLogs,
  clearAuditLogs,
} = require("../controllers/auditLogController");

const router = express.Router();

router.get("/", getAuditLogs);
router.delete("/", clearAuditLogs);

module.exports = router;