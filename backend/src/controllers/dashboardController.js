const Voter = require("../models/Voter")
const User = require("../models/User")
const AuditLog = require("../models/AuditLog")
const Election = require("../models/Election")
const Candidate = require("../models/Candidate")
const Position = require("../models/Position")
const Partylist = require("../models/Partylist")
const Degree = require("../models/Degree")
const Ballot = require("../models/Ballot")
const Vote = require("../models/Vote")

class DashboardController {
  // Admin Dashboard
  static async getAdminDashboard(req, res, next) {
    try {
      const totalVoters = await Voter.countDocuments()
      const registeredVoters = await Voter.countDocuments({ password: { $ne: null } })
      const systemUsers = await User.countDocuments()
      const auditLogs = await AuditLog.countDocuments()

      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        details: "Accessed admin dashboard",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        totalVoters,
        registeredVoters,
        systemUsers,
        auditLogs,
      })
    } catch (error) {
      next(error)
    }
  }

  // Election Committee Dashboard
  static async getCommitteeDashboard(req, res, next) {
    try {
      const totalVoters = await Voter.countDocuments()
      const registeredVoters = await Voter.countDocuments({ password: { $ne: null } })
      const activeElections = await Election.countDocuments({ status: "active" })
      const totalCandidates = await Candidate.countDocuments()
      const totalPositions = await Position.countDocuments()
      const totalPartylists = await Partylist.countDocuments()

      // Get voter stats by degree
      const degrees = await Degree.find()
      const voterStats = {}

      for (const degree of degrees) {
        const totalCount = await Voter.countDocuments({ degreeId: degree._id })
        const registeredCount = await Voter.countDocuments({
          degreeId: degree._id,
          password: { $ne: null },
        })

        const key = degree.major ? `${degree.degreeCode}-${degree.major}` : degree.degreeCode
        voterStats[key] = {
          total: totalCount,
          registered: registeredCount,
          degreeName: degree.degreeName,
        }
      }

      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        details: "Accessed election committee dashboard",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        totalVoters,
        registeredVoters,
        activeElections,
        totalCandidates,
        totalPositions,
        totalPartylists,
        voterStats,
      })
    } catch (error) {
      next(error)
    }
  }

  // SAO Dashboard
  static async getSAODashboard(req, res, next) {
    try {
      const totalVoters = await Voter.countDocuments()
      const registeredVoters = await Voter.countDocuments({ password: { $ne: null } })
      const totalVotes = await Vote.countDocuments()
      const votersWhoVoted = await Ballot.countDocuments({ isSubmitted: true })
      const votersWhoDidntVote = registeredVoters - votersWhoVoted
      const voterTurnout = registeredVoters > 0 ? Math.round((votersWhoVoted / registeredVoters) * 100) : 0

      // Get voter stats by degree
      const degrees = await Degree.find()
      const voterStats = {}

      for (const degree of degrees) {
        const totalCount = await Voter.countDocuments({ degreeId: degree._id })
        const registeredCount = await Voter.countDocuments({
          degreeId: degree._id,
          password: { $ne: null },
        })

        const key = degree.major ? `${degree.degreeCode}-${degree.major}` : degree.degreeCode
        voterStats[key] = {
          total: totalCount,
          registered: registeredCount,
          degreeName: degree.degreeName,
        }
      }

      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        details: "Accessed SAO dashboard",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        totalVoters,
        registeredVoters,
        totalVotes,
        votersWhoVoted,
        votersWhoDidntVote,
        voterTurnout,
        voterStats,
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = DashboardController
