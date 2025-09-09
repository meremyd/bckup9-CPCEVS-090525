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
        // Log failed lookup attempt
        await AuditLog.logVoterAction(
          "SYSTEM_ACCESS",
          { schoolId: schoolIdNumber },
          `Failed voter lookup - School ID ${schoolIdNumber} not found`,
          req
        )
        
        const error = new Error("Student not found in voter database")
        error.statusCode = 404
        return next(error)
      }

      // Log successful lookup using the static method
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        voter,
        `Voter lookup performed - ${voter.firstName} ${voter.lastName}`,
        req
      )

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

      // Log the access using static method
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        { username: req.user?.username },
        `Voters list accessed - ${voters.length} voters returned (Total: ${total})`,
        req
      )

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

      // Log registered voters access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        { username: req.user?.username },
        `Registered voters list accessed - ${voters.length} registered voters returned`,
        req
      )

      res.json(voters)
    } catch (error) {
      next(error)
    }
  }

  // Get officers only
  static async getOfficers(req, res, next) {
    try {
      const { degree, page = 1, limit = 100, search } = req.query

      // Build filter - only officers
      const filter = { 
        isClassOfficer: true 
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

      const officers = await Voter.find(filter)
        .populate("degreeId")
        .sort({ schoolId: 1 })
        .skip(skip)
        .limit(Number.parseInt(limit))
        .select("-password -faceEncoding -profilePicture")

      const total = await Voter.countDocuments(filter)

      // Log officers access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        { username: req.user?.username },
        `Officers list accessed - ${officers.length} officers returned`,
        req
      )

      res.json(officers)
    } catch (error) {
      next(error)
    }
  }

  // Toggle officer status - Only election committee can update
  static async toggleOfficerStatus(req, res, next) {
    try {
      // Check if user is election_committee
      if (req.user.userType !== 'election_committee') {
        await AuditLog.logUserAction(
          "UNAUTHORIZED_ACCESS_ATTEMPT",
          { username: req.user?.username },
          `Unauthorized attempt to toggle officer status - User type: ${req.user.userType}`,
          req
        )
        
        const error = new Error("Only election committee members can update officer status")
        error.statusCode = 403
        return next(error)
      }

      const { id } = req.params

      const voter = await Voter.findById(id).populate("degreeId")
      if (!voter) {
        // Log failed toggle attempt
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          { username: req.user?.username },
          `Failed to toggle officer status - Voter ID ${id} not found`,
          req
        )
        
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      const wasOfficer = voter.isClassOfficer
      
      // Toggle officer status
      voter.isClassOfficer = !voter.isClassOfficer
      await voter.save()

      // Log the toggle action
      const actionType = voter.isClassOfficer ? "UPDATE_VOTER" : "UPDATE_VOTER"
      const statusText = voter.isClassOfficer ? "made officer" : "removed as officer"
      
      await AuditLog.logVoterAction(
        actionType,
        voter,
        `Officer status updated - ${voter.firstName} ${voter.lastName} (${voter.schoolId}) ${statusText} by ${req.user.username}`,
        req
      )

      const updatedVoter = await Voter.findById(id)
        .populate("degreeId")
        .select("-password -faceEncoding -profilePicture")

      res.json({
        message: `Voter ${statusText} successfully`,
        voter: updatedVoter,
        previousStatus: wasOfficer,
        currentStatus: voter.isClassOfficer
      })
    } catch (error) {
      next(error)
    }
  }

  // Get voter statistics by degree
  static async getStatisticsByDegree(req, res, next) {
    try {
      // Get statistics grouped by degree
      const statsByDegree = await Voter.aggregate([
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
              degreeId: "$degree._id",
              code: "$degree.degreeCode",
              name: "$degree.degreeName",
              major: "$degree.major",
              department: "$degree.department",
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
            officers: {
              $sum: {
                $cond: ["$isClassOfficer", 1, 0],
              },
            },
          },
        },
        {
          $sort: { "_id.code": 1, "_id.major": 1 },
        },
      ])

      // Transform the data for easier frontend consumption
      const degreeStats = {}
      statsByDegree.forEach(stat => {
        const key = stat._id.major ? 
          `${stat._id.code}-${stat._id.major}` : 
          stat._id.code
        
        degreeStats[key] = {
          total: stat.total,
          registered: stat.registered,
          active: stat.active,
          officers: stat.officers,
          degreeInfo: {
            id: stat._id.degreeId,
            code: stat._id.code,
            name: stat._id.name,
            major: stat._id.major,
            department: stat._id.department
          }
        }
      })

      // Log statistics access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        { username: req.user?.username },
        `Voter statistics by degree accessed - ${Object.keys(degreeStats).length} degrees`,
        req
      )

      res.json(degreeStats)
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
        // Log failed access attempt
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          { username: req.user?.username },
          `Failed to access voter - Voter ID ${id} not found`,
          req
        )
        
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      // Log successful voter access
      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        voter,
        `Voter accessed - ${voter.firstName} ${voter.lastName} (${voter.schoolId})`,
        req
      )

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
        // Log failed creation attempt
        await AuditLog.logUserAction(
          "CREATE_VOTER",
          { username: req.user?.username },
          `Failed to create voter - School ID ${schoolIdNumber} already exists`,
          req
        )
        
        const error = new Error("Voter with this school ID already exists")
        error.statusCode = 400
        return next(error)
      }

      // Check for duplicate email
      const existingEmail = await Voter.findOne({ email })
      if (existingEmail) {
        // Log failed creation attempt
        await AuditLog.logUserAction(
          "CREATE_VOTER",
          { username: req.user?.username },
          `Failed to create voter - Email ${email} already exists`,
          req
        )
        
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

      // Log the creation using static method
      await AuditLog.logUserAction(
        "CREATE_VOTER",
        { username: req.user?.username, userId: req.user?.userId },
        `Voter created - ${firstName} ${lastName} (${schoolIdNumber}) - ${degree.displayName || degree.degreeCode}`,
        req
      )

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

      const voter = await Voter.findById(id).populate("degreeId")
      if (!voter) {
        // Log failed update attempt
        await AuditLog.logUserAction(
          "UPDATE_VOTER",
          { username: req.user?.username },
          `Failed to update voter - Voter ID ${id} not found`,
          req
        )
        
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      const originalData = {
        schoolId: voter.schoolId,
        firstName: voter.firstName,
        middleName: voter.middleName,
        lastName: voter.lastName,
        email: voter.email,
        degree: voter.degreeId
      }
      let updateDetails = []

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
          await AuditLog.logUserAction(
            "UPDATE_VOTER",
            { username: req.user?.username },
            `Failed to update voter - School ID ${schoolIdNumber} already exists`,
            req
          )
          
          const error = new Error("School ID already exists")
          error.statusCode = 400
          return next(error)
        }
        updateDetails.push(`School ID changed from ${voter.schoolId} to ${schoolIdNumber}`)
      }

      // Check for duplicate email
      if (email && email !== voter.email) {
        const existingEmail = await Voter.findOne({ email, _id: { $ne: id } })
        if (existingEmail) {
          await AuditLog.logUserAction(
            "UPDATE_VOTER",
            { username: req.user?.username },
            `Failed to update voter - Email ${email} already exists`,
            req
          )
          
          const error = new Error("Email already exists")
          error.statusCode = 400
          return next(error)
        }
        updateDetails.push(`Email changed from ${voter.email} to ${email}`)
      }

      // Verify degree exists if provided
      let newDegree = null
      if (degreeId && degreeId !== voter.degreeId.toString()) {
        newDegree = await Degree.findById(degreeId)
        if (!newDegree) {
          const error = new Error("Invalid degree ID")
          error.statusCode = 400
          return next(error)
        }
        updateDetails.push(`Degree changed from ${voter.degreeId.displayName || voter.degreeId.degreeCode} to ${newDegree.displayName || newDegree.degreeCode}`)
      }

      // Track other changes
      if (firstName && firstName !== voter.firstName) {
        updateDetails.push(`First name changed from ${voter.firstName} to ${firstName}`)
      }
      if (lastName && lastName !== voter.lastName) {
        updateDetails.push(`Last name changed from ${voter.lastName} to ${lastName}`)
      }
      if (middleName !== voter.middleName) {
        updateDetails.push(`Middle name changed`)
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

      // Log the update with detailed changes
      const detailsString = updateDetails.length > 0 
        ? `Voter updated - ${updatedVoter.firstName} ${updatedVoter.lastName} (${updatedVoter.schoolId}): ${updateDetails.join(', ')}`
        : `Voter updated - ${updatedVoter.firstName} ${updatedVoter.lastName} (${updatedVoter.schoolId})`

      await AuditLog.logUserAction(
        "UPDATE_VOTER",
        { username: req.user?.username, userId: req.user?.userId },
        detailsString,
        req
      )

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
        // Log failed deactivation attempt
        await AuditLog.logUserAction(
          "DEACTIVATE_VOTER",
          { username: req.user?.username },
          `Failed to deactivate voter - Voter ID ${id} not found`,
          req
        )
        
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      const wasActive = voter.isActive
      const wasPasswordActive = voter.isPasswordActive

      // Update voter status
      voter.isActive = false
      voter.isPasswordActive = false
      await voter.save()

      // Log the deactivation using both actions for comprehensive tracking
      await AuditLog.logVoterAction(
        "DEACTIVATE_VOTER",
        voter,
        `Voter deactivated - ${voter.firstName} ${voter.lastName} (${voter.schoolId}) - Status: ${wasActive ? 'Active' : 'Inactive'} → Inactive, Password: ${wasPasswordActive ? 'Active' : 'Inactive'} → Inactive`,
        req
      )

      res.json({
        message: "Voter deactivated successfully",
        voter: {
          id: voter._id,
          schoolId: voter.schoolId,
          firstName: voter.firstName,
          lastName: voter.lastName,
          isActive: voter.isActive,
          isPasswordActive: voter.isPasswordActive,
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

      const voter = await Voter.findById(id).populate("degreeId")
      if (!voter) {
        // Log failed deletion attempt
        await AuditLog.logUserAction(
          "DELETE_VOTER",
          { username: req.user?.username },
          `Failed to delete voter - Voter ID ${id} not found`,
          req
        )
        
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      // Store voter info for logging
      const voterInfo = `${voter.firstName} ${voter.lastName} (${voter.schoolId}) - ${voter.degreeId?.displayName || voter.degreeId?.degreeCode || 'Unknown Degree'}`
      const voterCopy = {
        schoolId: voter.schoolId,
        firstName: voter.firstName,
        lastName: voter.lastName,
        _id: voter._id
      }

      // Delete the voter
      await Voter.findByIdAndDelete(id)

      // Log the deletion using both methods for comprehensive tracking
      await AuditLog.logUserAction(
        "DELETE_VOTER",
        { username: req.user?.username, userId: req.user?.userId },
        `Voter deleted - ${voterInfo}`,
        req
      )

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

      // Log statistics access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        { username: req.user?.username },
        `Voter statistics accessed - Total: ${total}, Registered: ${registered}, Active: ${active}, Registration Rate: ${registrationRate}%`,
        req
      )

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