const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const path = require("path")

// Fix the .env path - go up two levels from src/scripts/ to reach the root
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function fixAdminPassword() {
  try {
    console.log("🔄 Connecting to MongoDB...")
    console.log("📍 MongoDB URI:", process.env.MONGODB_URI ? "Found" : "Not found")

    if (!process.env.MONGODB_URI) {
      console.log("❌ MONGODB_URI not found in environment variables")
      console.log("📁 Looking for .env file at:", path.join(__dirname, "../../.env"))
      return
    }

    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    // Import your existing User model
    const User = require("../models/User")

    // Find admin user
    const adminUser = await User.findOne({ username: "admin" })

    if (!adminUser) {
      console.log("❌ Admin user not found")
      return
    }

    console.log("👤 Found admin user:", adminUser.username)
    console.log("🔐 Current hash:", adminUser.passwordHash)

    // Test current password
    const currentPasswordWorks = await bcrypt.compare("admin123", adminUser.passwordHash)
    console.log("🧪 Current password test:", currentPasswordWorks)

    // No need to update if the password is already working
    if (currentPasswordWorks) {
      console.log("✅ Password is already working! Try logging in with:")
      console.log("Username: admin")
      console.log("Password: admin123")
      return
    }

    console.log("🔧 Fixing password...")

    // Hash the password manually
    const plainPassword = "admin123"
    const hashedPassword = await bcrypt.hash(plainPassword, 12)

    console.log("🔐 New hash:", hashedPassword)

    // Update the password directly in database
    await User.updateOne({ username: "admin" }, { passwordHash: hashedPassword })

    console.log("✅ Admin password updated successfully!")

    // Test the new password
    const updatedUser = await User.findOne({ username: "admin" })
    const newPasswordWorks = await bcrypt.compare(plainPassword, updatedUser.passwordHash)
    console.log("🧪 New password test:", newPasswordWorks)

    if (newPasswordWorks) {
      console.log("🎉 Password fix successful! You can now login with:")
      console.log("Username: admin")
      console.log("Password: admin123")
    } else {
      console.log("❌ Password fix failed")
    }
  } catch (error) {
    console.error("❌ Error fixing password:", error)
  } finally {
    await mongoose.connection.close()
    console.log("🔌 Database connection closed")
  }
}

fixAdminPassword()
