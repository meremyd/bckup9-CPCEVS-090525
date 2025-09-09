const Election = require("../models/Election")
const Ballot = require("../models/Ballot")
const Vote = require("../models/Vote")
const Candidate = require("../models/Candidate")
const Position = require("../models/Position")
const Voter = require("../models/Voter")
const AuditLog = require("../models/AuditLog")
const { v4: uuidv4 } = require('uuid')
const mongoose = require("mongoose")

const VotingController = {
  // Get all active elections that voters can participate in
  getActiveElections: async (req, res) => {
    try {
      const currentDate = new Date()
      
      const activeElections = await Election.find({
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
        isActive: true
      })
      .populate('degreeId', 'degreeName department')
      .select('electionName description startDate endDate electionType degreeId')
      .sort({ startDate: 1 })

      // Check if voter has already voted in each election
      const electionsWithVotingStatus = await Promise.all(
        activeElections.map(async (election) => {
          const existingBallot = await Ballot.findOne({
            electionId: election._id,
            voterId: req.user.id,
            isSubmitted: true
          })

          return {
            ...election.toObject(),
            hasVoted: !!existingBallot,
            votedAt: existingBallot?.submittedAt || null
          }
        })
      )

      // Log the system access
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.id, schoolId: req.user.schoolId },
        "Accessed active elections list",
        req
      )

      res.json({
        success: true,
        data: electionsWithVotingStatus
      })
    } catch (error) {
      console.error("Get active elections error:", error)
      res.status(500).json({
        success: false,
        message: "Error fetching active elections",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    }
  },

  // Get election details with positions and candidates
  getElectionDetails: async (req, res) => {
    try {
      const { id } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid election ID"
        })
      }

      const election = await Election.findById(id)
        .populate('degreeId', 'degreeName department')

      if (!election) {
        return res.status(404).json({
          success: false,
          message: "Election not found"
        })
      }

      // Get positions for this election
      const positions = await Position.find({
        electionId: id,
        isActive: true
      }).sort({ positionOrder: 1 })

      // Get candidates for each position
      const positionsWithCandidates = await Promise.all(
        positions.map(async (position) => {
          const candidates = await Candidate.find({
            electionId: id,
            positionId: position._id,
            isActive: true
          })
          .populate('voterId', 'firstName middleName lastName schoolId degreeId')
          .populate('partylistId', 'partylistName description')
          .sort({ candidateNumber: 1 })

          return {
            ...position.toObject(),
            candidates: candidates.map(candidate => ({
              ...candidate.toObject(),
              campaignPicture: candidate.campaignPicture ? candidate.campaignPicture.toString('base64') : null
            }))
          }
        })
      )

      // Log ballot access
      await AuditLog.logVoterAction(
        "BALLOT_ACCESSED",
        { _id: req.user.id, schoolId: req.user.schoolId },
        `Accessed election details for: ${election.electionName}`,
        req
      )

      res.json({
        success: true,
        data: {
          election,
          positions: positionsWithCandidates
        }
      })
    } catch (error) {
      console.error("Get election details error:", error)
      res.status(500).json({
        success: false,
        message: "Error fetching election details",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    }
  },

  // Get candidates for a specific election
  getElectionCandidates: async (req, res) => {
    try {
      const { id } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid election ID"
        })
      }

      const candidates = await Candidate.find({
        electionId: id,
        isActive: true
      })
      .populate('voterId', 'firstName middleName lastName schoolId')
      .populate('positionId', 'positionName positionOrder')
      .populate('partylistId', 'partylistName')
      .sort({ 'positionId.positionOrder': 1, candidateNumber: 1 })

      // Log system access
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.id, schoolId: req.user.schoolId },
        `Viewed candidates for election ID: ${id}`,
        req
      )

      res.json({
        success: true,
        data: candidates.map(candidate => ({
          ...candidate.toObject(),
          campaignPicture: candidate.campaignPicture ? candidate.campaignPicture.toString('base64') : null
        }))
      })
    } catch (error) {
      console.error("Get election candidates error:", error)
      res.status(500).json({
        success: false,
        message: "Error fetching candidates",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    }
  },

  // Cast vote - main voting functionality
  castVote: async (req, res) => {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const { electionId, votes } = req.body
      const voterId = req.user.id

      // Validate input
      if (!electionId || !votes || !Array.isArray(votes)) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: req.user.schoolId },
          "Invalid vote data submitted - missing electionId or votes array",
          req
        )
        return res.status(400).json({
          success: false,
          message: "Invalid vote data. Election ID and votes array are required."
        })
      }

      if (!mongoose.Types.ObjectId.isValid(electionId)) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: req.user.schoolId },
          `Invalid election ID format: ${electionId}`,
          req
        )
        return res.status(400).json({
          success: false,
          message: "Invalid election ID"
        })
      }

      // Check if election exists and is active
      const election = await Election.findById(electionId).session(session)
      if (!election) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: req.user.schoolId },
          `Election not found: ${electionId}`,
          req
        )
        throw new Error("Election not found")
      }

      const currentDate = new Date()
      if (currentDate < election.startDate || currentDate > election.endDate || !election.isActive) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: req.user.schoolId },
          `Attempted to vote in inactive election: ${election.electionName}`,
          req
        )
        throw new Error("Election is not currently active")
      }

      // Check if voter exists
      const voter = await Voter.findById(voterId).session(session)
      if (!voter || !voter.isActive || !voter.isRegistered) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: req.user.schoolId },
          "Ineligible voter attempted to vote",
          req
        )
        throw new Error("Voter not found or not eligible to vote")
      }

      // Check if voter has already voted in this election
      const existingBallot = await Ballot.findOne({
        electionId,
        voterId,
        isSubmitted: true
      }).session(session)

      if (existingBallot) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: voter.schoolId },
          `Attempted duplicate voting in election: ${election.electionName}`,
          req
        )
        throw new Error("You have already voted in this election")
      }

      // Log ballot started
      await AuditLog.logVoterAction(
        "BALLOT_STARTED",
        { _id: voterId, schoolId: voter.schoolId },
        `Started voting process for election: ${election.electionName}`,
        req
      )

      // Validate votes structure and candidates
      const validatedVotes = []
      for (const vote of votes) {
        if (!vote.positionId || !vote.candidateId) {
          await AuditLog.logVoterAction(
            "BALLOT_ABANDONED",
            { _id: voterId, schoolId: voter.schoolId },
            "Invalid vote structure - missing position or candidate ID",
            req
          )
          throw new Error("Invalid vote structure. Position ID and candidate ID are required.")
        }

        // Validate position exists in this election
        const position = await Position.findOne({
          _id: vote.positionId,
          electionId,
          isActive: true
        }).session(session)

        if (!position) {
          await AuditLog.logVoterAction(
            "BALLOT_ABANDONED",
            { _id: voterId, schoolId: voter.schoolId },
            `Invalid position ID: ${vote.positionId}`,
            req
          )
          throw new Error(`Invalid position: ${vote.positionId}`)
        }

        // Validate candidate exists and belongs to the position
        const candidate = await Candidate.findOne({
          _id: vote.candidateId,
          electionId,
          positionId: vote.positionId,
          isActive: true
        }).session(session)

        if (!candidate) {
          await AuditLog.logVoterAction(
            "BALLOT_ABANDONED",
            { _id: voterId, schoolId: voter.schoolId },
            `Invalid candidate ID: ${vote.candidateId} for position: ${vote.positionId}`,
            req
          )
          throw new Error(`Invalid candidate: ${vote.candidateId} for position: ${vote.positionId}`)
        }

        validatedVotes.push({
          positionId: vote.positionId,
          candidateId: vote.candidateId
        })
      }

      // Check for duplicate position votes
      const positionIds = validatedVotes.map(v => v.positionId.toString())
      const uniquePositions = [...new Set(positionIds)]
      if (positionIds.length !== uniquePositions.length) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: voter.schoolId },
          "Duplicate votes for the same position detected",
          req
        )
        throw new Error("Duplicate votes for the same position are not allowed")
      }

      // Create ballot
      const ballot = new Ballot({
        electionId,
        voterId,
        ballotToken: uuidv4(),
        isSubmitted: true,
        submittedAt: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      })

      const savedBallot = await ballot.save({ session })

      // Create vote records
      const voteRecords = validatedVotes.map(vote => ({
        ballotId: savedBallot._id,
        candidateId: vote.candidateId,
        positionId: vote.positionId,
        voteTimestamp: new Date()
      }))

      await Vote.insertMany(voteRecords, { session })

      // Update candidate vote counts
      for (const vote of validatedVotes) {
        await Candidate.findByIdAndUpdate(
          vote.candidateId,
          { $inc: { voteCount: 1 } },
          { session }
        )
      }

      await session.commitTransaction()

      // Log successful voting
      await AuditLog.logVoterAction(
        "VOTED",
        { _id: voterId, schoolId: voter.schoolId },
        `Successfully cast ${voteRecords.length} votes in election: ${election.electionName}`,
        req
      )

      await AuditLog.logVoterAction(
        "VOTE_SUBMITTED",
        { _id: voterId, schoolId: voter.schoolId },
        `Ballot submitted with token: ${savedBallot.ballotToken}`,
        req
      )

      res.json({
        success: true,
        message: "Vote cast successfully",
        data: {
          ballotId: savedBallot._id,
          ballotToken: savedBallot.ballotToken,
          submittedAt: savedBallot.submittedAt,
          voteCount: voteRecords.length
        }
      })

    } catch (error) {
      await session.abortTransaction()
      console.error("Cast vote error:", error)
      
      // Log the error if we have voter info
      if (req.user?.id) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: req.user.id, schoolId: req.user.schoolId },
          `Vote casting failed: ${error.message}`,
          req
        )
      }

      res.status(400).json({
        success: false,
        message: error.message || "Error casting vote",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    } finally {
      session.endSession()
    }
  },

  // Get voter's voting history
  getMyVotes: async (req, res) => {
    try {
      const voterId = req.user.id

      const ballots = await Ballot.find({
        voterId,
        isSubmitted: true
      })
      .populate('electionId', 'electionName description startDate endDate')
      .sort({ submittedAt: -1 })

      const votingHistory = await Promise.all(
        ballots.map(async (ballot) => {
          const votes = await Vote.find({
            ballotId: ballot._id
          })
          .populate('candidateId', 'candidateNumber voterId')
          .populate({
            path: 'candidateId',
            populate: {
              path: 'voterId',
              select: 'firstName middleName lastName'
            }
          })
          .populate('positionId', 'positionName')

          return {
            ballotId: ballot._id,
            ballotToken: ballot.ballotToken,
            election: ballot.electionId,
            submittedAt: ballot.submittedAt,
            votes: votes.map(vote => ({
              position: vote.positionId.positionName,
              candidate: `${vote.candidateId.voterId.firstName} ${vote.candidateId.voterId.lastName}`,
              candidateNumber: vote.candidateId.candidateNumber
            }))
          }
        })
      )

      // Log system access
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.id, schoolId: req.user.schoolId },
        "Accessed voting history",
        req
      )

      res.json({
        success: true,
        data: votingHistory
      })
    } catch (error) {
      console.error("Get my votes error:", error)
      res.status(500).json({
        success: false,
        message: "Error fetching voting history",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    }
  },

  // Get voter's current voting status
  getVotingStatus: async (req, res) => {
    try {
      const voterId = req.user.id

      // Get voter info
      const voter = await Voter.findById(voterId)
        .populate('degreeId', 'degreeName department')
        .select('-password -faceEncoding')

      if (!voter) {
        return res.status(404).json({
          success: false,
          message: "Voter not found"
        })
      }

      // Get active elections
      const currentDate = new Date()
      const activeElections = await Election.find({
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
        isActive: true
      }).countDocuments()

      // Get elections voter has participated in
      const votedElections = await Ballot.find({
        voterId,
        isSubmitted: true
      }).countDocuments()

      // Get total votes cast
      const totalVotesCast = await Vote.find({
        ballotId: { $in: await Ballot.find({ voterId, isSubmitted: true }).distinct('_id') }
      }).countDocuments()

      // Check if voter is eligible (password not expired)
      const isEligible = voter.isActive && voter.isRegistered && 
                        voter.isPasswordActive && !voter.isPasswordExpired()

      // Log system access
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: voterId, schoolId: voter.schoolId },
        "Accessed voting status dashboard",
        req
      )

      res.json({
        success: true,
        data: {
          voter: {
            id: voter._id,
            schoolId: voter.schoolId,
            fullName: voter.fullName,
            email: voter.email,
            degree: voter.degreeId,
            isClassOfficer: voter.isClassOfficer
          },
          votingStatus: {
            isEligible,
            isActive: voter.isActive,
            isRegistered: voter.isRegistered,
            passwordExpired: voter.isPasswordExpired(),
            passwordExpiresAt: voter.passwordExpiresAt
          },
          statistics: {
            activeElections,
            votedElections,
            totalVotesCast,
            pendingElections: activeElections - votedElections
          }
        }
      })
    } catch (error) {
      console.error("Get voting status error:", error)
      res.status(500).json({
        success: false,
        message: "Error fetching voting status",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    }
  }
}

module.exports = VotingController