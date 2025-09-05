const mongoose = require("mongoose")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function fixDegrees() {
  try {
    console.log("🔄 Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    const Degree = require("../models/Degree")

    // First, let's see what's currently in the database
    const existingDegrees = await Degree.find()
    console.log("📋 Current degrees in database:")
    existingDegrees.forEach((degree) => {
      console.log(`   - ${degree.degreeCode}${degree.major ? ` (${degree.major})` : ""}: ${degree.degreeName}`)
    })

    // Clear all degrees to start fresh
    await Degree.deleteMany({})
    console.log("🗑️ Cleared all existing degrees")

    // Define all degrees that should exist (including both BSED majors)
    const degreesToCreate = [
      {
        degreeCode: "BEED",
        degreeName: "Bachelor of Elementary Education",
        department: "College of Education",
        major: null,
      },
      {
        degreeCode: "BSED",
        degreeName: "Bachelor of Secondary Education - Major in English",
        department: "College of Education",
        major: "English",
      },
      {
        degreeCode: "BSED",
        degreeName: "Bachelor of Secondary Education - Major in Science",
        department: "College of Education",
        major: "Science",
      },
      {
        degreeCode: "BSIT",
        degreeName: "Bachelor of Science in Information Technology",
        department: "College of Computer Studies",
        major: null,
      },
      {
        degreeCode: "BSHM",
        degreeName: "Bachelor of Science in Hospitality Management",
        department: "College of Business and Management",
        major: null,
      },
    ]

    console.log("🌱 Creating degrees...")
    for (const degreeData of degreesToCreate) {
      try {
        const degree = await Degree.create(degreeData)
        console.log(
          `✅ Created: ${degree.degreeCode}${degree.major ? ` (${degree.major})` : ""} - ${degree.degreeName}`,
        )
      } catch (error) {
        console.error(`❌ Failed to create ${degreeData.degreeCode}: ${error.message}`)
      }
    }

    // Show final list
    const finalDegrees = await Degree.find().sort({ degreeCode: 1, major: 1 })
    console.log("\n📋 Final degrees in database:")
    finalDegrees.forEach((degree) => {
      console.log(`   - ${degree.degreeCode}${degree.major ? ` (${degree.major})` : ""}: ${degree.degreeName}`)
    })

    // Show BSED breakdown
    const bsedDegrees = finalDegrees.filter((d) => d.degreeCode === "BSED")
    console.log(`\n📊 BSED majors: ${bsedDegrees.length}`)
    bsedDegrees.forEach((degree) => {
      console.log(`   - Major in ${degree.major}`)
    })

    console.log(`\n✅ Degree fix completed! Total degrees: ${finalDegrees.length}`)
  } catch (error) {
    console.error("❌ Error fixing degrees:", error)
  } finally {
    await mongoose.connection.close()
    console.log("🔌 Database connection closed")
  }
}

fixDegrees()
