const Voter = require("../models/Voter")
const Degree = require("../models/Degree")
const AuditLog = require("../models/AuditLog")

class VoterController {
  // Lookup voter by school ID - Fixed type consistency
  static async lookupVoter(req, res, next) {
    try {
      const { schoolId } = req.params

      if (!schoolId) {
        const error = new Error("School ID is required")
        error.statusCode = 400
        return next(error)
      }

      // Convert schoolId to Number for consistent querying
      const schoolIdNumber = Number(schoolId)
      if (isNaN(schoolIdNumber)) {
        const error = new Error("Invalid School ID format")
        error.statusCode = 400
        return next(error)
      }

      // Find voter by school ID (now consistent Number type)
      const voter = await Voter.findOne({ schoolId: schoolIdNumber }).populate("degreeId")
      if (!voter) {
        const error = new Error("Student not found in voter database")
        error.statusCode = 404
        return next(error)
      }

      // Log the lookup
      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: schoolIdNumber.toString(),
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

  // Get all voters - Fixed search functionality for Number schoolId
  static async getAllVoters(req, res, next) {
    try {
      const { degree, hasPassword, page = 1, limit = 100, search } = req.query

      // Build filter
      const filter = {}
      if (degree) filter.degreeId = degree
      if (hasPassword !== undefined) {
        filter.password = hasPassword === "true" ? { $ne: null } : null
      }
      
      // Fixed search to handle Number schoolId properly
      if (search) {
        const searchNumber = Number(search)
        const searchConditions = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
        ]
        
        // Only add schoolId search if search term is a valid number
        if (!isNaN(searchNumber)) {
          searchConditions.push({ schoolId: searchNumber })
        }
        
        filter.$or = searchConditions
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

      // Return just the voters array for frontend compatibility
      res.json(voters)
    } catch (error) {
      next(error)
    }
  }

  // Get registered voters only
  static async getRegisteredVoters(req, res, next) {
    try {
      const { degree, page = 1, limit = 100, search } = req.query

      // Build filter - only registered voters
      const filter = { 
        password: { $ne: null },
        isRegistered: true 
      }
      
      if (degree) filter.degreeId = degree
      
      // Search functionality
      if (search) {
        const searchNumber = Number(search)
        const searchConditions = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
        ]
        
        if (!isNaN(searchNumber)) {
          searchConditions.push({ schoolId: searchNumber })
        }
        
        filter.$or = searchConditions
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

      res.json(voters)
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

  // Create new voter - Fixed schoolId validation
  static async createVoter(req, res, next) {
    try {
      const { schoolId, firstName, middleName, lastName, birthdate, degreeId, email } = req.body

      // Validation
      if (!schoolId || !firstName || !lastName || !birthdate || !degreeId || !email) {
        const error = new Error("Required fields are missing")
        error.statusCode = 400
        return next(error)
      }

      // Convert and validate schoolId
      const schoolIdNumber = Number(schoolId)
      if (isNaN(schoolIdNumber)) {
        const error = new Error("Invalid School ID format")
        error.statusCode = 400
        return next(error)
      }

      // Check if voter already exists
      const existingVoter = await Voter.findOne({ schoolId: schoolIdNumber })
      if (existingVoter) {
        const error = new Error("Voter with this school ID already exists")
        error.statusCode = 400
        return next(error)
      }

      // Check for duplicate email
      const existingEmail = await Voter.findOne({ email })
      if (existingEmail) {
        const error = new Error("Email already exists")
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
        schoolId: schoolIdNumber,
        firstName,
        middleName,
        lastName,
        birthdate: new Date(birthdate),
        degreeId,
        email,
      })

      await voter.save()

      // Log the creation
      await AuditLog.create({
        action: "CREATE_VOTER",
        username: req.user?.username || "system",
        details: `Voter created - ${firstName} ${lastName} (${schoolIdNumber})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      const populatedVoter = await Voter.findById(voter._id)
        .populate("degreeId")
        .select("-password -faceEncoding -profilePicture")

      res.status(201).json(populatedVoter)
    } catch (error) {
      next(error)
    }
  }

  // Update voter - Fixed schoolId validation
  static async updateVoter(req, res, next) {
    try {
      const { id } = req.params
      const { schoolId, firstName, middleName, lastName, birthdate, degreeId, email } = req.body

      const voter = await Voter.findById(id)
      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      // Check for duplicate school ID
      if (schoolId && schoolId !== voter.schoolId) {
        const schoolIdNumber = Number(schoolId)
        if (isNaN(schoolIdNumber)) {
          const error = new Error("Invalid School ID format")
          error.statusCode = 400
          return next(error)
        }

        const existingVoter = await Voter.findOne({ schoolId: schoolIdNumber, _id: { $ne: id } })
        if (existingVoter) {
          const error = new Error("School ID already exists")
          error.statusCode = 400
          return next(error)
        }
      }

      // Check for duplicate email
      if (email && email !== voter.email) {
        const existingEmail = await Voter.findOne({ email, _id: { $ne: id } })
        if (existingEmail) {
          const error = new Error("Email already exists")
          error.statusCode = 400
          return next(error)
        }
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
      if (schoolId) updateData.schoolId = Number(schoolId)
      if (firstName) updateData.firstName = firstName
      if (middleName !== undefined) updateData.middleName = middleName
      if (lastName) updateData.lastName = lastName
      if (birthdate) updateData.birthdate = new Date(birthdate)
      if (degreeId) updateData.degreeId = degreeId
      if (email) updateData.email = email

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

      res.json(updatedVoter)
    } catch (error) {
      next(error)
    }
  }

  // Deactivate voter
  static async deactivateVoter(req, res, next) {
    try {
      const { id } = req.params

      const voter = await Voter.findById(id)
      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      // Update voter status
      voter.isActive = false
      voter.isPasswordActive = false
      await voter.save()

      // Log the deactivation
      await AuditLog.create({
        action: "UPDATE_VOTER",
        username: req.user?.username || "system",
        details: `Voter deactivated - ${voter.firstName} ${voter.lastName} (${voter.schoolId})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        message: "Voter deactivated successfully",
        voter: {
          id: voter._id,
          schoolId: voter.schoolId,
          firstName: voter.firstName,
          lastName: voter.lastName,
          isActive: voter.isActive,
        },
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

      // Store voter info for logging
      const voterInfo = `${voter.firstName} ${voter.lastName} (${voter.schoolId})`

      // Delete the voter
      await Voter.findByIdAndDelete(id)

      // Log the deletion
      await AuditLog.create({
        action: "DELETE_VOTER",
        username: req.user?.username || "system",
        details: `Voter deleted - ${voterInfo}`,
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
      const registered = await Voter.countDocuments({ isRegistered: true })
      const active = await Voter.countDocuments({ isActive: true })
      const classOfficers = await Voter.countDocuments({ isClassOfficer: true })

      // Statistics by degree
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
            _id: {
              code: "$degree.degreeCode",
              name: "$degree.degreeName",
              major: "$degree.major",
            },
            total: { $sum: 1 },
            registered: {
              $sum: {
                $cond: ["$isRegistered", 1, 0],
              },
            },
            active: {
              $sum: {
                $cond: ["$isActive", 1, 0],
              },
            },
          },
        },
        {
          $sort: { "_id.code": 1, "_id.major": 1 },
        },
      ])

      // Registration rate
      const registrationRate = total > 0 ? Math.round((registered / total) * 100) : 0

      res.json({
        total,
        registered,
        unregistered: total - registered,
        active,
        inactive: total - active,
        classOfficers,
        registrationRate,
        byDegree,
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = VoterController