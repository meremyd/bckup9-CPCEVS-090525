const mongoose = require("mongoose")
const ChatSupport = require("../models/ChatSupport")
const Department = require("../models/Department")
const Voter = require("../models/Voter")
const AuditLog = require("../models/AuditLog")

class ChatSupportController {
  // Helper method to validate ObjectId format
  static validateObjectId(id, fieldName) {
    const mongoose = require('mongoose')
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ${fieldName} format`)
    }
    return id
  }

  // Helper method for consistent audit logging
  static async logAuditAction(action, user, message, req, isVoter = false) {
    try {
      const logData = {
        action,
        details: message,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      }

      if (isVoter) {
        logData.username = user?.schoolId?.toString() || "unknown"
        logData.voterId = user?._id
        logData.schoolId = user?.schoolId
      } else {
        logData.username = user?.username || "unknown"
        logData.userId = user?.userId
      }

      await AuditLog.create(logData)
    } catch (error) {
      console.error("Audit log error:", error)
    }
  }

  // Submit chat support request
  static async submitRequest(req, res, next) {
    try {
      const { schoolId, fullName, departmentId, birthday, email, message } = req.body

      // Enhanced validation
      const errors = []
      if (!schoolId) errors.push("School ID is required")
      if (!fullName) errors.push("Full name is required")
      if (!departmentId) errors.push("Department is required")
      if (!birthday) errors.push("Birthday is required")
      if (!email) errors.push("Email is required")
      if (!message) errors.push("Message is required")

      if (errors.length > 0) {
        await ChatSupportController.logAuditAction(
          "UNAUTHORIZED_ACCESS_ATTEMPT",
          { schoolId },
          `Invalid chat support request - missing fields: ${errors.join(', ')} from ${req.ip}`,
          req
        )

        const error = new Error(errors.join(', '))
        error.statusCode = 400
        return next(error)
      }

      // Validate and convert schoolId
      const schoolIdNumber = Number(schoolId)
      if (isNaN(schoolIdNumber) || schoolIdNumber <= 0) {
        await ChatSupportController.logAuditAction(
          "UNAUTHORIZED_ACCESS_ATTEMPT",
          { schoolId },
          `Invalid school ID format: ${schoolId}`,
          req
        )

        const error = new Error("School ID must be a valid positive number")
        error.statusCode = 400
        return next(error)
      }

      // Validate department exists
      ChatSupportController.validateObjectId(departmentId, 'department ID')
      const department = await Department.findById(departmentId)
      if (!department) {
        await ChatSupportController.logAuditAction(
          "UNAUTHORIZED_ACCESS_ATTEMPT",
          { schoolId: schoolIdNumber },
          `Invalid department selection: ${departmentId}`,
          req
        )

        const error = new Error("Selected department does not exist")
        error.statusCode = 400
        return next(error)
      }

      // Enhanced email validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailRegex.test(email)) {
        await ChatSupportController.logAuditAction(
          "UNAUTHORIZED_ACCESS_ATTEMPT",
          { schoolId: schoolIdNumber },
          `Invalid email format: ${email}`,
          req
        )

        const error = new Error("Please enter a valid email address")
        error.statusCode = 400
        return next(error)
      }

      // Validate birthday
      const birthdayDate = new Date(birthday)
      if (isNaN(birthdayDate.getTime())) {
        const error = new Error("Please enter a valid birthday")
        error.statusCode = 400
        return next(error)
      }

      // Check for reasonable age limits (optional)
      const age = (new Date() - birthdayDate) / (365.25 * 24 * 60 * 60 * 1000)
      if (age < 16 || age > 100) {
        const error = new Error("Please enter a valid birthday")
        error.statusCode = 400
        return next(error)
      }

      // Check if voter exists (optional linkage)
      const voter = await Voter.findOne({ schoolId: schoolIdNumber })

      // Check for duplicate recent requests (spam prevention)
      const recentRequest = await ChatSupport.findOne({
        $or: [
          { schoolId: schoolIdNumber },
          { email: email.toLowerCase() }
        ],
        submittedAt: { 
          $gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        }
      })

      if (recentRequest) {
        await ChatSupportController.logAuditAction(
          "UNAUTHORIZED_ACCESS_ATTEMPT",
          { schoolId: schoolIdNumber },
          `Duplicate support request attempt within 5 minutes`,
          req
        )

        const error = new Error("Please wait 5 minutes before submitting another support request")
        error.statusCode = 429
        return next(error)
      }

      // Create support request
      const chatSupport = new ChatSupport({
        schoolId: schoolIdNumber,
        voterId: voter ? voter._id : null,
        fullName: fullName.trim(),
        departmentId,
        birthday: birthdayDate,
        email: email.toLowerCase().trim(),
        message: message.trim(),
        status: "pending",
      })

      await chatSupport.save()

      await ChatSupportController.logAuditAction(
        "CHAT_SUPPORT_REQUEST",
        { schoolId: schoolIdNumber, _id: voter?._id },
        `Support request submitted: ${fullName} (${email}) - ID: ${chatSupport._id}`,
        req,
        !!voter
      )

      res.status(201).json({
        success: true,
        message: "Support request submitted successfully",
        requestId: chatSupport._id,
      })
    } catch (error) {
      console.error("Error submitting support request:", error)
      
      await ChatSupportController.logAuditAction(
        "SYSTEM_ERROR",
        { schoolId: req.body?.schoolId },
        `Support request submission failed: ${error.message}`,
        req
      )
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message)
        const err = new Error(`Validation failed: ${validationErrors.join(', ')}`)
        err.statusCode = 400
        return next(err)
      }
      
      const err = new Error(error.message || "Failed to submit support request")
      err.statusCode = error.statusCode || 500
      next(err)
    }
  }

  // Get all requests with enhanced filtering
  static async getAllRequests(req, res, next) {
    try {
      const { 
        status, 
        departmentId, 
        page = 1, 
        limit = 50, 
        search,
        dateFrom,
        dateTo,
        sortBy = 'submittedAt',
        sortOrder = 'desc'
      } = req.query

      // Build filter
      const filter = {}
      if (status) filter.status = status
      if (departmentId) {
        ChatSupportController.validateObjectId(departmentId, 'department ID')
        filter.departmentId = departmentId
      }

      // Date range filter
      if (dateFrom || dateTo) {
        filter.submittedAt = {}
        if (dateFrom) filter.submittedAt.$gte = new Date(dateFrom)
        if (dateTo) filter.submittedAt.$lte = new Date(dateTo)
      }

      // Search filter
      if (search) {
        const searchRegex = new RegExp(search.trim(), 'i')
        filter.$or = [
          { fullName: searchRegex },
          { email: searchRegex },
          { message: searchRegex },
          { schoolId: isNaN(search) ? null : Number(search) }
        ].filter(condition => condition.schoolId !== null)
      }

      // Pagination
      const pageNum = Math.max(1, parseInt(page))
      const limitNum = Math.min(100, Math.max(1, parseInt(limit))) // Max 100 per page
      const skip = (pageNum - 1) * limitNum

      // Sort configuration
      const sortConfig = {}
      sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1

      const [requests, total] = await Promise.all([
        ChatSupport.find(filter)
          .populate("departmentId", "departmentCode degreeProgram college")
          .populate("voterId", "firstName middleName lastName email schoolId yearLevel")
          .sort(sortConfig)
          .skip(skip)
          .limit(limitNum),
        ChatSupport.countDocuments(filter)
      ])

      await ChatSupportController.logAuditAction(
        "SYSTEM_ACCESS",
        req.user,
        `Accessed chat support requests - Filter: ${JSON.stringify(filter)}, Page: ${pageNum}, Results: ${requests.length}`,
        req
      )

      res.json({
        success: true,
        data: {
          requests,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalItems: total,
            itemsPerPage: limitNum,
            hasNext: skip + limitNum < total,
            hasPrev: pageNum > 1
          },
          filters: { status, departmentId, search, dateFrom, dateTo }
        },
        message: "Support requests retrieved successfully"
      })
    } catch (error) {
      console.error("Error fetching support requests:", error)
      
      await ChatSupportController.logAuditAction(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        req.user,
        `Failed to access support requests: ${error.message}`,
        req
      )
      
      const err = new Error(error.message || "Failed to fetch support requests")
      err.statusCode = error.statusCode || 500
      next(err)
    }
  }

  // Get single chat support request
  static async getRequest(req, res, next) {
    try {
      const { id } = req.params

      const request = await ChatSupport.findById(id)
        .populate("departmentId", "departmentCode degreeProgram college")
        .populate("voterId", "firstName middleName lastName email schoolId yearLevel")
      
      if (!request) {
        await AuditLog.create({
          action: "UNAUTHORIZED_ACCESS_ATTEMPT",
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
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        userId: req.user?.userId,
        details: `Admin viewed chat support request ${id} from ${request.fullName} (School ID: ${request.schoolId})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json(request)
    } catch (error) {
      await AuditLog.create({
        action: "UNAUTHORIZED_ACCESS_ATTEMPT",
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
          action: "UNAUTHORIZED_ACCESS_ATTEMPT",
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
        .populate("departmentId", "departmentCode degreeProgram college")
        .populate("voterId", "firstName middleName lastName email schoolId yearLevel")
      
      if (!request) {
        await AuditLog.create({
          action: "UNAUTHORIZED_ACCESS_ATTEMPT",
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
        action: "CHAT_SUPPORT_STATUS_UPDATE",
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
        action: "UNAUTHORIZED_ACCESS_ATTEMPT",
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

      const departmentStats = await ChatSupport.aggregate([
        {
          $lookup: {
            from: "departments",
            localField: "departmentId",
            foreignField: "_id",
            as: "department"
          }
        },
        {
          $unwind: "$department"
        },
        {
          $group: {
            _id: "$department.degreeProgram",
            departmentCode: { $first: "$department.departmentCode" },
            college: { $first: "$department.college" },
            count: { $sum: 1 },
          },
        },
      ])

      // Stats by voter registration status and year level
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
            ]},
            yearLevel: { $arrayElemAt: ["$voter.yearLevel", 0] }
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

      // Stats by year level
      const yearLevelStats = await ChatSupport.aggregate([
        {
          $lookup: {
            from: "voters",
            localField: "schoolId",
            foreignField: "schoolId",
            as: "voter"
          }
        },
        {
          $unwind: {
            path: "$voter",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: "$voter.yearLevel",
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            yearLevel: { $ifNull: ["$_id", "Unknown"] },
            count: 1,
            _id: 0
          }
        }
      ])

      const total = await ChatSupport.countDocuments()

      // Log statistics access
      await AuditLog.create({
        action: "DATA_EXPORT",
        username: req.user?.username || "system",
        userId: req.user?.userId,
        details: `Admin accessed chat support statistics - Total requests: ${total}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        total,
        byStatus: stats,
        byDepartment: departmentStats,
        byYearLevel: yearLevelStats,
        voterStats: voterStats[0] || {
          totalRequests: 0,
          fromVoters: 0,
          fromRegisteredVoters: 0,
          fromNonVoters: 0
        }
      })
    } catch (error) {
      await AuditLog.create({
        action: "UNAUTHORIZED_ACCESS_ATTEMPT",
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
          action: "UNAUTHORIZED_ACCESS_ATTEMPT",
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
        action: "DATA_DELETION",
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
        action: "UNAUTHORIZED_ACCESS_ATTEMPT",
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
          action: "UNAUTHORIZED_ACCESS_ATTEMPT",
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
          action: "UNAUTHORIZED_ACCESS_ATTEMPT",
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
        action: "CHAT_SUPPORT_STATUS_UPDATE",
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
        action: "UNAUTHORIZED_ACCESS_ATTEMPT",
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
      const { format = 'json', status, departmentId, dateFrom, dateTo } = req.query

      // Build filter
      const filter = {}
      if (status) filter.status = status
      if (departmentId) filter.departmentId = departmentId
      if (dateFrom || dateTo) {
        filter.submittedAt = {}
        if (dateFrom) filter.submittedAt.$gte = new Date(dateFrom)
        if (dateTo) filter.submittedAt.$lte = new Date(dateTo)
      }

      const requests = await ChatSupport.find(filter)
        .populate("departmentId", "departmentCode degreeProgram college")
        .populate("voterId", "firstName middleName lastName email schoolId yearLevel")
        .sort({ submittedAt: -1 })

      // Log data export
      await AuditLog.create({
        action: "DATA_EXPORT",
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
          'Department': request.departmentId?.degreeProgram || 'N/A',
          'Department Code': request.departmentId?.departmentCode || 'N/A',
          'College': request.departmentId?.college || 'N/A',
          'Year Level': request.voterId?.yearLevel || 'N/A',
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
        action: "UNAUTHORIZED_ACCESS_ATTEMPT",
        username: req.user?.username || "unknown",
        details: `Failed to export chat support requests: ${error.message}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })
      next(error)
    }
  }

  static async getFAQs(req, res, next) {
    try {
      const { limit = 10, category } = req.query

      // Build filter for resolved requests with responses
      const filter = {
        status: "resolved",
        response: { $exists: true, $ne: "" }
      }

      // Optional category filter by department
      if (category) {
        ChatSupportController.validateObjectId(category, 'category')
        filter.departmentId = category
      }

      // Get frequently asked questions (most common messages)
      const faqs = await ChatSupport.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$message",
            question: { $first: "$message" },
            answer: { $first: "$response" },
            department: { $first: "$departmentId" },
            count: { $sum: 1 },
            lastUpdated: { $max: "$respondedAt" }
          }
        },
        { $sort: { count: -1, lastUpdated: -1 } },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: "departments",
            localField: "department",
            foreignField: "_id",
            as: "departmentInfo"
          }
        },
        {
          $unwind: {
            path: "$departmentInfo",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 0,
            question: 1,
            answer: 1,
            count: 1,
            lastUpdated: 1,
            department: {
              _id: "$departmentInfo._id",
              departmentCode: "$departmentInfo.departmentCode",
              degreeProgram: "$departmentInfo.degreeProgram",
              college: "$departmentInfo.college"
            }
          }
        }
      ])

      // Log FAQ access
      await ChatSupportController.logAuditAction(
        "SYSTEM_ACCESS",
        { schoolId: "public" },
        `FAQs accessed - Count: ${faqs.length}, Category: ${category || 'all'}`,
        req
      )

      res.json({
        success: true,
        data: {
          faqs,
          total: faqs.length
        },
        message: "FAQs retrieved successfully"
      })
    } catch (error) {
      console.error("Error fetching FAQs:", error)
      
      await ChatSupportController.logAuditAction(
        "SYSTEM_ERROR",
        { schoolId: "public" },
        `Failed to access FAQs: ${error.message}`,
        req
      )
      
      const err = new Error(error.message || "Failed to fetch FAQs")
      err.statusCode = error.statusCode || 500
      next(err)
    }
  }

  // Get FAQ categories (departments with FAQs)
  static async getFAQCategories(req, res, next) {
    try {
      const categories = await ChatSupport.aggregate([
        {
          $match: {
            status: "resolved",
            response: { $exists: true, $ne: "" }
          }
        },
        {
          $group: {
            _id: "$departmentId",
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: "departments",
            localField: "_id",
            foreignField: "_id",
            as: "department"
          }
        },
        {
          $unwind: "$department"
        },
        {
          $project: {
            _id: "$department._id",
            departmentCode: "$department.departmentCode",
            degreeProgram: "$department.degreeProgram",
            college: "$department.college",
            faqCount: "$count"
          }
        },
        {
          $sort: { faqCount: -1 }
        }
      ])

      res.json({
        success: true,
        data: {
          categories,
          total: categories.length
        },
        message: "FAQ categories retrieved successfully"
      })
    } catch (error) {
      console.error("Error fetching FAQ categories:", error)
      
      const err = new Error(error.message || "Failed to fetch FAQ categories")
      err.statusCode = error.statusCode || 500
      next(err)
    }
  }
}

module.exports = ChatSupportController