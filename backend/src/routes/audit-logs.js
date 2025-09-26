const express = require("express")
const AuditLogController = require("../controllers/auditLogController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

router.use(authMiddleware)

router.get("/stats/summary", authorizeRoles("admin"), AuditLogController.getStatistics)
router.get("/export", authorizeRoles("admin"), AuditLogController.exportAuditLogs)
router.get("/user", authorizeRoles("admin"), AuditLogController.getUserAuditLogs)
router.get("/", authorizeRoles("admin"), AuditLogController.getAllAuditLogs)
router.get("/:id", authorizeRoles("admin"), AuditLogController.getAuditLog)

module.exports = router