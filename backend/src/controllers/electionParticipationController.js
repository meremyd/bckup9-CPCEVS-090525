const mongoose = require("mongoose")
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

    console.log('=== SSG Participation Request ===')
    console.log('Voter ID (raw):', voterId, 'Type:', typeof voterId)
    console.log('SSG Election ID (raw):', ssgElectionId, 'Type:', typeof ssgElectionId)

    if (!ssgElectionId) {
      return res.status(400).json({ message: "SSG Election ID is required" })
    }

    const mongoose = require('mongoose')
    
    // MORE ROBUST: Try to find with multiple query formats
    let existingParticipation = null
    
    // Try 1: Direct IDs (in case they're already ObjectIds or strings work)
    existingParticipation = await ElectionParticipation.findOne({
      voterId: voterId,
      ssgElectionId: ssgElectionId
    })
    
    console.log('Check 1 (direct):', existingParticipation ? 'FOUND' : 'NOT FOUND')
    
    // Try 2: With ObjectId conversion
    if (!existingParticipation) {
      try {
        const voterObjectId = new mongoose.Types.ObjectId(voterId)
        const electionObjectId = new mongoose.Types.ObjectId(ssgElectionId)
        
        existingParticipation = await ElectionParticipation.findOne({
          voterId: voterObjectId,
          ssgElectionId: electionObjectId
        })
        
        console.log('Check 2 (ObjectId):', existingParticipation ? 'FOUND' : 'NOT FOUND')
      } catch (conversionError) {
        console.error('ObjectId conversion error:', conversionError)
      }
    }
    
    // Try 3: String comparison
    if (!existingParticipation) {
      existingParticipation = await ElectionParticipation.findOne({
        voterId: voterId.toString(),
        ssgElectionId: ssgElectionId.toString()
      })
      
      console.log('Check 3 (string):', existingParticipation ? 'FOUND' : 'NOT FOUND')
    }
    
    if (existingParticipation) {
      console.log('✗ Already participated in THIS election')
      console.log('Existing record ID:', existingParticipation._id)
      
      return res.status(400).json({ 
        message: "You have already confirmed participation in this SSG election",
        participationId: existingParticipation._id,
        confirmedAt: existingParticipation.confirmedAt,
        ssgElectionId: existingParticipation.ssgElectionId
      })
    }

    // Verify SSG election exists and is available
    const ssgElection = await SSGElection.findById(ssgElectionId)
    if (!ssgElection) {
      return res.status(404).json({ message: "SSG Election not found" })
    }

    if (!['upcoming', 'active'].includes(ssgElection.status)) {
      return res.status(400).json({ 
        message: "This SSG election is not available for participation",
        currentStatus: ssgElection.status
      })
    }

    // Check eligibility
    const eligibilityCheck = await ElectionParticipation.checkParticipationEligibility(
      voterId, 
      ssgElectionId, 
      'ssg'
    )

    if (!eligibilityCheck.eligible) {
      return res.status(400).json({ message: eligibilityCheck.reason })
    }

    console.log('Creating participation record...')
    console.log('Department ID:', eligibilityCheck.voter.departmentId._id)

    // Create participation record - let MongoDB handle ObjectId conversion
    const participation = new ElectionParticipation({
      voterId: voterId, // Don't convert - let mongoose schema handle it
      ssgElectionId: ssgElectionId, // Don't convert - let mongoose schema handle it
      departmentId: eligibilityCheck.voter.departmentId._id,
      deptElectionId: null,
      confirmedAt: new Date(),
      hasVoted: false,
      votedAt: null,
      status: 'confirmed'
    })

    console.log('Attempting to save...')

    try {
      await participation.save()
      console.log('✓ Participation saved successfully:', participation._id)
    } catch (saveError) {
      console.error('=== SAVE ERROR ===')
      console.error('Error code:', saveError.code)
      console.error('Error message:', saveError.message)
      console.error('Key pattern:', saveError.keyPattern)
      console.error('Key value:', saveError.keyValue)
      
      if (saveError.code === 11000) {
        // Duplicate key - try ONE MORE TIME to find the existing record
        const finalCheck = await ElectionParticipation.findOne({
          $or: [
            { voterId: voterId, ssgElectionId: ssgElectionId },
            { voterId: new mongoose.Types.ObjectId(voterId), ssgElectionId: new mongoose.Types.ObjectId(ssgElectionId) },
            { voterId: voterId.toString(), ssgElectionId: ssgElectionId.toString() }
          ]
        })
        
        if (finalCheck) {
          console.log('Found on final check:', finalCheck._id)
          return res.status(400).json({ 
            message: "You have already confirmed participation in this SSG election",
            participationId: finalCheck._id,
            confirmedAt: finalCheck.confirmedAt
          })
        }
        
        // If still not found, there's a serious database issue
        console.error('CRITICAL: Duplicate error but no record found!')
        console.error('This indicates a database inconsistency.')
        
        return res.status(500).json({
          message: "Database inconsistency detected. Please contact system administrator.",
          error: "Unable to resolve duplicate participation record",
          debug: {
            voterId: voterId.toString(),
            ssgElectionId: ssgElectionId.toString()
          }
        })
      }
      
      throw saveError
    }

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
      "VOTER_PARTICIPATED_IN_SSG_ELECTION",
      eligibilityCheck.voter,
      `Confirmed participation in SSG election: ${ssgElection.title}`,
      req
    )

    res.status(201).json({
      message: "SSG election participation confirmed successfully",
      participation
    })
  } catch (error) {
    console.error('=== Unexpected Error ===')
    console.error('Error:', error)
    console.error('Stack:', error.stack)
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Participation conflict occurred. Please refresh the page and try again.",
        error: "Database constraint violation"
      })
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
        "VOTER_PARTICIPATED_IN_DEPARTMENTAL_ELECTION",
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

