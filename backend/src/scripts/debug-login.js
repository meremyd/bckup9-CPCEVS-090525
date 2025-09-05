const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function debugLogin() {
  try {
    console.log("🔄 Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    const User = require("../models/User")

    // Check all users
    const allUsers = await User.find({})
    console.log("\n📋 All users in database:")
    allUsers.forEach((user) => {
      console.log(`   - Username: ${user.username}`)
      console.log(`   - User Type: ${user.userType}`)
      console.log(`   - Is Active: ${user.isActive}`)
      console.log(`   - Password Hash: ${user.passwordHash}`)
      console.log(`   - Hash Length: ${user.passwordHash ? user.passwordHash.length : 0}`)
      console.log("")
    })

    // Test password for each user
    console.log("🧪 Testing passwords:")

    const testCredentials = [
      { username: "admin", password: "admin123" },
      { username: "committee1", password: "committee123" },
      { username: "sao", password: "sao123" },
    ]

    for (const cred of testCredentials) {
      const user = await User.findOne({ username: cred.username })
      if (user) {
        const directResult = await bcrypt.compare(cred.password, user.passwordHash)
        const modelResult = await user.comparePassword(cred.password)

        console.log(`${cred.username}:`)
        console.log(`   - Direct bcrypt: ${directResult}`)
        console.log(`   - Model method: ${modelResult}`)
        console.log(`   - Should work: ${directResult && modelResult}`)
        console.log("")
      } else {
        console.log(`${cred.username}: USER NOT FOUND`)
        console.log("")
      }
    }
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await mongoose.connection.close()
    console.log("🔌 Database connection closed")
  }
}

debugLogin()
