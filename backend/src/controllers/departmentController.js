const mongoose = require("mongoose")
const Department = require("../models/Department")
const Voter = require("../models/Voter")
const AuditLog = require("../models/AuditLog")

class DepartmentController {
  // Get all departments
  static async getAllDepartments(req, res, next) {
    try {
      const { college, search, page = 1, limit = 50 } = req.query

      // Build filter
      const filter = {}
      if (college) filter.college = college
      if (search) {
        filter.$or = [
          { departmentCode: { $regex: search, $options: "i" } },
          { degreeProgram: { $regex: search, $options: "i" } },
          { college: { $regex: search, $options: "i" } }
        ]
      }

      // Pagination
      const skip = (page - 1) * limit
      const limitNum = Math.min(Number.parseInt(limit), 100) // Max 100 items per page

      const departments = await Department.find(filter)
        .sort({ college: 1, departmentCode: 1 })
        .skip(skip)
        .limit(limitNum)
      
      const total = await Department.countDocuments(filter)
      const totalPages = Math.ceil(total / limitNum)
      
      // Log the access using proper static method
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user || { username: "anonymous" },
        `Departments list accessed - ${departments.length} departments returned`,
        req
      )
      
      res.json({
        departments,
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

  // UPDATED: Get departments by department code (handles multiple degree programs per code)
  static async getDepartmentByCode(req, res, next) {
    try {
      const { code } = req.params

      if (!code || code.trim().length === 0) {
        const error = new Error("Department code is required")
        error.statusCode = 400
        return next(error)
      }

      const departmentCode = code.trim().toUpperCase()

      // Find ALL departments with this code
      const departments = await Department.find({ departmentCode })
        .select('departmentCode degreeProgram college')
        .sort({ college: 1, degreeProgram: 1 })

      if (!departments || departments.length === 0) {
        const error = new Error("Department code not found")
        error.statusCode = 404
        return next(error)
      }

      // Group by college and collect degree programs
      const departmentInfo = {
        departmentCode: departmentCode,
        colleges: []
      }

      const collegeMap = new Map()

      departments.forEach(dept => {
        if (!collegeMap.has(dept.college)) {
          collegeMap.set(dept.college, {
            college: dept.college,
            degreePrograms: []
          })
        }
        collegeMap.get(dept.college).degreePrograms.push(dept.degreeProgram)
      })

      departmentInfo.colleges = Array.from(collegeMap.values())
      departmentInfo.totalPrograms = departments.length

      // Log department access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user || { username: "anonymous" },
        `Department accessed by code - ${departmentCode} (${departments.length} programs found)`,
        req
      )

      res.json(departmentInfo)
    } catch (error) {
      next(error)
    }
  }

  // Get single department
  static async getDepartment(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid department ID format")
        error.statusCode = 400
        return next(error)
      }

      const department = await Department.findById(id)
      if (!department) {
        const error = new Error("Department not found")
        error.statusCode = 404
        return next(error)
      }

      // Get voter count for this department
      const voterCount = await Voter.countDocuments({ departmentId: id })
      const registeredCount = await Voter.countDocuments({ 
        departmentId: id, 
        isRegistered: true 
      })
      const activeCount = await Voter.countDocuments({ 
        departmentId: id, 
        isActive: true 
      })
      const classOfficerCount = await Voter.countDocuments({ 
        departmentId: id, 
        isClassOfficer: true 
      })

      // Log department access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user || { username: "anonymous" },
        `Department details accessed - ${department.departmentCode} (${department.degreeProgram})`,
        req
      )

      const departmentObject = department.toObject()
      res.json({
        ...departmentObject,
        statistics: {
          totalVoters: voterCount,
          registeredVoters: registeredCount,
          unregisteredVoters: voterCount - registeredCount,
          activeVoters: activeCount,
          inactiveVoters: voterCount - activeCount,
          classOfficers: classOfficerCount,
          registrationRate: voterCount > 0 ? ((registeredCount / voterCount) * 100).toFixed(2) : 0
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Create new department
  static async createDepartment(req, res, next) {
    try {
      const { departmentCode, degreeProgram, college } = req.body

      // Validation
      if (!departmentCode || !degreeProgram || !college) {
        const error = new Error("Department code, degree program, and college are required")
        error.statusCode = 400
        return next(error)
      }

      // Trim and validate inputs
      const trimmedDepartmentCode = departmentCode.trim().toUpperCase()
      const trimmedDegreeProgram = degreeProgram.trim()
      const trimmedCollege = college.trim()

      if (trimmedDepartmentCode.length < 2) {
        const error = new Error("Department code must be at least 2 characters long")
        error.statusCode = 400
        return next(error)
      }

      if (trimmedDegreeProgram.length < 3) {
        const error = new Error("Degree program must be at least 3 characters long")
        error.statusCode = 400
        return next(error)
      }

      if (trimmedCollege.length < 3) {
        const error = new Error("College must be at least 3 characters long")
        error.statusCode = 400
        return next(error)
      }

      // Check for existing degree program and college combination
      const existingDegreeCollege = await Department.findOne({ 
        degreeProgram: trimmedDegreeProgram,
        college: trimmedCollege
      })
      if (existingDegreeCollege) {
        const error = new Error("Department with this degree program and college combination already exists")
        error.statusCode = 400
        return next(error)
      }

      const department = new Department({
        departmentCode: trimmedDepartmentCode,
        degreeProgram: trimmedDegreeProgram,
        college: trimmedCollege
      })

      await department.save()

      // Log the creation
      await AuditLog.logUserAction(
        "CREATE_DEPARTMENT",
        req.user || { username: "system" },
        `Department created - ${trimmedDepartmentCode} - ${trimmedDegreeProgram} (${trimmedCollege})`,
        req
      )

      res.status(201).json(department.toObject())
    } catch (error) {
      // Handle duplicate key errors
      if (error.code === 11000) {
        if (error.keyPattern?.degreeProgram && error.keyPattern?.college) {
          error.message = "Department with this degree program and college combination already exists"
        } else {
          error.message = "Department with this information already exists"
        }
        error.statusCode = 400
      }
      next(error)
    }
  }

  // Update department
  static async updateDepartment(req, res, next) {
    try {
      const { id } = req.params
      const { departmentCode, degreeProgram, college } = req.body

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid department ID format")
        error.statusCode = 400
        return next(error)
      }

      const department = await Department.findById(id)
      if (!department) {
        const error = new Error("Department not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if department has associated voters
      const voterCount = await Voter.countDocuments({ departmentId: id })
      
      // Store original values for logging
      const originalData = {
        departmentCode: department.departmentCode,
        degreeProgram: department.degreeProgram,
        college: department.college
      }
      
      // Prepare update fields with validation
      const updateFields = {}
      
      if (departmentCode !== undefined) {
        const trimmedCode = departmentCode.trim().toUpperCase()
        if (trimmedCode.length < 2) {
          const error = new Error("Department code must be at least 2 characters long")
          error.statusCode = 400
          return next(error)
        }
        updateFields.departmentCode = trimmedCode
      }
      
      if (degreeProgram !== undefined) {
        const trimmedProgram = degreeProgram.trim()
        if (trimmedProgram.length < 3) {
          const error = new Error("Degree program must be at least 3 characters long")
          error.statusCode = 400
          return next(error)
        }
        updateFields.degreeProgram = trimmedProgram
      }
      
      if (college !== undefined) {
        const trimmedCollege = college.trim()
        if (trimmedCollege.length < 3) {
          const error = new Error("College must be at least 3 characters long")
          error.statusCode = 400
          return next(error)
        }
        updateFields.college = trimmedCollege
      }

      // Check for existing degree program and college combination (excluding current)
      if (updateFields.degreeProgram !== undefined || updateFields.college !== undefined) {
        const checkProgram = updateFields.degreeProgram || department.degreeProgram
        const checkCollege = updateFields.college || department.college
        
        const existingDegreeCollege = await Department.findOne({ 
          degreeProgram: checkProgram,
          college: checkCollege,
          _id: { $ne: id } 
        })
        
        if (existingDegreeCollege) {
          const error = new Error("Department with this degree program and college combination already exists")
          error.statusCode = 400
          return next(error)
        }
      }

      // Apply updates
      Object.assign(department, updateFields)
      await department.save()

      // Log the update
      await AuditLog.logUserAction(
        "UPDATE_DEPARTMENT",
        req.user || { username: "system" },
        `Department updated from "${originalData.departmentCode} - ${originalData.degreeProgram} (${originalData.college})" to "${department.departmentCode} - ${department.degreeProgram} (${department.college})"${voterCount > 0 ? ` (${voterCount} voters affected)` : ""}`,
        req
      )

      res.json(department.toObject())
    } catch (error) {
      // Handle duplicate key errors
      if (error.code === 11000) {
        if (error.keyPattern?.degreeProgram && error.keyPattern?.college) {
          error.message = "Department with this degree program and college combination already exists"
        } else {
          error.message = "Department with this information already exists"
        }
        error.statusCode = 400
      }
      next(error)
    }
  }

  // Delete department
  static async deleteDepartment(req, res, next) {
    try {
      const { id } = req.params
      const { force = false } = req.query

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid department ID format")
        error.statusCode = 400
        return next(error)
      }

      const department = await Department.findById(id)
      if (!department) {
        const error = new Error("Department not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if department has associated voters
      const voterCount = await Voter.countDocuments({ departmentId: id })
      if (voterCount > 0 && force !== 'true') {
        const error = new Error(`Cannot delete department. ${voterCount} voters are associated with this department. Use ?force=true to delete anyway (this will orphan voter records).`)
        error.statusCode = 400
        return next(error)
      }

      // Store department info for logging before deletion
      const departmentInfo = {
        departmentCode: department.departmentCode,
        degreeProgram: department.degreeProgram,
        college: department.college
      }

      // Delete the department
      await Department.findByIdAndDelete(id)

      // If force delete and voters exist, log warning about orphaned records
      if (voterCount > 0 && force === 'true') {
        await AuditLog.logUserAction(
          "DATA_EXPORT",
          req.user || { username: "system" },
          `Force delete department - ${voterCount} voter records now have invalid departmentId references`,
          req
        )
      }

      // Log the deletion
      await AuditLog.logUserAction(
        "DELETE_DEPARTMENT",
        req.user || { username: "system" },
        `Department deleted - ${departmentInfo.departmentCode} - ${departmentInfo.degreeProgram} (${departmentInfo.college})${voterCount > 0 ? ` (${voterCount} voters were associated)` : ""}`,
        req
      )

      res.json({ 
        message: "Department deleted successfully",
        warning: voterCount > 0 ? `${voterCount} voter records now have invalid department references and may need manual cleanup` : null
      })
    } catch (error) {
      next(error)
    }
  }

  // Get department statistics
  static async getDepartmentStatistics(req, res, next) {
    try {
      const total = await Department.countDocuments()
      
      // Statistics by college
      const byCollege = await Department.aggregate([
        {
          $group: {
            _id: "$college",
            count: { $sum: 1 },
            departments: { 
              $push: {
                id: "$_id",
                code: "$departmentCode",
                degreeProgram: "$degreeProgram"
              }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ])

      // Get voter statistics per department
      const voterStats = await Voter.aggregate([
        {
          $lookup: {
            from: "departments",
            localField: "departmentId",
            foreignField: "_id",
            as: "department"
          }
        },
        {
          $unwind: {
            path: "$department",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: {
              id: "$department._id",
              code: "$department.departmentCode",
              degreeProgram: "$department.degreeProgram",
              college: "$department.college"
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
            },
            classOfficers: {
              $sum: {
                $cond: ["$isClassOfficer", 1, 0]
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
          $sort: { "_id.college": 1, "_id.code": 1 }
        }
      ])

      // Check for orphaned voters (voters without valid department references)
      const orphanedVoters = await Voter.aggregate([
        {
          $lookup: {
            from: "departments",
            localField: "departmentId",
            foreignField: "_id",
            as: "department"
          }
        },
        {
          $match: {
            department: { $size: 0 }
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
        req.user || { username: "system" },
        "Retrieved department statistics",
        req
      )

      res.json({
        overview: {
          totalDepartments: total,
          totalColleges: byCollege.length,
          orphanedVoters: orphanedCount
        },
        byCollege,
        voterStatistics: voterStats
      })
    } catch (error) {
      next(error)
    }
  }

  // UPDATED: Get unique colleges with additional info
  static async getColleges(req, res, next) {
    try {
      const { includeStats = false } = req.query

      let colleges
      
      if (includeStats === 'true') {
        // Get colleges with department counts and voter statistics
        colleges = await Department.aggregate([
          {
            $lookup: {
              from: "voters",
              localField: "_id",
              foreignField: "departmentId",
              as: "voters"
            }
          },
          {
            $group: {
              _id: "$college",
              departmentCount: { $sum: 1 },
              totalVoters: { $sum: { $size: "$voters" } },
              registeredVoters: {
                $sum: {
                  $size: {
                    $filter: {
                      input: "$voters",
                      cond: { $eq: ["$$this.isRegistered", true] }
                    }
                  }
                }
              },
              departmentCodes: { $addToSet: "$departmentCode" },
              degreePrograms: { $addToSet: "$degreeProgram" }
            }
          },
          {
            $sort: { _id: 1 }
          },
          {
            $project: {
              college: "$_id",
              departmentCount: 1,
              totalVoters: 1,
              registeredVoters: 1,
              uniqueDepartmentCodes: { $size: "$departmentCodes" },
              totalDegreePrograms: { $size: "$degreePrograms" },
              _id: 0
            }
          }
        ])
      } else {
        // Simple list of college names
        colleges = await Department.distinct("college")
        colleges.sort()
      }
      
      // Log college access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user || { username: "anonymous" },
        `Colleges list accessed - ${Array.isArray(colleges) ? colleges.length : 'unknown'} colleges returned${includeStats === 'true' ? ' with statistics' : ''}`,
        req
      )
      
      res.json({
        colleges,
        count: Array.isArray(colleges) ? colleges.length : 0,
        includesStatistics: includeStats === 'true'
      })
    } catch (error) {
      next(error)
    }
  }

  // NEW: Get degree programs with optional filtering
  static async getDegreePrograms(req, res, next) {
    try {
      const { college, departmentCode, includeStats = false } = req.query

      let pipeline = []
      let matchStage = {}

      // Apply filters
      if (college) {
        matchStage.college = { $regex: college, $options: "i" }
      }
      if (departmentCode) {
        matchStage.departmentCode = departmentCode.trim().toUpperCase()
      }

      if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage })
      }

      if (includeStats === 'true') {
        // Get degree programs with statistics
        pipeline.push(
          {
            $lookup: {
              from: "voters",
              localField: "_id",
              foreignField: "departmentId",
              as: "voters"
            }
          },
          {
            $group: {
              _id: {
                degreeProgram: "$degreeProgram",
                college: "$college",
                departmentCode: "$departmentCode"
              },
              departmentCount: { $sum: 1 },
              totalVoters: { $sum: { $size: "$voters" } },
              registeredVoters: {
                $sum: {
                  $size: {
                    $filter: {
                      input: "$voters",
                      cond: { $eq: ["$$this.isRegistered", true] }
                    }
                  }
                }
              }
            }
          },
          {
            $sort: { 
              "_id.college": 1, 
              "_id.departmentCode": 1,
              "_id.degreeProgram": 1 
            }
          },
          {
            $project: {
              degreeProgram: "$_id.degreeProgram",
              college: "$_id.college",
              departmentCode: "$_id.departmentCode",
              departmentCount: 1,
              totalVoters: 1,
              registeredVoters: 1,
              _id: 0
            }
          }
        )
      } else {
        // Simple aggregation for unique degree programs
        pipeline.push(
          {
            $group: {
              _id: {
                degreeProgram: "$degreeProgram",
                college: "$college",
                departmentCode: "$departmentCode"
              }
            }
          },
          {
            $sort: { 
              "_id.college": 1, 
              "_id.departmentCode": 1,
              "_id.degreeProgram": 1 
            }
          },
          {
            $project: {
              degreeProgram: "$_id.degreeProgram",
              college: "$_id.college",
              departmentCode: "$_id.departmentCode",
              _id: 0
            }
          }
        )
      }

      const degreePrograms = await Department.aggregate(pipeline)
      
      // Log degree program access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user || { username: "anonymous" },
        `Degree programs list accessed - ${degreePrograms.length} programs returned${includeStats === 'true' ? ' with statistics' : ''}${college ? ` filtered by college: ${college}` : ''}${departmentCode ? ` filtered by department code: ${departmentCode}` : ''}`,
        req
      )
      
      res.json({
        degreePrograms,
        count: degreePrograms.length,
        includesStatistics: includeStats === 'true',
        filters: {
          college: college || null,
          departmentCode: departmentCode || null
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // NEW: Get unique department codes with their associated data
  static async getDepartmentCodes(req, res, next) {
    try {
      const { includeStats = false } = req.query

      let pipeline = []

      if (includeStats === 'true') {
        // Get department codes with statistics
        pipeline = [
          {
            $lookup: {
              from: "voters",
              localField: "_id",
              foreignField: "departmentId",
              as: "voters"
            }
          },
          {
            $group: {
              _id: "$departmentCode",
              departmentCount: { $sum: 1 },
              colleges: { $addToSet: "$college" },
              degreePrograms: { $addToSet: "$degreeProgram" },
              totalVoters: { $sum: { $size: "$voters" } },
              registeredVoters: {
                $sum: {
                  $size: {
                    $filter: {
                      input: "$voters",
                      cond: { $eq: ["$$this.isRegistered", true] }
                    }
                  }
                }
              }
            }
          },
          {
            $sort: { _id: 1 }
          },
          {
            $project: {
              departmentCode: "$_id",
              departmentCount: 1,
              colleges: 1,
              degreePrograms: 1,
              totalVoters: 1,
              registeredVoters: 1,
              uniqueColleges: { $size: "$colleges" },
              totalDegreePrograms: { $size: "$degreePrograms" },
              _id: 0
            }
          }
        ]
      } else {
        // Simple list of department codes
        pipeline = [
          {
            $group: {
              _id: "$departmentCode",
              colleges: { $addToSet: "$college" },
              degreePrograms: { $addToSet: "$degreeProgram" }
            }
          },
          {
            $sort: { _id: 1 }
          },
          {
            $project: {
              departmentCode: "$_id",
              colleges: 1,
              degreePrograms: 1,
              _id: 0
            }
          }
        ]
      }

      const departmentCodes = await Department.aggregate(pipeline)
      
      // Log department codes access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user || { username: "anonymous" },
        `Department codes list accessed - ${departmentCodes.length} codes returned${includeStats === 'true' ? ' with statistics' : ''}`,
        req
      )
      
      res.json({
        departmentCodes,
        count: departmentCodes.length,
        includesStatistics: includeStats === 'true'
      })
    } catch (error) {
      next(error)
    }
  }

  // Bulk operations
  static async bulkCreateDepartments(req, res, next) {
    try {
      const { departments } = req.body

      if (!Array.isArray(departments) || departments.length === 0) {
        const error = new Error("Departments array is required and must not be empty")
        error.statusCode = 400
        return next(error)
      }

      if (departments.length > 100) {
        const error = new Error("Cannot create more than 100 departments at once")
        error.statusCode = 400
        return next(error)
      }

      // Validate each department
      const validatedDepartments = []
      const errors = []

      for (let i = 0; i < departments.length; i++) {
        const department = departments[i]
        try {
          if (!department.departmentCode || !department.degreeProgram || !department.college) {
            throw new Error(`Department at index ${i}: departmentCode, degreeProgram, and college are required`)
          }

          const trimmedDepartmentCode = department.departmentCode.trim().toUpperCase()
          const trimmedDegreeProgram = department.degreeProgram.trim()
          const trimmedCollege = department.college.trim()

          if (trimmedDepartmentCode.length < 2) {
            throw new Error(`Department at index ${i}: departmentCode must be at least 2 characters long`)
          }

          if (trimmedDegreeProgram.length < 3) {
            throw new Error(`Department at index ${i}: degreeProgram must be at least 3 characters long`)
          }

          if (trimmedCollege.length < 3) {
            throw new Error(`Department at index ${i}: college must be at least 3 characters long`)
          }

          validatedDepartments.push({
            departmentCode: trimmedDepartmentCode,
            degreeProgram: trimmedDegreeProgram,
            college: trimmedCollege
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
      const seenDegreeCollegeCombos = new Set()
      
      for (const department of validatedDepartments) {
        const combo = `${department.degreeProgram}|${department.college}`
        if (seenDegreeCollegeCombos.has(combo)) {
          const error = new Error(`Duplicate degree program and college combination in batch: ${department.degreeProgram} - ${department.college}`)
          error.statusCode = 400
          return next(error)
        }
        seenDegreeCollegeCombos.add(combo)
      }

      const createdDepartments = await Department.insertMany(validatedDepartments, { ordered: false })

      // Log the bulk creation
      await AuditLog.logUserAction(
        "DATA_IMPORT",
        req.user || { username: "system" },
        `Bulk created ${createdDepartments.length} departments`,
        req
      )

      res.status(201).json({
        message: `Successfully created ${createdDepartments.length} departments`,
        count: createdDepartments.length,
        departments: createdDepartments.map(dept => dept.toObject())
      })
    } catch (error) {
      // Handle bulk insert errors
      if (error.code === 11000) {
        error.message = "One or more departments have duplicate degree program/college combinations with existing records"
        error.statusCode = 400
      }
      next(error)
    }
  }

  // Get registered voters in department
  static async getRegisteredVoters(req, res, next) {
    try {
      const { id } = req.params
      const { page = 1, limit = 50, yearLevel } = req.query

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid department ID format")
        error.statusCode = 400
        return next(error)
      }

      const department = await Department.findById(id)
      if (!department) {
        const error = new Error("Department not found")
        error.statusCode = 404
        return next(error)
      }

      // Build filter
      const filter = { 
        departmentId: id, 
        isRegistered: true 
      }
      
      if (yearLevel) {
        filter.yearLevel = parseInt(yearLevel)
      }

      const skip = (page - 1) * limit
      const limitNum = Math.min(Number.parseInt(limit), 100)

      const voters = await Voter.find(filter)
        .select('schoolId firstName middleName lastName yearLevel email isActive isClassOfficer passwordCreatedAt')
        .sort({ yearLevel: 1, lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(limitNum)

      const total = await Voter.countDocuments(filter)
      const totalPages = Math.ceil(total / limitNum)

      // Log access
      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user || { username: "anonymous" },
        `Retrieved registered voters for department ${department.departmentCode} - ${voters.length} voters returned`,
        req
      )

      res.json({
        department: {
          _id: department._id,
          departmentCode: department.departmentCode,
          degreeProgram: department.degreeProgram,
          college: department.college
        },
        voters,
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

  // Get class officers in department
  static async getClassOfficers(req, res, next) {
    try {
      const { id } = req.params
      const { page = 1, limit = 50, yearLevel } = req.query

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid department ID format")
        error.statusCode = 400
        return next(error)
      }

      const department = await Department.findById(id)
      if (!department) {
        const error = new Error("Department not found")
        error.statusCode = 404
        return next(error)
      }

      // Build filter
      const filter = { 
        departmentId: id, 
        isClassOfficer: true 
      }
      
      if (yearLevel) {
        filter.yearLevel = parseInt(yearLevel)
      }

      const skip = (page - 1) * limit
      const limitNum = Math.min(Number.parseInt(limit), 100)

      const officers = await Voter.find(filter)
        .select('schoolId firstName middleName lastName yearLevel email isActive isRegistered passwordCreatedAt')
        .sort({ yearLevel: 1, lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(limitNum)

      const total = await Voter.countDocuments(filter)
      const totalPages = Math.ceil(total / limitNum)

      // Get statistics by year level
      const officersByYear = await Voter.aggregate([
        { 
          $match: { 
            departmentId: new mongoose.Types.ObjectId(id), 
            isClassOfficer: true 
          } 
        },
        {
          $group: {
            _id: '$yearLevel',
            count: { $sum: 1 },
            registered: { 
              $sum: { $cond: ['$isRegistered', 1, 0] } 
            },
            active: { 
              $sum: { $cond: ['$isActive', 1, 0] } 
            }
          }
        },
        { $sort: { '_id': 1 } }
      ])

      // Log access
      await AuditLog.logUserAction(
        "DATA_EXPORT",
        req.user || { username: "anonymous" },
        `Retrieved class officers for department ${department.departmentCode} - ${officers.length} officers returned`,
        req
      )

      res.json({
        department: {
          _id: department._id,
          departmentCode: department.departmentCode,
          degreeProgram: department.degreeProgram,
          college: department.college
        },
        officers,
        statistics: {
          totalOfficers: total,
          officersByYear
        },
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

  // Search departments with advanced filtering
  static async searchDepartments(req, res, next) {
    try {
      const { 
        query, 
        college, 
        minVoters,
        maxVoters,
        page = 1, 
        limit = 20 
      } = req.query

      const filter = {}
      
      if (query) {
        filter.$or = [
          { departmentCode: { $regex: query, $options: "i" } },
          { degreeProgram: { $regex: query, $options: "i" } },
          { college: { $regex: query, $options: "i" } }
        ]
      }
      
      if (college) {
        filter.college = { $regex: college, $options: "i" }
      }

      const skip = (page - 1) * limit
      const limitNum = Math.min(Number.parseInt(limit), 50)

      let pipeline = [
        { $match: filter },
        {
          $lookup: {
            from: "voters",
            localField: "_id",
            foreignField: "departmentId",
            as: "voters"
          }
        },
        {
          $addFields: {
            voterCount: { $size: "$voters" },
            registeredVoterCount: {
              $size: {
                $filter: {
                  input: "$voters",
                  cond: { $eq: ["$this.isRegistered", true] }
                }
              }
            },
            classOfficerCount: {
              $size: {
                $filter: {
                  input: "$voters",
                  cond: { $eq: ["$this.isClassOfficer", true] }
                }
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
        { $sort: { college: 1, departmentCode: 1 } },
        { $skip: skip },
        { $limit: limitNum },
        {
          $project: {
            voters: 0 // Remove voters array from response for performance
          }
        }
      )

      const departments = await Department.aggregate(pipeline)
      
      // Get total count for pagination
      const countPipeline = pipeline.slice(0, -3) // Remove skip, limit, and project stages
      countPipeline.push({ $count: "total" })
      const countResult = await Department.aggregate(countPipeline)
      const total = countResult.length > 0 ? countResult[0].total : 0

      // Log search activity
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user || { username: "anonymous" },
        `Departments search performed - query: "${query || 'none'}", results: ${departments.length}`,
        req
      )

      res.json({
        departments,
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

  static async getTotalCounts(req, res, next) {
  try {
    // Get total departments
    const totalDepartments = await Department.countDocuments()
    
    // Get total unique colleges
    const uniqueColleges = await Department.distinct("college")
    const totalColleges = uniqueColleges.length
    
    // Get total unique degree programs
    const uniqueDegreePrograms = await Department.distinct("degreeProgram")
    const totalDegreePrograms = uniqueDegreePrograms.length
    
    // Get total unique department codes
    const uniqueDepartmentCodes = await Department.distinct("departmentCode")
    const totalDepartmentCodes = uniqueDepartmentCodes.length

    // Log access
    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user || { username: "anonymous" },
      "Retrieved total counts for departments, colleges, and degree programs",
      req
    )

    res.json({
      totals: {
        departments: totalDepartments,
        colleges: totalColleges,
        degreePrograms: totalDegreePrograms,
        departmentCodes: totalDepartmentCodes
      }
    })
  } catch (error) {
    next(error)
  }
}

// Get total number of departments only
static async getTotalDepartments(req, res, next) {
  try {
    const total = await Department.countDocuments()
    
    // Log access
    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user || { username: "anonymous" },
      `Retrieved total department count: ${total}`,
      req
    )
    
    res.json({
      totalDepartments: total
    })
  } catch (error) {
    next(error)
  }
}

// Get total number of unique colleges only
static async getTotalColleges(req, res, next) {
  try {
    const uniqueColleges = await Department.distinct("college")
    const total = uniqueColleges.length
    
    // Log access
    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user || { username: "anonymous" },
      `Retrieved total college count: ${total}`,
      req
    )
    
    res.json({
      totalColleges: total,
      colleges: uniqueColleges.sort()
    })
  } catch (error) {
    next(error)
  }
}

// Get total number of unique degree programs only
static async getTotalDegreePrograms(req, res, next) {
  try {
    const uniqueDegreePrograms = await Department.distinct("degreeProgram")
    const total = uniqueDegreePrograms.length
    
    // Log access
    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user || { username: "anonymous" },
      `Retrieved total degree program count: ${total}`,
      req
    )
    
    res.json({
      totalDegreePrograms: total,
      degreePrograms: uniqueDegreePrograms.sort()
    })
  } catch (error) {
    next(error)
  }
}

}

module.exports = DepartmentController