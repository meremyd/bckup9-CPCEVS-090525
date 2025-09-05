const mongoose = require("mongoose")

const partylistSchema = new mongoose.Schema(
  {
    partylistId: {
      type: String,
      required: true,
      unique: true,
    },
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Election",
      required: true,
    },
    partylistName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    logo: {
      type: Buffer,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Partylist", partylistSchema)
