const mongoose = require("mongoose")
const Candidate = require("../models/Candidate")
const SSGElection = require("../models/SSGElection")
const DepartmentalElection = require("../models/DepartmentalElection")
const Voter = require("../models/Voter")
const Position = require("../models/Position")
const Partylist = require("../models/Partylist")
const AuditLog = require("../models/AuditLog")

class CandidateController {
  // Helper method to validate ObjectId
  static validateObjectId(id, fieldName) {
    if (!id) return null
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ${fieldName} format`)
    }
    return id
  }

  // Helper method to log audit actions
  static async logAuditAction(action, user, message, req, isVoter = false) {
    try {
      if (isVoter) {
        await AuditLog.logVoterAction(action, user, message, req)
      } else {
        await AuditLog.logUserAction(action, user, message, req)
      }
    } catch (error) {
      console.error("Audit log error:", error)
    }
  }

  // Get all candidates with enhanced filtering and pagination
  static async getAllCandidates(req, res, next) {
    try {
      const { page = 1, limit = 10, type, electionId, positionId, status, search } = req.query
      
      const query = {}
      
      // Filter by election type
      if (type === 'ssg') {
        query.ssgElectionId = { $ne: null }
        query.deptElectionId = null
      } else if (type === 'departmental') {
        query.deptElectionId = { $ne: null }
        query.ssgElectionId = null
      }
      
      // Filter by specific election
      if (electionId) {
        CandidateController.validateObjectId(electionId, 'election ID')
        if (type === 'ssg') {
          query.ssgElectionId = electionId
        } else if (type === 'departmental') {
          query.deptElectionId = electionId
        }
      }
      
      // Filter by position
      if (positionId) {
        CandidateController.validateObjectId(positionId, 'position ID')
        query.positionId = positionId
      }
      
      // Filter by status
      if (status !== undefined) {
        query.isActive = status === 'active'
      }

      // Get candidates with full population
      let candidates = await Candidate.find(query)
        .populate({
          path: 'voterId',
          select: 'schoolId firstName middleName lastName departmentId yearLevel',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        })
        .populate('positionId', 'positionName positionOrder maxVotes')
        .populate('partylistId', 'partylistName description')
        .populate('ssgElectionId', 'title electionDate status')
        .populate('deptElectionId', 'title electionDate status')

      // Apply search filter if provided
      if (search) {
      const searchTerm = search.toLowerCase()
      candidates = candidates.filter(candidate => {
        const name = candidate.getDisplayName()?.toLowerCase() || ''
        const schoolId = candidate.voterId?.schoolId?.toString() || ''
        const position = candidate.positionId?.positionName?.toLowerCase() || ''
        // Removed platform search since credentials is binary data
        
        return name.includes(searchTerm) || 
               schoolId.includes(searchTerm) || 
               position.includes(searchTerm)
      })
    }

      // Sort using model method
      candidates = Candidate.sortCandidates(candidates)

      // Pagination
      const total = candidates.length
      const startIndex = (page - 1) * limit
      const paginatedCandidates = candidates.slice(startIndex, startIndex + parseInt(limit))

      // Get statistics using model method
      const statistics = Candidate.getStatistics(candidates)

      await CandidateController.logAuditAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved ${paginatedCandidates.length} candidates (type: ${type || 'all'}, total: ${total})`,
        req
      )

      res.json({
        success: true,
        data: {
          candidates: paginatedCandidates.map(c => c.formatForDisplay()),
          pagination: {
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total,
            hasNext: startIndex + parseInt(limit) < total,
            hasPrev: page > 1
          },
          statistics
        },
        message: "Candidates retrieved successfully"
      })
    } catch (error) {
      console.error("Error fetching candidates:", error)
      
      await CandidateController.logAuditAction(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        req.user || {},
        `Failed to fetch candidates: ${error.message}`,
        req
      )
      
      const err = new Error(error.message || "Failed to fetch candidates")
      err.statusCode = error.statusCode || 500
      next(err)
    }
  }

  static async validateSSGCandidate(candidateData, excludeCandidateId = null, isUpdate = false) {
  const { voterId, ssgElectionId, positionId, partylistId } = candidateData
  const errors = []

  // Verify voter exists and is registered
  const voter = await Voter.findById(voterId).populate('departmentId')
  if (!voter) {
    errors.push('Voter not found')
    return { isValid: false, errors }
  }

  // REQUIREMENT: Must be registered voter (not just any voter)
  if (!voter.isRegistered || !voter.isPasswordActive) {
    errors.push('Only registered voters can be SSG candidates')
    return { isValid: false, errors }
  }

  // REQUIREMENT: Check if voter is already a candidate in this SSG election (any position)
  const existingCandidateQuery = {
    voterId,
    ssgElectionId,
    deptElectionId: null
  }
  
  if (excludeCandidateId) {
    existingCandidateQuery._id = { $ne: excludeCandidateId }
  }
  
  const existingCandidate = await Candidate.findOne(existingCandidateQuery)
    .populate('positionId', 'positionName')

  if (existingCandidate) {
    errors.push(`Voter is already a candidate for ${existingCandidate.positionId.positionName} in this SSG election`)
    return { isValid: false, errors }
  }

  // REQUIREMENT: If partylist is specified, check if voter is already in another partylist for this election
  if (partylistId) {
    const partylistCandidateQuery = {
      voterId,
      ssgElectionId,
      partylistId: { $ne: partylistId },
      deptElectionId: null
    }
    
    if (excludeCandidateId) {
      partylistCandidateQuery._id = { $ne: excludeCandidateId }
    }
    
    const existingPartylistCandidate = await Candidate.findOne(partylistCandidateQuery)
      .populate('partylistId', 'partylistName')
    
    if (existingPartylistCandidate) {
      errors.push(`Voter is already a member of ${existingPartylistCandidate.partylistId.partylistName} in this SSG election`)
      return { isValid: false, errors }
    }

    // NEW: Check position-specific candidate limits per partylist
    const positionLimits = await Candidate.checkPartylistPositionLimits(
      ssgElectionId, 
      positionId, 
      partylistId, 
      excludeCandidateId
    )
    
    if (!positionLimits.withinLimits) {
      errors.push(positionLimits.message)
      return { isValid: false, errors }
    }
  }

  return { 
    isValid: true, 
    errors: [],
    voter 
  }
}

