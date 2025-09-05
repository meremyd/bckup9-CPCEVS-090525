const mongoose = require("mongoose")

const degreeSchema = new mongoose.Schema(
  {
    degreeCode: {
      type: String,
      required: true,
      uppercase: true,
    },
    degreeName: {
      type: String,
      required: true,
      unique: true, // Make degreeName unique instead
    },
    department: {
      type: String,
      required: true,
    },
    major: {
      type: String,
      default: null, // For BSED majors (English, Science)
    },
  },
  {
    timestamps: true,
  },
)

// Create a compound index to ensure unique combination of degreeCode + major
degreeSchema.index({ degreeCode: 1, major: 1 }, { unique: true })

module.exports = mongoose.model("Degree", degreeSchema)
