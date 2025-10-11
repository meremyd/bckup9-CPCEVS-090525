const mongoose = require("mongoose")
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
  // ==================== SSG BALLOT FUNCTIONS ====================

  // Get all SSG ballots for selected election (Election Committee)
  static async getSelectedSSGElectionBallots(req, res, next) {
    try {
      const { electionId } = req.params
      const { page = 1, limit = 10, status } = req.query

      // Validate election exists
      const election = await SSGElection.findById(electionId)
      if (!election) {
        return res.status(404).json({ message: "SSG Election not found" })
      }

      const query = { ssgElectionId: electionId }
      if (status === 'submitted') query.isSubmitted = true
      if (status === 'pending') query.isSubmitted = false

      const ballots = await Ballot.find(query)
        .populate('ssgElectionId', 'title electionDate status ballotOpenTime ballotCloseTime')
        .populate({
          path: 'voterId',
          select: 'schoolId firstName lastName departmentId yearLevel',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)

      const total = await Ballot.countDocuments(query)

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Retrieved ${ballots.length} SSG ballots for election: ${election.title}`,
        req
      )

      res.json({
        election: {
          _id: election._id,
          title: election.title,
          electionDate: election.electionDate,
          status: election.status,
          ballotOpenTime: election.ballotOpenTime,
          ballotCloseTime: election.ballotCloseTime
        },
        ballots,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      })
    } catch (error) {
      next(error)
    }
  }

  // Get selected SSG election ballot statistics (Election Committee)
  static async getSelectedSSGElectionBallotStatistics(req, res, next) {
    try {
      const { electionId } = req.params

      const election = await SSGElection.findById(electionId)
      if (!election) {
        return res.status(404).json({ message: "SSG Election not found" })
      }

      const query = { ssgElectionId: electionId }

      const totalBallots = await Ballot.countDocuments(query)
      const submittedBallots = await Ballot.countDocuments({ ...query, isSubmitted: true })
      const pendingBallots = totalBallots - submittedBallots
      const activeBallots = await Ballot.countDocuments({ 
        ...query, 
        isSubmitted: false, 
        timerStarted: true,
        ballotCloseTime: { $gt: new Date() }
      })
      const expiredBallots = await Ballot.countDocuments({ 
        ...query, 
        isSubmitted: false, 
        timerStarted: true,
        ballotCloseTime: { $lt: new Date() }
      })

      // Get department breakdown
      const departmentStats = await Ballot.aggregate([
        { $match: query },
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
          $lookup: {
            from: 'departments',
            localField: 'voter.departmentId',
            foreignField: '_id',
            as: 'department'
          }
        },
        { $unwind: '$department' },
        {
          $group: {
            _id: {
              college: '$department.college',
              departmentCode: '$department.departmentCode'
            },
            total: { $sum: 1 },
            submitted: {
              $sum: { $cond: ['$isSubmitted', 1, 0] }
            }
          }
        },
        {
          $project: {
            college: '$_id.college',
            departmentCode: '$_id.departmentCode',
            total: 1,
            submitted: 1,
            pending: { $subtract: ['$total', '$submitted'] },
            turnoutRate: {
              $round: [
                { $multiply: [{ $divide: ['$submitted', '$total'] }, 100] },
                2
              ]
            }
          }
        },
        { $sort: { college: 1, departmentCode: 1 } }
      ])

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Retrieved SSG ballot statistics for election: ${election.title}`,
        req
      )

      res.json({
        election: {
          _id: election._id,
          title: election.title,
          status: election.status
        },
        statistics: {
          totalBallots,
          submittedBallots,
          pendingBallots,
          activeBallots,
          expiredBallots,
          turnoutRate: totalBallots > 0 ? Math.round((submittedBallots / totalBallots) * 100) : 0
        },
        departmentStats
      })
    } catch (error) {
      next(error)
    }
  }

  // Preview SSG ballot for election committee
  static async previewSSGBallot(req, res, next) {
    try {
      const { electionId } = req.params

      const election = await SSGElection.findById(electionId)
      if (!election) {
        return res.status(404).json({ message: "SSG Election not found" })
      }

      // Get all positions for this election
      const positions = await Position.find({
        ssgElectionId: electionId,
        isActive: true
      }).sort({ positionOrder: 1 })

      // Get all candidates grouped by position
      const ballotPreview = await Promise.all(positions.map(async (position) => {
        const candidates = await Candidate.find({
          ssgElectionId: electionId,
          positionId: position._id,
          isActive: true
        })
        .populate({
          path: 'voterId',
          select: 'firstName lastName schoolId departmentId yearLevel',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        })
        .populate('partylistId', 'partylistName')
        .sort({ candidateNumber: 1 })

        return {
          position: {
            _id: position._id,
            positionName: position.positionName,
            positionOrder: position.positionOrder,
            maxVotes: position.maxVotes,
            description: position.description
          },
          candidates: candidates.map(candidate => ({
            _id: candidate._id,
            candidateNumber: candidate.candidateNumber,
            name: `${candidate.voterId.firstName} ${candidate.voterId.lastName}`,
            schoolId: candidate.voterId.schoolId,
            department: candidate.voterId.departmentId.departmentCode,
            college: candidate.voterId.departmentId.college,
            yearLevel: candidate.voterId.yearLevel,
            partylist: candidate.partylistId?.partylistName || 'Independent',
            hasCampaignPicture: !!(candidate.campaignPicture && candidate.campaignPicture.length > 0),
            campaignPicture: candidate.campaignPicture ? candidate.campaignPicture.toString('base64') : null,
            hasCredentials: !!(candidate.credentials && candidate.credentials.length > 0)
          }))
        }
      }))

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Previewed SSG ballot for election: ${election.title}`,
        req
      )

      res.json({
        election: {
          _id: election._id,
          title: election.title,
          status: election.status,
          electionDate: election.electionDate,
          ballotOpenTime: election.ballotOpenTime,
          ballotCloseTime: election.ballotCloseTime,
          ballotDuration: election.ballotDuration || 10
        },
        ballot: ballotPreview,
        totalPositions: positions.length,
        totalCandidates: ballotPreview.reduce((sum, pos) => sum + pos.candidates.length, 0)
      })
    } catch (error) {
      next(error)
    }
  }

  // Submit SSG ballot (Election Committee can also use for testing)
  static async submitSelectedSSGBallot(req, res, next) {
    try {
      const { ballotId } = req.params
      const { votes } = req.body // Array of { positionId, candidateId }
      const voterId = req.user.userType === 'voter' ? req.user.voterId : null

      const ballot = await Ballot.findById(ballotId)
        .populate('ssgElectionId', 'title status')

      if (!ballot || !ballot.ssgElectionId) {
        return res.status(404).json({ message: "SSG Ballot not found" })
      }

      // Check ownership for voters
      if (req.user.userType === 'voter' && ballot.voterId.toString() !== voterId) {
        return res.status(403).json({ message: "Access denied" })
      }

      if (ballot.isSubmitted) {
        return res.status(400).json({ message: "Ballot has already been submitted" })
      }

      // Check if ballot is expired (only for voters)
      if (req.user.userType === 'voter' && ballot.isExpired) {
        return res.status(400).json({ message: "Ballot has expired and cannot be submitted" })
      }

      // Validate votes
      if (!votes || !Array.isArray(votes) || votes.length === 0) {
        return res.status(400).json({ message: "No votes provided" })
      }

      // Process each vote
      const processedVotes = []
      for (const vote of votes) {
        // Validate candidate and position
        const candidate = await Candidate.findOne({
          _id: vote.candidateId,
          positionId: vote.positionId,
          ssgElectionId: ballot.ssgElectionId,
          isActive: true
        })

        if (!candidate) {
          return res.status(400).json({ 
            message: `Invalid candidate or position for vote: ${vote.candidateId}` 
          })
        }

        // Check if already voted for this position
        const existingVote = await Vote.findOne({
          ballotId: ballot._id,
          positionId: vote.positionId
        })

        if (existingVote) {
          return res.status(400).json({ 
            message: `Already voted for position: ${vote.positionId}` 
          })
        }

        // Create vote record
        const newVote = new Vote({
          ballotId: ballot._id,
          candidateId: vote.candidateId,
          positionId: vote.positionId,
          ssgElectionId: ballot.ssgElectionId
        })

        await newVote.save()
        processedVotes.push(newVote)
      }

      // Submit ballot
      ballot.isSubmitted = true
      ballot.submittedAt = new Date()
      await ballot.save()

      const actionUser = req.user.userType === 'voter' ? 
        { _id: voterId, schoolId: req.user.schoolId } : req.user

      await AuditLog.logAction({
        action: "VOTE_SUBMITTED",
        username: req.user.username || req.user.schoolId?.toString(),
        userId: req.user.userId,
        voterId: req.user.voterId,
        schoolId: req.user.schoolId,
        details: `Submitted SSG ballot with ${processedVotes.length} votes for election: ${ballot.ssgElectionId.title}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      })

      res.json({
        message: "SSG Ballot submitted successfully",
        submittedAt: ballot.submittedAt,
        voteCount: processedVotes.length
      })
    } catch (error) {
      next(error)
    }
  }

  // Get voter SSG ballot status for selected election
  static async getVoterSelectedSSGBallotStatus(req, res, next) {
    try {
      const { electionId } = req.params
      const voterId = req.user.voterId

      const election = await SSGElection.findById(electionId)
      if (!election) {
        return res.status(404).json({ message: "SSG Election not found" })
      }

      const voter = await Voter.findById(voterId).populate('departmentId')
      if (!voter) {
        return res.status(404).json({ message: "Voter not found" })
      }

      const canVote = voter.isRegistered && voter.isPasswordActive

      const ballot = await Ballot.findOne({ ssgElectionId: electionId, voterId })

      // Check if voting is currently allowed based on election times
      const now = new Date()
      const isVotingTime = election.ballotsAreOpen

      res.json({
        election: {
          _id: election._id,
          title: election.title,
          status: election.status,
          ballotOpenTime: election.ballotOpenTime,
          ballotCloseTime: election.ballotCloseTime,
          ballotDuration: election.ballotDuration || 10,
          isVotingTime
        },
        hasVoted: ballot ? ballot.isSubmitted : false,
        canVote: canVote && !ballot?.isSubmitted && isVotingTime,
        ballot: ballot ? {
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
        } : null,
        voterEligibility: {
          isRegistered: voter.isRegistered,
          isPasswordActive: voter.isPasswordActive,
          message: canVote ? 
            "You are eligible to vote in SSG elections" : 
            "You must be a registered voter with an active password to participate in SSG elections"
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get selected SSG election ballot with votes (for review)
  static async getSelectedSSGBallotWithVotes(req, res, next) {
    try {
      const { ballotId } = req.params
      const voterId = req.user.userType === 'voter' ? req.user.voterId : null

      const ballot = await Ballot.findById(ballotId)
        .populate('ssgElectionId', 'title electionDate')

      if (!ballot || !ballot.ssgElectionId) {
        return res.status(404).json({ message: "SSG Ballot not found" })
      }

      // Check ownership for voters
      if (req.user.userType === 'voter' && ballot.voterId.toString() !== voterId) {
        return res.status(403).json({ message: "Access denied" })
      }

      // Get votes with candidate and position details
      const votes = await Vote.find({ ballotId: ballot._id })
        .populate({
          path: 'candidateId',
          populate: [
            { 
              path: 'voterId', 
              select: 'firstName lastName schoolId',
              populate: {
                path: 'departmentId',
                select: 'departmentCode college'
              }
            },
            { path: 'partylistId', select: 'partylistName' }
          ]
        })
        .populate('positionId', 'positionName positionOrder')
        .sort({ 'positionId.positionOrder': 1 })

      const actionType = req.user.userType === 'voter' ? "BALLOT_ACCESSED" : "DATA_EXPORT"
      await AuditLog.logAction({
        action: actionType,
        username: req.user.username || req.user.schoolId?.toString(),
        userId: req.user.userId,
        voterId: req.user.voterId,
        schoolId: req.user.schoolId,
        details: `Reviewed SSG ballot ${ballotId} with ${votes.length} votes`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      })

      res.json({
        ballot: {
          _id: ballot._id,
          ssgElectionId: ballot.ssgElectionId,
          isSubmitted: ballot.isSubmitted,
          submittedAt: ballot.submittedAt,
          createdAt: ballot.createdAt
        },
        votes: votes.map(vote => ({
          position: {
            name: vote.positionId.positionName,
            order: vote.positionId.positionOrder
          },
          candidate: {
            name: `${vote.candidateId.voterId.firstName} ${vote.candidateId.voterId.lastName}`,
            schoolId: vote.candidateId.voterId.schoolId,
            department: vote.candidateId.voterId.departmentId?.departmentCode || 'Unknown',
            college: vote.candidateId.voterId.departmentId?.college || 'Unknown',
            partylist: vote.candidateId.partylistId?.partylistName || 'Independent',
            candidateNumber: vote.candidateId.candidateNumber
          }
        }))
      })
    } catch (error) {
      next(error)
    }
  }

  // Update SSG ballot timer (Election Committee)
  static async updateSSGBallotTimer(req, res, next) {
    try {
      const { ballotId } = req.params
      const { additionalMinutes = 10 } = req.body

      const ballot = await Ballot.findById(ballotId)
        .populate('ssgElectionId', 'title')

      if (!ballot || !ballot.ssgElectionId) {
        return res.status(404).json({ message: "SSG Ballot not found" })
      }

      if (ballot.isSubmitted) {
        return res.status(400).json({ message: "Cannot extend timer for submitted ballot" })
      }

      if (!ballot.timerStarted) {
        // Start timer if not started
        await ballot.startTimer(10) // 10 minutes default
      } else {
        // Extend existing timer
        await ballot.extendTimer(additionalMinutes)
      }

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Updated SSG ballot ${ballotId} timer by ${additionalMinutes} minutes`,
        req
      )

      res.json({
        message: `SSG Ballot timer updated successfully`,
        ballotOpenTime: ballot.ballotOpenTime,
        ballotCloseTime: ballot.ballotCloseTime,
        ballotDuration: ballot.ballotDuration,
        timeRemaining: ballot.timeRemaining
      })
    } catch (error) {
      next(error)
    }
  }

  // Update SSG election ballot duration (Election Committee)
  static async updateSSGBallotDuration(req, res, next) {
    try {
      const { electionId } = req.params
      const { ballotDuration } = req.body

      // Validate duration
      if (!ballotDuration || ballotDuration < 5 || ballotDuration > 180) {
        return res.status(400).json({ 
          message: "Ballot duration must be between 5 and 180 minutes" 
        })
      }

      const election = await SSGElection.findById(electionId)
      if (!election) {
        return res.status(404).json({ message: "SSG Election not found" })
      }

      // Update election ballot duration
      election.ballotDuration = ballotDuration
      await election.save()

      await AuditLog.logUserAction(
        "UPDATE_SSG_ELECTION",
        req.user,
        `Updated SSG election ${election.title} ballot duration to ${ballotDuration} minutes`,
        req
      )

      res.json({
        message: "Ballot duration updated successfully",
        ballotDuration: election.ballotDuration
      })
    } catch (error) {
      next(error)
    }
  }

  // ==================== DEPARTMENTAL BALLOT FUNCTIONS ====================

  // Get departmental ballots for selected election and position
  static async getDepartmentalBallots(req, res, next) {
    try {
      const { electionId, positionId } = req.params
      const { page = 1, limit = 10, status } = req.query

      const election = await DepartmentalElection.findById(electionId)
        .populate('departmentId')
      if (!election) {
        return res.status(404).json({ message: "Departmental Election not found" })
      }

      const position = await Position.findById(positionId)
      if (!position) {
        return res.status(404).json({ message: "Position not found" })
      }

      const query = { 
        deptElectionId: electionId,
        currentPositionId: positionId
      }
      if (status === 'submitted') query.isSubmitted = true
      if (status === 'pending') query.isSubmitted = false

      const ballots = await Ballot.find(query)
        .populate('deptElectionId', 'title electionDate status')
        .populate({
          path: 'voterId',
          select: 'schoolId firstName lastName departmentId yearLevel',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        })
        .populate('currentPositionId', 'positionName positionOrder')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)

      const total = await Ballot.countDocuments(query)

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Retrieved ${ballots.length} departmental ballots for election: ${election.title}, position: ${position.positionName}`,
        req
      )

      res.json({
        election: {
          _id: election._id,
          title: election.title,
          department: election.departmentId
        },
        position: {
          _id: position._id,
          positionName: position.positionName,
          positionOrder: position.positionOrder
        },
        ballots,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      })
    } catch (error) {
      next(error)
    }
  }

  // Get departmental ballot statistics for selected election and position
  static async getDepartmentalBallotStatistics(req, res, next) {
    try {
      const { electionId, positionId } = req.params

      const election = await DepartmentalElection.findById(electionId)
        .populate('departmentId')
      if (!election) {
        return res.status(404).json({ message: "Departmental Election not found" })
      }

      const position = await Position.findById(positionId)
      if (!position) {
        return res.status(404).json({ message: "Position not found" })
      }

      const query = { 
        deptElectionId: electionId,
        currentPositionId: positionId
      }

      const totalBallots = await Ballot.countDocuments(query)
      const submittedBallots = await Ballot.countDocuments({ ...query, isSubmitted: true })
      const pendingBallots = totalBallots - submittedBallots

      // Get year level breakdown
      const yearLevelStats = await Ballot.aggregate([
        { $match: query },
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
            total: { $sum: 1 },
            submitted: {
              $sum: { $cond: ['$isSubmitted', 1, 0] }
            }
          }
        },
        {
          $project: {
            yearLevel: '$_id',
            total: 1,
            submitted: 1,
            pending: { $subtract: ['$total', '$submitted'] },
            turnoutRate: {
              $round: [
                { $multiply: [{ $divide: ['$submitted', '$total'] }, 100] },
                2
              ]
            }
          }
        },
        { $sort: { yearLevel: 1 } }
      ])

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Retrieved departmental ballot statistics for election: ${election.title}, position: ${position.positionName}`,
        req
      )

      res.json({
        election: {
          _id: election._id,
          title: election.title,
          department: election.departmentId
        },
        position: {
          _id: position._id,
          positionName: position.positionName,
          positionOrder: position.positionOrder
        },
        statistics: {
          totalBallots,
          submittedBallots,
          pendingBallots,
          turnoutRate: totalBallots > 0 ? Math.round((submittedBallots / totalBallots) * 100) : 0
        },
        yearLevelStats
      })
    } catch (error) {
      next(error)
    }
  }

static async getDepartmentalPositionBallotTiming(req, res, next) {
  try {
    const { positionId } = req.params

    const position = await Position.findOne({
      _id: positionId,
      deptElectionId: { $ne: null }
    }).populate('deptElectionId', 'title status electionDate')  // ✅ Added electionDate

    if (!position) {
      return res.status(404).json({ 
        success: false,
        message: "Departmental position not found" 
      })
    }

    // Check if there are any active ballots for this position
    const activeBallots = await Ballot.countDocuments({
      deptElectionId: position.deptElectionId,
      currentPositionId: positionId,
      isSubmitted: false,
      timerStarted: true
    })

    const now = new Date()
    const isOpen = position.ballotOpenTime && position.ballotCloseTime &&
                   now >= position.ballotOpenTime && now <= position.ballotCloseTime

    console.log('📊 Position timing info:', {  // ✅ Debug
      positionName: position.positionName,
      ballotOpenTime: position.ballotOpenTime,
      ballotCloseTime: position.ballotCloseTime,
      isOpen,
      activeBallots
    })

    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Retrieved ballot timing for departmental position: ${position.positionName}`,
      req
    )

    res.json({
      success: true,
      data: {
        position: {
          _id: position._id,
          positionName: position.positionName,
          deptElectionId: position.deptElectionId
        },
        timing: {
          ballotOpenTime: position.ballotOpenTime,  // ✅ Returns ISO string
          ballotCloseTime: position.ballotCloseTime,  // ✅ Returns ISO string
          isOpen,
          activeBallots
        },
        election: {  // ✅ Added election info
          electionDate: position.deptElectionId.electionDate
        }
      }
    })
  } catch (error) {
    console.error('❌ Error getting timing:', error)  // ✅ Debug
    next(error)
  }
}

static async updateDepartmentalPositionBallotTiming(req, res, next) {
  try {
    const { positionId } = req.params
    const { ballotOpenTime, ballotCloseTime } = req.body

    console.log('📥 Received timing update request:', { positionId, ballotOpenTime, ballotCloseTime })  // ✅ Debug

    const position = await Position.findOne({
      _id: positionId,
      deptElectionId: { $ne: null }
    }).populate('deptElectionId', 'title electionDate')

    if (!position) {
      return res.status(404).json({ 
        success: false,
        message: "Departmental position not found" 
      })
    }

    console.log('📍 Found position:', position.positionName)  // ✅ Debug

    // ✅ Convert ISO strings to Date objects
    if (ballotOpenTime !== undefined) {
      const openDate = new Date(ballotOpenTime)
      if (isNaN(openDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid ballot open time format"
        })
      }
      position.ballotOpenTime = openDate
      console.log('✅ Set ballotOpenTime:', openDate)  // ✅ Debug
    }

    if (ballotCloseTime !== undefined) {
      const closeDate = new Date(ballotCloseTime)
      if (isNaN(closeDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid ballot close time format"
        })
      }
      position.ballotCloseTime = closeDate
      console.log('✅ Set ballotCloseTime:', closeDate)  // ✅ Debug
    }

    // ✅ Validate times if both are set
    if (position.ballotOpenTime && position.ballotCloseTime) {
      if (position.ballotCloseTime <= position.ballotOpenTime) {
        return res.status(400).json({
          success: false,
          message: "Ballot close time must be after open time"
        })
      }
    }

    console.log('💾 Saving position with timing:', {
      ballotOpenTime: position.ballotOpenTime,
      ballotCloseTime: position.ballotCloseTime
    })  // ✅ Debug

    await position.save()

    console.log('✅ Position saved successfully')  // ✅ Debug

    await AuditLog.logUserAction(
      "UPDATE_POSITION",
      req.user,
      `Updated ballot timing for departmental position: ${position.positionName} (Open: ${position.ballotOpenTime ? position.ballotOpenTime.toISOString() : 'N/A'}, Close: ${position.ballotCloseTime ? position.ballotCloseTime.toISOString() : 'N/A'})`,
      req
    )

    res.json({
      success: true,
      message: "Ballot timing updated successfully",
      data: {
        position: {
          _id: position._id,
          positionName: position.positionName,
          ballotOpenTime: position.ballotOpenTime,
          ballotCloseTime: position.ballotCloseTime
        }
      }
    })
  } catch (error) {
    console.error('❌ Error updating ballot timing:', error)  // ✅ Debug
    
    // ✅ Handle validation errors specifically
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(error.errors).map(err => err.message)
      })
    }
    
    next(error)
  }
}