static async getPartylistCandidateSlots(req, res, next) {
  try {
    const { ssgElectionId, partylistId } = req.params

    CandidateController.validateObjectId(ssgElectionId, 'SSG election ID')
    if (partylistId) {
      CandidateController.validateObjectId(partylistId, 'partylist ID')
    }

    // Verify SSG election exists
    const ssgElection = await SSGElection.findById(ssgElectionId)
    if (!ssgElection) {
      const error = new Error("SSG Election not found")
      error.statusCode = 404
      return next(error)
    }

    // Get comprehensive stats
    const stats = await Candidate.getPartylistPositionStats(ssgElectionId, partylistId)

    await CandidateController.logAuditAction(
      "SYSTEM_ACCESS",
      req.user,
      `Retrieved candidate slot information for partylist in SSG election: ${ssgElection.title}`,
      req
    )

    res.json({
      success: true,
      data: {
        ssgElection: {
          _id: ssgElection._id,
          title: ssgElection.title,
          status: ssgElection.status
        },
        partylistId,
        candidateSlots: stats
      },
      message: "Partylist candidate slots retrieved successfully"
    })
  } catch (error) {
    console.error("Error fetching partylist candidate slots:", error)
    const err = new Error(error.message || "Failed to fetch partylist candidate slots")
    err.statusCode = error.statusCode || 500
    next(err)
  }
}

  // Get all SSG candidates
  static async getAllSSGCandidates(req, res, next) {
    try {
      req.query.type = 'ssg'
      await CandidateController.getAllCandidates(req, res, next)
    } catch (error) {
      console.error("Error fetching SSG candidates:", error)
      const err = new Error("Failed to fetch SSG candidates")
      err.statusCode = 500
      next(err)
    }
  }

  // Get all Departmental candidates
  static async getAllDepartmentalCandidates(req, res, next) {
    try {
      req.query.type = 'departmental'
      await CandidateController.getAllCandidates(req, res, next)
    } catch (error) {
      console.error("Error fetching departmental candidates:", error)
      const err = new Error("Failed to fetch departmental candidates")
      err.statusCode = 500
      next(err)
    }
  }

  // Get candidate by ID with enhanced details
  static async getCandidateById(req, res, next) {
    try {
      const { id } = req.params
      
      CandidateController.validateObjectId(id, 'candidate ID')
      
      const candidate = await Candidate.findById(id)
        .populate({
          path: 'voterId',
          select: 'schoolId firstName middleName lastName departmentId yearLevel email',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        })
        .populate('positionId', 'positionName positionOrder maxVotes description')
        .populate('partylistId', 'partylistName description')
        .populate('ssgElectionId', 'title electionDate status')
        .populate('deptElectionId', 'title electionDate status departmentId')

      if (!candidate) {
        await CandidateController.logAuditAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to access non-existent candidate: ${id}`,
          req
        )
        
        const error = new Error("Candidate not found")
        error.statusCode = 404
        return next(error)
      }

      await CandidateController.logAuditAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved candidate ${id} - ${candidate.getDisplayName()}`,
        req
      )

      res.json({
        success: true,
        data: {
          ...candidate.formatForDisplay(),
          displayInfo: candidate.getDisplayInfo()
        },
        message: "Candidate retrieved successfully"
      })
    } catch (error) {
      console.error("Error fetching candidate:", error)
      
      await CandidateController.logAuditAction(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        req.user || {},
        `Failed to fetch candidate ${req.params.id}: ${error.message}`,
        req
      )
      
      const err = new Error(error.message || "Failed to fetch candidate")
      err.statusCode = error.statusCode || 500
      next(err)
    }
  }

  // Get SSG candidate by ID
  static async getSSGCandidateById(req, res, next) {
    try {
      const { id } = req.params
      
      CandidateController.validateObjectId(id, 'candidate ID')
      
      const candidate = await Candidate.findOne({ 
        _id: id, 
        ssgElectionId: { $ne: null },
        deptElectionId: null 
      })
        .populate({
          path: 'voterId',
          select: 'schoolId firstName middleName lastName departmentId yearLevel email',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        })
        .populate('positionId', 'positionName positionOrder maxVotes description')
        .populate('partylistId', 'partylistName description')
        .populate('ssgElectionId', 'title electionDate status')

      if (!candidate) {
        await CandidateController.logAuditAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to access non-existent SSG candidate: ${id}`,
          req
        )
        
        const error = new Error("SSG candidate not found")
        error.statusCode = 404
        return next(error)
      }

      await CandidateController.logAuditAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved SSG candidate ${id} - ${candidate.getDisplayName()}`,
        req
      )

      res.json({
        success: true,
        data: {
          ...candidate.formatForDisplay(),
          displayInfo: candidate.getDisplayInfo()
        },
        message: "SSG candidate retrieved successfully"
      })
    } catch (error) {
      console.error("Error fetching SSG candidate:", error)
      const err = new Error(error.message || "Failed to fetch SSG candidate")
      err.statusCode = error.statusCode || 500
      next(err)
    }
  }

  // Get Departmental candidate by ID
  static async getDepartmentalCandidateById(req, res, next) {
    try {
      const { id } = req.params
      
      CandidateController.validateObjectId(id, 'candidate ID')
      
      const candidate = await Candidate.findOne({ 
        _id: id, 
        deptElectionId: { $ne: null },
        ssgElectionId: null 
      })
        .populate({
          path: 'voterId',
          select: 'schoolId firstName middleName lastName departmentId yearLevel email',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        })
        .populate('positionId', 'positionName positionOrder maxVotes description')
        .populate('deptElectionId', 'title electionDate status departmentId')

      if (!candidate) {
        await CandidateController.logAuditAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to access non-existent departmental candidate: ${id}`,
          req
        )
        
        const error = new Error("Departmental candidate not found")
        error.statusCode = 404
        return next(error)
      }

      await CandidateController.logAuditAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved departmental candidate ${id} - ${candidate.getDisplayName()}`,
        req
      )

      res.json({
        success: true,
        data: {
          ...candidate.formatForDisplay(),
          displayInfo: candidate.getDisplayInfo()
        },
        message: "Departmental candidate retrieved successfully"
      })
    } catch (error) {
      console.error("Error fetching departmental candidate:", error)
      const err = new Error(error.message || "Failed to fetch departmental candidate")
      err.statusCode = error.statusCode || 500
      next(err)
    }
  }

  // Create candidate with comprehensive validation
  static async createCandidate(req, res, next) {
  try {
    const candidateData = req.body

    // Use model validation first
    const validation = Candidate.validateCandidateData(candidateData)
    if (!validation.isValid) {
      await CandidateController.logAuditAction(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        req.user || {},
        `Invalid candidate creation: ${validation.errors.join(', ')}`,
        req
      )
      
      const error = new Error(validation.errors.join(', '))
      error.statusCode = 400
      return next(error)
    }

    // Validate ObjectIds
    const {
      voterId,
      ssgElectionId,
      deptElectionId,
      positionId,
      partylistId,
      candidateNumber,
      credentials, // Changed from platform
      isActive = true
    } = candidateData

    CandidateController.validateObjectId(voterId, 'voter ID')
    if (ssgElectionId) CandidateController.validateObjectId(ssgElectionId, 'SSG election ID')
    if (deptElectionId) CandidateController.validateObjectId(deptElectionId, 'departmental election ID')
    CandidateController.validateObjectId(positionId, 'position ID')
    if (partylistId) CandidateController.validateObjectId(partylistId, 'partylist ID')

    // Verify voter exists and is eligible
    const voter = await Voter.findById(voterId).populate('departmentId')
    if (!voter) {
      await CandidateController.logAuditAction(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        req.user || {},
        `Attempted to create candidate with invalid voter: ${voterId}`,
        req
      )
      
      const error = new Error("Voter not found")
      error.statusCode = 404
      return next(error)
    }

    // Optional: Log when adding unregistered voters as candidates
    if (!voter.isRegistered) {
      await CandidateController.logAuditAction(
        "CREATE_CANDIDATE",
        req.user,
        `Adding unregistered voter as candidate: ${voter.schoolId} - ${voter.firstName} ${voter.lastName}`,
        req
      )
    }


      // if (!voter.isRegistered || !voter.isPasswordActive) {
      //   await CandidateController.logAuditAction(
      //     'UNAUTHORIZED_ACCESS_ATTEMPT',
      //     req.user || {},
      //     `Attempted to create candidate with unregistered voter: ${voter.schoolId}`,
      //     req
      //   )
        
      //   const error = new Error("Only registered voters can be candidates")
      //   error.statusCode = 400
      //   return next(error)
      // }



      // Verify election exists and is in correct status
      let election, electionType
      if (ssgElectionId) {
        election = await SSGElection.findById(ssgElectionId)
        electionType = 'ssg'
      } else {
        election = await DepartmentalElection.findById(deptElectionId).populate('departmentId')
        electionType = 'departmental'
      }

      if (!election) {
        const error = new Error(`${electionType.toUpperCase()} Election not found`)
        error.statusCode = 404
        return next(error)
      }

      if (['completed', 'cancelled'].includes(election.status)) {
        const error = new Error("Cannot add candidates to completed or cancelled elections")
        error.statusCode = 400
        return next(error)
      }

      // For departmental elections, verify department match
      if (electionType === 'departmental') {
        if (voter.departmentId._id.toString() !== election.departmentId._id.toString()) {
          const error = new Error("Voter's department does not match election department")
          error.statusCode = 400
          return next(error)
        }
      }

      // Verify position belongs to election
      const position = await Position.findOne({
        _id: positionId,
        [electionType === 'ssg' ? 'ssgElectionId' : 'deptElectionId']: election._id,
        isActive: true
      })

      if (!position) {
        const error = new Error("Position not found or not active for this election")
        error.statusCode = 404
        return next(error)
      }

      // Check for existing candidate in this election
      const existingCandidate = await Candidate.findOne({
        voterId,
        [electionType === 'ssg' ? 'ssgElectionId' : 'deptElectionId']: election._id
      })

      if (existingCandidate) {
        const error = new Error("Voter is already a candidate in this election")
        error.statusCode = 400
        return next(error)
      }

      // Verify partylist for SSG elections
      if (partylistId && electionType === 'ssg') {
        const partylist = await Partylist.findOne({
          _id: partylistId,
          ssgElectionId: election._id
        })
        if (!partylist) {
          const error = new Error("Partylist not found or not valid for this election")
          error.statusCode = 404
          return next(error)
        }
      }

      // Get candidate number using model method
      let credentialsBuffer = null
    if (credentials && ssgElectionId) {
      try {
        if (typeof credentials === 'string') {
          const base64Data = credentials.replace(/^data:[^;]+;base64,/, '')
          credentialsBuffer = Buffer.from(base64Data, 'base64')
        } else if (Buffer.isBuffer(credentials)) {
          credentialsBuffer = credentials
        }

        if (credentialsBuffer && credentialsBuffer.length === 0) {
          throw new Error("Invalid credentials data")
        }
      } catch (error) {
        const err = new Error("Invalid credentials format")
        err.statusCode = 400
        return next(err)
      }
    }

    // Get candidate number using model method
    let finalCandidateNumber = candidateNumber
    if (!finalCandidateNumber) {
      finalCandidateNumber = await Candidate.getNextCandidateNumber(positionId)
    } else {
      const isAvailable = await Candidate.isCandidateNumberAvailable(positionId, finalCandidateNumber)
      if (!isAvailable) {
        const error = new Error("Candidate number already exists for this position")
        error.statusCode = 400
        return next(error)
      }
    }

    // Create candidate
    const candidate = new Candidate({
      voterId,
      ssgElectionId: electionType === 'ssg' ? ssgElectionId : null,
      deptElectionId: electionType === 'departmental' ? deptElectionId : null,
      positionId,
      partylistId: electionType === 'ssg' ? partylistId : null,
      candidateNumber: finalCandidateNumber,
      credentials: credentialsBuffer, // Changed from platform
      isActive
    })

    await candidate.save()

      // Populate for response
      await candidate.populate([
        {
          path: 'voterId',
          select: 'schoolId firstName middleName lastName departmentId yearLevel',
          populate: { path: 'departmentId', select: 'departmentCode degreeProgram college' }
        },
        { path: 'positionId', select: 'positionName positionOrder' },
        { path: 'partylistId', select: 'partylistName' },
        { path: 'ssgElectionId', select: 'title electionDate' },
        { path: 'deptElectionId', select: 'title electionDate' }
      ])

      await CandidateController.logAuditAction(
        "CREATE_CANDIDATE",
        req.user,
        `Created ${electionType.toUpperCase()} candidate: ${candidate.getDisplayName()} (${voter.schoolId}) for position ${position.positionName}`,
        req
      )

      res.status(201).json({
      success: true,
      data: {
        ...candidate.formatForDisplay(),
        displayInfo: candidate.getDisplayInfo()
      },
      message: "Candidate created successfully"
    })
  } catch (error) {
    console.error("Error creating candidate:", error)
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      const err = new Error(`Validation failed: ${validationErrors.join(', ')}`)
      err.statusCode = 400
      return next(err)
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0]
      const err = new Error(`Duplicate ${field}: ${error.keyValue[field]}`)
      err.statusCode = 400
      return next(err)
    }
    
    const err = new Error(error.message || "Failed to create candidate")
    err.statusCode = error.statusCode || 500
    next(err)
  }
}

  // Create SSG candidate
  static async createSSGCandidate(req, res, next) {
  try {
    const candidateData = {
      ...req.body,
      ssgElectionId: req.body.ssgElectionId || req.body.electionId,
      deptElectionId: null,
      partylistId: req.body.partylistId || null
    }

    // Enhanced SSG validation with position limits
    const validation = await Candidate.validateSSGCandidateWithPositionLimits(candidateData)
    if (!validation.isValid) {
      await CandidateController.logAuditAction(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        req.user || {},
        `Invalid SSG candidate creation: ${validation.errors.join(', ')}`,
        req
      )
      
      const error = new Error(validation.errors.join(', '))
      error.statusCode = 400
      return next(error)
    }

    // Continue with candidate creation
    req.body = candidateData
    await CandidateController.createCandidate(req, res, next)
  } catch (error) {
    console.error("Error creating SSG candidate:", error)
    const err = new Error("Failed to create SSG candidate")
    err.statusCode = 500
    next(err)
  }
}

