const express = require("express")
const AuditLog = require("../models/AuditLog")
const router = express.Router()

// Get all audit logs
router.get("/", async (req, res, next) => {
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

    res.json(logs) // Return just the logs array for now
  } catch (error) {
    next(error)
  }
})

// Get audit log by ID
router.get("/:id", async (req, res, next) => {
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
})

module.exports = router