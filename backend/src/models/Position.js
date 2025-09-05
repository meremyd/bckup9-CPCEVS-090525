const mongoose = require("mongoose")

const positionSchema = new mongoose.Schema(
  {
    positionId: {
      type: String,
      required: true,
      unique: true,
    },
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Election",
      required: true,
    },
    positionName: {
      type: String,
      required: true,
    },
    positionOrder: {
      type: Number,
      default: 1,
    },
    maxVotes: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Position", positionSchema)
