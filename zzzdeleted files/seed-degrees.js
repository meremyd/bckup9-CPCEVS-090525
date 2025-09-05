const mongoose = require("mongoose")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function seedDegrees() {
  try {
    console.log("🔄 Connecting to MongoDB...")
    console.log("📍 MongoDB URI:", process.env.MONGODB_URI ? "Found" : "Not found")

    if (!process.env.MONGODB_URI) {
      console.log("❌ MONGODB_URI not found in environment variables")
      return
    }

    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    const Degree = require("../models/Degree")

    // Check existing degrees
    const existingDegrees = await Degree.find()
    console.log("📋 Existing degrees:", existingDegrees.length)

    // Define all degrees that should exist (including both BSED majors)
    const degreesToEnsure = [
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

    console.log("🔍 Checking and adding missing degrees...")

    for (const degreeData of degreesToEnsure) {
      // Check if this specific degree already exists by degreeName (which is now unique)
      const existingDegree = await Degree.findOne({ degreeName: degreeData.degreeName })

      if (!existingDegree) {
        try {
          await Degree.create(degreeData)
          console.log(
            `✅ Added: ${degreeData.degreeCode}${degreeData.major ? ` (${degreeData.major})` : ""} - ${degreeData.degreeName}`,
          )
        } catch (error) {
          console.error(`❌ Failed to add ${degreeData.degreeCode}: ${error.message}`)
        }
      } else {
        console.log(`⏭️  Already exists: ${degreeData.degreeCode}${degreeData.major ? ` (${degreeData.major})` : ""}`)
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

    console.log("\n✅ Degree seeding completed!")
  } catch (error) {
    console.error("❌ Error seeding degrees:", error)
  } finally {
    await mongoose.connection.close()
    console.log("🔌 Database connection closed")
  }
}

seedDegrees()
