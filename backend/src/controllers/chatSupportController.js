const ChatSupport = require("../models/ChatSupport")
const AuditLog = require("../models/AuditLog")

class ChatSupportController {
  // Submit chat support request
  static async submitRequest(req, res, next) {
    try {
      const { idNumber, fullName, course, birthday, email, message } = req.body

      // Validation
      if (!idNumber || !fullName || !course || !birthday || !email || !message) {
        const error = new Error("All fields are required")
        error.statusCode = 400
        return next(error)
      }

      // Validate course
      const validCourses = ["BSIT", "BSED", "BEED", "BSHM"]
      if (!validCourses.includes(course)) {
        const error = new Error("Invalid course selection")
        error.statusCode = 400
        return next(error)
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        const error = new Error("Invalid email format")
        error.statusCode = 400
        return next(error)
      }

      // Create chat support request
      const chatSupport = new ChatSupport({
        idNumber,
        fullName,
        course,
        birthday: new Date(birthday),
        email,
        message,
        status: "pending",
      })

      await chatSupport.save()

      // Log the support request
      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: idNumber,
        details: `Chat support request submitted - ${fullName}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.status(201).json({
        message: "Support request submitted successfully",
        requestId: chatSupport._id,
      })
    } catch (error) {
      next(error)
    }
  }

  // Get all chat support requests (for admin)
  static async getAllRequests(req, res, next) {
    try {
      const { status, course, page = 1, limit = 10 } = req.query

      // Build filter
      const filter = {}
      if (status) filter.status = status
      if (course) filter.course = course

      // Pagination
      const skip = (page - 1) * limit

      const requests = await ChatSupport.find(filter).sort({ submittedAt: -1 }).skip(skip).limit(Number.parseInt(limit))

      const total = await ChatSupport.countDocuments(filter)

      res.json({
        requests,
        pagination: {
          current: Number.parseInt(page),
          total: Math.ceil(total / limit),
          count: requests.length,
          totalRequests: total,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // Get single chat support request
  static async getRequest(req, res, next) {
    try {
      const { id } = req.params

      const request = await ChatSupport.findById(id)
      if (!request) {
        const error = new Error("Support request not found")
        error.statusCode = 404
        return next(error)
      }

      res.json(request)
    } catch (error) {
      next(error)
    }
  }

  // Update chat support request status
  static async updateRequestStatus(req, res, next) {
    try {
      const { id } = req.params
      const { status, response } = req.body

      const validStatuses = ["pending", "in-progress", "resolved", "closed"]
      if (!validStatuses.includes(status)) {
        const error = new Error("Invalid status")
        error.statusCode = 400
        return next(error)
      }

      const updateData = {
        status,
        updatedAt: new Date(),
      }

      if (response) {
        updateData.response = response
        updateData.respondedAt = new Date()
      }

      const request = await ChatSupport.findByIdAndUpdate(id, updateData, { new: true })
      if (!request) {
        const error = new Error("Support request not found")
        error.statusCode = 404
        return next(error)
      }

      // Log the status update
      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        details: `Chat support request ${id} status updated to ${status}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        message: "Request updated successfully",
        request,
      })
    } catch (error) {
      next(error)
    }
  }

  // Get support statistics
  static async getStatistics(req, res, next) {
    try {
      const stats = await ChatSupport.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])

      const courseStats = await ChatSupport.aggregate([
        {
          $group: {
            _id: "$course",
            count: { $sum: 1 },
          },
        },
      ])

      const total = await ChatSupport.countDocuments()

      res.json({
        total,
        byStatus: stats,
        byCourse: courseStats,
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = ChatSupportController