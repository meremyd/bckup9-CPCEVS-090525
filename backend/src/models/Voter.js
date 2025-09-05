const mongoose = require("mongoose")

const voterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    schoolId: {
      type: Number,
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    middleName: {
      type: String,
      default: null,
    },
    lastName: {
      type: String,
      required: true,
    },
    birthdate: {
      type: Date,
      required: true,
    },
    degreeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Degree",
      required: true,
    },
    password: {
      type: String,
      default: null,
    },
    faceEncoding: {
      type: String,
      default: null,
    },
    profilePicture: {
      type: Buffer,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Voter", voterSchema)
