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
    ballotOpenTime: {
      type: String, 
      default: null,
      validate: {
        validator: function(v) {
          if (!v) return true;
         
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Ballot open time must be in HH:MM format (24-hour)'
      }
    },
    ballotCloseTime: {
      type: String, 
      default: null,
      validate: {
        validator: function(v) {
          if (!v) return true; 
         
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Ballot close time must be in HH:MM format (24-hour)'
      }
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

// Virtual for getting ballot open datetime by combining election date and open time
ssgElectionSchema.virtual('ballotOpenDateTime').get(function() {
  if (!this.ballotOpenTime || !this.electionDate) return null;
  
  const electionDate = new Date(this.electionDate);
  const [hours, minutes] = this.ballotOpenTime.split(':').map(Number);
  
  const openDateTime = new Date(electionDate);
  openDateTime.setHours(hours, minutes, 0, 0);
  
  return openDateTime;
});

// Virtual for getting ballot close datetime by combining election date and close time
ssgElectionSchema.virtual('ballotCloseDateTime').get(function() {
  if (!this.ballotCloseTime || !this.electionDate) return null;
  
  const electionDate = new Date(this.electionDate);
  const [hours, minutes] = this.ballotCloseTime.split(':').map(Number);
  
  const closeDateTime = new Date(electionDate);
  closeDateTime.setHours(hours, minutes, 0, 0);
  
  return closeDateTime;
});

// Virtual for checking if ballots are currently open
ssgElectionSchema.virtual('ballotsAreOpen').get(function() {
  const openDateTime = this.ballotOpenDateTime;
  const closeDateTime = this.ballotCloseDateTime;
  
  if (!openDateTime || !closeDateTime) return false;
  
  const now = new Date();
  return now >= openDateTime && now <= closeDateTime;
});

// Virtual for ballot status
ssgElectionSchema.virtual('ballotStatus').get(function() {
  const openDateTime = this.ballotOpenDateTime;
  const closeDateTime = this.ballotCloseDateTime;
  
  if (!openDateTime || !closeDateTime) return 'not_scheduled';
  
  const now = new Date();
  if (now < openDateTime) return 'scheduled';
  if (now > closeDateTime) return 'closed';
  return 'open';
});

// Pre-save validation to ensure ballot close time is after open time
ssgElectionSchema.pre('save', function(next) {
  if (this.ballotOpenTime && this.ballotCloseTime) {
    const [openHours, openMinutes] = this.ballotOpenTime.split(':').map(Number);
    const [closeHours, closeMinutes] = this.ballotCloseTime.split(':').map(Number);
    
    const openTimeInMinutes = openHours * 60 + openMinutes;
    const closeTimeInMinutes = closeHours * 60 + closeMinutes;
    
    if (closeTimeInMinutes <= openTimeInMinutes) {
      return next(new Error('Ballot close time must be after ballot open time'));
    }
  }
  next();
});

// Instance method to check if voting is currently allowed
ssgElectionSchema.methods.isVotingAllowed = function() {
  return this.status === 'active' && this.ballotsAreOpen;
};

// Instance method to get ballot time info
ssgElectionSchema.methods.getBallotTimeInfo = function() {
  return {
    openTime: this.ballotOpenTime,
    closeTime: this.ballotCloseTime,
    openDateTime: this.ballotOpenDateTime,
    closeDateTime: this.ballotCloseDateTime,
    status: this.ballotStatus,
    isOpen: this.ballotsAreOpen
  };
};

// Ensure virtual fields are serialized
ssgElectionSchema.set('toJSON', { virtuals: true })
ssgElectionSchema.set('toObject', { virtuals: true })

module.exports = mongoose.model("SSGElection", ssgElectionSchema)