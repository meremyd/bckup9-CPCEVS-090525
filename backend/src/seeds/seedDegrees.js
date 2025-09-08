const mongoose = require("mongoose")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function seedDegrees() {
  try {
    console.log("📄 Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    // Import Degree model
    const Degree = require("../models/Degree")

    // Clear existing degrees
    console.log("🧹 Clearing existing degrees...")
    await Degree.deleteMany({})

    // Seed degrees data (exact same data from migrate.js)
    console.log("🎓 Seeding degrees...")
    const degrees = await Degree.insertMany([
      {
        degreeCode: "BSIT",
        degreeName: "Bachelor of Science in Information Technology",
        department: "College of Computer Studies",
        major: null,
      },
      {
        degreeCode: "BSHM",
        degreeName: "Bachelor of Science in Hospitality Management", 
        department: "College of Hospitality Management",
        major: null,
      },
      {
        degreeCode: "BSED",
        degreeName: "Bachelor of Secondary Education Major in Science",
        department: "College of Teacher Education",
        major: "Science",
      },
      {
        degreeCode: "BSED", 
        degreeName: "Bachelor of Secondary Education Major in English",
        department: "College of Teacher Education",
        major: "English",
      },
      {
        degreeCode: "BEED",
        degreeName: "Bachelor of Elementary Education",
        department: "College of Education", 
        major: null,
      },
    ])

    console.log(`✅ Successfully seeded ${degrees.length} degrees`)
    console.log("🎉 Degree seeding completed!")
    
    // Log seeded degrees
    console.log("📊 Seeded Degrees:")
    degrees.forEach((degree, index) => {
      console.log(`${index + 1}. ${degree.degreeCode} - ${degree.degreeName}`)
      if (degree.major) console.log(`   Major: ${degree.major}`)
      console.log(`   Department: ${degree.department}`)
    })

  } catch (error) {
    console.error("❌ Degree seeding failed:", error)
    console.error("Error details:", error.message)
    console.error("Stack trace:", error.stack)
  } finally {
    console.log("🔌 Database connection closed")
    await mongoose.connection.close()
  }
}

seedDegrees()