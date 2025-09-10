const mongoose = require("mongoose")

const partylistSchema = new mongoose.Schema(
  {
    partylistId: {
      type: String,
      required: true,
      unique: true,
    },
    ssgElectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SSGElection",
      required: true,
    },
    partylistName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    logo: {
      type: Buffer,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Compound index to ensure unique partylist per election
partylistSchema.index({ ssgElectionId: 1, partylistName: 1 }, { unique: true })

module.exports = mongoose.model("Partylist", partylistSchema)