static async checkCandidateEligibility(req, res, next) {
  try {
    const { ssgElectionId, positionId, partylistId } = req.params
    const { voterId } = req.query

    // Validate inputs
    CandidateController.validateObjectId(ssgElectionId, 'SSG election ID')
    CandidateController.validateObjectId(positionId, 'position ID')
    if (partylistId) CandidateController.validateObjectId(partylistId, 'partylist ID')
    if (voterId) CandidateController.validateObjectId(voterId, 'voter ID')

    const eligibility = {
      canAdd: false,
      reasons: [],
      positionInfo: null,
      voterInfo: null
    }

    // Check position limits if partylist specified
    if (partylistId) {
      const positionLimits = await Candidate.checkPartylistPositionLimits(
        ssgElectionId, 
        positionId, 
        partylistId
      )
      
      eligibility.positionInfo = positionLimits
      
      if (!positionLimits.withinLimits) {
        eligibility.reasons.push(positionLimits.message)
      }
    } else {
      eligibility.positionInfo = { withinLimits: true, message: 'Independent candidate' }
    }

    // Check voter eligibility if specified
    if (voterId) {
      const candidateData = { voterId, ssgElectionId, positionId, partylistId }
      const voterValidation = await CandidateController.validateSSGCandidate(candidateData)
      
      eligibility.voterInfo = {
        eligible: voterValidation.isValid,
        errors: voterValidation.errors || []
      }
      
      if (!voterValidation.isValid) {
        eligibility.reasons.push(...voterValidation.errors)
      }
    }

    // Determine overall eligibility
    eligibility.canAdd = eligibility.positionInfo.withinLimits && 
                       (!voterId || eligibility.voterInfo.eligible)

    res.json({
      success: true,
      data: eligibility,
      message: "Candidate eligibility checked successfully"
    })
  } catch (error) {
    console.error("Error checking candidate eligibility:", error)
    const err = new Error(error.message || "Failed to check candidate eligibility")
    err.statusCode = error.statusCode || 500
    next(err)
  }
}

  // Create Departmental candidate
  static async createDepartmentalCandidate(req, res, next) {
    try {
      req.body.ssgElectionId = null
      req.body.partylistId = null
      req.body.deptElectionId = req.body.deptElectionId || req.body.electionId
      await CandidateController.createCandidate(req, res, next)
    } catch (error) {
      const err = new Error("Failed to create departmental candidate")
      err.statusCode = 500
      next(err)
    }
  }

  // Update candidate with validation
  static async updateCandidate(req, res, next) {
  try {
    const { id } = req.params
    const updateData = req.body

    CandidateController.validateObjectId(id, 'candidate ID')

    const candidate = await Candidate.findById(id)
      .populate('voterId', 'firstName lastName schoolId')
      .populate('ssgElectionId', 'title status')
      .populate('deptElectionId', 'title status')
      .populate('positionId', 'positionName')

    if (!candidate) {
      const error = new Error("Candidate not found")
      error.statusCode = 404
      return next(error)
    }

    // Check if election allows modifications
    const election = candidate.ssgElectionId || candidate.deptElectionId
    if (['completed', 'cancelled'].includes(election.status)) {
      const error = new Error("Cannot modify candidates in completed or cancelled elections")
      error.statusCode = 400
      return next(error)
    }

    // Handle credentials update for SSG candidates
    if (updateData.credentials && candidate.ssgElectionId) {
      try {
        let credentialsBuffer
        if (typeof updateData.credentials === 'string') {
          const base64Data = updateData.credentials.replace(/^data:[^;]+;base64,/, '')
          credentialsBuffer = Buffer.from(base64Data, 'base64')
        } else if (Buffer.isBuffer(updateData.credentials)) {
          credentialsBuffer = updateData.credentials
        }

        if (credentialsBuffer && credentialsBuffer.length > 0) {
          updateData.credentials = credentialsBuffer
        } else {
          delete updateData.credentials // Don't update if invalid
        }
      } catch (error) {
        const err = new Error("Invalid credentials format")
        err.statusCode = 400
        return next(err)
      }
    }

      // Validate position change
      if (updateData.positionId && updateData.positionId !== candidate.positionId.toString()) {
        CandidateController.validateObjectId(updateData.positionId, 'position ID')
        
        const position = await Position.findOne({
          _id: updateData.positionId,
          [candidate.ssgElectionId ? 'ssgElectionId' : 'deptElectionId']: candidate.ssgElectionId || candidate.deptElectionId,
          isActive: true
        })
        
        if (!position) {
          const error = new Error("Position not found or not active for this election")
          error.statusCode = 404
          return next(error)
        }
      }

      // Validate partylist change (SSG only)
      if (updateData.partylistId !== undefined) {
        if (updateData.partylistId && candidate.deptElectionId) {
          const error = new Error("Departmental candidates cannot have partylists")
          error.statusCode = 400
          return next(error)
        }
        
        if (updateData.partylistId) {
          CandidateController.validateObjectId(updateData.partylistId, 'partylist ID')
          
          const partylist = await Partylist.findOne({
            _id: updateData.partylistId,
            ssgElectionId: candidate.ssgElectionId
          })
          
          if (!partylist) {
            const error = new Error("Partylist not found or not valid for this election")
            error.statusCode = 404
            return next(error)
          }
        }
      }

      // Validate candidate number change
      if (updateData.candidateNumber && updateData.candidateNumber !== candidate.candidateNumber) {
        const isAvailable = await Candidate.isCandidateNumberAvailable(
          updateData.positionId || candidate.positionId, 
          updateData.candidateNumber, 
          candidate._id
        )
        
        if (!isAvailable) {
          const error = new Error("Candidate number already exists for this position")
          error.statusCode = 400
          return next(error)
        }
      }

      // Update candidate
      const updatedCandidate = await Candidate.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      {
        path: 'voterId',
        select: 'schoolId firstName middleName lastName departmentId yearLevel',
        populate: { path: 'departmentId', select: 'departmentCode degreeProgram college' }
      },
      { path: 'positionId', select: 'positionName positionOrder' },
      { path: 'partylistId', select: 'partylistName' },
      { path: 'ssgElectionId', select: 'title electionDate' },
      { path: 'deptElectionId', select: 'title electionDate' }
    ])

    const electionType = candidate.ssgElectionId ? 'SSG' : 'Departmental'
    await CandidateController.logAuditAction(
      "UPDATE_CANDIDATE",
      req.user,
      `Updated ${electionType} candidate: ${updatedCandidate.getDisplayName()} (${candidate.voterId.schoolId})`,
      req
    )

    res.json({
      success: true,
      data: {
        ...updatedCandidate.formatForDisplay(),
        displayInfo: updatedCandidate.getDisplayInfo()
      },
      message: "Candidate updated successfully"
    })
  } catch (error) {
    console.error("Error updating candidate:", error)
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      const err = new Error(`Validation failed: ${validationErrors.join(', ')}`)
      err.statusCode = 400
      return next(err)
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0]
      const err = new Error(`Duplicate ${field}: ${error.keyValue[field]}`)
      err.statusCode = 400
      return next(err)
    }

    const err = new Error(error.message || "Failed to update candidate")
    err.statusCode = error.statusCode || 500
    next(err)
  }
}

  // Update SSG candidate
  static async updateSSGCandidate(req, res, next) {
  try {
    const { id } = req.params
    const updateData = req.body

    // Verify this is an SSG candidate
    const candidate = await Candidate.findOne({
      _id: id,
      ssgElectionId: { $ne: null },
      deptElectionId: null
    })

    if (!candidate) {
      const error = new Error("SSG candidate not found")
      error.statusCode = 404
      return next(error)
    }

    // If updating critical fields, validate
    if (updateData.voterId || updateData.positionId || updateData.partylistId !== undefined) {
      const candidateData = {
        voterId: updateData.voterId || candidate.voterId,
        ssgElectionId: candidate.ssgElectionId,
        positionId: updateData.positionId || candidate.positionId,
        partylistId: updateData.partylistId !== undefined ? updateData.partylistId : candidate.partylistId
      }

      const validation = await Candidate.validateSSGCandidateWithPositionLimits(candidateData, id)
      if (!validation.isValid) {
        const error = new Error(validation.errors.join(', '))
        error.statusCode = 400
        return next(error)
      }
    }

    // Continue with standard candidate update
    await CandidateController.updateCandidate(req, res, next)
  } catch (error) {
    console.error("Error updating SSG candidate:", error)
    const err = new Error("Failed to update SSG candidate")
    err.statusCode = 500
    next(err)
  }
}


  // Update Departmental candidate
  static async updateDepartmentalCandidate(req, res, next) {
    try {
      const { id } = req.params
      
      const candidate = await Candidate.findOne({
        _id: id,
        deptElectionId: { $ne: null },
        ssgElectionId: null
      })

      if (!candidate) {
        const error = new Error("Departmental candidate not found")
        error.statusCode = 404
        return next(error)
      }

      if (req.body.partylistId) {
        const error = new Error("Departmental candidates cannot have partylists")
        error.statusCode = 400
        return next(error)
      }

      await CandidateController.updateCandidate(req, res, next)
    } catch (error) {
      const err = new Error("Failed to update departmental candidate")
      err.statusCode = 500
      next(err)
    }
  }

  // Delete candidate with safety checks
  static async deleteCandidate(req, res, next) {
    try {
      const { id } = req.params

      CandidateController.validateObjectId(id, 'candidate ID')

      const candidate = await Candidate.findById(id)
        .populate('voterId', 'firstName lastName schoolId')
        .populate('ssgElectionId', 'title status')
        .populate('deptElectionId', 'title status')
        .populate('positionId', 'positionName')

      if (!candidate) {
        const error = new Error("Candidate not found")
        error.statusCode = 404
        return next(error)
      }

      const election = candidate.ssgElectionId || candidate.deptElectionId
      if (['active', 'completed'].includes(election.status)) {
        const error = new Error("Cannot delete candidates from active or completed elections")
        error.statusCode = 400
        return next(error)
      }

      // Check for existing votes
      const Vote = require("../models/Vote")
      const voteCount = await Vote.countDocuments({ candidateId: candidate._id })
      if (voteCount > 0) {
        const error = new Error("Cannot delete candidate with existing votes")
        error.statusCode = 400
        return next(error)
      }

      await Candidate.findByIdAndDelete(id)

      const electionType = candidate.ssgElectionId ? 'SSG' : 'Departmental'
      await CandidateController.logAuditAction(
        "DELETE_CANDIDATE",
        req.user,
        `Deleted ${electionType} candidate: ${candidate.getDisplayName()} (${candidate.voterId.schoolId})`,
        req
      )

      res.json({
        success: true,
        message: "Candidate deleted successfully"
      })
    } catch (error) {
      console.error("Error deleting candidate:", error)
      const err = new Error(error.message || "Failed to delete candidate")
      err.statusCode = error.statusCode || 500
      next(err)
    }
  }

  // Delete SSG candidate
  static async deleteSSGCandidate(req, res, next) {
    try {
      const { id } = req.params
      
      const candidate = await Candidate.findOne({
        _id: id,
        ssgElectionId: { $ne: null },
        deptElectionId: null
      })

      if (!candidate) {
        const error = new Error("SSG candidate not found")
        error.statusCode = 404
        return next(error)
      }

      await CandidateController.deleteCandidate(req, res, next)
    } catch (error) {
      const err = new Error("Failed to delete SSG candidate")
      err.statusCode = 500
      next(err)
    }
  }

  // Delete Departmental candidate
  static async deleteDepartmentalCandidate(req, res, next) {
    try {
      const { id } = req.params
      
      const candidate = await Candidate.findOne({
        _id: id,
        deptElectionId: { $ne: null },
        ssgElectionId: null
      })

      if (!candidate) {
        const error = new Error("Departmental candidate not found")
        error.statusCode = 404
        return next(error)
      }

      await CandidateController.deleteCandidate(req, res, next)
    } catch (error) {
      const err = new Error("Failed to delete departmental candidate")
      err.statusCode = 500
      next(err)
    }
  }

  // Upload campaign picture (SSG only)
  static async uploadCampaignPicture(req, res, next) {
    try {
      const { id } = req.params
      const { campaignPicture } = req.body

      CandidateController.validateObjectId(id, 'candidate ID')

      if (!campaignPicture) {
        const error = new Error("Campaign picture is required")
        error.statusCode = 400
        return next(error)
      }

      const candidate = await Candidate.findById(id)
        .populate('voterId', 'firstName lastName schoolId')
        .populate('ssgElectionId', 'title status')

      if (!candidate) {
        const error = new Error("Candidate not found")
        error.statusCode = 404
        return next(error)
      }

      // Only SSG candidates can have campaign pictures
      if (!candidate.ssgElectionId) {
        const error = new Error("Campaign pictures are only allowed for SSG candidates")
        error.statusCode = 400
        return next(error)
      }

      // Check election status
      if (['completed', 'cancelled'].includes(candidate.ssgElectionId.status)) {
        const error = new Error("Cannot modify campaign pictures in completed or cancelled elections")
        error.statusCode = 400
        return next(error)
      }

      // Convert base64 to buffer
      let pictureBuffer
      try {
        if (typeof campaignPicture === 'string') {
          const base64Data = campaignPicture.replace(/^data:image\/[a-z]+;base64,/, '')
          pictureBuffer = Buffer.from(base64Data, 'base64')
        } else {
          pictureBuffer = campaignPicture
        }

        if (pictureBuffer.length === 0) {
          throw new Error("Invalid image data")
        }
      } catch (error) {
        const err = new Error("Invalid campaign picture format")
        err.statusCode = 400
        return next(err)
      }

      candidate.campaignPicture = pictureBuffer
      await candidate.save()

      await CandidateController.logAuditAction(
        "CAMPAIGN_PICTURE_UPDATE",
        req.user,
        `Updated campaign picture for SSG candidate: ${candidate.getDisplayName()} (${candidate.voterId.schoolId})`,
        req
      )

      res.json({
        success: true,
        data: {
          _id: candidate._id,
          candidateNumber: candidate.candidateNumber,
          hasCampaignPicture: candidate.hasCampaignPicture()
        },
        message: "Campaign picture uploaded successfully"
      })
    } catch (error) {
      console.error("Error uploading campaign picture:", error)
      const err = new Error(error.message || "Failed to upload campaign picture")
      err.statusCode = error.statusCode || 500
      next(err)
    }
  }

  // Get candidates by election using model method
