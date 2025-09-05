const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function fixAllUsers() {
  try {
    console.log("🔄 Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    const User = require("../models/User")

    // Users to create/fix
    const usersToFix = [
      {
        username: "admin",
        userType: "admin",
        password: "admin123",
        isActive: true,
      },
      {
        username: "committee1",
        userType: "election_committee",
        password: "committee123",
        isActive: true,
      },
      {
        username: "sao",
        userType: "sao",
        password: "sao123",
        isActive: true,
      },
    ]

    console.log("🔧 Fixing all users...")

    for (const userData of usersToFix) {
      // Delete existing user if exists
      await User.deleteOne({ username: userData.username })
      console.log(`🗑️ Deleted existing user: ${userData.username}`)

      // Hash password manually
      const hashedPassword = await bcrypt.hash(userData.password, 12)

      // Create new user with hashed password
      const user = await User.create({
        username: userData.username,
        userType: userData.userType,
        passwordHash: hashedPassword, // Use hashed password directly
        isActive: userData.isActive,
      })

      console.log(`✅ Created user: ${user.username} (${user.userType})`)

      // Test the password immediately
      const testResult = await bcrypt.compare(userData.password, user.passwordHash)
      console.log(`🧪 Password test for ${user.username}: ${testResult}`)
      console.log("")
    }

    // Show final users
    const finalUsers = await User.find({}, "username userType isActive")
    console.log("📋 Final users in database:")
    finalUsers.forEach((user) => {
      console.log(`   - ${user.username} (${user.userType}) - ${user.isActive ? "Active" : "Inactive"}`)
    })

    console.log("\n🔑 Login credentials:")
    console.log("Admin: admin / admin123")
    console.log("Election Committee: committee1 / committee123")
    console.log("SAO: sao / sao123")
  } catch (error) {
    console.error("❌ Error fixing users:", error)
  } finally {
    await mongoose.connection.close()
    console.log("🔌 Database connection closed")
  }
}

fixAllUsers()
