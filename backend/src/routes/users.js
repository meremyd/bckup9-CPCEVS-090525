const express = require("express")
const UserController = require("../controllers/userController")
const router = express.Router()

router.get("/stats/summary", UserController.getStatistics)
router.get("/", UserController.getAllUsers)
router.get("/:id", UserController.getUser)
router.post("/", UserController.createUser)
router.put("/:id", UserController.updateUser)
router.delete("/:id", UserController.deleteUser)

module.exports = router
