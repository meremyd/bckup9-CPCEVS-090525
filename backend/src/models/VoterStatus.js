const mongoose = require("mongoose")

const voterStatusSchema = new mongoose.Schema(
  {
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voter",
      required: true,
      unique: true,
    },
    schoolId: {
      type: Number,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    middleName: {
      type: String,
      default: null,
    },
    lastName: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isRegistered: {
      type: Boolean,
      default: false,
    },
    isClassOfficer: {
      type: Boolean,
      default: false,
    },
    degreeCode: {
      type: String,
      required: true,
    },
    voterDepartment: {
      type: String,
      required: true,
    },
    passwordCreatedAt: {
      type: Date,
      default: null,
    },
    passwordExpiresAt: {
      type: Date,
      default: null,
    },
    isPasswordActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

voterStatusSchema.methods.isPasswordExpired = function () {
  if (!this.passwordExpiresAt) return false
  return new Date() > this.passwordExpiresAt
}

voterStatusSchema.methods.setPasswordExpiration = function () {
  this.passwordCreatedAt = new Date()
  this.passwordExpiresAt = new Date(Date.now() + 10 * 30 * 24 * 60 * 60 * 1000) // 10 months
  this.isPasswordActive = true
}

module.exports = mongoose.model("VoterStatus", voterStatusSchema)
