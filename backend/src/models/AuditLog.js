const mongoose = require("mongoose")

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "LOGIN",
        "LOGOUT",
        "PASSWORD_RESET_REQUEST",
        "PASSWORD_RESET_SUCCESS",
        "UNAUTHORIZED_ACCESS_ATTEMPT",
        "DATA_EXPORT",
        "DATA_IMPORT",
        "UPDATE_PASSWORD",
        "FORCE_LOGOUT",
        "CREATE_USER",
        "UPDATE_USER",
        "DELETE_USER",
        "ACTIVATE_USER",
        "DEACTIVATE_USER",
        "CREATE_VOTER",
        "UPDATE_VOTER",
        "DELETE_VOTER",
        "ACTIVATE_VOTER",
        "DEACTIVATE_VOTER",
        "VOTER_REGISTRATION",
        "CREATE_DEPARTMENT",
        "UPDATE_DEPARTMENT", 
        "DELETE_DEPARTMENT",
        "SYSTEM_ACCESS",
        "CREATE_SSG_ELECTION",
        "UPDATE_SSG_ELECTION",
        "DELETE_SSG_ELECTION",
        "CREATE_DEPARTMENTAL_ELECTION",
        "UPDATE_DEPARTMENTAL_ELECTION",
        "DELETE_DEPARTMENTAL_ELECTION",
        "START_ELECTION",
        "END_ELECTION",
        "CANCEL_ELECTION",
        "CREATE_CANDIDATE",
        "UPDATE_CANDIDATE", 
        "DELETE_CANDIDATE",
        "CREATE_POSITION",
        "UPDATE_POSITION", 
        "DELETE_POSITION",
        "CREATE_PARTYLIST",
        "UPDATE_PARTYLIST",
        "DELETE_PARTYLIST",
        "VOTED",
        "VOTE_SUBMITTED",
        "BALLOT_ACCESSED",
        "BALLOT_STARTED",
        "BALLOT_ABANDONED",
        "BALLOT_EXPIRED_DELETED",
        "CHAT_SUPPORT_REQUEST",
        "CHAT_SUPPORT_RESPONSE",
        "CHAT_SUPPORT_STATUS_UPDATE",
        "FILE_UPLOAD",
        "FILE_DELETE",
        "PROFILE_PICTURE_UPDATE",
        "CAMPAIGN_PICTURE_UPDATE",
        "VOTER_PARTICIPATED_IN_SSG_ELECTION",
        "VOTER_PARTICIPATED_IN_DEPARTMENTAL_ELECTION",
      ],
    },
    username: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "User"
    },
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "Voter"
    },
    schoolId: {
      type: Number,
      default: null,
      index: true
    },
    details: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: null,
      validate: {
        validator: function(v) {
          if (!v) return true;
          // Basic IP address validation (IPv4 and IPv6)
          const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
          return ipv4Regex.test(v) || ipv6Regex.test(v) || v === "::1" || v === "127.0.0.1";
        },
        message: "Invalid IP address format"
      }
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

// Index for better query performance
auditLogSchema.index({ action: 1, timestamp: -1 })
auditLogSchema.index({ username: 1, timestamp: -1 })
auditLogSchema.index({ userId: 1, timestamp: -1 })
auditLogSchema.index({ voterId: 1, timestamp: -1 })
auditLogSchema.index({ ipAddress: 1, timestamp: -1 })

auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2628288 }) // Approx 1 month in seconds

auditLogSchema.statics.logAction = function(actionData) {
  return this.create({
    action: actionData.action,
    username: actionData.username || "system",
    userId: actionData.userId || null,
    voterId: actionData.voterId || null,
    details: actionData.details,
    ipAddress: actionData.ipAddress || null,
    userAgent: actionData.userAgent || null,
  });
};

auditLogSchema.statics.logVoterAction = function(action, voterData, details, req) {
  return this.logAction({
    action,
    username: voterData.schoolId ? voterData.schoolId.toString() : "unknown",
    voterId: voterData._id || voterData.voterId,
    schoolId: voterData.schoolId,
    details,
    ipAddress: req?.ip,
    userAgent: req?.get("User-Agent"),
  });
};

// Static method for user-specific logging
auditLogSchema.statics.logUserAction = function(action, userData, details, req) {
  return this.logAction({
    action,
    username: userData.username || req?.user?.username || "system",
    userId: userData._id || userData.userId || req?.user?.userId,
    details,
    ipAddress: req?.ip,
    userAgent: req?.get("User-Agent"),
  });
};



module.exports = mongoose.model("AuditLog", auditLogSchema)
