const mongoose = require("mongoose")
const AuditLog = require("../models/AuditLog")

class AuditLogController {

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

      if (username) {
        filter.username = new RegExp(username, "i")
      }

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

      const pageNum = Math.max(1, parseInt(page))
      const limitNum = Math.min(Math.max(1, parseInt(limit)), 100) 
      const skip = (pageNum - 1) * limitNum

      const logs = await AuditLog.find(filter)
        .populate('userId', 'username userType')
        .populate('voterId', 'schoolId firstName lastName')
        .sort({ timestamp: -1 })
        .limit(limitNum)
        .skip(skip)
        .lean() 

      const total = await AuditLog.countDocuments(filter)
      const totalPages = Math.ceil(total / limitNum)

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

  static async getAuditLog(req, res, next) {
    try {
      const { id } = req.params

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

  static async getStatistics(req, res, next) {
    try {

      const total = await AuditLog.countDocuments()

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

      const recentActivity = await AuditLog.find()
        .populate('userId', 'username userType')
        .populate('voterId', 'schoolId firstName lastName')
        .sort({ timestamp: -1 })
        .limit(10)
        .lean()

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

  static async getTotalVisits(req, res, next) {
    try {
      const totalVisits = await AuditLog.countDocuments({ action: "LOGIN" })

      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        userId: req.user?.userId || null,
        details: "Total visits statistics accessed",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        success: true,
        data: {
          totalVisits
        }
      })
    } catch (error) {
      next(error)
    }
  }

  static async getActiveUsers(req, res, next) {
    try {

      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)

      const recentLogins = await AuditLog.find({
        action: "LOGIN",
        timestamp: { $gte: fifteenMinutesAgo }
      }).select('username userId voterId timestamp')

      const activeUsers = []
      const processedUsers = new Set()

      for (const login of recentLogins) {
        const userKey = login.userId?.toString() || login.voterId?.toString() || login.username
        
        if (processedUsers.has(userKey)) continue
        processedUsers.add(userKey)

        const logoutAfterLogin = await AuditLog.findOne({
          action: "LOGOUT",
          $or: [
            { userId: login.userId },
            { voterId: login.voterId },
            { username: login.username }
          ],
          timestamp: { $gt: login.timestamp }
        })

        if (!logoutAfterLogin) {
          activeUsers.push({
            username: login.username,
            userId: login.userId,
            voterId: login.voterId,
            lastLogin: login.timestamp
          })
        }
      }

      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        userId: req.user?.userId || null,
        details: `Active users statistics accessed - ${activeUsers.length} active users`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        success: true,
        data: {
          activeUsers: activeUsers.length,
          users: activeUsers,
          timeWindow: "15 minutes"
        }
      })
    } catch (error) {
      next(error)
    }
  }

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
        .limit(10000)
        .lean()

      await AuditLog.create({
        action: "DATA_EXPORT",
        username: req.user?.username || "system",
        userId: req.user?.userId || null,
        details: `Audit logs exported - ${logs.length} records, format: ${format}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      if (format === 'csv') {

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