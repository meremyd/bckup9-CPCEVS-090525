const mongoose = require("mongoose")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function debugVotersAndDegrees() {
  try {
    console.log("🔄 Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    const Voter = require("../models/Voter")
    const Degree = require("../models/Degree")

    // Check degrees first
    console.log("\n📋 All degrees in database:")
    const degrees = await Degree.find().sort({ degreeCode: 1, major: 1 })
    degrees.forEach((degree) => {
      console.log(`   - ID: ${degree._id}`)
      console.log(`     Code: ${degree.degreeCode}`)
      console.log(`     Major: ${degree.major || "None"}`)
      console.log(`     Name: ${degree.degreeName}`)
      console.log("")
    })

    // Check voters and their degree relationships
    console.log("📋 All voters and their degrees:")
    const voters = await Voter.find().populate("degreeId")
    voters.forEach((voter, index) => {
      console.log(`   ${index + 1}. Voter: ${voter.firstName} ${voter.lastName} (ID: ${voter.schoolId})`)
      console.log(`      - Voter ID: ${voter._id}`)
      console.log(`      - Degree ID: ${voter.degreeId?._id || "NULL"}`)
      console.log(`      - Degree Code: ${voter.degreeId?.degreeCode || "NULL"}`)
      console.log(`      - Degree Major: ${voter.degreeId?.major || "NULL"}`)
      console.log(`      - Degree Name: ${voter.degreeId?.degreeName || "NULL"}`)
      console.log("")
    })

    // Count by degree
    console.log("📊 Voter counts by degree:")
    const beedCount = voters.filter((v) => v.degreeId?.degreeCode === "BEED").length
    const bsedEnglishCount = voters.filter(
      (v) => v.degreeId?.degreeCode === "BSED" && v.degreeId?.major === "English",
    ).length
    const bsedScienceCount = voters.filter(
      (v) => v.degreeId?.degreeCode === "BSED" && v.degreeId?.major === "Science",
    ).length
    const bsitCount = voters.filter((v) => v.degreeId?.degreeCode === "BSIT").length
    const bshmCount = voters.filter((v) => v.degreeId?.degreeCode === "BSHM").length

    console.log(`   - BEED: ${beedCount}`)
    console.log(`   - BSED (English): ${bsedEnglishCount}`)
    console.log(`   - BSED (Science): ${bsedScienceCount}`)
    console.log(`   - BSIT: ${bsitCount}`)
    console.log(`   - BSHM: ${bshmCount}`)
    console.log(`   - Total: ${voters.length}`)
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await mongoose.connection.close()
    console.log("🔌 Database connection closed")
  }
}

debugVotersAndDegrees()
