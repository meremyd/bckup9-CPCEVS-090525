const express = require("express")
const AuthController = require("../controllers/authController")
const router = express.Router()

router.post("/pre-register-step1", AuthController.preRegisterStep1)
router.post("/pre-register-step2", AuthController.preRegisterStep2)
router.post("/voter-login", AuthController.voterLogin)
router.post("/login", AuthController.login)
router.post("/logout", AuthController.logout)
router.get("/me", AuthController.checkAuth)
router.post("/refresh", AuthController.refreshToken)

module.exports = router