// Get voter's voting status for SSG election
static async getSSGVotingStatus(req, res, next) {
  try {
    const { ssgElectionId } = req.params
    const voterId = req.user.voterId

    const receipt = await ElectionParticipation.generateVotingReceipt(
      voterId, 
      ssgElectionId, 
      'ssg'
    )

    // Get election info
    const ssgElection = await SSGElection.findById(ssgElectionId, 'title electionDate status')
    if (!ssgElection) {
      return res.status(404).json({ message: "SSG Election not found" })
    }

    res.json({
      electionId: ssgElectionId,
      electionTitle: ssgElection.title,
      electionType: "SSG",
      hasVoted: receipt.hasVoted,
      votingStatus: receipt.hasVoted ? 'voted' : 'not_voted',
      submittedAt: receipt.submittedAt || null,
      totalVotes: receipt.totalVotes || 0,
      reason: receipt.reason || null
    })
  } catch (error) {
    next(error)
  }
}

// Get voter's voting status for Departmental election
static async getDepartmentalVotingStatus(req, res, next) {
  try {
    const { deptElectionId } = req.params
    const voterId = req.user.voterId

    const receipt = await ElectionParticipation.generateVotingReceipt(
      voterId, 
      deptElectionId, 
      'departmental'
    )

    // Get election info
    const deptElection = await DepartmentalElection.findById(deptElectionId, 'title electionDate status')
      .populate('departmentId', 'departmentCode degreeProgram')
    if (!deptElection) {
      return res.status(404).json({ message: "Departmental Election not found" })
    }

    res.json({
      electionId: deptElectionId,
      electionTitle: deptElection.title,
      electionType: "DEPARTMENTAL",
      department: deptElection.departmentId,
      hasVoted: receipt.hasVoted,
      votingStatus: receipt.hasVoted ? 'voted' : 'not_voted',
      submittedAt: receipt.submittedAt || null,
      totalVotes: receipt.totalVotes || 0,
      reason: receipt.reason || null
    })
  } catch (error) {
    next(error)
  }
}

