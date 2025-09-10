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
        .populate('voterId', 'schoolId firstName lastName degreeId')
        .populate('voterId.degreeId', 'degreeCode degreeName')
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
      const { page = 1, limit = 10, electionId, status } = req.query
      
      const query = { deptElectionId: { $ne: null } }
      if (electionId) query.deptElectionId = electionId
      if (status === 'submitted') query.isSubmitted = true
      if (status === 'pending') query.isSubmitted = false
      if (positionId) query.currentPositionId = positionId

      const ballots = await Ballot.find(query)
        .populate('deptElectionId', 'title electionDate status department')
        .populate('voterId', 'schoolId firstName lastName degreeId')
        .populate('voterId.degreeId', 'degreeCode degreeName department')
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
        .populate('ssgElectionId', 'title electionDate status ballotOpenTime ballotCloseTime')
        .populate('deptElectionId', 'title electionDate status ballotOpenTime ballotCloseTime department')
        .populate('voterId', 'schoolId firstName lastName degreeId')
        .populate('voterId.degreeId', 'degreeCode degreeName department')

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

      await AuditLog.logAction({
        action: "BALLOT_ACCESSED",
        username: req.user.username || req.user.schoolId?.toString(),
        userId: req.user.userId,
        voterId: req.user.voterId,
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
        "DELETE_USER",
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

      if (!ballot || !ballot.deptElectionId) {
        return res.status(404).json({ message: "Departmental Ballot not found" })
      }

      // Delete associated votes first
      const voteCount = await Vote.countDocuments({ ballotId: ballot._id })
      await Vote.deleteMany({ ballotId: ballot._id })

      // Delete ballot
      await Ballot.findByIdAndDelete(ballot._id)

      await AuditLog.logUserAction(
        "DELETE_USER",
        req.user,
        `Deleted Departmental ballot ${id} for voter ${ballot.voterId.schoolId} in election ${ballot.deptElectionId.title}. Removed ${voteCount} votes.`,
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
      const voter = await Voter.findById(voterId)
      if (!voter || !voter.isRegistered || !voter.isPasswordActive) {
        return res.status(400).json({ message: "Voter is not eligible to vote in SSG elections" })
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

  // Start Departmental ballot (Class officers only)
  static async startDepartmentalBallot(req, res, next) {
    try {
      const { electionId, positionId } = req.body
      const voterId = req.user.voterId

      // Validate election exists and is active
      const election = await DepartmentalElection.findById(electionId)
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
      const voter = await Voter.findById(voterId).populate('degreeId')
      if (!voter || !voter.isRegistered || !voter.isPasswordActive) {
        return res.status(400).json({ message: "Voter is not eligible to vote" })
      }

      if (!voter.isClassOfficer) {
        return res.status(403).json({ message: "Only class officers can vote in departmental elections" })
      }

      // Check if voter's department matches election department
      if (voter.degreeId.department !== election.department) {
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
        `Submitted Departmental ballot with ${voteCount} votes for election: ${ballot.deptElectionId.title}`,
        req
      )

      res.json({
        message: "Departmental Ballot submitted successfully",
        submittedAt: ballot.submittedAt,
        voteCount
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
      await Vote.deleteMany({ ballotId: ballot._id })

      // Delete ballot
      await Ballot.findByIdAndDelete(ballot._id)

      await AuditLog.logVoterAction(
        "BALLOT_ABANDONED",
        ballot.voterId,
        `Abandoned SSG ballot for election: ${ballot.ssgElectionId.title}`,
        req
      )

      res.json({ message: "SSG Ballot abandoned successfully" })
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
      await Vote.deleteMany({ ballotId: ballot._id })

      // Delete ballot
      await Ballot.findByIdAndDelete(ballot._id)

      await AuditLog.logVoterAction(
        "BALLOT_ABANDONED",
        ballot.voterId,
        `Abandoned Departmental ballot for election: ${ballot.deptElectionId.title}`,
        req
      )

      res.json({ message: "Departmental Ballot abandoned successfully" })
    } catch (error) {
      next(error)
    }
  }

  // Get voter's SSG ballot status for election
  static async getVoterSSGBallotStatus(req, res, next) {
    try {
      const { electionId } = req.params
      const voterId = req.user.voterId

      const ballot = await Ballot.findOne({ ssgElectionId: electionId, voterId })
        .populate('ssgElectionId', 'title status electionDate ballotOpenTime ballotCloseTime')

      if (!ballot) {
        return res.json({ 
          hasVoted: false, 
          canVote: true,
          ballot: null 
        })
      }

      res.json({
        hasVoted: ballot.isSubmitted,
        canVote: !ballot.isSubmitted,
        ballot: {
          _id: ballot._id,
          isSubmitted: ballot.isSubmitted,
          submittedAt: ballot.submittedAt,
          createdAt: ballot.createdAt
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

      const query = { deptElectionId: electionId, voterId }
      if (positionId) query.currentPositionId = positionId

      const ballot = await Ballot.findOne(query)
        .populate('deptElectionId', 'title status electionDate ballotOpenTime ballotCloseTime department')
        .populate('currentPositionId', 'positionName positionOrder')

      if (!ballot) {
        return res.json({ 
          hasVoted: false, 
          canVote: true,
          ballot: null 
        })
      }

      res.json({
        hasVoted: ballot.isSubmitted,
        canVote: !ballot.isSubmitted,
        ballot: {
          _id: ballot._id,
          currentPositionId: ballot.currentPositionId,
          positionName: ballot.currentPositionId?.positionName,
          isSubmitted: ballot.isSubmitted,
          submittedAt: ballot.submittedAt,
          createdAt: ballot.createdAt
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
        .populate('deptElectionId', 'title electionDate department')

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
          $project: {
            electionTitle: { $arrayElemAt: ['$election.title', 0] },
            department: { $arrayElemAt: ['$election.department', 0] },
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
        "Retrieved Departmental ballot statistics",
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
}

module.exports = BallotController