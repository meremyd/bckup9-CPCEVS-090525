const mongoose = require("mongoose")
const Degree = require("../models/Degree")
const Voter = require("../models/Voter")
const AuditLog = require("../models/AuditLog")

class DegreeController {
  // Get all degrees
  static async getAllDegrees(req, res, next) {
    try {
      const { department, search, page = 1, limit = 50 } = req.query

      // Build filter
      const filter = {}
      if (department) filter.department = department
      if (search) {
        filter.$or = [
          { degreeCode: { $regex: search, $options: "i" } },
          { degreeName: { $regex: search, $options: "i" } },
          { department: { $regex: search, $options: "i" } },
          { major: { $regex: search, $options: "i" } }
        ]
      }

      // Pagination
      const skip = (page - 1) * limit
      const limitNum = Math.min(Number.parseInt(limit), 100) // Max 100 items per page

      const degrees = await Degree.find(filter)
        .sort({ degreeCode: 1, major: 1 })
        .skip(skip)
        .limit(limitNum)
      
      const total = await Degree.countDocuments(filter)
      const totalPages = Math.ceil(total / limitNum)
      
      // Transform degrees to include displayName for frontend
      const transformedDegrees = degrees.map(degree => ({
        ...degree.toObject(),
        displayName: degree.major ? `${degree.degreeName} - ${degree.major}` : degree.degreeName
      }))
      
      // Log the access using proper static method
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Degrees list accessed - ${degrees.length} degrees returned`,
        req
      )
      
      res.json({
        degrees: transformedDegrees,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get single degree
  static async getDegree(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid degree ID format")
        error.statusCode = 400
        return next(error)
      }

      const degree = await Degree.findById(id)
      if (!degree) {
        const error = new Error("Degree not found")
        error.statusCode = 404
        return next(error)
      }

      // Get voter count for this degree
      const voterCount = await Voter.countDocuments({ degreeId: id })
      const registeredCount = await Voter.countDocuments({ 
        degreeId: id, 
        isRegistered: true 
      })
      const activeCount = await Voter.countDocuments({ 
        degreeId: id, 
        isActive: true 
      })

      const degreeObject = degree.toObject()
      res.json({
        ...degreeObject,
        displayName: degree.major ? `${degree.degreeName} - ${degree.major}` : degree.degreeName,
        statistics: {
          totalVoters: voterCount,
          registeredVoters: registeredCount,
          unregisteredVoters: voterCount - registeredCount,
          activeVoters: activeCount,
          inactiveVoters: voterCount - activeCount,
          registrationRate: voterCount > 0 ? ((registeredCount / voterCount) * 100).toFixed(2) : 0
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Create new degree
  static async createDegree(req, res, next) {
    try {
      const { degreeCode, degreeName, department, major } = req.body

      // Validation
      if (!degreeCode || !degreeName || !department) {
        const error = new Error("Degree code, name, and department are required")
        error.statusCode = 400
        return next(error)
      }

      // Trim and validate inputs
      const trimmedDegreeCode = degreeCode.trim().toUpperCase()
      const trimmedDegreeName = degreeName.trim()
      const trimmedDepartment = department.trim()
      const trimmedMajor = major ? major.trim() : null

      if (trimmedDegreeCode.length < 2) {
        const error = new Error("Degree code must be at least 2 characters long")
        error.statusCode = 400
        return next(error)
      }

      if (trimmedDegreeName.length < 3) {
        const error = new Error("Degree name must be at least 3 characters long")
        error.statusCode = 400
        return next(error)
      }

      if (trimmedDepartment.length < 3) {
        const error = new Error("Department must be at least 3 characters long")
        error.statusCode = 400
        return next(error)
      }

      // Check for existing degree with same code and major combination
      const existingDegree = await Degree.findOne({ 
        degreeCode: trimmedDegreeCode, 
        major: trimmedMajor 
      })
      if (existingDegree) {
        const error = new Error("Degree with this code and major combination already exists")
        error.statusCode = 400
        return next(error)
      }

      const degree = new Degree({
        degreeCode: trimmedDegreeCode,
        degreeName: trimmedDegreeName,
        department: trimmedDepartment,
        major: trimmedMajor,
      })

      await degree.save()

      // Log the creation using proper action and method
      await AuditLog.logUserAction(
        "CREATE_DEGREE",
        req.user,
        `Degree created - ${trimmedDegreeCode}${trimmedMajor ? ` (${trimmedMajor})` : ""} - ${trimmedDegreeName}`,
        req
      )

      // Return degree with displayName
      const degreeObject = degree.toObject()
      res.status(201).json({
        ...degreeObject,
        displayName: degree.major ? `${degree.degreeName} - ${degree.major}` : degree.degreeName
      })
    } catch (error) {
      // Handle duplicate key errors
      if (error.code === 11000) {
        error.message = "Degree with this code and major combination already exists"
        error.statusCode = 400
      }
      // Handle validation errors from pre-save hook
      if (error.message === 'Degree name must be unique') {
        error.statusCode = 400
      }
      next(error)
    }
  }

  // Update degree
  static async updateDegree(req, res, next) {
    try {
      const { id } = req.params
      const { degreeCode, degreeName, department, major } = req.body

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid degree ID format")
        error.statusCode = 400
        return next(error)
      }

      const degree = await Degree.findById(id)
      if (!degree) {
        const error = new Error("Degree not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if degree has associated voters
      const voterCount = await Voter.countDocuments({ degreeId: id })
      
      // Store original values for logging
      const originalData = {
        degreeCode: degree.degreeCode,
        degreeName: degree.degreeName,
        major: degree.major
      }
      
      // Prepare update fields with validation
      const updateFields = {}
      
      if (degreeCode !== undefined) {
        const trimmedCode = degreeCode.trim().toUpperCase()
        if (trimmedCode.length < 2) {
          const error = new Error("Degree code must be at least 2 characters long")
          error.statusCode = 400
          return next(error)
        }
        updateFields.degreeCode = trimmedCode
      }
      
      if (degreeName !== undefined) {
        const trimmedName = degreeName.trim()
        if (trimmedName.length < 3) {
          const error = new Error("Degree name must be at least 3 characters long")
          error.statusCode = 400
          return next(error)
        }
        updateFields.degreeName = trimmedName
      }
      
      if (department !== undefined) {
        const trimmedDept = department.trim()
        if (trimmedDept.length < 3) {
          const error = new Error("Department must be at least 3 characters long")
          error.statusCode = 400
          return next(error)
        }
        updateFields.department = trimmedDept
      }
      
      if (major !== undefined) {
        updateFields.major = major ? major.trim() : null
      }

      // Check for existing degree with same code and major combination (excluding current)
      if (updateFields.degreeCode !== undefined || updateFields.major !== undefined) {
        const checkCode = updateFields.degreeCode || degree.degreeCode
        const checkMajor = updateFields.major !== undefined ? updateFields.major : degree.major
        
        const existingDegree = await Degree.findOne({ 
          degreeCode: checkCode, 
          major: checkMajor, 
          _id: { $ne: id } 
        })
        
        if (existingDegree) {
          const error = new Error("Degree with this code and major combination already exists")
          error.statusCode = 400
          return next(error)
        }
      }

      // Apply updates
      Object.assign(degree, updateFields)
      await degree.save()

      // Log the update using proper action and method
      await AuditLog.logUserAction(
        "UPDATE_DEGREE",
        req.user,
        `Degree updated from "${originalData.degreeCode}${originalData.major ? ` (${originalData.major})` : ""}" to "${degree.degreeCode}${degree.major ? ` (${degree.major})` : ""}" - ${degree.degreeName}${voterCount > 0 ? ` (${voterCount} voters affected)` : ""}`,
        req
      )

      // Return updated degree with displayName
      const degreeObject = degree.toObject()
      res.json({
        ...degreeObject,
        displayName: degree.major ? `${degree.degreeName} - ${degree.major}` : degree.degreeName
      })
    } catch (error) {
      // Handle duplicate key errors
      if (error.code === 11000) {
        error.message = "Degree with this code and major combination already exists"
        error.statusCode = 400
      }
      // Handle validation errors from pre-save hook
      if (error.message === 'Degree name must be unique') {
        error.statusCode = 400
      }
      next(error)
    }
  }

  // Delete degree
  static async deleteDegree(req, res, next) {
    try {
      const { id } = req.params
      const { force = false } = req.query

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid degree ID format")
        error.statusCode = 400
        return next(error)
      }

      const degree = await Degree.findById(id)
      if (!degree) {
        const error = new Error("Degree not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if degree has associated voters
      const voterCount = await Voter.countDocuments({ degreeId: id })
      if (voterCount > 0 && force !== 'true') {
        const error = new Error(`Cannot delete degree. ${voterCount} voters are associated with this degree. Use ?force=true to delete anyway (this will orphan voter records).`)
        error.statusCode = 400
        return next(error)
      }

      // Store degree info for logging before deletion
      const degreeInfo = {
        degreeCode: degree.degreeCode,
        degreeName: degree.degreeName,
        major: degree.major
      }

      // Delete the degree
      await Degree.findByIdAndDelete(id)

      // If force delete and voters exist, log warning about orphaned records
      if (voterCount > 0 && force === 'true') {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Force delete degree - ${voterCount} voter records now have invalid degreeId references`,
          req
        )
      }

