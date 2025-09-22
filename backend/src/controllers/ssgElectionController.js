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
      electionDate,
      ballotOpenTime,
      ballotCloseTime
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

    // Validate ballot times if provided (now expects HH:MM format)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/

    if (ballotOpenTime && !timeRegex.test(ballotOpenTime)) {
      await AuditLog.logUserAction(
        "CREATE_SSG_ELECTION",
        req.user,
        `Failed to create SSG election - Invalid ballot open time format: ${ballotOpenTime}`,
        req
      )
      const error = new Error("Ballot open time must be in HH:MM format (24-hour)")
      error.statusCode = 400
      return next(error)
    }

    if (ballotCloseTime && !timeRegex.test(ballotCloseTime)) {
      await AuditLog.logUserAction(
        "CREATE_SSG_ELECTION",
        req.user,
        `Failed to create SSG election - Invalid ballot close time format: ${ballotCloseTime}`,
        req
      )
      const error = new Error("Ballot close time must be in HH:MM format (24-hour)")
      error.statusCode = 400
      return next(error)
    }

    // Validate ballot time relationship (if both provided)
    if (ballotOpenTime && ballotCloseTime) {
      const [openHours, openMinutes] = ballotOpenTime.split(':').map(Number)
      const [closeHours, closeMinutes] = ballotCloseTime.split(':').map(Number)
      
      const openTimeInMinutes = openHours * 60 + openMinutes
      const closeTimeInMinutes = closeHours * 60 + closeMinutes
      
      if (closeTimeInMinutes <= openTimeInMinutes) {
        await AuditLog.logUserAction(
          "CREATE_SSG_ELECTION",
          req.user,
          `Failed to create SSG election - Ballot close time must be after open time`,
          req
        )
        const error = new Error("Ballot close time must be after ballot open time")
        error.statusCode = 400
        return next(error)
      }
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
      ballotOpenTime: ballotOpenTime || null,
      ballotCloseTime: ballotCloseTime || null,
      createdBy: req.user?.userId,
    })

    await election.save()
    await election.populate("createdBy", "username")

    await AuditLog.logUserAction(
      "CREATE_SSG_ELECTION",
      req.user,
      `SSG election created - ${title} (${ssgElectionId}) for year ${electionYear}${ballotOpenTime && ballotCloseTime ? ` with ballot times: ${ballotOpenTime} to ${ballotCloseTime}` : ''}`,
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

    // Validate ballot times if provided (now expects HH:MM format)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/

    if (updateData.ballotOpenTime !== undefined) {
      if (updateData.ballotOpenTime && !timeRegex.test(updateData.ballotOpenTime)) {
        await AuditLog.logUserAction(
          "UPDATE_SSG_ELECTION",
          req.user,
          `Failed to update SSG election - Invalid ballot open time format: ${updateData.ballotOpenTime}`,
          req
        )
        const error = new Error("Ballot open time must be in HH:MM format (24-hour)")
        error.statusCode = 400
        return next(error)
      }
    }

    if (updateData.ballotCloseTime !== undefined) {
      if (updateData.ballotCloseTime && !timeRegex.test(updateData.ballotCloseTime)) {
        await AuditLog.logUserAction(
          "UPDATE_SSG_ELECTION",
          req.user,
          `Failed to update SSG election - Invalid ballot close time format: ${updateData.ballotCloseTime}`,
          req
        )
        const error = new Error("Ballot close time must be in HH:MM format (24-hour)")
        error.statusCode = 400
        return next(error)
      }
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

    // Validate ballot time relationship if both are provided or being updated
    const finalBallotOpenTime = updateData.ballotOpenTime !== undefined ? updateData.ballotOpenTime : existingElection.ballotOpenTime
    const finalBallotCloseTime = updateData.ballotCloseTime !== undefined ? updateData.ballotCloseTime : existingElection.ballotCloseTime

    if (finalBallotOpenTime && finalBallotCloseTime) {
      const [openHours, openMinutes] = finalBallotOpenTime.split(':').map(Number)
      const [closeHours, closeMinutes] = finalBallotCloseTime.split(':').map(Number)
      
      const openTimeInMinutes = openHours * 60 + openMinutes
      const closeTimeInMinutes = closeHours * 60 + closeMinutes
      
      if (closeTimeInMinutes <= openTimeInMinutes) {
        await AuditLog.logUserAction(
          "UPDATE_SSG_ELECTION",
          req.user,
          `Failed to update SSG election - Ballot close time must be after open time`,
          req
        )
        const error = new Error("Ballot close time must be after ballot open time")
        error.statusCode = 400
        return next(error)
      }
    }

    // Prevent updates to elections with submitted ballots
    const submittedBallots = await Ballot.countDocuments({ ssgElectionId: id, isSubmitted: true })
    if (submittedBallots > 0 && (updateData.electionDate || updateData.ballotOpenTime !== undefined || updateData.ballotCloseTime !== undefined)) {
      await AuditLog.logUserAction(
        "UPDATE_SSG_ELECTION",
        req.user,
        `Failed to update SSG election - Cannot modify election with ${submittedBallots} submitted ballots: ${existingElection.title}`,
        req
      )
      const error = new Error("Cannot modify election date or ballot times after votes have been submitted")
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

    // Enhanced basic counts with more detailed statistics
    const totalPositions = await Position.countDocuments({ ssgElectionId: id, isActive: true })
    const totalCandidates = await Candidate.countDocuments({ ssgElectionId: id, isActive: true })
    const totalPartylists = await Partylist.countDocuments({ ssgElectionId: id, isActive: true })
    const totalRegisteredVoters = await Voter.countDocuments({ isActive: true, isRegistered: true })
    const totalBallots = await Ballot.countDocuments({ ssgElectionId: id })
    const submittedBallots = await Ballot.countDocuments({ ssgElectionId: id, isSubmitted: true })
    const pendingBallots = totalBallots - submittedBallots
    const totalVotes = await Vote.countDocuments({ ssgElectionId: id })

    // Enhanced candidates by position with more detailed vote information
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
                from: "votes",
                localField: "_id",
                foreignField: "candidateId",
                as: "votes"
              }
            },
            {
              $addFields: {
                actualVoteCount: { $size: "$votes" }
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
                department: { $arrayElemAt: ["$voter.department", 0] },
                schoolId: "$voter.schoolId"
              }
            },
            { $sort: { actualVoteCount: -1, candidateNumber: 1 } }
          ],
          as: "candidates"
        }
      },
      {
        $addFields: {
          totalVotesForPosition: { 
            $sum: "$candidates.actualVoteCount"
          },
          winner: { $arrayElemAt: ["$candidates", 0] },
          candidateCount: { $size: "$candidates" }
        }
      }
    ])

    // Enhanced partylist statistics with vote counts
    const partylistStats = await Partylist.aggregate([
      { $match: { ssgElectionId: new mongoose.Types.ObjectId(id), isActive: true } },
      {
        $lookup: {
          from: "candidates",
          let: { partylistId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$partylistId", "$$partylistId"] },
                    { $eq: ["$ssgElectionId", new mongoose.Types.ObjectId(id)] },
                    { $eq: ["$isActive", true] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: "votes",
                localField: "_id",
                foreignField: "candidateId",
                as: "votes"
              }
            },
            {
              $addFields: {
                actualVoteCount: { $size: "$votes" }
              }
            }
          ],
          as: "candidates"
        }
      },
      {
        $addFields: {
          candidateCount: { $size: "$candidates" },
          totalVotes: { $sum: "$candidates.actualVoteCount" }
        }
      },
      { $sort: { totalVotes: -1, partylistName: 1 } }
    ])

    // Independent candidates (not affiliated with any partylist)
    const independentCandidates = await Candidate.aggregate([
      { 
        $match: { 
          ssgElectionId: new mongoose.Types.ObjectId(id), 
          isActive: true, 
          partylistId: null 
        } 
      },
      {
        $lookup: {
          from: "votes",
          localField: "_id",
          foreignField: "candidateId",
          as: "votes"
        }
      },
      {
        $addFields: {
          actualVoteCount: { $size: "$votes" }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalVotes: { $sum: "$actualVoteCount" }
        }
      }
    ])

    // Voting timeline with more granular data
    const votingTimeline = await Ballot.aggregate([
      { $match: { ssgElectionId: new mongoose.Types.ObjectId(id), isSubmitted: true } },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$submittedAt"
              }
            },
            hour: {
              $dateToString: {
                format: "%H",
                date: "$submittedAt"
              }
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          hourlyData: {
            $push: {
              hour: "$_id.hour",
              count: "$count"
            }
          },
          dailyTotal: { $sum: "$count" }
        }
      },
      { $sort: { "_id": 1 } }
    ])

    // Voter demographics with voting status
    const voterDemographics = await Voter.aggregate([
      { $match: { isActive: true, isRegistered: true } },
      {
        $lookup: {
          from: "ballots",
          let: { voterId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$voterId", "$$voterId"] },
                    { $eq: ["$ssgElectionId", new mongoose.Types.ObjectId(id)] },
                    { $eq: ["$isSubmitted", true] }
                  ]
                }
              }
            }
          ],
          as: "ballot"
        }
      },
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
            college: "$department.college",
            yearLevel: "$yearLevel"
          },
          totalVoters: { $sum: 1 },
          votedCount: {
            $sum: {
              $cond: [{ $gt: [{ $size: "$ballot" }, 0] }, 1, 0]
            }
          }
        }
      },
      {
        $addFields: {
          notVotedCount: { $subtract: ["$totalVoters", "$votedCount"] },
          turnoutPercentage: {
            $round: [
              { $multiply: [{ $divide: ["$votedCount", "$totalVoters"] }, 100] },
              2
            ]
          }
        }
      },
      { $sort: { "_id.departmentCode": 1, "_id.yearLevel": 1 } }
    ])

    // Ballot completion statistics
    const ballotStats = await Ballot.aggregate([
      { $match: { ssgElectionId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          totalBallots: { $sum: 1 },
          submittedBallots: {
            $sum: { $cond: ["$isSubmitted", 1, 0] }
          },
          pendingBallots: {
            $sum: { $cond: ["$isSubmitted", 0, 1] }
          },
          averageBallotDuration: { $avg: "$ballotDuration" },
          minBallotDuration: { $min: "$ballotDuration" },
          maxBallotDuration: { $max: "$ballotDuration" }
        }
      }
    ])

    // Enhanced election overview
    const overview = {
      totalPositions,
      totalCandidates,
      totalPartylists,
      independentCandidates: independentCandidates[0]?.count || 0,
      totalRegisteredVoters,
      totalBallots,
      submittedBallots,
      pendingBallots,
      totalVotes,
      averageVotesPerCandidate: totalCandidates > 0 ? (totalVotes / totalCandidates).toFixed(2) : 0,
      averageVotesPerPosition: totalPositions > 0 ? (totalVotes / totalPositions).toFixed(2) : 0,
      turnoutPercentage: totalRegisteredVoters > 0 ? ((submittedBallots / totalRegisteredVoters) * 100).toFixed(2) : 0,
      completionRate: totalBallots > 0 ? ((submittedBallots / totalBallots) * 100).toFixed(2) : 0,
      status: election.status,
      electionDate: election.electionDate,
      electionType: "ssg"
    }

    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Accessed enhanced SSG election statistics - ${election.title} (${election.ssgElectionId}) - ${totalCandidates} candidates, ${submittedBallots} votes, ${totalVotes} total votes cast`,
      req
    )

    res.json({
      success: true,
      data: {
        overview,
        candidatesByPosition,
        partylistStats,
        independentCandidatesStats: independentCandidates[0] || { count: 0, totalVotes: 0 },
        votingTimeline,
        voterDemographics,
        ballotStatistics: ballotStats[0] || {
          totalBallots: 0,
          submittedBallots: 0,
          pendingBallots: 0,
          averageBallotDuration: 0,
          minBallotDuration: 0,
          maxBallotDuration: 0
        },
        election: {
          id: election._id,
          title: election.title,
          ssgElectionId: election.ssgElectionId,
          electionType: "ssg",
          status: election.status,
          electionDate: election.electionDate,
          electionYear: election.electionYear
        }
      }
    })
  } catch (error) {
    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Failed to retrieve enhanced SSG election statistics for ${req.params.id}: ${error.message}`,
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

  // Additional methods for SSGElectionController class

