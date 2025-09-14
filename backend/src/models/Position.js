const mongoose = require("mongoose")

const positionSchema = new mongoose.Schema(
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
    positionName: {
      type: String,
      required: true,
      trim: true,
    },
    positionOrder: {
      type: Number,
      default: 1,
    },
    maxVotes: {
      type: Number,
      default: 1,
      min: 1,
    },
    maxCandidates: {
      type: Number,
      default: 10,
      min: 1,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    maxCandidatesPerPartylist: {
      type: Number,
      default: 1,  // Most positions allow 1 candidate per partylist
      min: 1,
      validate: {
        validator: function(value) {
          return Number.isInteger(value) && value > 0
        },
        message: 'Maximum candidates per partylist must be a positive integer'
      }
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)


positionSchema.index({ deptElectionId: 1, positionName: 1 }, { unique: true, sparse: true })
positionSchema.index({ ssgElectionId: 1, positionName: 1 }, { unique: true, sparse: true })
positionSchema.index({ deptElectionId: 1, positionOrder: 1 })
positionSchema.index({ ssgElectionId: 1, positionOrder: 1 })

// Virtual to get election type
positionSchema.virtual('electionType').get(function() {
  return this.ssgElectionId ? 'ssg' : 'departmental'
})

// Ensure virtual fields are serialized
positionSchema.set('toJSON', { virtuals: true })
positionSchema.set('toObject', { virtuals: true })

// ADDED: Validation method to check if partylist can add more candidates
positionSchema.methods.validateCandidateLimit = async function(partylistId) {
  const Candidate = require('./Candidate')
  
  const currentCount = await Candidate.countDocuments({
    positionId: this._id,
    partylistId: partylistId,
    ssgElectionId: this.ssgElectionId,
    isActive: true
  })
  
  return {
    canAdd: currentCount < this.maxCandidatesPerPartylist,
    currentCount,
    maxAllowed: this.maxCandidatesPerPartylist,
    remaining: Math.max(0, this.maxCandidatesPerPartylist - currentCount)
  }
}

module.exports = mongoose.model("Position", positionSchema)