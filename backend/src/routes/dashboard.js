const express = require("express")
const dashboardController = require("../controllers/dashboardController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware") 
const router = express.Router()

// Admin dashboard - only admin can access
router.get("/admin/dashboard", authMiddleware, authorizeRoles("admin"), dashboardController.getAdminDashboard)

// Election Committee dashboard - only election committee can access
router.get("/committee/dashboard", authMiddleware, authorizeRoles("election_committee"), dashboardController.getCommitteeDashboard)

// SAO dashboard - only SAO can access
router.get("/sao/dashboard", authMiddleware, authorizeRoles("sao"), dashboardController.getSAODashboard)

// NEW: Voter dashboard - voters can access their own dashboard
router.get("/voter/dashboard", authMiddleware, dashboardController.getVoterDashboard)
  // Note: Voters would need to be handled differently in auth middleware
  // since they're not in the User model but in Voter model

module.exports = router