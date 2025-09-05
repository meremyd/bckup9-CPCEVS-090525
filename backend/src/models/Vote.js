const mongoose = require("mongoose")

const voteSchema = new mongoose.Schema(
  {
    ballotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ballot",
      required: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    positionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Position",
      required: true,
    },
    voteTimestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Vote", voteSchema)
