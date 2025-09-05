const mongoose = require("mongoose")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function setupDegreesFinal() {
  try {
    console.log("🔄 Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    const Degree = require("../models/Degree")

    // Clear existing degrees to start fresh
    await Degree.deleteMany({})
    console.log("🗑️ Cleared all existing degrees")

    // Drop any problematic indexes
    try {
      const db = mongoose.connection.db
      const collection = db.collection("degrees")

      // Drop the problematic degreeCode_1 index if it exists
      try {
        await collection.dropIndex("degreeCode_1")
        console.log("✅ Dropped old degreeCode_1 index")
      } catch (e) {
        console.log("ℹ️ degreeCode_1 index didn't exist")
      }
    } catch (error) {
      console.log("ℹ️ Index cleanup completed")
    }

    // Create all degrees including both BSED majors
    const degrees = [
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
    for (const degreeData of degrees) {
      try {
        const degree = await Degree.create(degreeData)
        console.log(
          `✅ Created: ${degree.degreeCode}${degree.major ? ` (${degree.major})` : ""} - ${degree.degreeName}`,
        )
      } catch (error) {
        console.error(`❌ Failed to create ${degreeData.degreeCode}: ${error.message}`)
      }
    }

    // Verify final degrees
    const finalDegrees = await Degree.find().sort({ degreeCode: 1, major: 1 })
    console.log("\n📋 Final degrees in database:")
    finalDegrees.forEach((degree) => {
      console.log(`   - ${degree.degreeCode}${degree.major ? ` (${degree.major})` : ""}: ${degree.degreeName}`)
    })

    console.log(`\n✅ Setup completed! Total degrees: ${finalDegrees.length}`)

    // Show breakdown
    const bsedCount = finalDegrees.filter((d) => d.degreeCode === "BSED").length
    console.log(`📊 BSED majors: ${bsedCount}`)
  } catch (error) {
    console.error("❌ Error setting up degrees:", error)
  } finally {
    await mongoose.connection.close()
    console.log("🔌 Database connection closed")
  }
}

setupDegreesFinal()
