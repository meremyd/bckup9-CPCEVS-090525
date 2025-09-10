const mongoose = require("mongoose")

const candidateSchema = new mongoose.Schema(
  {
    candidateId: {
      type: String,
      required: true,
      unique: true,
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
    platform: {
      type: String,
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

// Compound index to ensure unique candidate per position per election
candidateSchema.index({ deptElectionId: 1, positionId: 1, candidateNumber: 1 }, { unique: true, sparse: true })
candidateSchema.index({ ssgElectionId: 1, positionId: 1, candidateNumber: 1 }, { unique: true, sparse: true })
candidateSchema.index({ deptElectionId: 1, voterId: 1 }, { unique: true, sparse: true })
candidateSchema.index({ ssgElectionId: 1, voterId: 1 }, { unique: true, sparse: true })

module.exports = mongoose.model("Candidate", candidateSchema)