const mongoose = require("mongoose")

const ballotSchema = new mongoose.Schema(
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
    currentPositionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Position",
      default: null, // Only used for departmental elections
    },
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voter",
      required: true,
    },
    ballotToken: {
      type: String,
      required: true,
      unique: true,
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Compound index to ensure unique ballot per voter per position in departmental elections
ballotSchema.index({ deptElectionId: 1, voterId: 1, currentPositionId: 1 }, { unique: true, sparse: true })
// Index for SSG elections (one ballot per voter per election)
ballotSchema.index({ ssgElectionId: 1, voterId: 1 }, { unique: true, sparse: true })
module.exports = mongoose.model("Ballot", ballotSchema)
