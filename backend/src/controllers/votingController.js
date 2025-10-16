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
const PDFDocument = require('pdfkit')

class VotingController {
  // ===== SSG ELECTION VOTING METHODS =====

  // Get all active SSG elections that registered voters can participate in
  static async getActiveSSGElections(req, res, next) {
    try {
      const currentDate = new Date()
      
      // Get elections that are active and within voting time
      const activeElections = await SSGElection.find({
        status: "active",
        electionDate: { $lte: currentDate }
      })
      .populate('createdBy', 'username')
      .select('ssgElectionId electionYear title status electionDate ballotOpenTime ballotCloseTime totalVotes voterTurnout')
      .sort({ electionDate: 1 })

      // Filter elections by ballot time and check voting status
      const electionsWithVotingStatus = []
      
      for (const election of activeElections) {
        // Check if ballots are currently open
        const ballotStatus = this.checkBallotTime(election)
        
        if (ballotStatus.isOpen) {
          // Check if voter has already voted
          const existingBallot = await Ballot.findOne({
            ssgElectionId: election._id,
            voterId: req.user.voterId,
            isSubmitted: true
          })

          electionsWithVotingStatus.push({
            ...election.toObject(),
            hasVoted: !!existingBallot,
            votedAt: existingBallot?.submittedAt || null,
            ballotStatus: ballotStatus.status,
            timeRemaining: ballotStatus.timeRemaining
          })
        }
      }

      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.voterId, schoolId: req.user.schoolId },
        "Accessed active SSG elections list",
        req
      )

