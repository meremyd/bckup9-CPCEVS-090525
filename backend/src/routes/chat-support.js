const express = require("express")
const chatSupportController = require("../controllers/chatSupportController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

// Public route - Submit chat support request
router.post("/", chatSupportController.submitRequest)

// Admin only routes - Order matters for route matching
router.get("/stats/summary", authMiddleware, authorizeRoles("admin"), chatSupportController.getStatistics)
router.get("/export", authMiddleware, authorizeRoles("admin"), chatSupportController.exportRequests)
router.post("/bulk-update", authMiddleware, authorizeRoles("admin"), chatSupportController.bulkUpdateStatus)

// CRUD routes for individual requests
router.get("/", authMiddleware, authorizeRoles("admin"), chatSupportController.getAllRequests)
router.get("/:id", authMiddleware, authorizeRoles("admin"), chatSupportController.getRequest)
router.put("/:id", authMiddleware, authorizeRoles("admin"), chatSupportController.updateRequestStatus)
router.delete("/:id", authMiddleware, authorizeRoles("admin"), chatSupportController.deleteRequest)

module.exports = router