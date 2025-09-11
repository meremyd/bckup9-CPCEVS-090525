const mongoose = require("mongoose")

const ssgElectionSchema = new mongoose.Schema(
  {
    ssgElectionId: {
      type: String,
      required: true,
      unique: true,
    },
    electionYear: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["upcoming", "active", "completed", "cancelled"],
      default: "upcoming",
    },
    electionDate: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    totalVotes: {
      type: Number,
      default: 0,
    },
    voterTurnout: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better query performance
ssgElectionSchema.index({ status: 1 })
ssgElectionSchema.index({ electionDate: 1 })
ssgElectionSchema.index({ electionYear: 1 })

module.exports = mongoose.model("SSGElection", ssgElectionSchema)