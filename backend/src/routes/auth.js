const express = require("express")
const authController = require("../controllers/authController")
const router = express.Router()

router.post("/pre-register-step1", authController.preRegisterStep1)
router.post("/pre-register-step2", authController.preRegisterStep2)
router.post("/voter-login", authController.voterLogin)
router.post("/login", authController.login)
router.post("/logout", authController.logout)

module.exports = router