// Get SSG election candidates
static async getSSGElectionCandidates(req, res, next) {
  try {
    const { id } = req.params
    const { positionId, partylistId, status = 'active' } = req.query

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to get SSG election candidates - Invalid election ID: ${id}`,
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
        `Failed to get SSG election candidates - Election not found: ${id}`,
        req
      )
      const error = new Error("SSG election not found")
      error.statusCode = 404
      return next(error)
    }

    // Build filter
    const filter = { ssgElectionId: id }
    if (status === 'active') filter.isActive = true
    else if (status === 'inactive') filter.isActive = false
    if (positionId) filter.positionId = positionId
    if (partylistId) filter.partylistId = partylistId

    const candidates = await Candidate.find(filter)
      .populate("voterId", "firstName middleName lastName schoolId departmentId yearLevel")
      .populate({
        path: "voterId",
        populate: {
          path: "departmentId",
          select: "departmentCode degreeProgram college"
        }
      })
      .populate("positionId", "positionName positionOrder maxVotes")
      .populate("partylistId", "partylistName description")
      .sort({ "positionId.positionOrder": 1, candidateNumber: 1 })

    // Group candidates by position
    const candidatesByPosition = candidates.reduce((acc, candidate) => {
      const positionName = candidate.positionId?.positionName || "Unknown Position"
      if (!acc[positionName]) {
        acc[positionName] = {
          position: candidate.positionId,
          candidates: []
        }
      }
      acc[positionName].candidates.push(candidate)
      return acc
    }, {})

    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Accessed SSG election candidates - ${election.title} - ${candidates.length} candidates`,
      req
    )

    res.json({
      success: true,
      data: {
        election: {
          id: election._id,
          title: election.title,
          ssgElectionId: election.ssgElectionId,
          status: election.status
        },
        candidates,
        candidatesByPosition,
        summary: {
          totalCandidates: candidates.length,
          activeCandidates: candidates.filter(c => c.isActive).length,
          inactiveCandidates: candidates.filter(c => !c.isActive).length
        }
      }
    })
  } catch (error) {
    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Failed to get SSG election candidates for ${req.params.id}: ${error.message}`,
      req
    )
    next(error)
  }
}

// Get SSG election partylists
static async getSSGElectionPartylists(req, res, next) {
  try {
    const { id } = req.params
    const { status = 'active' } = req.query

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to get SSG election partylists - Invalid election ID: ${id}`,
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
        `Failed to get SSG election partylists - Election not found: ${id}`,
        req
      )
      const error = new Error("SSG election not found")
      error.statusCode = 404
      return next(error)
    }

    // Build filter
    const filter = { ssgElectionId: id }
    if (status === 'active') filter.isActive = true
    else if (status === 'inactive') filter.isActive = false

    const partylists = await Partylist.find(filter).sort({ partylistName: 1 })

    // Get candidate count for each partylist
    const partylistsWithCandidates = await Promise.all(
      partylists.map(async (partylist) => {
        const candidateCount = await Candidate.countDocuments({
          ssgElectionId: id,
          partylistId: partylist._id,
          isActive: true
        })
        return {
          ...partylist.toObject(),
          candidateCount
        }
      })
    )

    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Accessed SSG election partylists - ${election.title} - ${partylists.length} partylists`,
      req
    )

    res.json({
      success: true,
      data: {
        election: {
          id: election._id,
          title: election.title,
          ssgElectionId: election.ssgElectionId,
          status: election.status
        },
        partylists: partylistsWithCandidates,
        summary: {
          totalPartylists: partylists.length,
          activePartylists: partylists.filter(p => p.isActive).length,
          inactivePartylists: partylists.filter(p => !p.isActive).length
        }
      }
    })
  } catch (error) {
    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Failed to get SSG election partylists for ${req.params.id}: ${error.message}`,
      req
    )
    next(error)
  }
}