// Export SSG voting receipt as PDF (voter only)
static async exportSSGVotingReceiptPDF(req, res, next) {
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

    // Create PDF
    const doc = new PDFDocument()
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="SSG_Voting_Receipt_${voter.schoolId}_${ssgElection.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`)
    
    doc.pipe(res)

    // PDF Content
    doc.fontSize(16).text(`SSG Election Voting Receipt`, { align: 'center' })
    doc.moveDown()
    doc.fontSize(12).text(`Election: ${ssgElection.title}`)
    doc.text(`Election Year: ${ssgElection.electionYear}`)
    doc.text(`Election Date: ${new Date(ssgElection.electionDate).toLocaleDateString()}`)
    doc.moveDown()
    doc.text(`Voter Information:`)
    doc.text(`School ID: ${voter.schoolId}`)
    doc.text(`Name: ${voter.fullName}`)
    doc.text(`Department: ${voter.departmentId.departmentCode} - ${voter.departmentId.degreeProgram}`)
    doc.text(`College: ${voter.departmentId.college}`)
    doc.moveDown()
    doc.text(`Voting Details:`)
    doc.text(`Ballot Token: ${receipt.ballotToken}`)
    doc.text(`Submitted At: ${new Date(receipt.submittedAt).toLocaleString()}`)
    doc.text(`Total Votes Cast: ${receipt.totalVotes}`)
    doc.moveDown()
    doc.text(`Vote Summary:`)
    
    receipt.voteDetails.forEach((vote, index) => {
      doc.text(`${index + 1}. ${vote.position}: #${vote.candidateNumber} - ${vote.candidateName}`)
    })
    
    doc.moveDown()
    doc.fontSize(10).text(`This is an official voting receipt generated on ${new Date().toLocaleString()}`, { align: 'center' })

    doc.end()

    await AuditLog.logVoterAction(
      "VOTE_RECEIPT_PDF_EXPORT",
      voter,
      `Exported SSG voting receipt as PDF: ${ssgElection.title}`,
      req
    )

  } catch (error) {
    next(error)
  }
}

