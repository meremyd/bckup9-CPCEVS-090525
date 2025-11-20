const mongoose = require("mongoose")

const chatSupportSchema = new mongoose.Schema(
  {
    schoolId: {
      type: Number, // Changed from String to Number to match Voter model
      required: true,
      trim: true,
    },
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voter",
      default: null, // Optional reference to Voter document
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
      default: ''
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    ticketId: {
      type: String,
      trim: true,
      unique: true,
      default: null,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    photo: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "archived"],
      default: "pending",
    },
    response: {
      type: String,
      trim: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Index for efficient queries
chatSupportSchema.index({ status: 1, submittedAt: -1 })
chatSupportSchema.index({ schoolId: 1 })
chatSupportSchema.index({ departmentId: 1 })

// Pre-save hook to auto-populate voterId if not provided
chatSupportSchema.pre('save', async function(next) {
  if (!this.voterId && this.schoolId) {
    try {
      const Voter = mongoose.model('Voter')
      const voter = await Voter.findOne({ schoolId: this.schoolId })
      if (voter) {
        this.voterId = voter._id
      }
    } catch (error) {
      console.log('Could not auto-populate voterId:', error.message)
    }
  }
  // Auto-generate an auto-incrementing ticketId if not set
  if (!this.ticketId) {
    try {
      // Use a dedicated counters collection to atomically increment
      const countersColl = mongoose.connection.collection('counters')
      const result = await countersColl.findOneAndUpdate(
        { _id: 'chatSupportTicket' },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
      )
      const seq = result.value.seq || 1
      // Format: CS-000001, incrementing
      this.ticketId = `CS-${String(seq).padStart(6, '0')}`
    } catch (err) {
      console.error('Failed to generate ticketId:', err.message)
    }
  }
  next()
})

module.exports = mongoose.model("ChatSupport", chatSupportSchema)