      res.json({
        success: true,
        data: electionsWithVotingStatus,
        message: electionsWithVotingStatus.length > 0 ? "Active SSG elections found" : "No active SSG elections available"
      })
    } catch (error) {
      console.error("Get active SSG elections error:", error)
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.voterId, schoolId: req.user.schoolId },
        `Failed to get active SSG elections: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Cast vote in SSG election - all positions at once
  static async castSSGVote(req, res, next) {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const { ssgElectionId, votes } = req.body
      const voterId = req.user.voterId

      // Validate input
      if (!ssgElectionId || !votes || !Array.isArray(votes)) {
        await session.abortTransaction()
        const error = new Error("Invalid vote data. SSG Election ID and votes array are required.")
        error.statusCode = 400
        return next(error)
      }

      // Get voter info
      const voter = await Voter.findById(voterId).session(session)
      if (!voter || !voter.isActive || !voter.isRegistered) {
        await session.abortTransaction()
        const error = new Error("Only registered voters can participate in SSG elections")
        error.statusCode = 403
        return next(error)
      }

      // Check SSG election
      const election = await SSGElection.findById(ssgElectionId).session(session)
      if (!election) {
        await session.abortTransaction()
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      if (election.status !== "active") {
        await session.abortTransaction()
        const error = new Error("SSG election is not currently active")
        error.statusCode = 400
        return next(error)
      }

      // Check ballot timing
      const ballotStatus = this.checkBallotTime(election)
      if (!ballotStatus.isOpen) {
        await session.abortTransaction()
        const error = new Error(ballotStatus.message || "Voting is not currently allowed")
        error.statusCode = 400
        return next(error)
      }

      // Check if already voted
      const existingBallot = await Ballot.findOne({
        ssgElectionId,
        voterId,
        isSubmitted: true
      }).session(session)

      if (existingBallot) {
        await session.abortTransaction()
        const error = new Error("You have already voted in this SSG election")
        error.statusCode = 400
        return next(error)
      }

      // Validate votes
      const validatedVotes = await this.validateSSGVotes(votes, ssgElectionId, session)
      
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

      await AuditLog.logVoterAction(
        "VOTED",
        { _id: voterId, schoolId: voter.schoolId },
        `Successfully cast ${voteRecords.length} votes in SSG election: ${election.title}`,
        req
      )

      res.json({
        success: true,
        message: "SSG vote cast successfully",
        data: {
          ballotId: savedBallot._id,
          ballotToken: savedBallot.ballotToken,
          submittedAt: savedBallot.submittedAt,
          voteCount: voteRecords.length,
          election: {
            id: election._id,
            title: election.title
          }
        }
      })

    } catch (error) {
      await session.abortTransaction()
      console.error("Cast SSG vote error:", error)
      
      if (req.user?.voterId) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: req.user.voterId, schoolId: req.user.schoolId },
          `SSG vote casting failed: ${error.message}`,
          req
        )
      }

      if (error.statusCode) {
        error.status = error.statusCode
      }
      next(error)
    } finally {
      session.endSession()
    }
  }

  // Get voter's SSG voting status
  static async getSSGVotingStatus(req, res, next) {
    try {
      const voterId = req.user.voterId

      // Get voter info
      const voter = await Voter.findById(voterId)
        .populate('departmentId', 'departmentCode degreeProgram college')
        .select('-password -faceEncoding')

      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      // Get active SSG elections count
      const activeSSGElections = await SSGElection.find({
        status: "active",
        electionDate: { $lte: new Date() }
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

      // Check eligibility
      const isEligibleForSSG = voter.isActive && voter.isRegistered && 
                              voter.isPasswordActive && !voter.isPasswordExpired()

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
            pendingSSGElections: Math.max(0, activeSSGElections - votedSSGElections)
          }
        }
      })
    } catch (error) {
      console.error("Get SSG voting status error:", error)
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.voterId, schoolId: req.user.schoolId },
        `Failed to get SSG voting status: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get voter's SSG voting history
  static async getMySSGVotes(req, res, next) {
    try {
      const voterId = req.user.voterId

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
          .populate('candidateId', 'candidateNumber')
          .populate({
            path: 'candidateId',
            populate: {
              path: 'voterId',
              select: 'firstName middleName lastName'
            }
          })
          .populate('positionId', 'positionName positionOrder')
          .sort({ 'positionId.positionOrder': 1 })

          return {
            ballotId: ballot._id,
            ballotToken: ballot.ballotToken,
            election: ballot.ssgElectionId,
            submittedAt: ballot.submittedAt,
            totalVotes: votes.length,
            votes: votes.map(vote => ({
              position: vote.positionId.positionName,
              positionOrder: vote.positionId.positionOrder,
              candidateNumber: vote.candidateId.candidateNumber,
              candidateName: vote.candidateId.voterId ? 
                `${vote.candidateId.voterId.firstName} ${vote.candidateId.voterId.middleName || ''} ${vote.candidateId.voterId.lastName}`.replace(/\s+/g, ' ').trim() : 
                'Unknown Candidate'
            }))
          }
        })
      )

      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.voterId, schoolId: req.user.schoolId },
        "Accessed SSG voting history",
        req
      )

      res.json({
        success: true,
        data: votingHistory,
        message: votingHistory.length > 0 ? `Found ${votingHistory.length} SSG voting records` : "No SSG voting history found"
      })
    } catch (error) {
      console.error("Get my SSG votes error:", error)
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.voterId, schoolId: req.user.schoolId },
        `Failed to get SSG voting history: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // ===== DEPARTMENTAL ELECTION VOTING METHODS =====

  // Get all active departmental elections for voter's department
  static async getActiveDepartmentalElections(req, res, next) {
    try {
      // Get voter info
      const voter = await Voter.findById(req.user.voterId)
        .populate('departmentId')
      
      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      const currentDate = new Date()
      const activeElections = await DepartmentalElection.find({
        departmentId: voter.departmentId._id,
        electionDate: { $lte: currentDate },
        status: "active"
      })
      .populate('createdBy', 'username')
      .populate('departmentId', 'departmentCode degreeProgram college')
      .sort({ electionDate: 1 })

      // Get voting status for each election
      const electionsWithVotingStatus = await Promise.all(
        activeElections.map(async (election) => {
          // Get current active position
          const currentPosition = await this.getCurrentActivePosition(election._id)
          
          let hasVotedForCurrentPosition = false
          let votedAt = null
          
          if (currentPosition) {
            const existingBallot = await Ballot.findOne({
              deptElectionId: election._id,
              voterId: req.user.voterId,
              currentPositionId: currentPosition._id,
              isSubmitted: true
            })
            
            hasVotedForCurrentPosition = !!existingBallot
            votedAt = existingBallot?.submittedAt || null
          }

          // Voting eligibility
          const canVote = voter.isRegistered && voter.isClassOfficer
          const canViewOnly = voter.isRegistered && !voter.isClassOfficer

          return {
            ...election.toObject(),
            currentPosition: currentPosition ? {
              _id: currentPosition._id,
              positionName: currentPosition.positionName,
              positionOrder: currentPosition.positionOrder,
              maxVotes: currentPosition.maxVotes
            } : null,
            hasVotedForCurrentPosition,
            votedAt,
            canVote,
            canViewOnly
          }
        })
      )

      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.voterId, schoolId: req.user.schoolId },
        `Accessed active departmental elections for department: ${voter.departmentId.departmentCode}`,
        req
      )

      res.json({
        success: true,
        data: electionsWithVotingStatus,
        voterInfo: {
          canVote: voter.isClassOfficer && voter.isRegistered,
          isClassOfficer: voter.isClassOfficer,
          department: voter.departmentId
        },
        message: electionsWithVotingStatus.length > 0 ? "Active departmental elections found" : "No active departmental elections available"
      })
    } catch (error) {
      console.error("Get active departmental elections error:", error)
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.voterId, schoolId: req.user.schoolId },
        `Failed to get active departmental elections: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Cast vote in departmental election - position by position
  static async castDepartmentalVote(req, res, next) {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const { deptElectionId, positionId, candidateId } = req.body
      const voterId = req.user.voterId

      // Validate input
      if (!deptElectionId || !positionId || !candidateId) {
        await session.abortTransaction()
        const error = new Error("Departmental Election ID, Position ID, and Candidate ID are required.")
        error.statusCode = 400
        return next(error)
      }

      // Get voter info
      const voter = await Voter.findById(voterId).populate('departmentId').session(session)
      if (!voter || !voter.isActive || !voter.isRegistered) {
        await session.abortTransaction()
        const error = new Error("Only registered voters can participate in departmental elections")
        error.statusCode = 403
        return next(error)
      }

      if (!voter.isClassOfficer) {
        await session.abortTransaction()
        const error = new Error("Only class officers can vote in departmental elections")
        error.statusCode = 403
        return next(error)
      }

      // Check departmental election
      const election = await DepartmentalElection.findById(deptElectionId)
        .populate('departmentId').session(session)
      if (!election) {
        await session.abortTransaction()
        const error = new Error("Departmental election not found")
        error.statusCode = 404
        return next(error)
      }

      // Verify same department
      if (!voter.departmentId._id.equals(election.departmentId._id)) {
        await session.abortTransaction()
        const error = new Error("You can only vote in elections for your department")
        error.statusCode = 403
        return next(error)
      }

      if (election.status !== "active") {
        await session.abortTransaction()
        const error = new Error("Departmental election is not currently active")
        error.statusCode = 400
        return next(error)
      }

      // Verify current active position
      const currentActivePosition = await this.getCurrentActivePosition(deptElectionId)
      if (!currentActivePosition || !currentActivePosition._id.equals(positionId)) {
        await session.abortTransaction()
        const error = new Error("This position is not currently open for voting")
        error.statusCode = 400
        return next(error)
      }

      // Check if already voted for this position
      const existingBallot = await Ballot.findOne({
        deptElectionId,
        voterId,
        currentPositionId: positionId,
        isSubmitted: true
      }).session(session)

      if (existingBallot) {
        await session.abortTransaction()
        const error = new Error("You have already voted for this position")
        error.statusCode = 400
        return next(error)
      }

      // Validate candidate
      const candidate = await Candidate.findOne({
        _id: candidateId,
        deptElectionId: deptElectionId,
        positionId: positionId,
        isActive: true
      }).session(session)

      if (!candidate) {
        await session.abortTransaction()
        const error = new Error("Invalid candidate for this position")
        error.statusCode = 400
        return next(error)
      }

      // Create ballot
      const ballot = new Ballot({
        deptElectionId,
        voterId,
        currentPositionId: positionId,
        ballotToken: uuidv4(),
        isSubmitted: true,
        submittedAt: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      })

      const savedBallot = await ballot.save({ session })

      // Create vote record
      const voteRecord = new Vote({
        ballotId: savedBallot._id,
        candidateId: candidateId,
        positionId: positionId,
        deptElectionId: deptElectionId,
        voteTimestamp: new Date()
      })

      await voteRecord.save({ session })

      // Update candidate vote count
      await Candidate.findByIdAndUpdate(
        candidateId,
        { $inc: { voteCount: 1 } },
        { session }
      )

      await session.commitTransaction()

      await AuditLog.logVoterAction(
        "VOTED",
        { _id: voterId, schoolId: voter.schoolId },
        `Successfully cast vote for ${currentActivePosition.positionName} in departmental election: ${election.title}`,
        req
      )

      res.json({
        success: true,
        message: "Departmental vote cast successfully",
        data: {
          ballotId: savedBallot._id,
          ballotToken: savedBallot.ballotToken,
          submittedAt: savedBallot.submittedAt,
          position: currentActivePosition.positionName,
          election: {
            id: election._id,
            title: election.title,
            department: election.departmentId.departmentCode
          }
        }
      })

    } catch (error) {
      await session.abortTransaction()
      console.error("Cast departmental vote error:", error)
      
      if (req.user?.voterId) {
        await AuditLog.logVoterAction(
          "BALLOT_ABANDONED",
          { _id: req.user.voterId, schoolId: req.user.schoolId },
          `Departmental vote casting failed: ${error.message}`,
          req
        )
      }

      if (error.statusCode) {
        error.status = error.statusCode
      }
      next(error)
    } finally {
      session.endSession()
    }
  }

  // Get voter's departmental voting history
  static async getMyDepartmentalVotes(req, res, next) {
    try {
      const voterId = req.user.voterId

      const ballots = await Ballot.find({
        voterId,
        deptElectionId: { $exists: true },
        isSubmitted: true
      })
      .populate({
        path: 'deptElectionId',
        select: 'deptElectionId title electionYear electionDate status',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })
      .populate('currentPositionId', 'positionName positionOrder')
      .sort({ submittedAt: -1 })

      const votingHistory = await Promise.all(
        ballots.map(async (ballot) => {
          const votes = await Vote.find({
            ballotId: ballot._id
          })
          .populate('candidateId', 'candidateNumber')
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
            position: ballot.currentPositionId,
            submittedAt: ballot.submittedAt,
            votes: votes.map(vote => ({
              position: vote.positionId.positionName,
              candidateNumber: vote.candidateId.candidateNumber,
              candidateName: vote.candidateId.voterId ? 
                `${vote.candidateId.voterId.firstName} ${vote.candidateId.voterId.middleName || ''} ${vote.candidateId.voterId.lastName}`.replace(/\s+/g, ' ').trim() : 
                'Unknown Candidate'
            }))
          }
        })
      )

      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.voterId, schoolId: req.user.schoolId },
        "Accessed departmental voting history",
        req
      )

      res.json({
        success: true,
        data: votingHistory,
        message: votingHistory.length > 0 ? `Found ${votingHistory.length} departmental voting records` : "No departmental voting history found"
      })
    } catch (error) {
      console.error("Get my departmental votes error:", error)
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.voterId, schoolId: req.user.schoolId },
        `Failed to get departmental voting history: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get voter's departmental voting status
  static async getDepartmentalVotingStatus(req, res, next) {
    try {
      const voterId = req.user.voterId

      // Get voter info
      const voter = await Voter.findById(voterId)
        .populate('departmentId', 'departmentCode degreeProgram college')
        .select('-password -faceEncoding')

      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      // Get active departmental elections for voter's department
      const activeDeptElections = await DepartmentalElection.find({
        departmentId: voter.departmentId._id,
        electionDate: { $lte: new Date() },
        status: "active"
      }).countDocuments()

      // Get unique departmental elections voter has participated in
      const votedDeptElectionIds = await Ballot.find({
        voterId,
        deptElectionId: { $exists: true },
        isSubmitted: true
      }).distinct('deptElectionId')

      const votedDeptElections = votedDeptElectionIds.length

      // Get total departmental votes cast
      const totalDeptVotesCast = await Vote.find({
        ballotId: { $in: await Ballot.find({ 
          voterId, 
          deptElectionId: { $exists: true },
          isSubmitted: true 
        }).distinct('_id') }
      }).countDocuments()

      // Check eligibility
      const isEligibleForDept = voter.isActive && voter.isRegistered && 
                               voter.isPasswordActive && !voter.isPasswordExpired() && voter.isClassOfficer
      const canViewDeptOnly = voter.isActive && voter.isRegistered && 
                             voter.isPasswordActive && !voter.isPasswordExpired() && !voter.isClassOfficer

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
            pendingDeptElections: Math.max(0, activeDeptElections - votedDeptElections)
          }
        }
      })
    } catch (error) {
      console.error("Get departmental voting status error:", error)
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        { _id: req.user.voterId, schoolId: req.user.schoolId },
        `Failed to get departmental voting status: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // ===== ELECTION DETAILS METHODS (FOR STAFF) =====

  // Get SSG election details with positions and candidates
  static async getSSGElectionDetails(req, res, next) {
    try {
      const { id } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid SSG election ID")
        error.statusCode = 400
        return next(error)
      }

      const election = await SSGElection.findById(id)
        .populate('createdBy', 'username')

      if (!election) {
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      // Get positions with candidates
      const positions = await Position.find({
        ssgElectionId: id,
        isActive: true
      }).sort({ positionOrder: 1 })

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
              campaignPicture: candidate.campaignPicture ? candidate.campaignPicture.toString('base64') : null,
              credentials: candidate.credentials ? candidate.credentials.toString('base64') : null
            }))
          }
        })
      )

      await AuditLog.logUserAction(
        "BALLOT_ACCESSED",
        req.user,
        `Accessed SSG election details for: ${election.title}`,
        req
      )

      res.json({
        success: true,
        data: {
          election,
          positions: positionsWithCandidates
        },
        message: "SSG election details retrieved successfully"
      })
    } catch (error) {
      console.error("Get SSG election details error:", error)
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to get SSG election details for ${req.params.id}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get SSG candidates for a specific election
  static async getSSGElectionCandidates(req, res, next) {
    try {
      const { id } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid SSG election ID")
        error.statusCode = 400
        return next(error)
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
      .populate('positionId', 'positionName positionOrder maxVotes')
      .populate('partylistId', 'partylistName')
      .sort({ 'positionId.positionOrder': 1, candidateNumber: 1 })

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Viewed SSG candidates for election ID: ${id}`,
        req
      )

      res.json({
        success: true,
        data: candidates.map(candidate => ({
          ...candidate.toObject(),
          campaignPicture: candidate.campaignPicture ? candidate.campaignPicture.toString('base64') : null,
          credentials: candidate.credentials ? candidate.credentials.toString('base64') : null
        })),
        message: `Found ${candidates.length} SSG candidates`
      })
    } catch (error) {
      console.error("Get SSG election candidates error:", error)
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to get SSG election candidates for ${req.params.id}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get departmental election details with positions and candidates
  static async getDepartmentalElectionDetails(req, res, next) {
    try {
      const { id } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid departmental election ID")
        error.statusCode = 400
        return next(error)
      }

      const election = await DepartmentalElection.findById(id)
        .populate('createdBy', 'username')
        .populate('departmentId', 'departmentCode degreeProgram college')

      if (!election) {
        const error = new Error("Departmental election not found")
        error.statusCode = 404
        return next(error)
      }

      // Get positions
      const positions = await Position.find({
        deptElectionId: id,
        isActive: true
      }).sort({ positionOrder: 1 })

      // Get current active position
      const currentActivePosition = await this.getCurrentActivePosition(id)

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
            isCurrentlyActive: currentActivePosition?._id.equals(position._id),
            candidates: candidates.map(candidate => ({
              ...candidate.toObject(),
              campaignPicture: candidate.campaignPicture ? candidate.campaignPicture.toString('base64') : null,
              credentials: candidate.credentials ? candidate.credentials.toString('base64') : null
            }))
          }
        })
      )

      await AuditLog.logUserAction(
        "BALLOT_ACCESSED",
        req.user,
        `Accessed departmental election details for: ${election.title}`,
        req
      )

      res.json({
        success: true,
        data: {
          election,
          positions: positionsWithCandidates,
          currentActivePosition
        },
        message: "Departmental election details retrieved successfully"
      })
    } catch (error) {
      console.error("Get departmental election details error:", error)
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to get departmental election details for ${req.params.id}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get departmental candidates for a specific election
  static async getDepartmentalElectionCandidates(req, res, next) {
    try {
      const { id } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid departmental election ID")
        error.statusCode = 400
        return next(error)
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
      .populate('positionId', 'positionName positionOrder maxVotes')
      .sort({ 'positionId.positionOrder': 1, candidateNumber: 1 })

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Viewed departmental candidates for election ID: ${id}`,
        req
      )

      res.json({
        success: true,
        data: candidates.map(candidate => ({
          ...candidate.toObject(),
          campaignPicture: candidate.campaignPicture ? candidate.campaignPicture.toString('base64') : null,
          credentials: candidate.credentials ? candidate.credentials.toString('base64') : null
        })),
        message: `Found ${candidates.length} departmental candidates`
      })
    } catch (error) {
      console.error("Get departmental election candidates error:", error)
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to get departmental election candidates for ${req.params.id}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // ===== HELPER METHODS =====

  // Check if ballot time is open for voting
  static checkBallotTime(election) {
    if (!election.ballotOpenTime || !election.ballotCloseTime) {
      return {
        isOpen: true,
        status: 'open',
        message: 'Voting is open'
      }
    }

    const now = new Date()
    const electionDate = new Date(election.electionDate)
    
    // Create datetime objects for open and close times
    const [openHours, openMinutes] = election.ballotOpenTime.split(':').map(Number)
    const [closeHours, closeMinutes] = election.ballotCloseTime.split(':').map(Number)
    
    const openDateTime = new Date(electionDate)
    openDateTime.setHours(openHours, openMinutes, 0, 0)
    
    const closeDateTime = new Date(electionDate)
    closeDateTime.setHours(closeHours, closeMinutes, 0, 0)

    if (now < openDateTime) {
      const timeDiff = openDateTime - now
      const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutesUntil = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      
      return {
        isOpen: false,
        status: 'scheduled',
        message: `Voting opens in ${hoursUntil}h ${minutesUntil}m`,
        timeRemaining: { hours: hoursUntil, minutes: minutesUntil }
      }
    }

    if (now > closeDateTime) {
      return {
        isOpen: false,
        status: 'closed',
        message: 'Voting has ended'
      }
    }

    // Currently open
    const timeDiff = closeDateTime - now
    const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60))
    const minutesRemaining = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
    
    return {
      isOpen: true,
      status: 'open',
      message: `Voting closes in ${hoursRemaining}h ${minutesRemaining}m`,
      timeRemaining: { hours: hoursRemaining, minutes: minutesRemaining }
    }
  }

  // Validate SSG votes (all positions at once)
  static async validateSSGVotes(votes, electionId, session) {
    const validatedVotes = []
    const positionIds = new Set()
    
    for (const vote of votes) {
      if (!vote.positionId || !vote.candidateId) {
        throw new Error("Invalid vote structure. Position ID and candidate ID are required.")
      }

      // Check for duplicate position votes
      if (positionIds.has(vote.positionId.toString())) {
        throw new Error("Duplicate votes for the same position are not allowed")
      }
      positionIds.add(vote.positionId.toString())

      // Validate position
      const position = await Position.findOne({
        _id: vote.positionId,
        ssgElectionId: electionId,
        isActive: true
      }).session(session)

      if (!position) {
        throw new Error(`Invalid position: ${vote.positionId}`)
      }

      // Validate candidate
      const candidate = await Candidate.findOne({
        _id: vote.candidateId,
        ssgElectionId: electionId,
        positionId: vote.positionId,
        isActive: true
      }).session(session)

      if (!candidate) {
        throw new Error(`Invalid candidate: ${vote.candidateId} for position: ${vote.positionId}`)
      }

      validatedVotes.push({
        positionId: vote.positionId,
        candidateId: vote.candidateId
      })
    }

    return validatedVotes
  }

  // Get current active position for departmental elections
  static async getCurrentActivePosition(deptElectionId) {
    // Get the first position by order that is currently accepting votes
    // This would be controlled by election committee in real implementation
    return await Position.findOne({
      deptElectionId,
      isActive: true
    }).sort({ positionOrder: 1 })
  }

  // Additional helper method to manage departmental position flow
  static async activateNextDepartmentalPosition(deptElectionId, currentPositionId) {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      // Get current position
      const currentPosition = await Position.findById(currentPositionId).session(session)
      if (!currentPosition) {
        throw new Error("Current position not found")
      }

      // Find next position by order
      const nextPosition = await Position.findOne({
        deptElectionId,
        positionOrder: { $gt: currentPosition.positionOrder },
        isActive: false
      }).sort({ positionOrder: 1 }).session(session)

      if (nextPosition) {
        // Deactivate current position (optional - for strict position-by-position flow)
        // currentPosition.isActive = false
        // await currentPosition.save({ session })

        // Activate next position
        nextPosition.isActive = true
        await nextPosition.save({ session })
      }

      await session.commitTransaction()
      return nextPosition
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

// Get live SSG election results/vote counts
static async getSSGElectionLiveResults(req, res, next) {
  try {
    const { id } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid SSG election ID")
      error.statusCode = 400
      return next(error)
    }

    const election = await SSGElection.findById(id)
    if (!election) {
      const error = new Error("SSG election not found")
      error.statusCode = 404
      return next(error)
    }

    // Get positions with live vote counts
    const positions = await Position.find({
      ssgElectionId: id,
      isActive: true
    }).sort({ positionOrder: 1 })

    const liveResults = await Promise.all(
      positions.map(async (position) => {
        const candidates = await Candidate.find({
          ssgElectionId: id,
          positionId: position._id,
          isActive: true
        })
        .populate({
          path: 'voterId',
          select: 'firstName middleName lastName schoolId'
        })
        .populate('partylistId', 'partylistName')
        .sort({ candidateNumber: 1 })

        // Get live vote counts
        const candidatesWithVotes = await Promise.all(
          candidates.map(async (candidate) => {
            const voteCount = await Vote.countDocuments({
              candidateId: candidate._id,
              ssgElectionId: id
            })

            return {
              ...candidate.toObject(),
              voteCount,
              percentage: 0 // Will be calculated after getting total votes
            }
          })
        )

        // Calculate total votes for this position
        const totalVotes = candidatesWithVotes.reduce((sum, candidate) => sum + candidate.voteCount, 0)

        // Calculate percentages
        candidatesWithVotes.forEach(candidate => {
          candidate.percentage = totalVotes > 0 ? 
            Math.round((candidate.voteCount / totalVotes) * 100) : 0
        })

        // Sort by vote count (descending)
        candidatesWithVotes.sort((a, b) => b.voteCount - a.voteCount)

        return {
          position: {
            _id: position._id,
            positionName: position.positionName,
            positionOrder: position.positionOrder,
            maxVotes: position.maxVotes
          },
          candidates: candidatesWithVotes,
          totalVotes,
          winner: candidatesWithVotes[0] || null
        }
      })
    )

    // Get total ballots submitted
    const totalBallots = await Ballot.countDocuments({
      ssgElectionId: id,
      isSubmitted: true
    })

    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Accessed live results for SSG election: ${election.title}`,
      req
    )

    res.json({
      success: true,
      data: {
        election: {
          _id: election._id,
          title: election.title,
          status: election.status,
          electionDate: election.electionDate
        },
        positions: liveResults,
        summary: {
          totalBallots,
          totalPositions: positions.length,
          lastUpdated: new Date()
        }
      },
      message: "Live SSG election results retrieved successfully"
    })
  } catch (error) {
    console.error("Get SSG live results error:", error)
    next(error)
  }
}

static async getDepartmentalElectionLiveResults(req, res, next) {
  try {
    const { id } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid departmental election ID")
      error.statusCode = 400
      return next(error)
    }

    const election = await DepartmentalElection.findById(id)
      .populate('departmentId', 'departmentCode degreeProgram college')
    if (!election) {
      const error = new Error("Departmental election not found")
      error.statusCode = 404
      return next(error)
    }

    // Get total participants for this departmental election
    const ElectionParticipation = require('../models/ElectionParticipation')
    const totalParticipants = await ElectionParticipation.countDocuments({
      deptElectionId: id,
      status: 'confirmed'
    })

    // Get ALL positions
    const positions = await Position.find({
      deptElectionId: id,
      isActive: true
    }).sort({ positionOrder: 1 })

    // Helper function to extract allowed year levels from position description
    const getAllowedYearLevels = (position) => {
      if (!position.description) return [1, 2, 3, 4]

      const yearLevelMatch = position.description.match(/Year levels?: (.*?)(?:\n|$)/)
      if (!yearLevelMatch) return [1, 2, 3, 4]

      const restrictionText = yearLevelMatch[1]
      if (restrictionText.includes('All year levels')) return [1, 2, 3, 4]

      const allowedLevels = []
      if (restrictionText.includes('1st')) allowedLevels.push(1)
      if (restrictionText.includes('2nd')) allowedLevels.push(2)
      if (restrictionText.includes('3rd')) allowedLevels.push(3)
      if (restrictionText.includes('4th')) allowedLevels.push(4)

      return allowedLevels.length > 0 ? allowedLevels : [1, 2, 3, 4]
    }

    // Get participants grouped by year level
    const participantsByYearLevel = await ElectionParticipation.aggregate([
      { 
        $match: { 
          deptElectionId: new mongoose.Types.ObjectId(id),
          status: 'confirmed'
        } 
      },
      {
        $lookup: {
          from: 'voters',
          localField: 'voterId',
          foreignField: '_id',
          as: 'voter'
        }
      },
      { $unwind: '$voter' },
      {
        $group: {
          _id: '$voter.yearLevel',
          count: { $sum: 1 }
        }
      }
    ])

    const yearLevelCounts = {}
    participantsByYearLevel.forEach(item => {
      yearLevelCounts[item._id] = item.count
    })

    const positionsWithResults = await Promise.all(
      positions.map(async (position) => {
        const now = new Date()
        const isBallotOpen = position.ballotOpenTime && position.ballotCloseTime &&
                            now >= position.ballotOpenTime && now <= position.ballotCloseTime

        // Get allowed year levels and calculate eligible participants
        const allowedYearLevels = getAllowedYearLevels(position)
        const eligibleParticipants = allowedYearLevels.reduce((sum, yearLevel) => {
          return sum + (yearLevelCounts[yearLevel] || 0)
        }, 0)

        // ✅ FIX: Calculate max possible votes = eligible participants × maxVotes
        const maxPossibleVotes = eligibleParticipants * (position.maxVotes || 1)

        const candidates = await Candidate.find({
          deptElectionId: id,
          positionId: position._id,
          isActive: true
        })
        .populate({
          path: 'voterId',
          select: 'firstName middleName lastName schoolId yearLevel'
        })
        .sort({ candidateNumber: 1 })

        const candidatesWithVotes = await Promise.all(
          candidates.map(async (candidate) => {
            const voteCount = await Vote.countDocuments({
              candidateId: candidate._id,
              deptElectionId: id,
              positionId: position._id
            })

            return {
              ...candidate.toObject(),
              voteCount,
              percentage: 0
            }
          })
        )

        const totalVotes = candidatesWithVotes.reduce((sum, candidate) => sum + candidate.voteCount, 0)
        
        // ✅ FIX: Calculate percentage based on MAX POSSIBLE VOTES
        candidatesWithVotes.forEach(candidate => {
          candidate.percentage = maxPossibleVotes > 0 ? 
            Math.round((candidate.voteCount / maxPossibleVotes) * 100) : 0
        })

        candidatesWithVotes.sort((a, b) => b.voteCount - a.voteCount)

        return {
          position: {
            _id: position._id,
            positionName: position.positionName,
            positionOrder: position.positionOrder,
            maxVotes: position.maxVotes,
            ballotOpenTime: position.ballotOpenTime ? position.ballotOpenTime.toISOString() : null,
            ballotCloseTime: position.ballotCloseTime ? position.ballotCloseTime.toISOString() : null,
            isBallotOpen
          },
          candidates: candidatesWithVotes,
          totalVotes,
          totalParticipants: eligibleParticipants,
          maxPossibleVotes, // ✅ ADD: Include for reference
          allowedYearLevels
        }
      })
    )

    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Accessed live results for departmental election: ${election.title}`,
      req
    )

    res.json({
      success: true,
      data: {
        election,
        positions: positionsWithResults,
        totalParticipants,
        summary: {
          totalPositions: positions.length,
          lastUpdated: new Date()
        }
      },
      message: "Departmental election live results retrieved successfully"
    })
  } catch (error) {
    console.error("Get departmental live results error:", error)
    next(error)
  }
}

