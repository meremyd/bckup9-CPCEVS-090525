const mongoose = require("mongoose")

const positionSchema = new mongoose.Schema(
  {
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Election",
      required: true,
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
    description: {
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

// Compound index to ensure unique position per election
positionSchema.index({ electionId: 1, positionName: 1 }, { unique: true })
positionSchema.index({ electionId: 1, positionOrder: 1 })

module.exports = mongoose.model("Position", positionSchema)