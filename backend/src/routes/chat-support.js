const express = require("express")
const chatSupportController = require("../controllers/chatSupportController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const router = express.Router()

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/chat-support')
try {
	fs.mkdirSync(uploadDir, { recursive: true })
} catch (err) {
	console.error('Could not create upload directory', err)
}

// Multer storage configuration
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadDir)
	},
	filename: function (req, file, cb) {
		const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`
		cb(null, safeName)
	}
})

const imageFileFilter = (req, file, cb) => {
	if (!file.mimetype.startsWith('image/')) {
		return cb(new Error('Only image files are allowed!'), false)
	}
	cb(null, true)
}

const upload = multer({ storage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } })

// Public routes - MUST come first
// Accept a single file under field name 'photo' on the public submit endpoint
router.post("/", upload.single('photo'), chatSupportController.submitRequest)
router.get("/faqs", chatSupportController.getFAQs) // Public FAQ endpoint
router.get("/faqs/categories", chatSupportController.getFAQCategories) // Public categories endpoint

// Admin routes - MUST come before generic routes to avoid conflicts
// Statistics and export routes should come first
router.get("/stats/summary", authMiddleware, authorizeRoles("admin"), chatSupportController.getStatistics)
router.get("/export", authMiddleware, authorizeRoles("admin"), chatSupportController.exportRequests)
router.post("/bulk-update", authMiddleware, authorizeRoles("admin"), chatSupportController.bulkUpdateStatus)

// Send response email (admin)
router.post('/:id/send', authMiddleware, authorizeRoles('admin'), chatSupportController.sendResponse)
// Serve photo for a specific request (admin-only)
router.get('/:id/photo', authMiddleware, authorizeRoles('admin'), chatSupportController.getPhoto)

// Generic admin routes - these should come AFTER specific routes
router.get("/", authMiddleware, authorizeRoles("admin"), chatSupportController.getAllRequests)
router.get("/:id", authMiddleware, authorizeRoles("admin"), chatSupportController.getRequest)
router.put("/:id", authMiddleware, authorizeRoles("admin"), chatSupportController.updateRequestStatus)
router.delete("/:id", authMiddleware, authorizeRoles("admin"), chatSupportController.deleteRequest)

module.exports = router