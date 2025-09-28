const mongoose = require("mongoose")

const electionParticipationSchema = new mongoose.Schema(
  {
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voter",
      required: true,
    },
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
    confirmedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    hasVoted: {
      type: Boolean,
      default: false,
    },
    votedAt: {
      type: Date,
      default: null,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    status: {
      type: String,
      enum: ["confirmed"],
      default: "confirmed",
    },
  },
  {
    timestamps: true,
  }
)

// Compound indexes to ensure a voter can only confirm once per election
electionParticipationSchema.index({ voterId: 1, deptElectionId: 1 }, { unique: true, sparse: true })
electionParticipationSchema.index({ voterId: 1, ssgElectionId: 1 }, { unique: true, sparse: true })

// Additional indexes for performance
electionParticipationSchema.index({ deptElectionId: 1 })
electionParticipationSchema.index({ ssgElectionId: 1 })
electionParticipationSchema.index({ voterId: 1 })
electionParticipationSchema.index({ hasVoted: 1 })
electionParticipationSchema.index({ departmentId: 1 })

// Validation: Must belong to either SSG or Departmental election, not both
electionParticipationSchema.pre('validate', function(next) {
  if (!this.ssgElectionId && !this.deptElectionId) {
    return next(new Error('Participation must be for either SSG or Departmental election'))
  }
  if (this.ssgElectionId && this.deptElectionId) {
    return next(new Error('Participation cannot be for both SSG and Departmental elections'))
  }
  next()
})

// Virtual for election type
electionParticipationSchema.virtual('electionType').get(function() {
  return this.ssgElectionId ? 'ssg' : 'departmental'
})

// Instance method to update voting status based on actual votes
electionParticipationSchema.methods.updateVotingStatus = async function() {
  const Vote = require('./Vote')
  
  let hasActualVotes = false
  
  if (this.ssgElectionId) {
    hasActualVotes = await Vote.exists({
      ssgElectionId: this.ssgElectionId,
      ballotId: { $in: await mongoose.model('Ballot').find({ 
        voterId: this.voterId, 
        ssgElectionId: this.ssgElectionId,
        isSubmitted: true 
      }).select('_id') }
    })
  } else if (this.deptElectionId) {
    hasActualVotes = await Vote.exists({
      deptElectionId: this.deptElectionId,
      ballotId: { $in: await mongoose.model('Ballot').find({ 
        voterId: this.voterId, 
        deptElectionId: this.deptElectionId,
        isSubmitted: true 
      }).select('_id') }
    })
  }
  
  if (hasActualVotes && !this.hasVoted) {
    this.hasVoted = true
    this.votedAt = new Date()
    await this.save()
  }
  
  return this.hasVoted
}

// Static method to get comprehensive election statistics
electionParticipationSchema.statics.getElectionStatistics = async function(electionId, electionType) {
  const matchCondition = electionType === 'departmental' 
    ? { deptElectionId: new mongoose.Types.ObjectId(electionId) }
    : { ssgElectionId: new mongoose.Types.ObjectId(electionId) }
    
  // Get participation stats
  const participationStats = await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalParticipants: { $sum: 1 },
        totalVoted: { $sum: { $cond: ["$hasVoted", 1, 0] } },
        participantsNotVoted: { $sum: { $cond: [{ $eq: ["$hasVoted", false] }, 1, 0] } }
      }
    }
  ])
  
  const stats = participationStats[0] || {
    totalParticipants: 0,
    totalVoted: 0,
    participantsNotVoted: 0
  }
  
  // Get eligible voters count
  const Voter = require('./Voter')
  let eligibleVotersQuery = { isActive: true, isRegistered: true, isPasswordActive: true }
  
  if (electionType === 'departmental') {
    // For departmental elections, only class officers from the same department
    const DepartmentalElection = require('./DepartmentalElection')
    const election = await DepartmentalElection.findById(electionId).populate('departmentId')
    if (election) {
      eligibleVotersQuery.departmentId = election.departmentId._id
      eligibleVotersQuery.isClassOfficer = true
    }
  }
  
  const totalEligibleVoters = await Voter.countDocuments(eligibleVotersQuery)
  const registeredNotParticipated = totalEligibleVoters - stats.totalParticipants
  
  // Calculate percentages
  const participationRate = totalEligibleVoters > 0 
    ? Math.round((stats.totalParticipants / totalEligibleVoters) * 100) 
    : 0
    
  const voterTurnoutRate = stats.totalParticipants > 0
    ? Math.round((stats.totalVoted / stats.totalParticipants) * 100)
    : 0
    
  const overallTurnoutRate = totalEligibleVoters > 0
    ? Math.round((stats.totalVoted / totalEligibleVoters) * 100)
    : 0
  
  return {
    totalEligibleVoters,
    totalParticipants: stats.totalParticipants,
    totalVoted: stats.totalVoted,
    participantsNotVoted: stats.participantsNotVoted,
    registeredNotParticipated,
    participationRate,
    voterTurnoutRate,
    overallTurnoutRate
  }
}

