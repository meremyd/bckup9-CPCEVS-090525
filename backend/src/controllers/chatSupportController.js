const ChatSupport = require("../models/ChatSupport")
const Degree = require("../models/Degree")
const Voter = require("../models/Voter")
const AuditLog = require("../models/AuditLog")

class ChatSupportController {
  // Submit chat support request
  static async submitRequest(req, res, next) {
    try {
      const { schoolId, fullName, degreeId, birthday, email, message } = req.body

      // Validation
      if (!schoolId || !fullName || !degreeId || !birthday || !email || !message) {
        const error = new Error("All fields are required")
        error.statusCode = 400
        return next(error)
      }

      // Validate schoolId is a number
      const schoolIdNumber = Number(schoolId)
      if (isNaN(schoolIdNumber)) {
        const error = new Error("Invalid school ID format")
        error.statusCode = 400
        return next(error)
      }

      // Validate degreeId exists in database
      const degree = await Degree.findById(degreeId)
      if (!degree) {
        const error = new Error("Invalid degree selection")
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

      // Check if voter exists with this schoolId (optional validation)
      const voter = await Voter.findOne({ schoolId: schoolIdNumber })
      
      // Create chat support request
      const chatSupport = new ChatSupport({
        schoolId: schoolIdNumber,
        voterId: voter ? voter._id : null, // Link to voter if exists
        fullName,
        degreeId,
        birthday: new Date(birthday),
        email,
        message,
        status: "pending",
      })

      await chatSupport.save()

      // Log the support request
      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: schoolIdNumber.toString(),
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
      const { status, degreeId, page = 1, limit = 50 } = req.query

      // Build filter
      const filter = {}
      if (status) filter.status = status
      if (degreeId) filter.degreeId = degreeId

      // Pagination
      const skip = (page - 1) * limit

      const requests = await ChatSupport.find(filter)
        .populate("degreeId", "degreeCode degreeName")
        .populate("voterId", "firstName middleName lastName email") // Populate voter info if linked
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(Number.parseInt(limit))

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
        .populate("degreeId", "degreeCode degreeName")
        .populate("voterId", "firstName middleName lastName email schoolId")
      
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
        .populate("degreeId", "degreeCode degreeName")
        .populate("voterId", "firstName middleName lastName email schoolId")
      
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

      const degreeStats = await ChatSupport.aggregate([
        {
          $lookup: {
            from: "degrees",
            localField: "degreeId",
            foreignField: "_id",
            as: "degree"
          }
        },
        {
          $unwind: "$degree"
        },
        {
          $group: {
            _id: "$degree.degreeName",
            count: { $sum: 1 },
          },
        },
      ])

      // Stats by voter registration status
      const voterStats = await ChatSupport.aggregate([
        {
          $lookup: {
            from: "voters",
            localField: "schoolId",
            foreignField: "schoolId",
            as: "voter"
          }
        },
        {
          $project: {
            hasVoterRecord: { $gt: [{ $size: "$voter" }, 0] },
            isRegistered: { $cond: [
              { $gt: [{ $size: "$voter" }, 0] },
              { $ne: [{ $arrayElemAt: ["$voter.password", 0] }, null] },
              false
            ]}
          }
        },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            fromVoters: { $sum: { $cond: ["$hasVoterRecord", 1, 0] } },
            fromRegisteredVoters: { $sum: { $cond: ["$isRegistered", 1, 0] } },
            fromNonVoters: { $sum: { $cond: ["$hasVoterRecord", 0, 1] } }
          }
        }
      ])

      const total = await ChatSupport.countDocuments()

      res.json({
        total,
        byStatus: stats,
        byDegree: degreeStats,
        voterStats: voterStats[0] || {
          totalRequests: 0,
          fromVoters: 0,
          fromRegisteredVoters: 0,
          fromNonVoters: 0
        }
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = ChatSupportController