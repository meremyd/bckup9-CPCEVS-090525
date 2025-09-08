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
        // Log unauthorized access attempt
        await AuditLog.create({
          action: "CHAT_SUPPORT_ACCESS_DENIED",
          username: schoolId?.toString() || "unknown",
          details: `Invalid chat support request submission - missing required fields from ${req.ip}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })

        const error = new Error("All fields are required")
        error.statusCode = 400
        return next(error)
      }

      // Validate schoolId is a number
      const schoolIdNumber = Number(schoolId)
      if (isNaN(schoolIdNumber)) {
        await AuditLog.create({
          action: "CHAT_SUPPORT_ACCESS_DENIED",
          username: schoolId?.toString() || "unknown",
          details: `Invalid school ID format in chat support request: ${schoolId}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })

        const error = new Error("Invalid school ID format")
        error.statusCode = 400
        return next(error)
      }

      // Validate degreeId exists in database
      const degree = await Degree.findById(degreeId)
      if (!degree) {
        await AuditLog.create({
          action: "CHAT_SUPPORT_ACCESS_DENIED",
          username: schoolIdNumber.toString(),
          details: `Invalid degree selection in chat support request: ${degreeId}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })

        const error = new Error("Invalid degree selection")
        error.statusCode = 400
        return next(error)
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        await AuditLog.create({
          action: "CHAT_SUPPORT_ACCESS_DENIED",
          username: schoolIdNumber.toString(),
          details: `Invalid email format in chat support request: ${email}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })

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

      // Log the support request submission
      await AuditLog.create({
        action: "CHAT_SUPPORT_CREATE",
        username: schoolIdNumber.toString(),
        voterId: voter ? voter._id : null,
        schoolId: schoolIdNumber,
        details: `Chat support request submitted by ${fullName} (${email}) - Request ID: ${chatSupport._id}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.status(201).json({
        message: "Support request submitted successfully",
        requestId: chatSupport._id,
      })
    } catch (error) {
      // Log system error
      await AuditLog.create({
        action: "SYSTEM_ERROR",
        username: req.body?.schoolId?.toString() || "unknown",
        details: `Chat support request submission failed: ${error.message}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })
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

      // Log admin access to chat support requests
      await AuditLog.create({
        action: "CHAT_SUPPORT_VIEW",
        username: req.user?.username || "system",
        userId: req.user?.userId,
        details: `Admin accessed chat support requests list - Filter: ${JSON.stringify(filter)}, Page: ${page}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

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
      await AuditLog.create({
        action: "CHAT_SUPPORT_ACCESS_DENIED",
        username: req.user?.username || "unknown",
        details: `Failed to access chat support requests: ${error.message}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })
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
        await AuditLog.create({
          action: "CHAT_SUPPORT_ACCESS_DENIED",
          username: req.user?.username || "unknown",
          details: `Attempted to access non-existent chat support request: ${id}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })

        const error = new Error("Support request not found")
        error.statusCode = 404
        return next(error)
      }

      // Log successful access to specific request
      await AuditLog.create({
        action: "CHAT_SUPPORT_VIEW",
        username: req.user?.username || "system",
        userId: req.user?.userId,
        details: `Admin viewed chat support request ${id} from ${request.fullName} (School ID: ${request.schoolId})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json(request)
    } catch (error) {
      await AuditLog.create({
        action: "CHAT_SUPPORT_ACCESS_DENIED",
        username: req.user?.username || "unknown",
        details: `Failed to access chat support request ${req.params.id}: ${error.message}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })
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
        await AuditLog.create({
          action: "CHAT_SUPPORT_ACCESS_DENIED",
          username: req.user?.username || "unknown",
          details: `Invalid status update attempt for chat support request ${id}: ${status}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })

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
        await AuditLog.create({
          action: "CHAT_SUPPORT_ACCESS_DENIED",
          username: req.user?.username || "unknown",
          details: `Attempted to update non-existent chat support request: ${id}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })

        const error = new Error("Support request not found")
        error.statusCode = 404
        return next(error)
      }

      // Log the status update
      await AuditLog.create({
        action: "CHAT_SUPPORT_UPDATE",
        username: req.user?.username || "system",
        userId: req.user?.userId,
        details: `Chat support request ${id} status updated to ${status} by ${req.user?.username}${response ? ' - Response provided' : ''}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      // Log response if provided
      if (response) {
        await AuditLog.create({
          action: "CHAT_SUPPORT_RESPONSE",
          username: req.user?.username || "system",
          userId: req.user?.userId,
          details: `Response provided for chat support request ${id} from ${request.fullName} (School ID: ${request.schoolId})`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })
      }

      res.json({
        message: "Request updated successfully",
        request,
      })
    } catch (error) {
      await AuditLog.create({
        action: "CHAT_SUPPORT_ACCESS_DENIED",
        username: req.user?.username || "unknown",
        details: `Failed to update chat support request ${req.params.id}: ${error.message}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })
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

      // Log statistics access
      await AuditLog.create({
        action: "CHAT_SUPPORT_EXPORT",
        username: req.user?.username || "system",
        userId: req.user?.userId,
        details: `Admin accessed chat support statistics - Total requests: ${total}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

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
      await AuditLog.create({
        action: "CHAT_SUPPORT_ACCESS_DENIED",
        username: req.user?.username || "unknown",
        details: `Failed to access chat support statistics: ${error.message}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })
      next(error)
    }
  }

  // Delete chat support request (admin only)
  static async deleteRequest(req, res, next) {
    try {
      const { id } = req.params

      const request = await ChatSupport.findById(id)
      if (!request) {
        await AuditLog.create({
          action: "CHAT_SUPPORT_ACCESS_DENIED",
          username: req.user?.username || "unknown",
          details: `Attempted to delete non-existent chat support request: ${id}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })

        const error = new Error("Support request not found")
        error.statusCode = 404
        return next(error)
      }

      await ChatSupport.findByIdAndDelete(id)

      // Log the deletion
      await AuditLog.create({
        action: "CHAT_SUPPORT_DELETE",
        username: req.user?.username || "system",
        userId: req.user?.userId,
        details: `Chat support request ${id} deleted by ${req.user?.username} - Request from ${request.fullName} (School ID: ${request.schoolId})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        message: "Support request deleted successfully"
      })
    } catch (error) {
      await AuditLog.create({
        action: "CHAT_SUPPORT_ACCESS_DENIED",
        username: req.user?.username || "unknown",
        details: `Failed to delete chat support request ${req.params.id}: ${error.message}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })
      next(error)
    }
  }

  // Bulk update chat support requests status (admin only)
  static async bulkUpdateStatus(req, res, next) {
    try {
      const { requestIds, status } = req.body

      if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
        await AuditLog.create({
          action: "CHAT_SUPPORT_ACCESS_DENIED",
          username: req.user?.username || "unknown",
          details: `Invalid bulk update attempt - missing or invalid request IDs`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })

        const error = new Error("Request IDs are required")
        error.statusCode = 400
        return next(error)
      }

      const validStatuses = ["pending", "in-progress", "resolved", "closed"]
      if (!validStatuses.includes(status)) {
        await AuditLog.create({
          action: "CHAT_SUPPORT_ACCESS_DENIED",
          username: req.user?.username || "unknown",
          details: `Invalid bulk status update attempt: ${status}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })

        const error = new Error("Invalid status")
        error.statusCode = 400
        return next(error)
      }

      const updateResult = await ChatSupport.updateMany(
        { _id: { $in: requestIds } },
        { 
          status: status,
          updatedAt: new Date()
        }
      )

      // Log bulk update
      await AuditLog.create({
        action: "CHAT_SUPPORT_BULK_UPDATE",
        username: req.user?.username || "system",
        userId: req.user?.userId,
        details: `Bulk status update performed by ${req.user?.username} - ${updateResult.modifiedCount} requests updated to ${status}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        message: "Requests updated successfully",
        updatedCount: updateResult.modifiedCount
      })
    } catch (error) {
      await AuditLog.create({
        action: "CHAT_SUPPORT_ACCESS_DENIED",
        username: req.user?.username || "unknown",
        details: `Failed bulk update of chat support requests: ${error.message}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })
      next(error)
    }
  }

  // Export chat support data (admin only)
  static async exportRequests(req, res, next) {
    try {
      const { format = 'json', status, degreeId, dateFrom, dateTo } = req.query

      // Build filter
      const filter = {}
      if (status) filter.status = status
      if (degreeId) filter.degreeId = degreeId
      if (dateFrom || dateTo) {
        filter.submittedAt = {}
        if (dateFrom) filter.submittedAt.$gte = new Date(dateFrom)
        if (dateTo) filter.submittedAt.$lte = new Date(dateTo)
      }

      const requests = await ChatSupport.find(filter)
        .populate("degreeId", "degreeCode degreeName")
        .populate("voterId", "firstName middleName lastName email schoolId")
        .sort({ submittedAt: -1 })

      // Log data export
      await AuditLog.create({
        action: "CHAT_SUPPORT_EXPORT",
        username: req.user?.username || "system",
        userId: req.user?.userId,
        details: `Chat support data exported by ${req.user?.username} - Format: ${format}, Count: ${requests.length}, Filter: ${JSON.stringify(filter)}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      if (format === 'csv') {
        // Convert to CSV format
        const csvData = requests.map(request => ({
          'Request ID': request._id,
          'School ID': request.schoolId,
          'Full Name': request.fullName,
          'Email': request.email,
          'Degree': request.degreeId?.degreeName || 'N/A',
          'Status': request.status,
          'Message': request.message,
          'Response': request.response || '',
          'Submitted At': request.submittedAt,
          'Responded At': request.respondedAt || ''
        }))

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename=chat-support-requests.csv')
        
        // Simple CSV conversion (in production, use a proper CSV library)
        const csvHeaders = Object.keys(csvData[0] || {}).join(',')
        const csvRows = csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
        const csv = [csvHeaders, ...csvRows].join('\n')
        
        res.send(csv)
      } else {
        res.json({
          requests,
          exportInfo: {
            format,
            count: requests.length,
            exportedAt: new Date(),
            filter
          }
        })
      }
    } catch (error) {
      await AuditLog.create({
        action: "CHAT_SUPPORT_ACCESS_DENIED",
        username: req.user?.username || "unknown",
        details: `Failed to export chat support requests: ${error.message}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })
      next(error)
    }
  }
}

module.exports = ChatSupportController