      // Log the deletion using proper action and method
      await AuditLog.logUserAction(
        "DELETE_DEGREE",
        req.user,
        `Degree deleted - ${degreeInfo.degreeCode}${degreeInfo.major ? ` (${degreeInfo.major})` : ""} - ${degreeInfo.degreeName}${voterCount > 0 ? ` (${voterCount} voters were associated)` : ""}`,
        req
      )

      res.json({ 
        message: "Degree deleted successfully",
        warning: voterCount > 0 ? `${voterCount} voter records now have invalid degree references and may need manual cleanup` : null
      })
    } catch (error) {
      next(error)
    }
  }

  // Get degree statistics
  static async getDegreeStatistics(req, res, next) {
    try {
      const total = await Degree.countDocuments()
      
      // Statistics by department
      const byDepartment = await Degree.aggregate([
        {
          $group: {
            _id: "$department",
            count: { $sum: 1 },
            degrees: { 
              $push: {
                id: "$_id",
                code: "$degreeCode",
                name: "$degreeName",
                major: "$major"
              }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ])

      // Degrees with majors vs without
      const majorStats = await Degree.aggregate([
        {
          $group: {
            _id: { 
              hasMajor: { $ne: ["$major", null] }
            },
            count: { $sum: 1 }
          }
        }
      ])

      // Get voter statistics per degree
      const voterStats = await Voter.aggregate([
        {
          $lookup: {
            from: "degrees",
            localField: "degreeId",
            foreignField: "_id",
            as: "degree"
          }
        },
        {
          $unwind: {
            path: "$degree",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: {
              id: "$degree._id",
              code: "$degree.degreeCode",
              name: "$degree.degreeName",
              major: "$degree.major",
              department: "$degree.department"
            },
            totalVoters: { $sum: 1 },
            registeredVoters: {
              $sum: {
                $cond: ["$isRegistered", 1, 0]
              }
            },
            activeVoters: {
              $sum: {
                $cond: ["$isActive", 1, 0]
              }
            }
          }
        },
        {
          $match: {
            "_id.id": { $ne: null }
          }
        },
        {
          $sort: { "_id.code": 1, "_id.major": 1 }
        }
      ])

      // Check for orphaned voters (voters without valid degree references)
      const orphanedVoters = await Voter.aggregate([
        {
          $lookup: {
            from: "degrees",
            localField: "degreeId",
            foreignField: "_id",
            as: "degree"
          }
        },
        {
          $match: {
            degree: { $size: 0 }
          }
        },
        {
          $count: "orphanedCount"
        }
      ])

      const orphanedCount = orphanedVoters.length > 0 ? orphanedVoters[0].orphanedCount : 0

      // Log statistics access
      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user,
        "Retrieved degree statistics",
        req
      )

      res.json({
        overview: {
          totalDegrees: total,
          totalDepartments: byDepartment.length,
          degreesWithMajors: majorStats.find(stat => stat._id.hasMajor === true)?.count || 0,
          degreesWithoutMajors: majorStats.find(stat => stat._id.hasMajor === false)?.count || 0,
          orphanedVoters: orphanedCount
        },
        byDepartment,
        voterStatistics: voterStats
      })
    } catch (error) {
      next(error)
    }
  }

  // Get unique departments
  static async getDepartments(req, res, next) {
    try {
      const departments = await Degree.distinct("department")
      res.json(departments.sort())
    } catch (error) {
      next(error)
    }
  }

  // Bulk operations
  static async bulkCreateDegrees(req, res, next) {
    try {
      const { degrees } = req.body

      if (!Array.isArray(degrees) || degrees.length === 0) {
        const error = new Error("Degrees array is required and must not be empty")
        error.statusCode = 400
        return next(error)
      }

      if (degrees.length > 100) {
        const error = new Error("Cannot create more than 100 degrees at once")
        error.statusCode = 400
        return next(error)
      }

      // Validate each degree
      const validatedDegrees = []
      const errors = []

      for (let i = 0; i < degrees.length; i++) {
        const degree = degrees[i]
        try {
          if (!degree.degreeCode || !degree.degreeName || !degree.department) {
            throw new Error(`Degree at index ${i}: degreeCode, degreeName, and department are required`)
          }

          const trimmedDegreeCode = degree.degreeCode.trim().toUpperCase()
          const trimmedDegreeName = degree.degreeName.trim()
          const trimmedDepartment = degree.department.trim()
          const trimmedMajor = degree.major ? degree.major.trim() : null

          if (trimmedDegreeCode.length < 2) {
            throw new Error(`Degree at index ${i}: degreeCode must be at least 2 characters long`)
          }

          if (trimmedDegreeName.length < 3) {
            throw new Error(`Degree at index ${i}: degreeName must be at least 3 characters long`)
          }

          if (trimmedDepartment.length < 3) {
            throw new Error(`Degree at index ${i}: department must be at least 3 characters long`)
          }

          validatedDegrees.push({
            degreeCode: trimmedDegreeCode,
            degreeName: trimmedDegreeName,
            department: trimmedDepartment,
            major: trimmedMajor
          })
        } catch (validationError) {
          errors.push(validationError.message)
        }
      }

      if (errors.length > 0) {
        const error = new Error(`Validation errors: ${errors.join('; ')}`)
        error.statusCode = 400
        return next(error)
      }

      // Check for duplicates within the batch
      const seenCombinations = new Set()
      for (const degree of validatedDegrees) {
        const combination = `${degree.degreeCode}|${degree.major || ''}`
        if (seenCombinations.has(combination)) {
          const error = new Error(`Duplicate degree code and major combination in batch: ${degree.degreeCode}${degree.major ? ` - ${degree.major}` : ''}`)
          error.statusCode = 400
          return next(error)
        }
        seenCombinations.add(combination)
      }

      const createdDegrees = await Degree.insertMany(validatedDegrees, { ordered: false })

      // Transform degrees to include displayName
      const transformedDegrees = createdDegrees.map(degree => ({
        ...degree.toObject(),
        displayName: degree.major ? `${degree.degreeName} - ${degree.major}` : degree.degreeName
      }))

      // Log the bulk creation using proper action and method
      await AuditLog.logUserAction(
        "CREATE_DEGREE",
        req.user,
        `Bulk created ${createdDegrees.length} degrees`,
        req
      )

      res.status(201).json({
        message: `Successfully created ${createdDegrees.length} degrees`,
        count: createdDegrees.length,
        degrees: transformedDegrees
      })
    } catch (error) {
      // Handle bulk insert errors
      if (error.code === 11000) {
        error.message = "One or more degrees have duplicate code and major combinations with existing records"
        error.statusCode = 400
      }
      next(error)
    }
  }

  // Search degrees with advanced filtering
  static async searchDegrees(req, res, next) {
    try {
      const { 
        query, 
        department, 
        hasMajor,
        minVoters,
        maxVoters,
        page = 1, 
        limit = 20 
      } = req.query

      const filter = {}
      
      if (query) {
        filter.$or = [
          { degreeCode: { $regex: query, $options: "i" } },
          { degreeName: { $regex: query, $options: "i" } },
          { department: { $regex: query, $options: "i" } },
          { major: { $regex: query, $options: "i" } }
        ]
      }
      
      if (department) {
        filter.department = { $regex: department, $options: "i" }
      }
      
      if (hasMajor !== undefined) {
        filter.major = hasMajor === 'true' ? { $ne: null } : null
      }

      const skip = (page - 1) * limit
      const limitNum = Math.min(Number.parseInt(limit), 50)

      let pipeline = [
        { $match: filter },
        {
          $lookup: {
            from: "voters",
            localField: "_id",
            foreignField: "degreeId",
            as: "voters"
          }
        },
        {
          $addFields: {
            voterCount: { $size: "$voters" },
            displayName: {
              $cond: {
                if: { $ne: ["$major", null] },
                then: { $concat: ["$degreeName", " - ", "$major"] },
                else: "$degreeName"
              }
            }
          }
        }
      ]

      // Add voter count filtering if specified
      if (minVoters !== undefined || maxVoters !== undefined) {
        const voterFilter = {}
        if (minVoters !== undefined) voterFilter.$gte = parseInt(minVoters)
        if (maxVoters !== undefined) voterFilter.$lte = parseInt(maxVoters)
        pipeline.push({ $match: { voterCount: voterFilter } })
      }

      pipeline.push(
        { $sort: { degreeCode: 1, major: 1 } },
        { $skip: skip },
        { $limit: limitNum },
        {
          $project: {
            voters: 0 // Remove voters array from response for performance
          }
        }
      )

      const degrees = await Degree.aggregate(pipeline)
      
      // Get total count for pagination
      const countPipeline = pipeline.slice(0, -3) // Remove skip, limit, and project stages
      countPipeline.push({ $count: "total" })
      const countResult = await Degree.aggregate(countPipeline)
      const total = countResult.length > 0 ? countResult[0].total : 0

      res.json({
        degrees,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        }
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = DegreeController