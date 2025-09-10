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
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    birthday: {
      type: Date,
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
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "closed"],
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
  next()
})

module.exports = mongoose.model("ChatSupport", chatSupportSchema)