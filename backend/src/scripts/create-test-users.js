const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function createTestUsers() {
  try {
    console.log("🔄 Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    const User = require("../models/User")

    // Test users to create
    const testUsers = [
      {
        username: "committee1",
        userType: "election_committee",
        passwordHash: "committee123",
        isActive: true,
      },
      {
        username: "sao",
        userType: "sao",
        passwordHash: "sao123",
        isActive: true,
      },
    ]

    console.log("🌱 Creating test users...")

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ username: userData.username })
      if (existingUser) {
        console.log(`⏭️ User ${userData.username} already exists`)
        continue
      }

      // Create user (password will be hashed by pre-save middleware)
      const user = await User.create(userData)
      console.log(`✅ Created user: ${user.username} (${user.userType})`)
    }

    // Show all users
    const allUsers = await User.find({}, "username userType isActive")
    console.log("\n📋 All users in database:")
    allUsers.forEach((user) => {
      console.log(`   - ${user.username} (${user.userType}) - ${user.isActive ? "Active" : "Inactive"}`)
    })

    console.log("\n🔑 Login credentials:")
    console.log("Admin: admin / admin123")
    console.log("Election Committee: committee1 / committee123")
    console.log("SAO: sao / sao123")
  } catch (error) {
    console.error("❌ Error creating test users:", error)
  } finally {
    await mongoose.connection.close()
    console.log("🔌 Database connection closed")
  }
}

createTestUsers()
