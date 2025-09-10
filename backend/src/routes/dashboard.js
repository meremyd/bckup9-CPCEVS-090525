const express = require("express")
const dashboardController = require("../controllers/dashboardController")
const { authMiddleware, authorizeRoles, voterAuthMiddleware } = require("../middleware/authMiddleware") 
const router = express.Router()

// Admin Dashboard
router.get("/admin/dashboard", 
  authMiddleware, 
  authorizeRoles("admin"), 
  dashboardController.getAdminDashboard
)

// Election Committee Dashboard  
router.get("/committee/dashboard", 
  authMiddleware, 
  authorizeRoles("election_committee"), 
  dashboardController.getCommitteeDashboard
)

// SAO Dashboard
router.get("/sao/dashboard", 
  authMiddleware, 
  authorizeRoles("sao"), 
  dashboardController.getSAODashboard
)

// Voter Dashboard - Using voterAuthMiddleware for proper voter authentication
router.get("/voter/dashboard", 
  voterAuthMiddleware, 
  dashboardController.getVoterDashboard
)

module.exports = router