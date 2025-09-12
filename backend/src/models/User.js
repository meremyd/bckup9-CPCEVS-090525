const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      enum: ["admin", "election_committee", "sao"], 
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { 
    timestamps: true,
    collection: 'users'
  }
)

userSchema.pre('save', async function(next) {

  if (!this.isModified('passwordHash')) {
    return next();
  }
  
  try {

    if (this.passwordHash && this.passwordHash.match(/^\$2[aby]\$\d{1,2}\$.{53}$/)) {
      return next();
    }
    
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (password) {
  try {
    if (!this.passwordHash) {
      console.log("❌ No password hash stored for user")
      return false
    }
    return await bcrypt.compare(password, this.passwordHash)
  } catch (error) {
    console.error("❌ Password comparison error:", error)
    return false
  }
}

userSchema.statics.createWithPassword = async function(userData) {
  const { password, ...otherData } = userData;
  
  if (!password) {
    throw new Error('Password is required');
  }
  
  const user = new this({
    ...otherData,
    passwordHash: password 
  });
  
  await user.save();
  return user;
}

// Method to update password
userSchema.methods.updatePassword = async function(newPassword) {
  this.passwordHash = newPassword; // Will be hashed by pre-save hook
  await this.save();
}

module.exports = mongoose.model("User", userSchema)