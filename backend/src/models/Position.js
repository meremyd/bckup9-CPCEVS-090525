const mongoose = require("mongoose")

const positionSchema = new mongoose.Schema(
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
    maxCandidates: {
      type: Number,
      default: 10,
      min: 1,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    maxCandidatesPerPartylist: {
      type: Number,
      default: null,  // Allow null for departmental positions
      min: 1,
      validate: {
        validator: function(value) {
          // If this is a departmental election position, maxCandidatesPerPartylist should be null
          if (this.deptElectionId && !this.ssgElectionId) {
            return value === null || value === undefined;
          }
          // If this is an SSG election position, maxCandidatesPerPartylist must be a positive integer
          if (this.ssgElectionId && !this.deptElectionId) {
            return value != null && Number.isInteger(value) && value > 0;
          }
          // Default validation for edge cases
          return value === null || value === undefined || (Number.isInteger(value) && value > 0);
        },
        message: function(props) {
          if (this.deptElectionId && !this.ssgElectionId) {
            return 'Departmental positions should not have maxCandidatesPerPartylist (partylists are only for SSG elections)';
          }
          return 'Maximum candidates per partylist must be a positive integer for SSG positions';
        }
      }
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // BALLOT TIMING FIELDS (Departmental Elections Only)
    ballotOpenTime: {
      type: Date,
      default: null,
      index: true,
      validate: {
        validator: function(value) {
          // Only departmental positions should have ballot timing
          // SSG positions use election-level timing from SSGElection model
          if (this.ssgElectionId && !this.deptElectionId && value !== null) {
            return false; // SSG positions shouldn't use position-level timing
          }
          return true;
        },
        message: 'SSG positions use election-level timing, not position-level timing'
      }
    },
    ballotCloseTime: {
      type: Date,
      default: null,
      index: true,
      validate: {
        validator: function(value) {
          // Only departmental positions should have ballot timing
          if (this.ssgElectionId && !this.deptElectionId && value !== null) {
            return false;
          }
          // If openTime is set, closeTime should be after it
          if (this.ballotOpenTime && value && value <= this.ballotOpenTime) {
            return false;
          }
          return true;
        },
        message: 'Close time must be after open time, and SSG positions should not use position-level timing'
      }
    }
  },
  {
    timestamps: true,
  },
)

// positionSchema.index({ deptElectionId: 1, positionName: 1 }, { unique: true, sparse: true })
// positionSchema.index({ ssgElectionId: 1, positionName: 1 }, { unique: true, sparse: true })
positionSchema.index({ deptElectionId: 1, positionOrder: 1 })
positionSchema.index({ ssgElectionId: 1, positionOrder: 1 })
// Index for checking if ballot is currently open
positionSchema.index({ deptElectionId: 1, ballotOpenTime: 1, ballotCloseTime: 1 })

positionSchema.virtual('electionType').get(function() {
  return this.ssgElectionId ? 'ssg' : 'departmental'
})

// Virtual to check if ballot is currently open for this position (Departmental only)
positionSchema.virtual('isBallotOpen').get(function() {
  // Only applicable for departmental positions
  if (!this.deptElectionId || this.ssgElectionId) {
    return false;
  }
  
  if (!this.ballotOpenTime || !this.ballotCloseTime) {
    return false;
  }
  
  const now = new Date();
  return now >= this.ballotOpenTime && now <= this.ballotCloseTime;
})

// Ensure virtual fields are serialized
positionSchema.set('toJSON', { virtuals: true })
positionSchema.set('toObject', { virtuals: true })

// Pre-validate middleware to set default values based on election type
positionSchema.pre('validate', function(next) {
  // For departmental positions, ensure maxCandidatesPerPartylist is null
  if (this.deptElectionId && !this.ssgElectionId) {
    this.maxCandidatesPerPartylist = null;
  }
  // For SSG positions, set default value if not provided
  else if (this.ssgElectionId && !this.deptElectionId) {
    if (this.maxCandidatesPerPartylist === null || this.maxCandidatesPerPartylist === undefined) {
      this.maxCandidatesPerPartylist = 1; // Default to 1 for SSG positions
    }
    // Ensure SSG positions don't have timing fields set
    if (this.ballotOpenTime !== null || this.ballotCloseTime !== null) {
      this.ballotOpenTime = null;
      this.ballotCloseTime = null;
    }
  }
  next();
});

// ADDED: Validation method to check if partylist can add more candidates
positionSchema.methods.validateCandidateLimit = async function(partylistId) {
  // Only applicable for SSG positions
  if (!this.ssgElectionId || this.deptElectionId) {
    return {
      canAdd: true, // Departmental positions don't have partylist limits
      currentCount: 0,
      maxAllowed: null,
      remaining: null
    };
  }

  const Candidate = require('./Candidate')
  
  const currentCount = await Candidate.countDocuments({
    positionId: this._id,
    partylistId: partylistId,
    ssgElectionId: this.ssgElectionId,
    isActive: true
  })
  
  return {
    canAdd: currentCount < this.maxCandidatesPerPartylist,
    currentCount,
    maxAllowed: this.maxCandidatesPerPartylist,
    remaining: Math.max(0, this.maxCandidatesPerPartylist - currentCount)
  }
}

// Helper method to check if position ballot timing is valid
positionSchema.methods.hasValidBallotTiming = function() {
  // Only for departmental positions
  if (!this.deptElectionId || this.ssgElectionId) {
    return false;
  }
  
  return !!(this.ballotOpenTime && this.ballotCloseTime && 
            this.ballotCloseTime > this.ballotOpenTime);
}

// Helper method to get time remaining until ballot closes (in minutes)
positionSchema.methods.getTimeRemaining = function() {
  if (!this.isBallotOpen) {
    return 0;
  }
  
  const now = new Date();
  const remainingMs = this.ballotCloseTime - now;
  return Math.max(0, Math.floor(remainingMs / (1000 * 60)));
}

module.exports = mongoose.model("Position", positionSchema)