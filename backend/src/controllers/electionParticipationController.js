const ElectionParticipation = require("../models/ElectionParticipation")
const Election = require("../models/Election")
const Voter = require("../models/Voter")
const AuditLog = require("../models/AuditLog")

class ElectionParticipationController {
  // Confirm participation in an election
  static async confirmParticipation(req, res, next) {
    try {
      const { electionId, voterId } = req.body

      if (!electionId || !voterId) {
        const error = new Error("Election ID and Voter ID are required")
        error.statusCode = 400
        return next(error)
      }

      // Verify election exists and is active
      const election = await Election.findById(electionId)
      if (!election) {
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }

      if (election.status !== "active" && election.status !== "upcoming") {
        const error = new Error("Election is not available for participation")
        error.statusCode = 400
        return next(error)
      }

      // Verify voter exists and is active
      const voter = await Voter.findById(voterId).populate("degreeId")
      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      if (!voter.isActive || !voter.isRegistered) {
        const error = new Error("Voter is not eligible to participate")
        error.statusCode = 400
        return next(error)
      }

      // Check if voter has already confirmed for this election
      const existingParticipation = await ElectionParticipation.findOne({
        voterId,
        electionId
      })

      if (existingParticipation) {
        if (existingParticipation.status === "withdrawn") {
          // Reactivate participation
          existingParticipation.status = "confirmed"
          existingParticipation.confirmedAt = new Date()
          await existingParticipation.save()

          await AuditLog.logVoterAction(
            "ELECTION_PARTICIPATION",
            voter,
            `Voter reconfirmed participation in election: ${election.title}`,
            req
          )

          return res.json({
            message: "Participation reconfirmed successfully",
            participation: existingParticipation
          })
        } else {
          const error = new Error("Voter has already confirmed participation in this election")
          error.statusCode = 400
          return next(error)
        }
      }

      // Create new participation record
      const participation = new ElectionParticipation({
        voterId,
        electionId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: "confirmed"
      })

      await participation.save()

      // Log the confirmation
      await AuditLog.logVoterAction(
        "ELECTION_PARTICIPATION",
        voter,
        `Voter confirmed participation in election: ${election.title}`,
        req
      )

      const populatedParticipation = await ElectionParticipation.findById(participation._id)
        .populate('voterId', 'schoolId firstName lastName degreeId')
        .populate('electionId', 'title electionYear electionType')

      res.status(201).json({
        message: "Participation confirmed successfully",
        participation: populatedParticipation
      })
    } catch (error) {
      next(error)
    }
  }

  // Mark voter as having voted (called when vote is cast)
  static async markAsVoted(req, res, next) {
    try {
      const { electionId, voterId } = req.body

      if (!electionId || !voterId) {
        const error = new Error("Election ID and Voter ID are required")
        error.statusCode = 400
        return next(error)
      }

      const participation = await ElectionParticipation.findOne({
        voterId,
        electionId,
        status: { $ne: "withdrawn" }
      }).populate('voterId', 'schoolId firstName lastName')
        .populate('electionId', 'title')

      if (!participation) {
        const error = new Error("Participation record not found")
        error.statusCode = 404
        return next(error)
      }

      if (participation.hasVoted) {
        const error = new Error("Voter has already been marked as voted")
        error.statusCode = 400
        return next(error)
      }

      // Mark as voted
      await participation.markAsVoted()

      // Log the vote
      await AuditLog.logVoterAction(
        "VOTE_CAST",
        participation.voterId,
        `Voter cast ballot in election: ${participation.electionId.title}`,
        req
      )

      res.json({
        message: "Voter marked as voted successfully",
        participation
      })
    } catch (error) {
      next(error)
    }
  }

  // Get all participants for an election
  static async getElectionParticipants(req, res, next) {
    try {
      const { electionId } = req.params
      const { status, hasVoted, page = 1, limit = 100, search } = req.query

      if (!electionId) {
        const error = new Error("Election ID is required")
        error.statusCode = 400
        return next(error)
      }

      // Build filter
      const filter = { electionId }
      
      if (status) filter.status = status
      if (hasVoted !== undefined) filter.hasVoted = hasVoted === "true"

      // Get participants with search functionality
      let query = ElectionParticipation.find(filter)
        .populate({
          path: 'voterId',
          select: 'schoolId firstName middleName lastName degreeId',
          populate: {
            path: 'degreeId',
            select: 'degreeCode degreeName major department'
          }
        })
        .populate('electionId', 'title electionYear electionType')
        .sort({ confirmedAt: -1 })

      // Apply search if provided
      if (search) {
        const searchNumber = Number(search)
        const searchConditions = [
          { 'voterId.firstName': { $regex: search, $options: 'i' } },
          { 'voterId.lastName': { $regex: search, $options: 'i' } }
        ]
        
        if (!isNaN(searchNumber)) {
          searchConditions.push({ 'voterId.schoolId': searchNumber })
        }

        // We need to use aggregation for complex search
        const participants = await ElectionParticipation.aggregate([
          { $match: filter },
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
              from: 'degrees',
              localField: 'voter.degreeId',
              foreignField: '_id',
              as: 'voter.degree'
            }
          },
          { $unwind: '$voter.degree' },
          {
            $lookup: {
              from: 'elections',
              localField: 'electionId',
              foreignField: '_id',
              as: 'election'
            }
          },
          { $unwind: '$election' },
          {
            $match: {
              $or: [
                { 'voter.firstName': { $regex: search, $options: 'i' } },
                { 'voter.lastName': { $regex: search, $options: 'i' } },
                ...(searchConditions.filter(cond => cond['voterId.schoolId']))
                  .map(cond => ({ 'voter.schoolId': cond['voterId.schoolId'] }))
              ]
            }
          },
          { $sort: { confirmedAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: Number.parseInt(limit) }
        ])

        const total = await ElectionParticipation.aggregate([
          { $match: filter },
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
            $match: {
              $or: [
                { 'voter.firstName': { $regex: search, $options: 'i' } },
                { 'voter.lastName': { $regex: search, $options: 'i' } },
                ...(searchConditions.filter(cond => cond['voterId.schoolId']))
                  .map(cond => ({ 'voter.schoolId': cond['voterId.schoolId'] }))
              ]
            }
          },
          { $count: 'total' }
        ])

        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          { username: req.user?.username },
          `Election participants accessed with search - Election: ${electionId}, Results: ${participants.length}`,
          req
        )