// Get live SSG election results for voters (read-only)
static async getSSGElectionLiveResultsForVoter(req, res, next) {
  try {
    const { id } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid SSG election ID")
      error.statusCode = 400
      return next(error)
    }

    // Check if voter is registered (only registered voters can view results)
    const voter = await Voter.findById(req.user.voterId)
    if (!voter || !voter.isRegistered) {
      const error = new Error("Only registered voters can view election results")
      error.statusCode = 403
      return next(error)
    }

    const election = await SSGElection.findById(id)
    if (!election) {
      const error = new Error("SSG election not found")
      error.statusCode = 404
      return next(error)
    }

    // Only show results if election is completed or voter has already voted
    const hasVoted = await Ballot.findOne({
      ssgElectionId: id,
      voterId: req.user.voterId,
      isSubmitted: true
    })

    if (election.status !== 'completed' && !hasVoted) {
      return res.json({
        success: false,
        message: "Results are only available after you have voted or when the election is completed",
        data: { canViewResults: false }
      })
    }

    // Get positions with vote counts (same logic as staff but filtered for voter viewing)
    const positions = await Position.find({
      ssgElectionId: id,
      isActive: true
    }).sort({ positionOrder: 1 })

    const liveResults = await Promise.all(
      positions.map(async (position) => {
        const candidates = await Candidate.find({
          ssgElectionId: id,
          positionId: position._id,
          isActive: true
        })
        .populate({
          path: 'voterId',
          select: 'firstName middleName lastName'
        })
        .populate('partylistId', 'partylistName')
        .sort({ candidateNumber: 1 })

        const candidatesWithVotes = await Promise.all(
          candidates.map(async (candidate) => {
            const voteCount = await Vote.countDocuments({
              candidateId: candidate._id,
              ssgElectionId: id
            })

            return {
              _id: candidate._id,
              candidateNumber: candidate.candidateNumber,
              name: candidate.voterId ? 
                `${candidate.voterId.firstName} ${candidate.voterId.middleName || ''} ${candidate.voterId.lastName}`.replace(/\s+/g, ' ').trim() : 
                'Unknown Candidate',
              partylist: candidate.partylistId?.partylistName || 'Independent',
              voteCount,
              percentage: 0
            }
          })
        )

        const totalVotes = candidatesWithVotes.reduce((sum, candidate) => sum + candidate.voteCount, 0)
        
        candidatesWithVotes.forEach(candidate => {
          candidate.percentage = totalVotes > 0 ? 
            Math.round((candidate.voteCount / totalVotes) * 100) : 0
        })

        candidatesWithVotes.sort((a, b) => b.voteCount - a.voteCount)

        return {
          position: {
            _id: position._id,
            positionName: position.positionName,
            positionOrder: position.positionOrder
          },
          candidates: candidatesWithVotes,
          totalVotes,
          leading: candidatesWithVotes[0] || null
        }
      })
    )

    await AuditLog.logVoterAction(
      "SYSTEM_ACCESS",
      { _id: req.user.voterId, schoolId: req.user.schoolId },
      `Viewed live results for SSG election: ${election.title}`,
      req
    )

    res.json({
      success: true,
      data: {
        election: {
          _id: election._id,
          title: election.title,
          status: election.status,
          electionDate: election.electionDate
        },
        positions: liveResults,
        viewerInfo: {
          hasVoted: !!hasVoted,
          votedAt: hasVoted?.submittedAt || null
        }
      },
      message: "SSG election results retrieved successfully"
    })
  } catch (error) {
    console.error("Get SSG live results for voter error:", error)
    next(error)
  }
}

