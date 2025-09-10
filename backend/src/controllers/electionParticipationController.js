const ElectionParticipation = require("../models/ElectionParticipation")
const SSGElection = require("../models/SSGElection")
const DepartmentalElection = require("../models/DepartmentalElection")
const Voter = require("../models/Voter")
const AuditLog = require("../models/AuditLog")

class ElectionParticipationController {
  // Confirm participation in an election (SSG or Departmental)
  static async confirmParticipation(req, res, next) {
    try {
      const { electionId, electionType } = req.body
      const voterId = req.user.voterId

      if (!electionId || !electionType) {
        return res.status(400).json({ message: "Election ID and election type are required" })
      }

      if (!['ssg', 'departmental'].includes(electionType)) {
        return res.status(400).json({ message: "Election type must be 'ssg' or 'departmental'" })
      }

      // Verify voter exists and get voter info
      const voter = await Voter.findById(voterId).populate('departmentId')
      if (!voter) {
        return res.status(404).json({ message: "Voter not found" })
      }

      if (!voter.isActive || !voter.isRegistered) {
        return res.status(400).json({ message: "Only active and registered voters can participate in elections" })
      }

      // Verify election exists and is available for participation
      let election
      if (electionType === 'ssg') {
        election = await SSGElection.findById(electionId)
        if (!election) {
          return res.status(404).json({ message: "SSG Election not found" })
        }
      } else {
        election = await DepartmentalElection.findById(electionId).populate('departmentId')
        if (!election) {
          return res.status(404).json({ message: "Departmental Election not found" })
        }

        // For departmental elections, check if voter's department matches
        if (voter.departmentId.college !== election.departmentId.college) {
          return res.status(400).json({ message: "You can only participate in elections for your department/college" })
        }
      }

      if (election.status !== "active" && election.status !== "upcoming") {
        return res.status(400).json({ message: "Election is not available for participation" })
      }

      // Check if voter has already confirmed for this election
      const query = { voterId }
      if (electionType === 'ssg') {
        query.ssgElectionId = electionId
      } else {
        query.deptElectionId = electionId
      }

      const existingParticipation = await ElectionParticipation.findOne(query)

      if (existingParticipation) {
        if (existingParticipation.status === "withdrawn") {
          // Reactivate participation
          existingParticipation.status = "confirmed"
          existingParticipation.confirmedAt = new Date()
          await existingParticipation.save()

          await AuditLog.logVoterAction(
            "ELECTION_PARTICIPATION",
            voter,
            `Reconfirmed participation in ${electionType.toUpperCase()} election: ${election.title}`,
            req
          )

          return res.json({
            message: "Participation reconfirmed successfully",
            participation: existingParticipation
          })
        } else {
          return res.status(400).json({ message: "You have already confirmed participation in this election" })
        }
      }

      // Create new participation record
      const participationData = {
        voterId,
        departmentId: voter.departmentId._id,
        status: "confirmed"
      }

      if (electionType === 'ssg') {
        participationData.ssgElectionId = electionId
      } else {
        participationData.deptElectionId = electionId
      }

      const participation = new ElectionParticipation(participationData)
      await participation.save()

      // Populate for response
      await participation.populate([
        { path: 'voterId', select: 'schoolId firstName lastName departmentId yearLevel' },
        { path: 'departmentId', select: 'departmentCode degreeProgram college' },
        ...(electionType === 'ssg' 
          ? [{ path: 'ssgElectionId', select: 'title electionDate status' }]
          : [{ path: 'deptElectionId', select: 'title electionDate status departmentId' }]
        )
      ])

      await AuditLog.logVoterAction(
        "ELECTION_PARTICIPATION",
        voter,
        `Confirmed participation in ${electionType.toUpperCase()} election: ${election.title}`,
        req
      )

      res.status(201).json({
        message: "Participation confirmed successfully",
        participation
      })
    } catch (error) {
      next(error)
    }
  }