static async openDepartmentalPositionBallot(req, res, next) {
  try {
    const { positionId } = req.params

    const position = await Position.findOne({
      _id: positionId,
      deptElectionId: { $ne: null }
    }).populate('deptElectionId', 'title status')

    if (!position) {
      return res.status(404).json({ message: "Departmental position not found" })
    }

    if (position.deptElectionId.status !== 'active') {
      return res.status(400).json({
        message: "Cannot open ballot - election is not active"
      })
    }

    const now = new Date()
    
    // FIXED: Only set open time to NOW if no pre-configured time exists
    // This respects times set via the Timer form
    if (!position.ballotOpenTime || position.ballotOpenTime > now) {
      position.ballotOpenTime = now
    }
    
    // Only set default close time if none configured OR if configured time is in the past
    if (!position.ballotCloseTime || position.ballotCloseTime <= now) {
      position.ballotCloseTime = new Date(now.getTime() + (120 * 60 * 1000)) // 2 hours default
    }
    
    await position.save()

    await AuditLog.logUserAction(
      "UPDATE_POSITION",
      req.user,
      `Opened ballot for departmental position: ${position.positionName}`,
      req
    )

    res.json({
      success: true,
      message: `Ballot opened for ${position.positionName}`,
      data: {
        position: {
          _id: position._id,
          positionName: position.positionName,
          ballotOpenTime: position.ballotOpenTime,
          ballotCloseTime: position.ballotCloseTime
        }
      }
    })
  } catch (error) {
    next(error)
  }
}
// Close ballot for departmental position
static async closeDepartmentalPositionBallot(req, res, next) {
  try {
    const { positionId } = req.params

    const position = await Position.findOne({
      _id: positionId,
      deptElectionId: { $ne: null }
    }).populate('deptElectionId', 'title')

    if (!position) {
      return res.status(404).json({ message: "Departmental position not found" })
    }

    position.ballotCloseTime = new Date()
    await position.save()

    // Expire any active ballots for this position
    const expiredCount = await Ballot.updateMany(
      {
        deptElectionId: position.deptElectionId,
        currentPositionId: positionId,
        isSubmitted: false,
        timerStarted: true
      },
      {
        ballotCloseTime: new Date()
      }
    )

    await AuditLog.logUserAction(
      "UPDATE_POSITION",
      req.user,
      `Closed ballot for departmental position: ${position.positionName} - Expired ${expiredCount.modifiedCount} active ballots`,
      req
    )

    res.json({
      success: true,
      message: `Ballot closed for ${position.positionName}`,
      data: {
        position: {
          _id: position._id,
          positionName: position.positionName,
          ballotOpenTime: position.ballotOpenTime,
          ballotCloseTime: position.ballotCloseTime
        },
        expiredBallots: expiredCount.modifiedCount
      }
    })
  } catch (error) {
    next(error)
  }
}

