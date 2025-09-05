const mongoose = require("mongoose")

const chatSupportSchema = new mongoose.Schema(
  {
    idNumber: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    course: {
      type: String,
      required: true,
      enum: ["BSIT", "BSED", "BEED", "BSHM"],
      trim: true,
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
chatSupportSchema.index({ idNumber: 1 })
chatSupportSchema.index({ course: 1 })

module.exports = mongoose.model("ChatSupport", chatSupportSchema)
