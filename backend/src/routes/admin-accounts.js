const express = require('express')
const router = express.Router()
const { lookup, create, update } = require('../controllers/adminAccountController')

const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware')
const { adminLimiter } = require('../middleware/rateLimiter')

// All routes protected for admin users only
router.use(authMiddleware)
router.use(authorizeRoles('admin'))
router.use(adminLimiter)

router.get('/accounts/lookup', lookup)
router.post('/accounts', create)
router.put('/accounts/:id', update)

module.exports = router