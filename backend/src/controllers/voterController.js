const Voter = require("../models/Voter")
const Degree = require("../models/Degree")
const AuditLog = require("../models/AuditLog")

class VoterController {
  // Lookup voter by school ID
  static async lookupVoter(req, res, next) {
    try {
      const { schoolId } = req.params

      if (!schoolId) {
        const error = new Error("School ID is required")
        error.statusCode = 400
        return next(error)
      }

      // Find voter by school ID
      const voter = await Voter.findOne({ schoolId }).populate("degreeId")
      if (!voter) {
        const error = new Error("Student not found in voter database")
        error.statusCode = 404
        return next(error)
      }

      // Log the lookup
      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: schoolId,
        details: `Voter lookup performed - ${voter.firstName} ${voter.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        schoolId: voter.schoolId,
        firstName: voter.firstName,
        middleName: voter.middleName,
        lastName: voter.lastName,
        degree: voter.degreeId,
        hasPassword: !!voter.password,
      })
    } catch (error) {
      next(error)
    }
  }

  // Get all voters
  static async getAllVoters(req, res, next) {
    try {
      const { degree, hasPassword, page = 1, limit = 10, search } = req.query

      // Build filter
      const filter = {}
      if (degree) filter.degreeId = degree
      if (hasPassword !== undefined) {
        filter.password = hasPassword === "true" ? { $ne: null } : null
      }
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { schoolId: { $regex: search, $options: "i" } },
        ]
      }

      // Pagination
      const skip = (page - 1) * limit

      const voters = await Voter.find(filter)
        .populate("degreeId")
        .sort({ schoolId: 1 })
        .skip(skip)
        .limit(Number.parseInt(limit))
        .select("-password -faceEncoding -profilePicture")

      const total = await Voter.countDocuments(filter)

      res.json({
        voters,
        pagination: {
          current: Number.parseInt(page),
          total: Math.ceil(total / limit),
          count: voters.length,
          totalVoters: total,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // Get single voter
  static async getVoter(req, res, next) {
    try {
      const { id } = req.params

      const voter = await Voter.findById(id).populate("degreeId").select("-password -faceEncoding -profilePicture")

      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      res.json(voter)
    } catch (error) {
      next(error)
    }
  }

  // Create new voter
  static async createVoter(req, res, next) {
    try {
      const { schoolId, firstName, middleName, lastName, birthdate, degreeId } = req.body

      // Validation
      if (!schoolId || !firstName || !lastName || !birthdate || !degreeId) {
        const error = new Error("Required fields are missing")
        error.statusCode = 400
        return next(error)
      }

      // Check if voter already exists
      const existingVoter = await Voter.findOne({ schoolId })
      if (existingVoter) {
        const error = new Error("Voter with this school ID already exists")
        error.statusCode = 400
        return next(error)
      }

      // Verify degree exists
      const degree = await Degree.findById(degreeId)
      if (!degree) {
        const error = new Error("Invalid degree ID")
        error.statusCode = 400
        return next(error)
      }

      // Create voter
      const voter = new Voter({
        schoolId,
        firstName,
        middleName,
        lastName,
        birthdate: new Date(birthdate),
        degreeId,
      })

      await voter.save()

      // Log the creation
      await AuditLog.create({
        action: "CREATE_VOTER",
        username: req.user?.username || "system",
        details: `Voter created - ${firstName} ${lastName} (${schoolId})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      const populatedVoter = await Voter.findById(voter._id)
        .populate("degreeId")
        .select("-password -faceEncoding -profilePicture")

      res.status(201).json({
        message: "Voter created successfully",
        voter: populatedVoter,
      })
    } catch (error) {
      next(error)
    }
  }

