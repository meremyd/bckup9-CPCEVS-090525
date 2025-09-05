const mongoose = require("mongoose")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function addMissingBSEDScience() {
  try {
    console.log("🔄 Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    const Degree = require("../models/Degree")

    // Show current degrees
    const currentDegrees = await Degree.find().sort({ degreeCode: 1, major: 1 })
    console.log("📋 Current degrees in database:")
    currentDegrees.forEach((degree) => {
      console.log(`   - ${degree.degreeCode}${degree.major ? ` (${degree.major})` : ""}: ${degree.degreeName}`)
    })

    // Check if BSED Science exists
    const bsedScience = await Degree.findOne({
      degreeCode: "BSED",
      major: "Science",
    })

    if (bsedScience) {
      console.log("✅ BSED Major in Science already exists!")
    } else {
      console.log("❌ BSED Major in Science is missing. Adding it now...")

      try {
        const newBSEDScience = await Degree.create({
          degreeCode: "BSED",
          degreeName: "Bachelor of Secondary Education - Major in Science",
          department: "College of Education",
          major: "Science",
        })

        console.log("✅ Successfully added BSED Major in Science!")
        console.log(`   - ID: ${newBSEDScience._id}`)
        console.log(`   - Name: ${newBSEDScience.degreeName}`)
      } catch (error) {
        console.error("❌ Failed to add BSED Science:", error.message)

        // Try to find if there's a duplicate name issue
        const duplicateName = await Degree.findOne({
          degreeName: "Bachelor of Secondary Education - Major in Science",
        })

        if (duplicateName) {
          console.log("⚠️  Found degree with same name but different structure:")
          console.log(`   - ID: ${duplicateName._id}`)
          console.log(`   - Code: ${duplicateName.degreeCode}`)
          console.log(`   - Major: ${duplicateName.major}`)
          console.log(`   - Name: ${duplicateName.degreeName}`)
        }
      }
    }

    // Show final degrees
    const finalDegrees = await Degree.find().sort({ degreeCode: 1, major: 1 })
    console.log("\n📋 Final degrees in database:")
    finalDegrees.forEach((degree) => {
      console.log(`   - ${degree.degreeCode}${degree.major ? ` (${degree.major})` : ""}: ${degree.degreeName}`)
    })

    // Show BSED breakdown
    const bsedDegrees = await Degree.find({ degreeCode: "BSED" }).sort({ major: 1 })
    console.log(`\n📊 BSED degrees found: ${bsedDegrees.length}`)
    bsedDegrees.forEach((degree) => {
      console.log(`   - Major: ${degree.major || "None"}`)
      console.log(`   - Name: ${degree.degreeName}`)
      console.log(`   - ID: ${degree._id}`)
      console.log("")
    })
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await mongoose.connection.close()
    console.log("🔌 Database connection closed")
  }
}

addMissingBSEDScience()