// Get live departmental election results for voters (read-only)
static async getDepartmentalElectionLiveResultsForVoter(req, res, next) {
  try {
    const { id } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid departmental election ID")
      error.statusCode = 400
      return next(error)
    }

    const voter = await Voter.findById(req.user.voterId).populate('departmentId')
    if (!voter || !voter.isRegistered) {
      const error = new Error("Only registered voters can view election results")
      error.statusCode = 403
      return next(error)
    }

    const election = await DepartmentalElection.findById(id).populate('departmentId', 'departmentCode degreeProgram college')
    if (!election) {
      const error = new Error("Departmental election not found")
      error.statusCode = 404
      return next(error)
    }

    const isFromSameDepartment = voter.departmentId._id.equals(election.departmentId._id)
    
    if (!voter.isRegistered || !voter.isPasswordActive) {
      const error = new Error("You must be a registered voter with an active password")
      error.statusCode = 403
      return next(error)
    }
    
    if (!isFromSameDepartment) {
      const error = new Error(`This election is for ${election.departmentId.departmentCode} department. You belong to ${voter.departmentId.departmentCode} department.`)
      error.statusCode = 403
      return next(error)
    }

    // Get total participants for this departmental election
    const ElectionParticipation = require('../models/ElectionParticipation')
    const totalParticipants = await ElectionParticipation.countDocuments({
      deptElectionId: id,
      status: 'confirmed'
    })

    // Get ALL positions
    const positions = await Position.find({
      deptElectionId: id,
      isActive: true
    }).sort({ positionOrder: 1 })

    // Helper function to extract allowed year levels 
    const getAllowedYearLevels = (position) => {
      if (!position.description) return [1, 2, 3, 4] // Default: all years

      const yearLevelMatch = position.description.match(/Year levels?: (.*?)(?:\n|$)/)
      if (!yearLevelMatch) return [1, 2, 3, 4]

      const restrictionText = yearLevelMatch[1]
      if (restrictionText.includes('All year levels')) return [1, 2, 3, 4]

      const allowedLevels = []
      if (restrictionText.includes('1st')) allowedLevels.push(1)
      if (restrictionText.includes('2nd')) allowedLevels.push(2)
      if (restrictionText.includes('3rd')) allowedLevels.push(3)
      if (restrictionText.includes('4th')) allowedLevels.push(4)

      return allowedLevels.length > 0 ? allowedLevels : [1, 2, 3, 4]
    }

    // Get participants grouped by year level for this election
    const participantsByYearLevel = await ElectionParticipation.aggregate([
      { 
        $match: { 
          deptElectionId: new mongoose.Types.ObjectId(id),
          status: 'confirmed'
        } 
      },
      {
        $lookup: {
          from: 'voters',
          localField: 'voterId',
          foreignField: '_id',
          as: 'voter'
        }
      },
      { $unwind: '$voter' },
      {
        $group: {
          _id: '$voter.yearLevel',
          count: { $sum: 1 }
        }
      }
    ])

    // Create a map of year level -> participant count
    const yearLevelCounts = {}
    participantsByYearLevel.forEach(item => {
      yearLevelCounts[item._id] = item.count
    })

    // Process each position with timing info and year-level-based percentages
    const positionsWithResults = await Promise.all(
      positions.map(async (position) => {
        // Check if ballot is currently open for this position
        const now = new Date()
        const isBallotOpen = position.ballotOpenTime && position.ballotCloseTime &&
                            now >= position.ballotOpenTime && now <= position.ballotCloseTime

        // Get allowed year levels for this position
        const allowedYearLevels = getAllowedYearLevels(position)
        
        // Calculate eligible participants for this position (based on year level restrictions)
        const eligibleParticipants = allowedYearLevels.reduce((sum, yearLevel) => {
          return sum + (yearLevelCounts[yearLevel] || 0)
        }, 0)

        // Get candidates for this position
        const candidates = await Candidate.find({
          deptElectionId: id,
          positionId: position._id,
          isActive: true
        })
        .populate({
          path: 'voterId',
          select: 'firstName middleName lastName yearLevel'
        })
        .sort({ candidateNumber: 1 })

        const candidatesWithVotes = await Promise.all(
          candidates.map(async (candidate) => {
            const voteCount = await Vote.countDocuments({
              candidateId: candidate._id,
              deptElectionId: id,
              positionId: position._id
            })

            return {
              _id: candidate._id,
              candidateNumber: candidate.candidateNumber,
              // Only show name if ballot is closed
              name: !isBallotOpen && candidate.voterId ? 
                `${candidate.voterId.firstName} ${candidate.voterId.middleName || ''} ${candidate.voterId.lastName}`.replace(/\s+/g, ' ').trim() : 
                null,
              yearLevel: !isBallotOpen ? candidate.voterId?.yearLevel : null,
              voteCount,
              percentage: 0
            }
          })
        )

        const totalVotes = candidatesWithVotes.reduce((sum, candidate) => sum + candidate.voteCount, 0)
        
        // Calculate percentage based on ELIGIBLE participants for this position
        candidatesWithVotes.forEach(candidate => {
          candidate.percentage = eligibleParticipants > 0 ? 
            Math.round((candidate.voteCount / eligibleParticipants) * 100) : 0
        })

        candidatesWithVotes.sort((a, b) => b.voteCount - a.voteCount)

        return {
          _id: position._id,
          positionName: position.positionName,
          positionOrder: position.positionOrder,
          maxVotes: position.maxVotes,
          ballotOpenTime: position.ballotOpenTime ? position.ballotOpenTime.toISOString() : null,
          ballotCloseTime: position.ballotCloseTime ? position.ballotCloseTime.toISOString() : null,
          isBallotOpen,
          candidates: candidatesWithVotes,
          totalVotes,
          totalParticipants: eligibleParticipants, // Use eligible participants for this position
          allowedYearLevels // Include for transparency
        }
      })
    )

    await AuditLog.logVoterAction(
      "SYSTEM_ACCESS",
      { _id: req.user.voterId, schoolId: req.user.schoolId },
      `Viewed live results for departmental election: ${election.title}`,
      req
    )

    res.json({
      success: true,
      data: {
        election,
        positions: positionsWithResults,
        totalParticipants, // Overall participants
        viewerInfo: {
          hasVoted: false,
          votedAt: null
        }
      },
      message: "Departmental election results retrieved successfully"
    })
  } catch (error) {
    console.error("Get departmental live results for voter error:", error)
    next(error)
  }
}

