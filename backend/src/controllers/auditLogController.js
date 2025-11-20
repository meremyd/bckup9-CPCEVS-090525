const mongoose = require("mongoose")
const AuditLog = require("../models/AuditLog")

class AuditLogController {
  // Get all Audit Logs
  static async getAllAuditLogs(req, res, next) {
    try {
      const { page = 1, limit = 50, action, username, startDate, endDate, userType } = req.query

      const filter = {}
      if (action) {
        const validActions = [
        "LOGIN",
        "LOGOUT",
        "PASSWORD_RESET_REQUEST",
        "PASSWORD_RESET_SUCCESS",
        "UNAUTHORIZED_ACCESS_ATTEMPT",
        "DATA_EXPORT",
        "DATA_IMPORT",
        "UPDATE_PASSWORD",
        "FORCE_LOGOUT",
        "CREATE_USER",
        "UPDATE_USER",
        "DELETE_USER",
        "ACTIVATE_USER",
        "DEACTIVATE_USER",
        "CREATE_VOTER",
        "UPDATE_VOTER",
        "DELETE_VOTER",
        "ACTIVATE_VOTER",
        "DEACTIVATE_VOTER",
        "VOTER_REGISTRATION",
        "CREATE_DEPARTMENT",
        "UPDATE_DEPARTMENT", 
        "DELETE_DEPARTMENT",
        "SYSTEM_ACCESS",
        "CREATE_SSG_ELECTION",
        "UPDATE_SSG_ELECTION",
        "DELETE_SSG_ELECTION",
        "CREATE_DEPARTMENTAL_ELECTION",
        "UPDATE_DEPARTMENTAL_ELECTION",
        "DELETE_DEPARTMENTAL_ELECTION",
        "START_ELECTION",
        "END_ELECTION",
        "CANCEL_ELECTION",
        "CREATE_CANDIDATE",
        "UPDATE_CANDIDATE", 
        "DELETE_CANDIDATE",
        "CREATE_POSITION",
        "UPDATE_POSITION", 
        "DELETE_POSITION",
        "CREATE_PARTYLIST",
        "UPDATE_PARTYLIST",
        "DELETE_PARTYLIST",
        "VOTED",
        "VOTE_SUBMITTED",
        "BALLOT_ACCESSED",
        "BALLOT_STARTED",
        "BALLOT_ABANDONED",
        "BALLOT_EXPIRED_DELETED",
        "CHAT_SUPPORT_REQUEST",
        "CHAT_SUPPORT_RESPONSE",
        "CHAT_SUPPORT_STATUS_UPDATE",
        "FILE_UPLOAD",
        "FILE_DELETE",
        "PROFILE_ACCESS",
        "PROFILE_UPDATE",
        "PROFILE_PICTURE_UPDATE",
        "CAMPAIGN_PICTURE_UPDATE",
        "VOTER_PARTICIPATED_IN_SSG_ELECTION",
        "VOTER_PARTICIPATED_IN_DEPARTMENTAL_ELECTION",
        ]
        
        if (validActions.includes(action)) {
          filter.action = action
        }
      }
      
      // Filter by username (partial match, case insensitive)
      if (username) {
        filter.username = new RegExp(username, "i")
      }
      
      // Filter by date range
      if (startDate || endDate) {
        filter.timestamp = {}
        if (startDate) {
          try {
            filter.timestamp.$gte = new Date(startDate)
          } catch (dateError) {
            const error = new Error("Invalid start date format")
            error.statusCode = 400
            return next(error)
          }
        }
        if (endDate) {
          try {
            const endDateTime = new Date(endDate)
            // Set to end of day if only date is provided
            if (endDate.length === 10) {
              endDateTime.setHours(23, 59, 59, 999)
            }
            filter.timestamp.$lte = endDateTime
          } catch (dateError) {
            const error = new Error("Invalid end date format")
            error.statusCode = 400
            return next(error)
          }
        }
      }

      // Pagination with limits
      const pageNum = Math.max(1, parseInt(page))
      const limitNum = Math.min(Math.max(1, parseInt(limit)), 100) // Max 100 items per page
      const skip = (pageNum - 1) * limitNum

      // Execute query with population for related data
      const logs = await AuditLog.find(filter)
        .populate('userId', 'username userType')
        .populate('voterId', 'schoolId firstName lastName')
        .sort({ timestamp: -1 })
        .limit(limitNum)
        .skip(skip)
        .lean() // For better performance

      // Get total count for pagination
      const total = await AuditLog.countDocuments(filter)
      const totalPages = Math.ceil(total / limitNum)

      // Log the audit access
      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        userId: req.user?.userId || null,
        details: `Audit logs accessed - ${logs.length} logs returned (page ${pageNum} of ${totalPages})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        logs,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        },
        filters: {
          action,
          username,
          startDate,
          endDate
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get Audit Log by id
  static async getAuditLog(req, res, next) {
    try {
      const { id } = req.params

      // Validate ObjectId format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        const error = new Error("Invalid audit log ID format")
        error.statusCode = 400
        return next(error)
      }

      const log = await AuditLog.findById(id)
        .populate('userId', 'username userType')
        .populate('voterId', 'schoolId firstName lastName')

      if (!log) {
        const error = new Error("Audit log not found")
        error.statusCode = 404
        return next(error)
      }

      // Log the single log access
      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        userId: req.user?.userId || null,
        details: `Single audit log accessed - ID: ${id}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json(log)
    } catch (error) {
      next(error)
    }
  }

