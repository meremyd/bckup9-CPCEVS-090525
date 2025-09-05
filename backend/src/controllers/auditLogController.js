const AuditLog = require("../models/AuditLog")

class AuditLogController {
  // Get all audit logs with filtering and pagination
  static async getAllAuditLogs(req, res, next) {
    try {
      const { page = 1, limit = 50, action, username, startDate, endDate } = req.query

      // Build filter object
      const filter = {}
      if (action) filter.action = action
      if (username) filter.username = new RegExp(username, "i")
      if (startDate || endDate) {
        filter.timestamp = {}
        if (startDate) filter.timestamp.$gte = new Date(startDate)
        if (endDate) filter.timestamp.$lte = new Date(endDate)
      }

      const logs = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)

      const total = await AuditLog.countDocuments(filter)

      // Log the access
      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        details: `Audit logs accessed - ${logs.length} logs returned`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json(logs) // Return just the logs array for frontend compatibility
    } catch (error) {
      next(error)
    }
  }

  // Get audit log by ID
  static async getAuditLog(req, res, next) {
    try {
      const log = await AuditLog.findById(req.params.id)
      if (!log) {
        const error = new Error("Audit log not found")
        error.statusCode = 404
        return next(error)
      }
      res.json(log)
    } catch (error) {
      next(error)
    }
  }

  // Get audit log statistics
  static async getStatistics(req, res, next) {
    try {
      const total = await AuditLog.countDocuments()

      const byAction = await AuditLog.aggregate([
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ])

      const recentActivity = await AuditLog.find().sort({ timestamp: -1 }).limit(10)

      res.json({
        total,
        byAction,
        recentActivity,
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = AuditLogController