// Get SSG election results by department
static async getSSGElectionResultsByDepartment(req, res, next) {
  try {
    const { id } = req.params
    const { departmentId } = req.query
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid SSG election ID")
      error.statusCode = 400
      return next(error)
    }

    if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
      const error = new Error("Invalid department ID")
      error.statusCode = 400
      return next(error)
    }

    const election = await SSGElection.findById(id)
    if (!election) {
      const error = new Error("SSG election not found")
      error.statusCode = 404
      return next(error)
    }

    // Get department info
    const department = await Department.findById(departmentId)
    if (!department) {
      const error = new Error("Department not found")
      error.statusCode = 404
      return next(error)
    }

    // Get positions for this election
    const positions = await Position.find({
      ssgElectionId: id,
      isActive: true
    }).sort({ positionOrder: 1 })

    const departmentResults = await Promise.all(
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
        .populate('partylistId', 'partylistName')
        .sort({ candidateNumber: 1 })

        // Get vote counts filtered by department
        const candidatesWithDeptVotes = await Promise.all(
          candidates.map(async (candidate) => {
            // Get ballots from voters in the specific department
            const departmentBallots = await Ballot.find({
              ssgElectionId: id,
              isSubmitted: true,
              voterId: { 
                $in: await Voter.find({ departmentId }).distinct('_id') 
              }
            }).distinct('_id')

            // Count votes from those ballots for this candidate
            const deptVoteCount = await Vote.countDocuments({
              candidateId: candidate._id,
              ssgElectionId: id,
              ballotId: { $in: departmentBallots }
            })

            // Get total vote count
            const totalVoteCount = await Vote.countDocuments({
              candidateId: candidate._id,
              ssgElectionId: id
            })

            return {
              ...candidate.toObject(),
              departmentVoteCount: deptVoteCount,
              totalVoteCount: totalVoteCount,
              percentage: 0 // Will calculate after
            }
          })
        )

        // Calculate total department votes for this position
        const totalDeptVotes = candidatesWithDeptVotes.reduce(
          (sum, candidate) => sum + candidate.departmentVoteCount, 0
        )

        // Calculate percentages
        candidatesWithDeptVotes.forEach(candidate => {
          candidate.percentage = totalDeptVotes > 0 ? 
            Math.round((candidate.departmentVoteCount / totalDeptVotes) * 100) : 0
        })

        // Sort by department vote count
        candidatesWithDeptVotes.sort((a, b) => b.departmentVoteCount - a.departmentVoteCount)

        return {
          position: {
            _id: position._id,
            positionName: position.positionName,
            positionOrder: position.positionOrder,
            maxVotes: position.maxVotes
          },
          candidates: candidatesWithDeptVotes,
          totalDepartmentVotes: totalDeptVotes,
          leading: candidatesWithDeptVotes[0] || null
        }
      })
    )

    // Get total ballots from this department
    const totalDeptBallots = await Ballot.countDocuments({
      ssgElectionId: id,
      isSubmitted: true,
      voterId: { 
        $in: await Voter.find({ departmentId }).distinct('_id') 
      }
    })

    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Accessed department-filtered SSG results for ${department.departmentCode}: ${election.title}`,
      req
    )

    res.json({
      success: true,
      data: {
        election: {
          _id: election._id,
          title: election.title,
          status: election.status,
          electionDate: election.electionDate
        },
        department: {
          _id: department._id,
          departmentCode: department.departmentCode,
          degreeProgram: department.degreeProgram,
          college: department.college
        },
        positions: departmentResults,
        summary: {
          totalDepartmentBallots: totalDeptBallots,
          totalPositions: positions.length,
          lastUpdated: new Date()
        }
      },
      message: `Department-filtered results for ${department.departmentCode} retrieved successfully`
    })
  } catch (error) {
    console.error("Get SSG department results error:", error)
    next(error)
  }
}

// Export SSG election results as PDF data
static async exportSSGElectionResults(req, res, next) {
  try {
    const { id } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid SSG election ID")
      error.statusCode = 400
      return next(error)
    }

    const election = await SSGElection.findById(id)
    if (!election) {
      const error = new Error("SSG election not found")
      error.statusCode = 404
      return next(error)
    }

    // Get positions with candidates and vote counts
    const positions = await Position.find({
      ssgElectionId: id,
      isActive: true
    }).sort({ positionOrder: 1 })

    const exportData = await Promise.all(
      positions.map(async (position) => {
        const candidates = await Candidate.find({
          ssgElectionId: id,
          positionId: position._id,
          isActive: true
        })
        .populate({
          path: 'voterId',
          select: 'firstName middleName lastName schoolId'
        })
        .populate('partylistId', 'partylistName')
        .sort({ candidateNumber: 1 })

        const candidatesWithVotes = await Promise.all(
          candidates.map(async (candidate) => {
            const voteCount = await Vote.countDocuments({
              candidateId: candidate._id,
              ssgElectionId: id
            })

            const candidateName = candidate.voterId ? 
              `${candidate.voterId.firstName} ${candidate.voterId.middleName || ''} ${candidate.voterId.lastName}`.replace(/\s+/g, ' ').trim() : 
              'Unknown Candidate'

            return {
              candidateNumber: candidate.candidateNumber,
              candidateName: candidateName,
              schoolId: candidate.voterId?.schoolId || 'N/A',
              partylist: candidate.partylistId?.partylistName || 'Independent',
              voteCount: voteCount
            }
          })
        )

        candidatesWithVotes.sort((a, b) => b.voteCount - a.voteCount)

        return {
          positionName: position.positionName,
          positionOrder: position.positionOrder,
          maxVotes: position.maxVotes,
          candidates: candidatesWithVotes,
          totalVotes: candidatesWithVotes.reduce((sum, c) => sum + c.voteCount, 0)
        }
      })
    )

    // Get statistics
    const totalBallots = await Ballot.countDocuments({
      ssgElectionId: id,
      isSubmitted: true
    })

    const totalVotes = await Vote.countDocuments({ ssgElectionId: id })
    const totalCandidates = await Candidate.countDocuments({ 
      ssgElectionId: id, 
      isActive: true 
    })
    
    const totalParticipants = totalBallots

    // Create PDF
    const doc = new PDFDocument({ 
      margin: 50, 
      size: 'LETTER',
      bufferPages: true
    })
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="SSG_Election_Statistics_${election.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`)
    
    doc.pipe(res)

    // HEADER
    doc.fontSize(20).font('Helvetica-Bold')
    doc.text('SSG ELECTION RESULTS REPORT', { align: 'center' })
    doc.moveDown(1.5)
    
    // ELECTION DETAILS BOX
    doc.fontSize(11).font('Helvetica')
    const detailsY = doc.y
    doc.rect(50, detailsY, 512, 110).stroke()
    
    doc.text(`Election: ${election.title}`, 60, detailsY + 10)
    doc.text(`Year: ${election.electionYear}`, 60, detailsY + 30)
    doc.text(`Date: ${new Date(election.electionDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, 60, detailsY + 50)
    doc.text(`Status: ${election.status.toUpperCase()}`, 60, detailsY + 70)
    doc.text(`Generated: ${new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })}`, 60, detailsY + 90)
    
    doc.y = detailsY + 120
    doc.moveDown(1)

    // ELECTION SUMMARY BOX
    doc.fontSize(12).font('Helvetica-Bold')
    const summaryY = doc.y
    
    doc.fillColor('#2c3e50')
    doc.rect(50, summaryY, 512, 25).fill()
    doc.fillColor('#ffffff')
    doc.text('ELECTION SUMMARY', 60, summaryY + 7)
    
    doc.fillColor('#000000')
    doc.rect(50, summaryY + 25, 512, 80).stroke()
    
    doc.fontSize(11).font('Helvetica')
    doc.text(`Total Ballots Submitted: ${totalBallots.toLocaleString()}`, 60, summaryY + 35)
    doc.text(`Total Election Participants: ${totalParticipants.toLocaleString()}`, 60, summaryY + 55)
    doc.text(`Voter Turnout: ${totalBallots.toLocaleString()}`, 60, summaryY + 75)
    doc.text(`Total Candidates: ${totalCandidates.toLocaleString()}`, 60, summaryY + 95)
    
    doc.y = summaryY + 115
    doc.moveDown(1.5)

    // RESULTS BY POSITION
    doc.fontSize(14).font('Helvetica-Bold')
    doc.text('RESULTS BY POSITION', { underline: true })
    doc.moveDown(1)

    // Helper function to draw table header
    const drawTableHeader = (startY) => {
      const tableWidth = 512
      const rowHeight = 25
      const columnWidths = {
        rank: 40,
        candidateNum: 70,
        name: 180,
        partylist: 100,
        votes: 65,
        percentage: 57
      }

      doc.fillColor('#2c3e50')
      doc.rect(50, startY, tableWidth, rowHeight).fill()
      
      doc.strokeColor('#000000').lineWidth(1)
      doc.rect(50, startY, tableWidth, rowHeight).stroke()
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
      let currentX = 50
      
      doc.text('Rank', currentX, startY + 8, { width: columnWidths.rank, align: 'center' })
      currentX += columnWidths.rank
      doc.moveTo(currentX, startY).lineTo(currentX, startY + rowHeight).stroke()
      
      doc.text('Candidate #', currentX + 5, startY + 8, { width: columnWidths.candidateNum - 10, align: 'center' })
      currentX += columnWidths.candidateNum
      doc.moveTo(currentX, startY).lineTo(currentX, startY + rowHeight).stroke()
      
      doc.text('Name', currentX + 5, startY + 8, { width: columnWidths.name - 10, align: 'left' })
      currentX += columnWidths.name
      doc.moveTo(currentX, startY).lineTo(currentX, startY + rowHeight).stroke()
      
      doc.text('Partylist', currentX + 5, startY + 8, { width: columnWidths.partylist - 10, align: 'left' })
      currentX += columnWidths.partylist
      doc.moveTo(currentX, startY).lineTo(currentX, startY + rowHeight).stroke()
      
      doc.text('Votes', currentX + 5, startY + 8, { width: columnWidths.votes - 10, align: 'center' })
      currentX += columnWidths.votes
      doc.moveTo(currentX, startY).lineTo(currentX, startY + rowHeight).stroke()
      
      doc.text('%', currentX + 5, startY + 8, { width: columnWidths.percentage - 10, align: 'center' })
      
      return { rowHeight, columnWidths, tableWidth }
    }

    exportData.forEach((position, posIndex) => {
      // Check if we need a new page for position header (need ~150px minimum)
      if (doc.y > 620) {
        doc.addPage()
      }

      // Position header
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000')
      doc.text(`${position.positionOrder}. ${position.positionName}`, 50, doc.y)
      doc.fontSize(10).font('Helvetica')
      doc.text(`Total Votes for this position: ${position.totalVotes.toLocaleString()}`, 50, doc.y + 5)
      doc.moveDown(0.8)

      // Draw table
      const tableTop = doc.y
      const { rowHeight, columnWidths, tableWidth } = drawTableHeader(tableTop)
      let currentY = tableTop + rowHeight

      // Candidate rows
      doc.font('Helvetica').fillColor('#000000')
      position.candidates.forEach((candidate, idx) => {
        // Check for page break (need at least 25px for one row)
        if (currentY > 720) {
          doc.addPage()
          currentY = 50
          drawTableHeader(currentY)
          currentY += rowHeight
        }

        const percentage = position.totalVotes > 0 ? 
          ((candidate.voteCount / position.totalVotes) * 100).toFixed(1) : '0.0'

        doc.fillColor('#ffffff')
        doc.rect(50, currentY, tableWidth, rowHeight).fill()
        
        doc.strokeColor('#cccccc').lineWidth(0.5)
        doc.rect(50, currentY, tableWidth, rowHeight).stroke()
        
        doc.fontSize(9).font('Helvetica').fillColor('#000000')
        let currentX = 50
        
        doc.text((idx + 1).toString(), currentX, currentY + 8, { width: columnWidths.rank, align: 'center' })
        currentX += columnWidths.rank
        doc.moveTo(currentX, currentY).lineTo(currentX, currentY + rowHeight).stroke()
        
        doc.text(`#${candidate.candidateNumber}`, currentX + 5, currentY + 8, { width: columnWidths.candidateNum - 10, align: 'left' })
        currentX += columnWidths.candidateNum
        doc.moveTo(currentX, currentY).lineTo(currentX, currentY + rowHeight).stroke()
        
        doc.text(candidate.candidateName, currentX + 5, currentY + 8, { 
          width: columnWidths.name - 10, 
          ellipsis: true,
          align: 'left'
        })
        currentX += columnWidths.name
        doc.moveTo(currentX, currentY).lineTo(currentX, currentY + rowHeight).stroke()
        
        doc.text(candidate.partylist, currentX + 5, currentY + 8, { 
          width: columnWidths.partylist - 10,
          ellipsis: true,
          align: 'left'
        })
        currentX += columnWidths.partylist
        doc.moveTo(currentX, currentY).lineTo(currentX, currentY + rowHeight).stroke()
        
        doc.text(candidate.voteCount.toLocaleString(), currentX + 5, currentY + 8, { 
          width: columnWidths.votes - 10,
          align: 'center'
        })
        currentX += columnWidths.votes
        doc.moveTo(currentX, currentY).lineTo(currentX, currentY + rowHeight).stroke()
        
        doc.text(`${percentage}%`, currentX + 5, currentY + 8, { 
          width: columnWidths.percentage - 10,
          align: 'center'
        })

        currentY += rowHeight
      })

      doc.y = currentY
      
      // Only add spacing between positions if not last AND have room
      if (posIndex < exportData.length - 1) {
        if (doc.y < 650) {
          doc.moveDown(1.5)
        }
      }
    })

    // Add footer to all pages at the end
    const range = doc.bufferedPageRange()
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i)
      
      // Save current position
      const currentY = doc.y
      
      doc.fontSize(8).font('Helvetica').fillColor('#666666')
      doc.text(
        'This is an official election results report generated by the election management system.',
        50,
        doc.page.height - 40,
        { align: 'center', width: 512 }
      )
      doc.text(
        `Page ${i + 1} of ${range.count}`,
        50,
        doc.page.height - 25,
        { align: 'center', width: 512 }
      )
      
      // Restore position if we're not on the last page
      if (i < range.count - 1) {
        doc.y = currentY
      }
    }

    doc.end()

    await AuditLog.logUserAction(
      "DATA_EXPORT",
      req.user,
      `Exported SSG election results as PDF: ${election.title}`,
      req
    )

  } catch (error) {
    console.error("Export SSG election results error:", error)
    next(error)
  }
}



