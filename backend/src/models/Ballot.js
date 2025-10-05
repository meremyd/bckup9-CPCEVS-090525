const mongoose = require("mongoose")

const ballotSchema = new mongoose.Schema(
  {
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
    currentPositionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Position",
      default: null, // Only used for departmental elections
    },
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voter",
      required: true,
    },
    ballotToken: {
      type: String,
      required: true,
      unique: true,
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    ballotOpenTime: {
      type: Date,
      default: null,
      index: true
    },
    ballotCloseTime: {
      type: Date,
      default: null,
      index: true
    },
    ballotDuration: {
      type: Number,
      default: 10, 
      min: 5,
      max: 180 
    },
    timerStarted: {
      type: Boolean,
      default: false
    },
    timerStartedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
  },
)

// Virtual for checking if ballot is expired
ballotSchema.virtual('isExpired').get(function() {
  if (!this.ballotCloseTime) return false
  return new Date() > this.ballotCloseTime
})

// Virtual for time remaining in minutes
ballotSchema.virtual('timeRemaining').get(function() {
  if (!this.ballotCloseTime || this.isExpired) return 0
  const now = new Date()
  const remaining = Math.max(0, Math.floor((this.ballotCloseTime - now) / (1000 * 60)))
  return remaining
})

// Virtual for ballot status
ballotSchema.virtual('ballotStatus').get(function() {
  if (this.isSubmitted) return 'submitted'
  if (!this.timerStarted) return 'not_started'
  if (this.isExpired) return 'expired'
  return 'active'
})

// Instance method to start ballot timer
ballotSchema.methods.startTimer = function(durationMinutes = null) {
  if (this.timerStarted) {
    throw new Error('Ballot timer has already been started')
  }

  const duration = durationMinutes || this.ballotDuration || 10
  const now = new Date()

  this.timerStarted = true
  this.timerStartedAt = now
  this.ballotOpenTime = now
  this.ballotCloseTime = new Date(now.getTime() + (duration * 60 * 1000))
  this.ballotDuration = duration

  return this.save()
}

// Instance method to extend ballot timer
ballotSchema.methods.extendTimer = function(additionalMinutes) {
  if (!this.timerStarted || this.isSubmitted) {
    throw new Error('Cannot extend timer for unstarted or submitted ballot')
  }

  const newCloseTime = new Date(this.ballotCloseTime.getTime() + (additionalMinutes * 60 * 1000))
  this.ballotCloseTime = newCloseTime
  this.ballotDuration += additionalMinutes

  return this.save()
}

// Instance method to check if ballot can be accessed
ballotSchema.methods.canBeAccessed = function() {
  if (this.isSubmitted) return { canAccess: false, reason: 'Ballot already submitted' }
  if (!this.timerStarted) return { canAccess: true, reason: 'Timer not started yet' }
  if (this.isExpired) return { canAccess: false, reason: 'Ballot timer expired' }
  return { canAccess: true, reason: 'Ballot is active' }
}

// Static method to cleanup expired ballots
ballotSchema.statics.cleanupExpiredBallots = async function() {
  const expiredBallots = await this.find({
    isSubmitted: false,
    ballotCloseTime: { $lt: new Date() },
    timerStarted: true
  })

  // Delete votes from expired ballots
  const Vote = require('./Vote')
  for (const ballot of expiredBallots) {
    await Vote.deleteMany({ ballotId: ballot._id })
  }

  // Delete expired ballots
  const deleteResult = await this.deleteMany({
    isSubmitted: false,
    ballotCloseTime: { $lt: new Date() },
    timerStarted: true
  })

  return {
    expiredBallots: expiredBallots.length,
    deletedBallots: deleteResult.deletedCount
  }
}


// ballotSchema.index({ voterId: 1, deptElectionId: 1 }, { unique: true, sparse: true })
// ballotSchema.index({ voterId: 1, ssgElectionId: 1 }, { unique: true, sparse: true })
ballotSchema.index({ deptElectionId: 1, isSubmitted: 1 })
ballotSchema.index({ ssgElectionId: 1, isSubmitted: 1 })
ballotSchema.index({ ballotCloseTime: 1, isSubmitted: 1 }) 
ballotSchema.index({ timerStarted: 1, ballotOpenTime: 1 }) 
ballotSchema.index({ ballotToken: 1 }, { unique: true })
ballotSchema.index(
  { voterId: 1, deptElectionId: 1 },
  { 
    unique: true, 
    partialFilterExpression: { deptElectionId: { $type: 'objectId' } },
    name: 'voterId_1_deptElectionId_1'
  }
)
ballotSchema.index(
  { voterId: 1, ssgElectionId: 1 },
  { 
    unique: true, 
    partialFilterExpression: { ssgElectionId: { $type: 'objectId' } },
    name: 'voterId_1_ssgElectionId_1'
  }
)

// Ensure virtual fields are serialized
ballotSchema.set('toJSON', { virtuals: true })
ballotSchema.set('toObject', { virtuals: true })

module.exports = mongoose.model("Ballot", ballotSchema)