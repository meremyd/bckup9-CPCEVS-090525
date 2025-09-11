const Voter = require("../models/Voter")
const Department = require("../models/Department")
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

      const schoolIdNumber = Number(schoolId)
      if (isNaN(schoolIdNumber)) {
        const error = new Error("Invalid School ID format")
        error.statusCode = 400
        return next(error)
      }

      const voter = await Voter.findOne({ schoolId: schoolIdNumber }).populate("departmentId")
      if (!voter) {
        await AuditLog.logVoterAction(
          "UNAUTHORIZED_ACCESS_ATTEMPT",
          { schoolId: schoolIdNumber },
          `Failed voter lookup - School ID ${schoolIdNumber} not found`,
          req
        )
        
        const error = new Error("Student not found in voter database")
        error.statusCode = 404
        return next(error)
      }

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
        yearLevel: voter.yearLevel,
        department: voter.departmentId,
        hasPassword: !!voter.password,
        isRegistered: voter.isRegistered,
        isClassOfficer: voter.isClassOfficer,
        isActive: voter.isActive,
        isPasswordActive: voter.isPasswordActive,
        passwordExpired: voter.isPasswordExpired()
      })
    } catch (error) {
      next(error)
    }
  }

  // Get all voters
  static async getAllVoters(req, res, next) {
    try {
      const { department, yearLevel, hasPassword, page = 1, limit = 100, search } = req.query

      const filter = {}
      if (department) filter.departmentId = department
      if (yearLevel) filter.yearLevel = Number(yearLevel)
      if (hasPassword !== undefined) {
        filter.password = hasPassword === "true" ? { $ne: null } : null
      }
      
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

      const skip = (page - 1) * limit

      const voters = await Voter.find(filter)
        .populate("departmentId")
        .sort({ schoolId: 1 })
        .skip(skip)
        .limit(Number.parseInt(limit))
        .select("-password -faceEncoding -profilePicture")

      const total = await Voter.countDocuments(filter)

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        { username: req.user?.username },
        `Voters list accessed - ${voters.length} voters returned (Total: ${total})`,
        req
      )

      res.json({
        success: true,
        data: voters,
        pagination: {
          current: Number(page),
          total: Math.ceil(total / limit),
          count: voters.length,
          totalRecords: total
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get registered voters only
  static async getRegisteredVoters(req, res, next) {
    try {
      const { department, yearLevel, page = 1, limit = 100, search } = req.query

      const filter = { 
        isRegistered: true,
        isActive: true 
      }
      
      if (department) filter.departmentId = department
      if (yearLevel) filter.yearLevel = Number(yearLevel)
      
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

      const skip = (page - 1) * limit

      const voters = await Voter.find(filter)
        .populate("departmentId")
        .sort({ schoolId: 1 })
        .skip(skip)
        .limit(Number.parseInt(limit))
        .select("-password -faceEncoding -profilePicture")

      const total = await Voter.countDocuments(filter)

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        { username: req.user?.username },
        `Registered voters list accessed - ${voters.length} registered voters returned`,
        req
      )

      res.json({
        success: true,
        data: voters,
        pagination: {
          current: Number(page),
          total: Math.ceil(total / limit),
          count: voters.length,
          totalRecords: total
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get officers only
  static async getOfficers(req, res, next) {
    try {
      const { department, yearLevel, page = 1, limit = 100, search } = req.query

      const filter = { 
        isClassOfficer: true,
        isActive: true 
      }
      
      if (department) filter.departmentId = department
      if (yearLevel) filter.yearLevel = Number(yearLevel)
      
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

      const skip = (page - 1) * limit

      const officers = await Voter.find(filter)
        .populate("departmentId")
        .sort({ schoolId: 1 })
        .skip(skip)
        .limit(Number.parseInt(limit))
        .select("-password -faceEncoding -profilePicture")

      const total = await Voter.countDocuments(filter)

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        { username: req.user?.username },
        `Officers list accessed - ${officers.length} officers returned`,
        req
      )

      res.json({
        success: true,
        data: officers,
        pagination: {
          current: Number(page),
          total: Math.ceil(total / limit),
          count: officers.length,
          totalRecords: total
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Toggle officer status
  static async toggleOfficerStatus(req, res, next) {
    try {
      const { id } = req.params

      const voter = await Voter.findById(id).populate("departmentId")
      if (!voter) {
        await AuditLog.logUserAction(
          "UPDATE_VOTER",
          { username: req.user?.username },
          `Failed to toggle officer status - Voter ID ${id} not found`,
          req
        )
        
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      if (!voter.isActive) {
        const error = new Error("Cannot modify officer status of inactive voter")
        error.statusCode = 400
        return next(error)
      }

      const wasOfficer = voter.isClassOfficer
      voter.isClassOfficer = !voter.isClassOfficer
      await voter.save()

      const actionType = voter.isClassOfficer ? "ACTIVATE_VOTER" : "DEACTIVATE_VOTER"
      const statusText = voter.isClassOfficer ? "made class officer" : "removed as class officer"
      
      await AuditLog.logVoterAction(
        actionType,
        voter,
        `Officer status updated - ${voter.firstName} ${voter.lastName} (${voter.schoolId}) ${statusText} by ${req.user.username}`,
        req
      )

      const updatedVoter = await Voter.findById(id)
        .populate("departmentId")
        .select("-password -faceEncoding -profilePicture")

      res.json({
        success: true,
        message: `Voter ${statusText} successfully`,
        data: updatedVoter,
        previousStatus: wasOfficer,
        currentStatus: voter.isClassOfficer
      })
    } catch (error) {
      next(error)
    }
  }

  // Get voter statistics by department
  static async getStatisticsByDepartment(req, res, next) {
    try {
      const statsByDepartment = await Voter.aggregate([
        {
          $lookup: {
            from: "departments",
            localField: "departmentId",
            foreignField: "_id",
            as: "department",
          },
        },
        {
          $unwind: { path: "$department", preserveNullAndEmptyArrays: true },
        },
        {
          $group: {
            _id: {
              departmentId: "$department._id",
              code: "$department.departmentCode",
              program: "$department.degreeProgram",
              college: "$department.college",
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
            byYearLevel: {
              $push: {
                yearLevel: "$yearLevel",
                isRegistered: "$isRegistered",
                isActive: "$isActive",
                isClassOfficer: "$isClassOfficer"
              }
            }
          },
        },
        {
          $sort: { "_id.code": 1 },
        },
      ])

      const departmentStats = {}
      statsByDepartment.forEach(stat => {
        const key = stat._id.code || 'Unknown Department'
        
        // Group by year level
        const yearLevelStats = {}
        stat.byYearLevel.forEach(student => {
          if (!yearLevelStats[student.yearLevel]) {
            yearLevelStats[student.yearLevel] = {
              total: 0,
              registered: 0,
              active: 0,
              officers: 0
            }
          }
          yearLevelStats[student.yearLevel].total += 1
          if (student.isRegistered) yearLevelStats[student.yearLevel].registered += 1
          if (student.isActive) yearLevelStats[student.yearLevel].active += 1
          if (student.isClassOfficer) yearLevelStats[student.yearLevel].officers += 1
        })
        
        departmentStats[key] = {
          total: stat.total,
          registered: stat.registered,
          active: stat.active,
          officers: stat.officers,
          byYearLevel: yearLevelStats,
          departmentInfo: {
            id: stat._id.departmentId,
            code: stat._id.code || 'N/A',
            program: stat._id.program || 'Unknown Program',
            college: stat._id.college || 'Unknown College'
          }
        }
      })

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        { username: req.user?.username },
        `Voter statistics by department accessed - ${Object.keys(departmentStats).length} departments`,
        req
      )

      res.json({
        success: true,
        data: departmentStats
      })
    } catch (error) {
      next(error)
    }
  }

  // Get single voter
  static async getVoter(req, res, next) {
    try {
      const { id } = req.params

      const voter = await Voter.findById(id)
        .populate("departmentId")
        .select("-password -faceEncoding -profilePicture")

      if (!voter) {
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

      await AuditLog.logVoterAction(
        "SYSTEM_ACCESS",
        voter,
        `Voter accessed - ${voter.firstName} ${voter.lastName} (${voter.schoolId})`,
        req
      )

      res.json({
        success: true,
        data: voter
      })
    } catch (error) {
      next(error)
    }
  }

  // Create new voter
  static async createVoter(req, res, next) {
    try {
      const { schoolId, firstName, middleName, lastName, birthdate, departmentId, yearLevel, email } = req.body

      // Validation
      if (!schoolId || !firstName || !lastName || !birthdate || !departmentId || !yearLevel || !email) {
        const error = new Error("Required fields are missing")
        error.statusCode = 400
        return next(error)
      }

      const schoolIdNumber = Number(schoolId)
      if (isNaN(schoolIdNumber)) {
        const error = new Error("Invalid School ID format")
        error.statusCode = 400
        return next(error)
      }

      const yearLevelNumber = Number(yearLevel)
      if (isNaN(yearLevelNumber) || yearLevelNumber < 1 || yearLevelNumber > 4) {
        const error = new Error("Year level must be between 1 and 4")
        error.statusCode = 400
        return next(error)
      }

      // Check if voter already exists
      const existingVoter = await Voter.findOne({ schoolId: schoolIdNumber })
      if (existingVoter) {
        await AuditLog.logUserAction(
          "CREATE_VOTER",
          { username: req.user?.username },
          `Failed to create voter - School ID ${schoolIdNumber} already exists`,
          req
        )
        
        const error = new Error("Voter with this school ID already exists")
        error.statusCode = 409
        return next(error)
      }

      const existingEmail = await Voter.findOne({ email })
      if (existingEmail) {
        await AuditLog.logUserAction(
          "CREATE_VOTER",
          { username: req.user?.username },
          `Failed to create voter - Email ${email} already exists`,
          req
        )
        
        const error = new Error("Email already exists")
        error.statusCode = 409
        return next(error)
      }

      const department = await Department.findById(departmentId)
      if (!department) {
        const error = new Error("Invalid department ID")
        error.statusCode = 400
        return next(error)
      }

      const voter = new Voter({
        schoolId: schoolIdNumber,
        firstName,
        middleName,
        lastName,
        birthdate: new Date(birthdate),
        departmentId,
        yearLevel: yearLevelNumber,
        email,
        isActive: true,
        isRegistered: false,
        isClassOfficer: false,
        isPasswordActive: false
      })

      await voter.save()

      await AuditLog.logUserAction(
        "CREATE_VOTER",
        { username: req.user?.username, userId: req.user?.userId },
        `Voter created - ${firstName} ${lastName} (${schoolIdNumber}) - ${department.departmentCode}, Year ${yearLevelNumber}`,
        req
      )

      const populatedVoter = await Voter.findById(voter._id)
        .populate("departmentId")
        .select("-password -faceEncoding -profilePicture")

      res.status(201).json({
        success: true,
        message: "Voter created successfully",
        data: populatedVoter
      })
    } catch (error) {
      next(error)
    }
  }

  // Update voter
  static async updateVoter(req, res, next) {
    try {
      const { id } = req.params
      const { schoolId, firstName, middleName, lastName, birthdate, departmentId, yearLevel, email } = req.body

      const voter = await Voter.findById(id).populate("departmentId")
      if (!voter) {
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
          error.statusCode = 409
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
          error.statusCode = 409
          return next(error)
        }
        updateDetails.push(`Email changed from ${voter.email} to ${email}`)
      }

      // Verify department exists if provided
      let newDepartment = null
      if (departmentId && departmentId !== voter.departmentId.toString()) {
        newDepartment = await Department.findById(departmentId)
        if (!newDepartment) {
          const error = new Error("Invalid department ID")
          error.statusCode = 400
          return next(error)
        }
        updateDetails.push(`Department changed from ${voter.departmentId.departmentCode} to ${newDepartment.departmentCode}`)
      }

      // Validate year level
      if (yearLevel) {
        const yearLevelNumber = Number(yearLevel)
        if (isNaN(yearLevelNumber) || yearLevelNumber < 1 || yearLevelNumber > 4) {
          const error = new Error("Year level must be between 1 and 4")
          error.statusCode = 400
          return next(error)
        }
        if (yearLevelNumber !== voter.yearLevel) {
          updateDetails.push(`Year level changed from ${voter.yearLevel} to ${yearLevelNumber}`)
        }
      }

      // Update voter
      const updateData = {}
      if (schoolId) updateData.schoolId = Number(schoolId)
      if (firstName) updateData.firstName = firstName
      if (middleName !== undefined) updateData.middleName = middleName
      if (lastName) updateData.lastName = lastName
      if (birthdate) updateData.birthdate = new Date(birthdate)
      if (departmentId) updateData.departmentId = departmentId
      if (yearLevel) updateData.yearLevel = Number(yearLevel)
      if (email) updateData.email = email

      const updatedVoter = await Voter.findByIdAndUpdate(id, updateData, { new: true })
        .populate("departmentId")
        .select("-password -faceEncoding -profilePicture")

      const detailsString = updateDetails.length > 0 
        ? `Voter updated - ${updatedVoter.firstName} ${updatedVoter.lastName} (${updatedVoter.schoolId}): ${updateDetails.join(', ')}`
        : `Voter updated - ${updatedVoter.firstName} ${updatedVoter.lastName} (${updatedVoter.schoolId})`

      await AuditLog.logUserAction(
        "UPDATE_VOTER",
        { username: req.user?.username, userId: req.user?.userId },
        detailsString,
        req
      )

      res.json({
        success: true,
        message: "Voter updated successfully",
        data: updatedVoter
      })
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

      voter.isActive = false
      voter.isPasswordActive = false
      await voter.save()

      await AuditLog.logVoterAction(
        "DEACTIVATE_VOTER",
        voter,
        `Voter deactivated - ${voter.firstName} ${voter.lastName} (${voter.schoolId})`,
        req
      )

      res.json({
        success: true,
        message: "Voter deactivated successfully",
        data: {
          id: voter._id,
          schoolId: voter.schoolId,
          firstName: voter.firstName,
          lastName: voter.lastName,
          isActive: voter.isActive,
          isPasswordActive: voter.isPasswordActive,
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Delete voter
  static async deleteVoter(req, res, next) {
    try {
      const { id } = req.params

      const voter = await Voter.findById(id).populate("departmentId")
      if (!voter) {
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

      const voterInfo = `${voter.firstName} ${voter.lastName} (${voter.schoolId}) - ${voter.departmentId?.departmentCode || 'Unknown Department'}, Year ${voter.yearLevel}`

      await Voter.findByIdAndDelete(id)

      await AuditLog.logUserAction(
        "DELETE_VOTER",
        { username: req.user?.username, userId: req.user?.userId },
        `Voter deleted - ${voterInfo}`,
        req
      )

      res.json({
        success: true,
        message: "Voter deleted successfully"
      })
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
      const classOfficers = await Voter.countDocuments({ isClassOfficer: true, isActive: true })

      // Statistics by department
      const byDepartment = await Voter.aggregate([
        {
          $lookup: {
            from: "departments",
            localField: "departmentId",
            foreignField: "_id",
            as: "department",
          },
        },
        {
          $unwind: { path: "$department", preserveNullAndEmptyArrays: true },
        },
        {
          $group: {
            _id: {
              code: "$department.departmentCode",
              program: "$department.degreeProgram",
              college: "$department.college",
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
          $sort: { "_id.code": 1 },
        },
      ])

      const registrationRate = total > 0 ? Math.round((registered / total) * 100) : 0

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        { username: req.user?.username },
        `Voter statistics accessed - Total: ${total}, Registered: ${registered}, Active: ${active}, Registration Rate: ${registrationRate}%`,
        req
      )

      res.json({
        success: true,
        data: {
          total,
          registered,
          unregistered: total - registered,
          active,
          inactive: total - active,
          classOfficers,
          registrationRate,
          byDepartment,
        }
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = VoterController