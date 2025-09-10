const mongoose = require("mongoose")

const voteSchema = new mongoose.Schema(
  {
    ballotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ballot",
      required: true,
      index: true // Add index for better query performance
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true // Add index for vote counting
    },
    positionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Position",
      required: true,
      index: true // Add index for position-based queries
    },
    // Add election references for easier querying
    deptElectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DepartmentalElection",
      default: null,
      index: true
    },
    ssgElectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SSGElection",
      default: null,
      index: true
    },
    voteTimestamp: {
      type: Date,
      default: Date.now,
      index: true // Index for time-based queries
    },
    // Optional: Add vote verification hash (for enhanced security)
    voteHash: {
      type: String,
      default: null,
      index: true,
      sparse: true // Only index non-null values
    }
  },
  {
    timestamps: true,
  }
)

// Compound indexes for preventing duplicate votes and improving performance
voteSchema.index({ ballotId: 1, positionId: 1 }, { unique: true }) // Prevent multiple votes for same position in same ballot
voteSchema.index({ deptElectionId: 1, candidateId: 1 }) // For candidate vote counting
voteSchema.index({ ssgElectionId: 1, candidateId: 1 }) // For candidate vote counting
voteSchema.index({ deptElectionId: 1, positionId: 1 }) // For position-based analytics
voteSchema.index({ ssgElectionId: 1, positionId: 1 }) // For position-based analytics

// Pre-save middleware to auto-populate election references from candidate
voteSchema.pre('save', async function(next) {
  if (this.isNew && !this.deptElectionId && !this.ssgElectionId) {
    try {
      const candidate = await mongoose.model('Candidate').findById(this.candidateId)
      if (candidate) {
        this.deptElectionId = candidate.deptElectionId
        this.ssgElectionId = candidate.ssgElectionId
      }
    } catch (error) {
      return next(error)
    }
  }
  next()
})

// Instance method to verify vote integrity
voteSchema.methods.verifyVoteIntegrity = async function() {
  try {
    // Check if ballot exists and is submitted
    const ballot = await mongoose.model('Ballot').findById(this.ballotId)
    if (!ballot || !ballot.isSubmitted) {
      return { valid: false, reason: 'Invalid or unsubmitted ballot' }
    }

    // Check if candidate exists and is active
    const candidate = await mongoose.model('Candidate').findById(this.candidateId)
    if (!candidate || !candidate.isActive) {
      return { valid: false, reason: 'Invalid or inactive candidate' }
    }

    // Check if position matches candidate's position
    if (!candidate.positionId.equals(this.positionId)) {
      return { valid: false, reason: 'Position mismatch' }
    }

    // Check if election matches
    const electionMatches = (candidate.deptElectionId && this.deptElectionId && candidate.deptElectionId.equals(this.deptElectionId)) ||
                           (candidate.ssgElectionId && this.ssgElectionId && candidate.ssgElectionId.equals(this.ssgElectionId))
    
    if (!electionMatches) {
      return { valid: false, reason: 'Election mismatch' }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, reason: 'Verification error: ' + error.message }
  }
}

// Static method to get vote counts for an election
voteSchema.statics.getElectionResults = async function(electionId, electionType) {
  const matchCondition = electionType === 'departmental' 
    ? { deptElectionId: new mongoose.Types.ObjectId(electionId) }
    : { ssgElectionId: new mongoose.Types.ObjectId(electionId) }
    
  return await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: {
          positionId: '$positionId',
          candidateId: '$candidateId'
        },
        voteCount: { $sum: 1 },
        lastVoteTime: { $max: '$voteTimestamp' }
      }
    },
    {
      $lookup: {
        from: 'positions',
        localField: '_id.positionId',
        foreignField: '_id',
        as: 'position'
      }
    },
    {
      $lookup: {
        from: 'candidates',
        localField: '_id.candidateId',
        foreignField: '_id',
        as: 'candidate'
      }
    },
    {
      $sort: {
        'position.positionOrder': 1,
        voteCount: -1
      }
    }
  ])
}

// Static method to check if ballot has voted for specific position
voteSchema.statics.hasVotedForPosition = async function(ballotId, positionId) {
  const existingVote = await this.findOne({ ballotId, positionId })
  return !!existingVote
}

// Static method to get total votes cast in an election
voteSchema.statics.getTotalVotesInElection = async function(electionId, electionType) {
  const matchCondition = electionType === 'departmental' 
    ? { deptElectionId: electionId }
    : { ssgElectionId: electionId }
    
  return await this.countDocuments(matchCondition)
}

module.exports = mongoose.model("Vote", voteSchema)