static async getCandidatesBySSGElection(req, res, next) {
  try {
    const { electionId } = req.params
    const { positionId, partylistId, status } = req.query

    console.log('Getting SSG candidates for election:', electionId)
    console.log('Query params:', { positionId, partylistId, status })

    CandidateController.validateObjectId(electionId, 'election ID')

    // Verify SSG election exists and get it with positions and partylists
    const election = await SSGElection.findById(electionId)
    if (!election) {
      const error = new Error("SSG Election not found")
      error.statusCode = 404
      return next(error)
    }

    // Get all active positions for this SSG election
    const positions = await Position.find({
      ssgElectionId: electionId,
      isActive: true
    }).sort({ positionOrder: 1 })

    // Get all active partylists for this SSG election
    const partylists = await Partylist.find({
      ssgElectionId: electionId,
      isActive: true
    }).sort({ partylistName: 1 })

    // Build query for SSG candidates only
    const query = {
      ssgElectionId: electionId,
      deptElectionId: null
    }

    // Add optional filters
    if (positionId) {
      CandidateController.validateObjectId(positionId, 'position ID')
      query.positionId = positionId
    }
    if (partylistId) {
      CandidateController.validateObjectId(partylistId, 'partylist ID')
      query.partylistId = partylistId
    }
    if (status !== undefined) {
      query.isActive = status === 'active'
    }

    console.log('Final query:', query)

    // Get candidates with COMPLETE population
    const candidates = await Candidate.find(query)
      .populate({
        path: 'voterId',
        select: 'schoolId firstName middleName lastName departmentId yearLevel',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })
      .populate({
        path: 'positionId',
        select: 'positionName positionOrder maxVotes description'
      })
      .populate({
        path: 'partylistId', 
        select: 'partylistName description'
      })
      .populate('ssgElectionId', 'title electionDate status')
      .sort({ 
        'positionId.positionOrder': 1,
        candidateNumber: 1
      })

    console.log(`Found ${candidates.length} SSG candidates`)

    // Process candidates for frontend consumption
    const processedCandidates = candidates.map(candidate => {
      const candidateObj = candidate.toObject()
      
      // Add flattened fields for easier access
      candidateObj.fullName = candidate.voterId ? 
        `${candidate.voterId.firstName || ''} ${candidate.voterId.middleName || ''} ${candidate.voterId.lastName || ''}`.replace(/\s+/g, ' ').trim() :
        'Unknown'
      
      candidateObj.position = candidate.positionId?.positionName || 'Unknown Position'
      candidateObj.positionOrder = candidate.positionId?.positionOrder || 999
      candidateObj.partylist = candidate.partylistId?.partylistName || 'Independent'
      candidateObj.department = candidate.voterId?.departmentId?.departmentCode || 'Unknown'
      candidateObj.schoolId = candidate.voterId?.schoolId || 'N/A'
      candidateObj.yearLevel = candidate.voterId?.yearLevel || 'N/A'
      candidateObj.electionType = 'ssg'
      
      return candidateObj
    })

    // Group by position for better organization
    const candidatesByPosition = {}
    processedCandidates.forEach(candidate => {
      const positionId = candidate.positionId?._id?.toString() || 'unknown'
      if (!candidatesByPosition[positionId]) {
        candidatesByPosition[positionId] = {
          position: {
            _id: candidate.positionId?._id,
            positionName: candidate.positionId?.positionName || 'Unknown',
            positionOrder: candidate.positionId?.positionOrder || 999,
            maxVotes: candidate.positionId?.maxVotes || 1,
            description: candidate.positionId?.description || null
          },
          candidates: []
        }
      }
      candidatesByPosition[positionId].candidates.push(candidate)
    })

    // Calculate statistics
    const statistics = {
      total: processedCandidates.length,
      active: processedCandidates.filter(c => c.isActive !== false).length,
      inactive: processedCandidates.filter(c => c.isActive === false).length,
      totalPositions: positions.length,
      totalPartylists: partylists.length,
      byPosition: Object.values(candidatesByPosition).reduce((acc, group) => {
        acc[group.position.positionName] = group.candidates.length
        return acc
      }, {}),
      byPartylist: processedCandidates.reduce((acc, candidate) => {
        const partylist = candidate.partylist || 'Independent'
        acc[partylist] = (acc[partylist] || 0) + 1
        return acc
      }, {})
    }

    await CandidateController.logAuditAction(
      "SYSTEM_ACCESS",
      req.user,
      `Retrieved ${processedCandidates.length} candidates for SSG election: ${election.title}`,
      req
    )

    res.json({
      success: true,
      data: {
        election: {
          _id: election._id,
          title: election.title,
          electionDate: election.electionDate,
          status: election.status,
          type: 'SSG'
        },
        // Include positions and partylists for frontend use
        positions: positions.map(pos => ({
          _id: pos._id,
          positionName: pos.positionName,
          positionOrder: pos.positionOrder,
          maxVotes: pos.maxVotes,
          maxCandidates: pos.maxCandidates,
          description: pos.description,
          candidateCount: candidatesByPosition[pos._id.toString()]?.candidates?.length || 0
        })),
        partylists: partylists.map(party => ({
          _id: party._id,
          partylistName: party.partylistName,
          description: party.description,
          candidateCount: processedCandidates.filter(c => c.partylistId?._id?.toString() === party._id.toString()).length
        })),
        candidates: processedCandidates,
        candidatesByPosition: Object.values(candidatesByPosition),
        totalCandidates: processedCandidates.length,
        statistics
      },
      message: "SSG election candidates retrieved successfully"
    })

  } catch (error) {
    console.error("Error fetching SSG election candidates:", error)
    console.error("Error stack:", error.stack)
    const err = new Error("Failed to fetch SSG election candidates")
    err.statusCode = 500
    next(err)
  }
}

  // Get candidates by Departmental election
