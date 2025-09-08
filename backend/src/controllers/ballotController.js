const Ballot = require("../models/Ballot")
const Election = require("../models/Election")
const Voter = require("../models/Voter")
const Vote = require("../models/Vote")
const Candidate = require("../models/Candidate")
const Position = require("../models/Position")
const AuditLog = require("../models/AuditLog")
const crypto = require("crypto")

class BallotController {
  // Get all ballots (Admin/Committee only)
  static async getAllBallots(req, res, next) {
    try {
      const { page = 1, limit = 10, electionId, status } = req.query
      
      const query = {}
      if (electionId) query.electionId = electionId
      if (status === 'submitted') query.isSubmitted = true
      if (status === 'pending') query.isSubmitted = false

      const ballots = await Ballot.find(query)
        .populate('electionId', 'title electionDate status')
        .populate('voterId', 'schoolId firstName lastName degreeId')
        .populate('voterId.degreeId', 'degreeCode degreeName')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)

      const total = await Ballot.countDocuments(query)

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Retrieved ${ballots.length} ballots`,
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
        .populate('electionId', 'title electionDate status ballotOpenTime ballotCloseTime')
        .populate('voterId', 'schoolId firstName lastName degreeId')
        .populate('voterId.degreeId', 'degreeCode degreeName')

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

  // Create/Start new ballot (Voters only)
  static async startBallot(req, res, next) {
    try {
      const { electionId } = req.body
      const voterId = req.user.voterId

      // Validate election exists and is active
      const election = await Election.findById(electionId)
      if (!election) {
        return res.status(404).json({ message: "Election not found" })
      }

      if (election.status !== 'active') {
        return res.status(400).json({ message: "Election is not active" })
      }

      // Check if voter already has a ballot for this election
      const existingBallot = await Ballot.findOne({ electionId, voterId })
      if (existingBallot) {
        if (existingBallot.isSubmitted) {
          return res.status(400).json({ message: "You have already voted in this election" })
        }
        // Return existing unsubmitted ballot
        return res.json({ 
          message: "Continuing existing ballot",
          ballot: existingBallot 
        })
      }

      // Verify voter is registered
      const voter = await Voter.findById(voterId)
      if (!voter || !voter.isRegistered || !voter.isPasswordActive) {
        return res.status(400).json({ message: "Voter is not eligible to vote" })
      }

      // Create new ballot with unique token
      const ballotToken = crypto.randomBytes(32).toString('hex')
      
      const ballot = new Ballot({
        electionId,
        voterId,
        ballotToken,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      })

      await ballot.save()

      await AuditLog.logVoterAction(
        "BALLOT_STARTED",
        voter,
        `Started new ballot for election: ${election.title}`,
        req
      )

      res.status(201).json({
        message: "Ballot started successfully",
        ballot: {
          _id: ballot._id,
          electionId: ballot.electionId,
          ballotToken: ballot.ballotToken,
          createdAt: ballot.createdAt
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Submit ballot (Voters only)
  static async submitBallot(req, res, next) {
    try {
      const { id } = req.params
      const voterId = req.user.voterId

      const ballot = await Ballot.findById(id)
        .populate('electionId', 'title')
        .populate('voterId', 'schoolId firstName lastName')

      if (!ballot) {
        return res.status(404).json({ message: "Ballot not found" })
      }

      // Check ownership
      if (ballot.voterId._id.toString() !== voterId) {
        await AuditLog.logVoterAction(
          "UNAUTHORIZED_ACCESS_ATTEMPT",
          { _id: voterId, schoolId: req.user.schoolId },
          `Attempted to submit ballot ${id} belonging to another voter`,
          req
        )
        return res.status(403).json({ message: "Access denied" })
      }

      if (ballot.isSubmitted) {
        return res.status(400).json({ message: "Ballot has already been submitted" })
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
        `Submitted ballot with ${voteCount} votes for election: ${ballot.electionId.title}`,
        req
      )

      res.json({
        message: "Ballot submitted successfully",
        submittedAt: ballot.submittedAt,
        voteCount
      })
    } catch (error) {
      next(error)
    }
  }

  // Abandon ballot (Voters only)
  static async abandonBallot(req, res, next) {
    try {
      const { id } = req.params
      const voterId = req.user.voterId

      const ballot = await Ballot.findById(id)
        .populate('electionId', 'title')
        .populate('voterId', 'schoolId firstName lastName')

      if (!ballot) {
        return res.status(404).json({ message: "Ballot not found" })
      }

      // Check ownership
      if (ballot.voterId._id.toString() !== voterId) {
        return res.status(403).json({ message: "Access denied" })
      }

      if (ballot.isSubmitted) {
        return res.status(400).json({ message: "Cannot abandon submitted ballot" })
      }

      // Delete associated votes
      await Vote.deleteMany({ ballotId: ballot._id })

      // Delete ballot
      await Ballot.findByIdAndDelete(ballot._id)

      await AuditLog.logVoterAction(
        "BALLOT_ABANDONED",
        ballot.voterId,
        `Abandoned ballot for election: ${ballot.electionId.title}`,
        req
      )

      res.json({ message: "Ballot abandoned successfully" })
    } catch (error) {
      next(error)
    }
  }

  // Get voter's ballot status for election
  static async getVoterBallotStatus(req, res, next) {
    try {
      const { electionId } = req.params
      const voterId = req.user.voterId

      const ballot = await Ballot.findOne({ electionId, voterId })
        .populate('electionId', 'title status electionDate ballotOpenTime ballotCloseTime')

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

  // Get ballot with votes (for review before submission)
  static async getBallotWithVotes(req, res, next) {
    try {
      const { id } = req.params
      const voterId = req.user.voterId

      const ballot = await Ballot.findById(id)
        .populate('electionId', 'title electionDate')

      if (!ballot) {
        return res.status(404).json({ message: "Ballot not found" })
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

  // Get ballot statistics (Admin/Committee only)
  static async getBallotStatistics(req, res, next) {
    try {
      const { electionId } = req.query

      const query = electionId ? { electionId } : {}

      const totalBallots = await Ballot.countDocuments(query)
      const submittedBallots = await Ballot.countDocuments({ ...query, isSubmitted: true })
      const pendingBallots = totalBallots - submittedBallots

      // Get ballots by election
      const ballotsByElection = await Ballot.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$electionId',
            total: { $sum: 1 },
            submitted: {
              $sum: { $cond: ['$isSubmitted', 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'elections',
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
        "Retrieved ballot statistics",
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

  // Delete ballot (Admin only - for cleanup)
  static async deleteBallot(req, res, next) {
    try {
      const { id } = req.params

      const ballot = await Ballot.findById(id)
        .populate('electionId', 'title')
        .populate('voterId', 'schoolId firstName lastName')

      if (!ballot) {
        return res.status(404).json({ message: "Ballot not found" })
      }

      // Delete associated votes first
      const voteCount = await Vote.countDocuments({ ballotId: ballot._id })
      await Vote.deleteMany({ ballotId: ballot._id })

      // Delete ballot
      await Ballot.findByIdAndDelete(ballot._id)

      await AuditLog.logUserAction(
        "DELETE_USER", // Using closest available action
        req.user,
        `Deleted ballot ${id} for voter ${ballot.voterId.schoolId} in election ${ballot.electionId.title}. Removed ${voteCount} votes.`,
        req
      )

      res.json({ 
        message: "Ballot deleted successfully",
        deletedVotes: voteCount
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = BallotController