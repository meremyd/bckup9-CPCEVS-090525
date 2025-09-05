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
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Candidate", candidateSchema)