// Get SSG election voter participants
static async getSSGElectionVoterParticipants(req, res, next) {
  try {
    const { id } = req.params
    const { page = 1, limit = 50, departmentId, yearLevel, hasVoted } = req.query

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to get SSG election voter participants - Invalid election ID: ${id}`,
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
        `Failed to get SSG election voter participants - Election not found: ${id}`,
        req
      )
      const error = new Error("SSG election not found")
      error.statusCode = 404
      return next(error)
    }

    // Build filter for eligible voters (all registered voters for SSG)
    const voterFilter = { isActive: true, isRegistered: true }
    if (departmentId) voterFilter.departmentId = departmentId
    if (yearLevel) voterFilter.yearLevel = parseInt(yearLevel)

    // Pagination
    const skip = (page - 1) * limit
    const limitNum = Math.min(Number.parseInt(limit), 100)

    // Get voters with ballot information
    const voters = await Voter.find(voterFilter)
      .populate("departmentId", "departmentCode degreeProgram college")
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean()

    // Get ballot information for these voters
    const voterIds = voters.map(v => v._id)
    const ballots = await Ballot.find({
      ssgElectionId: id,
      voterId: { $in: voterIds }
    }).lean()

    // Create ballot lookup map
    const ballotMap = ballots.reduce((acc, ballot) => {
      acc[ballot.voterId.toString()] = ballot
      return acc
    }, {})

    // Enhance voters with voting status
    const participantData = voters.map(voter => {
      const ballot = ballotMap[voter._id.toString()]
      return {
        ...voter,
        hasVoted: ballot ? ballot.isSubmitted : false,
        votedAt: ballot ? ballot.submittedAt : null,
        ballotStatus: ballot ? (ballot.isSubmitted ? 'submitted' : 'started') : 'not_started'
      }
    })

    // Apply hasVoted filter if specified
    const filteredParticipants = hasVoted !== undefined 
      ? participantData.filter(p => p.hasVoted === (hasVoted === 'true'))
      : participantData

    const total = await Voter.countDocuments(voterFilter)
    const totalPages = Math.ceil(total / limitNum)

    // Get summary statistics
    const totalRegisteredVoters = await Voter.countDocuments({ isActive: true, isRegistered: true })
    const totalVoted = await Ballot.countDocuments({ ssgElectionId: id, isSubmitted: true })

    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Accessed SSG election voter participants - ${election.title} - ${filteredParticipants.length} participants`,
      req
    )

    res.json({
      success: true,
      data: {
        election: {
          id: election._id,
          title: election.title,
          ssgElectionId: election.ssgElectionId,
          status: election.status
        },
        participants: filteredParticipants,
        summary: {
          totalRegisteredVoters,
          totalVoted,
          totalNotVoted: totalRegisteredVoters - totalVoted,
          turnoutPercentage: totalRegisteredVoters > 0 ? ((totalVoted / totalRegisteredVoters) * 100).toFixed(2) : 0
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum
        }
      }
    })
  } catch (error) {
    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Failed to get SSG election voter participants for ${req.params.id}: ${error.message}`,
      req
    )
    next(error)
  }
}

// Get SSG election voter turnout
static async getSSGElectionVoterTurnout(req, res, next) {
  try {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to get SSG election voter turnout - Invalid election ID: ${id}`,
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
        `Failed to get SSG election voter turnout - Election not found: ${id}`,
        req
      )
      const error = new Error("SSG election not found")
      error.statusCode = 404
      return next(error)
    }

    // Overall turnout statistics
    const totalRegisteredVoters = await Voter.countDocuments({ isActive: true, isRegistered: true })
    const totalVoted = await Ballot.countDocuments({ ssgElectionId: id, isSubmitted: true })
    const totalNotVoted = totalRegisteredVoters - totalVoted

    // Turnout by department
    const turnoutByDepartment = await Voter.aggregate([
      { $match: { isActive: true, isRegistered: true } },
      {
        $lookup: {
          from: "ballots",
          let: { voterId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$voterId", "$$voterId"] },
                    { $eq: ["$ssgElectionId", new mongoose.Types.ObjectId(id)] },
                    { $eq: ["$isSubmitted", true] }
                  ]
                }
              }
            }
          ],
          as: "ballot"
        }
      },
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
            departmentId: "$departmentId",
            departmentCode: "$department.departmentCode",
            degreeProgram: "$department.degreeProgram",
            college: "$department.college"
          },
          totalVoters: { $sum: 1 },
          votedCount: {
            $sum: {
              $cond: [{ $gt: [{ $size: "$ballot" }, 0] }, 1, 0]
            }
          }
        }
      },
      {
        $addFields: {
          notVotedCount: { $subtract: ["$totalVoters", "$votedCount"] },
          turnoutPercentage: {
            $round: [
              { $multiply: [{ $divide: ["$votedCount", "$totalVoters"] }, 100] },
              2
            ]
          }
        }
      },
      { $sort: { "_id.departmentCode": 1 } }
    ])

    // Turnout by year level
    const turnoutByYearLevel = await Voter.aggregate([
      { $match: { isActive: true, isRegistered: true } },
      {
        $lookup: {
          from: "ballots",
          let: { voterId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$voterId", "$$voterId"] },
                    { $eq: ["$ssgElectionId", new mongoose.Types.ObjectId(id)] },
                    { $eq: ["$isSubmitted", true] }
                  ]
                }
              }
            }
          ],
          as: "ballot"
        }
      },
      {
        $group: {
          _id: "$yearLevel",
          totalVoters: { $sum: 1 },
          votedCount: {
            $sum: {
              $cond: [{ $gt: [{ $size: "$ballot" }, 0] }, 1, 0]
            }
          }
        }
      },
      {
        $addFields: {
          notVotedCount: { $subtract: ["$totalVoters", "$votedCount"] },
          turnoutPercentage: {
            $round: [
              { $multiply: [{ $divide: ["$votedCount", "$totalVoters"] }, 100] },
              2
            ]
          }
        }
      },
      { $sort: { "_id": 1 } }
    ])

    // Voting timeline (hourly breakdown)
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

    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Accessed SSG election voter turnout - ${election.title} - ${totalVoted}/${totalRegisteredVoters} voted`,
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
          electionDate: election.electionDate
        },
        overall: {
          totalRegisteredVoters,
          totalVoted,
          totalNotVoted,
          turnoutPercentage: totalRegisteredVoters > 0 ? ((totalVoted / totalRegisteredVoters) * 100).toFixed(2) : 0
        },
        turnoutByDepartment,
        turnoutByYearLevel,
        votingTimeline
      }
    })
  } catch (error) {
    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Failed to get SSG election voter turnout for ${req.params.id}: ${error.message}`,
      req
    )
    next(error)
  }
}

