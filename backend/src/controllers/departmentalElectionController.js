const mongoose = require("mongoose")
const DepartmentalElection = require("../models/DepartmentalElection")
const Department = require("../models/Department")
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
      const { departmentId, status, year, page = 1, limit = 50, search } = req.query
      
      // Build filter for departmental elections only
      const filter = {}
      if (departmentId) filter.departmentId = departmentId
      if (status) filter.status = status
      if (year) filter.electionYear = parseInt(year)
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { deptElectionId: { $regex: search, $options: 'i' } }
        ]
      }

      // Pagination
      const skip = (page - 1) * limit
      const limitNum = Math.min(Number.parseInt(limit), 100) // Max 100 items per page

      const elections = await DepartmentalElection.find(filter)
        .populate("createdBy", "username")
        .populate("departmentId", "departmentCode degreeProgram college")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)

      const total = await DepartmentalElection.countDocuments(filter)
      const totalPages = Math.ceil(total / limitNum)

      // Get department statistics
      const departmentStats = await DepartmentalElection.aggregate([
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
              college: "$department.college"
            },
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
        { $sort: { "_id.college": 1, "_id.departmentCode": 1 } }
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
      const { departmentId } = req.params
      const { status, year, includeStats = true } = req.query

      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        const error = new Error("Invalid department ID format")
        error.statusCode = 400
        return next(error)
      }

      // Verify department exists
      const department = await Department.findById(departmentId)
      if (!department) {
        const error = new Error("Department not found")
        error.statusCode = 404
        return next(error)
      }

      // Build filter
      const filter = { departmentId: departmentId }
      if (status) filter.status = status
      if (year) filter.electionYear = parseInt(year)

      const elections = await DepartmentalElection.find(filter)
        .populate("createdBy", "username")
        .populate("departmentId", "departmentCode degreeProgram college")
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
              "election.departmentId": new mongoose.Types.ObjectId(departmentId)
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
        `Department elections accessed - ${department.departmentCode} (${elections.length} elections)`,
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
      // Get all departments that have at least one election
      const departmentsWithElections = await DepartmentalElection.aggregate([
        {
          $group: {
            _id: "$departmentId"
          }
        }
      ])

      const departmentIds = departmentsWithElections.map(dept => dept._id)
      
      const departments = await Department.find({ 
        _id: { $in: departmentIds }
      }).sort({ college: 1, departmentCode: 1 })

      // Get department statistics with vote counts
      const departmentStats = await DepartmentalElection.aggregate([
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
        { $sort: { "_id.college": 1, "_id.departmentCode": 1 } }
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
        .populate("departmentId", "departmentCode degreeProgram college")

      if (!election) {
        const error = new Error("Departmental election not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if user is eligible to view this election
      let isEligibleVoter = false
      if (req.user?.role === 'voter') {
        const voter = await Voter.findById(req.user.voterId).populate('departmentId')
        if (voter && voter.departmentId._id.equals(election.departmentId._id)) {
          isEligibleVoter = true
        }
      }

      // Get positions for this election
      const positions = await Position.find({ deptElectionId: id })
        .sort({ positionOrder: 1 })

      // Get candidates for this election with detailed info
      const candidates = await Candidate.find({ deptElectionId: id })
        .populate("voterId", "firstName middleName lastName schoolId departmentId yearLevel")
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
        },
        eligibility: {
          canVote: isEligibleVoter,
          canViewResults: true,
          canViewStatistics: req.user?.role !== 'voter' || isEligibleVoter
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
      .populate("departmentId", "departmentCode degreeProgram college")
    if (!election) {
      const error = new Error("Departmental election not found")
      error.statusCode = 404
      return next(error)
    }

    let canViewResults = false
    let accessReason = ''

    // Check user role and permissions
    if (req.user?.role === 'voter') {
      const voter = await Voter.findById(req.user.voterId).populate('departmentId')
      
      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if voter is from the same department
      const isFromSameDepartment = voter.departmentId._id.equals(election.departmentId._id)
      
      if (!voter.isRegistered || !voter.isPasswordActive) {
        canViewResults = false
        accessReason = "You must be a registered voter with an active password"
      } else if (!isFromSameDepartment) {
        canViewResults = false
        accessReason = `This election is for ${election.departmentId.departmentCode} department. You belong to ${voter.departmentId.departmentCode} department.`
      } else {
        // Same department and registered - can view results
        canViewResults = true
        accessReason = voter.isClassOfficer ? 
          "You can view results as a class officer from this department" :
          "You can view results as a student from this department"
      }

      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        voter,
        `Accessed departmental election results - ${election.title}: ${accessReason}`,
        req
      )
    } else {
      // Staff members (admin, election_committee, sao) can always view results
      canViewResults = true
      accessReason = "Staff access granted"
      
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Accessed departmental election results - ${election.title} (${election.deptElectionId})`,
        req
      )
    }

    if (!canViewResults) {
      const error = new Error(accessReason)
      error.statusCode = 403
      return next(error)
    }

    // Get election results
    const results = await Vote.getElectionResults(id, 'departmental')
    const participationStats = await ElectionParticipation.getElectionStats(id, 'departmental')

    // Get winners for each position
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

    res.json({
      election: {
        id: election._id,
        title: election.title,
        deptElectionId: election.deptElectionId,
        department: election.departmentId,
        status: election.status,
        electionDate: election.electionDate
      },
      results,
      winners: Object.values(winners),
      participationStats,
      accessInfo: {
        canViewResults,
        accessReason,
        userRole: req.user?.role
      }
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
        departmentId,
        status = "upcoming",
        electionDate
      } = req.body

      // Validation
      const requiredFields = { deptElectionId, electionYear, title, departmentId, electionDate }
      const missingFields = Object.entries(requiredFields).filter(([key, value]) => !value).map(([key]) => key)
      
      if (missingFields.length > 0) {
        const error = new Error(`Required fields are missing: ${missingFields.join(', ')}`)
        error.statusCode = 400
        return next(error)
      }

      // Validate department ID and ensure it exists
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        const error = new Error("Invalid department ID format")
        error.statusCode = 400
        return next(error)
      }

      const department = await Department.findById(departmentId)
      if (!department) {
        const error = new Error("Department not found")
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
        departmentId,
        status,
        electionDate: electionDateObj,
        createdBy: req.user?.userId,
      })

      await election.save()
      await election.populate([
        { path: "createdBy", select: "username" },
        { path: "departmentId", select: "departmentCode degreeProgram college" }
      ])

      // Log the creation using proper AuditLog method
      await AuditLog.logUserAction(
        "CREATE_DEPARTMENTAL_ELECTION",
        req.user,
        `Departmental election created - ${title} (${deptElectionId}) for ${department.departmentCode}`,
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

      // Validate departmentId if provided
      if (updateData.departmentId) {
        if (!mongoose.Types.ObjectId.isValid(updateData.departmentId)) {
          const error = new Error("Invalid department ID format")
          error.statusCode = 400
          return next(error)
        }

        const department = await Department.findById(updateData.departmentId)
        if (!department) {
          const error = new Error("Department not found")
          error.statusCode = 400
          return next(error)
        }
      }

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
      const existingElection = await DepartmentalElection.findById(id).populate("departmentId")
      if (!existingElection) {
        const error = new Error("Departmental election not found")
        error.statusCode = 404
        return next(error)
      }

      // Prevent updates to active elections with submitted ballots
      const submittedBallots = await Ballot.countDocuments({ deptElectionId: id, isSubmitted: true })
      if (submittedBallots > 0 && updateData.electionDate) {
        const error = new Error("Cannot modify election date after votes have been submitted")
        error.statusCode = 400
        return next(error)
      }

      const election = await DepartmentalElection.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate([
        { path: "createdBy", select: "username" },
        { path: "departmentId", select: "departmentCode degreeProgram college" }
      ])

      // Log the update using proper AuditLog method
      await AuditLog.logUserAction(
        "UPDATE_DEPARTMENTAL_ELECTION",
        req.user,
        `Departmental election updated - ${election.title} (${election.deptElectionId}) for ${election.departmentId.departmentCode}`,
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

      const election = await DepartmentalElection.findById(id).populate("departmentId")
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
        `Departmental election deleted - ${election.title} (${election.deptElectionId}) for ${election.departmentId.departmentCode}`,
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

    const election = await DepartmentalElection.findById(id).populate("departmentId")
    if (!election) {
      const error = new Error("Departmental election not found")
      error.statusCode = 404
      return next(error)
    }

    let canViewStatistics = false
    let accessReason = ''
    let voterEligibility = null

    // Check access permissions
    if (req.user?.role === 'voter') {
      const voter = await Voter.findById(req.user.voterId).populate('departmentId')
      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      const isFromSameDepartment = voter.departmentId._id.equals(election.departmentId._id)
      
      voterEligibility = {
        isFromSameDepartment,
        isRegistered: voter.isRegistered,
        isClassOfficer: voter.isClassOfficer,
        isPasswordActive: voter.isPasswordActive,
        voterDepartment: voter.departmentId.departmentCode,
        electionDepartment: election.departmentId.departmentCode
      }

      if (!voter.isRegistered || !voter.isPasswordActive) {
        canViewStatistics = false
        accessReason = "You must be a registered voter with an active password"
      } else if (!isFromSameDepartment) {
        canViewStatistics = false
        accessReason = `Statistics are only available to students from ${election.departmentId.departmentCode} department`
      } else {
        canViewStatistics = true
        accessReason = voter.isClassOfficer ? 
          "You can view statistics as a class officer from this department" :
          "You can view statistics as a student from this department"
      }

      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        voter,
        `Accessed departmental election statistics - ${election.title}: ${accessReason}`,
        req
      )
    } else {
      // Staff members can always view statistics
      canViewStatistics = true
      accessReason = "Staff access granted"
      
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Accessed departmental election statistics - ${election.title} (${election.deptElectionId})`,
        req
      )
    }

    if (!canViewStatistics) {
      const error = new Error(accessReason)
      error.statusCode = 403
      return next(error)
    }

    // Get statistics data
    const totalPositions = await Position.countDocuments({ deptElectionId: id })
    const totalCandidates = await Candidate.countDocuments({ deptElectionId: id })
    const participationStats = await ElectionParticipation.getElectionStats(id, 'departmental')

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
        $lookup: {
          from: "votes",
          localField: "_id",
          foreignField: "candidateId",
          as: "votes"
        }
      },
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
              voteCount: { $size: "$votes" }
            }
          },
          totalCandidates: { $sum: 1 },
          totalVotes: { $sum: { $size: "$votes" } }
        }
      },
      { $sort: { "_id.positionOrder": 1 } }
    ])

    // Voting timeline
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

    const overview = {
      totalPositions,
      totalCandidates,
      ...participationStats,
      status: election.status,
      electionDate: election.electionDate,
      department: election.departmentId
    }

    res.json({
      overview,
      candidatesByPosition,
      votingTimeline,
      voterEligibility,
      election: {
        id: election._id,
        title: election.title,
        deptElectionId: election.deptElectionId,
        department: election.departmentId,
        status: election.status
      },
      accessInfo: {
        canViewStatistics,
        accessReason,
        userRole: req.user?.role
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
        .populate("departmentId", "departmentCode degreeProgram college")
        .sort({ createdAt: -1 })
        .limit(5)

      // Elections by department
      const electionsByDepartment = await DepartmentalElection.aggregate([
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
              college: "$department.college"
            },
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
      ).populate([
        { path: "createdBy", select: "username" },
        { path: "departmentId", select: "departmentCode degreeProgram college" }
      ])

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
        `Departmental election status changed to ${status} - ${election.title} (${election.deptElectionId}) for ${election.departmentId.departmentCode}`,
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

  // Get candidates for voter view (with voting eligibility check) - departmental elections
  static async getCandidatesForVoter(req, res, next) {
  try {
    const { electionId } = req.params
    const voterId = req.user.voterId

    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      const error = new Error("Invalid election ID format")
      error.statusCode = 400
      return next(error)
    }

    // Get voter info
    const voter = await Voter.findById(voterId).populate('departmentId')
    if (!voter) {
      const error = new Error("Voter not found")
      error.statusCode = 404
      return next(error)
    }

    // Verify election exists
    const election = await DepartmentalElection.findById(electionId).populate('departmentId')
    if (!election) {
      const error = new Error("Departmental Election not found")
      error.statusCode = 404
      return next(error)
    }

    // Check eligibility
    const isFromSameDepartment = voter.departmentId._id.equals(election.departmentId._id)
    
    const voterEligibility = {
      canVote: false,
      canViewCandidates: false,
      isFromSameDepartment,
      isRegistered: voter.isRegistered,
      isClassOfficer: voter.isClassOfficer,
      isPasswordActive: voter.isPasswordActive,
      voterDepartment: voter.departmentId.departmentCode,
      electionDepartment: election.departmentId.departmentCode,
      message: ''
    }

    // Determine access levels
    if (!voter.isRegistered || !voter.isPasswordActive) {
      voterEligibility.message = "You must be a registered voter with an active password"
    } else if (!isFromSameDepartment) {
      voterEligibility.message = `This election is for ${election.departmentId.departmentCode} department. You belong to ${voter.departmentId.departmentCode} department.`
    } else {
      // Same department and registered
      voterEligibility.canViewCandidates = true
      
      if (voter.isClassOfficer) {
        voterEligibility.canVote = true
        voterEligibility.message = "You are eligible to vote in this departmental election as a class officer"
      } else {
        voterEligibility.message = "You can view candidates, but only class officers can vote in departmental elections"
      }
    }

    // Get candidates if voter can view them
    let candidates = []
    let candidatesByPosition = []
    
    if (voterEligibility.canViewCandidates) {
      candidates = await Candidate.find({ 
        deptElectionId: electionId,
        isActive: true 
      })
      .populate('voterId', 'schoolId firstName middleName lastName departmentId yearLevel')
      .populate('voterId.departmentId', 'departmentCode degreeProgram college')
      .populate('positionId', 'positionName positionOrder maxCandidates')
      .sort({ 'positionId.positionOrder': 1, candidateNumber: 1 })

      // Group candidates by position
      candidatesByPosition = candidates.reduce((acc, candidate) => {
        const positionId = candidate.positionId._id.toString()
        if (!acc[positionId]) {
          acc[positionId] = {
            position: candidate.positionId,
            candidates: []
          }
        }
        acc[positionId].candidates.push(candidate)
        return acc
      }, {})
    }

    await AuditLog.logVoterAction(
      "SYSTEM_ACCESS",
      voter,
      `Viewed candidates for Departmental election: ${election.title} - ${voterEligibility.message}`,
      req
    )

    res.json({
      election: {
        _id: election._id,
        title: election.title,
        deptElectionId: election.deptElectionId,
        department: election.departmentId,
        status: election.status,
        electionDate: election.electionDate,
        type: 'DEPARTMENTAL'
      },
      candidates: voterEligibility.canViewCandidates ? candidates : [],
      candidatesByPosition: voterEligibility.canViewCandidates ? Object.values(candidatesByPosition) : [],
      totalCandidates: voterEligibility.canViewCandidates ? candidates.length : 0,
      voterEligibility
    })
  } catch (error) {
    next(error)
  }
}

  static async getDepartmentalElectionOfficersCount(req, res, next) {
  try {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid election ID format")
      error.statusCode = 400
      return next(error)
    }

    // Get the departmental election with populated department info
    const election = await DepartmentalElection.findById(id).populate("departmentId")
    if (!election) {
      const error = new Error("Departmental election not found")
      error.statusCode = 404
      return next(error)
    }

    // Log the election details for debugging
    console.log(`[DEBUG] Counting officers for departmental election:`)
    console.log(`[DEBUG] - Election: ${election.title} (${election.deptElectionId})`)
    console.log(`[DEBUG] - Department: ${election.departmentId.departmentCode} - ${election.departmentId.degreeProgram}`)
    console.log(`[DEBUG] - Department ID: ${election.departmentId._id}`)

    // For departmental elections, count ALL voters from the department who are class officers
    // Relaxing the requirement for isRegistered and isPasswordActive for counting purposes
    // Since the actual voting eligibility is checked separately
    const officersQuery = {
      departmentId: election.departmentId._id,
      isClassOfficer: true,
      isActive: true
    }

    console.log(`[DEBUG] Query for officers:`, officersQuery)

    const officersCount = await Voter.countDocuments(officersQuery)

    console.log(`[DEBUG] Officers count result: ${officersCount}`)

    // Get detailed breakdown to understand the data
    const breakdown = {
      totalVotersInDepartment: await Voter.countDocuments({ 
        departmentId: election.departmentId._id 
      }),
      activeVotersInDepartment: await Voter.countDocuments({ 
        departmentId: election.departmentId._id, 
        isActive: true 
      }),
      totalClassOfficersInDepartment: await Voter.countDocuments({ 
        departmentId: election.departmentId._id,
        isClassOfficer: true 
      }),
      activeClassOfficersInDepartment: await Voter.countDocuments({ 
        departmentId: election.departmentId._id,
        isClassOfficer: true,
        isActive: true 
      }),
      registeredClassOfficersInDepartment: await Voter.countDocuments({ 
        departmentId: election.departmentId._id, 
        isActive: true, 
        isRegistered: true,
        isClassOfficer: true 
      }),
      eligibleToVoteClassOfficers: await Voter.countDocuments({ 
        departmentId: election.departmentId._id,
        isActive: true,
        isRegistered: true,
        isClassOfficer: true,
        isPasswordActive: true
      }),
      // Additional breakdowns
      inactiveClassOfficers: await Voter.countDocuments({ 
        departmentId: election.departmentId._id,
        isClassOfficer: true,
        isActive: false 
      }),
      unregisteredClassOfficers: await Voter.countDocuments({ 
        departmentId: election.departmentId._id,
        isClassOfficer: true,
        isActive: true,
        isRegistered: false 
      }),
      classOfficersWithInactivePassword: await Voter.countDocuments({ 
        departmentId: election.departmentId._id,
        isActive: true,
        isRegistered: true,
        isClassOfficer: true,
        isPasswordActive: false 
      })
    }

    console.log(`[DEBUG] Detailed department breakdown for ${election.departmentId.departmentCode}:`, breakdown)

    // Get sample class officers for inspection (if debugging needed)
    const sampleOfficers = await Voter.find({ 
      departmentId: election.departmentId._id,
      isClassOfficer: true 
    }).limit(5).select('schoolId firstName lastName isActive isRegistered isClassOfficer isPasswordActive')
    
    if (sampleOfficers.length > 0) {
      console.log(`[DEBUG] Sample class officers in ${election.departmentId.departmentCode}:`, sampleOfficers)
    } else {
      console.log(`[DEBUG] No class officers found in ${election.departmentId.departmentCode} department`)
      
      // Check if there are ANY voters in this department
      const anyVotersInDept = await Voter.find({ 
        departmentId: election.departmentId._id 
      }).limit(5).select('schoolId firstName lastName isActive isRegistered isClassOfficer')
      
      console.log(`[DEBUG] Sample voters in department (to verify department has voters):`, anyVotersInDept)
    }

    // Log the access for audit trail
    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Officers count accessed for departmental election - ${election.title} (${election.deptElectionId}) for ${election.departmentId.departmentCode}: ${officersCount} class officers found`,
      req
    )

    // Return the count along with election info
    res.json({
      election: {
        id: election._id,
        title: election.title,
        deptElectionId: election.deptElectionId,
        department: {
          _id: election.departmentId._id,
          departmentCode: election.departmentId.departmentCode,
          degreeProgram: election.departmentId.degreeProgram,
          college: election.departmentId.college
        }
      },
      officersCount, // This now shows ALL active class officers in the department
      breakdown,
      message: `${officersCount} active class officers found in ${election.departmentId.departmentCode} department`,
      eligibleToVote: breakdown.eligibleToVoteClassOfficers, // Shows how many can actually vote
      debugInfo: {
        queryUsed: officersQuery,
        departmentId: election.departmentId._id.toString(),
        sampleOfficersFound: sampleOfficers.length
      }
    })
  } catch (error) {
    console.error('Error in getDepartmentalElectionOfficersCount:', error)
    next(error)
  }
}

static async checkVoterEligibilityForDepartmentalElection(req, res, next) {
  try {
    const { id } = req.params
    const voterId = req.user.voterId

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid election ID format")
      error.statusCode = 400
      return next(error)
    }

    if (!voterId) {
      const error = new Error("Voter authentication required")
      error.statusCode = 401
      return next(error)
    }

    // Get voter info
    const voter = await Voter.findById(voterId).populate('departmentId')
    if (!voter) {
      const error = new Error("Voter not found")
      error.statusCode = 404
      return next(error)
    }

    // Get election info
    const election = await DepartmentalElection.findById(id).populate('departmentId')
    if (!election) {
      const error = new Error("Departmental election not found")
      error.statusCode = 404
      return next(error)
    }

    // Check department matching
    const isFromSameDepartment = voter.departmentId._id.equals(election.departmentId._id)
    
    // Determine eligibility
    const eligibility = {
      canVote: false,
      canViewResults: false,
      canViewStatistics: false,
      isFromSameDepartment,
      isRegistered: voter.isRegistered,
      isClassOfficer: voter.isClassOfficer,
      isPasswordActive: voter.isPasswordActive,
      voterDepartment: voter.departmentId.departmentCode,
      electionDepartment: election.departmentId.departmentCode,
      message: ''
    }

    if (!voter.isRegistered || !voter.isPasswordActive) {
      eligibility.message = "You must be a registered voter with an active password to participate in elections"
    } else if (!isFromSameDepartment) {
      eligibility.message = `This election is for ${election.departmentId.departmentCode} department. You belong to ${voter.departmentId.departmentCode} department.`
      // Cannot vote but also cannot view results/stats if from different department
    } else {
      // Same department
      eligibility.canViewResults = true
      eligibility.canViewStatistics = true
      
      if (voter.isClassOfficer) {
        eligibility.canVote = true
        eligibility.message = "You are eligible to vote in this departmental election as a class officer"
      } else {
        eligibility.message = "You can view results and statistics, but only class officers can vote in departmental elections"
      }
    }

    await AuditLog.logVoterAction(
      "SYSTEM_ACCESS",
      voter,
      `Checked eligibility for departmental election: ${election.title} - ${eligibility.message}`,
      req
    )

    res.json({
      election: {
        id: election._id,
        title: election.title,
        deptElectionId: election.deptElectionId,
        department: election.departmentId,
        status: election.status
      },
      eligibility
    })
  } catch (error) {
    next(error)
  }
}


}

module.exports = DepartmentalElectionController