// Export departmental election results as PDF data
static async exportDepartmentalElectionResults(req, res, next) {
  try {
    const { id } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid departmental election ID")
      error.statusCode = 400
      return next(error)
    }

    const election = await DepartmentalElection.findById(id)
      .populate('departmentId', 'departmentCode degreeProgram college')
    if (!election) {
      const error = new Error("Departmental election not found")
      error.statusCode = 404
      return next(error)
    }

    // ✅ FIX: Get participants for percentage calculation
    const ElectionParticipation = require('../models/ElectionParticipation')
    
    // Get participants grouped by year level
    const participantsByYearLevel = await ElectionParticipation.aggregate([
      { 
        $match: { 
          deptElectionId: new mongoose.Types.ObjectId(id),
          status: 'confirmed'
        } 
      },
      {
        $lookup: {
          from: 'voters',
          localField: 'voterId',
          foreignField: '_id',
          as: 'voter'
        }
      },
      { $unwind: '$voter' },
      {
        $group: {
          _id: '$voter.yearLevel',
          count: { $sum: 1 }
        }
      }
    ])

    const yearLevelCounts = {}
    participantsByYearLevel.forEach(item => {
      yearLevelCounts[item._id] = item.count
    })

    // Helper to get allowed year levels
    const getAllowedYearLevels = (position) => {
      if (!position.description) return [1, 2, 3, 4]

      const yearLevelMatch = position.description.match(/Year levels?: (.*?)(?:\n|$)/)
      if (!yearLevelMatch) return [1, 2, 3, 4]

      const restrictionText = yearLevelMatch[1]
      if (restrictionText.includes('All year levels')) return [1, 2, 3, 4]

      const allowedLevels = []
      if (restrictionText.includes('1st')) allowedLevels.push(1)
      if (restrictionText.includes('2nd')) allowedLevels.push(2)
      if (restrictionText.includes('3rd')) allowedLevels.push(3)
      if (restrictionText.includes('4th')) allowedLevels.push(4)

      return allowedLevels.length > 0 ? allowedLevels : [1, 2, 3, 4]
    }

    // Get all positions
    const positions = await Position.find({
      deptElectionId: id,
      isActive: true
    }).sort({ positionOrder: 1 })

    const exportData = await Promise.all(
      positions.map(async (position) => {
        // ✅ Calculate eligible participants for this position
        const allowedYearLevels = getAllowedYearLevels(position)
        const eligibleParticipants = allowedYearLevels.reduce((sum, yearLevel) => {
          return sum + (yearLevelCounts[yearLevel] || 0)
        }, 0)

        // ✅ Calculate max possible votes
        const maxPossibleVotes = eligibleParticipants * (position.maxVotes || 1)

        const candidates = await Candidate.find({
          deptElectionId: id,
          positionId: position._id,
          isActive: true
        })
        .populate({
          path: 'voterId',
          select: 'firstName middleName lastName schoolId yearLevel'
        })
        .sort({ candidateNumber: 1 })

        const candidatesWithVotes = await Promise.all(
          candidates.map(async (candidate) => {
            const voteCount = await Vote.countDocuments({
              candidateId: candidate._id,
              deptElectionId: id,
              positionId: position._id
            })

            const candidateName = candidate.voterId ? 
              `${candidate.voterId.firstName} ${candidate.voterId.middleName || ''} ${candidate.voterId.lastName}`.replace(/\s+/g, ' ').trim() : 
              'Unknown Candidate'

            // ✅ FIX: Calculate percentage based on max possible votes
            const percentage = maxPossibleVotes > 0 ? 
              ((voteCount / maxPossibleVotes) * 100).toFixed(1) : '0.0'

            return {
              candidateNumber: candidate.candidateNumber,
              candidateName: candidateName,
              schoolId: candidate.voterId?.schoolId || 'N/A',
              yearLevel: candidate.voterId?.yearLevel || 'N/A',
              voteCount: voteCount,
              percentage: percentage // ✅ Now correctly calculated
            }
          })
        )

        // Sort by vote count descending
        candidatesWithVotes.sort((a, b) => b.voteCount - a.voteCount)

        return {
          positionName: position.positionName,
          positionOrder: position.positionOrder,
          maxVotes: position.maxVotes,
          eligibleParticipants: eligibleParticipants, // ✅ ADD
          maxPossibleVotes: maxPossibleVotes, // ✅ ADD
          candidates: candidatesWithVotes,
          totalVotes: candidatesWithVotes.reduce((sum, c) => sum + c.voteCount, 0)
        }
      })
    )

    // Get statistics
    const totalBallots = await Ballot.countDocuments({
      deptElectionId: id,
      isSubmitted: true
    })

    const totalVotes = await Vote.countDocuments({ deptElectionId: id })
    const totalCandidates = await Candidate.countDocuments({
      deptElectionId: id,
      isActive: true
    })
    
    const totalParticipants = await ElectionParticipation.countDocuments({
      deptElectionId: id,
      status: 'confirmed'
    })

    // Create PDF
    const doc = new PDFDocument({ 
      margin: 50, 
      size: 'LETTER'
    })
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Departmental_Election_Statistics_${election.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`)
    
    doc.pipe(res)

    let currentPageNumber = 1

    const addFooter = (pageNum, isLastPage = false) => {
      const currentY = doc.y
      doc.fontSize(8).font('Helvetica').fillColor('#666666')
      doc.text(
        'This is an official election results report generated by the election management system.',
        50,
        doc.page.height - 40,
        { align: 'center', width: 512 }
      )
      doc.text(
        `Page ${pageNum}`,
        50,
        doc.page.height - 25,
        { align: 'center', width: 512 }
      )
      doc.y = currentY
    }

    // HEADER
    doc.fontSize(20).font('Helvetica-Bold')
    doc.text('DEPARTMENTAL ELECTION RESULTS REPORT', { align: 'center' })
    doc.moveDown(1.5)
    
    // ELECTION DETAILS BOX
    doc.fontSize(11).font('Helvetica')
    const detailsY = doc.y
    doc.rect(50, detailsY, 512, 140).stroke()
    
    doc.text(`Election: ${election.title}`, 60, detailsY + 10)
    doc.text(`Department: ${election.departmentId.departmentCode} - ${election.departmentId.degreeProgram}`, 60, detailsY + 30)
    doc.text(`College: ${election.departmentId.college}`, 60, detailsY + 50)
    doc.text(`Year: ${election.electionYear}`, 60, detailsY + 70)
    doc.text(`Date: ${new Date(election.electionDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, 60, detailsY + 90)
    doc.text(`Status: ${election.status.toUpperCase()}`, 60, detailsY + 110)
    doc.text(`Generated: ${new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })}`, 60, detailsY + 130)
    
    doc.y = detailsY + 150
    doc.moveDown(1)

    // ELECTION SUMMARY BOX
    doc.fontSize(12).font('Helvetica-Bold')
    const summaryY = doc.y
    
    doc.fillColor('#2c3e50')
    doc.rect(50, summaryY, 512, 25).fill()
    doc.fillColor('#ffffff')
    doc.text('ELECTION SUMMARY', 60, summaryY + 7)
    
    doc.fillColor('#000000')
    doc.rect(50, summaryY + 25, 512, 80).stroke()
    
    doc.fontSize(11).font('Helvetica')
    doc.text(`Total Ballots Submitted: ${totalBallots.toLocaleString()}`, 60, summaryY + 35)
    doc.text(`Total Election Participants: ${totalParticipants.toLocaleString()}`, 60, summaryY + 55)
    doc.text(`Voter Turnout: ${totalBallots.toLocaleString()}`, 60, summaryY + 75)
    doc.text(`Total Candidates: ${totalCandidates.toLocaleString()}`, 60, summaryY + 95)
    
    doc.y = summaryY + 115
    doc.moveDown(1.5)

    // RESULTS BY POSITION
    doc.fontSize(14).font('Helvetica-Bold')
    doc.text('RESULTS BY POSITION', { underline: true })
    doc.moveDown(1)

    // Helper function to draw table header
    const drawTableHeader = (startY) => {
      const tableWidth = 512
      const rowHeight = 25
      const columnWidths = {
        rank: 40,
        candidateNum: 75,
        name: 180,
        year: 50,
        votes: 70,
        percentage: 97
      }

      doc.fillColor('#2c3e50')
      doc.rect(50, startY, tableWidth, rowHeight).fill()
      
      doc.strokeColor('#000000').lineWidth(1)
      doc.rect(50, startY, tableWidth, rowHeight).stroke()
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
      let currentX = 50
      
      doc.text('Rank', currentX, startY + 8, { width: columnWidths.rank, align: 'center' })
      currentX += columnWidths.rank
      doc.moveTo(currentX, startY).lineTo(currentX, startY + rowHeight).stroke()
      
      doc.text('Candidate #', currentX + 5, startY + 8, { width: columnWidths.candidateNum - 10, align: 'left' })
      currentX += columnWidths.candidateNum
      doc.moveTo(currentX, startY).lineTo(currentX, startY + rowHeight).stroke()
      
      doc.text('Name', currentX + 5, startY + 8, { width: columnWidths.name - 10, align: 'left' })
      currentX += columnWidths.name
      doc.moveTo(currentX, startY).lineTo(currentX, startY + rowHeight).stroke()
      
      doc.text('Year', currentX + 5, startY + 8, { width: columnWidths.year - 10, align: 'center' })
      currentX += columnWidths.year
      doc.moveTo(currentX, startY).lineTo(currentX, startY + rowHeight).stroke()
      
      doc.text('Votes', currentX + 5, startY + 8, { width: columnWidths.votes - 10, align: 'center' })
      currentX += columnWidths.votes
      doc.moveTo(currentX, startY).lineTo(currentX, startY + rowHeight).stroke()
      
      doc.text('%', currentX + 5, startY + 8, { width: columnWidths.percentage - 10, align: 'center' })
      
      return { rowHeight, columnWidths, tableWidth }
    }

    exportData.forEach((position, posIndex) => {
      if (doc.y > 650) {
        addFooter(currentPageNumber)
        doc.addPage()
        currentPageNumber++
      }

      // Position header with ✅ ENHANCED INFO
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000')
      doc.text(`${position.positionOrder}. ${position.positionName}`, 50, doc.y)
      doc.fontSize(10).font('Helvetica')
      doc.text(`Total Votes: ${position.totalVotes.toLocaleString()} | Eligible Participants: ${position.eligibleParticipants} | Max Possible Votes: ${position.maxPossibleVotes}`, 50, doc.y + 5)
      doc.moveDown(0.8)

      const tableTop = doc.y
      const { rowHeight, columnWidths, tableWidth } = drawTableHeader(tableTop)
      let currentY = tableTop + rowHeight

      doc.font('Helvetica').fillColor('#000000')
      position.candidates.forEach((candidate, idx) => {
        if (currentY > 700) {
          addFooter(currentPageNumber)
          doc.addPage()
          currentPageNumber++
          currentY = 50
          drawTableHeader(currentY)
          currentY += rowHeight
        }

        doc.fillColor('#ffffff')
        doc.rect(50, currentY, tableWidth, rowHeight).fill()
        
        doc.strokeColor('#cccccc').lineWidth(0.5)
        doc.rect(50, currentY, tableWidth, rowHeight).stroke()
        
        doc.fontSize(9).font('Helvetica').fillColor('#000000')
        let currentX = 50
        
        doc.text((idx + 1).toString(), currentX, currentY + 8, { width: columnWidths.rank, align: 'center' })
        currentX += columnWidths.rank
        doc.moveTo(currentX, currentY).lineTo(currentX, currentY + rowHeight).stroke()
        
        doc.text(`#${candidate.candidateNumber}`, currentX + 5, currentY + 8, { width: columnWidths.candidateNum - 10, align: 'left' })
        currentX += columnWidths.candidateNum
        doc.moveTo(currentX, currentY).lineTo(currentX, currentY + rowHeight).stroke()
        
        doc.text(candidate.candidateName, currentX + 5, currentY + 8, { 
          width: columnWidths.name - 10, 
          ellipsis: true,
          align: 'left'
        })
        currentX += columnWidths.name
        doc.moveTo(currentX, currentY).lineTo(currentX, currentY + rowHeight).stroke()
        
        doc.text(candidate.yearLevel.toString(), currentX + 5, currentY + 8, { 
          width: columnWidths.year - 10,
          align: 'center'
        })
        currentX += columnWidths.year
        doc.moveTo(currentX, currentY).lineTo(currentX, currentY + rowHeight).stroke()
        
        doc.text(candidate.voteCount.toLocaleString(), currentX + 5, currentY + 8, { 
          width: columnWidths.votes - 10,
          align: 'center'
        })
        currentX += columnWidths.votes
        doc.moveTo(currentX, currentY).lineTo(currentX, currentY + rowHeight).stroke()
        
        // ✅ Now shows correct percentage
        doc.text(`${candidate.percentage}%`, currentX + 5, currentY + 8, { 
          width: columnWidths.percentage - 10,
          align: 'center'
        })

        currentY += rowHeight
      })

      doc.y = currentY + 20
      
      if (posIndex < exportData.length - 1 && doc.y < 650) {
        doc.moveDown(0.5)
      }
    })

    addFooter(currentPageNumber, true)

    doc.end()

    await AuditLog.logUserAction(
      "DATA_EXPORT",
      req.user,
      `Exported departmental election results as PDF: ${election.title}`,
      req
    )

  } catch (error) {
    console.error("Export departmental election results error:", error)
    next(error)
  }
}




}

module.exports = VotingController