  // Update voter
  static async updateVoter(req, res, next) {
    try {
      const { id } = req.params
      const { firstName, middleName, lastName, birthdate, degreeId } = req.body

      const voter = await Voter.findById(id)
      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      // Verify degree exists if provided
      if (degreeId) {
        const degree = await Degree.findById(degreeId)
        if (!degree) {
          const error = new Error("Invalid degree ID")
          error.statusCode = 400
          return next(error)
        }
      }

      // Update voter
      const updateData = {}
      if (firstName) updateData.firstName = firstName
      if (middleName !== undefined) updateData.middleName = middleName
      if (lastName) updateData.lastName = lastName
      if (birthdate) updateData.birthdate = new Date(birthdate)
      if (degreeId) updateData.degreeId = degreeId

      const updatedVoter = await Voter.findByIdAndUpdate(id, updateData, { new: true })
        .populate("degreeId")
        .select("-password -faceEncoding -profilePicture")

      // Log the update
      await AuditLog.create({
        action: "UPDATE_VOTER",
        username: req.user?.username || "system",
        details: `Voter updated - ${updatedVoter.firstName} ${updatedVoter.lastName} (${updatedVoter.schoolId})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        message: "Voter updated successfully",
        voter: updatedVoter,
      })
    } catch (error) {
      next(error)
    }
  }

  // Delete voter
  static async deleteVoter(req, res, next) {
    try {
      const { id } = req.params

      const voter = await Voter.findById(id)
      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      await Voter.findByIdAndDelete(id)

      // Log the deletion
      await AuditLog.create({
        action: "DELETE_VOTER",
        username: req.user?.username || "system",
        details: `Voter deleted - ${voter.firstName} ${voter.lastName} (${voter.schoolId})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({ message: "Voter deleted successfully" })
    } catch (error) {
      next(error)
    }
  }

  // Get voter statistics
  static async getStatistics(req, res, next) {
    try {
      const total = await Voter.countDocuments()
      const registered = await Voter.countDocuments({ password: { $ne: null } })
      const unregistered = total - registered

      const byDegree = await Voter.aggregate([
        {
          $lookup: {
            from: "degrees",
            localField: "degreeId",
            foreignField: "_id",
            as: "degree",
          },
        },
        {
          $unwind: "$degree",
        },
        {
          $group: {
            _id: "$degree.degreeName",
            total: { $sum: 1 },
            registered: {
              $sum: {
                $cond: [{ $ne: ["$password", null] }, 1, 0],
              },
            },
          },
        },
      ])

      res.json({
        total,
        registered,
        unregistered,
        byDegree,
      })
    } catch (error) {
      next(error)
    }
  }

  // Get registered voters only (voters with passwords)
  static async getRegisteredVoters(req, res, next) {
    try {
      const { degree, page = 1, limit = 50, search } = req.query

      // Build filter for registered voters only
      const filter = { password: { $ne: null } }
      if (degree) filter.degreeId = degree
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { schoolId: { $regex: search, $options: "i" } },
        ]
      }

      // Pagination
      const skip = (page - 1) * limit

      const voters = await Voter.find(filter)
        .populate("degreeId")
        .sort({ schoolId: 1 })
        .skip(skip)
        .limit(Number.parseInt(limit))
        .select("-password -faceEncoding -profilePicture")

      const total = await Voter.countDocuments(filter)

      // Log the access
      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        details: `Registered voters list accessed - ${voters.length} voters returned`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json(voters) // Return just the array for frontend compatibility
    } catch (error) {
      next(error)
    }
  }

  // Deactivate voter (remove password to make them unregistered)
  static async deactivateVoter(req, res, next) {
    try {
      const { id } = req.params

      const voter = await Voter.findById(id)
      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      // Remove password to deactivate registration
      voter.password = null
      await voter.save()

      // Log the deactivation
      await AuditLog.create({
        action: "UPDATE_VOTER",
        username: req.user?.username || "system",
        details: `Voter deactivated - ${voter.firstName} ${voter.lastName} (${voter.schoolId})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({ message: "Voter deactivated successfully" })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = VoterController
