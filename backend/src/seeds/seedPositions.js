const mongoose = require("mongoose")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function seedPositions() {
  try {
    console.log("📄 Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    // Import models
    const Position = require("../models/Position")
    const Election = require("../models/Election")

    // Clear existing positions
    console.log("🧹 Clearing existing positions...")
    await Position.deleteMany({})

    // Get existing elections to reference
    const elections = await Election.find({})
    if (elections.length === 0) {
      console.log("⚠️ No elections found. Please seed elections first.")
      return
    }

    console.log(`📋 Found ${elections.length} elections`)

    // Find SSG and Departmental elections based on migrate.js structure
    const ssgElection = elections.find(e => e.electionType === "ssg")
    const deptElection = elections.find(e => e.electionType === "departmental")

    const allPositions = []

    // Create SSG positions (exact same data from migrate.js)
    if (ssgElection) {
      console.log("🏛️ Creating SSG positions...")
      const ssgPositions = await Position.insertMany([
        {
          electionId: ssgElection._id,
          positionName: "President",
          positionOrder: 1,
          maxVotes: 1,
          description: "Head of the Supreme Student Government",
          isActive: true,
        },
        {
          electionId: ssgElection._id,
          positionName: "Vice President",
          positionOrder: 2,
          maxVotes: 1,
          description: "Deputy head of the Supreme Student Government", 
          isActive: true,
        },
        {
          electionId: ssgElection._id,
          positionName: "Secretary",
          positionOrder: 3,
          maxVotes: 1,
          description: "Responsible for documentation and correspondence",
          isActive: true,
        },
        {
          electionId: ssgElection._id,
          positionName: "Treasurer",
          positionOrder: 4,
          maxVotes: 1,
          description: "Manages financial matters",
          isActive: true,
        },
        {
          electionId: ssgElection._id,
          positionName: "Auditor",
          positionOrder: 5,
          maxVotes: 1,
          description: "Reviews financial records and transactions",
          isActive: true,
        },
        {
          electionId: ssgElection._id,
          positionName: "Public Information Officer", 
          positionOrder: 6,
          maxVotes: 1,
          description: "Handles public relations and communications",
          isActive: true,
        },
        {
          electionId: ssgElection._id,
          positionName: "Senator",
          positionOrder: 7,
          maxVotes: 12,
          description: "Legislative body members",
          isActive: true,
        },
      ])
      allPositions.push(...ssgPositions)
      console.log(`✅ Created ${ssgPositions.length} SSG positions`)
    }

    // Create Departmental positions (exact same data from migrate.js)
    if (deptElection) {
      console.log("🏛️ Creating Departmental positions...")
      const deptPositions = await Position.insertMany([
        {
          electionId: deptElection._id,
          positionName: "Governor",
          positionOrder: 1,
          maxVotes: 1,
          description: "Head of the departmental student government",
          isActive: true,
        },
        {
          electionId: deptElection._id,
          positionName: "Vice Governor", 
          positionOrder: 2,
          maxVotes: 1,
          description: "Deputy head of the departmental student government",
          isActive: true,
        },
        {
          electionId: deptElection._id,
          positionName: "Secretary",
          positionOrder: 3,
          maxVotes: 1,
          description: "Handles documentation for the department",
          isActive: true,
        },
        {
          electionId: deptElection._id,
          positionName: "Treasurer",
          positionOrder: 4,
          maxVotes: 1,
          description: "Manages departmental funds",
          isActive: true,
        },
        {
          electionId: deptElection._id,
          positionName: "Auditor",
          positionOrder: 5,
          maxVotes: 1,
          description: "Reviews departmental financial records",
          isActive: true,
        },
        {
          electionId: deptElection._id,
          positionName: "Public Information Officer",
          positionOrder: 6,
          maxVotes: 1,
          description: "Manages departmental communications",
          isActive: true,
        },
        {
          electionId: deptElection._id,
          positionName: "1st Year Representative",
          positionOrder: 7,
          maxVotes: 1,
          description: "Represents first year students",
          isActive: true,
        },
        {
          electionId: deptElection._id,
          positionName: "2nd Year Representative",
          positionOrder: 8,
          maxVotes: 1,
          description: "Represents second year students", 
          isActive: true,
        },
        {
          electionId: deptElection._id,
          positionName: "3rd Year Representative",
          positionOrder: 9,
          maxVotes: 1,
          description: "Represents third year students",
          isActive: true,
        },
        {
          electionId: deptElection._id,
          positionName: "4th Year Representative",
          positionOrder: 10,
          maxVotes: 1,
          description: "Represents fourth year students",
          isActive: true,
        },
      ])
      allPositions.push(...deptPositions)
      console.log(`✅ Created ${deptPositions.length} departmental positions`)
    }

    console.log(`🎉 Position seeding completed! Total positions: ${allPositions.length}`)
    
    // Log seeded positions by election
    console.log("📊 Seeded Positions:")
    if (ssgElection) {
      console.log(`\n🏛️ SSG Election (${ssgElection.title}):`)
      const ssgPositions = allPositions.filter(p => p.electionId.toString() === ssgElection._id.toString())
      ssgPositions.forEach((pos, index) => {
        console.log(`${index + 1}. ${pos.positionName} (Max votes: ${pos.maxVotes})`)
      })
    }
    
    if (deptElection) {
      console.log(`\n🏛️ Departmental Election (${deptElection.title}):`)
      const deptPositions = allPositions.filter(p => p.electionId.toString() === deptElection._id.toString())
      deptPositions.forEach((pos, index) => {
        console.log(`${index + 1}. ${pos.positionName} (Max votes: ${pos.maxVotes})`)
      })
    }

  } catch (error) {
    console.error("❌ Position seeding failed:", error)
    console.error("Error details:", error.message)
    console.error("Stack trace:", error.stack)
  } finally {
    console.log("🔌 Database connection closed")
    await mongoose.connection.close()
  }
}

seedPositions()