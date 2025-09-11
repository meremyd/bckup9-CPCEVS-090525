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

module.exports = mongoose.model("Position", positionSchema)