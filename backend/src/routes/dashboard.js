const express = require("express")
const dashboardController = require("../controllers/dashboardController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware") 
const router = express.Router()

router.get("/admin/dashboard", authMiddleware, authorizeRoles("admin"), dashboardController.getAdminDashboard)
router.get("/committee/dashboard", authMiddleware, authorizeRoles("election_committee"), dashboardController.getCommitteeDashboard)
router.get("/sao/dashboard", authMiddleware, authorizeRoles("sao"), dashboardController.getSAODashboard)

module.exports = router