// Get SSG election ballots
static async getSSGElectionBallots(req, res, next) {
  try {
    const { id } = req.params
    const { page = 1, limit = 50, status, voterId } = req.query

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to get SSG election ballots - Invalid election ID: ${id}`,
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
        `Failed to get SSG election ballots - Election not found: ${id}`,
        req
      )
      const error = new Error("SSG election not found")
      error.statusCode = 404
      return next(error)
    }

    // Build filter
    const filter = { ssgElectionId: id }
    if (status) {
      if (status === 'submitted') filter.isSubmitted = true
      else if (status === 'pending') filter.isSubmitted = false
    }
    if (voterId && mongoose.Types.ObjectId.isValid(voterId)) {
      filter.voterId = voterId
    }

    // Pagination
    const skip = (page - 1) * limit
    const limitNum = Math.min(Number.parseInt(limit), 100)

    const ballots = await Ballot.find(filter)
      .populate("voterId", "schoolId firstName middleName lastName departmentId yearLevel")
      .populate({
        path: "voterId",
        populate: {
          path: "departmentId",
          select: "departmentCode degreeProgram college"
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)

    const total = await Ballot.countDocuments(filter)
    const totalPages = Math.ceil(total / limitNum)

    // Get ballot statistics
    const ballotStats = await Ballot.aggregate([
      { $match: { ssgElectionId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          totalBallots: { $sum: 1 },
          submittedBallots: {
            $sum: { $cond: ["$isSubmitted", 1, 0] }
          },
          pendingBallots: {
            $sum: { $cond: ["$isSubmitted", 0, 1] }
          },
          averageBallotDuration: { $avg: "$ballotDuration" }
        }
      }
    ])

    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Accessed SSG election ballots - ${election.title} - ${ballots.length} ballots`,
      req
    )

    res.json({
      success: true,
      data: {
        election: {
          id: election._id,
          title: election.title,
          ssgElectionId: election.ssgElectionId,
          status: election.status
        },
        ballots,
        statistics: ballotStats[0] || {
          totalBallots: 0,
          submittedBallots: 0,
          pendingBallots: 0,
          averageBallotDuration: 0
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum
        }
      }
    })
  } catch (error) {
    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Failed to get SSG election ballots for ${req.params.id}: ${error.message}`,
      req
    )
    next(error)
  }
}

// Get SSG election positions
static async getSSGElectionPositions(req, res, next) {
  try {
    const { id } = req.params
    const { status = 'active' } = req.query

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to get SSG election positions - Invalid election ID: ${id}`,
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
        `Failed to get SSG election positions - Election not found: ${id}`,
        req
      )
      const error = new Error("SSG election not found")
      error.statusCode = 404
      return next(error)
    }

    // Build filter
    const filter = { ssgElectionId: id }
    if (status === 'active') filter.isActive = true
    else if (status === 'inactive') filter.isActive = false

    const positions = await Position.find(filter)
      .sort({ positionOrder: 1 })
      .lean()

    // Get candidate count for each position
    const positionsWithCandidates = await Promise.all(
      positions.map(async (position) => {
        const candidateCount = await Candidate.countDocuments({
          ssgElectionId: id,
          positionId: position._id,
          isActive: true
        })

        const candidates = await Candidate.find({
          ssgElectionId: id,
          positionId: position._id,
          isActive: true
        })
          .populate("voterId", "firstName middleName lastName schoolId")
          .populate("partylistId", "partylistName")
          .sort({ candidateNumber: 1 })

        return {
          ...position,
          candidateCount,
          candidates: candidates.map(candidate => ({
            id: candidate._id,
            candidateNumber: candidate.candidateNumber,
            name: candidate.voterId ? 
              `${candidate.voterId.firstName} ${candidate.voterId.middleName ? candidate.voterId.middleName + ' ' : ''}${candidate.voterId.lastName}` : 
              'Unknown Candidate',
            schoolId: candidate.voterId?.schoolId,
            partylist: candidate.partylistId?.partylistName || 'Independent',
            voteCount: candidate.voteCount
          }))
        }
      })
    )

    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Accessed SSG election positions - ${election.title} - ${positions.length} positions`,
      req
    )

    res.json({
      success: true,
      data: {
        election: {
          id: election._id,
          title: election.title,
          ssgElectionId: election.ssgElectionId,
          status: election.status
        },
        positions: positionsWithCandidates,
        summary: {
          totalPositions: positions.length,
          activePositions: positions.filter(p => p.isActive).length,
          inactivePositions: positions.filter(p => !p.isActive).length,
          totalCandidates: positionsWithCandidates.reduce((sum, pos) => sum + pos.candidateCount, 0)
        }
      }
    })
  } catch (error) {
    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Failed to get SSG election positions for ${req.params.id}: ${error.message}`,
      req
    )
    next(error)
  }
}

