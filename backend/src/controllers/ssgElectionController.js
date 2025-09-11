const mongoose = require("mongoose")
const SSGElection = require("../models/SSGElection")
const Candidate = require("../models/Candidate")
const Position = require("../models/Position")
const Partylist = require("../models/Partylist")
const Ballot = require("../models/Ballot")
const Vote = require("../models/Vote")
const AuditLog = require("../models/AuditLog")
const Voter = require("../models/Voter")
const Department = require("../models/Department")

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

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `SSG elections list accessed - ${elections.length} elections returned with filters: ${JSON.stringify({ status, year, page, limit, search })}`,
        req
      )

      res.json({
        success: true,
        data: elections,
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
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to retrieve SSG elections: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get single SSG election with full details
  static async getSSGElection(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to retrieve SSG election - Invalid election ID: ${id}`,
          req
        )
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await SSGElection.findById(id)
        .populate("createdBy", "username")

      if (!election) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to retrieve SSG election - Election not found: ${id}`,
          req
        )
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      // Get positions for this election
      const positions = await Position.find({ ssgElectionId: id, isActive: true })
        .sort({ positionOrder: 1 })

      // Get partylists for this election
      const partylists = await Partylist.find({ ssgElectionId: id, isActive: true })

      // Get candidates for this election with detailed info
      const candidates = await Candidate.find({ ssgElectionId: id, isActive: true })
        .populate("voterId", "firstName middleName lastName schoolId departmentId yearLevel")
        .populate({
          path: "voterId",
          populate: {
            path: "departmentId",
            select: "departmentCode degreeProgram college"
          }
        })
        .populate("positionId", "positionName positionOrder")
        .populate("partylistId", "partylistName")
        .sort({ positionId: 1, candidateNumber: 1 })

      // Get basic statistics - only count registered voters
      const totalRegisteredVoters = await Voter.countDocuments({ isActive: true, isRegistered: true })
      const totalBallots = await Ballot.countDocuments({ ssgElectionId: id })
      const submittedBallots = await Ballot.countDocuments({ ssgElectionId: id, isSubmitted: true })

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Accessed SSG election details - ${election.title} (${election.ssgElectionId}) - ${positions.length} positions, ${candidates.length} candidates`,
        req
      )

      res.json({
        success: true,
        data: {
          election,
          positions,
          partylists,
          candidates,
          statistics: {
            totalPositions: positions.length,
            totalCandidates: candidates.length,
            totalPartylists: partylists.length,
            totalRegisteredVoters,
            totalBallots,
            submittedBallots,
            turnoutPercentage: totalRegisteredVoters > 0 ? ((submittedBallots / totalRegisteredVoters) * 100).toFixed(2) : 0
          }
        }
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to retrieve SSG election ${req.params.id}: ${error.message}`,
        req
      )
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
        electionDate
      } = req.body

      // Validation
      const requiredFields = { ssgElectionId, electionYear, title, electionDate }
      const missingFields = Object.entries(requiredFields).filter(([key, value]) => !value).map(([key]) => key)
      
      if (missingFields.length > 0) {
        await AuditLog.logUserAction(
          "CREATE_SSG_ELECTION",
          req.user,
          `Failed to create SSG election - Missing required fields: ${missingFields.join(', ')}`,
          req
        )
        const error = new Error(`Required fields are missing: ${missingFields.join(', ')}`)
        error.statusCode = 400
        return next(error)
      }

      // Validate election year
      const currentYear = new Date().getFullYear()
      if (electionYear < currentYear || electionYear > currentYear + 5) {
        await AuditLog.logUserAction(
          "CREATE_SSG_ELECTION",
          req.user,
          `Failed to create SSG election - Invalid election year: ${electionYear}`,
          req
        )
        const error = new Error("Election year must be within current year to 5 years in the future")
        error.statusCode = 400
        return next(error)
      }

      // Validate election date
      const electionDateObj = new Date(electionDate)
      if (electionDateObj < new Date()) {
        await AuditLog.logUserAction(
          "CREATE_SSG_ELECTION",
          req.user,
          `Failed to create SSG election - Election date in the past: ${electionDate}`,
          req
        )
        const error = new Error("Election date cannot be in the past")
        error.statusCode = 400
        return next(error)
      }

      // Check if election ID already exists
      const existingElection = await SSGElection.findOne({ ssgElectionId })
      if (existingElection) {
        await AuditLog.logUserAction(
          "CREATE_SSG_ELECTION",
          req.user,
          `Failed to create SSG election - Election ID already exists: ${ssgElectionId}`,
          req
        )
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
        createdBy: req.user?.userId,
      })

      await election.save()
      await election.populate("createdBy", "username")

      await AuditLog.logUserAction(
        "CREATE_SSG_ELECTION",
        req.user,
        `SSG election created - ${title} (${ssgElectionId}) for year ${electionYear}`,
        req
      )

      res.status(201).json({
        success: true,
        message: "SSG election created successfully",
        data: election
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "CREATE_SSG_ELECTION",
        req.user,
        `Failed to create SSG election: ${error.message}`,
        req
      )
      
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
        await AuditLog.logUserAction(
          "UPDATE_SSG_ELECTION",
          req.user,
          `Failed to update SSG election - Invalid election ID: ${id}`,
          req
        )
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
          await AuditLog.logUserAction(
            "UPDATE_SSG_ELECTION",
            req.user,
            `Failed to update SSG election - Invalid status: ${updateData.status}`,
            req
          )
          const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
          error.statusCode = 400
          return next(error)
        }
      }

      // Validate election date if provided
      if (updateData.electionDate) {
        const electionDateObj = new Date(updateData.electionDate)
        if (electionDateObj < new Date() && updateData.status !== 'completed') {
          await AuditLog.logUserAction(
            "UPDATE_SSG_ELECTION",
            req.user,
            `Failed to update SSG election - Election date in the past: ${updateData.electionDate}`,
            req
          )
          const error = new Error("Election date cannot be in the past unless status is 'completed'")
          error.statusCode = 400
          return next(error)
        }
        updateData.electionDate = electionDateObj
      }

      // Check if election exists
      const existingElection = await SSGElection.findById(id)
      if (!existingElection) {
        await AuditLog.logUserAction(
          "UPDATE_SSG_ELECTION",
          req.user,
          `Failed to update SSG election - Election not found: ${id}`,
          req
        )
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      // Prevent updates to elections with submitted ballots
      const submittedBallots = await Ballot.countDocuments({ ssgElectionId: id, isSubmitted: true })
      if (submittedBallots > 0 && updateData.electionDate) {
        await AuditLog.logUserAction(
          "UPDATE_SSG_ELECTION",
          req.user,
          `Failed to update SSG election - Cannot modify election with ${submittedBallots} submitted ballots: ${existingElection.title}`,
          req
        )
        const error = new Error("Cannot modify election date after votes have been submitted")
        error.statusCode = 400
        return next(error)
      }

      const election = await SSGElection.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate("createdBy", "username")

      await AuditLog.logUserAction(
        "UPDATE_SSG_ELECTION",
        req.user,
        `SSG election updated - ${election.title} (${election.ssgElectionId}) - Changes: ${Object.keys(updateData).join(', ')}`,
        req
      )

      res.json({
        success: true,
        message: "SSG election updated successfully",
        data: election
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "UPDATE_SSG_ELECTION",
        req.user,
        `Failed to update SSG election ${req.params.id}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Delete SSG election
  static async deleteSSGElection(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          "DELETE_SSG_ELECTION",
          req.user,
          `Failed to delete SSG election - Invalid election ID: ${id}`,
          req
        )
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await SSGElection.findById(id)
      if (!election) {
        await AuditLog.logUserAction(
          "DELETE_SSG_ELECTION",
          req.user,
          `Failed to delete SSG election - Election not found: ${id}`,
          req
        )
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if election has votes
      const ballotCount = await Ballot.countDocuments({ ssgElectionId: id, isSubmitted: true })
      if (ballotCount > 0) {
        await AuditLog.logUserAction(
          "DELETE_SSG_ELECTION",
          req.user,
          `Failed to delete SSG election - Has ${ballotCount} submitted ballots: ${election.title}`,
          req
        )
        const error = new Error(`Cannot delete election. ${ballotCount} ballots have been submitted.`)
        error.statusCode = 400
        return next(error)
      }

      // Check if election is currently active
      if (election.status === 'active') {
        await AuditLog.logUserAction(
          "DELETE_SSG_ELECTION",
          req.user,
          `Failed to delete SSG election - Election is active: ${election.title}`,
          req
        )
        const error = new Error("Cannot delete an active election")
        error.statusCode = 400
        return next(error)
      }

      // Use transaction for data consistency
      const session = await mongoose.startSession()
      
      try {
        await session.withTransaction(async () => {
          // Delete all related data in order
          await Vote.deleteMany({ ssgElectionId: id }, { session })
          await Ballot.deleteMany({ ssgElectionId: id }, { session })
          await Candidate.deleteMany({ ssgElectionId: id }, { session })
          await Position.deleteMany({ ssgElectionId: id }, { session })
          await Partylist.deleteMany({ ssgElectionId: id }, { session })
          await SSGElection.findByIdAndDelete(id, { session })
        })
      } finally {
        await session.endSession()
      }

      await AuditLog.logUserAction(
        "DELETE_SSG_ELECTION",
        req.user,
        `SSG election deleted - ${election.title} (${election.ssgElectionId}) and all related data`,
        req
      )

      res.json({
        success: true,
        message: "SSG election deleted successfully"
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "DELETE_SSG_ELECTION",
        req.user,
        `Failed to delete SSG election ${req.params.id}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get SSG election statistics
  static async getSSGElectionStatistics(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to get SSG election statistics - Invalid election ID: ${id}`,
          req
        )
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await SSGElection.findById(id)
      if (!election) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to get SSG election statistics - Election not found: ${id}`,
          req
        )
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      // Basic counts
      const totalPositions = await Position.countDocuments({ ssgElectionId: id, isActive: true })
      const totalCandidates = await Candidate.countDocuments({ ssgElectionId: id, isActive: true })
      const totalPartylists = await Partylist.countDocuments({ ssgElectionId: id, isActive: true })
      const totalRegisteredVoters = await Voter.countDocuments({ isActive: true, isRegistered: true })
      const totalBallots = await Ballot.countDocuments({ ssgElectionId: id })
      const submittedBallots = await Ballot.countDocuments({ ssgElectionId: id, isSubmitted: true })

      // Get candidates by position with vote counts
      const candidatesByPosition = await Position.aggregate([
        { $match: { ssgElectionId: new mongoose.Types.ObjectId(id), isActive: true } },
        { $sort: { positionOrder: 1 } },
        {
          $lookup: {
            from: "candidates",
            let: { positionId: "$_id" },
            pipeline: [
              { 
                $match: { 
                  $expr: { 
                    $and: [
                      { $eq: ["$positionId", "$$positionId"] },
                      { $eq: ["$ssgElectionId", new mongoose.Types.ObjectId(id)] },
                      { $eq: ["$isActive", true] }
                    ]
                  }
                }
              },
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
                  from: "departments",
                  localField: "voter.departmentId",
                  foreignField: "_id",
                  as: "voter.department"
                }
              },
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
                  partylistName: { $arrayElemAt: ["$partylist.partylistName", 0] },
                  department: { $arrayElemAt: ["$voter.department", 0] }
                }
              },
              { $sort: { voteCount: -1, candidateNumber: 1 } }
            ],
            as: "candidates"
          }
        }
      ])

      // Get partylist statistics
      const partylistStats = await Candidate.aggregate([
        { $match: { ssgElectionId: new mongoose.Types.ObjectId(id), partylistId: { $ne: null }, isActive: true } },
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

      // Voting timeline (votes over time) - only for submitted ballots
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

      // Voter demographics (by department and year level) for registered voters
      const voterDemographics = await Voter.aggregate([
        { $match: { isActive: true, isRegistered: true } },
        {
          $lookup: {
            from: "departments",
            localField: "departmentId",
            foreignField: "_id",
            as: "department"
          }
        },
        { $unwind: "$department" },
        {
          $group: {
            _id: {
              departmentCode: "$department.departmentCode",
              degreeProgram: "$department.degreeProgram",
              yearLevel: "$yearLevel"
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.departmentCode": 1, "_id.yearLevel": 1 } }
      ])

      // Election overview
      const overview = {
        totalPositions,
        totalCandidates,
        totalPartylists,
        totalRegisteredVoters,
        totalBallots,
        submittedBallots,
        pendingBallots: totalBallots - submittedBallots,
        turnoutPercentage: totalRegisteredVoters > 0 ? ((submittedBallots / totalRegisteredVoters) * 100).toFixed(2) : 0,
        status: election.status,
        electionDate: election.electionDate,
        electionType: "ssg"
      }

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Accessed SSG election statistics - ${election.title} (${election.ssgElectionId}) - ${totalCandidates} candidates, ${submittedBallots} votes`,
        req
      )

      res.json({
        success: true,
        data: {
          overview,
          candidatesByPosition,
          partylistStats,
          votingTimeline,
          voterDemographics,
          election: {
            id: election._id,
            title: election.title,
            ssgElectionId: election.ssgElectionId,
            electionType: "ssg",
            status: election.status
          }
        }
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to retrieve SSG election statistics for ${req.params.id}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get SSG election results
  static async getSSGElectionResults(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to get SSG election results - Invalid election ID: ${id}`,
          req
        )
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const election = await SSGElection.findById(id)
      if (!election) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to get SSG election results - Election not found: ${id}`,
          req
        )
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      // Get detailed results by position
      const results = await Position.aggregate([
        { $match: { ssgElectionId: new mongoose.Types.ObjectId(id), isActive: true } },
        { $sort: { positionOrder: 1 } },
        {
          $lookup: {
            from: "candidates",
            let: { positionId: "$_id" },
            pipeline: [
              { $match: { 
                $expr: { 
                  $and: [
                    { $eq: ["$positionId", "$positionId"] },
                    { $eq: ["$ssgElectionId", new mongoose.Types.ObjectId(id)] },
                    { $eq: ["$isActive", true] }
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
                  from: "departments",
                  localField: "voter.departmentId",
                  foreignField: "_id",
                  as: "voter.department"
                }
              },
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
                  partylistName: { $arrayElemAt: ["$partylist.partylistName", 0] },
                  department: { $arrayElemAt: ["$voter.department", 0] }
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

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Accessed SSG election results - ${election.title} (${election.ssgElectionId}) - ${results.length} positions`,
        req
      )

      res.json({
        success: true,
        data: {
          election: {
            id: election._id,
            title: election.title,
            ssgElectionId: election.ssgElectionId,
            status: election.status,
            electionDate: election.electionDate,
            electionType: "ssg"
          },
          results
        }
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to retrieve SSG election results for ${req.params.id}: ${error.message}`,
        req
      )
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

      // Registered voters count
      const totalRegisteredVoters = await Voter.countDocuments({ isActive: true, isRegistered: true })

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        "Accessed SSG elections dashboard summary",
        req
      )

      res.json({
        success: true,
        data: {
          summary: {
            totalElections,
            activeElections,
            upcomingElections,
            completedElections,
            totalVotes: totalVotes[0]?.totalVotes || 0,
            totalRegisteredVoters
          },
          recentElections,
          electionsByYear
        }
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to retrieve SSG dashboard summary: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Toggle SSG election status
  static async toggleSSGElectionStatus(req, res, next) {
    try {
      const { id } = req.params
      const { status } = req.body

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          "UPDATE_SSG_ELECTION",
          req.user,
          `Failed to toggle SSG election status - Invalid election ID: ${id}`,
          req
        )
        const error = new Error("Invalid election ID format")
        error.statusCode = 400
        return next(error)
      }

      const validStatuses = ["upcoming", "active", "completed", "cancelled"]
      if (!validStatuses.includes(status)) {
        await AuditLog.logUserAction(
          "UPDATE_SSG_ELECTION",
          req.user,
          `Failed to toggle SSG election status - Invalid status: ${status}`,
          req
        )
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
        await AuditLog.logUserAction(
          "UPDATE_SSG_ELECTION",
          req.user,
          `Failed to toggle SSG election status - Election not found: ${id}`,
          req
        )
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      // Log the status change with appropriate audit action
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

      res.json({
        success: true,
        message: `SSG election status updated to ${status}`,
        data: election
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "UPDATE_SSG_ELECTION",
        req.user,
        `Failed to toggle SSG election status ${req.params.id}: ${error.message}`,
        req
      )
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
        success: true,
        data: {
          upcomingElections,
          summary: {
            total: upcomingElections.length
          }
        }
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to retrieve upcoming SSG elections: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get SSG elections available for voting (for registered voters)
  static async getSSGElectionsForVoting(req, res, next) {
    try {
      const { voterId } = req.params || req.query

      // Check if voter exists and is registered
      if (voterId && mongoose.Types.ObjectId.isValid(voterId)) {
        const voter = await Voter.findById(voterId)
        if (!voter || !voter.isActive || !voter.isRegistered) {
          await AuditLog.logVoterAction(
            "SYSTEM_ACCESS",
            { _id: voterId, schoolId: voter?.schoolId },
            `Failed to access SSG elections for voting - Voter not registered or inactive`,
            req
          )
          const error = new Error("Voter is not registered or inactive")
          error.statusCode = 403
          return next(error)
        }
      }

      // Get active SSG elections
      const activeElections = await SSGElection.find({ status: 'active' })
        .sort({ electionDate: 1 })
        .lean()

      // For each election, check if voter has already voted
      const electionsWithVotingStatus = await Promise.all(
        activeElections.map(async (election) => {
          let hasVoted = false
          if (voterId && mongoose.Types.ObjectId.isValid(voterId)) {
            const ballot = await Ballot.findOne({ 
              ssgElectionId: election._id, 
              voterId: voterId,
              isSubmitted: true 
            })
            hasVoted = !!ballot
          }

          return {
            ...election,
            hasVoted,
            canVote: !hasVoted && election.status === 'active'
          }
        })
      )

      if (voterId) {
        await AuditLog.logVoterAction(
          "SYSTEM_ACCESS",
          { _id: voterId },
          `Accessed available SSG elections for voting - ${electionsWithVotingStatus.length} active elections`,
          req
        )
      } else {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Accessed available SSG elections for voting - ${electionsWithVotingStatus.length} active elections`,
          req
        )
      }

      res.json({
        success: true,
        data: {
          elections: electionsWithVotingStatus,
          summary: {
            total: electionsWithVotingStatus.length,
            availableForVoting: electionsWithVotingStatus.filter(e => e.canVote).length
          }
        }
      })
    } catch (error) {
      if (voterId) {
        await AuditLog.logVoterAction(
          "SYSTEM_ACCESS",
          { _id: voterId },
          `Failed to retrieve SSG elections for voting: ${error.message}`,
          req
        )
      } else {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to retrieve SSG elections for voting: ${error.message}`,
          req
        )
      }
      next(error)
    }
  }
}

module.exports = SSGElectionController