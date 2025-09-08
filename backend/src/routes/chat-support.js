const express = require("express")
const chatSupportController = require("../controllers/chatSupportController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

// Public route for submitting requests
router.post("/", chatSupportController.submitRequest)

// Protected routes for managing requests (admin only)
// IMPORTANT: Specific routes MUST come before parameterized routes
router.get("/stats/summary", authMiddleware, authorizeRoles("admin"), chatSupportController.getStatistics)
router.get("/export", authMiddleware, authorizeRoles("admin"), chatSupportController.exportRequests)
router.post("/bulk-update", authMiddleware, authorizeRoles("admin"), chatSupportController.bulkUpdateStatus)

// Parameterized routes (these must come AFTER specific routes)
router.get("/", authMiddleware, authorizeRoles("admin"), chatSupportController.getAllRequests)
router.get("/:id", authMiddleware, authorizeRoles("admin"), chatSupportController.getRequest)
router.put("/:id", authMiddleware, authorizeRoles("admin"), chatSupportController.updateRequestStatus)
router.delete("/:id", authMiddleware, authorizeRoles("admin"), chatSupportController.deleteRequest)

module.exports = router