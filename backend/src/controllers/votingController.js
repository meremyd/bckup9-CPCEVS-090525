const SSGElection = require("../models/SSGElection")
const DepartmentalElection = require("../models/DepartmentalElection")
const Ballot = require("../models/Ballot")
const Vote = require("../models/Vote")
const Candidate = require("../models/Candidate")
const Position = require("../models/Position")
const Voter = require("../models/Voter")
const Department = require("../models/Department")
const AuditLog = require("../models/AuditLog")
const { v4: uuidv4 } = require('uuid')
const mongoose = require("mongoose")

const VotingController = {
  // Get all active SSG elections that registered voters can participate in
  getActiveSSGElections: async (req, res) => {
    try {
      const currentDate = new Date()
      const currentTime = new Date().toTimeString().slice(0, 8)
      
      const activeElections = await SSGElection.find({
        electionDate: { $lte: currentDate },
        status: "active",
        ballotOpenTime: { $lte: currentTime },
        ballotCloseTime: { $gte: currentTime }
      })
      .populate('createdBy', 'username')
      .select('ssgElectionId electionYear title status electionDate ballotOpenTime ballotCloseTime totalVotes voterTurnout')
      .sort({ electionDate: 1 })

      // Check if voter has already voted in each election
      const electionsWithVotingStatus = await Promise.all(
        activeElections.map(async (election) => {
          const existingBallot = await Ballot.findOne({
            ssgElectionId: election._id,
            voterId: req.user.voterId || req.user.userId,
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
        { _id: req.user.voterId || req.user.userId, schoolId: req.user.schoolId },
        "Accessed active SSG elections list",
        req
      )

      res.json({
        success: true,
        data: electionsWithVotingStatus
      })
    } catch (error) {
      console.error("Get active SSG elections error:", error)
      res.status(500).json({
        success: false,
        message: "Error fetching active SSG elections",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    }
  },

  // Get all active departmental elections for voter's department
  getActiveDepartmentalElections: async (req, res) => {
    try {
      const currentDate = new Date()
      const currentTime = new Date().toTimeString().slice(0, 8)
      
      // Get voter info to determine department
      const voter = await Voter.findById(req.user.voterId || req.user.userId)
        .populate('departmentId')
      
      if (!voter) {
        return res.status(404).json({
          success: false,
          message: "Voter not found"
        })
      }

      const activeElections = await DepartmentalElection.find({
        departmentId: voter.departmentId._id,
        electionDate: { $lte: currentDate },
        status: "active",
        ballotOpenTime: { $lte: currentTime },
        ballotCloseTime: { $gte: currentTime }
      })
      .populate('createdBy', 'username')
      .populate('departmentId', 'departmentCode degreeProgram college')
      .select('deptElectionId electionYear title status electionDate ballotOpenTime ballotCloseTime totalVotes voterTurnout departmentId')
      .sort({ electionDate: 1 })

      // Check if voter has already voted and can vote
      const electionsWithVotingStatus = await Promise.all(
        activeElections.map(async (election) => {
          const existingBallot = await Ballot.findOne({
            deptElectionId: election._id,
            voterId: req.user.voterId || req.user.userId,
            isSubmitted: true
          })

          // Only registered voters who are class officers can vote in departmental elections
          const canVote = voter.isRegistered && voter.isClassOfficer
          const canViewOnly = voter.isRegistered && !voter.isClassOfficer

          return {
            ...election.toObject(),
            hasVoted: !!existingBallot,
            votedAt: existingBallot?.submittedAt || null,
            canVote,
            canViewOnly
          }
        })
      )

      // Log the system access
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.voterId || req.user.userId, schoolId: req.user.schoolId },
        `Accessed active departmental elections list for department: ${voter.departmentId.departmentCode}`,
        req
      )

      res.json({
        success: true,
        data: electionsWithVotingStatus,
        voterInfo: {
          canVote: voter.isClassOfficer && voter.isRegistered,
          isClassOfficer: voter.isClassOfficer,
          department: voter.departmentId
        }
      })
    } catch (error) {
      console.error("Get active departmental elections error:", error)
      res.status(500).json({
        success: false,
        message: "Error fetching active departmental elections",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    }
  },

  // Get SSG election details with positions and candidates
  getSSGElectionDetails: async (req, res) => {
    try {
      const { id } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid SSG election ID"
        })
      }

      const election = await SSGElection.findById(id)
        .populate('createdBy', 'username')

      if (!election) {
        return res.status(404).json({
          success: false,
          message: "SSG election not found"
        })
      }

      // Get positions for this SSG election
      const positions = await Position.find({
        ssgElectionId: id,
        isActive: true
      }).sort({ positionOrder: 1 })

      // Get candidates for each position
      const positionsWithCandidates = await Promise.all(
        positions.map(async (position) => {
          const candidates = await Candidate.find({
            ssgElectionId: id,
            positionId: position._id,
            isActive: true
          })
          .populate({
            path: 'voterId',
            select: 'firstName middleName lastName schoolId departmentId',
            populate: {
              path: 'departmentId',
              select: 'departmentCode degreeProgram college'
            }
          })
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
        { _id: req.user.voterId || req.user.userId, schoolId: req.user.schoolId },
        `Accessed SSG election details for: ${election.title}`,
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
      console.error("Get SSG election details error:", error)
      res.status(500).json({
        success: false,
        message: "Error fetching SSG election details",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    }
  },

  // Get departmental election details with positions and candidates
  getDepartmentalElectionDetails: async (req, res) => {
    try {
      const { id } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid departmental election ID"
        })
      }

      const election = await DepartmentalElection.findById(id)
        .populate('createdBy', 'username')
        .populate('departmentId', 'departmentCode degreeProgram college')

      if (!election) {
        return res.status(404).json({
          success: false,
          message: "Departmental election not found"
        })
      }

      // Get positions for this departmental election
      const positions = await Position.find({
        deptElectionId: id,
        isActive: true
      }).sort({ positionOrder: 1 })

      // Get candidates for each position
      const positionsWithCandidates = await Promise.all(
        positions.map(async (position) => {
          const candidates = await Candidate.find({
            deptElectionId: id,
            positionId: position._id,
            isActive: true
          })
          .populate({
            path: 'voterId',
            select: 'firstName middleName lastName schoolId departmentId yearLevel',
            populate: {
              path: 'departmentId',
              select: 'departmentCode degreeProgram college'
            }
          })
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
        { _id: req.user.voterId || req.user.userId, schoolId: req.user.schoolId },
        `Accessed departmental election details for: ${election.title}`,
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
      console.error("Get departmental election details error:", error)
      res.status(500).json({
        success: false,
        message: "Error fetching departmental election details",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    }
  },

  // Get SSG candidates for a specific election
  getSSGElectionCandidates: async (req, res) => {
    try {
      const { id } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid SSG election ID"
        })
      }

      const candidates = await Candidate.find({
        ssgElectionId: id,
        isActive: true
      })
      .populate({
        path: 'voterId',
        select: 'firstName middleName lastName schoolId departmentId',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })
      .populate('positionId', 'positionName positionOrder')
      .populate('partylistId', 'partylistName')
      .sort({ 'positionId.positionOrder': 1, candidateNumber: 1 })

      // Log system access
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.voterId || req.user.userId, schoolId: req.user.schoolId },
        `Viewed SSG candidates for election ID: ${id}`,
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
      console.error("Get SSG election candidates error:", error)
      res.status(500).json({
        success: false,
        message: "Error fetching SSG candidates",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    }
  },

  // Get departmental candidates for a specific election
  getDepartmentalElectionCandidates: async (req, res) => {
    try {
      const { id } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid departmental election ID"
        })
      }

      const candidates = await Candidate.find({
        deptElectionId: id,
        isActive: true
      })
      .populate({
        path: 'voterId',
        select: 'firstName middleName lastName schoolId departmentId yearLevel',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })
      .populate('positionId', 'positionName positionOrder')
      .sort({ 'positionId.positionOrder': 1, candidateNumber: 1 })

      // Log system access
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.voterId || req.user.userId, schoolId: req.user.schoolId },
        `Viewed departmental candidates for election ID: ${id}`,
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
      console.error("Get departmental election candidates error:", error)
      res.status(500).json({
        success: false,
        message: "Error fetching departmental candidates",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    }
  },

  // Cast vote in SSG election - only registered voters
  castSSGVote: async (req, res) => {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const { ssgElectionId, votes } = req.body
      const voterId = req.user.voterId || req.user.userId

      // Validate input
      if (!ssgElectionId || !votes || !Array.isArray(votes)) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: req.user.schoolId },
          "Invalid SSG vote data submitted - missing ssgElectionId or votes array",
          req
        )
        return res.status(400).json({
          success: false,
          message: "Invalid vote data. SSG Election ID and votes array are required."
        })
      }

      // Check if voter exists and is registered
      const voter = await Voter.findById(voterId).session(session)
      if (!voter || !voter.isActive || !voter.isRegistered) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: req.user.schoolId },
          "Unregistered voter attempted to vote in SSG election",
          req
        )
        throw new Error("Only registered voters can participate in SSG elections")
      }

      // Check if SSG election exists and is active
      const election = await SSGElection.findById(ssgElectionId).session(session)
      if (!election) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: voter.schoolId },
          `SSG election not found: ${ssgElectionId}`,
          req
        )
        throw new Error("SSG election not found")
      }

      const currentDate = new Date()
      const currentTime = new Date().toTimeString().slice(0, 8)
      if (election.status !== "active" || 
          currentTime < election.ballotOpenTime || 
          currentTime > election.ballotCloseTime) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: voter.schoolId },
          `Attempted to vote in inactive SSG election: ${election.title}`,
          req
        )
        throw new Error("SSG election is not currently active")
      }

      // Check if voter has already voted
      const existingBallot = await Ballot.findOne({
        ssgElectionId,
        voterId,
        isSubmitted: true
      }).session(session)

      if (existingBallot) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: voter.schoolId },
          `Attempted duplicate voting in SSG election: ${election.title}`,
          req
        )
        throw new Error("You have already voted in this SSG election")
      }

      // Validate votes and create ballot
      const validatedVotes = await this.validateVotes(votes, ssgElectionId, 'ssg', session)
      
      // Log ballot started
      await AuditLog.logVoterAction(
        "BALLOT_STARTED",
        { _id: voterId, schoolId: voter.schoolId },
        `Started SSG voting process for election: ${election.title}`,
        req
      )

      // Create ballot
      const ballot = new Ballot({
        ssgElectionId,
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
        ssgElectionId: ssgElectionId,
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
        `Successfully cast ${voteRecords.length} votes in SSG election: ${election.title}`,
        req
      )

      await AuditLog.logVoterAction(
        "VOTE_SUBMITTED",
        { _id: voterId, schoolId: voter.schoolId },
        `SSG ballot submitted with token: ${savedBallot.ballotToken}`,
        req
      )

      res.json({
        success: true,
        message: "SSG vote cast successfully",
        data: {
          ballotId: savedBallot._id,
          ballotToken: savedBallot.ballotToken,
          submittedAt: savedBallot.submittedAt,
          voteCount: voteRecords.length
        }
      })

    } catch (error) {
      await session.abortTransaction()
      console.error("Cast SSG vote error:", error)
      
      if (req.user?.voterId || req.user?.userId) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: req.user.voterId || req.user.userId, schoolId: req.user.schoolId },
          `SSG vote casting failed: ${error.message}`,
          req
        )
      }

      res.status(400).json({
        success: false,
        message: error.message || "Error casting SSG vote",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    } finally {
      session.endSession()
    }
  },

  // Cast vote in departmental election - only registered class officers
  castDepartmentalVote: async (req, res) => {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const { deptElectionId, votes } = req.body
      const voterId = req.user.voterId || req.user.userId

      // Validate input
      if (!deptElectionId || !votes || !Array.isArray(votes)) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: req.user.schoolId },
          "Invalid departmental vote data submitted - missing deptElectionId or votes array",
          req
        )
        return res.status(400).json({
          success: false,
          message: "Invalid vote data. Departmental Election ID and votes array are required."
        })
      }

      // Check if voter exists and is registered class officer
      const voter = await Voter.findById(voterId).populate('departmentId').session(session)
      if (!voter || !voter.isActive || !voter.isRegistered) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: req.user.schoolId },
          "Unregistered voter attempted to vote in departmental election",
          req
        )
        throw new Error("Only registered voters can participate in departmental elections")
      }

      if (!voter.isClassOfficer) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: voter.schoolId },
          "Non-class officer attempted to vote in departmental election",
          req
        )
        throw new Error("Only class officers can vote in departmental elections")
      }

      // Check if departmental election exists and is active
      const election = await DepartmentalElection.findById(deptElectionId)
        .populate('departmentId').session(session)
      if (!election) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: voter.schoolId },
          `Departmental election not found: ${deptElectionId}`,
          req
        )
        throw new Error("Departmental election not found")
      }

      // Verify voter is from the same department
      if (!voter.departmentId._id.equals(election.departmentId._id)) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: voter.schoolId },
          `Attempted cross-department voting: voter dept ${voter.departmentId.departmentCode}, election dept ${election.departmentId.departmentCode}`,
          req
        )
        throw new Error("You can only vote in elections for your department")
      }

      const currentDate = new Date()
      const currentTime = new Date().toTimeString().slice(0, 8)
      if (election.status !== "active" || 
          currentTime < election.ballotOpenTime || 
          currentTime > election.ballotCloseTime) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: voter.schoolId },
          `Attempted to vote in inactive departmental election: ${election.title}`,
          req
        )
        throw new Error("Departmental election is not currently active")
      }

      // Check if voter has already voted
      const existingBallot = await Ballot.findOne({
        deptElectionId,
        voterId,
        isSubmitted: true
      }).session(session)

      if (existingBallot) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: voterId, schoolId: voter.schoolId },
          `Attempted duplicate voting in departmental election: ${election.title}`,
          req
        )
        throw new Error("You have already voted in this departmental election")
      }

      // Validate votes and create ballot
      const validatedVotes = await this.validateVotes(votes, deptElectionId, 'departmental', session)
      
      // Log ballot started
      await AuditLog.logVoterAction(
        "BALLOT_STARTED",
        { _id: voterId, schoolId: voter.schoolId },
        `Started departmental voting process for election: ${election.title}`,
        req
      )

      // Create ballot
      const ballot = new Ballot({
        deptElectionId,
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
        deptElectionId: deptElectionId,
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
        `Successfully cast ${voteRecords.length} votes in departmental election: ${election.title}`,
        req
      )

      await AuditLog.logVoterAction(
        "VOTE_SUBMITTED",
        { _id: voterId, schoolId: voter.schoolId },
        `Departmental ballot submitted with token: ${savedBallot.ballotToken}`,
        req
      )

      res.json({
        success: true,
        message: "Departmental vote cast successfully",
        data: {
          ballotId: savedBallot._id,
          ballotToken: savedBallot.ballotToken,
          submittedAt: savedBallot.submittedAt,
          voteCount: voteRecords.length
        }
      })

    } catch (error) {
      await session.abortTransaction()
      console.error("Cast departmental vote error:", error)
      
      if (req.user?.voterId || req.user?.userId) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: req.user.voterId || req.user.userId, schoolId: req.user.schoolId },
          `Departmental vote casting failed: ${error.message}`,
          req
        )
      }

      res.status(400).json({
        success: false,
        message: error.message || "Error casting departmental vote",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    } finally {
      session.endSession()
    }
  },

  // Helper method to validate votes
  validateVotes: async (votes, electionId, electionType, session) => {
    const validatedVotes = []
    
    for (const vote of votes) {
      if (!vote.positionId || !vote.candidateId) {
        throw new Error("Invalid vote structure. Position ID and candidate ID are required.")
      }

      // Validate position exists in this election
      const positionQuery = electionType === 'ssg' 
        ? { _id: vote.positionId, ssgElectionId: electionId, isActive: true }
        : { _id: vote.positionId, deptElectionId: electionId, isActive: true }
        
      const position = await Position.findOne(positionQuery).session(session)

      if (!position) {
        throw new Error(`Invalid position: ${vote.positionId}`)
      }

      // Validate candidate exists and belongs to the position
      const candidateQuery = electionType === 'ssg'
        ? { _id: vote.candidateId, ssgElectionId: electionId, positionId: vote.positionId, isActive: true }
        : { _id: vote.candidateId, deptElectionId: electionId, positionId: vote.positionId, isActive: true }
        
      const candidate = await Candidate.findOne(candidateQuery).session(session)

      if (!candidate) {
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
      throw new Error("Duplicate votes for the same position are not allowed")
    }

    return validatedVotes
  },

  // Get voter's SSG voting history
  getMySSGVotes: async (req, res) => {
    try {
      const voterId = req.user.voterId || req.user.userId

      const ballots = await Ballot.find({
        voterId,
        ssgElectionId: { $exists: true },
        isSubmitted: true
      })
      .populate('ssgElectionId', 'ssgElectionId title electionYear electionDate status')
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
            election: ballot.ssgElectionId,
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
        { _id: req.user.voterId || req.user.userId, schoolId: req.user.schoolId },
        "Accessed SSG voting history",
        req
      )

      res.json({
        success: true,
        data: votingHistory
      })
    } catch (error) {
      console.error("Get my SSG votes error:", error)
      res.status(500).json({
        success: false,
        message: "Error fetching SSG voting history",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    }
  },

  // Get voter's departmental voting history
  getMyDepartmentalVotes: async (req, res) => {
    try {
      const voterId = req.user.voterId || req.user.userId

      const ballots = await Ballot.find({
        voterId,
        deptElectionId: { $exists: true },
        isSubmitted: true
      })
      .populate({
        path: 'deptElectionId',
        select: 'deptElectionId title electionYear electionDate status departmentId',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })
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
            election: ballot.deptElectionId,
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
        { _id: req.user.voterId || req.user.userId, schoolId: req.user.schoolId },
        "Accessed departmental voting history",
        req
      )

      res.json({
        success: true,
        data: votingHistory
      })
    } catch (error) {
      console.error("Get my departmental votes error:", error)
      res.status(500).json({
        success: false,
        message: "Error fetching departmental voting history",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    }
  },

  // Get voter's SSG voting status
  getSSGVotingStatus: async (req, res) => {
    try {
      const voterId = req.user.voterId || req.user.userId

      // Get voter info
      const voter = await Voter.findById(voterId)
        .populate('departmentId', 'departmentCode degreeProgram college')
        .select('-password -faceEncoding')

      if (!voter) {
        return res.status(404).json({
          success: false,
          message: "Voter not found"
        })
      }

      // Get active SSG elections
      const currentDate = new Date()
      const currentTime = new Date().toTimeString().slice(0, 8)
      const activeSSGElections = await SSGElection.find({
        electionDate: { $lte: currentDate },
        status: "active",
        ballotOpenTime: { $lte: currentTime },
        ballotCloseTime: { $gte: currentTime }
      }).countDocuments()

      // Get SSG elections voter has participated in
      const votedSSGElections = await Ballot.find({
        voterId,
        ssgElectionId: { $exists: true },
        isSubmitted: true
      }).countDocuments()

      // Get total SSG votes cast
      const totalSSGVotesCast = await Vote.find({
        ballotId: { $in: await Ballot.find({ 
          voterId, 
          ssgElectionId: { $exists: true },
          isSubmitted: true 
        }).distinct('_id') }
      }).countDocuments()

      // Check if voter is eligible for SSG elections (must be registered)
      const isEligibleForSSG = voter.isActive && voter.isRegistered && 
                              voter.isPasswordActive && !voter.isPasswordExpired()

      // Log system access
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: voterId, schoolId: voter.schoolId },
        "Accessed SSG voting status dashboard",
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
            department: voter.departmentId,
            yearLevel: voter.yearLevel,
            isClassOfficer: voter.isClassOfficer
          },
          votingStatus: {
            isEligible: isEligibleForSSG,
            isActive: voter.isActive,
            isRegistered: voter.isRegistered,
            passwordExpired: voter.isPasswordExpired(),
            passwordExpiresAt: voter.passwordExpiresAt
          },
          statistics: {
            activeSSGElections,
            votedSSGElections,
            totalSSGVotesCast,
            pendingSSGElections: activeSSGElections - votedSSGElections
          }
        }
      })
    } catch (error) {
      console.error("Get SSG voting status error:", error)
      res.status(500).json({
        success: false,
        message: "Error fetching SSG voting status",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    }
  },

  // Get voter's departmental voting status
  getDepartmentalVotingStatus: async (req, res) => {
    try {
      const voterId = req.user.voterId || req.user.userId

      // Get voter info
      const voter = await Voter.findById(voterId)
        .populate('departmentId', 'departmentCode degreeProgram college')
        .select('-password -faceEncoding')

      if (!voter) {
        return res.status(404).json({
          success: false,
          message: "Voter not found"
        })
      }

      // Get active departmental elections for voter's department
      const currentDate = new Date()
      const currentTime = new Date().toTimeString().slice(0, 8)
      const activeDeptElections = await DepartmentalElection.find({
        departmentId: voter.departmentId._id,
        electionDate: { $lte: currentDate },
        status: "active",
        ballotOpenTime: { $lte: currentTime },
        ballotCloseTime: { $gte: currentTime }
      }).countDocuments()

      // Get departmental elections voter has participated in
      const votedDeptElections = await Ballot.find({
        voterId,
        deptElectionId: { $exists: true },
        isSubmitted: true
      }).countDocuments()

      // Get total departmental votes cast
      const totalDeptVotesCast = await Vote.find({
        ballotId: { $in: await Ballot.find({ 
          voterId, 
          deptElectionId: { $exists: true },
          isSubmitted: true 
        }).distinct('_id') }
      }).countDocuments()

      // Check if voter is eligible for departmental elections (must be registered and class officer)
      const isEligibleForDept = voter.isActive && voter.isRegistered && 
                               voter.isPasswordActive && !voter.isPasswordExpired() && voter.isClassOfficer
      const canViewDeptOnly = voter.isActive && voter.isRegistered && 
                             voter.isPasswordActive && !voter.isPasswordExpired() && !voter.isClassOfficer

      // Log system access
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: voterId, schoolId: voter.schoolId },
        "Accessed departmental voting status dashboard",
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
            department: voter.departmentId,
            yearLevel: voter.yearLevel,
            isClassOfficer: voter.isClassOfficer
          },
          votingStatus: {
            isEligible: isEligibleForDept,
            canVote: isEligibleForDept,
            canViewOnly: canViewDeptOnly,
            isActive: voter.isActive,
            isRegistered: voter.isRegistered,
            isClassOfficer: voter.isClassOfficer,
            passwordExpired: voter.isPasswordExpired(),
            passwordExpiresAt: voter.passwordExpiresAt
          },
          statistics: {
            activeDeptElections,
            votedDeptElections,
            totalDeptVotesCast,
            pendingDeptElections: activeDeptElections - votedDeptElections
          }
        }
      })
    } catch (error) {
      console.error("Get departmental voting status error:", error)
      res.status(500).json({
        success: false,
        message: "Error fetching departmental voting status",
        error: process.env.NODE_ENV === "development" ? error.message : {}
      })
    }
  }
}

module.exports = VotingController