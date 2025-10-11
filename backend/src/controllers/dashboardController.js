const mongoose = require("mongoose")
const Voter = require("../models/Voter")
const User = require("../models/User")
const AuditLog = require("../models/AuditLog")
const SSGElection = require("../models/SSGElection")
const DepartmentalElection = require("../models/DepartmentalElection")
const Candidate = require("../models/Candidate")
const Position = require("../models/Position")
const Partylist = require("../models/Partylist")
const Department = require("../models/Department")
const Ballot = require("../models/Ballot")
const Vote = require("../models/Vote")
const ChatSupport = require("../models/ChatSupport")

class DashboardController {
  // Admin Dashboard
   static async getAdminDashboard(req, res, next) {
    try {
      const totalVoters = await Voter.countDocuments({ isActive: true }) 
      const registeredVoters = await Voter.countDocuments({ 
        isActive: true, 
        password: { $ne: null } 
      }) 
      const systemUsers = await User.countDocuments()
      const auditLogs = await AuditLog.countDocuments()
      const totalDepartments = await Department.countDocuments()
      const totalChatSupport = await ChatSupport.countDocuments()
      const pendingChatSupport = await ChatSupport.countDocuments({ status: "pending" })

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
        totalDepartments,
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
      const totalVoters = await Voter.countDocuments({ isActive: true }) 
      const registeredVoters = await Voter.countDocuments({ 
        isActive: true, 
        password: { $ne: null } 
      }) 
      const upcomingSSGElections = await SSGElection.countDocuments({ status: "upcoming" })
      const upcomingDeptElections = await DepartmentalElection.countDocuments({ status: "upcoming" })
      const completedSSGElections = await SSGElection.countDocuments({ status: "completed" })
      const completedDeptElections = await DepartmentalElection.countDocuments({ status: "completed" })
      const totalCandidates = await Candidate.countDocuments()
      const totalPositions = await Position.countDocuments()
      const totalPartylists = await Partylist.countDocuments()
      const totalDepartments = await Department.countDocuments()

      const departments = await Department.find()
      const voterStats = {}

      for (const department of departments) {
        const totalCount = await Voter.countDocuments({ 
          departmentId: department._id,
          isActive: true 
        })
        const registeredCount = await Voter.countDocuments({
          departmentId: department._id,
          isActive: true, 
          password: { $ne: null },
        })

        voterStats[department.departmentCode] = {
          total: totalCount,
          registered: registeredCount,
          departmentName: department.degreeProgram,
          college: department.college
        }
      }

      const recentSSGElections = await SSGElection.find()
        .sort({ createdAt: -1 })
        .limit(3)
        .select('title status electionDate')

      const recentDeptElections = await DepartmentalElection.find()
        .sort({ createdAt: -1 })
        .limit(3)
        .select('title status electionDate')
        .populate('departmentId', 'departmentCode college')

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        "Accessed election committee dashboard",
        req
      )

      res.json({
        totalVoters, 
        registeredVoters, 
        upcomingElections: upcomingSSGElections + upcomingDeptElections,
        completedElections: completedSSGElections + completedDeptElections,
        upcomingSSGElections,
        upcomingDeptElections,
        completedSSGElections,
        completedDeptElections,
        totalCandidates,
        totalPositions,
        totalPartylists,
        totalDepartments,
        voterStats,
        recentElections: {
          ssgElections: recentSSGElections,
          departmentalElections: recentDeptElections
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // SAO Dashboard
  static async getSAODashboard(req, res, next) {
    try {
      const totalVoters = await Voter.countDocuments({ isActive: true }) 
      const registeredVoters = await Voter.countDocuments({ 
        isActive: true, 
        password: { $ne: null } 
      }) 
      const totalVotes = await Vote.countDocuments()
      const votersWhoVoted = await Ballot.countDocuments({ isSubmitted: true })
      const votersWhoDidntVote = registeredVoters - votersWhoVoted
      const voterTurnout = registeredVoters > 0 ? Math.round((votersWhoVoted / registeredVoters) * 100) : 0
      const totalDepartments = await Department.countDocuments()
      const completedSSGElections = await SSGElection.countDocuments({ status: "completed" })
      const completedDeptElections = await DepartmentalElection.countDocuments({ status: "completed" })

      const departments = await Department.find()
      const voterStats = {}
      const votingStats = {}

      for (const department of departments) {
        const totalCount = await Voter.countDocuments({ 
          departmentId: department._id,
          isActive: true 
        })
        const registeredCount = await Voter.countDocuments({
          departmentId: department._id,
          isActive: true, 
          password: { $ne: null },
        })

        const votersFromDepartment = await Voter.find({ 
          departmentId: department._id,
          isActive: true 
        }).select('_id')
        const voterIds = votersFromDepartment.map(v => v._id)
        const votedCount = await Ballot.countDocuments({
          voterId: { $in: voterIds },
          isSubmitted: true
        })

        voterStats[department.departmentCode] = {
          total: totalCount,
          registered: registeredCount,
          departmentName: department.degreeProgram,
          college: department.college
        }
        
        votingStats[department.departmentCode] = {
          eligible: registeredCount,
          voted: votedCount,
          turnout: registeredCount > 0 ? Math.round((votedCount / registeredCount) * 100) : 0,
          departmentName: department.degreeProgram
        }
      }

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
        totalDepartments,
        completedElections: completedSSGElections + completedDeptElections,
        completedSSGElections,
        completedDeptElections,
        voterStats,
        votingStats,
        recentVotes
      })
    } catch (error) {
      next(error)
    }
  }

  // Voter Dashboard
  static async getVoterDashboard(req, res, next) {
  try {
    // Get voter info from token
    const voterId = req.user?.voterId || req.user?.userId
    const voter = await Voter.findById(voterId).populate('departmentId')
    
    if (!voter) {
      return res.status(404).json({ message: "Voter not found" })
    }

    const currentDate = new Date()
    const availableSSGElections = await SSGElection.find({
      status: "active",
      electionDate: { $gte: currentDate }
    }).select('title electionDate ballotOpenTime ballotCloseTime')

    const availableDeptElections = await DepartmentalElection.find({
      status: "active",
      electionDate: { $gte: currentDate },
      departmentId: voter.departmentId._id
    }).select('title electionDate ballotOpenTime ballotCloseTime')
    .populate('departmentId', 'departmentCode degreeProgram')

    const totalSSGElections = await SSGElection.countDocuments()
    const totalDeptElections = await DepartmentalElection.countDocuments({
      departmentId: voter.departmentId._id
    })

    const voterSSGBallots = await Ballot.find({ 
      voterId: voter._id,
      isSubmitted: true,
      ssgElectionId: { $ne: null }
    }).populate('ssgElectionId', 'title electionDate')

    const voterDeptBallots = await Ballot.find({ 
      voterId: voter._id,
      isSubmitted: true,
      deptElectionId: { $ne: null }
    }).populate('deptElectionId', 'title electionDate')

    // Get voter's voting history count
    const totalVotesCast = await Vote.countDocuments({
      ballotId: { $in: [...voterSSGBallots.map(b => b._id), ...voterDeptBallots.map(b => b._id)] }
    })

    // Check for any chat support requests
    const chatSupportRequests = await ChatSupport.find({
      voterId: voter._id
    }).sort({ submittedAt: -1 }).limit(5)

    // Voter status info
    const voterInfo = {
      fullName: voter.fullName,
      schoolId: voter.schoolId,
      firstName: voter.firstName,
      lastName: voter.lastName,
      department: voter.departmentId?.degreeProgram,
      departmentCode: voter.departmentId?.departmentCode,
      college: voter.departmentId?.college,
      yearLevel: voter.yearLevel,
      isRegistered: voter.isRegistered,
      isClassOfficer: voter.isClassOfficer,
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
      availableElections: {
        ssg: availableSSGElections,
        departmental: availableDeptElections
      },
      completedElections: {
        ssg: voterSSGBallots,
        departmental: voterDeptBallots
      },
      // FIXED: Departmental total now shows only elections for voter's department
      totalElections: {
        ssg: totalSSGElections,
        departmental: totalDeptElections
      },
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