static async getCandidatesByDepartmentalElection(req, res, next) {
  try {
    const { electionId } = req.params
    const { positionId, status } = req.query

    console.log('Getting Departmental candidates for election:', electionId)
    console.log('Query params:', { positionId, status })

    CandidateController.validateObjectId(electionId, 'election ID')

    // Verify Departmental election exists
    const election = await DepartmentalElection.findById(electionId).populate('departmentId')
    if (!election) {
      const error = new Error("Departmental Election not found")
      error.statusCode = 404
      return next(error)
    }

    // Get all active positions for this departmental election
    const positions = await Position.find({
      deptElectionId: electionId,
      isActive: true
    }).sort({ positionOrder: 1 })

    // Build query for departmental candidates only
    const query = {
      deptElectionId: electionId,
      ssgElectionId: null
    }

    // Add optional filters
    if (positionId) {
      CandidateController.validateObjectId(positionId, 'position ID')
      query.positionId = positionId
    }
    if (status !== undefined) {
      query.isActive = status === 'active'
    }

    // Get candidates with full population
    const candidates = await Candidate.find(query)
      .populate({
        path: 'voterId',
        select: 'schoolId firstName middleName lastName departmentId yearLevel',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })
      .populate({
        path: 'positionId',
        select: 'positionName positionOrder maxVotes description'
      })
      .populate('deptElectionId', 'title electionDate status departmentId')
      .sort({ 
        'positionId.positionOrder': 1,
        candidateNumber: 1
      })

    // Process candidates
    const processedCandidates = candidates.map(candidate => {
      const candidateObj = candidate.toObject()
      
      candidateObj.fullName = candidate.voterId ? 
        `${candidate.voterId.firstName || ''} ${candidate.voterId.middleName || ''} ${candidate.voterId.lastName || ''}`.replace(/\s+/g, ' ').trim() :
        'Unknown'
      
      candidateObj.position = candidate.positionId?.positionName || 'Unknown Position'
      candidateObj.positionOrder = candidate.positionId?.positionOrder || 999
      candidateObj.department = candidate.voterId?.departmentId?.departmentCode || 'Unknown'
      candidateObj.schoolId = candidate.voterId?.schoolId || 'N/A'
      candidateObj.yearLevel = candidate.voterId?.yearLevel || 'N/A'
      candidateObj.electionType = 'departmental'
      
      return candidateObj
    })

    // Group by position
    const candidatesByPosition = {}
    processedCandidates.forEach(candidate => {
      const positionId = candidate.positionId?._id?.toString() || 'unknown'
      if (!candidatesByPosition[positionId]) {
        candidatesByPosition[positionId] = {
          position: {
            _id: candidate.positionId?._id,
            positionName: candidate.positionId?.positionName || 'Unknown',
            positionOrder: candidate.positionId?.positionOrder || 999,
            maxVotes: candidate.positionId?.maxVotes || 1,
            description: candidate.positionId?.description || null
          },
          candidates: []
        }
      }
      candidatesByPosition[positionId].candidates.push(candidate)
    })

    // Statistics
    const statistics = {
      total: processedCandidates.length,
      active: processedCandidates.filter(c => c.isActive !== false).length,
      inactive: processedCandidates.filter(c => c.isActive === false).length,
      totalPositions: positions.length,
      byPosition: Object.values(candidatesByPosition).reduce((acc, group) => {
        acc[group.position.positionName] = group.candidates.length
        return acc
      }, {}),
      byDepartment: processedCandidates.reduce((acc, candidate) => {
        const dept = candidate.department || 'Unknown'
        acc[dept] = (acc[dept] || 0) + 1
        return acc
      }, {})
    }

    await CandidateController.logAuditAction(
      "SYSTEM_ACCESS",
      req.user,
      `Retrieved ${processedCandidates.length} candidates for Departmental election: ${election.title}`,
      req
    )

    res.json({
      success: true,
      data: {
        election: {
          _id: election._id,
          title: election.title,
          electionDate: election.electionDate,
          status: election.status,
          type: 'DEPARTMENTAL',
          department: election.departmentId?.departmentCode,
          departmentName: election.departmentId?.degreeProgram,
          college: election.departmentId?.college
        },
        positions: positions.map(pos => ({
          _id: pos._id,
          positionName: pos.positionName,
          positionOrder: pos.positionOrder,
          maxVotes: pos.maxVotes,
          maxCandidates: pos.maxCandidates,
          description: pos.description,
          candidateCount: candidatesByPosition[pos._id.toString()]?.candidates?.length || 0
        })),
        candidates: processedCandidates,
        candidatesByPosition: Object.values(candidatesByPosition),
        totalCandidates: processedCandidates.length,
        statistics
      },
      message: "Departmental election candidates retrieved successfully"
    })

  } catch (error) {
    console.error("Error fetching departmental election candidates:", error)
    const err = new Error("Failed to fetch departmental election candidates")
    err.statusCode = 500
    next(err)
  }
}

