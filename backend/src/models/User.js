const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      enum: ["admin", "election_committee", "sao", "voter"],
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
  { timestamps: true },
)

// Password comparison method
userSchema.methods.comparePassword = async function (password) {
  try {
    console.log("🔐 Comparing password for user:", this.username)
    console.log("🔐 Input password:", password)
    console.log("🔐 Stored hash exists:", !!this.passwordHash)
    console.log("🔐 Hash length:", this.passwordHash ? this.passwordHash.length : 0)

    if (!this.passwordHash) {
      console.log("❌ No password hash stored for user")
      return false
    }

    const result = await bcrypt.compare(password, this.passwordHash)
    console.log("🔐 Comparison result:", result)

    return result
  } catch (error) {
    console.error("❌ Password comparison error:", error)
    return false
  }
}

// REMOVE the pre-save middleware that was causing issues
// We'll hash passwords manually in the scripts

module.exports = mongoose.model("User", userSchema)
