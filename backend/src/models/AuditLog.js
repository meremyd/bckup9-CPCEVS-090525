const mongoose = require("mongoose")

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "LOGIN",
        "LOGOUT",
        "CREATE_USER",
        "UPDATE_USER",
        "DELETE_USER",
        "CREATE_VOTER",
        "UPDATE_VOTER",
        "DELETE_VOTER",
        "VOTER_REGISTRATION",
        "SYSTEM_ACCESS",
        "CREATE_ELECTION",
        "UPDATE_ELECTION",
        "DELETE_ELECTION",
      ],
    },
    username: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("AuditLog", auditLogSchema)
