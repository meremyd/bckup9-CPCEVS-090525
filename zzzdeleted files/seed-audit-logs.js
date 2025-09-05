const mongoose = require("mongoose")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function seedAuditLogs() {
  try {
    console.log("🔄 Connecting to MongoDB...")
    console.log("📍 MongoDB URI:", process.env.MONGODB_URI ? "Found" : "Not found")
    console.log("📁 Looking for .env file at:", path.join(__dirname, "../../.env"))

    if (!process.env.MONGODB_URI) {
      console.log("❌ MONGODB_URI not found in environment variables")
      return
    }

    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    const AuditLog = require("../models/AuditLog")

    // Check if audit logs already exist
    const existingLogs = await AuditLog.countDocuments()
    if (existingLogs > 0) {
      console.log("📋 Audit logs already exist, skipping seed")
      return
    }

    const sampleLogs = [
      {
        action: "LOGIN",
        username: "admin",
        details: "Admin user logged in successfully",
        ipAddress: "192.168.1.100",
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      },
      {
        action: "CREATE_VOTER",
        username: "admin",
        details: "Created new voter: John Doe (ID: 2021001)",
        ipAddress: "192.168.1.100",
        timestamp: new Date(Date.now() - 1000 * 60 * 25), // 25 minutes ago
      },
      {
        action: "UPDATE_VOTER",
        username: "admin",
        details: "Updated voter information for Jane Smith (ID: 2021002)",
        ipAddress: "192.168.1.100",
        timestamp: new Date(Date.now() - 1000 * 60 * 20), // 20 minutes ago
      },
      {
        action: "CREATE_USER",
        username: "admin",
        details: "Created new user: committee1 (election_committee)",
        ipAddress: "192.168.1.100",
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      },
      {
        action: "VOTER_REGISTRATION",
        username: "system",
        details: "New voter completed registration: Alice Johnson",
        ipAddress: "192.168.1.150",
        timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
      },
      {
        action: "LOGIN",
        username: "committee1",
        details: "Election committee member logged in",
        ipAddress: "192.168.1.105",
        timestamp: new Date(Date.now() - 1000 * 60 * 8), // 8 minutes ago
      },
      {
        action: "SYSTEM_ACCESS",
        username: "admin",
        details: "Accessed system configuration settings",
        ipAddress: "192.168.1.100",
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      },
      {
        action: "DELETE_VOTER",
        username: "admin",
        details: "Deleted inactive voter: Bob Wilson (ID: 2020999)",
        ipAddress: "192.168.1.100",
        timestamp: new Date(Date.now() - 1000 * 60 * 3), // 3 minutes ago
      },
      {
        action: "LOGOUT",
        username: "committee1",
        details: "Election committee member logged out",
        ipAddress: "192.168.1.105",
        timestamp: new Date(Date.now() - 1000 * 60 * 2), // 2 minutes ago
      },
      {
        action: "LOGIN",
        username: "admin",
        details: "Admin user logged in successfully",
        ipAddress: "192.168.1.100",
        timestamp: new Date(), // Now
      },
    ]

    console.log("🌱 Seeding audit logs...")
    await AuditLog.insertMany(sampleLogs)
    console.log("✅ Audit logs seeded successfully!")

    console.log("📋 Created audit logs:")
    sampleLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.action} - ${log.username}: ${log.details}`)
    })
  } catch (error) {
    console.error("❌ Error seeding audit logs:", error)
  } finally {
    await mongoose.connection.close()
    console.log("🔌 Database connection closed")
  }
}

seedAuditLogs()
