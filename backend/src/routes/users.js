const express = require("express")
const UserController = require("../controllers/userController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

router.use(authMiddleware)

router.get("/stats/summary", authorizeRoles("admin", "election_committee", "sao"), UserController.getStatistics)
router.get("/", authorizeRoles("admin", "election_committee"), UserController.getAllUsers)
router.get("/:id", authorizeRoles("admin", "election_committee"), UserController.getUser)

router.post("/", authorizeRoles("admin"), UserController.createUser)
router.put("/:id", authorizeRoles("admin"), UserController.updateUser)
router.delete("/:id", authorizeRoles("admin"), UserController.deleteUser)

module.exports = router