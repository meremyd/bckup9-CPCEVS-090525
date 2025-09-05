const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
require("dotenv").config()

async function testDirectLogin() {
  try {
    console.log("🔄 Testing direct login simulation...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    const User = require("./src/models/User")

    // Test credentials
    const testCreds = [
      { username: "admin", password: "admin123" },
      { username: "committee1", password: "committee123" },
      { username: "sao", password: "sao123" },
    ]

    for (const cred of testCreds) {
      console.log(`\n🧪 Testing login for: ${cred.username}`)

      // Find user
      const user = await User.findOne({ username: cred.username.trim(), isActive: true })

      if (!user) {
        console.log(`❌ User not found: ${cred.username}`)
        continue
      }

      console.log(`✅ User found: ${user.username} (${user.userType})`)

      // Test password
      const isMatch = await bcrypt.compare(cred.password, user.passwordHash)
      console.log(`🔐 Password match: ${isMatch}`)

      if (isMatch) {
        console.log(`🎉 LOGIN WOULD SUCCEED for ${cred.username}`)
      } else {
        console.log(`❌ LOGIN WOULD FAIL for ${cred.username}`)
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error)
  } finally {
    await mongoose.connection.close()
    console.log("🔌 Database connection closed")
  }
}

testDirectLogin()