static async getSSGElectionOverview(req, res, next) {
  try {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to get SSG election overview - Invalid election ID: ${id}`,
        req
      )
      const error = new Error("Invalid election ID format")
      error.statusCode = 400
      return next(error)
    }

    const election = await SSGElection.findById(id).populate("createdBy", "username")
    if (!election) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to get SSG election overview - Election not found: ${id}`,
        req
      )
      const error = new Error("SSG election not found")
      error.statusCode = 404
      return next(error)
    }

    // Get comprehensive counts
    const [
      totalPositions,
      totalCandidates,
      totalPartylists,
      totalRegisteredVoters,
      totalBallots,
      submittedBallots,
      totalVotes,
      activePositions,
      activeCandidates,
      activePartylists
    ] = await Promise.all([
      Position.countDocuments({ ssgElectionId: id }),
      Candidate.countDocuments({ ssgElectionId: id }),
      Partylist.countDocuments({ ssgElectionId: id }),
      Voter.countDocuments({ isActive: true, isRegistered: true }),
      Ballot.countDocuments({ ssgElectionId: id }),
      Ballot.countDocuments({ ssgElectionId: id, isSubmitted: true }),
      Vote.countDocuments({ ssgElectionId: id }),
      Position.countDocuments({ ssgElectionId: id, isActive: true }),
      Candidate.countDocuments({ ssgElectionId: id, isActive: true }),
      Partylist.countDocuments({ ssgElectionId: id, isActive: true })
    ])

    // Calculate derived statistics
    const pendingBallots = totalBallots - submittedBallots
    const turnoutPercentage = totalRegisteredVoters > 0 ? ((submittedBallots / totalRegisteredVoters) * 100).toFixed(2) : 0
    const completionRate = totalBallots > 0 ? ((submittedBallots / totalBallots) * 100).toFixed(2) : 0
    const averageVotesPerCandidate = activeCandidates > 0 ? (totalVotes / activeCandidates).toFixed(2) : 0
    const averageVotesPerPosition = activePositions > 0 ? (totalVotes / activePositions).toFixed(2) : 0

    // Get quick candidate summary by partylist
    const candidatesByPartylist = await Candidate.aggregate([
      { $match: { ssgElectionId: new mongoose.Types.ObjectId(id), isActive: true } },
      {
        $lookup: {
          from: "partylists",
          localField: "partylistId",
          foreignField: "_id",
          as: "partylist"
        }
      },
      {
        $group: {
          _id: {
            partylistId: "$partylistId",
            partylistName: { $arrayElemAt: ["$partylist.partylistName", 0] }
          },
          candidateCount: { $sum: 1 }
        }
      },
      {
        $project: {
          partylistName: {
            $ifNull: ["$_id.partylistName", "Independent"]
          },
          candidateCount: 1
        }
      },
      { $sort: { candidateCount: -1 } }
    ])

    // Get voting progress by day
    const votingProgress = await Ballot.aggregate([
      { $match: { ssgElectionId: new mongoose.Types.ObjectId(id), isSubmitted: true } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$submittedAt"
            }
          },
          dailyVotes: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ])

    const overview = {
      election: {
        id: election._id,
        title: election.title,
        ssgElectionId: election.ssgElectionId,
        electionYear: election.electionYear,
        status: election.status,
        electionDate: election.electionDate,
        ballotOpenTime: election.ballotOpenTime,
        ballotCloseTime: election.ballotCloseTime,
        ballotStatus: election.ballotStatus,
        ballotsAreOpen: election.ballotsAreOpen,
        createdBy: election.createdBy,
        electionType: "ssg"
      },
      counts: {
        positions: {
          total: totalPositions,
          active: activePositions,
          inactive: totalPositions - activePositions
        },
        candidates: {
          total: totalCandidates,
          active: activeCandidates,
          inactive: totalCandidates - activeCandidates
        },
        partylists: {
          total: totalPartylists,
          active: activePartylists,
          inactive: totalPartylists - activePartylists
        },
        voters: {
          totalRegistered: totalRegisteredVoters,
          voted: submittedBallots,
          notVoted: totalRegisteredVoters - submittedBallots
        },
        ballots: {
          total: totalBallots,
          submitted: submittedBallots,
          pending: pendingBallots
        },
        votes: {
          total: totalVotes
        }
      },
      percentages: {
        turnoutPercentage: parseFloat(turnoutPercentage),
        completionRate: parseFloat(completionRate)
      },
      averages: {
        votesPerCandidate: parseFloat(averageVotesPerCandidate),
        votesPerPosition: parseFloat(averageVotesPerPosition)
      },
      summaries: {
        candidatesByPartylist,
        votingProgress
      }
    }

    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Accessed SSG election overview - ${election.title} (${election.ssgElectionId})`,
      req
    )

    res.json({
      success: true,
      data: overview
    })
  } catch (error) {
    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Failed to retrieve SSG election overview for ${req.params.id}: ${error.message}`,
      req
    )
    next(error)
  }
}

}

module.exports = SSGElectionController