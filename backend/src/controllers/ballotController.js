const Ballot = require("../models/Ballot")
const SSGElection = require("../models/SSGElection")
const DepartmentalElection = require("../models/DepartmentalElection")
const Voter = require("../models/Voter")
const Vote = require("../models/Vote")
const Candidate = require("../models/Candidate")
const Position = require("../models/Position")
const AuditLog = require("../models/AuditLog")
const crypto = require("crypto")

class BallotController {
  // NEW: Get all ballots (combined SSG and Departmental)
  static async getAllBallots(req, res, next) {
    try {
      const { page = 1, limit = 10, type = 'all', status, electionId } = req.query
      
      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      
      let ssgBallots = []
      let departmentalBallots = []
      
      // Get SSG ballots if requested
      if (type === 'all' || type === 'ssg') {
        const ssgQuery = { ssgElectionId: { $ne: null } }
        if (electionId) ssgQuery.ssgElectionId = electionId
        if (status === 'submitted') ssgQuery.isSubmitted = true
        if (status === 'pending') ssgQuery.isSubmitted = false

        ssgBallots = await Ballot.find(ssgQuery)
          .populate('ssgElectionId', 'title electionDate status')
          .populate('voterId', 'schoolId firstName lastName departmentId yearLevel')
          .populate('voterId.departmentId', 'departmentCode degreeProgram college')
          .sort({ createdAt: -1 })
          .lean()
      }
      
      // Get Departmental ballots if requested
      if (type === 'all' || type === 'departmental') {
        const deptQuery = { deptElectionId: { $ne: null } }
        if (electionId) deptQuery.deptElectionId = electionId
        if (status === 'submitted') deptQuery.isSubmitted = true
        if (status === 'pending') deptQuery.isSubmitted = false

        departmentalBallots = await Ballot.find(deptQuery)
          .populate('deptElectionId', 'title electionDate status departmentId')
          .populate('deptElectionId.departmentId', 'departmentCode degreeProgram college')
          .populate('voterId', 'schoolId firstName lastName departmentId yearLevel')
          .populate('voterId.departmentId', 'departmentCode degreeProgram college')
          .populate('currentPositionId', 'positionName positionOrder')
          .sort({ createdAt: -1 })
          .lean()
      }

      // Combine and mark ballot types
      const allBallots = [
        ...ssgBallots.map(ballot => ({ ...ballot, ballotType: 'SSG' })),
        ...departmentalBallots.map(ballot => ({ ...ballot, ballotType: 'Departmental' }))
      ]

      // Sort combined results by creation date
      allBallots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      // Apply pagination
      const startIndex = (pageNum - 1) * limitNum
      const endIndex = startIndex + limitNum
      const paginatedBallots = allBallots.slice(startIndex, endIndex)

      const totalPages = Math.ceil(allBallots.length / limitNum)

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Retrieved ${paginatedBallots.length} combined ballots (type: ${type})`,
        req
      )

      res.json({
        ballots: paginatedBallots,
        totalPages,
        currentPage: pageNum,
        total: allBallots.length,
        totalSSG: ssgBallots.length,
        totalDepartmental: departmentalBallots.length
      })
    } catch (error) {
      next(error)
    }
  }

  // NEW: Get combined ballot statistics
  static async getBallotStatistics(req, res, next) {
    try {
      const { type = 'all', electionId } = req.query

      let stats = {
        totalBallots: 0,
        submittedBallots: 0,
        pendingBallots: 0,
        turnoutRate: 0,
        ssgStats: null,
        departmentalStats: null
      }

      // Get SSG statistics
      if (type === 'all' || type === 'ssg') {
        const ssgQuery = { ssgElectionId: { $ne: null } }
        if (electionId) ssgQuery.ssgElectionId = electionId

        const ssgTotal = await Ballot.countDocuments(ssgQuery)
        const ssgSubmitted = await Ballot.countDocuments({ ...ssgQuery, isSubmitted: true })
        const ssgPending = ssgTotal - ssgSubmitted

        stats.ssgStats = {
          totalBallots: ssgTotal,
          submittedBallots: ssgSubmitted,
          pendingBallots: ssgPending,
          turnoutRate: ssgTotal > 0 ? Math.round((ssgSubmitted / ssgTotal) * 100) : 0
        }

        if (type === 'ssg') {
          stats.totalBallots = ssgTotal
          stats.submittedBallots = ssgSubmitted
          stats.pendingBallots = ssgPending
          stats.turnoutRate = stats.ssgStats.turnoutRate
        }
      }

      // Get Departmental statistics
      if (type === 'all' || type === 'departmental') {
        const deptQuery = { deptElectionId: { $ne: null } }
        if (electionId) deptQuery.deptElectionId = electionId

        const deptTotal = await Ballot.countDocuments(deptQuery)
        const deptSubmitted = await Ballot.countDocuments({ ...deptQuery, isSubmitted: true })
        const deptPending = deptTotal - deptSubmitted

        stats.departmentalStats = {
          totalBallots: deptTotal,
          submittedBallots: deptSubmitted,
          pendingBallots: deptPending,
          turnoutRate: deptTotal > 0 ? Math.round((deptSubmitted / deptTotal) * 100) : 0
        }

        if (type === 'departmental') {
          stats.totalBallots = deptTotal
          stats.submittedBallots = deptSubmitted
          stats.pendingBallots = deptPending
          stats.turnoutRate = stats.departmentalStats.turnoutRate
        }
      }

      // Combine statistics if type is 'all'
      if (type === 'all' && stats.ssgStats && stats.departmentalStats) {
        stats.totalBallots = stats.ssgStats.totalBallots + stats.departmentalStats.totalBallots
        stats.submittedBallots = stats.ssgStats.submittedBallots + stats.departmentalStats.submittedBallots
        stats.pendingBallots = stats.ssgStats.pendingBallots + stats.departmentalStats.pendingBallots
        stats.turnoutRate = stats.totalBallots > 0 ? Math.round((stats.submittedBallots / stats.totalBallots) * 100) : 0
      }

      // Get ballot counts by election type for dashboard
      const ballotsByType = await Ballot.aggregate([
        {
          $group: {
            _id: null,
            ssgBallots: {
              $sum: { $cond: [{ $ne: ['$ssgElectionId', null] }, 1, 0] }
            },
            departmentalBallots: {
              $sum: { $cond: [{ $ne: ['$deptElectionId', null] }, 1, 0] }
            },
            ssgSubmitted: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ['$ssgElectionId', null] }, '$isSubmitted'] },
                  1,
                  0
                ]
              }
            },
            departmentalSubmitted: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ['$deptElectionId', null] }, '$isSubmitted'] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Retrieved combined ballot statistics (type: ${type})`,
        req
      )

      res.json({
        ...stats,
        breakdown: ballotsByType[0] || {
          ssgBallots: 0,
          departmentalBallots: 0,
          ssgSubmitted: 0,
          departmentalSubmitted: 0
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // NEW: Check and process expired ballots
  static async checkExpiredBallots(req, res, next) {
    try {
      const result = await Ballot.cleanupExpiredBallots()
      
      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Processed ${result.expiredBallots} expired ballots, deleted ${result.deletedBallots} ballots`,
        req
      )

      res.json({
        message: "Expired ballots processed successfully",
        expiredBallots: result.expiredBallots,
        deletedBallots: result.deletedBallots
      })
    } catch (error) {
      next(error)
    }
  }

  // NEW: Get ballot timeout status
  static async getBallotTimeoutStatus(req, res, next) {
    try {
      const { ballotId } = req.params
      
      const ballot = await Ballot.findById(ballotId)
      if (!ballot) {
        return res.status(404).json({ message: "Ballot not found" })
      }

      // Check authorization - voters can only see their own ballots
      if (req.user.userType === 'voter' && ballot.voterId.toString() !== req.user.voterId) {
        return res.status(403).json({ message: "Access denied" })
      }

      const now = new Date()
      const timeoutStatus = {
        ballotId: ballot._id,
        timerStarted: ballot.timerStarted,
        timerStartedAt: ballot.timerStartedAt,
        ballotOpenTime: ballot.ballotOpenTime,
        ballotCloseTime: ballot.ballotCloseTime,
        ballotDuration: ballot.ballotDuration,
        isExpired: ballot.isExpired,
        timeRemaining: ballot.timeRemaining,
        remainingTimeSeconds: ballot.ballotCloseTime ? Math.max(0, Math.floor((ballot.ballotCloseTime - now) / 1000)) : 0,
        ballotStatus: ballot.ballotStatus
      }

      res.json(timeoutStatus)
    } catch (error) {
      next(error)
    }
  }

  // NEW: Extend ballot timeout
  static async extendBallotTimeout(req, res, next) {
    try {
      const { ballotId } = req.params
      const { additionalMinutes = 15 } = req.body
      
      const ballot = await Ballot.findById(ballotId)
      if (!ballot) {
        return res.status(404).json({ message: "Ballot not found" })
      }

      if (ballot.isSubmitted) {
        return res.status(400).json({ message: "Cannot extend timeout for submitted ballot" })
      }

      if (!ballot.timerStarted) {
        return res.status(400).json({ message: "Cannot extend timeout for ballot with timer not started" })
      }

      await ballot.extendTimer(additionalMinutes)

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Extended ballot ${ballotId} timeout by ${additionalMinutes} minutes`,
        req
      )

      res.json({
        message: `Ballot timeout extended by ${additionalMinutes} minutes`,
        newCloseTime: ballot.ballotCloseTime,
        newDuration: ballot.ballotDuration
      })
    } catch (error) {
      next(error)
    }
  }

  // Get all SSG ballots (Committee only)
  static async getSSGBallots(req, res, next) {
    try {
      const { page = 1, limit = 10, electionId, status } = req.query
      
      const query = { ssgElectionId: { $ne: null } }
      if (electionId) query.ssgElectionId = electionId
      if (status === 'submitted') query.isSubmitted = true
      if (status === 'pending') query.isSubmitted = false

      const ballots = await Ballot.find(query)
        .populate('ssgElectionId', 'title electionDate status')
        .populate('voterId', 'schoolId firstName lastName departmentId yearLevel')
        .populate('voterId.departmentId', 'departmentCode degreeProgram college')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)

      const total = await Ballot.countDocuments(query)

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Retrieved ${ballots.length} SSG ballots`,
        req
      )

      res.json({
        ballots,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      })
    } catch (error) {
      next(error)
    }
  }

  // Get all Departmental ballots (Committee only)
  static async getDepartmentalBallots(req, res, next) {
    try {
      const { page = 1, limit = 10, electionId, status, positionId } = req.query
      
      const query = { deptElectionId: { $ne: null } }
      if (electionId) query.deptElectionId = electionId
      if (status === 'submitted') query.isSubmitted = true
      if (status === 'pending') query.isSubmitted = false
      if (positionId) query.currentPositionId = positionId

      const ballots = await Ballot.find(query)
        .populate('deptElectionId', 'title electionDate status departmentId')
        .populate('deptElectionId.departmentId', 'departmentCode degreeProgram college')
        .populate('voterId', 'schoolId firstName lastName departmentId yearLevel')
        .populate('voterId.departmentId', 'departmentCode degreeProgram college')
        .populate('currentPositionId', 'positionName positionOrder')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)

      const total = await Ballot.countDocuments(query)

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Retrieved ${ballots.length} Departmental ballots`,
        req
      )

      res.json({
        ballots,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      })
    } catch (error) {
      next(error)
    }
  }

  // Get ballot by ID
  static async getBallotById(req, res, next) {
    try {
      const { id } = req.params
      
      const ballot = await Ballot.findById(id)
        .populate('ssgElectionId', 'title electionDate status')
        .populate('deptElectionId', 'title electionDate status departmentId')
        .populate('deptElectionId.departmentId', 'departmentCode degreeProgram college')
        .populate('voterId', 'schoolId firstName lastName departmentId yearLevel email')
        .populate('voterId.departmentId', 'departmentCode degreeProgram college')
        .populate('currentPositionId', 'positionName positionOrder')

      if (!ballot) {
        return res.status(404).json({ message: "Ballot not found" })
      }

      // Check authorization - voters can only see their own ballots
      if (req.user.userType === 'voter' && ballot.voterId.toString() !== req.user.voterId) {
        await AuditLog.logVoterAction(
          "UNAUTHORIZED_ACCESS_ATTEMPT",
          { _id: req.user.voterId, schoolId: req.user.schoolId },
          `Attempted to access ballot ${id} belonging to another voter`,
          req
        )
        return res.status(403).json({ message: "Access denied" })
      }

      const actionType = req.user.userType === 'voter' ? "BALLOT_ACCESSED" : "DATA_EXPORT"
      await AuditLog.logAction({
        action: actionType,
        username: req.user.username || req.user.schoolId?.toString(),
        userId: req.user.userId,
        voterId: req.user.voterId,
        schoolId: req.user.schoolId,
        details: `Accessed ballot ${id}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      })

      res.json(ballot)
    } catch (error) {
      next(error)
    }
  }

  // Delete SSG ballot (Admin only)
  static async deleteSSGBallot(req, res, next) {
    try {
      const { id } = req.params

      const ballot = await Ballot.findById(id)
        .populate('ssgElectionId', 'title')
        .populate('voterId', 'schoolId firstName lastName')

      if (!ballot || !ballot.ssgElectionId) {
        return res.status(404).json({ message: "SSG Ballot not found" })
      }

      // Delete associated votes first
      const voteCount = await Vote.countDocuments({ ballotId: ballot._id })
      await Vote.deleteMany({ ballotId: ballot._id })

      // Delete ballot
      await Ballot.findByIdAndDelete(ballot._id)

      await AuditLog.logUserAction(
        "DELETE_BALLOT",
        req.user,
        `Deleted SSG ballot ${id} for voter ${ballot.voterId.schoolId} in election ${ballot.ssgElectionId.title}. Removed ${voteCount} votes.`,
        req
      )

      res.json({ 
        message: "SSG Ballot deleted successfully",
        deletedVotes: voteCount
      })
    } catch (error) {
      next(error)
    }
  }

  // Delete Departmental ballot (Admin only)
  static async deleteDepartmentalBallot(req, res, next) {
    try {
      const { id } = req.params

      const ballot = await Ballot.findById(id)
        .populate('deptElectionId', 'title')
        .populate('voterId', 'schoolId firstName lastName')
        .populate('currentPositionId', 'positionName')

      if (!ballot || !ballot.deptElectionId) {
        return res.status(404).json({ message: "Departmental Ballot not found" })
      }

      // Delete associated votes first
      const voteCount = await Vote.countDocuments({ ballotId: ballot._id })
      await Vote.deleteMany({ ballotId: ballot._id })

      // Delete ballot
      await Ballot.findByIdAndDelete(ballot._id)

      await AuditLog.logUserAction(
        "DELETE_BALLOT",
        req.user,
        `Deleted Departmental ballot ${id} for voter ${ballot.voterId.schoolId}, position ${ballot.currentPositionId?.positionName} in election ${ballot.deptElectionId.title}. Removed ${voteCount} votes.`,
        req
      )

      res.json({ 
        message: "Departmental Ballot deleted successfully",
        deletedVotes: voteCount
      })
    } catch (error) {
      next(error)
    }
  }

  // Start SSG ballot (Registered voters only)
  static async startSSGBallot(req, res, next) {
    try {
      const { electionId } = req.body
      const voterId = req.user.voterId

      // Validate election exists and is active
      const election = await SSGElection.findById(electionId)
      if (!election) {
        return res.status(404).json({ message: "SSG Election not found" })
      }

      if (election.status !== 'active') {
        return res.status(400).json({ message: "SSG Election is not active" })
      }

      // Check if voter already has a ballot for this election
      const existingBallot = await Ballot.findOne({ ssgElectionId: electionId, voterId })
      if (existingBallot) {
        if (existingBallot.isSubmitted) {
          return res.status(400).json({ message: "You have already voted in this SSG election" })
        }
        // Return existing unsubmitted ballot
        return res.json({ 
          message: "Continuing existing SSG ballot",
          ballot: existingBallot 
        })
      }

      // Verify voter is registered
      const voter = await Voter.findById(voterId).populate('departmentId')
      if (!voter || !voter.isRegistered || !voter.isPasswordActive) {
        return res.status(400).json({ message: "Only registered voters can participate in SSG elections" })
      }

      // Create new ballot with unique token
      const ballotToken = crypto.randomBytes(32).toString('hex')
      
      const ballot = new Ballot({
        ssgElectionId: electionId,
        voterId,
        ballotToken,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      })

      await ballot.save()

      await AuditLog.logVoterAction(
        "BALLOT_STARTED",
        voter,
        `Started new SSG ballot for election: ${election.title}`,
        req
      )

      res.status(201).json({
        message: "SSG Ballot started successfully",
        ballot: {
          _id: ballot._id,
          ssgElectionId: ballot.ssgElectionId,
          ballotToken: ballot.ballotToken,
          createdAt: ballot.createdAt
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // NEW: Start SSG ballot with timeout
  static async startSSGBallotWithTimeout(req, res, next) {
    try {
      const { electionId } = req.body
      const voterId = req.user.voterId

      // Validate election exists and is active
      const election = await SSGElection.findById(electionId)
      if (!election) {
        return res.status(404).json({ message: "SSG Election not found" })
      }

      if (election.status !== 'active') {
        return res.status(400).json({ message: "SSG Election is not active" })
      }

      // Check if voter already has a ballot for this election
      const existingBallot = await Ballot.findOne({ ssgElectionId: electionId, voterId })
      if (existingBallot) {
        if (existingBallot.isSubmitted) {
          return res.status(400).json({ message: "You have already voted in this SSG election" })
        }
        
        // Start timer if not already started
        if (!existingBallot.timerStarted) {
          await existingBallot.startTimer()
        }

        return res.json({ 
          message: "Continuing existing SSG ballot with timer",
          ballot: existingBallot 
        })
      }

      // Verify voter is registered
      const voter = await Voter.findById(voterId).populate('departmentId')
      if (!voter || !voter.isRegistered || !voter.isPasswordActive) {
        return res.status(400).json({ message: "Only registered voters can participate in SSG elections" })
      }

      // Create new ballot with unique token and start timer
      const ballotToken = crypto.randomBytes(32).toString('hex')
      
      const ballot = new Ballot({
        ssgElectionId: electionId,
        voterId,
        ballotToken,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      })

      await ballot.save()
      await ballot.startTimer() // Start the timer

      await AuditLog.logVoterAction(
        "BALLOT_STARTED",
        voter,
        `Started new SSG ballot with timer for election: ${election.title}`,
        req
      )

      res.status(201).json({
        message: "SSG Ballot started successfully with timer",
        ballot: {
          _id: ballot._id,
          ssgElectionId: ballot.ssgElectionId,
          ballotToken: ballot.ballotToken,
          ballotOpenTime: ballot.ballotOpenTime,
          ballotCloseTime: ballot.ballotCloseTime,
          ballotDuration: ballot.ballotDuration,
          createdAt: ballot.createdAt
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Start Departmental ballot (Registered voters and class officers only)
  static async startDepartmentalBallot(req, res, next) {
    try {
      const { electionId, positionId } = req.body
      const voterId = req.user.voterId

      const election = await DepartmentalElection.findById(electionId)
        .populate('departmentId')
      if (!election) {
        return res.status(404).json({ message: "Departmental Election not found" })
      }

      if (election.status !== 'active') {
        return res.status(400).json({ message: "Departmental Election is not active" })
      }

      // Validate position exists and belongs to this election
      const position = await Position.findOne({ 
        _id: positionId, 
        deptElectionId: electionId,
        isActive: true 
      })
      if (!position) {
        return res.status(404).json({ message: "Position not found or not active" })
      }

      // Check if voter already has a ballot for this election and position
      const existingBallot = await Ballot.findOne({ 
        deptElectionId: electionId, 
        voterId,
        currentPositionId: positionId 
      })
      if (existingBallot) {
        if (existingBallot.isSubmitted) {
          return res.status(400).json({ message: `You have already voted for ${position.positionName}` })
        }
        // Return existing unsubmitted ballot
        return res.json({ 
          message: `Continuing existing ballot for ${position.positionName}`,
          ballot: existingBallot 
        })
      }

      // Verify voter is registered and is a class officer
      const voter = await Voter.findById(voterId).populate('departmentId')
      if (!voter || !voter.isRegistered || !voter.isPasswordActive) {
        return res.status(400).json({ message: "Only registered voters can participate in departmental elections" })
      }

      if (!voter.isClassOfficer) {
        return res.status(403).json({ message: "Only class officers can vote in departmental elections" })
      }

      // Check if voter's department matches election department
      if (voter.departmentId.college !== election.departmentId.college) {
        return res.status(403).json({ message: "You can only vote in your department's elections" })
      }

      // Create new ballot with unique token
      const ballotToken = crypto.randomBytes(32).toString('hex')
      
      const ballot = new Ballot({
        deptElectionId: electionId,
        voterId,
        currentPositionId: positionId,
        ballotToken,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      })

      await ballot.save()

      await AuditLog.logVoterAction(
        "BALLOT_STARTED",
        voter,
        `Started new Departmental ballot for position: ${position.positionName} in election: ${election.title}`,
        req
      )

      res.status(201).json({
        message: `Departmental Ballot started successfully for ${position.positionName}`,
        ballot: {
          _id: ballot._id,
          deptElectionId: ballot.deptElectionId,
          currentPositionId: ballot.currentPositionId,
          ballotToken: ballot.ballotToken,
          createdAt: ballot.createdAt
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Submit SSG ballot (Voters only)
  static async submitSSGBallot(req, res, next) {
    try {
      const { id } = req.params
      const voterId = req.user.voterId

      const ballot = await Ballot.findById(id)
        .populate('ssgElectionId', 'title')
        .populate('voterId', 'schoolId firstName lastName')

      if (!ballot || !ballot.ssgElectionId) {
        return res.status(404).json({ message: "SSG Ballot not found" })
      }

      // Check ownership
      if (ballot.voterId._id.toString() !== voterId) {
        await AuditLog.logVoterAction(
          "UNAUTHORIZED_ACCESS_ATTEMPT",
          { _id: voterId, schoolId: req.user.schoolId },
          `Attempted to submit SSG ballot ${id} belonging to another voter`,
          req
        )
        return res.status(403).json({ message: "Access denied" })
      }

      if (ballot.isSubmitted) {
        return res.status(400).json({ message: "SSG Ballot has already been submitted" })
      }

      // Check if ballot is expired
      if (ballot.isExpired) {
        return res.status(400).json({ message: "Ballot has expired and cannot be submitted" })
      }

      // Verify ballot has votes
      const voteCount = await Vote.countDocuments({ ballotId: ballot._id })
      if (voteCount === 0) {
        return res.status(400).json({ message: "Cannot submit empty ballot" })
      }

      // Submit ballot
      ballot.isSubmitted = true
      ballot.submittedAt = new Date()
      await ballot.save()

      await AuditLog.logVoterAction(
        "VOTE_SUBMITTED",
        ballot.voterId,
        `Submitted SSG ballot with ${voteCount} votes for election: ${ballot.ssgElectionId.title}`,
        req
      )

      res.json({
        message: "SSG Ballot submitted successfully",
        submittedAt: ballot.submittedAt,
        voteCount
      })
    } catch (error) {
      next(error)
    }
  }

  // Submit Departmental ballot (Voters only)
  static async submitDepartmentalBallot(req, res, next) {
    try {
      const { id } = req.params
      const voterId = req.user.voterId

      const ballot = await Ballot.findById(id)
        .populate('deptElectionId', 'title')
        .populate('voterId', 'schoolId firstName lastName')
        .populate('currentPositionId', 'positionName')

      if (!ballot || !ballot.deptElectionId) {
        return res.status(404).json({ message: "Departmental Ballot not found" })
      }

      // Check ownership
      if (ballot.voterId._id.toString() !== voterId) {
        await AuditLog.logVoterAction(
          "UNAUTHORIZED_ACCESS_ATTEMPT",
          { _id: voterId, schoolId: req.user.schoolId },
          `Attempted to submit Departmental ballot ${id} belonging to another voter`,
          req
        )
        return res.status(403).json({ message: "Access denied" })
      }

      if (ballot.isSubmitted) {
        return res.status(400).json({ message: "Departmental Ballot has already been submitted" })
      }

      // Check if ballot is expired
      if (ballot.isExpired) {
        return res.status(400).json({ message: "Ballot has expired and cannot be submitted" })
      }

      // Verify ballot has votes
      const voteCount = await Vote.countDocuments({ ballotId: ballot._id })
      if (voteCount === 0) {
        return res.status(400).json({ message: "Cannot submit empty ballot" })
      }

      // Submit ballot
      ballot.isSubmitted = true
      ballot.submittedAt = new Date()
      await ballot.save()

      await AuditLog.logVoterAction(
        "VOTE_SUBMITTED",
        ballot.voterId,
        `Submitted Departmental ballot with ${voteCount} votes for position: ${ballot.currentPositionId?.positionName} in election: ${ballot.deptElectionId.title}`,
        req
      )

      res.json({
        message: "Departmental Ballot submitted successfully",
        submittedAt: ballot.submittedAt,
        voteCount,
        position: ballot.currentPositionId?.positionName
      })
    } catch (error) {
      next(error)
    }
  }

  // Abandon SSG ballot (Voters only)
  static async abandonSSGBallot(req, res, next) {
    try {
      const { id } = req.params
      const voterId = req.user.voterId

      const ballot = await Ballot.findById(id)
        .populate('ssgElectionId', 'title')
        .populate('voterId', 'schoolId firstName lastName')

      if (!ballot || !ballot.ssgElectionId) {
        return res.status(404).json({ message: "SSG Ballot not found" })
      }

      // Check ownership
      if (ballot.voterId._id.toString() !== voterId) {
        return res.status(403).json({ message: "Access denied" })
      }

      if (ballot.isSubmitted) {
        return res.status(400).json({ message: "Cannot abandon submitted SSG ballot" })
      }

      // Delete associated votes
      const voteCount = await Vote.countDocuments({ ballotId: ballot._id })
      await Vote.deleteMany({ ballotId: ballot._id })

      // Delete ballot
      await Ballot.findByIdAndDelete(ballot._id)

      await AuditLog.logVoterAction(
        "BALLOT_ABANDONED",
        ballot.voterId,
        `Abandoned SSG ballot with ${voteCount} votes for election: ${ballot.ssgElectionId.title}`,
        req
      )

      res.json({ 
        message: "SSG Ballot abandoned successfully",
        abandonedVotes: voteCount
      })
    } catch (error) {
      next(error)
    }
  }

  // Abandon Departmental ballot (Voters only)
  static async abandonDepartmentalBallot(req, res, next) {
    try {
      const { id } = req.params
      const voterId = req.user.voterId

      const ballot = await Ballot.findById(id)
        .populate('deptElectionId', 'title')
        .populate('voterId', 'schoolId firstName lastName')
        .populate('currentPositionId', 'positionName')

      if (!ballot || !ballot.deptElectionId) {
        return res.status(404).json({ message: "Departmental Ballot not found" })
      }

      // Check ownership
      if (ballot.voterId._id.toString() !== voterId) {
        return res.status(403).json({ message: "Access denied" })
      }

      if (ballot.isSubmitted) {
        return res.status(400).json({ message: "Cannot abandon submitted Departmental ballot" })
      }

      // Delete associated votes
      const voteCount = await Vote.countDocuments({ ballotId: ballot._id })
      await Vote.deleteMany({ ballotId: ballot._id })

      // Delete ballot
      await Ballot.findByIdAndDelete(ballot._id)

      await AuditLog.logVoterAction(
        "BALLOT_ABANDONED",
        ballot.voterId,
        `Abandoned Departmental ballot with ${voteCount} votes for position: ${ballot.currentPositionId?.positionName} in election: ${ballot.deptElectionId.title}`,
        req
      )

      res.json({ 
        message: "Departmental Ballot abandoned successfully",
        abandonedVotes: voteCount,
        position: ballot.currentPositionId?.positionName
      })
    } catch (error) {
      next(error)
    }
  }

  // Get voter's SSG ballot status for election
  static async getVoterSSGBallotStatus(req, res, next) {
    try {
      const { electionId } = req.params
      const voterId = req.user.voterId

      // Get voter info to check eligibility
      const voter = await Voter.findById(voterId).populate('departmentId')
      if (!voter) {
        return res.status(404).json({ message: "Voter not found" })
      }

      const canVote = voter.isRegistered && voter.isPasswordActive

      const ballot = await Ballot.findOne({ ssgElectionId: electionId, voterId })
        .populate('ssgElectionId', 'title status electionDate')

      await AuditLog.logVoterAction(
        "DATA_EXPORT",
        voter,
        `Checked SSG ballot status for election: ${electionId}`,
        req
      )

      if (!ballot) {
        return res.json({ 
          hasVoted: false, 
          canVote: canVote,
          ballot: null,
          voterEligibility: {
            isRegistered: voter.isRegistered,
            isPasswordActive: voter.isPasswordActive,
            message: canVote ? "You are eligible to vote in SSG elections" : "You must be a registered voter with an active password to participate in SSG elections"
          }
        })
      }

      res.json({
        hasVoted: ballot.isSubmitted,
        canVote: !ballot.isSubmitted && canVote && !ballot.isExpired,
        ballot: {
          _id: ballot._id,
          isSubmitted: ballot.isSubmitted,
          submittedAt: ballot.submittedAt,
          createdAt: ballot.createdAt,
          timerStarted: ballot.timerStarted,
          ballotOpenTime: ballot.ballotOpenTime,
          ballotCloseTime: ballot.ballotCloseTime,
          isExpired: ballot.isExpired,
          timeRemaining: ballot.timeRemaining,
          ballotStatus: ballot.ballotStatus
        },
        voterEligibility: {
          isRegistered: voter.isRegistered,
          isPasswordActive: voter.isPasswordActive,
          message: canVote ? "You are eligible to vote in SSG elections" : "You must be a registered voter with an active password to participate in SSG elections"
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get voter's Departmental ballot status for election
  static async getVoterDepartmentalBallotStatus(req, res, next) {
    try {
      const { electionId, positionId } = req.params
      const voterId = req.user.voterId

      // Get voter info to check eligibility
      const voter = await Voter.findById(voterId).populate('departmentId')
      if (!voter) {
        return res.status(404).json({ message: "Voter not found" })
      }

      // Get election info
      const election = await DepartmentalElection.findById(electionId)
        .populate('departmentId')
      if (!election) {
        return res.status(404).json({ message: "Departmental Election not found" })
      }

      const canVote = voter.isRegistered && voter.isPasswordActive && voter.isClassOfficer &&
                     voter.departmentId.college === election.departmentId.college

      const query = { deptElectionId: electionId, voterId }
      if (positionId) query.currentPositionId = positionId

      const ballot = await Ballot.findOne(query)
        .populate('deptElectionId', 'title status electionDate')
        .populate('currentPositionId', 'positionName positionOrder')

      await AuditLog.logVoterAction(
        "DATA_EXPORT",
        voter,
        `Checked Departmental ballot status for election: ${electionId}${positionId ? `, position: ${positionId}` : ''}`,
        req
      )

      if (!ballot) {
        return res.json({ 
          hasVoted: false, 
          canVote: canVote,
          ballot: null,
          voterEligibility: {
            isRegistered: voter.isRegistered,
            isPasswordActive: voter.isPasswordActive,
            isClassOfficer: voter.isClassOfficer,
            departmentMatch: voter.departmentId.college === election.departmentId.college,
            message: canVote ? 
              "You are eligible to vote in departmental elections" : 
              "Only registered class officers from this department can vote in departmental elections"
          }
        })
      }

      res.json({
        hasVoted: ballot.isSubmitted,
        canVote: !ballot.isSubmitted && canVote && !ballot.isExpired,
        ballot: {
          _id: ballot._id,
          currentPositionId: ballot.currentPositionId,
          positionName: ballot.currentPositionId?.positionName,
          isSubmitted: ballot.isSubmitted,
          submittedAt: ballot.submittedAt,
          createdAt: ballot.createdAt,
          timerStarted: ballot.timerStarted,
          ballotOpenTime: ballot.ballotOpenTime,
          ballotCloseTime: ballot.ballotCloseTime,
          isExpired: ballot.isExpired,
          timeRemaining: ballot.timeRemaining,
          ballotStatus: ballot.ballotStatus
        },
        voterEligibility: {
          isRegistered: voter.isRegistered,
          isPasswordActive: voter.isPasswordActive,
          isClassOfficer: voter.isClassOfficer,
          departmentMatch: voter.departmentId.college === election.departmentId.college,
          message: canVote ? 
            "You are eligible to vote in departmental elections" : 
            "Only registered class officers from this department can vote in departmental elections"
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get available positions for departmental voting
  static async getAvailablePositionsForVoting(req, res, next) {
    try {
      const { electionId } = req.params
      const voterId = req.user.voterId

      // Verify election exists
      const election = await DepartmentalElection.findById(electionId)
        .populate('departmentId')
      if (!election) {
        return res.status(404).json({ message: "Departmental Election not found" })
      }

      // Get all positions for this election
      const positions = await Position.find({
        deptElectionId: electionId,
        isActive: true
      }).sort({ positionOrder: 1 })

      // Get positions voter has already voted for
      const votedPositions = await Ballot.find({
        deptElectionId: electionId,
        voterId,
        isSubmitted: true
      }).distinct('currentPositionId')

      // Filter available positions
      const availablePositions = positions.filter(
        position => !votedPositions.some(voted => voted.toString() === position._id.toString())
      )

      await AuditLog.logVoterAction(
        "DATA_EXPORT",
        { _id: voterId, schoolId: req.user.schoolId },
        `Retrieved available positions for departmental election: ${election.title}`,
        req
      )

      res.json({
        election: {
          _id: election._id,
          title: election.title,
          status: election.status
        },
        totalPositions: positions.length,
        votedPositions: votedPositions.length,
        availablePositions: availablePositions.map(pos => ({
          _id: pos._id,
          positionName: pos.positionName,
          positionOrder: pos.positionOrder,
          maxVotes: pos.maxVotes
        })),
        isComplete: availablePositions.length === 0
      })
    } catch (error) {
      next(error)
    }
  }

  // Get next available position for departmental voting
  static async getNextPositionForVoting(req, res, next) {
    try {
      const { electionId } = req.params
      const voterId = req.user.voterId

      // Get voted positions
      const votedPositions = await Ballot.find({
        deptElectionId: electionId,
        voterId,
        isSubmitted: true
      }).distinct('currentPositionId')

      // Get next available position
      const nextPosition = await Position.findOne({
        deptElectionId: electionId,
        isActive: true,
        _id: { $nin: votedPositions }
      }).sort({ positionOrder: 1 })

      if (!nextPosition) {
        return res.json({
          nextPosition: null,
          message: "All positions have been voted for"
        })
      }

      res.json({
        nextPosition: {
          _id: nextPosition._id,
          positionName: nextPosition.positionName,
          positionOrder: nextPosition.positionOrder,
          maxVotes: nextPosition.maxVotes
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get SSG ballot with votes (for review before submission)
  static async getSSGBallotWithVotes(req, res, next) {
    try {
      const { id } = req.params
      const voterId = req.user.voterId

      const ballot = await Ballot.findById(id)
        .populate('ssgElectionId', 'title electionDate')

      if (!ballot || !ballot.ssgElectionId) {
        return res.status(404).json({ message: "SSG Ballot not found" })
      }

      // Check ownership
      if (ballot.voterId.toString() !== voterId) {
        return res.status(403).json({ message: "Access denied" })
      }

      // Get votes with candidate and position details
      const votes = await Vote.find({ ballotId: ballot._id })
        .populate({
          path: 'candidateId',
          populate: [
            { path: 'voterId', select: 'firstName lastName schoolId' },
            { path: 'partylistId', select: 'partylistName' }
          ]
        })
        .populate('positionId', 'positionName positionOrder')
        .sort({ 'positionId.positionOrder': 1 })

      await AuditLog.logVoterAction(
        "BALLOT_ACCESSED",
        { _id: voterId, schoolId: req.user.schoolId },
        `Reviewed SSG ballot ${id} with ${votes.length} votes`,
        req
      )

      res.json({
        ballot,
        votes: votes.map(vote => ({
          position: vote.positionId.positionName,
          candidate: {
            name: `${vote.candidateId.voterId.firstName} ${vote.candidateId.voterId.lastName}`,
            schoolId: vote.candidateId.voterId.schoolId,
            partylist: vote.candidateId.partylistId?.partylistName || 'Independent',
            candidateNumber: vote.candidateId.candidateNumber
          }
        }))
      })
    } catch (error) {
      next(error)
    }
  }

  // Get Departmental ballot with votes (for review before submission)
  static async getDepartmentalBallotWithVotes(req, res, next) {
    try {
      const { id } = req.params
      const voterId = req.user.voterId

      const ballot = await Ballot.findById(id)
        .populate('deptElectionId', 'title electionDate')
        .populate('currentPositionId', 'positionName')

      if (!ballot || !ballot.deptElectionId) {
        return res.status(404).json({ message: "Departmental Ballot not found" })
      }

      // Check ownership
      if (ballot.voterId.toString() !== voterId) {
        return res.status(403).json({ message: "Access denied" })
      }

      // Get votes with candidate and position details
      const votes = await Vote.find({ ballotId: ballot._id })
        .populate({
          path: 'candidateId',
          populate: [
            { path: 'voterId', select: 'firstName lastName schoolId' }
          ]
        })
        .populate('positionId', 'positionName positionOrder')
        .sort({ 'positionId.positionOrder': 1 })

      await AuditLog.logVoterAction(
        "BALLOT_ACCESSED",
        { _id: voterId, schoolId: req.user.schoolId },
        `Reviewed Departmental ballot ${id} for position ${ballot.currentPositionId?.positionName} with ${votes.length} votes`,
        req
      )

      res.json({
        ballot,
        votes: votes.map(vote => ({
          position: vote.positionId.positionName,
          candidate: {
            name: `${vote.candidateId.voterId.firstName} ${vote.candidateId.voterId.lastName}`,
            schoolId: vote.candidateId.voterId.schoolId,
            candidateNumber: vote.candidateId.candidateNumber
          }
        }))
      })
    } catch (error) {
      next(error)
    }
  }

  // Get SSG ballot statistics (Admin/Committee/SAO)
  static async getSSGBallotStatistics(req, res, next) {
    try {
      const { electionId } = req.query

      const query = { ssgElectionId: { $ne: null } }
      if (electionId) query.ssgElectionId = electionId

      const totalBallots = await Ballot.countDocuments(query)
      const submittedBallots = await Ballot.countDocuments({ ...query, isSubmitted: true })
      const pendingBallots = totalBallots - submittedBallots

      // Get ballots by SSG election
      const ballotsByElection = await Ballot.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$ssgElectionId',
            total: { $sum: 1 },
            submitted: {
              $sum: { $cond: ['$isSubmitted', 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'ssgelections',
            localField: '_id',
            foreignField: '_id',
            as: 'election'
          }
        },
        {
          $project: {
            electionTitle: { $arrayElemAt: ['$election.title', 0] },
            total: 1,
            submitted: 1,
            pending: { $subtract: ['$total', '$submitted'] },
            turnout: {
              $round: [
                { $multiply: [{ $divide: ['$submitted', '$total'] }, 100] },
                2
              ]
            }
          }
        }
      ])

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        "Retrieved SSG ballot statistics",
        req
      )

      res.json({
        totalBallots,
        submittedBallots,
        pendingBallots,
        turnoutRate: totalBallots > 0 ? Math.round((submittedBallots / totalBallots) * 100) : 0,
        ballotsByElection
      })
    } catch (error) {
      next(error)
    }
  }

  // Get Departmental ballot statistics (Admin/Committee/SAO)
  static async getDepartmentalBallotStatistics(req, res, next) {
    try {
      const { electionId } = req.query

      const query = { deptElectionId: { $ne: null } }
      if (electionId) query.deptElectionId = electionId

      const totalBallots = await Ballot.countDocuments(query)
      const submittedBallots = await Ballot.countDocuments({ ...query, isSubmitted: true })
      const pendingBallots = totalBallots - submittedBallots

      // Get ballots by Departmental election
      const ballotsByElection = await Ballot.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$deptElectionId',
            total: { $sum: 1 },
            submitted: {
              $sum: { $cond: ['$isSubmitted', 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'departmentalelections',
            localField: '_id',
            foreignField: '_id',
            as: 'election'
          }
        },
        {
          $lookup: {
            from: 'departments',
            localField: 'election.departmentId',
            foreignField: '_id',
            as: 'department'
          }
        },
        {
          $project: {
            electionTitle: { $arrayElemAt: ['$election.title', 0] },
            college: { $arrayElemAt: ['$department.college', 0] },
            total: 1,
            submitted: 1,
            pending: { $subtract: ['$total', '$submitted'] },
            turnout: {
              $round: [
                { $multiply: [{ $divide: ['$submitted', '$total'] }, 100] },
                2
              ]
            }
          }
        }
      ])

      // Get ballots by position for departmental elections
      const ballotsByPosition = await Ballot.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$currentPositionId',
            total: { $sum: 1 },
            submitted: {
              $sum: { $cond: ['$isSubmitted', 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'positions',
            localField: '_id',
            foreignField: '_id',
            as: 'position'
          }
        },
        {
          $project: {
            positionName: { $arrayElemAt: ['$position.positionName', 0] },
            positionOrder: { $arrayElemAt: ['$position.positionOrder', 0] },
            total: 1,
            submitted: 1,
            pending: { $subtract: ['$total', '$submitted'] },
            turnout: {
              $round: [
                { $multiply: [{ $divide: ['$submitted', '$total'] }, 100] },
                2
              ]
            }
          }
        },
        { $sort: { positionOrder: 1 } }
      ])

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        "Retrieved Departmental ballot statistics",
        req
      )

      res.json({
        totalBallots,
        submittedBallots,
        pendingBallots,
        turnoutRate: totalBallots > 0 ? Math.round((submittedBallots / totalBallots) * 100) : 0,
        ballotsByElection,
        ballotsByPosition
      })
    } catch (error) {
      next(error)
    }
  }

  // NEW: Export ballot data
  static async exportBallotData(req, res, next) {
    try {
      const { type = 'all', electionId, format = 'csv' } = req.query

      // This is a placeholder - implement actual export logic based on your requirements
      const exportData = {
        type,
        electionId,
        format,
        exported: true,
        timestamp: new Date()
      }

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Exported ballot data (type: ${type}, format: ${format})`,
        req
      )

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename=ballots.csv')
      } else {
        res.setHeader('Content-Type', 'application/json')
      }

      res.json(exportData)
    } catch (error) {
      next(error)
    }
  }
}

module.exports = BallotController