// Export Departmental voting receipt as PDF (voter only)
static async exportDepartmentalVotingReceiptPDF(req, res, next) {
  try {
    const { deptElectionId } = req.params
    const voterId = req.user.voterId

    // ✅ FIXED: Get ALL ballots for this voter in this election (all positions)
    const ballots = await Ballot.find({
      deptElectionId,
      voterId,
      isSubmitted: true
    }).populate('currentPositionId', 'positionName positionOrder')
    
    if (ballots.length === 0) {
      return res.status(404).json({ 
        message: "No voting records found for this election" 
      })
    }

    // ✅ Get ALL votes from ALL position ballots
    const allVotes = await Vote.find({
      ballotId: { $in: ballots.map(b => b._id) },
      deptElectionId
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

    if (allVotes.length === 0) {
      return res.status(404).json({ 
        message: "No votes found in submitted ballots" 
      })
    }

    // Get election and voter info
    const [deptElection, voter] = await Promise.all([
      DepartmentalElection.findById(deptElectionId)
        .populate('departmentId', 'departmentCode degreeProgram college'),
      Voter.findById(voterId)
        .populate('departmentId', 'departmentCode degreeProgram college')
    ])

    if (!deptElection || !voter) {
      return res.status(404).json({ message: "Election or voter not found" })
    }

    // ✅ Group votes by position
    const votesByPosition = allVotes.reduce((acc, vote) => {
      const posKey = vote.positionId._id.toString()
      if (!acc[posKey]) {
        acc[posKey] = {
          positionName: vote.positionId.positionName,
          positionOrder: vote.positionId.positionOrder,
          votes: []
        }
      }
      acc[posKey].votes.push({
        candidateNumber: vote.candidateId.candidateNumber,
        candidateName: vote.candidateId.voterId ? 
          `${vote.candidateId.voterId.firstName} ${vote.candidateId.voterId.middleName || ''} ${vote.candidateId.voterId.lastName}`.replace(/\s+/g, ' ').trim() : 
          'Unknown Candidate'
      })
      return acc
    }, {})

    // Sort positions by order
    const sortedPositions = Object.values(votesByPosition).sort((a, b) => a.positionOrder - b.positionOrder)

    // Create PDF
    const doc = new PDFDocument({ margin: 50 })
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 
      `attachment; filename="Departmental_Voting_Receipt_${voter.schoolId}_${deptElection.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`
    )
    
    doc.pipe(res)

    // Header
    doc.fontSize(18).font('Helvetica-Bold')
       .text('DEPARTMENTAL ELECTION VOTING RECEIPT', { align: 'center' })
    doc.moveDown(1.5)

    // Election Info
    doc.fontSize(12).font('Helvetica-Bold').text('Election Information:')
    doc.fontSize(11).font('Helvetica')
    doc.text(`Title: ${deptElection.title}`)
    doc.text(`Year: ${deptElection.electionYear}`)
    doc.text(`Date: ${new Date(deptElection.electionDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`)
    doc.text(`Department: ${deptElection.departmentId.departmentCode} - ${deptElection.departmentId.degreeProgram}`)
    doc.text(`College: ${deptElection.departmentId.college}`)
    doc.moveDown(1)

    // Voter Info
    doc.fontSize(12).font('Helvetica-Bold').text('Voter Information:')
    doc.fontSize(11).font('Helvetica')
    doc.text(`School ID: ${voter.schoolId}`)
    doc.text(`Name: ${voter.firstName} ${voter.middleName || ''} ${voter.lastName}`.replace(/\s+/g, ' '))
    doc.text(`Department: ${voter.departmentId.departmentCode} - ${voter.departmentId.degreeProgram}`)
    doc.text(`College: ${voter.departmentId.college}`)
    doc.text(`Class Officer: ${voter.isClassOfficer ? 'Yes' : 'No'}`)
    doc.moveDown(1)

    // Voting Summary
    doc.fontSize(12).font('Helvetica-Bold').text('Voting Summary:')
    doc.fontSize(11).font('Helvetica')
    doc.text(`Total Positions Voted: ${sortedPositions.length}`)
    doc.text(`Total Votes Cast: ${allVotes.length}`)
    doc.text(`Receipt Generated: ${new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })}`)
    doc.moveDown(1.5)

    // Vote Details by Position
    doc.fontSize(14).font('Helvetica-Bold').text('Vote Details:', { underline: true })
    doc.moveDown(0.5)

    sortedPositions.forEach((positionData, index) => {
      doc.fontSize(12).font('Helvetica-Bold')
         .text(`${index + 1}. ${positionData.positionName}`)
      
      doc.fontSize(11).font('Helvetica')
      positionData.votes.forEach((vote, voteIndex) => {
        doc.text(`   ${voteIndex + 1}. Candidate #${vote.candidateNumber} - ${vote.candidateName}`)
      })
      
      doc.moveDown(0.5)
    })

    // Footer
    doc.moveDown(2)
    doc.fontSize(9).font('Helvetica')
       .text('This is an official voting receipt. Keep this for your records.', { align: 'center' })
    doc.text('Generated by E-Voting System', { align: 'center' })

    doc.end()

    await AuditLog.logVoterAction(
      "VOTE_RECEIPT_PDF_EXPORT",
      voter,
      `Exported Departmental voting receipt (${sortedPositions.length} positions, ${allVotes.length} votes): ${deptElection.title}`,
      req
    )

  } catch (error) {
    console.error('Error exporting departmental voting receipt PDF:', error)
    next(error)
  }
}

// Get voter's complete voting receipt with full details for SSG election
static async getSSGVotingReceiptDetails(req, res, next) {
  try {
    const { ssgElectionId } = req.params
    const voterId = req.user.voterId

    const receipt = await ElectionParticipation.generateVotingReceipt(
      voterId, 
      ssgElectionId, 
      'ssg'
    )

    // Get election info
    const ssgElection = await SSGElection.findById(ssgElectionId, 'title electionDate status electionYear')
    if (!ssgElection) {
      return res.status(404).json({ message: "SSG Election not found" })
    }

    // Get FULL voter info with populated department
    const voter = await Voter.findById(voterId)
      .select('schoolId firstName middleName lastName')
      .populate('departmentId', 'departmentCode degreeProgram college')

    if (!voter) {
      return res.status(404).json({ message: "Voter not found" })
    }

    res.json({
      electionId: ssgElectionId,
      electionTitle: ssgElection.title,
      electionYear: ssgElection.electionYear,
      electionDate: ssgElection.electionDate,
      electionType: "SSG",
      hasVoted: receipt.hasVoted,
      votingStatus: receipt.hasVoted ? 'voted' : 'not_voted',
      submittedAt: receipt.submittedAt || null,
      ballotToken: receipt.ballotToken || null,
      totalVotes: receipt.totalVotes || 0,
      reason: receipt.reason || null,
      voter: {
        schoolId: voter.schoolId,
        firstName: voter.firstName,
        middleName: voter.middleName,
        lastName: voter.lastName,
        fullName: voter.middleName 
          ? `${voter.firstName} ${voter.middleName} ${voter.lastName}`
          : `${voter.firstName} ${voter.lastName}`,
        department: voter.departmentId ? {
          departmentCode: voter.departmentId.departmentCode,
          degreeProgram: voter.departmentId.degreeProgram,
          college: voter.departmentId.college
        } : null
      }
    })
  } catch (error) {
    next(error)
  }
}

// Get voter's complete voting receipt with full details for Departmental election
static async getDepartmentalVotingReceiptDetails(req, res, next) {
  try {
    const { deptElectionId } = req.params
    const voterId = req.user.voterId

    const receipt = await ElectionParticipation.generateVotingReceipt(
      voterId, 
      deptElectionId, 
      'departmental'
    )

    // Get election info
    const deptElection = await DepartmentalElection.findById(deptElectionId, 'title electionDate status electionYear')
      .populate('departmentId', 'departmentCode degreeProgram college')
    if (!deptElection) {
      return res.status(404).json({ message: "Departmental Election not found" })
    }

    // Get FULL voter info with populated department
    const voter = await Voter.findById(voterId)
      .select('schoolId firstName middleName lastName isClassOfficer')
      .populate('departmentId', 'departmentCode degreeProgram college')

    if (!voter) {
      return res.status(404).json({ message: "Voter not found" })
    }

    res.json({
      electionId: deptElectionId,
      electionTitle: deptElection.title,
      electionYear: deptElection.electionYear,
      electionDate: deptElection.electionDate,
      electionType: "DEPARTMENTAL",
      department: deptElection.departmentId,
      hasVoted: receipt.hasVoted,
      votingStatus: receipt.hasVoted ? 'voted' : 'not_voted',
      submittedAt: receipt.submittedAt || null,
      ballotToken: receipt.ballotToken || null,
      totalVotes: receipt.totalVotes || 0,
      reason: receipt.reason || null,
      voter: {
        schoolId: voter.schoolId,
        firstName: voter.firstName,
        middleName: voter.middleName,
        lastName: voter.lastName,
        fullName: voter.middleName 
          ? `${voter.firstName} ${voter.middleName} ${voter.lastName}`
          : `${voter.firstName} ${voter.lastName}`,
        isClassOfficer: voter.isClassOfficer,
        department: voter.departmentId ? {
          departmentCode: voter.departmentId.departmentCode,
          degreeProgram: voter.departmentId.degreeProgram,
          college: voter.departmentId.college
        } : null
      }
    })
  } catch (error) {
    next(error)
  }
}

}

module.exports = ElectionParticipationController