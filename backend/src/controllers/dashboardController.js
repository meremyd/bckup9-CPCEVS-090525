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
const ChatSupport = require("../models/ChatSupport")

class DashboardController {
  // Admin Dashboard
  static async getAdminDashboard(req, res, next) {
    try {
      const totalVoters = await Voter.countDocuments()
      const registeredVoters = await Voter.countDocuments({ password: { $ne: null } })
      const systemUsers = await User.countDocuments()
      const auditLogs = await AuditLog.countDocuments()
      const totalDegrees = await Degree.countDocuments()
      const totalChatSupport = await ChatSupport.countDocuments()
      const pendingChatSupport = await ChatSupport.countDocuments({ status: "pending" })

      // Recent activities from audit logs
      const recentActivities = await AuditLog.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .select('action username details timestamp')

      await AuditLog.logAction({
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        userId: req.user?.userId,
        details: "Accessed admin dashboard",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        totalVoters,
        registeredVoters,
        systemUsers,
        auditLogs,
        totalDegrees,
        totalChatSupport,
        pendingChatSupport,
        recentActivities
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
      const upcomingElections = await Election.countDocuments({ status: "upcoming" })
      const completedElections = await Election.countDocuments({ status: "completed" })
      const totalCandidates = await Candidate.countDocuments()
      const totalPositions = await Position.countDocuments()
      const totalPartylists = await Partylist.countDocuments()
      const totalDegrees = await Degree.countDocuments()

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

      // Recent election activities
      const recentElections = await Election.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title status electionDate electionType')

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        "Accessed election committee dashboard",
        req
      )

      res.json({
        totalVoters,
        registeredVoters,
        upcomingElections,
        completedElections,
        totalCandidates,
        totalPositions,
        totalPartylists,
        totalDegrees,
        voterStats,
        recentElections
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
      const totalDegrees = await Degree.countDocuments()
      const completedElections = await Election.countDocuments({ status: "completed" })

      // Get voter stats by degree
      const degrees = await Degree.find()
      const voterStats = {}
      const votingStats = {}

      for (const degree of degrees) {
        const totalCount = await Voter.countDocuments({ degreeId: degree._id })
        const registeredCount = await Voter.countDocuments({
          degreeId: degree._id,
          password: { $ne: null },
        })

        // Get voting participation by degree
        const votersFromDegree = await Voter.find({ degreeId: degree._id }).select('_id')
        const voterIds = votersFromDegree.map(v => v._id)
        const votedCount = await Ballot.countDocuments({
          voterId: { $in: voterIds },
          isSubmitted: true
        })

        const key = degree.major ? `${degree.degreeCode}-${degree.major}` : degree.degreeCode
        voterStats[key] = {
          total: totalCount,
          registered: registeredCount,
          degreeName: degree.degreeName,
        }
        
        votingStats[key] = {
          eligible: registeredCount,
          voted: votedCount,
          turnout: registeredCount > 0 ? Math.round((votedCount / registeredCount) * 100) : 0
        }
      }

      // Recent voting activities
      const recentVotes = await AuditLog.find({ action: "VOTE_SUBMITTED" })
        .sort({ timestamp: -1 })
        .limit(10)
        .select('username timestamp details')

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        "Accessed SAO dashboard",
        req
      )

      res.json({
        totalVoters,
        registeredVoters,
        totalVotes,
        votersWhoVoted,
        votersWhoDidntVote,
        voterTurnout,
        totalDegrees,
        completedElections,
        voterStats,
        votingStats,
        recentVotes
      })
    } catch (error) {
      next(error)
    }
  }

  // NEW: Voter Dashboard
  static async getVoterDashboard(req, res, next) {
    try {
      // Get voter info from token
      const voterId = req.user?.voterId || req.user?.userId
      const voter = await Voter.findById(voterId).populate('degreeId')
      
      if (!voter) {
        return res.status(404).json({ message: "Voter not found" })
      }

      // Get available elections for this voter
      const currentDate = new Date()
      const availableElections = await Election.find({
        status: "active",
        electionDate: { $gte: currentDate }
      }).select('title electionDate ballotOpenTime ballotCloseTime electionType')

      // Check if voter has voted in active elections
      const voterBallots = await Ballot.find({ 
        voterId: voter._id,
        isSubmitted: true 
      }).populate('electionId', 'title electionDate')

      // Get voter's voting history count
      const totalVotesCast = await Vote.countDocuments({
        ballotId: { $in: voterBallots.map(b => b._id) }
      })

      // Check for any chat support requests
      const chatSupportRequests = await ChatSupport.find({
        voterId: voter._id
      }).sort({ submittedAt: -1 }).limit(5)

      // Voter status info
      const voterInfo = {
        fullName: voter.fullName,
        schoolId: voter.schoolId,
        degree: voter.degreeId?.degreeName,
        isRegistered: voter.isRegistered,
        isPasswordActive: voter.isPasswordActive,
        passwordExpiresAt: voter.passwordExpiresAt
      }

      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        voter,
        "Accessed voter dashboard",
        req
      )

      res.json({
        voterInfo,
        availableElections,
        completedElections: voterBallots,
        totalVotesCast,
        chatSupportRequests: chatSupportRequests.map(cs => ({
          message: cs.message.substring(0, 100) + (cs.message.length > 100 ? '...' : ''),
          status: cs.status,
          submittedAt: cs.submittedAt,
          respondedAt: cs.respondedAt
        }))
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = DashboardController