static async updateDepartmentalPositionYearLevel(req, res, next) {
  try {
    const { positionId } = req.params
    const { allowedYearLevels } = req.body

    const position = await Position.findOne({
      _id: positionId,
      deptElectionId: { $ne: null }
    }).populate('deptElectionId', 'title')

    if (!position) {
      return res.status(404).json({ message: "Departmental position not found" })
    }

    // Validate year levels
    const validYearLevels = [1, 2, 3, 4]
    if (!Array.isArray(allowedYearLevels) || 
        !allowedYearLevels.every(level => validYearLevels.includes(level))) {
      return res.status(400).json({
        message: "Invalid year levels. Must be an array containing values 1, 2, 3, or 4"
      })
    }

    if (allowedYearLevels.length === 0) {
      return res.status(400).json({
        message: "At least one year level must be allowed"
      })
    }

    // Store in description (maintaining backward compatibility)
    const restrictionText = allowedYearLevels.length === 4 ? 
      "Year levels: All year levels" : 
      `Year levels: ${allowedYearLevels.map(level => 
        `${level}${level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th'}`
      ).join(', ')}`

    // Update or append to description
    if (position.description) {
      position.description = position.description.replace(/Year levels?:.*$/m, restrictionText)
      if (!position.description.includes('Year level')) {
        position.description += '\n' + restrictionText
      }
    } else {
      position.description = restrictionText
    }

    await position.save()

    await AuditLog.logUserAction(
      "UPDATE_POSITION",
      req.user,
      `Updated year level restriction for position ${position.positionName}: ${restrictionText}`,
      req
    )

    res.json({
      success: true,
      message: "Year level restriction updated successfully",
      data: {
        position: {
          _id: position._id,
          positionName: position.positionName,
          description: position.description
        },
        allowedYearLevels,
        restrictionText
      }
    })
  } catch (error) {
    next(error)
  }
}

// Get allowed year levels for position
static async getAllowedYearLevels(positionId) {
  try {
    const position = await Position.findById(positionId)
    if (!position || !position.description) {
      return [1, 2, 3, 4] // Default: all year levels
    }

    const yearLevelMatch = position.description.match(/Year levels?: (.*?)(?:\n|$)/)
    if (!yearLevelMatch) {
      return [1, 2, 3, 4]
    }

    const restrictionText = yearLevelMatch[1]
    if (restrictionText.includes('All year levels')) {
      return [1, 2, 3, 4]
    }

    const allowedLevels = []
    if (restrictionText.includes('1st')) allowedLevels.push(1)
    if (restrictionText.includes('2nd')) allowedLevels.push(2)
    if (restrictionText.includes('3rd')) allowedLevels.push(3)
    if (restrictionText.includes('4th')) allowedLevels.push(4)

    return allowedLevels.length > 0 ? allowedLevels : [1, 2, 3, 4]
  } catch (error) {
    console.error('Error getting allowed year levels:', error)
    return [1, 2, 3, 4]
  }
}

  // Preview departmental ballot for election committee
  static async previewDepartmentalBallot(req, res, next) {
    try {
      const { electionId, positionId } = req.params

      const election = await DepartmentalElection.findById(electionId)
        .populate('departmentId')
      if (!election) {
        return res.status(404).json({ message: "Departmental Election not found" })
      }

      const position = await Position.findOne({
        _id: positionId,
        deptElectionId: electionId,
        isActive: true
      })
      if (!position) {
        return res.status(404).json({ message: "Position not found or not active" })
      }

      // Get candidates for this position
      const candidates = await Candidate.find({
        deptElectionId: electionId,
        positionId: position._id,
        isActive: true
      })
      .populate({
        path: 'voterId',
        select: 'firstName lastName schoolId departmentId yearLevel',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })
      .sort({ candidateNumber: 1 })

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Previewed departmental ballot for election: ${election.title}, position: ${position.positionName}`,
        req
      )

      res.json({
        election: {
          _id: election._id,
          title: election.title,
          status: election.status,
          electionDate: election.electionDate,
          department: election.departmentId
        },
        position: {
          _id: position._id,
          positionName: position.positionName,
          positionOrder: position.positionOrder,
          maxVotes: position.maxVotes,
          description: position.description
        },
        candidates: candidates.map(candidate => ({
          _id: candidate._id,
          candidateNumber: candidate.candidateNumber,
          name: `${candidate.voterId.firstName} ${candidate.voterId.lastName}`,
          schoolId: candidate.voterId.schoolId,
          department: candidate.voterId.departmentId.departmentCode,
          college: candidate.voterId.departmentId.college,
          yearLevel: candidate.voterId.yearLevel,
          hasCampaignPicture: !!(candidate.campaignPicture && candidate.campaignPicture.length > 0),
          campaignPicture: candidate.campaignPicture ? candidate.campaignPicture.toString('base64') : null,
          hasCredentials: !!(candidate.credentials && candidate.credentials.length > 0)
        })),
        totalCandidates: candidates.length
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

    const election = await DepartmentalElection.findById(electionId)
      .populate('departmentId')
    if (!election) {
      const error = new Error("Departmental election not found")
      error.statusCode = 404
      return next(error)
    }

    const voter = await Voter.findById(voterId).populate('departmentId')
    if (!voter) {
      const error = new Error("Voter not found")
      error.statusCode = 404
      return next(error)
    }

    const canVote = voter.isRegistered && 
                   voter.isPasswordActive && 
                   voter.isClassOfficer &&
                   voter.departmentId.college === election.departmentId.college

    const positions = await Position.find({
      deptElectionId: electionId,
      isActive: true
    }).sort({ positionOrder: 1 })

    const votedPositions = await Ballot.find({
      deptElectionId: electionId,
      voterId,
      isSubmitted: true
    }).distinct('currentPositionId')

    const currentActivePosition = await Position.findOne({
      deptElectionId: new mongoose.Types.ObjectId(electionId),
      isActive: true,
      ballotOpenTime: { $lte: new Date() },
      ballotCloseTime: { $gte: new Date() }
    }).sort({ positionOrder: 1 })

    const availablePositions = []
    for (const position of positions) {
      const alreadyVoted = votedPositions.some(voted => voted.toString() === position._id.toString())
      
      if (!alreadyVoted) {
        const canVoteForPosition = await BallotController.checkYearLevelRestriction(voter.yearLevel, position._id)
        
        if (canVoteForPosition) {
          const isCurrentlyOpen = BallotController.isPositionBallotOpen(position)
          
          availablePositions.push({
            _id: position._id,
            positionName: position.positionName,
            positionOrder: position.positionOrder,
            maxVotes: position.maxVotes,
            description: position.description,
            ballotOpenTime: position.ballotOpenTime,
            ballotCloseTime: position.ballotCloseTime,
            ballotDuration: position.ballotDuration,
            isCurrentlyOpen,
            isCurrentActive: currentActivePosition?._id.toString() === position._id.toString()
          })
        }
      }
    }

    res.json({
      election: {
        _id: election._id,
        title: election.title,
        status: election.status,
        department: election.departmentId
      },
      totalPositions: positions.length,
      votedPositions: votedPositions.length,
      availablePositions,
      currentActivePosition: currentActivePosition ? {
        _id: currentActivePosition._id,
        positionName: currentActivePosition.positionName,
        positionOrder: currentActivePosition.positionOrder,
        isOpen: BallotController.isPositionBallotOpen(currentActivePosition)
      } : null,
      isComplete: availablePositions.length === 0,
      voterEligibility: {
        isRegistered: voter.isRegistered,
        isPasswordActive: voter.isPasswordActive,
        isClassOfficer: voter.isClassOfficer,
        departmentMatch: voter.departmentId.college === election.departmentId.college
      }
    })
  } catch (error) {
    next(error)
  }
}

  static async getPositionsForPreview(req, res, next) {
  try {
    const { electionId } = req.params
    
    const election = await DepartmentalElection.findById(electionId)
      .populate('departmentId')
    if (!election) {
      return res.status(404).json({ message: "Departmental Election not found" })
    }

    const positions = await Position.find({
      deptElectionId: electionId,
      isActive: true
    }).sort({ positionOrder: 1 })

    res.json({
      election: {
        _id: election._id,
        title: election.title,
        status: election.status,
        department: election.departmentId
      },
      availablePositions: positions.map(position => ({
        _id: position._id,
        positionName: position.positionName,
        positionOrder: position.positionOrder,
        maxVotes: position.maxVotes,
        description: position.description
      })),
      voterEligibility: {
        isRegistered: true,
        isClassOfficer: true,
        departmentMatch: true,
        canVote: true,
        message: "Admin/Committee preview access"
      }
    })
  } catch (error) {
    next(error)
  }
}

  // Delete departmental ballot (Election Committee)
  static async deleteDepartmentalBallot(req, res, next) {
    try {
      const { ballotId } = req.params

      const ballot = await Ballot.findById(ballotId)
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
        `Deleted Departmental ballot ${ballotId} for voter ${ballot.voterId.schoolId}, position ${ballot.currentPositionId?.positionName} in election ${ballot.deptElectionId.title}. Removed ${voteCount} votes.`,
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

  // Get voter departmental ballot status
  static async getVoterDepartmentalBallotStatus(req, res, next) {
    try {
      const { electionId, positionId } = req.params
      const voterId = req.user.voterId

      const election = await DepartmentalElection.findById(electionId)
        .populate('departmentId')
      if (!election) {
        return res.status(404).json({ message: "Departmental Election not found" })
      }

      const voter = await Voter.findById(voterId).populate('departmentId')
      if (!voter) {
        return res.status(404).json({ message: "Voter not found" })
      }

      // Check eligibility
      const canVote = voter.isRegistered && 
                     voter.isPasswordActive && 
                     voter.isClassOfficer &&
                     voter.departmentId.college === election.departmentId.college

      const position = await Position.findById(positionId)
      if (!position) {
        return res.status(404).json({ message: "Position not found" })
      }

      // Check year level restriction
      const canVoteForPosition = canVote ? await BallotController.checkYearLevelRestriction(voter.yearLevel, positionId) : false

      const ballot = await Ballot.findOne({ 
        deptElectionId: electionId, 
        voterId,
        currentPositionId: positionId
      })

      res.json({
        election: {
          _id: election._id,
          title: election.title,
          department: election.departmentId
        },
        position: {
          _id: position._id,
          positionName: position.positionName,
          positionOrder: position.positionOrder
        },
        hasVoted: ballot ? ballot.isSubmitted : false,
        canVote: canVoteForPosition && !ballot?.isSubmitted,
        ballot: ballot ? {
          _id: ballot._id,
          currentPositionId: ballot.currentPositionId,
          isSubmitted: ballot.isSubmitted,
          submittedAt: ballot.submittedAt,
          createdAt: ballot.createdAt,
          timerStarted: ballot.timerStarted,
          ballotOpenTime: ballot.ballotOpenTime,
          ballotCloseTime: ballot.ballotCloseTime,
          isExpired: ballot.isExpired,
          timeRemaining: ballot.timeRemaining,
          ballotStatus: ballot.ballotStatus
        } : null,
        voterEligibility: {
          isRegistered: voter.isRegistered,
          isPasswordActive: voter.isPasswordActive,
          isClassOfficer: voter.isClassOfficer,
          departmentMatch: voter.departmentId.college === election.departmentId.college,
          yearLevelMatch: canVoteForPosition,
          message: canVoteForPosition ? 
            "You are eligible to vote for this position" : 
            "You do not meet the requirements to vote for this position"
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Update year level restriction for departmental position (Election Committee)
  static async updateYearLevelRestriction(req, res, next) {
    try {
      const { positionId } = req.params
      const { allowedYearLevels } = req.body // Array of year levels [1, 2, 3, 4]

      const position = await Position.findById(positionId)
        .populate('deptElectionId', 'title departmentId')

      if (!position || !position.deptElectionId) {
        return res.status(404).json({ message: "Departmental Position not found" })
      }

      // Validate year levels
      const validYearLevels = [1, 2, 3, 4]
      if (!Array.isArray(allowedYearLevels) || 
          !allowedYearLevels.every(level => validYearLevels.includes(level))) {
        return res.status(400).json({ 
          message: "Invalid year levels. Must be an array containing values 1, 2, 3, or 4" 
        })
      }

      // Store year level restrictions (we'll add this to position description for now)
      const restrictionText = allowedYearLevels.length === 4 ? 
        "All year levels" : 
        `Year levels: ${allowedYearLevels.map(level => `${level}${level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th'}`).join(', ')}`

      position.description = position.description ? 
        position.description.replace(/Year levels:.*$/m, restrictionText) : 
        restrictionText

      await position.save()

      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Updated year level restriction for position ${position.positionName} to: ${restrictionText}`,
        req
      )

      res.json({
        message: "Year level restriction updated successfully",
        position: {
          _id: position._id,
          positionName: position.positionName,
          description: position.description
        },
        allowedYearLevels,
        restrictionText
      })
    } catch (error) {
      next(error)
    }
  }

  // ==================== HELPER FUNCTIONS ====================

  // Helper function to check year level restriction
  static async checkYearLevelRestriction(voterYearLevel, positionId) {
    try {
      const position = await Position.findById(positionId)
      if (!position || !position.description) {
        return true // No restrictions if no description
      }

      // Parse year level restrictions from description
      const yearLevelMatch = position.description.match(/Year levels?: (.*?)(?:\n|$)/)
      if (!yearLevelMatch) {
        return true // No restrictions found
      }

      const restrictionText = yearLevelMatch[1]
      if (restrictionText.includes('All year levels')) {
        return true
      }

      // Extract allowed year levels
      const allowedLevels = []
      if (restrictionText.includes('1st')) allowedLevels.push(1)
      if (restrictionText.includes('2nd')) allowedLevels.push(2)
      if (restrictionText.includes('3rd')) allowedLevels.push(3)
      if (restrictionText.includes('4th')) allowedLevels.push(4)

      return allowedLevels.includes(voterYearLevel)
    } catch (error) {
      console.error('Error checking year level restriction:', error)
      return true // Default to allowing if error occurs
    }
  }

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

    const position = await Position.findOne({ 
      _id: positionId, 
      deptElectionId: electionId,
      isActive: true 
    })
    if (!position) {
      return res.status(404).json({ message: "Position not found or not active" })
    }

    // CHECK IF POSITION BALLOT IS OPEN
    const now = new Date()
    const isPositionOpen = position.ballotOpenTime && position.ballotCloseTime &&
                          now >= position.ballotOpenTime && now <= position.ballotCloseTime
    
    if (!isPositionOpen) {
      return res.status(400).json({ 
        message: "Voting is not currently open for this position",
        ballotOpenTime: position.ballotOpenTime,
        ballotCloseTime: position.ballotCloseTime
      })
    }

    // Check if voter already has a ballot for this position
    const existingBallot = await Ballot.findOne({ 
      deptElectionId: electionId, 
      voterId,
      currentPositionId: positionId 
    })
    
    if (existingBallot) {
      if (existingBallot.isSubmitted) {
        return res.status(400).json({ message: `You have already voted for ${position.positionName}` })
      }
      // Return existing ballot WITHOUT starting timer
      return res.json({ 
        message: `Continuing existing ballot for ${position.positionName}`,
        ballot: existingBallot 
      })
    }

    // Verify voter eligibility
    const voter = await Voter.findById(voterId).populate('departmentId')
    if (!voter || !voter.isRegistered || !voter.isPasswordActive) {
      return res.status(400).json({ message: "Only registered voters can participate in departmental elections" })
    }

    if (!voter.isClassOfficer) {
      return res.status(403).json({ message: "Only class officers can vote in departmental elections" })
    }

    if (voter.departmentId.college !== election.departmentId.college) {
      return res.status(403).json({ message: "You can only vote in your department's elections" })
    }

    // Check year level restriction
    const canVoteForPosition = await BallotController.checkYearLevelRestriction(voter.yearLevel, positionId)
    if (!canVoteForPosition) {
      return res.status(403).json({ message: "You do not meet the year level requirements for this position" })
    }

    // Create new ballot WITHOUT timer - relies on position timing
    const ballotToken = crypto.randomBytes(32).toString('hex')
    
    const ballot = new Ballot({
      deptElectionId: electionId,
      voterId,
      currentPositionId: positionId,
      ballotToken,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      // REMOVED: Don't set ballot timing here - use position timing
      ballotOpenTime: position.ballotOpenTime,
      ballotCloseTime: position.ballotCloseTime,
      timerStarted: true, // Mark as active but no separate timer
      timerStartedAt: new Date()
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
        ballotOpenTime: ballot.ballotOpenTime,
        ballotCloseTime: ballot.ballotCloseTime,
        createdAt: ballot.createdAt
      }
    })
  } catch (error) {
    next(error)
  }
}

// Submit departmental ballot (Voters) - ONE POSITION ONLY
static async submitDepartmentalBallot(req, res, next) {
  try {
    const { ballotId } = req.params
    const { votes } = req.body // Array of { positionId, candidateId }
    const voterId = req.user.voterId

    const ballot = await Ballot.findById(ballotId)
      .populate('deptElectionId', 'title status')
      .populate('currentPositionId', 'positionName maxVotes') // ✅ ADDED maxVotes

    if (!ballot || !ballot.deptElectionId) {
      return res.status(404).json({ message: "Departmental Ballot not found" })
    }

    // Check ownership
    if (ballot.voterId.toString() !== voterId) {
      return res.status(403).json({ message: "Access denied" })
    }

    if (ballot.isSubmitted) {
      return res.status(400).json({ message: "Ballot has already been submitted for this position" })
    }

    // Check if ballot timing is still valid (position-based)
    const position = await Position.findById(ballot.currentPositionId._id) // ✅ FIXED: Use _id from populated object
    if (!position) {
      return res.status(404).json({ message: "Position not found" })
    }

    const now = new Date()
    if (!position.ballotOpenTime || !position.ballotCloseTime || 
        now < position.ballotOpenTime || now > position.ballotCloseTime) {
      return res.status(400).json({ message: "Voting time has expired for this position" })
    }

    // Validate votes
    if (!votes || !Array.isArray(votes) || votes.length === 0) {
      return res.status(400).json({ message: "No votes provided" })
    }

    // ✅ FIXED: Validate vote count against position's maxVotes
    const maxVotes = ballot.currentPositionId.maxVotes || 1
    if (votes.length > maxVotes) {
      return res.status(400).json({ 
        message: `You can only vote for up to ${maxVotes} candidate(s) for this position` 
      })
    }

    // ✅ FIXED: Process ALL votes (not just first one)
    const processedVotes = []
    
    for (const vote of votes) {
      // Verify position matches ballot's current position
      if (vote.positionId !== ballot.currentPositionId._id.toString()) { // ✅ FIXED: Compare with _id
        return res.status(400).json({
          message: "Position mismatch - vote must be for the current ballot position"
        })
      }

      // Validate candidate
      const candidate = await Candidate.findOne({
        _id: vote.candidateId,
        positionId: vote.positionId,
        deptElectionId: ballot.deptElectionId,
        isActive: true
      })

      if (!candidate) {
        return res.status(400).json({ 
          message: `Invalid candidate for this position` 
        })
      }

      // Check if already voted for this candidate (prevent duplicates)
      const existingVote = await Vote.findOne({
        ballotId: ballot._id,
        candidateId: vote.candidateId
      })

      if (existingVote) {
        return res.status(400).json({ 
          message: `Duplicate vote detected for candidate #${candidate.candidateNumber}` 
        })
      }

      // Create vote record
      const newVote = new Vote({
        ballotId: ballot._id,
        candidateId: vote.candidateId,
        positionId: vote.positionId,
        deptElectionId: ballot.deptElectionId
      })

      await newVote.save()
      processedVotes.push(newVote)

      // Update candidate vote count
      await Candidate.findByIdAndUpdate(
        vote.candidateId,
        { $inc: { voteCount: 1 } }
      )
    }

    // Submit ballot
    ballot.isSubmitted = true
    ballot.submittedAt = new Date()
    await ballot.save()

    const voter = await Voter.findById(voterId)
    
    await AuditLog.logVoterAction(
      "VOTED",
      voter,
      `Submitted ${processedVotes.length} vote(s) for position: ${ballot.currentPositionId.positionName} in election: ${ballot.deptElectionId.title}`,
      req
    )

    res.json({
      message: "Departmental Ballot submitted successfully",
      submittedAt: ballot.submittedAt,
      position: ballot.currentPositionId.positionName,
      voteCount: processedVotes.length
    })
  } catch (error) {
    next(error)
  }
}

  // Start SSG ballot with timer (Voters)
static async startSSGBallot(req, res, next) {
  try {
    const { electionId } = req.body
    const voterId = req.user.voterId

    const election = await SSGElection.findById(electionId)
    if (!election) {
      return res.status(404).json({ message: "SSG Election not found" })
    }

    if (election.status !== 'active') {
      return res.status(400).json({ message: "SSG Election is not active" })
    }

    if (!election.ballotsAreOpen) {
      return res.status(400).json({ 
        message: "Voting is not currently open for this election",
        ballotOpenTime: election.ballotOpenTime,
        ballotCloseTime: election.ballotCloseTime
      })
    }

    // CRITICAL FIX: Use findOneAndDelete with proper query to handle expired ballots atomically
    const now = new Date()
    
    // First, try to find and delete any expired ballot in one atomic operation
    const deletedExpiredBallot = await Ballot.findOneAndDelete({
      ssgElectionId: electionId,
      voterId,
      isSubmitted: false,
      ballotCloseTime: { $lt: now }
    })

    if (deletedExpiredBallot) {
      console.log(`[BALLOT] Deleted expired ballot ${deletedExpiredBallot._id}`)
      
      // Delete associated votes
      await Vote.deleteMany({ ballotId: deletedExpiredBallot._id })
      
      await AuditLog.logVoterAction(
        "BALLOT_EXPIRED_DELETED",
        { _id: voterId },
        `Expired ballot deleted for election: ${election.title}`,
        req
      )
    }

    // Now check for any active (non-expired) ballot
    const existingBallot = await Ballot.findOne({ 
      ssgElectionId: electionId, 
      voterId,
      $or: [
        { ballotCloseTime: { $gte: now } },
        { ballotCloseTime: null }
      ]
    })

    if (existingBallot) {
      console.log(`[BALLOT] Found existing active ballot ${existingBallot._id}`)
      
      if (existingBallot.isSubmitted) {
        return res.status(400).json({ message: "You have already voted in this SSG election" })
      }
      
      // Start timer if not started
      if (!existingBallot.timerStarted) {
        console.log(`[BALLOT] Starting timer for existing ballot ${existingBallot._id}`)
        await existingBallot.startTimer(10)
      }
      
      return res.json({ 
        message: "Continuing existing SSG ballot",
        ballot: existingBallot 
      })
    }

    // Verify voter eligibility
    const voter = await Voter.findById(voterId).populate('departmentId')
    if (!voter || !voter.isRegistered || !voter.isPasswordActive) {
      return res.status(400).json({ message: "Only registered voters can participate in SSG elections" })
    }

    console.log(`[BALLOT] Creating new ballot for voter ${voterId}`)

    // Create new ballot
    const ballotToken = crypto.randomBytes(32).toString('hex')
    
    const ballot = new Ballot({
      ssgElectionId: electionId,
      voterId,
      ballotToken,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    })

    await ballot.save()
    const ballotDuration = election.ballotDuration || 10
    await ballot.startTimer(ballotDuration)

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
        ballotOpenTime: ballot.ballotOpenTime,
        ballotCloseTime: ballot.ballotCloseTime,
        ballotDuration: ballot.ballotDuration,
        createdAt: ballot.createdAt
      }
    })
  } catch (error) {
    console.error('[BALLOT] Error in startSSGBallot:', error)
    
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: "A ballot operation is already in progress. Please wait a moment and try again.",
        error: "BALLOT_CONFLICT"
      })
    }
    
    next(error)
  }
}

// Get current active position for departmental election (enhanced)
  static async getCurrentActivePositionEnhanced(deptElectionId) {
    try {
      const now = new Date()
      
      // Find position where ballot is currently open
      const activePosition = await Position.findOne({
        deptElectionId,
        isActive: true,
        ballotOpenTime: { $lte: now },
        ballotCloseTime: { $gte: now }
      }).sort({ positionOrder: 1 })

      return activePosition
    } catch (error) {
      console.error('Error finding active position:', error)
      return null
    }
  }

  // Check if position ballot is open
  static isPositionBallotOpen(position) {
    if (!position || !position.ballotOpenTime || !position.ballotCloseTime) {
      return false
    }

    const now = new Date()
    return now >= position.ballotOpenTime && now <= position.ballotCloseTime
  }


}

module.exports = BallotController