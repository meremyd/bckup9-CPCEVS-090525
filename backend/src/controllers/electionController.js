const mongoose = require("mongoose")
const Election = require("../models/Election")
const Candidate = require("../models/Candidate")
const Position = require("../models/Position")
const Partylist = require("../models/Partylist")
const Ballot = require("../models/Ballot")
const Vote = require("../models/Vote")
const AuditLog = require("../models/AuditLog")
const Voter = require("../models/Voter")

class ElectionController {
  // Get all elections with enhanced filtering and pagination
  static async getAllElections(req, res, next) {
    try {
      const { electionType, status, year, page = 1, limit = 50, search } = req.query
      
      // Build filter
      const filter = {}
      if (electionType) filter.electionType = electionType
      if (status) filter.status = status
      if (year) filter.electionYear = parseInt(year)
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { electionId: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } }
        ]
      }

      // Pagination
      const skip = (page - 1) * limit
      const limitNum = Math.min(Number.parseInt(limit), 100) // Max 100 items per page

      const elections = await Election.find(filter)
        .populate("createdBy", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)

      const total = await Election.countDocuments(filter)
      const totalPages = Math.ceil(total / limitNum)

      // Log the access
      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        details: `Elections list accessed - ${elections.length} elections returned`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        elections,
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

  // Get single election with full details
  static async getElection(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await Election.findById(id)
        .populate("createdBy", "username")

      if (!election) {
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }

      // Get positions for this election
      const positions = await Position.find({ electionId: id })
        .sort({ positionOrder: 1 })

      // Get partylists for this election
      const partylists = await Partylist.find({ electionId: id })

      // Get candidates for this election with detailed info
      const candidates = await Candidate.find({ electionId: id })
        .populate("voterId", "firstName middleName lastName schoolId")
        .populate("positionId", "positionName positionOrder")
        .populate("partylistId", "partylistName")
        .sort({ positionId: 1, candidateNumber: 1 })

      // Get basic statistics
      const totalBallots = await Ballot.countDocuments({ electionId: id })
      const submittedBallots = await Ballot.countDocuments({ electionId: id, isSubmitted: true })

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

  // Create new election
  static async createElection(req, res, next) {
    try {
      const {
        electionId,
        electionYear,
        title,
        electionType,
        department,
        status = "upcoming",
        electionDate,
        ballotOpenTime,
        ballotCloseTime,
      } = req.body

      // Validation
      const requiredFields = { electionId, electionYear, title, electionType, electionDate, ballotOpenTime, ballotCloseTime }
      const missingFields = Object.entries(requiredFields).filter(([key, value]) => !value).map(([key]) => key)
      
      if (missingFields.length > 0) {
        const error = new Error(`Required fields are missing: ${missingFields.join(', ')}`)
        error.statusCode = 400
        return next(error)
      }

      // Validate election type
      if (!["departmental", "ssg"].includes(electionType)) {
        const error = new Error("Invalid election type. Must be 'departmental' or 'ssg'")
        error.statusCode = 400
        return next(error)
      }

      // Departmental elections require department
      if (electionType === "departmental" && !department) {
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
      const existingElection = await Election.findOne({ electionId })
      if (existingElection) {
        const error = new Error("Election ID already exists")
        error.statusCode = 400
        return next(error)
      }

      const election = new Election({
        electionId,
        electionYear,
        title,
        electionType,
        department: electionType === "departmental" ? department : null,
        status,
        electionDate: electionDateObj,
        ballotOpenTime,
        ballotCloseTime,
        createdBy: req.user?.userId,
      })

      await election.save()
      await election.populate("createdBy", "username")

      // Log the creation
      await AuditLog.create({
        action: "CREATE_ELECTION",
        username: req.user?.username || "system",
        details: `Election created - ${title} (${electionId})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.status(201).json(election)
    } catch (error) {
      if (error.code === 11000) {
        error.message = "Election ID already exists"
        error.statusCode = 400
      }
      next(error)
    }
  }

  // Update election
  static async updateElection(req, res, next) {
    try {
      const { id } = req.params
      const updateData = { ...req.body }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      // Don't allow changing certain fields
      delete updateData.electionId
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

      // Check if election exists and has votes before allowing certain updates
      const existingElection = await Election.findById(id)
      if (!existingElection) {
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }

      // Prevent updates to active elections with submitted ballots
      const submittedBallots = await Ballot.countDocuments({ electionId: id, isSubmitted: true })
      if (submittedBallots > 0 && (updateData.electionDate || updateData.ballotOpenTime || updateData.ballotCloseTime)) {
        const error = new Error("Cannot modify election timing after votes have been submitted")
        error.statusCode = 400
        return next(error)
      }

      const election = await Election.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate("createdBy", "username")

      // Log the update
      await AuditLog.create({
        action: "UPDATE_ELECTION",
        username: req.user?.username || "system",
        details: `Election updated - ${election.title} (${election.electionId})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json(election)
    } catch (error) {
      next(error)
    }
  }

  // Delete election
  static async deleteElection(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await Election.findById(id)
      if (!election) {
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if election has votes
      const ballotCount = await Ballot.countDocuments({ electionId: id, isSubmitted: true })
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
          await Vote.deleteMany({ ballotId: { $in: await Ballot.find({ electionId: id }).select('_id') } }, { session })
          await Ballot.deleteMany({ electionId: id }, { session })
          await Candidate.deleteMany({ electionId: id }, { session })
          await Position.deleteMany({ electionId: id }, { session })
          await Partylist.deleteMany({ electionId: id }, { session })
          await Election.findByIdAndDelete(id, { session })
        })
      } finally {
        await session.endSession()
      }

      // Log the deletion
      await AuditLog.create({
        action: "DELETE_ELECTION",
        username: req.user?.username || "system",
        details: `Election deleted - ${election.title} (${election.electionId})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({ message: "Election deleted successfully" })
    } catch (error) {
      next(error)
    }
  }

  // Get comprehensive election statistics
  static async getElectionStatistics(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await Election.findById(id)
      if (!election) {
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }

      // Basic counts
      const totalPositions = await Position.countDocuments({ electionId: id })
      const totalCandidates = await Candidate.countDocuments({ electionId: id })
      const totalPartylists = await Partylist.countDocuments({ electionId: id })
      const totalBallots = await Ballot.countDocuments({ electionId: id })
      const submittedBallots = await Ballot.countDocuments({ electionId: id, isSubmitted: true })

      // Get candidates by position with vote counts
      const candidatesByPosition = await Candidate.aggregate([
        { $match: { electionId: new mongoose.Types.ObjectId(id) } },
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
        { $match: { electionId: new mongoose.Types.ObjectId(id), partylistId: { $ne: null } } },
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
        { $match: { electionId: new mongoose.Types.ObjectId(id), isSubmitted: true } },
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
        electionType: election.electionType
      }

      res.json({
        overview,
        candidatesByPosition,
        partylistStats,
        votingTimeline,
        election: {
          id: election._id,
          title: election.title,
          electionId: election.electionId,
          electionType: election.electionType,
          status: election.status
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get election results (detailed vote breakdown)
  static async getElectionResults(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await Election.findById(id)
      if (!election) {
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }

      // Get detailed results by position
      const results = await Position.aggregate([
        { $match: { electionId: new mongoose.Types.ObjectId(id) } },
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
                    { $eq: ["$electionId", new mongoose.Types.ObjectId(id)] }
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

      res.json({
        election: {
          id: election._id,
          title: election.title,
          electionId: election.electionId,
          status: election.status,
          electionDate: election.electionDate
        },
        results
      })
    } catch (error) {
      next(error)
    }
  }

  // Activate/Deactivate election
  static async toggleElectionStatus(req, res, next) {
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

      const election = await Election.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      ).populate("createdBy", "username")

      if (!election) {
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }

      // Log the status change
      await AuditLog.create({
        action: "UPDATE_ELECTION",
        username: req.user?.username || "system",
        details: `Election status changed to ${status} - ${election.title} (${election.electionId})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json(election)
    } catch (error) {
      next(error)
    }
  }

  // Get elections dashboard summary
  static async getDashboardSummary(req, res, next) {
    try {
      const totalElections = await Election.countDocuments()
      const activeElections = await Election.countDocuments({ status: 'active' })
      const upcomingElections = await Election.countDocuments({ status: 'upcoming' })
      const completedElections = await Election.countDocuments({ status: 'completed' })

      // Recent elections
      const recentElections = await Election.find()
        .populate("createdBy", "username")
        .sort({ createdAt: -1 })
        .limit(5)

      // Elections by type
      const electionsByType = await Election.aggregate([
        {
          $group: {
            _id: "$electionType",
            count: { $sum: 1 }
          }
        }
      ])

      res.json({
        summary: {
          totalElections,
          activeElections,
          upcomingElections,
          completedElections
        },
        recentElections,
        electionsByType
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = ElectionController