  // Mark voter as having voted (called when vote is cast)
  static async markAsVoted(req, res, next) {
    try {
      const { electionId, electionType, voterId } = req.body

      if (!electionId || !electionType || !voterId) {
        return res.status(400).json({ message: "Election ID, election type, and voter ID are required" })
      }

      if (!['ssg', 'departmental'].includes(electionType)) {
        return res.status(400).json({ message: "Election type must be 'ssg' or 'departmental'" })
      }

      const query = { voterId, status: { $ne: "withdrawn" } }
      if (electionType === 'ssg') {
        query.ssgElectionId = electionId
      } else {
        query.deptElectionId = electionId
      }

      const participation = await ElectionParticipation.findOne(query)
        .populate('voterId', 'schoolId firstName lastName')
        .populate(electionType === 'ssg' ? 'ssgElectionId' : 'deptElectionId', 'title')

      if (!participation) {
        return res.status(404).json({ message: "Participation record not found" })
      }

      if (participation.hasVoted) {
        return res.status(400).json({ message: "Voter has already been marked as voted" })
      }

      // Mark as voted
      await participation.markAsVoted()

      const election = participation.ssgElectionId || participation.deptElectionId
      await AuditLog.logVoterAction(
        "VOTED",
        participation.voterId,
        `Voted in ${electionType.toUpperCase()} election: ${election.title}`,
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
      const { electionType, status, hasVoted, page = 1, limit = 100, search } = req.query

      if (!electionId || !electionType) {
        return res.status(400).json({ message: "Election ID and election type are required" })
      }

      if (!['ssg', 'departmental'].includes(electionType)) {
        return res.status(400).json({ message: "Election type must be 'ssg' or 'departmental'" })
      }

      // Verify election exists
      let election
      if (electionType === 'ssg') {
        election = await SSGElection.findById(electionId)
      } else {
        election = await DepartmentalElection.findById(electionId)
      }

      if (!election) {
        return res.status(404).json({ message: `${electionType.toUpperCase()} Election not found` })
      }

      // Build filter
      const filter = {}
      if (electionType === 'ssg') {
        filter.ssgElectionId = electionId
      } else {
        filter.deptElectionId = electionId
      }
      
      if (status) filter.status = status
      if (hasVoted !== undefined) filter.hasVoted = hasVoted === "true"

      // Build query
      let query = ElectionParticipation.find(filter)
        .populate({
          path: 'voterId',
          select: 'schoolId firstName middleName lastName departmentId yearLevel',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        })
        .populate('departmentId', 'departmentCode degreeProgram college')
        .populate(electionType === 'ssg' ? 'ssgElectionId' : 'deptElectionId', 'title electionDate status')
        .sort({ confirmedAt: -1 })

      // Apply search if provided
      if (search) {
        const searchNumber = Number(search)
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
              from: 'departments',
              localField: 'voter.departmentId',
              foreignField: '_id',
              as: 'voter.department'
            }
          },
          { $unwind: '$voter.department' },
          {
            $lookup: {
              from: 'departments',
              localField: 'departmentId',
              foreignField: '_id',
              as: 'department'
            }
          },
          { $unwind: '$department' },
          {
            $lookup: {
              from: electionType === 'ssg' ? 'ssgelections' : 'departmentalelections',
              localField: electionType === 'ssg' ? 'ssgElectionId' : 'deptElectionId',
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
                ...(isNaN(searchNumber) ? [] : [{ 'voter.schoolId': searchNumber }])
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
                ...(isNaN(searchNumber) ? [] : [{ 'voter.schoolId': searchNumber }])
              ]
            }
          },
          { $count: 'total' }
        ])

        await AuditLog.logUserAction(
          "DATA_EXPORT",
          req.user,
          `${electionType.toUpperCase()} election participants accessed with search - Election: ${election.title}, Results: ${participants.length}`,
          req
        )

        return res.json({
          participants,
          total: total[0]?.total || 0,
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          election: {
            _id: election._id,
            title: election.title,
            electionDate: election.electionDate,
            status: election.status,
            type: electionType.toUpperCase()
          }
        })
      }

      // Regular query without search
      const skip = (page - 1) * limit
      const participants = await query.skip(skip).limit(Number.parseInt(limit))
      const total = await ElectionParticipation.countDocuments(filter)

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `${electionType.toUpperCase()} election participants accessed - Election: ${election.title}, Results: ${participants.length}`,
        req
      )

      res.json({
        participants,
        total,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        election: {
          _id: election._id,
          title: election.title,
          electionDate: election.electionDate,
          status: election.status,
          type: electionType.toUpperCase()
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get participation statistics for an election
  static async getElectionStats(req, res, next) {
    try {
      const { electionId } = req.params
      const { electionType } = req.query

      if (!electionId || !electionType) {
        return res.status(400).json({ message: "Election ID and election type are required" })
      }

      if (!['ssg', 'departmental'].includes(electionType)) {
        return res.status(400).json({ message: "Election type must be 'ssg' or 'departmental'" })
      }

      // Verify election exists
      let election
      if (electionType === 'ssg') {
        election = await SSGElection.findById(electionId)
      } else {
        election = await DepartmentalElection.findById(electionId)
      }

      if (!election) {
        return res.status(404).json({ message: `${electionType.toUpperCase()} Election not found` })
      }

      const stats = await ElectionParticipation.getElectionStats(electionId, electionType)
      
      // Calculate participation rate
      const participationRate = stats.totalConfirmed > 0 
        ? Math.round((stats.totalVoted / stats.totalConfirmed) * 100) 
        : 0

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `${electionType.toUpperCase()} election participation stats accessed - Election: ${election.title}`,
        req
      )

      res.json({
        electionId,
        electionTitle: election.title,
        electionType: electionType.toUpperCase(),
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
        return res.status(400).json({ message: "Voter ID is required" })
      }

      const voter = await Voter.findById(voterId)
      if (!voter) {
        return res.status(404).json({ message: "Voter not found" })
      }

      const history = await ElectionParticipation.find({ voterId })
        .populate('ssgElectionId', 'title electionDate status electionYear')
        .populate('deptElectionId', 'title electionDate status electionYear')
        .populate('departmentId', 'departmentCode degreeProgram college')
        .sort({ confirmedAt: -1 })

      // Format history with election type
      const formattedHistory = history.map(participation => ({
        ...participation.toObject(),
        electionType: participation.ssgElectionId ? 'SSG' : 'DEPARTMENTAL',
        election: participation.ssgElectionId || participation.deptElectionId
      }))

      await AuditLog.logVoterAction(
        "DATA_EXPORT",
        voter,
        `Voter participation history accessed - ${history.length} elections`,
        req
      )

      res.json({
        voterId,
        voterName: voter.fullName,
        schoolId: voter.schoolId,
        participationHistory: formattedHistory
      })
    } catch (error) {
      next(error)
    }
  }

  // Withdraw from election
  static async withdrawParticipation(req, res, next) {
    try {
      const { electionId, electionType } = req.body
      const voterId = req.user.voterId

      if (!electionId || !electionType) {
        return res.status(400).json({ message: "Election ID and election type are required" })
      }

      if (!['ssg', 'departmental'].includes(electionType)) {
        return res.status(400).json({ message: "Election type must be 'ssg' or 'departmental'" })
      }

      const query = { voterId, status: { $ne: "withdrawn" } }
      if (electionType === 'ssg') {
        query.ssgElectionId = electionId
      } else {
        query.deptElectionId = electionId
      }

      const participation = await ElectionParticipation.findOne(query)
        .populate('voterId', 'schoolId firstName lastName')
        .populate(electionType === 'ssg' ? 'ssgElectionId' : 'deptElectionId', 'title')

      if (!participation) {
        return res.status(404).json({ message: "Active participation record not found" })
      }

      if (participation.hasVoted) {
        return res.status(400).json({ message: "Cannot withdraw after voting" })
      }

      // Withdraw participation
      await participation.withdraw()

      const election = participation.ssgElectionId || participation.deptElectionId
      await AuditLog.logVoterAction(
        "ELECTION_PARTICIPATION",
        participation.voterId,
        `Withdrew from ${electionType.toUpperCase()} election: ${election.title}`,
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
      const { electionId } = req.params
      const { electionType } = req.query
      const voterId = req.user.voterId

      if (!electionId || !electionType) {
        return res.status(400).json({ message: "Election ID and election type are required" })
      }

      if (!['ssg', 'departmental'].includes(electionType)) {
        return res.status(400).json({ message: "Election type must be 'ssg' or 'departmental'" })
      }

      // Get voter info for eligibility check
      const voter = await Voter.findById(voterId).populate('departmentId')
      if (!voter) {
        return res.status(404).json({ message: "Voter not found" })
      }

      // Check voting eligibility
      let canVote = false
      let eligibilityMessage = ""

      if (electionType === 'ssg') {
        canVote = voter.isRegistered && voter.isPasswordActive
        eligibilityMessage = canVote 
          ? "You are eligible to vote in this SSG election"
          : "You must be a registered voter to participate in SSG elections"
      } else {
        canVote = voter.isRegistered && voter.isPasswordActive && voter.isClassOfficer
        if (canVote) {
          eligibilityMessage = "You are eligible to vote in this departmental election"
        } else if (!voter.isRegistered || !voter.isPasswordActive) {
          eligibilityMessage = "You must be a registered voter to participate in departmental elections"
        } else {
          eligibilityMessage = "Only class officers can vote in departmental elections. You can view statistics and results."
        }
      }

      const query = { voterId }
      if (electionType === 'ssg') {
        query.ssgElectionId = electionId
      } else {
        query.deptElectionId = electionId
      }

      const participation = await ElectionParticipation.findOne(query)
        .populate(electionType === 'ssg' ? 'ssgElectionId' : 'deptElectionId', 'title status electionDate')

      res.json({
        hasConfirmed: !!participation,
        hasVoted: participation?.hasVoted || false,
        status: participation?.status || "not_confirmed",
        confirmedAt: participation?.confirmedAt || null,
        votedAt: participation?.votedAt || null,
        canVote,
        eligibilityMessage,
        voterInfo: {
          isRegistered: voter.isRegistered,
          isClassOfficer: voter.isClassOfficer,
          isPasswordActive: voter.isPasswordActive
        }
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = ElectionParticipationController