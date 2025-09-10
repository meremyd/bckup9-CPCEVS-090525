const mongoose = require("mongoose")
const SSGElection = require("../models/SSGElection")
const Candidate = require("../models/Candidate")
const Position = require("../models/Position")
const Partylist = require("../models/Partylist")
const Ballot = require("../models/Ballot")
const Vote = require("../models/Vote")
const AuditLog = require("../models/AuditLog")
const Voter = require("../models/Voter")

class SSGElectionController {
  // Get all SSG elections with enhanced filtering and pagination
  static async getAllSSGElections(req, res, next) {
    try {
      const { status, year, page = 1, limit = 50, search } = req.query
      
      // Build filter for SSG elections
      const filter = {}
      if (status) filter.status = status
      if (year) filter.electionYear = parseInt(year)
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { ssgElectionId: { $regex: search, $options: 'i' } }
        ]
      }

      // Pagination
      const skip = (page - 1) * limit
      const limitNum = Math.min(Number.parseInt(limit), 100) // Max 100 items per page

      const elections = await SSGElection.find(filter)
        .populate("createdBy", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)

      const total = await SSGElection.countDocuments(filter)
      const totalPages = Math.ceil(total / limitNum)

      // Get SSG election statistics
      const ssgStats = await SSGElection.aggregate([
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
            }
          }
        }
      ])

      // Get yearly breakdown for SSG elections
      const yearlyBreakdown = await SSGElection.aggregate([
        {
          $group: {
            _id: "$electionYear",
            count: { $sum: 1 },
            activeCount: { 
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } 
            },
            completedCount: { 
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } 
            }
          }
        },
        { $sort: { "_id": -1 } }
      ])

      // Log the access using proper AuditLog method
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `SSG elections list accessed - ${elections.length} elections returned`,
        req
      )

      res.json({
        elections,
        ssgStats: ssgStats[0] || {
          totalElections: 0,
          activeElections: 0,
          upcomingElections: 0,
          completedElections: 0
        },
        yearlyBreakdown,
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

  // Get single SSG election with full details
  static async getSSGElection(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await SSGElection.findById(id)
        .populate("createdBy", "username")

      if (!election) {
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      // Get positions for this election (assuming positions reference ssgElectionId)
      const positions = await Position.find({ ssgElectionId: id })
        .sort({ positionOrder: 1 })

      // Get partylists for this election
      const partylists = await Partylist.find({ ssgElectionId: id })

      // Get candidates for this election with detailed info
      const candidates = await Candidate.find({ ssgElectionId: id })
        .populate("voterId", "firstName middleName lastName schoolId")
        .populate("positionId", "positionName positionOrder")
        .populate("partylistId", "partylistName")
        .sort({ positionId: 1, candidateNumber: 1 })

      // Get basic statistics
      const totalBallots = await Ballot.countDocuments({ ssgElectionId: id })
      const submittedBallots = await Ballot.countDocuments({ ssgElectionId: id, isSubmitted: true })

      // Log election access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Accessed SSG election details - ${election.title} (${election.ssgElectionId})`,
        req
      )

      res.json({
        election,
        positions,
        partylists,
        candidates,
        statistics: {
          totalPositions: positions.length,
          totalCandidates: candidates.length,
          totalPartylists: partylists.length,
          totalBallots,
          submittedBallots,
          turnoutPercentage: totalBallots > 0 ? ((submittedBallots / totalBallots) * 100).toFixed(2) : 0
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Create new SSG election
  static async createSSGElection(req, res, next) {
    try {
      const {
        ssgElectionId,
        electionYear,
        title,
        status = "upcoming",
        electionDate,
        ballotOpenTime,
        ballotCloseTime,
      } = req.body

      // Validation
      const requiredFields = { ssgElectionId, electionYear, title, electionDate, ballotOpenTime, ballotCloseTime }
      const missingFields = Object.entries(requiredFields).filter(([key, value]) => !value).map(([key]) => key)
      
      if (missingFields.length > 0) {
        const error = new Error(`Required fields are missing: ${missingFields.join(', ')}`)
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
      const existingElection = await SSGElection.findOne({ ssgElectionId })
      if (existingElection) {
        const error = new Error("Election ID already exists")
        error.statusCode = 400
        return next(error)
      }

      const election = new SSGElection({
        ssgElectionId,
        electionYear,
        title,
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
        "CREATE_SSG_ELECTION",
        req.user,
        `SSG election created - ${title} (${ssgElectionId})`,
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

  // Update SSG election
  static async updateSSGElection(req, res, next) {
    try {
      const { id } = req.params
      const updateData = { ...req.body }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      // Don't allow changing certain fields
      delete updateData.ssgElectionId
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
      const existingElection = await SSGElection.findById(id)
      if (!existingElection) {
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      // Prevent updates to active elections with submitted ballots
      const submittedBallots = await Ballot.countDocuments({ ssgElectionId: id, isSubmitted: true })
      if (submittedBallots > 0 && (updateData.electionDate || updateData.ballotOpenTime || updateData.ballotCloseTime)) {
        const error = new Error("Cannot modify election timing after votes have been submitted")
        error.statusCode = 400
        return next(error)
      }

      const election = await SSGElection.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate("createdBy", "username")

      // Log the update using proper AuditLog method
      await AuditLog.logUserAction(
        "UPDATE_SSG_ELECTION",
        req.user,
        `SSG election updated - ${election.title} (${election.ssgElectionId})`,
        req
      )

      res.json(election)
    } catch (error) {
      next(error)
    }
  }

  // Delete SSG election
  static async deleteSSGElection(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await SSGElection.findById(id)
      if (!election) {
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if election has votes
      const ballotCount = await Ballot.countDocuments({ ssgElectionId: id, isSubmitted: true })
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
          await Vote.deleteMany({ ballotId: { $in: await Ballot.find({ ssgElectionId: id }).select('_id') } }, { session })
          await Ballot.deleteMany({ ssgElectionId: id }, { session })
          await Candidate.deleteMany({ ssgElectionId: id }, { session })
          await Position.deleteMany({ ssgElectionId: id }, { session })
          await Partylist.deleteMany({ ssgElectionId: id }, { session })
          await SSGElection.findByIdAndDelete(id, { session })
        })
      } finally {
        await session.endSession()
      }

      // Log the deletion using proper AuditLog method
      await AuditLog.logUserAction(
        "DELETE_SSG_ELECTION",
        req.user,
        `SSG election deleted - ${election.title} (${election.ssgElectionId})`,
        req
      )

      res.json({ message: "SSG election deleted successfully" })
    } catch (error) {
      next(error)
    }
  }

  // Get SSG election statistics
  static async getSSGElectionStatistics(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await SSGElection.findById(id)
      if (!election) {
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      // Basic counts
      const totalPositions = await Position.countDocuments({ ssgElectionId: id })
      const totalCandidates = await Candidate.countDocuments({ ssgElectionId: id })
      const totalPartylists = await Partylist.countDocuments({ ssgElectionId: id })
      const totalBallots = await Ballot.countDocuments({ ssgElectionId: id })
      const submittedBallots = await Ballot.countDocuments({ ssgElectionId: id, isSubmitted: true })

      // Get candidates by position with vote counts
      const candidatesByPosition = await Candidate.aggregate([
        { $match: { ssgElectionId: new mongoose.Types.ObjectId(id) } },
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

      // Get partylist statistics
      const partylistStats = await Candidate.aggregate([
        { $match: { ssgElectionId: new mongoose.Types.ObjectId(id), partylistId: { $ne: null } } },
        {
          $lookup: {
            from: "partylists",
            localField: "partylistId",
            foreignField: "_id",
            as: "partylist"
          }
        },
        { $unwind: "$partylist" },
        {
          $group: {
            _id: {
              partylistId: "$partylistId",
              partylistName: "$partylist.partylistName"
            },
            candidateCount: { $sum: 1 },
            totalVotes: { $sum: "$voteCount" }
          }
        },
        { $sort: { "totalVotes": -1 } }
      ])

      // Voting timeline (votes over time)
      const votingTimeline = await Ballot.aggregate([
        { $match: { ssgElectionId: new mongoose.Types.ObjectId(id), isSubmitted: true } },
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
        totalPartylists,
        totalBallots,
        submittedBallots,
        pendingBallots: totalBallots - submittedBallots,
        turnoutPercentage: totalBallots > 0 ? ((submittedBallots / totalBallots) * 100).toFixed(2) : 0,
        status: election.status,
        electionDate: election.electionDate,
        electionType: "ssg"
      }

      // Log statistics access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Accessed SSG election statistics - ${election.title} (${election.ssgElectionId})`,
        req
      )

      res.json({
        overview,
        candidatesByPosition,
        partylistStats,
        votingTimeline,
        election: {
          id: election._id,
          title: election.title,
          ssgElectionId: election.ssgElectionId,
          electionType: "ssg",
          status: election.status
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get SSG election results
  static async getSSGElectionResults(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await SSGElection.findById(id)
      if (!election) {
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      // Get detailed results by position
      const results = await Position.aggregate([
        { $match: { ssgElectionId: new mongoose.Types.ObjectId(id) } },
        { $sort: { positionOrder: 1 } },
        {
          $lookup: {
            from: "candidates",
            let: { positionId: "$_id" },
            pipeline: [
              { $match: { 
                $expr: { 
                  $and: [
                    { $eq: ["$positionId", "$$positionId"] },
                    { $eq: ["$ssgElectionId", new mongoose.Types.ObjectId(id)] }
                  ]
                }
              }},
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
                $lookup: {
                  from: "partylists",
                  localField: "partylistId",
                  foreignField: "_id",
                  as: "partylist"
                }
              },
              {
                $addFields: {
                  candidateName: {
                    $concat: [
                      "$voter.firstName",
                      " ",
                      { $ifNull: [{ $concat: ["$voter.middleName", " "] }, ""] },
                      "$voter.lastName"
                    ]
                  },
                  partylistName: { $arrayElemAt: ["$partylist.partylistName", 0] }
                }
              },
              { $sort: { voteCount: -1, candidateNumber: 1 } }
            ],
            as: "candidates"
          }
        },
        {
          $addFields: {
            totalVotesForPosition: { $sum: "$candidates.voteCount" },
            winner: { $arrayElemAt: ["$candidates", 0] }
          }
        }
      ])

      // Log results access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Accessed SSG election results - ${election.title} (${election.ssgElectionId})`,
        req
      )

      res.json({
        election: {
          id: election._id,
          title: election.title,
          ssgElectionId: election.ssgElectionId,
          status: election.status,
          electionDate: election.electionDate,
          electionType: "ssg"
        },
        results
      })
    } catch (error) {
      next(error)
    }
  }

  // Get SSG dashboard summary
  static async getSSGDashboardSummary(req, res, next) {
    try {
      const totalElections = await SSGElection.countDocuments()
      const activeElections = await SSGElection.countDocuments({ status: 'active' })
      const upcomingElections = await SSGElection.countDocuments({ status: 'upcoming' })
      const completedElections = await SSGElection.countDocuments({ status: 'completed' })

      // Recent SSG elections
      const recentElections = await SSGElection.find()
        .populate("createdBy", "username")
        .sort({ createdAt: -1 })
        .limit(5)

      // Elections by year
      const electionsByYear = await SSGElection.aggregate([
        {
          $group: {
            _id: "$electionYear",
            count: { $sum: 1 },
            activeCount: { 
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } 
            },
            completedCount: { 
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } 
            }
          }
        },
        { $sort: { "_id": -1 } }
      ])

      // Total votes across all SSG elections
      const totalVotes = await SSGElection.aggregate([
        {
          $group: {
            _id: null,
            totalVotes: { $sum: "$totalVotes" }
          }
        }
      ])

      // Log dashboard access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        "Accessed SSG elections dashboard summary",
        req
      )

      res.json({
        summary: {
          totalElections,
          activeElections,
          upcomingElections,
          completedElections,
          totalVotes: totalVotes[0]?.totalVotes || 0
        },
        recentElections,
        electionsByYear
      })
    } catch (error) {
      next(error)
    }
  }

  // Toggle SSG election status
  static async toggleSSGElectionStatus(req, res, next) {
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

      const election = await SSGElection.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      ).populate("createdBy", "username")

      if (!election) {
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      // Log the status change
      let auditAction = "UPDATE_SSG_ELECTION"
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
        `SSG election status changed to ${status} - ${election.title} (${election.ssgElectionId})`,
        req
      )

      res.json(election)
    } catch (error) {
      next(error)
    }
  }

  // Get upcoming SSG elections
  static async getUpcomingSSGElections(req, res, next) {
    try {
      const { limit = 10 } = req.query
      const limitNum = Math.min(Number.parseInt(limit), 50)

      const upcomingElections = await SSGElection.find({ 
        status: "upcoming",
        electionDate: { $gte: new Date() }
      })
        .populate("createdBy", "username")
        .sort({ electionDate: 1 })
        .limit(limitNum)

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Upcoming SSG elections accessed - ${upcomingElections.length} elections found`,
        req
      )

      res.json({
        upcomingElections,
        summary: {
          total: upcomingElections.length
        }
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = SSGElectionController