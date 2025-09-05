const express = require("express")
const chatSupportController = require("../controllers/chatSupportController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware") // Import middleware
const router = express.Router()

// Public route for submitting requests
router.post("/", chatSupportController.submitRequest)

// Protected routes for managing requests (admin only)
router.get("/", authMiddleware, authorizeRoles("admin"), chatSupportController.getAllRequests)
router.get("/:id", authMiddleware, authorizeRoles("admin"), chatSupportController.getRequest)
router.put("/:id", authMiddleware, authorizeRoles("admin"), chatSupportController.updateRequestStatus)
router.get("/stats/summary", authMiddleware, authorizeRoles("admin"), chatSupportController.getStatistics)

module.exports = router