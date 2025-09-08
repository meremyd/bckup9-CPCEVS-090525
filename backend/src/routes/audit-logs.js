const express = require("express")
const AuditLogController = require("../controllers/auditLogController")
const router = express.Router()

router.get("/stats/summary", AuditLogController.getStatistics)
router.get("/export", AuditLogController.exportAuditLogs)
router.get("/user", AuditLogController.getUserAuditLogs)
router.get("/", AuditLogController.getAllAuditLogs)
router.get("/:id", AuditLogController.getAuditLog)

module.exports = router