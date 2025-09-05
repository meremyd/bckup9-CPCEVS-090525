// Create this file in your backend root to test the login directly
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
require("dotenv").config()

async function testLogin() {
  try {
    console.log("🔄 Connecting to MongoDB...")
    console.log("📍 MongoDB URI:", process.env.MONGODB_URI ? "Found" : "Not found")

    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    // Import User model
    const User = require("./src/models/User")

    // Find admin user
    console.log("🔍 Looking for admin user...")
    const adminUser = await User.findOne({ username: "admin" })

    if (!adminUser) {
      console.log("❌ Admin user not found!")
      console.log("📋 Available users:")
      const allUsers = await User.find({}, "username userType isActive")
      console.log(allUsers)
      return
    }

    console.log("✅ Admin user found:")
    console.log("- Username:", adminUser.username)
    console.log("- User Type:", adminUser.userType)
    console.log("- Is Active:", adminUser.isActive)
    console.log("- Password Hash:", adminUser.passwordHash)
    console.log("- Hash Length:", adminUser.passwordHash.length)

    // Test password comparison
    console.log("\n🧪 Testing password comparison...")
    const testPassword = "admin123"

    // Direct bcrypt comparison
    const directResult = await bcrypt.compare(testPassword, adminUser.passwordHash)
    console.log("Direct bcrypt.compare result:", directResult)

    // Using model method
    const modelResult = await adminUser.comparePassword(testPassword)
    console.log("Model comparePassword result:", modelResult)

    if (directResult && modelResult) {
      console.log("🎉 Password is working correctly!")
    } else {
      console.log("❌ Password comparison failed")

      // Try to fix the password
      console.log("🔧 Attempting to fix password...")
      const newHash = await bcrypt.hash(testPassword, 12)
      await User.updateOne({ username: "admin" }, { passwordHash: newHash })
      console.log("✅ Password updated. Try logging in again.")
    }
  } catch (error) {
    console.error("❌ Test failed:", error)
  } finally {
    await mongoose.connection.close()
    console.log("🔌 Database connection closed")
  }
}

testLogin()
