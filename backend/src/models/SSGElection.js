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
    ballotDuration: {
      type: Number,
      default: 10,
      min: 5,
      max: 180,
      validate: {
        validator: function(v) {
          return Number.isInteger(v) && v >= 5 && v <= 180;
        },
        message: 'Ballot duration must be an integer between 5 and 180 minutes'
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

//  Method to calculate automatic status based on dates and times**
ssgElectionSchema.methods.calculateAutomaticStatus = function() {
  // Don't override cancelled status
  if (this.status === 'cancelled') {
    return 'cancelled';
  }

  if (!this.electionDate) return 'upcoming';
  
  const now = new Date();
  const electionDate = new Date(this.electionDate);
  
  // Set times to start of day for comparison
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const elecDateStart = new Date(electionDate.getFullYear(), electionDate.getMonth(), electionDate.getDate());
  
  // Before election date
  if (todayStart < elecDateStart) {
    return 'upcoming';
  }
  
  // On election date
  if (todayStart.getTime() === elecDateStart.getTime()) {
    // If ballot times are set, check if voting has closed
    if (this.ballotCloseTime) {
      const [closeHours, closeMinutes] = this.ballotCloseTime.split(':').map(Number);
      const closeDateTime = new Date(electionDate);
      closeDateTime.setHours(closeHours, closeMinutes, 0, 0);
      
      // If current time is past close time, mark as completed
      if (now > closeDateTime) {
        return 'completed';
      }
    }
    
    // Otherwise, it's active on election day
    return 'active';
  }
  
  // After election date
  return 'completed';
};

// **NEW: Pre-save hook to automatically set status (except for cancelled)**
ssgElectionSchema.pre('save', function(next) {
  // Validate ballot close time is after open time
  if (this.ballotOpenTime && this.ballotCloseTime) {
    const [openHours, openMinutes] = this.ballotOpenTime.split(':').map(Number);
    const [closeHours, closeMinutes] = this.ballotCloseTime.split(':').map(Number);
    
    const openTimeInMinutes = openHours * 60 + openMinutes;
    const closeTimeInMinutes = closeHours * 60 + closeMinutes;
    
    if (closeTimeInMinutes <= openTimeInMinutes) {
      return next(new Error('Ballot close time must be after ballot open time'));
    }
  }

  // Automatically calculate and set status (unless manually set to cancelled)
  if (this.status !== 'cancelled') {
    this.status = this.calculateAutomaticStatus();
  }

  next();
});

// **NEW: Pre-findOneAndUpdate hook to automatically set status**
ssgElectionSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  
  // Skip if no date/time fields are being updated and status is not being explicitly set
  if (!update.electionDate && !update.ballotOpenTime && !update.ballotCloseTime && !update.$set) {
    return next();
  }

  try {
    // Get the current document
    const docToUpdate = await this.model.findOne(this.getQuery());
    
    if (!docToUpdate) {
      return next();
    }

    // Apply updates to get final values
    const finalElectionDate = update.electionDate || update.$set?.electionDate || docToUpdate.electionDate;
    const finalBallotOpenTime = update.ballotOpenTime !== undefined ? update.ballotOpenTime : 
                                 (update.$set?.ballotOpenTime !== undefined ? update.$set.ballotOpenTime : docToUpdate.ballotOpenTime);
    const finalBallotCloseTime = update.ballotCloseTime !== undefined ? update.ballotCloseTime : 
                                  (update.$set?.ballotCloseTime !== undefined ? update.$set.ballotCloseTime : docToUpdate.ballotCloseTime);

    // Don't override cancelled status unless explicitly changing it
    const currentStatus = update.status || update.$set?.status || docToUpdate.status;
    if (currentStatus === 'cancelled') {
      return next();
    }

    // Create temporary object to calculate status
    const tempDoc = {
      electionDate: finalElectionDate,
      ballotOpenTime: finalBallotOpenTime,
      ballotCloseTime: finalBallotCloseTime,
      status: currentStatus
    };

    // Calculate automatic status
    const calculatedStatus = calculateStatus(tempDoc);

    // Set the calculated status in the update
    if (update.$set) {
      update.$set.status = calculatedStatus;
    } else {
      update.status = calculatedStatus;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Helper function for status calculation (used in pre-update hook)
function calculateStatus(doc) {
  if (doc.status === 'cancelled') {
    return 'cancelled';
  }

  if (!doc.electionDate) return 'upcoming';
  
  const now = new Date();
  const electionDate = new Date(doc.electionDate);
  
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const elecDateStart = new Date(electionDate.getFullYear(), electionDate.getMonth(), electionDate.getDate());
  
  if (todayStart < elecDateStart) {
    return 'upcoming';
  }
  
  if (todayStart.getTime() === elecDateStart.getTime()) {
    if (doc.ballotCloseTime) {
      const [closeHours, closeMinutes] = doc.ballotCloseTime.split(':').map(Number);
      const closeDateTime = new Date(electionDate);
      closeDateTime.setHours(closeHours, closeMinutes, 0, 0);
      
      if (now > closeDateTime) {
        return 'completed';
      }
    }
    
    return 'active';
  }
  
  return 'completed';
}

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