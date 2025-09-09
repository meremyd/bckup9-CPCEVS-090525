const express = require("express")
const dashboardController = require("../controllers/dashboardController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware") 
const router = express.Router()

router.get("/admin/dashboard", authMiddleware, authorizeRoles("admin"), dashboardController.getAdminDashboard)
router.get("/committee/dashboard", authMiddleware, authorizeRoles("election_committee"), dashboardController.getCommitteeDashboard)
router.get("/sao/dashboard", authMiddleware, authorizeRoles("sao"), dashboardController.getSAODashboard)
router.get("/voter/dashboard", authMiddleware, dashboardController.getVoterDashboard)
  // Note: Voters would need to be handled differently in auth middleware
  // since they're not in the User model but in Voter model

module.exports = router