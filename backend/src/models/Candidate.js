const mongoose = require("mongoose")

const candidateSchema = new mongoose.Schema(
  {
    deptElectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DepartmentalElection",
      default: null,
    },
    ssgElectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SSGElection",
      default: null,
    },
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voter",
      required: true,
    },
    positionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Position",
      required: true,
    },
    partylistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partylist",
      default: null,
    },
    candidateNumber: {
      type: Number,
      required: true,
    },
    campaignPicture: {
      type: Buffer,
      default: null,
    },
    credentials: {
      type: Buffer,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    voteCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

// Compound indexes to ensure unique candidate per position per election
candidateSchema.index({ deptElectionId: 1, positionId: 1, candidateNumber: 1 }, { unique: true, sparse: true })
candidateSchema.index({ ssgElectionId: 1, positionId: 1, candidateNumber: 1 }, { unique: true, sparse: true })
// candidateSchema.index({ deptElectionId: 1, voterId: 1 }, { unique: true, sparse: true })
// candidateSchema.index({ ssgElectionId: 1, voterId: 1 }, { unique: true, sparse: true })

// Additional indexes for performance
candidateSchema.index({ isActive: 1 })
candidateSchema.index({ candidateNumber: 1 })

// Validation: Must belong to either SSG or Departmental election, not both
candidateSchema.pre('validate', function(next) {
  if (!this.ssgElectionId && !this.deptElectionId) {
    return next(new Error('Candidate must belong to either SSG or Departmental election'))
  }
  if (this.ssgElectionId && this.deptElectionId) {
    return next(new Error('Candidate cannot belong to both SSG and Departmental elections'))
  }
  next()
})

// Validation: Partylists only for SSG candidates
candidateSchema.pre('validate', function(next) {
  if (this.partylistId && this.deptElectionId) {
    return next(new Error('Partylists are only available for SSG candidates'))
  }
  next()
})

// Virtual for election type
candidateSchema.virtual('electionType').get(function() {
  return this.ssgElectionId ? 'ssg' : 'departmental'
})

// Virtual for full name
candidateSchema.virtual('fullName').get(function() {
  if (this.populated('voterId') && this.voterId) {
    const voter = this.voterId
    const middle = voter.middleName ? ` ${voter.middleName}` : ''
    return `${voter.firstName}${middle} ${voter.lastName}`
  }
  return null
})

// Ensure virtual fields are serialized
candidateSchema.set('toJSON', { virtuals: true })
candidateSchema.set('toObject', { virtuals: true })

// INSTANCE METHODS

// Check if candidate has campaign picture
candidateSchema.methods.hasCampaignPicture = function() {
  return this.campaignPicture && this.campaignPicture.length > 0
}

//  Check if candidate has credentials
candidateSchema.methods.hasCredentials = function() {
  return this.credentials && this.credentials.length > 0
}

// Get candidate display name
candidateSchema.methods.getDisplayName = function() {
  if (this.populated('voterId') && this.voterId) {
    const voter = this.voterId
    const middle = voter.middleName ? ` ${voter.middleName}` : ''
    return `${voter.firstName}${middle} ${voter.lastName}`.replace(/\s+/g, ' ').trim()
  }
  return null
}

// UPDATED: Get candidate full info for display (removed platform, added credentials status)
candidateSchema.methods.getDisplayInfo = function() {
  if (!this.populated('voterId') || !this.voterId) {
    return null
  }

  const voter = this.voterId
  const department = voter.departmentId
  
  return {
    name: this.getDisplayName(),
    schoolId: voter.schoolId,
    department: department ? `${department.departmentCode} - ${department.degreeProgram}` : 'Unknown Department',
    college: department ? department.college : 'Unknown College',
    yearLevel: `${voter.yearLevel}${voter.yearLevel === 1 ? 'st' : voter.yearLevel === 2 ? 'nd' : voter.yearLevel === 3 ? 'rd' : 'th'} Year`,
    candidateNumber: this.candidateNumber,
    position: this.populated('positionId') ? this.positionId.positionName : 'Unknown Position',
    partylist: this.populated('partylistId') && this.partylistId ? this.partylistId.partylistName : 'Independent',
    hasCredentials: this.hasCredentials(), 
    isActive: this.isActive,
    electionType: this.electionType
  }
}

// UPDATED: Format candidate for display (removed platform, added hasCredentials)
candidateSchema.methods.formatForDisplay = function() {
  return {
    _id: this._id,
    candidateNumber: this.candidateNumber,
    name: this.getDisplayName(),
    schoolId: this.populated('voterId') ? this.voterId.schoolId : null,
    position: this.populated('positionId') ? this.positionId.positionName : null,
    positionOrder: this.populated('positionId') ? this.positionId.positionOrder : null,
    partylist: this.populated('partylistId') && this.partylistId ? this.partylistId.partylistName : null,
    hasCredentials: this.hasCredentials(), 
    department: this.populated('voterId') && this.voterId.departmentId ? this.voterId.departmentId.departmentCode : null,
    yearLevel: this.populated('voterId') ? this.voterId.yearLevel : null,
    electionType: this.electionType,
    isActive: this.isActive,
    hasCampaignPicture: !!this.campaignPicture && this.campaignPicture.length > 0,
    hasCredentials: !!this.credentials && this.credentials.length > 0,
  }
}

// STATIC METHODS

// UPDATED: Validate candidate data (removed platform validation)
candidateSchema.statics.validateCandidateData = function(candidateData) {
  const errors = []

  if (!candidateData.voterId) {
    errors.push('Voter ID is required')
  }

  if (!candidateData.positionId) {
    errors.push('Position ID is required')
  }

  if (!candidateData.ssgElectionId && !candidateData.deptElectionId) {
    errors.push('Either SSG Election ID or Departmental Election ID is required')
  }

  if (candidateData.ssgElectionId && candidateData.deptElectionId) {
    errors.push('Cannot specify both SSG Election ID and Departmental Election ID')
  }

  if (candidateData.candidateNumber && candidateData.candidateNumber < 1) {
    errors.push('Candidate number must be positive')
  }

  // Partylist can only be assigned to SSG candidates
  if (candidateData.partylistId && candidateData.deptElectionId) {
    errors.push('Partylists are only available for SSG candidates')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// UPDATED: Enhanced validation for SSG candidates (removed platform validation)
candidateSchema.statics.validateSSGCandidate = async function(candidateData, excludeCandidateId = null) {
  const { voterId, ssgElectionId, positionId, partylistId } = candidateData
  const errors = []

  // Verify voter exists (removed registration requirement)
  const Voter = require('./Voter')
  const voter = await Voter.findById(voterId).populate('departmentId')
  if (!voter) {
    errors.push('Voter not found')
    return { isValid: false, errors }
  }

  // Check if voter is already a candidate in this SSG election (any position)
  const existingCandidateQuery = {
    voterId,
    ssgElectionId,
    deptElectionId: null
  }
  
  if (excludeCandidateId) {
    existingCandidateQuery._id = { $ne: excludeCandidateId }
  }
  
  const existingCandidate = await this.findOne(existingCandidateQuery)
    .populate('positionId', 'positionName')

  if (existingCandidate) {
    errors.push(`Voter is already a candidate for ${existingCandidate.positionId.positionName} in this SSG election`)
    return { isValid: false, errors }
  }

  // If partylist is specified, check if voter is already in another partylist for this election
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
    
    const existingPartylistCandidate = await this.findOne(partylistCandidateQuery)
      .populate('partylistId', 'partylistName')
    
    if (existingPartylistCandidate) {
      errors.push(`Voter is already a member of ${existingPartylistCandidate.partylistId.partylistName} in this SSG election`)
      return { isValid: false, errors }
    }
  }

  return { 
    isValid: true, 
    errors: [],
    voter 
  }
}

// Rest of the static methods remain the same...
// [Including all the existing static methods without changes]

// UPDATED: Check if voter can be SSG candidate (any voter allowed)
candidateSchema.statics.checkSSGEligibility = async function(voterId, ssgElectionId, excludeCandidateId = null) {
  const Voter = require('./Voter')
  
  // Check if voter exists and is registered
  const voter = await Voter.findById(voterId)
  if (!voter) {
    return { eligible: false, reason: 'Voter not found' }
  }
  
  // if (!voter.isRegistered || !voter.isPasswordActive) {
  //   return { eligible: false, reason: 'Only registered voters can be SSG candidates' }
  // }

  // Check if voter is already a candidate in this SSG election
  const existingCandidateQuery = {
    voterId,
    ssgElectionId,
    deptElectionId: null
  }
  
  if (excludeCandidateId) {
    existingCandidateQuery._id = { $ne: excludeCandidateId }
  }
  
  const existingCandidate = await this.findOne(existingCandidateQuery)
    .populate('positionId', 'positionName')
  
  if (existingCandidate) {
    return { 
      eligible: false, 
      reason: `Voter is already a candidate for ${existingCandidate.positionId.positionName} in this SSG election` 
    }
  }

  return { eligible: true, voter }
}

// Check if voter can be added to specific partylist
candidateSchema.statics.checkPartylistEligibility = async function(voterId, ssgElectionId, partylistId, excludeCandidateId = null) {
  if (!partylistId) return { eligible: true } // Independent candidates are always eligible

  // Check if voter is already in another partylist for this election
  const partylistCandidateQuery = {
    voterId,
    ssgElectionId,
    partylistId: { $ne: partylistId },
    deptElectionId: null
  }
  
  if (excludeCandidateId) {
    partylistCandidateQuery._id = { $ne: excludeCandidateId }
  }
  
  const existingPartylistCandidate = await this.findOne(partylistCandidateQuery)
    .populate('partylistId', 'partylistName')
  
  if (existingPartylistCandidate) {
    return { 
      eligible: false, 
      reason: `Voter is already a member of ${existingPartylistCandidate.partylistId.partylistName} in this SSG election` 
    }
  }

  return { eligible: true }
}

// [All other static methods remain unchanged - groupByPosition, filterByPartylist, getStatistics, etc.]

// Group candidates by position
candidateSchema.statics.groupByPosition = function(candidates) {
  return candidates.reduce((acc, candidate) => {
    const positionId = candidate.positionId._id || candidate.positionId
    if (!acc[positionId]) {
      acc[positionId] = {
        position: candidate.positionId,
        candidates: []
      }
    }
    acc[positionId].candidates.push(candidate)
    return acc
  }, {})
}

// Filter candidates by partylist
candidateSchema.statics.filterByPartylist = function(candidates, partylistId) {
  if (!partylistId) return candidates
  return candidates.filter(candidate => 
    candidate.partylistId && (candidate.partylistId._id || candidate.partylistId).toString() === partylistId
  )
}

// Filter candidates by election type
candidateSchema.statics.filterByType = function(candidates, type) {
  if (!type) return candidates
  if (type === 'ssg') {
    return candidates.filter(candidate => candidate.ssgElectionId)
  } else if (type === 'departmental') {
    return candidates.filter(candidate => candidate.deptElectionId)
  }
  return candidates
}

// UPDATED: Get candidates statistics (updated to handle credentials instead of platform)
candidateSchema.statics.getStatistics = function(candidates) {
  const stats = {
    total: candidates.length,
    active: 0,
    inactive: 0,
    ssg: 0,
    departmental: 0,
    withCredentials: 0, 
    withoutCredentials: 0,
    byPosition: {},
    byPartylist: {},
    byDepartment: {},
    byYearLevel: {}
  }

  candidates.forEach(candidate => {
    // Active/Inactive count
    if (candidate.isActive) {
      stats.active++
    } else {
      stats.inactive++
    }

    // Election type count
    if (candidate.ssgElectionId) {
      stats.ssg++
    } else if (candidate.deptElectionId) {
      stats.departmental++
    }

    // Credentials count
    if (candidate.hasCredentials && candidate.hasCredentials()) {
      stats.withCredentials++
    } else {
      stats.withoutCredentials++
    }

    // By position (handle both populated and unpopulated)
    const positionName = candidate.positionId?.positionName || 'Unknown Position'
    stats.byPosition[positionName] = (stats.byPosition[positionName] || 0) + 1

    // By partylist
    const partylistName = candidate.partylistId?.partylistName || 'Independent'
    stats.byPartylist[partylistName] = (stats.byPartylist[partylistName] || 0) + 1

    // By department (handle nested population)
    if (candidate.voterId?.departmentId) {
      const departmentCode = candidate.voterId.departmentId.departmentCode || 'Unknown Department'
      stats.byDepartment[departmentCode] = (stats.byDepartment[departmentCode] || 0) + 1
    }

    // By year level
    if (candidate.voterId?.yearLevel) {
      const yearLevel = `${candidate.voterId.yearLevel}${candidate.voterId.yearLevel === 1 ? 'st' : candidate.voterId.yearLevel === 2 ? 'nd' : candidate.voterId.yearLevel === 3 ? 'rd' : 'th'} Year`
      stats.byYearLevel[yearLevel] = (stats.byYearLevel[yearLevel] || 0) + 1
    }
  })

  return stats
}

// [All remaining static methods stay the same - sortCandidates, checkVotingEligibility, etc.]

// Sort candidates by position order and candidate number
candidateSchema.statics.sortCandidates = function(candidates) {
  return [...candidates].sort((a, b) => {
    // First sort by position order
    const aOrder = a.positionId?.positionOrder || 0
    const bOrder = b.positionId?.positionOrder || 0
    if (aOrder !== bOrder) {
      return aOrder - bOrder
    }
    // Then sort by candidate number
    return a.candidateNumber - b.candidateNumber
  })
}

// Check voting eligibility for voter
candidateSchema.statics.checkVotingEligibility = function(voter, election, electionType) {
  const eligibility = {
    canVote: false,
    canViewResults: voter.isRegistered,
    message: '',
    reasons: []
  }

  if (!voter.isRegistered || !voter.isPasswordActive) {
    eligibility.reasons.push('Must be a registered voter')
    eligibility.message = 'You must be a registered voter to participate in elections'
    return eligibility
  }

  if (electionType === 'ssg') {
    // SSG: Only registered voters can vote
    eligibility.canVote = true
    eligibility.message = 'You are eligible to vote in this SSG election'
  } else if (electionType === 'departmental') {
    // Departmental: Only registered class officers from the same department can vote
    const departmentMatch = voter.departmentId._id.toString() === election.departmentId._id.toString()
    
    if (!departmentMatch) {
      eligibility.reasons.push('Must be from the same department')
      eligibility.message = 'You can only vote in elections for your department'
    } else if (!voter.isClassOfficer) {
      eligibility.reasons.push('Must be a class officer')
      eligibility.message = 'Only registered class officers can vote in departmental elections. You can view statistics and results.'
    } else {
      eligibility.canVote = true
      eligibility.message = 'You are eligible to vote in this departmental election'
    }
  }

  return eligibility
}

// Get next available candidate number for position
candidateSchema.statics.getNextCandidateNumber = async function(positionId) {
  const lastCandidate = await this.findOne({
    positionId
  }).sort({ candidateNumber: -1 })
  
  return lastCandidate ? lastCandidate.candidateNumber + 1 : 1
}

// Check if candidate number is available for position
candidateSchema.statics.isCandidateNumberAvailable = async function(positionId, candidateNumber, excludeCandidateId = null) {
  const query = {
    positionId,
    candidateNumber
  }
  
  if (excludeCandidateId) {
    query._id = { $ne: excludeCandidateId }
  }
  
  const existingCandidate = await this.findOne(query)
  return !existingCandidate
}

// Get candidates by election with full population
candidateSchema.statics.getByElectionWithDetails = async function(electionId, electionType, filters = {}) {
  const query = { isActive: true }
  
  if (electionType === 'ssg') {
    query.ssgElectionId = electionId
    query.deptElectionId = null
  } else {
    query.deptElectionId = electionId
    query.ssgElectionId = null
  }
  
  // Apply additional filters
  if (filters.positionId) query.positionId = filters.positionId
  if (filters.partylistId) query.partylistId = filters.partylistId
  if (filters.status !== undefined) query.isActive = filters.status === 'active'
  
  return await this.find(query)
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
    .sort({ 'positionId.positionOrder': 1, candidateNumber: 1 })
}

candidateSchema.statics.validateSSGCandidateWithPositionLimits = async function(candidateData, excludeCandidateId = null) {
  const { voterId, ssgElectionId, positionId, partylistId } = candidateData
  const errors = []

  // Run basic SSG validation first - FIXED: Use the correct method
  const basicValidation = await this.validateSSGCandidate ? 
    await this.validateSSGCandidate(candidateData, excludeCandidateId) : 
    { isValid: true, errors: [], voter: null }

  if (!basicValidation.isValid) {
    return basicValidation
  }

  // Get position details
  const Position = require('./Position')
  const position = await Position.findById(positionId)
  if (!position) {
    errors.push('Position not found')
    return { isValid: false, errors }
  }

  // If candidate has a partylist, check position-specific limits
  if (partylistId) {
    const validationResult = await position.validateCandidateLimit ? 
      await position.validateCandidateLimit(partylistId) :
      { currentCount: 0 }
    
    // Count existing candidates excluding the one being updated
    let existingCount = validationResult.currentCount || 0
    if (excludeCandidateId) {
      const existingCandidate = await this.findById(excludeCandidateId)
      if (existingCandidate && 
          existingCandidate.positionId.toString() === positionId && 
          existingCandidate.partylistId && 
          existingCandidate.partylistId.toString() === partylistId) {
        existingCount -= 1
      }
    }
    
    if (existingCount >= (position.maxCandidatesPerPartylist || 1)) {
      errors.push(`This partylist already has the maximum number of candidates (${position.maxCandidatesPerPartylist || 1}) for ${position.positionName}`)
      return { isValid: false, errors }
    }
  }

  return { 
    isValid: true, 
    errors: [],
    voter: basicValidation.voter,
    position 
  }
}

// Check partylist candidate limits for specific position
candidateSchema.statics.checkPartylistPositionLimits = async function(ssgElectionId, positionId, partylistId, excludeCandidateId = null) {
  if (!partylistId) return { withinLimits: true, message: 'Independent candidates are not limited by partylist quotas' }

  const Position = require('./Position')
  const position = await Position.findById(positionId)
  if (!position) {
    return { withinLimits: false, message: 'Position not found' }
  }

  const query = {
    ssgElectionId,
    positionId,
    partylistId,
    isActive: true
  }
  
  if (excludeCandidateId) {
    query._id = { $ne: excludeCandidateId }
  }
  
  const currentCount = await this.countDocuments(query)
  const maxAllowed = position.maxCandidatesPerPartylist
  
  if (currentCount >= maxAllowed) {
    return {
      withinLimits: false,
      message: `This partylist already has the maximum number of candidates (${maxAllowed}) for position "${position.positionName}"`,
      currentCount,
      maxAllowed,
      remaining: 0,
      positionName: position.positionName
    }
  }
  
  return {
    withinLimits: true,
    message: `Can add ${maxAllowed - currentCount} more candidate${maxAllowed - currentCount !== 1 ? 's' : ''} for position "${position.positionName}"`,
    currentCount,
    maxAllowed,
    remaining: maxAllowed - currentCount,
    positionName: position.positionName
  }
}

// Get comprehensive partylist statistics per election
candidateSchema.statics.getPartylistPositionStats = async function(ssgElectionId, partylistId) {
  const Position = require('./Position')
  
  // Get all positions for this SSG election
  const positions = await Position.find({
    ssgElectionId,
    isActive: true
  }).sort({ positionOrder: 1 })

  const stats = await Promise.all(positions.map(async (position) => {
    const candidateCount = await this.countDocuments({
      ssgElectionId,
      positionId: position._id,
      partylistId,
      isActive: true
    })
    
    return {
      positionId: position._id,
      positionName: position.positionName,
      positionOrder: position.positionOrder,
      currentCandidates: candidateCount,
      maxCandidatesPerPartylist: position.maxCandidatesPerPartylist,
      canAddMore: candidateCount < position.maxCandidatesPerPartylist,
      remaining: Math.max(0, position.maxCandidatesPerPartylist - candidateCount),
      percentageFilled: position.maxCandidatesPerPartylist > 0 ? 
        Math.round((candidateCount / position.maxCandidatesPerPartylist) * 100) : 0
    }
  }))

  const totalCandidates = stats.reduce((sum, stat) => sum + stat.currentCandidates, 0)
  const totalPossible = stats.reduce((sum, stat) => sum + stat.maxCandidatesPerPartylist, 0)
  
  return {
    positions: stats,
    summary: {
      totalCandidates,
      totalPossibleSlots: totalPossible,
      totalRemainingSlots: totalPossible - totalCandidates,
      completedPositions: stats.filter(s => s.currentCandidates === s.maxCandidatesPerPartylist).length,
      availablePositions: stats.filter(s => s.canAddMore).length,
      totalPositions: stats.length,
      overallPercentageFilled: totalPossible > 0 ? Math.round((totalCandidates / totalPossible) * 100) : 0
    }
  }
}

// Validate if moving candidate between positions/partylists is allowed
candidateSchema.statics.validateCandidateMove = async function(candidateId, newPositionId, newPartylistId = null) {
  const candidate = await this.findById(candidateId)
  if (!candidate) {
    return { isValid: false, message: 'Candidate not found' }
  }

  // If changing partylist, check new partylist limits
  if (newPartylistId && newPartylistId !== candidate.partylistId?.toString()) {
    const limitsCheck = await this.checkPartylistPositionLimits(
      candidate.ssgElectionId, 
      newPositionId, 
      newPartylistId,
      candidateId // exclude current candidate from count
    )
    
    if (!limitsCheck.withinLimits) {
      return { isValid: false, message: limitsCheck.message }
    }
  }

  return { isValid: true, message: 'Candidate can be moved' }
}

module.exports = mongoose.model("Candidate", candidateSchema)