        return res.json({
          participants,
          total: total[0]?.total || 0,
          page: Number.parseInt(page),
          limit: Number.parseInt(limit)
        })
      }

      // Regular query without search
      const skip = (page - 1) * limit
      const participants = await query.skip(skip).limit(Number.parseInt(limit))
      const total = await ElectionParticipation.countDocuments(filter)

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        { username: req.user?.username },
        `Election participants accessed - Election: ${electionId}, Results: ${participants.length}`,
        req
      )

      res.json({
        participants,
        total,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit)
      })
    } catch (error) {
      next(error)
    }
  }

  // Get participation statistics for an election
  static async getElectionStats(req, res, next) {
    try {
      const { electionId } = req.params

      if (!electionId) {
        const error = new Error("Election ID is required")
        error.statusCode = 400
        return next(error)
      }

      const election = await Election.findById(electionId)
      if (!election) {
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }

      const stats = await ElectionParticipation.getElectionStats(electionId)
      
      // Calculate participation rate
      const participationRate = stats.totalConfirmed > 0 
        ? Math.round((stats.totalVoted / stats.totalConfirmed) * 100) 
        : 0

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        { username: req.user?.username },
        `Election participation stats accessed - Election: ${election.title}`,
        req
      )

      res.json({
        electionId,
        electionTitle: election.title,
        ...stats,
        participationRate
      })
    } catch (error) {
      next(error)
    }
  }

  // Get voter's participation history
  static async getVoterHistory(req, res, next) {
    try {
      const { voterId } = req.params

      if (!voterId) {
        const error = new Error("Voter ID is required")
        error.statusCode = 400
        return next(error)
      }

      const voter = await Voter.findById(voterId)
      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      const history = await ElectionParticipation.getVoterHistory(voterId)

      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        voter,
        `Voter participation history accessed - ${history.length} elections`,
        req
      )

      res.json({
        voterId,
        voterName: `${voter.firstName} ${voter.lastName}`,
        schoolId: voter.schoolId,
        participationHistory: history
      })
    } catch (error) {
      next(error)
    }
  }

  // Withdraw from election
  static async withdrawParticipation(req, res, next) {
    try {
      const { electionId, voterId } = req.body

      if (!electionId || !voterId) {
        const error = new Error("Election ID and Voter ID are required")
        error.statusCode = 400
        return next(error)
      }

      const participation = await ElectionParticipation.findOne({
        voterId,
        electionId,
        status: { $ne: "withdrawn" }
      }).populate('voterId', 'schoolId firstName lastName')
        .populate('electionId', 'title')

      if (!participation) {
        const error = new Error("Active participation record not found")
        error.statusCode = 404
        return next(error)
      }

      if (participation.hasVoted) {
        const error = new Error("Cannot withdraw after voting")
        error.statusCode = 400
        return next(error)
      }

      // Withdraw participation
      await participation.withdraw()

      await AuditLog.logVoterAction(
        "ELECTION_PARTICIPATION",
        participation.voterId,
        `Voter withdrew from election: ${participation.electionId.title}`,
        req
      )

      res.json({
        message: "Participation withdrawn successfully",
        participation
      })
    } catch (error) {
      next(error)
    }
  }

  // Check voter's status for a specific election
  static async checkVoterStatus(req, res, next) {
    try {
      const { electionId, voterId } = req.params

      if (!electionId || !voterId) {
        const error = new Error("Election ID and Voter ID are required")
        error.statusCode = 400
        return next(error)
      }

      const participation = await ElectionParticipation.findOne({
        voterId,
        electionId
      }).populate('electionId', 'title status electionDate')

      res.json({
        hasConfirmed: !!participation,
        hasVoted: participation?.hasVoted || false,
        status: participation?.status || "not_confirmed",
        confirmedAt: participation?.confirmedAt || null,
        votedAt: participation?.votedAt || null
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = ElectionParticipationController