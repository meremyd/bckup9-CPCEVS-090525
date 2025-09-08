const mongoose = require("mongoose")

const electionSchema = new mongoose.Schema(
  {
    electionId: {
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
    electionType: {
      type: String,
      enum: ["departmental", "ssg"],
      required: true,
    },
    department: {
      type: String,
      default: null,
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
    ballotOpenTime: {
      type: String,
      required: true,
    },
    ballotCloseTime: {
      type: String,
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
electionSchema.index({ electionType: 1, status: 1 })
electionSchema.index({ electionDate: 1 })

module.exports = mongoose.model("Election", electionSchema)