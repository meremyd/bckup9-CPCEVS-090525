const ElectionParticipation = require("../models/ElectionParticipation")
const SSGElection = require("../models/SSGElection")
const DepartmentalElection = require("../models/DepartmentalElection")
const Voter = require("../models/Voter")
const AuditLog = require("../models/AuditLog")
const PDFDocument = require('pdfkit')

class ElectionParticipationController {
  // Confirm participation in SSG election
  static async confirmSSGParticipation(req, res, next) {
    try {
      const { ssgElectionId } = req.body
      const voterId = req.user.voterId

      if (!ssgElectionId) {
        return res.status(400).json({ message: "SSG Election ID is required" })
      }

      // Verify SSG election exists and is available
      const ssgElection = await SSGElection.findById(ssgElectionId)
      if (!ssgElection) {
        return res.status(404).json({ message: "SSG Election not found" })
      }

      if (!['upcoming', 'active'].includes(ssgElection.status)) {
        return res.status(400).json({ message: "This SSG election is not available for participation" })
      }

      // Check eligibility using model method
      const eligibilityCheck = await ElectionParticipation.checkParticipationEligibility(
        voterId, 
        ssgElectionId, 
        'ssg'
      )

      if (!eligibilityCheck.eligible) {
        return res.status(400).json({ message: eligibilityCheck.reason })
      }

      // Create participation record
      const participation = new ElectionParticipation({
        voterId,
        ssgElectionId,
        departmentId: eligibilityCheck.voter.departmentId._id
      })

      await participation.save()

      // Populate for response
      await participation.populate([
        { 
          path: 'voterId', 
          select: 'schoolId firstName middleName lastName departmentId',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        },
        { path: 'ssgElectionId', select: 'title electionDate status electionYear' }
      ])

      await AuditLog.logVoterAction(
        "ELECTION_PARTICIPATION",
        eligibilityCheck.voter,
        `Confirmed participation in SSG election: ${ssgElection.title}`,
        req
      )

      res.status(201).json({
        message: "SSG election participation confirmed successfully",
        participation
      })
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ message: "You have already confirmed participation in this SSG election" })
      }
      next(error)
    }
  }

  // Confirm participation in Departmental election
  static async confirmDepartmentalParticipation(req, res, next) {
    try {
      const { deptElectionId } = req.body
      const voterId = req.user.voterId

      if (!deptElectionId) {
        return res.status(400).json({ message: "Departmental Election ID is required" })
      }

      // Verify departmental election exists and is available
      const deptElection = await DepartmentalElection.findById(deptElectionId).populate('departmentId')
      if (!deptElection) {
        return res.status(404).json({ message: "Departmental Election not found" })
      }

      if (!['upcoming', 'active'].includes(deptElection.status)) {
        return res.status(400).json({ message: "This departmental election is not available for participation" })
      }

      // Check eligibility using model method
      const eligibilityCheck = await ElectionParticipation.checkParticipationEligibility(
        voterId, 
        deptElectionId, 
        'departmental'
      )

      if (!eligibilityCheck.eligible) {
        return res.status(400).json({ message: eligibilityCheck.reason })
      }

      // Create participation record
      const participation = new ElectionParticipation({
        voterId,
        deptElectionId,
        departmentId: eligibilityCheck.voter.departmentId._id
      })

      await participation.save()

      // Populate for response
      await participation.populate([
        { 
          path: 'voterId', 
          select: 'schoolId firstName middleName lastName departmentId yearLevel isClassOfficer',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        },
        { 
          path: 'deptElectionId', 
          select: 'title electionDate status electionYear departmentId',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        }
      ])

      await AuditLog.logVoterAction(
        "ELECTION_PARTICIPATION",
        eligibilityCheck.voter,
        `Confirmed participation in Departmental election: ${deptElection.title}`,
        req
      )

      res.status(201).json({
        message: "Departmental election participation confirmed successfully",
        participation
      })
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ message: "You have already confirmed participation in this departmental election" })
      }
      next(error)
    }
  }

  // Check voter status for SSG election
  static async checkSSGStatus(req, res, next) {
    try {
      const { ssgElectionId } = req.params
      const voterId = req.user.voterId

      // Get voter info
      const voter = await Voter.findById(voterId).populate('departmentId')
      if (!voter) {
        return res.status(404).json({ message: "Voter not found" })
      }

      // Check if participated
      const participation = await ElectionParticipation.findOne({
        voterId,
        ssgElectionId
      }).populate('ssgElectionId', 'title status electionDate')

      // Check voting eligibility
      const canParticipate = voter.isActive && voter.isRegistered && voter.isPasswordActive
      
      res.json({
        hasParticipated: !!participation,
        hasVoted: participation?.hasVoted || false,
        participatedAt: participation?.confirmedAt || null,
        votedAt: participation?.votedAt || null,
        canParticipate,
        eligibilityMessage: canParticipate 
          ? "You are eligible to participate in SSG elections"
          : "You must be an active registered voter to participate in SSG elections",
        voterInfo: {
          isRegistered: voter.isRegistered,
          isActive: voter.isActive,
          isPasswordActive: voter.isPasswordActive,
          department: voter.departmentId ? {
            code: voter.departmentId.departmentCode,
            program: voter.departmentId.degreeProgram,
            college: voter.departmentId.college
          } : null
        },
        election: participation?.ssgElectionId || null
      })
    } catch (error) {
      next(error)
    }
  }

  // Check voter status for Departmental election
  static async checkDepartmentalStatus(req, res, next) {
    try {
      const { deptElectionId } = req.params
      const voterId = req.user.voterId

      // Get voter info
      const voter = await Voter.findById(voterId).populate('departmentId')
      if (!voter) {
        return res.status(404).json({ message: "Voter not found" })
      }

      // Get departmental election info
      const deptElection = await DepartmentalElection.findById(deptElectionId).populate('departmentId')
      if (!deptElection) {
        return res.status(404).json({ message: "Departmental election not found" })
      }

      // Check if participated
      const participation = await ElectionParticipation.findOne({
        voterId,
        deptElectionId
      }).populate({
        path: 'deptElectionId',
        select: 'title status electionDate departmentId',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })

      // Check eligibility
      const isEligible = voter.isActive && 
                        voter.isRegistered && 
                        voter.isPasswordActive && 
                        voter.isClassOfficer &&
                        voter.departmentId._id.toString() === deptElection.departmentId._id.toString()

      let eligibilityMessage = ""
      if (!voter.isActive || !voter.isRegistered || !voter.isPasswordActive) {
        eligibilityMessage = "You must be an active registered voter"
      } else if (!voter.isClassOfficer) {
        eligibilityMessage = "Only class officers can participate in departmental elections"
      } else if (voter.departmentId._id.toString() !== deptElection.departmentId._id.toString()) {
        eligibilityMessage = "You can only participate in elections for your department"
      } else {
        eligibilityMessage = "You are eligible to participate in this departmental election"
      }
      
      res.json({
        hasParticipated: !!participation,
        hasVoted: participation?.hasVoted || false,
        participatedAt: participation?.confirmedAt || null,
        votedAt: participation?.votedAt || null,
        canParticipate: isEligible,
        eligibilityMessage,
        voterInfo: {
          isRegistered: voter.isRegistered,
          isActive: voter.isActive,
          isPasswordActive: voter.isPasswordActive,
          isClassOfficer: voter.isClassOfficer,
          department: voter.departmentId ? {
            code: voter.departmentId.departmentCode,
            program: voter.departmentId.degreeProgram,
            college: voter.departmentId.college
          } : null
        },
        election: participation?.deptElectionId || null,
        electionDepartment: {
          code: deptElection.departmentId.departmentCode,
          program: deptElection.departmentId.degreeProgram,
          college: deptElection.departmentId.college
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Generate voting receipt for SSG election
  static async getSSGVotingReceipt(req, res, next) {
    try {
      const { ssgElectionId } = req.params
      const voterId = req.user.voterId

      const receipt = await ElectionParticipation.generateVotingReceipt(
        voterId, 
        ssgElectionId, 
        'ssg'
      )

      if (!receipt.hasVoted) {
        return res.status(404).json({ 
          message: "No voting record found",
          reason: receipt.reason 
        })
      }

      // Get election and voter info for receipt
      const [ssgElection, voter] = await Promise.all([
        SSGElection.findById(ssgElectionId, 'title electionDate electionYear'),
        Voter.findById(voterId, 'schoolId firstName middleName lastName').populate('departmentId', 'departmentCode degreeProgram college')
      ])

      await AuditLog.logVoterAction(
        "VOTE_RECEIPT_GENERATED",
        voter,
        `Generated voting receipt for SSG election: ${ssgElection.title}`,
        req
      )

      res.json({
        message: "Voting receipt generated successfully",
        receipt: {
          electionType: "SSG",
          election: ssgElection,
          voter: {
            schoolId: voter.schoolId,
            fullName: voter.fullName,
            department: voter.departmentId
          },
          ...receipt
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Generate voting receipt for Departmental election
  static async getDepartmentalVotingReceipt(req, res, next) {
    try {
      const { deptElectionId } = req.params
      const voterId = req.user.voterId

      const receipt = await ElectionParticipation.generateVotingReceipt(
        voterId, 
        deptElectionId, 
        'departmental'
      )

      if (!receipt.hasVoted) {
        return res.status(404).json({ 
          message: "No voting record found",
          reason: receipt.reason 
        })
      }

      // Get election and voter info for receipt
      const [deptElection, voter] = await Promise.all([
        DepartmentalElection.findById(deptElectionId, 'title electionDate electionYear').populate('departmentId', 'departmentCode degreeProgram college'),
        Voter.findById(voterId, 'schoolId firstName middleName lastName isClassOfficer').populate('departmentId', 'departmentCode degreeProgram college')
      ])

      await AuditLog.logVoterAction(
        "VOTE_RECEIPT_GENERATED",
        voter,
        `Generated voting receipt for Departmental election: ${deptElection.title}`,
        req
      )

      res.json({
        message: "Voting receipt generated successfully",
        receipt: {
          electionType: "DEPARTMENTAL",
          election: deptElection,
          voter: {
            schoolId: voter.schoolId,
            fullName: voter.fullName,
            isClassOfficer: voter.isClassOfficer,
            department: voter.departmentId
          },
          ...receipt
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get SSG election participants (Admin/Committee/SAO only)
  static async getSSGParticipants(req, res, next) {
    try {
      const { ssgElectionId } = req.params
      const { page = 1, limit = 100, search, hasVoted } = req.query

      // Verify SSG election exists
      const ssgElection = await SSGElection.findById(ssgElectionId)
      if (!ssgElection) {
        return res.status(404).json({ message: "SSG Election not found" })
      }

      // Build filter
      const filter = { ssgElectionId }
      if (hasVoted !== undefined) filter.hasVoted = hasVoted === "true"

      let query = ElectionParticipation.find(filter)
        .populate({
          path: 'voterId',
          select: 'schoolId firstName middleName lastName departmentId sex',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        })
        .populate('ssgElectionId', 'title electionDate status')
        .sort({ confirmedAt: -1 })

      // Apply search if provided
      if (search) {
        const searchNumber = Number(search)
        const searchRegex = { $regex: search, $options: 'i' }
        
        const matchStage = {
          $or: [
            { 'voter.firstName': searchRegex },
            { 'voter.middleName': searchRegex },
            { 'voter.lastName': searchRegex },
            { 'voter.department.departmentCode': searchRegex },
            { 'voter.department.degreeProgram': searchRegex },
            ...(isNaN(searchNumber) ? [] : [{ 'voter.schoolId': searchNumber }])
          ]
        }

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
              from: 'ssgelections',
              localField: 'ssgElectionId',
              foreignField: '_id',
              as: 'election'
            }
          },
          { $unwind: '$election' },
          { $match: matchStage },
          { $sort: { confirmedAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: Number.parseInt(limit) }
        ])

        const totalSearch = await ElectionParticipation.aggregate([
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
          { $match: matchStage },
          { $count: 'total' }
        ])

        return res.json({
          participants,
          total: totalSearch[0]?.total || 0,
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          election: {
            _id: ssgElection._id,
            title: ssgElection.title,
            electionDate: ssgElection.electionDate,
            status: ssgElection.status,
            type: "SSG"
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
        `SSG election participants accessed - Election: ${ssgElection.title}, Results: ${participants.length}`,
        req
      )

      res.json({
        participants,
        total,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        election: {
          _id: ssgElection._id,
          title: ssgElection.title,
          electionDate: ssgElection.electionDate,
          status: ssgElection.status,
          type: "SSG"
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get Departmental election participants (Admin/Committee/SAO only)
  static async getDepartmentalParticipants(req, res, next) {
    try {
      const { deptElectionId } = req.params
      const { page = 1, limit = 100, search, hasVoted } = req.query

      // Verify departmental election exists
      const deptElection = await DepartmentalElection.findById(deptElectionId).populate('departmentId')
      if (!deptElection) {
        return res.status(404).json({ message: "Departmental Election not found" })
      }

      // Build filter
      const filter = { deptElectionId }
      if (hasVoted !== undefined) filter.hasVoted = hasVoted === "true"

      let query = ElectionParticipation.find(filter)
        .populate({
          path: 'voterId',
          select: 'schoolId firstName middleName lastName departmentId yearLevel isClassOfficer',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        })
        .populate({
          path: 'deptElectionId',
          select: 'title electionDate status departmentId',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        })
        .sort({ confirmedAt: -1 })

      // Apply search if provided
      if (search) {
        const searchNumber = Number(search)
        const searchRegex = { $regex: search, $options: 'i' }
        
        const matchStage = {
          $or: [
            { 'voter.firstName': searchRegex },
            { 'voter.middleName': searchRegex },
            { 'voter.lastName': searchRegex },
            { 'voter.department.departmentCode': searchRegex },
            { 'voter.department.degreeProgram': searchRegex },
            ...(isNaN(searchNumber) ? [] : [{ 'voter.schoolId': searchNumber }])
          ]
        }

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
              from: 'departmentalelections',
              localField: 'deptElectionId',
              foreignField: '_id',
              as: 'election'
            }
          },
          { $unwind: '$election' },
          {
            $lookup: {
              from: 'departments',
              localField: 'election.departmentId',
              foreignField: '_id',
              as: 'election.department'
            }
          },
          { $unwind: '$election.department' },
          { $match: matchStage },
          { $sort: { confirmedAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: Number.parseInt(limit) }
        ])

        const totalSearch = await ElectionParticipation.aggregate([
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
          { $match: matchStage },
          { $count: 'total' }
        ])

        return res.json({
          participants,
          total: totalSearch[0]?.total || 0,
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          election: {
            _id: deptElection._id,
            title: deptElection.title,
            electionDate: deptElection.electionDate,
            status: deptElection.status,
            type: "DEPARTMENTAL",
            department: deptElection.departmentId
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
        `Departmental election participants accessed - Election: ${deptElection.title}, Results: ${participants.length}`,
        req
      )

      res.json({
        participants,
        total,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        election: {
          _id: deptElection._id,
          title: deptElection.title,
          electionDate: deptElection.electionDate,
          status: deptElection.status,
          type: "DEPARTMENTAL",
          department: deptElection.departmentId
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get SSG election statistics (Admin/Committee/SAO only)
  static async getSSGStatistics(req, res, next) {
    try {
      const { ssgElectionId } = req.params

      // Verify SSG election exists
      const ssgElection = await SSGElection.findById(ssgElectionId)
      if (!ssgElection) {
        return res.status(404).json({ message: "SSG Election not found" })
      }

      const stats = await ElectionParticipation.getElectionStatistics(ssgElectionId, 'ssg')

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `SSG election participation stats accessed - Election: ${ssgElection.title}`,
        req
      )

      res.json({
        electionId: ssgElectionId,
        electionTitle: ssgElection.title,
        electionType: "SSG",
        electionDate: ssgElection.electionDate,
        electionStatus: ssgElection.status,
        ...stats
      })
    } catch (error) {
      next(error)
    }
  }

  // Get Departmental election statistics (Admin/Committee/SAO only)
  static async getDepartmentalStatistics(req, res, next) {
    try {
      const { deptElectionId } = req.params

      // Verify departmental election exists
      const deptElection = await DepartmentalElection.findById(deptElectionId).populate('departmentId')
      if (!deptElection) {
        return res.status(404).json({ message: "Departmental Election not found" })
      }

      const stats = await ElectionParticipation.getElectionStatistics(deptElectionId, 'departmental')

      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        `Departmental election participation stats accessed - Election: ${deptElection.title}`,
        req
      )

      res.json({
        electionId: deptElectionId,
        electionTitle: deptElection.title,
        electionType: "DEPARTMENTAL",
        electionDate: deptElection.electionDate,
        electionStatus: deptElection.status,
        department: deptElection.departmentId,
        ...stats
      })
    } catch (error) {
      next(error)
    }
  }


// Export SSG election participants as PDF
static async exportSSGParticipantsPDF(req, res, next) {
  try {
    const { ssgElectionId } = req.params
    const { hasVoted } = req.query

    // Verify SSG election exists
    const ssgElection = await SSGElection.findById(ssgElectionId)
    if (!ssgElection) {
      return res.status(404).json({ message: "SSG Election not found" })
    }

    // Build filter
    const filter = { ssgElectionId }
    if (hasVoted !== undefined) filter.hasVoted = hasVoted === "true"

    const participants = await ElectionParticipation.find(filter)
      .populate({
        path: 'voterId',
        select: 'schoolId firstName middleName lastName departmentId sex',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })
      .populate('ssgElectionId', 'title electionDate status')
      .sort({ confirmedAt: -1 })

    // Create PDF
    const doc = new PDFDocument()
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="SSG_Participants_${ssgElection.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`)
    
    doc.pipe(res)

    // PDF Content
    doc.fontSize(16).text(`SSG Election Participants Report`, { align: 'center' })
    doc.moveDown()
    doc.fontSize(12).text(`Election: ${ssgElection.title}`)
    doc.text(`Date: ${new Date(ssgElection.electionDate).toLocaleDateString()}`)
    doc.text(`Status: ${ssgElection.status.toUpperCase()}`)
    doc.text(`Generated: ${new Date().toLocaleString()}`)
    doc.text(`Total Participants: ${participants.length}`)
    doc.moveDown()

    // Table headers
    const startX = 50
    let currentY = doc.y
    doc.fontSize(10)
    doc.text('School ID', startX, currentY, { width: 70 })
    doc.text('Full Name', startX + 75, currentY, { width: 120 })
    doc.text('Department', startX + 200, currentY, { width: 80 })
    doc.text('Sex', startX + 285, currentY, { width: 40 })
    doc.text('Participated', startX + 330, currentY, { width: 60 })
    doc.text('Voted', startX + 395, currentY, { width: 40 })
    
    currentY += 20
    doc.moveTo(startX, currentY).lineTo(550, currentY).stroke()
    currentY += 10

    // Participant data
    participants.forEach((participant, index) => {
      if (currentY > 750) { // New page if needed
        doc.addPage()
        currentY = 50
      }

      const voter = participant.voterId
      const fullName = voter.middleName ? 
        `${voter.firstName} ${voter.middleName} ${voter.lastName}` : 
        `${voter.firstName} ${voter.lastName}`

      doc.text(voter.schoolId.toString(), startX, currentY, { width: 70 })
      doc.text(fullName, startX + 75, currentY, { width: 120 })
      doc.text(voter.departmentId.departmentCode, startX + 200, currentY, { width: 80 })
      doc.text(voter.sex || 'N/A', startX + 285, currentY, { width: 40 })
      doc.text(new Date(participant.confirmedAt).toLocaleDateString(), startX + 330, currentY, { width: 60 })
      doc.text(participant.hasVoted ? 'Yes' : 'No', startX + 395, currentY, { width: 40 })
      
      currentY += 15
    })

    doc.end()

    await AuditLog.logUserAction(
      "DATA_EXPORT",
      req.user,
      `SSG election participants exported to PDF - Election: ${ssgElection.title}, Count: ${participants.length}`,
      req
    )

  } catch (error) {
    next(error)
  }
}

// Export Departmental election participants as PDF
static async exportDepartmentalParticipantsPDF(req, res, next) {
  try {
    const { deptElectionId } = req.params
    const { hasVoted } = req.query

    // Verify departmental election exists
    const deptElection = await DepartmentalElection.findById(deptElectionId).populate('departmentId')
    if (!deptElection) {
      return res.status(404).json({ message: "Departmental Election not found" })
    }

    // Build filter
    const filter = { deptElectionId }
    if (hasVoted !== undefined) filter.hasVoted = hasVoted === "true"

    const participants = await ElectionParticipation.find(filter)
      .populate({
        path: 'voterId',
        select: 'schoolId firstName middleName lastName departmentId yearLevel isClassOfficer',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })
      .populate({
        path: 'deptElectionId',
        select: 'title electionDate status departmentId',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })
      .sort({ confirmedAt: -1 })

    // Create PDF
    const doc = new PDFDocument()
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Departmental_Participants_${deptElection.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`)
    
    doc.pipe(res)

    // PDF Content
    doc.fontSize(16).text(`Departmental Election Participants Report`, { align: 'center' })
    doc.moveDown()
    doc.fontSize(12).text(`Election: ${deptElection.title}`)
    doc.text(`Department: ${deptElection.departmentId.departmentCode} - ${deptElection.departmentId.degreeProgram}`)
    doc.text(`Date: ${new Date(deptElection.electionDate).toLocaleDateString()}`)
    doc.text(`Status: ${deptElection.status.toUpperCase()}`)
    doc.text(`Generated: ${new Date().toLocaleString()}`)
    doc.text(`Total Participants: ${participants.length}`)
    doc.moveDown()

    // Table headers
    const startX = 50
    let currentY = doc.y
    doc.fontSize(10)
    doc.text('School ID', startX, currentY, { width: 70 })
    doc.text('Full Name', startX + 75, currentY, { width: 120 })
    doc.text('Year Level', startX + 200, currentY, { width: 60 })
    doc.text('Class Officer', startX + 265, currentY, { width: 70 })
    doc.text('Participated', startX + 340, currentY, { width: 60 })
    doc.text('Voted', startX + 405, currentY, { width: 40 })
    
    currentY += 20
    doc.moveTo(startX, currentY).lineTo(550, currentY).stroke()
    currentY += 10

    // Participant data
    participants.forEach((participant, index) => {
      if (currentY > 750) { // New page if needed
        doc.addPage()
        currentY = 50
      }

      const voter = participant.voterId
      const fullName = voter.middleName ? 
        `${voter.firstName} ${voter.middleName} ${voter.lastName}` : 
        `${voter.firstName} ${voter.lastName}`

      doc.text(voter.schoolId.toString(), startX, currentY, { width: 70 })
      doc.text(fullName, startX + 75, currentY, { width: 120 })
      doc.text(voter.yearLevel.toString(), startX + 200, currentY, { width: 60 })
      doc.text(voter.isClassOfficer ? 'Yes' : 'No', startX + 265, currentY, { width: 70 })
      doc.text(new Date(participant.confirmedAt).toLocaleDateString(), startX + 340, currentY, { width: 60 })
      doc.text(participant.hasVoted ? 'Yes' : 'No', startX + 405, currentY, { width: 40 })
      
      currentY += 15
    })

    doc.end()

    await AuditLog.logUserAction(
      "DATA_EXPORT",
      req.user,
      `Departmental election participants exported to PDF - Election: ${deptElection.title}, Count: ${participants.length}`,
      req
    )

  } catch (error) {
    next(error)
  }
}

}

module.exports = ElectionParticipationController