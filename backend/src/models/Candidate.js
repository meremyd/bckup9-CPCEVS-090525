const mongoose = require("mongoose")

const candidateSchema = new mongoose.Schema(
  {
    candidateId: {
      type: String,
      required: true,
      unique: true,
    },
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Election",
      required: true,
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
candidateSchema.index({ electionId: 1, positionId: 1, candidateNumber: 1 }, { unique: true })
candidateSchema.index({ electionId: 1, voterId: 1 }, { unique: true })

module.exports = mongoose.model("Candidate", candidateSchema)