  // Get audit log statistics
  static async getStatistics(req, res, next) {
    try {
      // Total logs count
      const total = await AuditLog.countDocuments()

      // Statistics by action type
      const byAction = await AuditLog.aggregate([
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 },
            latestTimestamp: { $max: "$timestamp" }
          },
        },
        {
          $sort: { count: -1 },
        },
      ])

      // Statistics by user type (based on action patterns)
      const userTypeStats = await AuditLog.aggregate([
        {
          $addFields: {
            userCategory: {
              $cond: [
                { $ne: ["$voterId", null] },
                "voter",
                {
                  $cond: [
                    { $ne: ["$userId", null] },
                    "staff",
                    "system"
                  ]
                }
              ]
            }
          }
        },
        {
          $group: {
            _id: "$userCategory",
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ])

      // Recent activity (last 10 logs)
      const recentActivity = await AuditLog.find()
        .populate('userId', 'username userType')
        .populate('voterId', 'schoolId firstName lastName')
        .sort({ timestamp: -1 })
        .limit(10)
        .lean()

      // Daily activity for the past 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const dailyActivity = await AuditLog.aggregate([
        {
          $match: {
            timestamp: { $gte: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$timestamp" },
              month: { $month: "$timestamp" },
              day: { $dayOfMonth: "$timestamp" }
            },
            count: { $sum: 1 },
            actions: { $push: "$action" }
          }
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
        }
      ])

      // Security-related events count
      const securityEvents = await AuditLog.countDocuments({
        action: {
          $in: [
            "UNAUTHORIZED_ACCESS_ATTEMPT",
            "FORCE_LOGOUT",
            "PASSWORD_RESET_REQUEST",
            "PASSWORD_RESET_SUCCESS"
          ]
        }
      })

      // Voting-related events count
      const votingEvents = await AuditLog.countDocuments({
        action: {
          $in: [
            "VOTED",
            "VOTE_SUBMITTED", 
            "BALLOT_ACCESSED",
            "BALLOT_STARTED",
            "BALLOT_ABANDONED"
          ]
        }
      })

      // Log the statistics access
      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        userId: req.user?.userId || null,
        details: "Audit log statistics accessed",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        overview: {
          totalLogs: total,
          securityEvents,
          votingEvents,
          uniqueActions: byAction.length,
          last7Days: dailyActivity.length
        },
        byAction,
        userTypeStats,
        recentActivity,
        dailyActivity
      })
    } catch (error) {
      next(error)
    }
  }

  // Get audit logs for a specific user/voter
  static async getUserAuditLogs(req, res, next) {
    try {
      const { userId, voterId, schoolId } = req.query
      const { page = 1, limit = 20 } = req.query

      if (!userId && !voterId && !schoolId) {
        const error = new Error("Either userId, voterId, or schoolId is required")
        error.statusCode = 400
        return next(error)
      }

      const filter = {}
      if (userId) filter.userId = userId
      if (voterId) filter.voterId = voterId
      if (schoolId) filter.schoolId = parseInt(schoolId)

      const pageNum = Math.max(1, parseInt(page))
      const limitNum = Math.min(Math.max(1, parseInt(limit)), 50)
      const skip = (pageNum - 1) * limitNum

      const logs = await AuditLog.find(filter)
        .populate('userId', 'username userType')
        .populate('voterId', 'schoolId firstName lastName')
        .sort({ timestamp: -1 })
        .limit(limitNum)
        .skip(skip)

      const total = await AuditLog.countDocuments(filter)

      // Log the user-specific audit access
      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        userId: req.user?.userId || null,
        details: `User-specific audit logs accessed - Target: ${userId || voterId || schoolId}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        logs,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Export audit logs (for compliance/backup purposes)
  static async exportAuditLogs(req, res, next) {
    try {
      const { startDate, endDate, action, format = 'json' } = req.query

      const filter = {}
      if (startDate || endDate) {
        filter.timestamp = {}
        if (startDate) filter.timestamp.$gte = new Date(startDate)
        if (endDate) filter.timestamp.$lte = new Date(endDate)
      }
      if (action) filter.action = action

      const logs = await AuditLog.find(filter)
        .populate('userId', 'username userType')
        .populate('voterId', 'schoolId firstName lastName')
        .sort({ timestamp: -1 })
        .limit(10000) // Limit for performance
        .lean()

      // Log the export action
      await AuditLog.create({
        action: "DATA_EXPORT",
        username: req.user?.username || "system",
        userId: req.user?.userId || null,
        details: `Audit logs exported - ${logs.length} records, format: ${format}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      if (format === 'csv') {
        // Convert to CSV format
        const csv = logs.map(log => ({
          timestamp: log.timestamp,
          action: log.action,
          username: log.username,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent
        }))
        
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv')
        
        // Simple CSV generation (in production, use a proper CSV library)
        const csvHeader = 'timestamp,action,username,details,ipAddress,userAgent\n'
        const csvRows = csv.map(row => 
          Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
        ).join('\n')
        
        res.send(csvHeader + csvRows)
      } else {
        res.json({
          exportDate: new Date(),
          totalRecords: logs.length,
          filters: { startDate, endDate, action },
          logs
        })
      }
    } catch (error) {
      next(error)
    }
  }
}

module.exports = AuditLogController