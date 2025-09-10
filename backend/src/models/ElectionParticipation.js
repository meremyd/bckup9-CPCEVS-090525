const mongoose = require("mongoose")

const electionParticipationSchema = new mongoose.Schema(
  {
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voter",
      required: true,
    },
    deptElectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DepartmentalElection",
      default: null,
    },
    ssgElectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SSGElection",
      default: null,
    },
    confirmedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    hasVoted: {
      type: Boolean,
      default: false,
    },
    votedAt: {
      type: Date,
      default: null,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    eligibilityCheckedAt: {
      type: Date,
      default: null,
    },
    departmentRestriction: {
      type: String,
      default: null, // Only students from specific department can participate (e.g., "Computer Science", "Engineering")
    },
    status: {
      type: String,
      enum: ["confirmed", "voted", "withdrawn"],
      default: "confirmed",
    },
  },
  {
    timestamps: true,
  }
)

// Compound index to ensure a voter can only confirm once per election
electionParticipationSchema.index({ voterId: 1, deptElectionId: 1 }, { unique: true, sparse: true })
electionParticipationSchema.index({ voterId: 1, ssgElectionId: 1 }, { unique: true, sparse: true })

// Indexes for better query performance
electionParticipationSchema.index({ deptElectionId: 1, status: 1 })
electionParticipationSchema.index({ ssgElectionId: 1, status: 1 })
electionParticipationSchema.index({ voterId: 1 })
electionParticipationSchema.index({ confirmedAt: 1 })
electionParticipationSchema.index({ hasVoted: 1 })
electionParticipationSchema.index({ departmentRestriction: 1 })
electionParticipationSchema.index({ departmentId: 1 })

// Method to mark as voted
electionParticipationSchema.methods.markAsVoted = function() {
  this.hasVoted = true
  this.votedAt = new Date()
  this.status = "voted"
  return this.save()
}

// Method to withdraw participation
electionParticipationSchema.methods.withdraw = function() {
  this.status = "withdrawn"
  return this.save()
}

// Static method to get participation stats for an election
electionParticipationSchema.statics.getElectionStats = async function(electionId, electionType) {
  const matchCondition = electionType === 'departmental' 
    ? { deptElectionId: new mongoose.Types.ObjectId(electionId) }
    : { ssgElectionId: new mongoose.Types.ObjectId(electionId) }
    
  const stats = await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalConfirmed: { $sum: 1 },
        totalVoted: { $sum: { $cond: ["$hasVoted", 1, 0] } },
        totalWithdrawn: { $sum: { $cond: [{ $eq: ["$status", "withdrawn"] }, 1, 0] } },
        confirmedButNotVoted: { 
          $sum: { 
            $cond: [
              { $and: [{ $eq: ["$hasVoted", false] }, { $ne: ["$status", "withdrawn"] }] }, 
              1, 
              0 
            ] 
          } 
        }
      }
    }
  ])
  
  return stats[0] || {
    totalConfirmed: 0,
    totalVoted: 0,
    totalWithdrawn: 0,
    confirmedButNotVoted: 0
  }
}

// Static method to get participation stats by department
electionParticipationSchema.statics.getElectionStatsByDepartment = async function(electionId, electionType) {
  const matchCondition = electionType === 'departmental' 
    ? { deptElectionId: new mongoose.Types.ObjectId(electionId) }
    : { ssgElectionId: new mongoose.Types.ObjectId(electionId) }
    
  const stats = await this.aggregate([
    { $match: matchCondition },
    {
      $lookup: {
        from: 'voters',
        localField: 'voterId',
        foreignField: '_id',
        as: 'voter'
      }
    },
    { $unwind: '$voter' },
    {
      $lookup: {
        from: 'degrees',
        localField: 'voter.degreeId',
        foreignField: '_id',
        as: 'voter.degree'
      }
    },
    { $unwind: { path: '$voter.degree', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$voter.degree.department',
        totalConfirmed: { $sum: 1 },
        totalVoted: { $sum: { $cond: ["$hasVoted", 1, 0] } },
        confirmedButNotVoted: { 
          $sum: { 
            $cond: [
              { $and: [{ $eq: ["$hasVoted", false] }, { $ne: ["$status", "withdrawn"] }] }, 
              1, 
              0 
            ] 
          } 
        }
      }
    },
    { $sort: { '_id': 1 } }
  ])
  
  return stats
}

// Static method to get voter's participation history
electionParticipationSchema.statics.getVoterHistory = async function(voterId) {
  return await this.find({ voterId })
    .populate('electionId', 'title electionYear electionType electionDate status')
    .sort({ confirmedAt: -1 })
}

module.exports = mongoose.model("ElectionParticipation", electionParticipationSchema)