const express = require("express")
const UserController = require("../controllers/userController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

// Apply authentication to all routes
router.use(authMiddleware)

// Get user statistics - accessible to all authenticated users
router.get("/stats/summary", authorizeRoles("admin", "election_committee", "sao"), UserController.getStatistics)

// Get all users - admin and election_committee only
router.get("/", authorizeRoles("admin", "election_committee"), UserController.getAllUsers)

// Get specific user - admin and election_committee only
router.get("/:id", authorizeRoles("admin", "election_committee"), UserController.getUser)

// Create user - admin only
router.post("/", authorizeRoles("admin"), UserController.createUser)

// Update user - admin only
router.put("/:id", authorizeRoles("admin"), UserController.updateUser)

// Delete user - admin only
router.delete("/:id", authorizeRoles("admin"), UserController.deleteUser)

module.exports = router