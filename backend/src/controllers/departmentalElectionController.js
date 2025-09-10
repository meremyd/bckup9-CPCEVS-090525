const mongoose = require("mongoose")
const DepartmentalElection = require("../models/DepartmentalElection")
const Candidate = require("../models/Candidate")
const Position = require("../models/Position")
const Partylist = require("../models/Partylist")
const Ballot = require("../models/Ballot")
const Vote = require("../models/Vote")
const AuditLog = require("../models/AuditLog")
const Voter = require("../models/Voter")
const ElectionParticipation = require("../models/ElectionParticipation")

class DepartmentalElectionController {
  // Get all departmental elections with enhanced filtering and pagination
  static async getAllDepartmentalElections(req, res, next) {
    try {
      const { department, status, year, page = 1, limit = 50, search } = req.query
      
      // Build filter for departmental elections only
      const filter = {}
      if (department) filter.department = department
      if (status) filter.status = status
      if (year) filter.electionYear = parseInt(year)
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { deptElectionId: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } }
        ]
      }

      // Pagination
      const skip = (page - 1) * limit
      const limitNum = Math.min(Number.parseInt(limit), 100) // Max 100 items per page

      const elections = await DepartmentalElection.find(filter)
        .populate("createdBy", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)

      const total = await DepartmentalElection.countDocuments(filter)
      const totalPages = Math.ceil(total / limitNum)

      // Get department statistics
      const departmentStats = await DepartmentalElection.aggregate([
        {
          $group: {
            _id: "$department",
            totalElections: { $sum: 1 },
            activeElections: { 
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } 
            },
            upcomingElections: { 
              $sum: { $cond: [{ $eq: ["$status", "upcoming"] }, 1, 0] } 
            },
            completedElections: { 
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } 
            }
          }
        },
        { $sort: { "_id": 1 } }
      ])

      // Log the access using proper AuditLog method
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Departmental elections list accessed - ${elections.length} elections returned`,
        req
      )

      res.json({
        elections,
        departmentStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get elections by specific department
  static async getElectionsByDepartment(req, res, next) {
    try {
      const { department } = req.params
      const { status, year, includeStats = true } = req.query

      if (!department) {
        const error = new Error("Department parameter is required")
        error.statusCode = 400
        return next(error)
      }

      // Build filter
      const filter = { 
        department: { $regex: new RegExp(department, 'i') }
      }
      if (status) filter.status = status
      if (year) filter.electionYear = parseInt(year)

      const elections = await DepartmentalElection.find(filter)
        .populate("createdBy", "username")
        .sort({ electionDate: -1 })

      let departmentStats = null
      if (includeStats === 'true') {
        // Get detailed statistics for this department
        departmentStats = await DepartmentalElection.aggregate([
          { $match: filter },
          {
            $group: {
              _id: null,
              totalElections: { $sum: 1 },
              activeElections: { 
                $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } 
              },
              upcomingElections: { 
                $sum: { $cond: [{ $eq: ["$status", "upcoming"] }, 1, 0] } 
              },
              completedElections: { 
                $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } 
              },
              cancelledElections: { 
                $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } 
              }
            }
          }
        ])

        // Get total votes cast in department elections
        const totalVotes = await Vote.aggregate([
          {
            $lookup: {
              from: "departmentalelections",
              localField: "deptElectionId",
              foreignField: "_id",
              as: "election"
            }
          },
          { $unwind: "$election" },
          { 
            $match: { 
              "election.department": { $regex: new RegExp(department, 'i') }
            } 
          },
          {
            $group: {
              _id: null,
              totalVotes: { $sum: 1 }
            }
          }
        ])

        departmentStats = {
          ...(departmentStats[0] || {
            totalElections: 0,
            activeElections: 0,
            upcomingElections: 0,
            completedElections: 0,
            cancelledElections: 0
          }),
          totalVotes: totalVotes[0]?.totalVotes || 0
        }
      }

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Department elections accessed - ${department} (${elections.length} elections)`,
        req
      )

      res.json({
        department,
        elections,
        stats: departmentStats
      })
    } catch (error) {
      next(error)
    }
  }

  // Get available departments
  static async getAvailableDepartments(req, res, next) {
    try {
      const departments = await DepartmentalElection.distinct("department", { 
        department: { $ne: null }
      })

      // Get department statistics with vote counts
      const departmentStats = await DepartmentalElection.aggregate([
        { 
          $match: { 
            department: { $ne: null }
          } 
        },
        {
          $group: {
            _id: "$department",
            totalElections: { $sum: 1 },
            activeElections: { 
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } 
            },
            upcomingElections: { 
              $sum: { $cond: [{ $eq: ["$status", "upcoming"] }, 1, 0] } 
            },
            completedElections: { 
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } 
            },
            latestElection: { $max: "$electionDate" },
            totalVotes: { $sum: "$totalVotes" }
          }
        },
        { $sort: { "_id": 1 } }
      ])

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Available departments accessed - ${departments.length} departments found`,
        req
      )

      res.json({
        departments,
        departmentStats
      })
    } catch (error) {
      next(error)
    }
  }

  // Get single departmental election with full details
  static async getDepartmentalElection(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await DepartmentalElection.findById(id)
        .populate("createdBy", "username")

      if (!election) {
        const error = new Error("Departmental election not found")
        error.statusCode = 404
        return next(error)
      }

      // Get positions for this election
      const positions = await Position.find({ deptElectionId: id })
        .sort({ positionOrder: 1 })

      // Get candidates for this election with detailed info
      const candidates = await Candidate.find({ deptElectionId: id })
        .populate("voterId", "firstName middleName lastName schoolId")
        .populate("positionId", "positionName positionOrder")
        .sort({ positionId: 1, candidateNumber: 1 })

      // Get election participation stats
      const participationStats = await ElectionParticipation.getElectionStats(id, 'departmental')

      // Log election access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Accessed departmental election details - ${election.title} (${election.deptElectionId})`,
        req
      )

      res.json({
        election,
        positions,
        candidates,
        statistics: {
          totalPositions: positions.length,
          totalCandidates: candidates.length,
          ...participationStats
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get departmental election results
  static async getDepartmentalElectionResults(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await DepartmentalElection.findById(id)
      if (!election) {
        const error = new Error("Departmental election not found")
        error.statusCode = 404
        return next(error)
      }

      // Get election results using Vote model static method
      const results = await Vote.getElectionResults(id, 'departmental')

      // Get participation statistics
      const participationStats = await ElectionParticipation.getElectionStats(id, 'departmental')

      // Get participation by department
      const participationByDepartment = await ElectionParticipation.getElectionStatsByDepartment(id, 'departmental')

      // Get winner for each position
      const winners = results.reduce((acc, result) => {
        const positionId = result._id.positionId.toString()
        if (!acc[positionId] || result.voteCount > acc[positionId].voteCount) {
          acc[positionId] = {
            candidateId: result._id.candidateId,
            candidate: result.candidate[0],
            position: result.position[0],
            voteCount: result.voteCount
          }
        }
        return acc
      }, {})

      // Log results access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Accessed departmental election results - ${election.title} (${election.deptElectionId})`,
        req
      )

      res.json({
        election: {
          id: election._id,
          title: election.title,
          deptElectionId: election.deptElectionId,
          department: election.department,
          status: election.status,
          electionDate: election.electionDate
        },
        results,
        winners: Object.values(winners),
        participationStats,
        participationByDepartment
      })
    } catch (error) {
      next(error)
    }
  }

  // Create new departmental election
  static async createDepartmentalElection(req, res, next) {
    try {
      const {
        deptElectionId,
        electionYear,
        title,
        department,
        status = "upcoming",
        electionDate,
        ballotOpenTime,
        ballotCloseTime,
      } = req.body

      // Validation
      const requiredFields = { deptElectionId, electionYear, title, department, electionDate, ballotOpenTime, ballotCloseTime }
      const missingFields = Object.entries(requiredFields).filter(([key, value]) => !value).map(([key]) => key)
      
      if (missingFields.length > 0) {
        const error = new Error(`Required fields are missing: ${missingFields.join(', ')}`)
        error.statusCode = 400
        return next(error)
      }

      // Department is required for departmental elections
      if (!department) {
        const error = new Error("Department is required for departmental elections")
        error.statusCode = 400
        return next(error)
      }

      // Validate election year
      const currentYear = new Date().getFullYear()
      if (electionYear < currentYear || electionYear > currentYear + 5) {
        const error = new Error("Election year must be within current year to 5 years in the future")
        error.statusCode = 400
        return next(error)
      }

      // Validate election date
      const electionDateObj = new Date(electionDate)
      if (electionDateObj < new Date()) {
        const error = new Error("Election date cannot be in the past")
        error.statusCode = 400
        return next(error)
      }

      // Check if election ID already exists
      const existingElection = await DepartmentalElection.findOne({ deptElectionId })
      if (existingElection) {
        const error = new Error("Election ID already exists")
        error.statusCode = 400
        return next(error)
      }

      const election = new DepartmentalElection({
        deptElectionId,
        electionYear,
        title,
        department,
        status,
        electionDate: electionDateObj,
        ballotOpenTime,
        ballotCloseTime,
        createdBy: req.user?.userId,
      })

      await election.save()
      await election.populate("createdBy", "username")

      // Log the creation using proper AuditLog method
      await AuditLog.logUserAction(
        "CREATE_DEPARTMENTAL_ELECTION",
        req.user,
        `Departmental election created - ${title} (${deptElectionId}) for ${department}`,
        req
      )

      res.status(201).json(election)
    } catch (error) {
      if (error.code === 11000) {
        error.message = "Election ID already exists"
        error.statusCode = 400
      }
      next(error)
    }
  }

  // Update departmental election
  static async updateDepartmentalElection(req, res, next) {
    try {
      const { id } = req.params
      const updateData = { ...req.body }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      // Don't allow changing certain fields
      delete updateData.deptElectionId
      delete updateData.createdBy
      delete updateData.totalVotes
      delete updateData.voterTurnout

      // Validate status if provided
      if (updateData.status) {
        const validStatuses = ["upcoming", "active", "completed", "cancelled"]
        if (!validStatuses.includes(updateData.status)) {
          const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
          error.statusCode = 400
          return next(error)
        }
      }

      // Validate election date if provided
      if (updateData.electionDate) {
        const electionDateObj = new Date(updateData.electionDate)
        if (electionDateObj < new Date() && updateData.status !== 'completed') {
          const error = new Error("Election date cannot be in the past unless status is 'completed'")
          error.statusCode = 400
          return next(error)
        }
        updateData.electionDate = electionDateObj
      }

      // Check if election exists
      const existingElection = await DepartmentalElection.findById(id)
      if (!existingElection) {
        const error = new Error("Departmental election not found")
        error.statusCode = 404
        return next(error)
      }

      // Prevent updates to active elections with submitted ballots
      const submittedBallots = await Ballot.countDocuments({ deptElectionId: id, isSubmitted: true })
      if (submittedBallots > 0 && (updateData.electionDate || updateData.ballotOpenTime || updateData.ballotCloseTime)) {
        const error = new Error("Cannot modify election timing after votes have been submitted")
        error.statusCode = 400
        return next(error)
      }

      const election = await DepartmentalElection.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate("createdBy", "username")

      // Log the update using proper AuditLog method
      await AuditLog.logUserAction(
        "UPDATE_DEPARTMENTAL_ELECTION",
        req.user,
        `Departmental election updated - ${election.title} (${election.deptElectionId}) for ${election.department}`,
        req
      )

      res.json(election)
    } catch (error) {
      next(error)
    }
  }

  // Delete departmental election
  static async deleteDepartmentalElection(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await DepartmentalElection.findById(id)
      if (!election) {
        const error = new Error("Departmental election not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if election has votes
      const ballotCount = await Ballot.countDocuments({ deptElectionId: id, isSubmitted: true })
      if (ballotCount > 0) {
        const error = new Error(`Cannot delete election. ${ballotCount} ballots have been submitted.`)
        error.statusCode = 400
        return next(error)
      }

      // Check if election is currently active
      if (election.status === 'active') {
        const error = new Error("Cannot delete an active election")
        error.statusCode = 400
        return next(error)
      }

      // Use transaction for data consistency
      const session = await mongoose.startSession()
      
      try {
        await session.withTransaction(async () => {
          // Delete all related data in order
          await Vote.deleteMany({ deptElectionId: id }, { session })
          await Ballot.deleteMany({ deptElectionId: id }, { session })
          await Candidate.deleteMany({ deptElectionId: id }, { session })
          await Position.deleteMany({ deptElectionId: id }, { session })
          await ElectionParticipation.deleteMany({ deptElectionId: id }, { session })
          await DepartmentalElection.findByIdAndDelete(id, { session })
        })
      } finally {
        await session.endSession()
      }

      // Log the deletion using proper AuditLog method
      await AuditLog.logUserAction(
        "DELETE_DEPARTMENTAL_ELECTION",
        req.user,
        `Departmental election deleted - ${election.title} (${election.deptElectionId}) for ${election.department}`,
        req
      )

      res.json({ message: "Departmental election deleted successfully" })
    } catch (error) {
      next(error)
    }
  }

  // Get departmental election statistics
  static async getDepartmentalElectionStatistics(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await DepartmentalElection.findById(id)
      if (!election) {
        const error = new Error("Departmental election not found")
        error.statusCode = 404
        return next(error)
      }

      // Basic counts
      const totalPositions = await Position.countDocuments({ deptElectionId: id })
      const totalCandidates = await Candidate.countDocuments({ deptElectionId: id })

      // Get participation statistics
      const participationStats = await ElectionParticipation.getElectionStats(id, 'departmental')
      const participationByDepartment = await ElectionParticipation.getElectionStatsByDepartment(id, 'departmental')

      // Get candidates by position with vote counts
      const candidatesByPosition = await Candidate.aggregate([
        { $match: { deptElectionId: new mongoose.Types.ObjectId(id) } },
        {
          $lookup: {
            from: "positions",
            localField: "positionId",
            foreignField: "_id",
            as: "position"
          }
        },
        { $unwind: "$position" },
        {
          $lookup: {
            from: "voters",
            localField: "voterId",
            foreignField: "_id",
            as: "voter"
          }
        },
        { $unwind: "$voter" },
        {
          $group: {
            _id: {
              positionId: "$positionId",
              positionName: "$position.positionName",
              positionOrder: "$position.positionOrder"
            },
            candidates: {
              $push: {
                candidateId: "$_id",
                candidateNumber: "$candidateNumber",
                name: {
                  $concat: [
                    "$voter.firstName",
                    " ",
                    { $ifNull: ["$voter.middleName", ""] },
                    " ",
                    "$voter.lastName"
                  ]
                },
                voteCount: "$voteCount"
              }
            },
            totalCandidates: { $sum: 1 },
            totalVotes: { $sum: "$voteCount" }
          }
        },
        { $sort: { "_id.positionOrder": 1 } }
      ])

      // Voting timeline (votes over time)
      const votingTimeline = await Ballot.aggregate([
        { $match: { deptElectionId: new mongoose.Types.ObjectId(id), isSubmitted: true } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d %H:00",
                date: "$submittedAt"
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id": 1 } }
      ])

      // Election overview
      const overview = {
        totalPositions,
        totalCandidates,
        ...participationStats,
        status: election.status,
        electionDate: election.electionDate,
        department: election.department
      }

      // Log statistics access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Accessed departmental election statistics - ${election.title} (${election.deptElectionId}) for ${election.department}`,
        req
      )

      res.json({
        overview,
        candidatesByPosition,
        participationByDepartment,
        votingTimeline,
        election: {
          id: election._id,
          title: election.title,
          deptElectionId: election.deptElectionId,
          department: election.department,
          status: election.status
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get departmental dashboard summary
  static async getDepartmentalDashboardSummary(req, res, next) {
    try {
      const totalElections = await DepartmentalElection.countDocuments()
      const activeElections = await DepartmentalElection.countDocuments({ status: 'active' })
      const upcomingElections = await DepartmentalElection.countDocuments({ status: 'upcoming' })
      const completedElections = await DepartmentalElection.countDocuments({ status: 'completed' })

      // Recent departmental elections
      const recentElections = await DepartmentalElection.find()
        .populate("createdBy", "username")
        .sort({ createdAt: -1 })
        .limit(5)

      // Elections by department
      const electionsByDepartment = await DepartmentalElection.aggregate([
        {
          $group: {
            _id: "$department",
            count: { $sum: 1 },
            activeCount: { 
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } 
            }
          }
        },
        { $sort: { "count": -1 } }
      ])

      // Log dashboard access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        "Accessed departmental elections dashboard summary",
        req
      )

      res.json({
        summary: {
          totalElections,
          activeElections,
          upcomingElections,
          completedElections
        },
        recentElections,
        electionsByDepartment
      })
    } catch (error) {
      next(error)
    }
  }

  // Toggle departmental election status
  static async toggleDepartmentalElectionStatus(req, res, next) {
    try {
      const { id } = req.params
      const { status } = req.body

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const validStatuses = ["upcoming", "active", "completed", "cancelled"]
      if (!validStatuses.includes(status)) {
        const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
        error.statusCode = 400
        return next(error)
      }

      const election = await DepartmentalElection.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      ).populate("createdBy", "username")

      if (!election) {
        const error = new Error("Departmental election not found")
        error.statusCode = 404
        return next(error)
      }

      // Log the status change
      let auditAction = "UPDATE_DEPARTMENTAL_ELECTION"
      if (status === "active") {
        auditAction = "START_ELECTION"
      } else if (status === "completed") {
        auditAction = "END_ELECTION"
      } else if (status === "cancelled") {
        auditAction = "CANCEL_ELECTION"
      }

      await AuditLog.logUserAction(
        auditAction,
        req.user,
        `Departmental election status changed to ${status} - ${election.title} (${election.deptElectionId}) for ${election.department}`,
        req
      )

      res.json(election)
    } catch (error) {
      next(error)
    }
  }

  // Get audit logs for departmental elections
  static async getDepartmentalElectionAuditLogs(req, res, next) {
    try {
      const { page = 1, limit = 50, action, username, startDate, endDate } = req.query

      // Build filter for departmental election related actions
      const filter = {
        action: {
          $in: [
            "CREATE_DEPARTMENTAL_ELECTION",
            "UPDATE_DEPARTMENTAL_ELECTION", 
            "DELETE_DEPARTMENTAL_ELECTION",
            "START_ELECTION",
            "END_ELECTION",
            "CANCEL_ELECTION"
          ]
        }
      }

      if (action) filter.action = action
      if (username) filter.username = { $regex: username, $options: 'i' }
      if (startDate || endDate) {
        filter.timestamp = {}
        if (startDate) filter.timestamp.$gte = new Date(startDate)
        if (endDate) filter.timestamp.$lte = new Date(endDate)
      }

      // Pagination
      const skip = (page - 1) * limit
      const limitNum = Math.min(Number.parseInt(limit), 100)

      const logs = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'username')

      const total = await AuditLog.countDocuments(filter)
      const totalPages = Math.ceil(total / limitNum)

      // Get action statistics
      const actionStats = await AuditLog.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 }
          }
        },
        { $sort: { "count": -1 } }
      ])

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Accessed departmental election audit logs - ${logs.length} logs returned`,
        req
      )

      res.json({
        logs,
        actionStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum
        }
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = DepartmentalElectionController