const mongoose = require("mongoose")

const partylistSchema = new mongoose.Schema(
  {
    partylistId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    ssgElectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SSGElection",
      required: true,
    },
    partylistName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    logo: {
      type: Buffer,
      default: null,
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

// Compound index to ensure unique partylist per SSG election
partylistSchema.index({ ssgElectionId: 1, partylistName: 1 }, { unique: true })
partylistSchema.index({ partylistId: 1 }, { unique: true })
partylistSchema.index({ ssgElectionId: 1, isActive: 1 })

module.exports = mongoose.model("Partylist", partylistSchema)