static async getCandidatesByElection(req, res, next) {
  try {
    const { electionId } = req.params
    const { type } = req.query

    if (!type || !['ssg', 'departmental'].includes(type)) {
      const error = new Error("Election type (ssg or departmental) is required")
      error.statusCode = 400
      return next(error)
    }

    // Route to specific election type handler
    if (type === 'ssg') {
      return await CandidateController.getCandidatesBySSGElection(req, res, next)
    } else {
      return await CandidateController.getCandidatesByDepartmentalElection(req, res, next)
    }
  } catch (error) {
    console.error("Error fetching candidates by election:", error)
    const err = new Error("Failed to fetch candidates by election")
    err.statusCode = 500
    next(err)
  }
}

  // Get candidates for voter view with eligibility check
  static async getCandidatesForVoter(req, res, next) {
    try {
      const { electionId } = req.params
      const type = req.path.includes('/ssg/') ? 'ssg' : 
               req.path.includes('/departmental/') ? 'departmental' : 
               req.query.type
      const voterId = req.user.voterId || req.user._id

      if (!type || !['ssg', 'departmental'].includes(type)) {
        const error = new Error("Election type (ssg or departmental) is required")
        error.statusCode = 400
        return next(error)
      }

      CandidateController.validateObjectId(electionId, 'election ID')

      // Get voter info
      const voter = await Voter.findById(voterId).populate('departmentId')
      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      // Verify election exists
      let election
      if (type === 'ssg') {
        election = await SSGElection.findById(electionId)
      } else {
        election = await DepartmentalElection.findById(electionId).populate('departmentId')
      }

      if (!election) {
        const error = new Error(`${type.toUpperCase()} Election not found`)
        error.statusCode = 404
        return next(error)
      }

      // Check voting eligibility using model method
      const eligibility = Candidate.checkVotingEligibility(voter, election, type)

      // Get candidates using model method
      const candidates = await Candidate.getByElectionWithDetails(electionId, type)

      // Group by position
      const candidatesByPosition = Candidate.groupByPosition(candidates)
      const sortedCandidates = Candidate.sortCandidates(candidates)

      await CandidateController.logAuditAction(
        "BALLOT_ACCESSED",
        voter,
        `Viewed candidates for ${type.toUpperCase()} election: ${election.title} - Can vote: ${eligibility.canVote}`,
        req,
        true
      )

      res.json({
        success: true,
        data: {
          election: {
            _id: election._id,
            title: election.title,
            electionDate: election.electionDate,
            status: election.status,
            type: type.toUpperCase(),
            ...(type === 'departmental' && election.departmentId && { 
              department: election.departmentId.departmentCode,
              departmentName: election.departmentId.degreeProgram,
              college: election.departmentId.college
            })
          },
          candidates: sortedCandidates.map(c => c.formatForDisplay()),
          candidatesByPosition: Object.values(candidatesByPosition).map(group => ({
            position: group.position,
            candidates: group.candidates.map(c => c.formatForDisplay())
          })),
          totalCandidates: candidates.length,
          voterEligibility: {
            canVote: eligibility.canVote,
            canViewResults: eligibility.canViewResults,
            isRegistered: voter.isRegistered,
            isClassOfficer: voter.isClassOfficer,
            departmentMatch: type === 'departmental' && election.departmentId ? 
              voter.departmentId._id.toString() === election.departmentId._id.toString() : 
              true,
            message: eligibility.message,
            reasons: eligibility.reasons || []
          }
        },
        message: "Candidates retrieved successfully"
      })
    } catch (error) {
      console.error("Error fetching candidates for voter:", error)
      const err = new Error(error.message || "Failed to fetch candidates")
      err.statusCode = error.statusCode || 500
      next(err)
    }
  }

  // Export candidates data with enhanced formatting
  static async exportCandidates(req, res, next) {
  try {
    const { type, electionId, format = 'csv' } = req.query
    
    const query = {}
    if (type === 'ssg') {
      query.ssgElectionId = { $ne: null }
      query.deptElectionId = null
    } else if (type === 'departmental') {
      query.deptElectionId = { $ne: null }
      query.ssgElectionId = null
    }
    
    if (electionId) {
      CandidateController.validateObjectId(electionId, 'election ID')
      
      if (type === 'ssg') {
        query.ssgElectionId = electionId
      } else if (type === 'departmental') {
        query.deptElectionId = electionId
      }
    }

    const candidates = await Candidate.find(query)
      .populate({
        path: 'voterId',
        select: 'schoolId firstName middleName lastName departmentId yearLevel',
        populate: { path: 'departmentId', select: 'departmentCode degreeProgram college' }
      })
      .populate('positionId', 'positionName positionOrder')
      .populate('partylistId', 'partylistName')
      .populate('ssgElectionId', 'title electionDate')
      .populate('deptElectionId', 'title electionDate')
      .sort({ candidateNumber: 1 })

    if (format === 'csv') {
      const csvData = candidates.map(candidate => ({
        'Candidate Number': candidate.candidateNumber,
        'Name': candidate.getDisplayName(),
        'School ID': candidate.voterId?.schoolId || 'N/A',
        'Position': candidate.positionId?.positionName || 'N/A',
        'Election Type': candidate.electionType?.toUpperCase() || 'N/A',
        'Election Title': candidate.ssgElectionId?.title || candidate.deptElectionId?.title || 'N/A',
        'Department': candidate.voterId?.departmentId?.departmentCode || 'N/A',
        'Year Level': candidate.voterId?.yearLevel || 'N/A',
        'Partylist': candidate.partylistId?.partylistName || 'Independent',
        'Has Credentials': candidate.hasCredentials() ? 'Yes' : 'No', // Changed from Platform
        'Status': candidate.isActive ? 'Active' : 'Inactive',
        'Has Campaign Picture': candidate.hasCampaignPicture() ? 'Yes' : 'No'
      }))

      const csvHeader = Object.keys(csvData[0] || {}).join(',')
      const csvRows = csvData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value
        ).join(',')
      )
      const csvContent = [csvHeader, ...csvRows].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="candidates_${type || 'all'}_${new Date().toISOString().split('T')[0]}.csv"`)
      res.send(csvContent)
    } else {
      const statistics = Candidate.getStatistics(candidates)
      
      res.json({
        success: true,
        data: {
          candidates: candidates.map(c => c.formatForDisplay()),
          statistics,
          exportInfo: {
            exportedAt: new Date(),
            totalRecords: candidates.length,
            filters: { type, electionId, format }
          }
        },
        message: "Candidates exported successfully"
      })
    }

    await CandidateController.logAuditAction(
      "DATA_EXPORT",
      req.user,
      `Exported ${candidates.length} candidates (type: ${type || 'all'}, format: ${format})`,
      req
    )

  } catch (error) {
    console.error("Error exporting candidates:", error)
    const err = new Error(error.message || "Failed to export candidates")
    err.statusCode = error.statusCode || 500
    next(err)
  }
}

  // Get candidate campaign picture (for image display)
  static async getCandidateCampaignPicture(req, res, next) {
    try {
      const { id } = req.params

      CandidateController.validateObjectId(id, 'candidate ID')

      const candidate = await Candidate.findById(id).select('campaignPicture ssgElectionId')

      if (!candidate) {
        const error = new Error("Candidate not found")
        error.statusCode = 404
        return next(error)
      }

      if (!candidate.ssgElectionId) {
        const error = new Error("Campaign pictures are only available for SSG candidates")
        error.statusCode = 400
        return next(error)
      }

      if (!candidate.hasCampaignPicture()) {
        const error = new Error("No campaign picture found")
        error.statusCode = 404
        return next(error)
      }

      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=3600')
      res.send(candidate.campaignPicture)

    } catch (error) {
      console.error("Error fetching campaign picture:", error)
      const err = new Error(error.message || "Failed to fetch campaign picture")
      err.statusCode = error.statusCode || 500
      next(err)
    }
  }

  static async uploadCredentials(req, res, next) {
  try {
    const { id } = req.params
    const { credentials } = req.body

    CandidateController.validateObjectId(id, 'candidate ID')

    if (!credentials) {
      const error = new Error("Credentials file is required")
      error.statusCode = 400
      return next(error)
    }

    const candidate = await Candidate.findById(id)
      .populate('voterId', 'firstName lastName schoolId')
      .populate('ssgElectionId', 'title status')

    if (!candidate) {
      const error = new Error("Candidate not found")
      error.statusCode = 404
      return next(error)
    }

    // Only SSG candidates can have credentials
    if (!candidate.ssgElectionId) {
      const error = new Error("Credentials are only allowed for SSG candidates")
      error.statusCode = 400
      return next(error)
    }

    // Check election status
    if (['completed', 'cancelled'].includes(candidate.ssgElectionId.status)) {
      const error = new Error("Cannot modify credentials in completed or cancelled elections")
      error.statusCode = 400
      return next(error)
    }

    // Convert base64 to buffer
    let credentialsBuffer
    try {
      if (typeof credentials === 'string') {
        const base64Data = credentials.replace(/^data:[^;]+;base64,/, '')
        credentialsBuffer = Buffer.from(base64Data, 'base64')
      } else {
        credentialsBuffer = credentials
      }

      if (credentialsBuffer.length === 0) {
        throw new Error("Invalid credentials data")
      }
    } catch (error) {
      const err = new Error("Invalid credentials format")
      err.statusCode = 400
      return next(err)
    }

    candidate.credentials = credentialsBuffer
    await candidate.save()

    await CandidateController.logAuditAction(
      "CREDENTIALS_UPDATE",
      req.user,
      `Updated credentials for SSG candidate: ${candidate.getDisplayName()} (${candidate.voterId.schoolId})`,
      req
    )

    res.json({
      success: true,
      data: {
        _id: candidate._id,
        candidateNumber: candidate.candidateNumber,
        hasCredentials: candidate.hasCredentials()
      },
      message: "Credentials uploaded successfully"
    })
  } catch (error) {
    console.error("Error uploading credentials:", error)
    const err = new Error(error.message || "Failed to upload credentials")
    err.statusCode = error.statusCode || 500
    next(err)
  }
}

static async getCandidateCredentials(req, res, next) {
  try {
    const { id } = req.params

    CandidateController.validateObjectId(id, 'candidate ID')

    const candidate = await Candidate.findById(id).select('credentials ssgElectionId')

    if (!candidate) {
      const error = new Error("Candidate not found")
      error.statusCode = 404
      return next(error)
    }

    if (!candidate.ssgElectionId) {
      const error = new Error("Credentials are only available for SSG candidates")
      error.statusCode = 400
      return next(error)
    }

    if (!candidate.hasCredentials()) {
      const error = new Error("No credentials found")
      error.statusCode = 404
      return next(error)
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(candidate.credentials)

  } catch (error) {
    console.error("Error fetching credentials:", error)
    const err = new Error(error.message || "Failed to fetch credentials")
    err.statusCode = error.statusCode || 500
    next(err)
  }
}

}

module.exports = CandidateController