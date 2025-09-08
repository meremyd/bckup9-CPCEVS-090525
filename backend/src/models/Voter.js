const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const voterSchema = new mongoose.Schema(
  {
    schoolId: {
      type: Number, // Keep as Number for consistency
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    middleName: {
      type: String,
      default: null,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    birthdate: {
      type: Date,
      required: true,
    },
    degreeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Degree",
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      default: null,
    },
    faceEncoding: {
      type: String,
      default: null,
    },
    profilePicture: {
      type: Buffer,
      default: null,
    },
    // Merged fields from VoterStatus
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

// Indexes for better query performance
voterSchema.index({ schoolId: 1 })
voterSchema.index({ email: 1 })
voterSchema.index({ degreeId: 1 })
voterSchema.index({ isRegistered: 1 })

// Simplified password handling - only hash when password is modified and not already hashed
voterSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    if (this.password) {
      // Auto-update registration status
      this.isRegistered = true;
      this.passwordCreatedAt = new Date();
      this.passwordExpiresAt = new Date(Date.now() + 10 * 30 * 24 * 60 * 60 * 1000); // 10 months
      this.isPasswordActive = true;
      
      // Only hash if password doesn't look like a bcrypt hash
      if (!this.password.match(/^\$2[aby]\$\d{1,2}\$.{53}$/)) {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
      }
    } else {
      // Clear registration when password is removed
      this.isRegistered = false;
      this.passwordCreatedAt = null;
      this.passwordExpiresAt = null;
      this.isPasswordActive = false;
    }
  }
  next();
});

// Methods from VoterStatus
voterSchema.methods.isPasswordExpired = function () {
  if (!this.passwordExpiresAt) return false
  return new Date() > this.passwordExpiresAt
}

voterSchema.methods.setPasswordExpiration = function () {
  this.passwordCreatedAt = new Date()
  this.passwordExpiresAt = new Date(Date.now() + 10 * 30 * 24 * 60 * 60 * 1000) // 10 months
  this.isPasswordActive = true
}

// Method to compare password
voterSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
}

// Virtual for full name
voterSchema.virtual('fullName').get(function() {
  const middle = this.middleName ? ` ${this.middleName}` : '';
  return `${this.firstName}${middle} ${this.lastName}`;
});

module.exports = mongoose.model("Voter", voterSchema)