// Static method to verify voter eligibility for participation
electionParticipationSchema.statics.checkParticipationEligibility = async function(voterId, electionId, electionType) {
  const Voter = require('./Voter')
  const voter = await Voter.findById(voterId).populate('departmentId')
  
  if (!voter) {
    return { eligible: false, reason: 'Voter not found' }
  }
  
  if (!voter.isActive) {
    return { eligible: false, reason: 'Voter account is inactive' }
  }
  
  if (!voter.isRegistered || !voter.isPasswordActive) {
    return { eligible: false, reason: 'Voter must be registered with an active password' }
  }
  
  // Check if already participated
  const query = { voterId }
  if (electionType === 'ssg') {
    query.ssgElectionId = electionId
  } else {
    query.deptElectionId = electionId
  }
  
  const existingParticipation = await this.findOne(query)
  if (existingParticipation) {
    return { eligible: false, reason: 'Already confirmed participation in this election' }
  }
  
  // Check election-specific eligibility
  if (electionType === 'departmental') {
    if (!voter.isClassOfficer) {
      return { eligible: false, reason: 'Only class officers can participate in departmental elections' }
    }
    
    // Check department match
    const DepartmentalElection = require('./DepartmentalElection')
    const election = await DepartmentalElection.findById(electionId).populate('departmentId')
    if (!election) {
      return { eligible: false, reason: 'Departmental election not found' }
    }
    
    if (voter.departmentId._id.toString() !== election.departmentId._id.toString()) {
      return { eligible: false, reason: 'Can only participate in elections for your department' }
    }
  }
  
  return { eligible: true, voter }
}

// Static method to generate voting receipt data
electionParticipationSchema.statics.generateVotingReceipt = async function(voterId, electionId, electionType) {
  const Vote = require('./Vote')
  const Ballot = require('./Ballot')
  
  // Find submitted ballot for this election
  const ballotQuery = { voterId, isSubmitted: true }
  if (electionType === 'ssg') {
    ballotQuery.ssgElectionId = electionId
  } else {
    ballotQuery.deptElectionId = electionId
  }
  
  const ballot = await Ballot.findOne(ballotQuery)
  if (!ballot) {
    return { hasVoted: false, reason: 'No submitted ballot found for this election' }
  }
  
  // Get votes from this ballot
  const votes = await Vote.find({ ballotId: ballot._id })
    .populate('candidateId', 'candidateNumber')
    .populate({
      path: 'candidateId',
      populate: {
        path: 'voterId',
        select: 'firstName middleName lastName'
      }
    })
    .populate('positionId', 'positionName positionOrder')
  
  if (votes.length === 0) {
    return { hasVoted: false, reason: 'No votes found in submitted ballot' }
  }
  
  // Update participation status
  const participation = await this.findOne({
    voterId,
    ...(electionType === 'ssg' ? { ssgElectionId: electionId } : { deptElectionId: electionId })
  })
  
  if (participation && !participation.hasVoted) {
    participation.hasVoted = true
    participation.votedAt = ballot.submittedAt || new Date()
    await participation.save()
  }
  
  return {
    hasVoted: true,
    ballotToken: ballot.ballotToken,
    submittedAt: ballot.submittedAt,
    totalVotes: votes.length,
    voteDetails: votes.map(vote => ({
      position: vote.positionId.positionName,
      candidateNumber: vote.candidateId.candidateNumber,
      candidateName: vote.candidateId.voterId ? 
        `${vote.candidateId.voterId.firstName} ${vote.candidateId.voterId.middleName || ''} ${vote.candidateId.voterId.lastName}`.replace(/\s+/g, ' ').trim() : 
        'Unknown Candidate'
    })).sort((a, b) => a.position.localeCompare(b.position))
  }
}

// Ensure virtual fields are serialized
electionParticipationSchema.set('toJSON', { virtuals: true })
electionParticipationSchema.set('toObject', { virtuals: true })

module.exports = mongoose.model("ElectionParticipation", electionParticipationSchema)