const multer = require("multer")
const path = require("path")
const fs = require("fs").promises

// Configure multer for face recognition photos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/face-recognition")

    try {
      await fs.mkdir(uploadDir, { recursive: true })
      cb(null, uploadDir)
    } catch (error) {
      cb(error)
    }
  },
  filename: (req, file, cb) => {
    const { schoolId } = req.body
    const timestamp = Date.now()
    const extension = path.extname(file.originalname)
    const filename = `${schoolId}_${timestamp}${extension}`
    cb(null, filename)
  },
})

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Invalid file type. Only JPEG, JPG, and PNG are allowed."), false)
  }
}

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

// Upload face recognition photo
const uploadFacePhoto = async (req, res, next) => {
  try {
    const { schoolId } = req.body

    if (!schoolId) {
      const error = new Error("School ID is required")
      error.statusCode = 400
      return next(error)
    }

    if (!req.file) {
      const error = new Error("No photo uploaded")
      error.statusCode = 400
      return next(error)
    }

    // Save photo metadata to database (you might want to create a FacePhoto model)
    const photoData = {
      schoolId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date(),
    }

    // Here you could save to a FacePhoto model or update the Voter model
    // For now, we'll just return the file info

    res.json({
      message: "Photo uploaded successfully",
      photo: {
        filename: req.file.filename,
        path: `/uploads/face-recognition/${req.file.filename}`,
        size: req.file.size,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Upload profile picture
const uploadProfilePicture = async (req, res, next) => {
  try {
    const { userId } = req.params

    if (!req.file) {
      const error = new Error("No image uploaded")
      error.statusCode = 400
      return next(error)
    }

    // Update user/voter profile with new image path
    const imagePath = `/uploads/profiles/${req.file.filename}`

    res.json({
      message: "Profile picture updated successfully",
      imagePath,
    })
  } catch (error) {
    next(error)
  }
}

// Delete uploaded file
const deleteFile = async (req, res, next) => {
  try {
    const { filename } = req.params
    const { type } = req.query // 'face-recognition' or 'profiles'

    const filePath = path.join(__dirname, "../../uploads", type || "face-recognition", filename)

    await fs.unlink(filePath)

    res.json({
      message: "File deleted successfully",
    })
  } catch (error) {
    if (error.code === "ENOENT") {
      const notFoundError = new Error("File not found")
      notFoundError.statusCode = 404
      return next(notFoundError)
    }
    next(error)
  }
}

// Get file info
const getFileInfo = async (req, res, next) => {
  try {
    const { filename } = req.params
    const { type } = req.query

    const filePath = path.join(__dirname, "../../uploads", type || "face-recognition", filename)

    const stats = await fs.stat(filePath)

    res.json({
      filename,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      path: `/uploads/${type || "face-recognition"}/${filename}`,
    })
  } catch (error) {
    if (error.code === "ENOENT") {
      const notFoundError = new Error("File not found")
      notFoundError.statusCode = 404
      return next(notFoundError)
    }
    next(error)
  }
}

module.exports = {
  upload,
  uploadFacePhoto,
  uploadProfilePicture,
  deleteFile,
  getFileInfo,
}