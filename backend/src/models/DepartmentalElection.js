const mongoose = require("mongoose")

const departmentalElectionSchema = new mongoose.Schema(
  {
    deptElectionId: {
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
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
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
departmentalElectionSchema.index({ departmentId: 1, status: 1 })
departmentalElectionSchema.index({ electionDate: 1 })
departmentalElectionSchema.index({ electionYear: 1 })
departmentalElectionSchema.index({ departmentId: 1 })

module.exports = mongoose.model("DepartmentalElection", departmentalElectionSchema)