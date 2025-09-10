const mongoose = require("mongoose")
const Position = require("../models/Position")
const SSGElection = require("../models/SSGElection")
const DepartmentalElection = require("../models/DepartmentalElection")
const Candidate = require("../models/Candidate")
const Vote = require("../models/Vote")
const Voter = require("../models/Voter")
const AuditLog = require("../models/AuditLog")

class PositionController {
  // Get all SSG positions
  static async getAllSSGPositions(req, res, next) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        ssgElectionId, 
        isActive, 
        sortBy = 'positionOrder',
        sortOrder = 'asc',
        search 
      } = req.query

      const query = {}
      
      if (ssgElectionId) {
        if (!mongoose.Types.ObjectId.isValid(ssgElectionId)) {
          await AuditLog.logUserAction(
            "SYSTEM_ACCESS",
            req.user,
            `Failed to retrieve SSG positions - Invalid SSG election ID: ${ssgElectionId}`,
            req
          )
          const error = new Error("Invalid SSG election ID")
          error.statusCode = 400
          return next(error)
        }
        query.ssgElectionId = ssgElectionId
      } else {
        query.ssgElectionId = { $ne: null }
      }
      
      if (isActive !== undefined) {
        query.isActive = isActive === 'true'
      }

      if (search) {
        query.$or = [
          { positionName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }

      const sortOptions = {}
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1

      const skip = (page - 1) * limit
      const limitNum = Math.min(Number.parseInt(limit), 100)

      const positions = await Position.find(query)
        .populate('ssgElectionId', 'title electionYear status ssgElectionId')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean()

      const total = await Position.countDocuments(query)
      const totalPages = Math.ceil(total / limitNum)

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved ${positions.length} SSG positions with filters: ${JSON.stringify({ ssgElectionId, isActive, page, limit, search })}`,
        req
      )

      res.json({
        success: true,
        data: positions,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum
        }
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to retrieve SSG positions: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get all departmental positions
  static async getAllDepartmentalPositions(req, res, next) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        deptElectionId, 
        isActive, 
        sortBy = 'positionOrder',
        sortOrder = 'asc',
        search 
      } = req.query

      const query = {}
      
      if (deptElectionId) {
        if (!mongoose.Types.ObjectId.isValid(deptElectionId)) {
          await AuditLog.logUserAction(
            "SYSTEM_ACCESS",
            req.user,
            `Failed to retrieve departmental positions - Invalid departmental election ID: ${deptElectionId}`,
            req
          )
          const error = new Error("Invalid departmental election ID")
          error.statusCode = 400
          return next(error)
        }
        query.deptElectionId = deptElectionId
      } else {
        query.deptElectionId = { $ne: null }
      }
      
      if (isActive !== undefined) {
        query.isActive = isActive === 'true'
      }

      if (search) {
        query.$or = [
          { positionName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }

      const sortOptions = {}
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1

      const skip = (page - 1) * limit
      const limitNum = Math.min(Number.parseInt(limit), 100)

      const positions = await Position.find(query)
        .populate('deptElectionId', 'title electionYear status deptElectionId departmentId')
        .populate({
          path: 'deptElectionId',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean()

      const total = await Position.countDocuments(query)
      const totalPages = Math.ceil(total / limitNum)

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved ${positions.length} departmental positions with filters: ${JSON.stringify({ deptElectionId, isActive, page, limit, search })}`,
        req
      )

      res.json({
        success: true,
        data: positions,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum
        }
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to retrieve departmental positions: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get SSG position by ID
  static async getSSGPositionById(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to retrieve SSG position - Invalid position ID: ${id}`,
          req
        )
        const error = new Error("Invalid position ID")
        error.statusCode = 400
        return next(error)
      }

      const position = await Position.findOne({ _id: id, ssgElectionId: { $ne: null } })
        .populate('ssgElectionId', 'title electionYear status ssgElectionId')
        .lean()

      if (!position) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Attempted to access non-existent SSG position: ${id}`,
          req
        )
        
        const error = new Error("SSG position not found")
        error.statusCode = 404
        return next(error)
      }

      const candidateCount = await Candidate.countDocuments({ positionId: id })
      const voteCount = await Vote.countDocuments({ positionId: id })

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved SSG position: ${position.positionName} (${id}) - Candidates: ${candidateCount}, Votes: ${voteCount}`,
        req
      )

      res.json({
        success: true,
        data: {
          ...position,
          candidateCount,
          voteCount
        }
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to retrieve SSG position ${req.params.id}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get departmental position by ID
  static async getDepartmentalPositionById(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to retrieve departmental position - Invalid position ID: ${id}`,
          req
        )
        const error = new Error("Invalid position ID")
        error.statusCode = 400
        return next(error)
      }

      const position = await Position.findOne({ _id: id, deptElectionId: { $ne: null } })
        .populate({
          path: 'deptElectionId',
          select: 'title electionYear status deptElectionId departmentId',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        })
        .lean()

      if (!position) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Attempted to access non-existent departmental position: ${id}`,
          req
        )
        
        const error = new Error("Departmental position not found")
        error.statusCode = 404
        return next(error)
      }

      const candidateCount = await Candidate.countDocuments({ positionId: id })
      const voteCount = await Vote.countDocuments({ positionId: id })

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved departmental position: ${position.positionName} (${id}) - Candidates: ${candidateCount}, Votes: ${voteCount}`,
        req
      )

      res.json({
        success: true,
        data: {
          ...position,
          candidateCount,
          voteCount
        }
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to retrieve departmental position ${req.params.id}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Create SSG position
  static async createSSGPosition(req, res, next) {
    try {
      const { 
        ssgElectionId, 
        positionName, 
        positionOrder = 1,
        maxVotes = 1,
        maxCandidates = 10,
        description 
      } = req.body

      if (!ssgElectionId || !positionName) {
        await AuditLog.logUserAction(
          "CREATE_POSITION",
          req.user,
          `Failed to create SSG position - Missing required fields: ssgElectionId=${!!ssgElectionId}, positionName=${!!positionName}`,
          req
        )
        
        const error = new Error("SSG Election ID and position name are required")
        error.statusCode = 400
        return next(error)
      }

      if (!mongoose.Types.ObjectId.isValid(ssgElectionId)) {
        await AuditLog.logUserAction(
          "CREATE_POSITION",
          req.user,
          `Failed to create SSG position - Invalid SSG election ID: ${ssgElectionId}`,
          req
        )
        
        const error = new Error("Invalid SSG election ID")
        error.statusCode = 400
        return next(error)
      }

      const ssgElection = await SSGElection.findById(ssgElectionId)
      if (!ssgElection) {
        await AuditLog.logUserAction(
          "CREATE_POSITION",
          req.user,
          `Failed to create SSG position - SSG election not found: ${ssgElectionId}`,
          req
        )
        
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      const existingPosition = await Position.findOne({ 
        ssgElectionId, 
        positionName: { $regex: new RegExp(`^${positionName.trim()}$`, 'i') }
      })
      
      if (existingPosition) {
        await AuditLog.logUserAction(
          "CREATE_POSITION",
          req.user,
          `Failed to create SSG position - Position already exists: ${positionName.trim()} for election ${ssgElection.title}`,
          req
        )
        
        const error = new Error("Position already exists for this SSG election")
        error.statusCode = 400
        return next(error)
      }

      if (maxVotes < 1) {
        const error = new Error("Maximum votes must be at least 1")
        error.statusCode = 400
        return next(error)
      }

      if (maxCandidates < 1) {
        const error = new Error("Maximum candidates must be at least 1")
        error.statusCode = 400
        return next(error)
      }

      const position = new Position({
        ssgElectionId,
        positionName: positionName.trim(),
        positionOrder: parseInt(positionOrder),
        maxVotes: parseInt(maxVotes),
        maxCandidates: parseInt(maxCandidates),
        description: description?.trim() || null
      })

      await position.save()
      await position.populate('ssgElectionId', 'title electionYear ssgElectionId')

      await AuditLog.logUserAction(
        "CREATE_POSITION",
        req.user,
        `Created SSG position: ${position.positionName} for election ${ssgElection.title} (Order: ${position.positionOrder}, Max Votes: ${position.maxVotes})`,
        req
      )

      res.status(201).json({
        success: true,
        message: "SSG position created successfully",
        data: position
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "CREATE_POSITION",
        req.user,
        `Failed to create SSG position: ${error.message}`,
        req
      )
      
      if (error.code === 11000) {
        error.message = "Position already exists for this SSG election"
        error.statusCode = 400
      }
      next(error)
    }
  }

  // Create departmental position
  static async createDepartmentalPosition(req, res, next) {
    try {
      const { 
        deptElectionId, 
        positionName, 
        positionOrder = 1,
        maxVotes = 1,
        maxCandidates = 10,
        description 
      } = req.body

      if (!deptElectionId || !positionName) {
        await AuditLog.logUserAction(
          "CREATE_POSITION",
          req.user,
          `Failed to create departmental position - Missing required fields: deptElectionId=${!!deptElectionId}, positionName=${!!positionName}`,
          req
        )
        
        const error = new Error("Departmental Election ID and position name are required")
        error.statusCode = 400
        return next(error)
      }

      if (!mongoose.Types.ObjectId.isValid(deptElectionId)) {
        await AuditLog.logUserAction(
          "CREATE_POSITION",
          req.user,
          `Failed to create departmental position - Invalid departmental election ID: ${deptElectionId}`,
          req
        )
        
        const error = new Error("Invalid departmental election ID")
        error.statusCode = 400
        return next(error)
      }

      const deptElection = await DepartmentalElection.findById(deptElectionId).populate('departmentId', 'departmentCode degreeProgram')
      if (!deptElection) {
        await AuditLog.logUserAction(
          "CREATE_POSITION",
          req.user,
          `Failed to create departmental position - Departmental election not found: ${deptElectionId}`,
          req
        )
        
        const error = new Error("Departmental election not found")
        error.statusCode = 404
        return next(error)
      }

      const existingPosition = await Position.findOne({ 
        deptElectionId, 
        positionName: { $regex: new RegExp(`^${positionName.trim()}$`, 'i') }
      })
      
      if (existingPosition) {
        await AuditLog.logUserAction(
          "CREATE_POSITION",
          req.user,
          `Failed to create departmental position - Position already exists: ${positionName.trim()} for election ${deptElection.title}`,
          req
        )
        
        const error = new Error("Position already exists for this departmental election")
        error.statusCode = 400
        return next(error)
      }

      if (maxVotes < 1) {
        const error = new Error("Maximum votes must be at least 1")
        error.statusCode = 400
        return next(error)
      }

      if (maxCandidates < 1) {
        const error = new Error("Maximum candidates must be at least 1")
        error.statusCode = 400
        return next(error)
      }

      const position = new Position({
        deptElectionId,
        positionName: positionName.trim(),
        positionOrder: parseInt(positionOrder),
        maxVotes: parseInt(maxVotes),
        maxCandidates: parseInt(maxCandidates),
        description: description?.trim() || null
      })

      await position.save()
      await position.populate({
        path: 'deptElectionId',
        select: 'title electionYear deptElectionId departmentId',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })

      await AuditLog.logUserAction(
        "CREATE_POSITION",
        req.user,
        `Created departmental position: ${position.positionName} for election ${deptElection.title} in ${deptElection.departmentId.degreeProgram} (Order: ${position.positionOrder}, Max Votes: ${position.maxVotes})`,
        req
      )

      res.status(201).json({
        success: true,
        message: "Departmental position created successfully",
        data: position
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "CREATE_POSITION",
        req.user,
        `Failed to create departmental position: ${error.message}`,
        req
      )
      
      if (error.code === 11000) {
        error.message = "Position already exists for this departmental election"
        error.statusCode = 400
      }
      next(error)
    }
  }

  // Update SSG position
  static async updateSSGPosition(req, res, next) {
    try {
      const { id } = req.params
      const updates = req.body

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to update SSG position - Invalid position ID: ${id}`,
          req
        )
        const error = new Error("Invalid position ID")
        error.statusCode = 400
        return next(error)
      }

      const position = await Position.findOne({ _id: id, ssgElectionId: { $ne: null } }).populate('ssgElectionId', 'title')
      if (!position) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to update SSG position - Position not found: ${id}`,
          req
        )
        
        const error = new Error("SSG position not found")
        error.statusCode = 404
        return next(error)
      }

      const originalData = {
        positionName: position.positionName,
        positionOrder: position.positionOrder,
        maxVotes: position.maxVotes,
        maxCandidates: position.maxCandidates,
        description: position.description,
        isActive: position.isActive
      }

      const allowedUpdates = ['positionName', 'positionOrder', 'maxVotes', 'maxCandidates', 'description', 'isActive']
      const actualUpdates = {}

      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          if (field === 'positionName' && updates[field]) {
            actualUpdates[field] = updates[field].trim()
          } else if (field === 'positionOrder' || field === 'maxVotes' || field === 'maxCandidates') {
            const numValue = parseInt(updates[field])
            if ((field === 'maxVotes' || field === 'maxCandidates') && numValue < 1) {
              throw new Error(`${field === 'maxVotes' ? 'Maximum votes' : 'Maximum candidates'} must be at least 1`)
            }
            actualUpdates[field] = numValue
          } else if (field === 'description') {
            actualUpdates[field] = updates[field]?.trim() || null
          } else {
            actualUpdates[field] = updates[field]
          }
        }
      })

      if (actualUpdates.positionName && actualUpdates.positionName !== position.positionName) {
        const existingPosition = await Position.findOne({
          ssgElectionId: position.ssgElectionId,
          positionName: { $regex: new RegExp(`^${actualUpdates.positionName}$`, 'i') },
          _id: { $ne: id }
        })

        if (existingPosition) {
          await AuditLog.logUserAction(
            "UPDATE_POSITION",
            req.user,
            `Failed to update SSG position - Name already exists: ${actualUpdates.positionName} in election ${position.ssgElectionId.title}`,
            req
          )
          
          const error = new Error("Position name already exists for this SSG election")
          error.statusCode = 400
          return next(error)
        }
      }

      const updatedPosition = await Position.findByIdAndUpdate(
        id,
        actualUpdates,
        { new: true, runValidators: true }
      ).populate('ssgElectionId', 'title electionYear ssgElectionId')

      const changes = []
      Object.keys(actualUpdates).forEach(key => {
        if (originalData[key] !== actualUpdates[key]) {
          changes.push(`${key}: "${originalData[key]}" → "${actualUpdates[key]}"`)
        }
      })

      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Updated SSG position: ${updatedPosition.positionName} in election ${position.ssgElectionId.title}. Changes: ${changes.join(', ')}`,
        req
      )

      res.json({
        success: true,
        message: "SSG position updated successfully",
        data: updatedPosition
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Failed to update SSG position ${req.params.id}: ${error.message}`,
        req
      )
      
      if (error.code === 11000) {
        error.message = "Position name already exists for this SSG election"
        error.statusCode = 400
      }
      next(error)
    }
  }

  // Update departmental position
  static async updateDepartmentalPosition(req, res, next) {
    try {
      const { id } = req.params
      const updates = req.body

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to update departmental position - Invalid position ID: ${id}`,
          req
        )
        const error = new Error("Invalid position ID")
        error.statusCode = 400
        return next(error)
      }

      const position = await Position.findOne({ _id: id, deptElectionId: { $ne: null } }).populate('deptElectionId', 'title')
      if (!position) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to update departmental position - Position not found: ${id}`,
          req
        )
        
        const error = new Error("Departmental position not found")
        error.statusCode = 404
        return next(error)
      }

      const originalData = {
        positionName: position.positionName,
        positionOrder: position.positionOrder,
        maxVotes: position.maxVotes,
        maxCandidates: position.maxCandidates,
        description: position.description,
        isActive: position.isActive
      }

      const allowedUpdates = ['positionName', 'positionOrder', 'maxVotes', 'maxCandidates', 'description', 'isActive']
      const actualUpdates = {}

      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          if (field === 'positionName' && updates[field]) {
            actualUpdates[field] = updates[field].trim()
          } else if (field === 'positionOrder' || field === 'maxVotes' || field === 'maxCandidates') {
            const numValue = parseInt(updates[field])
            if ((field === 'maxVotes' || field === 'maxCandidates') && numValue < 1) {
              throw new Error(`${field === 'maxVotes' ? 'Maximum votes' : 'Maximum candidates'} must be at least 1`)
            }
            actualUpdates[field] = numValue
          } else if (field === 'description') {
            actualUpdates[field] = updates[field]?.trim() || null
          } else {
            actualUpdates[field] = updates[field]
          }
        }
      })

      if (actualUpdates.positionName && actualUpdates.positionName !== position.positionName) {
        const existingPosition = await Position.findOne({
          deptElectionId: position.deptElectionId,
          positionName: { $regex: new RegExp(`^${actualUpdates.positionName}$`, 'i') },
          _id: { $ne: id }
        })

        if (existingPosition) {
          await AuditLog.logUserAction(
            "UPDATE_POSITION",
            req.user,
            `Failed to update departmental position - Name already exists: ${actualUpdates.positionName} in election ${position.deptElectionId.title}`,
            req
          )
          
          const error = new Error("Position name already exists for this departmental election")
          error.statusCode = 400
          return next(error)
        }
      }

      const updatedPosition = await Position.findByIdAndUpdate(
        id,
        actualUpdates,
        { new: true, runValidators: true }
      ).populate({
        path: 'deptElectionId',
        select: 'title electionYear deptElectionId departmentId',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })

      const changes = []
      Object.keys(actualUpdates).forEach(key => {
        if (originalData[key] !== actualUpdates[key]) {
          changes.push(`${key}: "${originalData[key]}" → "${actualUpdates[key]}"`)
        }
      })

      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Updated departmental position: ${updatedPosition.positionName} in election ${position.deptElectionId.title}. Changes: ${changes.join(', ')}`,
        req
      )

      res.json({
        success: true,
        message: "Departmental position updated successfully",
        data: updatedPosition
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Failed to update departmental position ${req.params.id}: ${error.message}`,
        req
      )
      
      if (error.code === 11000) {
        error.message = "Position name already exists for this departmental election"
        error.statusCode = 400
      }
      next(error)
    }
  }

  // Delete SSG position
  static async deleteSSGPosition(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          "DELETE_POSITION",
          req.user,
          `Failed to delete SSG position - Invalid position ID: ${id}`,
          req
        )
        const error = new Error("Invalid position ID")
        error.statusCode = 400
        return next(error)
      }

      const position = await Position.findOne({ _id: id, ssgElectionId: { $ne: null } }).populate('ssgElectionId', 'title')
      if (!position) {
        await AuditLog.logUserAction(
          "DELETE_POSITION",
          req.user,
          `Failed to delete SSG position - Position not found: ${id}`,
          req
        )
        
        const error = new Error("SSG position not found")
        error.statusCode = 404
        return next(error)
      }

      const candidateCount = await Candidate.countDocuments({ positionId: id })
      
      if (candidateCount > 0) {
        await AuditLog.logUserAction(
          "DELETE_POSITION",
          req.user,
          `Failed to delete SSG position - Has ${candidateCount} candidates: ${position.positionName} in election ${position.ssgElectionId.title}`,
          req
        )
        
        const error = new Error(`Cannot delete SSG position. It has ${candidateCount} candidate(s) associated with it.`)
        error.statusCode = 400
        return next(error)
      }

      const voteCount = await Vote.countDocuments({ positionId: id })
      
      if (voteCount > 0) {
        await AuditLog.logUserAction(
          "DELETE_POSITION",
          req.user,
          `Failed to delete SSG position - Has ${voteCount} votes: ${position.positionName} in election ${position.ssgElectionId.title}`,
          req
        )
        
        const error = new Error(`Cannot delete SSG position. It has ${voteCount} vote(s) associated with it.`)
        error.statusCode = 400
        return next(error)
      }

      await Position.findByIdAndDelete(id)

      await AuditLog.logUserAction(
        "DELETE_POSITION",
        req.user,
        `Deleted SSG position: ${position.positionName} from election ${position.ssgElectionId.title} (Order: ${position.positionOrder})`,
        req
      )

      res.json({
        success: true,
        message: "SSG position deleted successfully"
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "DELETE_POSITION",
        req.user,
        `Failed to delete SSG position ${req.params.id}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Delete departmental position
  static async deleteDepartmentalPosition(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          "DELETE_POSITION",
          req.user,
          `Failed to delete departmental position - Invalid position ID: ${id}`,
          req
        )
        const error = new Error("Invalid position ID")
        error.statusCode = 400
        return next(error)
      }

      const position = await Position.findOne({ _id: id, deptElectionId: { $ne: null } }).populate('deptElectionId', 'title')
      if (!position) {
        await AuditLog.logUserAction(
          "DELETE_POSITION",
          req.user,
          `Failed to delete departmental position - Position not found: ${id}`,
          req
        )
        
        const error = new Error("Departmental position not found")
        error.statusCode = 404
        return next(error)
      }

      const candidateCount = await Candidate.countDocuments({ positionId: id })
      
      if (candidateCount > 0) {
        await AuditLog.logUserAction(
          "DELETE_POSITION",
          req.user,
          `Failed to delete departmental position - Has ${candidateCount} candidates: ${position.positionName} in election ${position.deptElectionId.title}`,
          req
        )
        
        const error = new Error(`Cannot delete departmental position. It has ${candidateCount} candidate(s) associated with it.`)
        error.statusCode = 400
        return next(error)
      }

      const voteCount = await Vote.countDocuments({ positionId: id })
      
      if (voteCount > 0) {
        await AuditLog.logUserAction(
          "DELETE_POSITION",
          req.user,
          `Failed to delete departmental position - Has ${voteCount} votes: ${position.positionName} in election ${position.deptElectionId.title}`,
          req
        )
        
        const error = new Error(`Cannot delete departmental position. It has ${voteCount} vote(s) associated with it.`)
        error.statusCode = 400
        return next(error)
      }

      await Position.findByIdAndDelete(id)

      await AuditLog.logUserAction(
        "DELETE_POSITION",
        req.user,
        `Deleted departmental position: ${position.positionName} from election ${position.deptElectionId.title} (Order: ${position.positionOrder})`,
        req
      )

      res.json({
        success: true,
        message: "Departmental position deleted successfully"
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "DELETE_POSITION",
        req.user,
        `Failed to delete departmental position ${req.params.id}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get positions by SSG election
  static async getPositionsBySSGElection(req, res, next) {
    try {
      const { ssgElectionId } = req.params
      const { isActive, sortBy = 'positionOrder', sortOrder = 'asc' } = req.query

      if (!mongoose.Types.ObjectId.isValid(ssgElectionId)) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user || { username: "anonymous" },
          `Failed to retrieve SSG positions - Invalid SSG election ID: ${ssgElectionId}`,
          req
        )
        const error = new Error("Invalid SSG election ID")
        error.statusCode = 400
        return next(error)
      }

      const ssgElection = await SSGElection.findById(ssgElectionId)
      if (!ssgElection) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user || { username: "anonymous" },
          `Failed to retrieve SSG positions - SSG election not found: ${ssgElectionId}`,
          req
        )
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      const query = { ssgElectionId }
      if (isActive !== undefined) {
        query.isActive = isActive === 'true'
      }

      const sortOptions = {}
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1

      const positions = await Position.find(query)
        .sort(sortOptions)
        .lean()

      const positionsWithCounts = await Promise.all(
        positions.map(async (position) => {
          const candidateCount = await Candidate.countDocuments({ positionId: position._id })
          const voteCount = await Vote.countDocuments({ positionId: position._id })
          return {
            ...position,
            candidateCount,
            voteCount
          }
        })
      )

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user || { username: "anonymous" },
        `Retrieved ${positions.length} positions for SSG election: ${ssgElection.title} (${ssgElectionId})`,
        req
      )

      res.json({
        success: true,
        data: positionsWithCounts,
        election: {
          id: ssgElection._id,
          title: ssgElection.title,
          electionYear: ssgElection.electionYear,
          status: ssgElection.status,
          type: 'ssg'
        }
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user || { username: "anonymous" },
        `Failed to retrieve positions for SSG election ${req.params.ssgElectionId}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get positions by departmental election
  static async getPositionsByDepartmentalElection(req, res, next) {
    try {
      const { deptElectionId } = req.params
      const { isActive, sortBy = 'positionOrder', sortOrder = 'asc' } = req.query

      if (!mongoose.Types.ObjectId.isValid(deptElectionId)) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user || { username: "anonymous" },
          `Failed to retrieve departmental positions - Invalid departmental election ID: ${deptElectionId}`,
          req
        )
        const error = new Error("Invalid departmental election ID")
        error.statusCode = 400
        return next(error)
      }

      const deptElection = await DepartmentalElection.findById(deptElectionId).populate('departmentId', 'departmentCode degreeProgram college')
      if (!deptElection) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user || { username: "anonymous" },
          `Failed to retrieve departmental positions - Departmental election not found: ${deptElectionId}`,
          req
        )
        const error = new Error("Departmental election not found")
        error.statusCode = 404
        return next(error)
      }

      const query = { deptElectionId }
      if (isActive !== undefined) {
        query.isActive = isActive === 'true'
      }

      const sortOptions = {}
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1

      const positions = await Position.find(query)
        .sort(sortOptions)
        .lean()

      const positionsWithCounts = await Promise.all(
        positions.map(async (position) => {
          const candidateCount = await Candidate.countDocuments({ positionId: position._id })
          const voteCount = await Vote.countDocuments({ positionId: position._id })
          return {
            ...position,
            candidateCount,
            voteCount
          }
        })
      )

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user || { username: "anonymous" },
        `Retrieved ${positions.length} positions for departmental election: ${deptElection.title} (${deptElectionId})`,
        req
      )

      res.json({
        success: true,
        data: positionsWithCounts,
        election: {
          id: deptElection._id,
          title: deptElection.title,
          electionYear: deptElection.electionYear,
          status: deptElection.status,
          department: deptElection.departmentId,
          type: 'departmental'
        }
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user || { username: "anonymous" },
        `Failed to retrieve positions for departmental election ${req.params.deptElectionId}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Reorder SSG positions
  static async reorderSSGPositions(req, res, next) {
    try {
      const { ssgElectionId } = req.params
      const { positionOrders } = req.body

      if (!mongoose.Types.ObjectId.isValid(ssgElectionId)) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to reorder SSG positions - Invalid SSG election ID: ${ssgElectionId}`,
          req
        )
        const error = new Error("Invalid SSG election ID")
        error.statusCode = 400
        return next(error)
      }

      if (!Array.isArray(positionOrders) || positionOrders.length === 0) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to reorder SSG positions - Invalid position orders format for election: ${ssgElectionId}`,
          req
        )
        const error = new Error("Position orders must be a non-empty array")
        error.statusCode = 400
        return next(error)
      }

      const ssgElection = await SSGElection.findById(ssgElectionId)
      if (!ssgElection) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to reorder SSG positions - SSG election not found: ${ssgElectionId}`,
          req
        )
        const error = new Error("SSG election not found")
        error.statusCode = 404
        return next(error)
      }

      const positionIds = positionOrders.map(po => po.positionId)
      const validPositions = await Position.find({ 
        _id: { $in: positionIds }, 
        ssgElectionId 
      })

      if (validPositions.length !== positionIds.length) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to reorder SSG positions - Some positions don't belong to election: ${ssgElectionId}`,
          req
        )
        const error = new Error("Some positions don't belong to this SSG election")
        error.statusCode = 400
        return next(error)
      }

      for (const { positionId, positionOrder } of positionOrders) {
        await Position.findByIdAndUpdate(positionId, { positionOrder: parseInt(positionOrder) })
      }

      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Reordered ${positionOrders.length} positions for SSG election: ${ssgElection.title}`,
        req
      )

      res.json({
        success: true,
        message: "SSG positions reordered successfully"
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Failed to reorder positions for SSG election ${req.params.ssgElectionId}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Reorder departmental positions
  static async reorderDepartmentalPositions(req, res, next) {
    try {
      const { deptElectionId } = req.params
      const { positionOrders } = req.body

      if (!mongoose.Types.ObjectId.isValid(deptElectionId)) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to reorder departmental positions - Invalid departmental election ID: ${deptElectionId}`,
          req
        )
        const error = new Error("Invalid departmental election ID")
        error.statusCode = 400
        return next(error)
      }

      if (!Array.isArray(positionOrders) || positionOrders.length === 0) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to reorder departmental positions - Invalid position orders format for election: ${deptElectionId}`,
          req
        )
        const error = new Error("Position orders must be a non-empty array")
        error.statusCode = 400
        return next(error)
      }

      const deptElection = await DepartmentalElection.findById(deptElectionId)
      if (!deptElection) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to reorder departmental positions - Departmental election not found: ${deptElectionId}`,
          req
        )
        const error = new Error("Departmental election not found")
        error.statusCode = 404
        return next(error)
      }

      const positionIds = positionOrders.map(po => po.positionId)
      const validPositions = await Position.find({ 
        _id: { $in: positionIds }, 
        deptElectionId 
      })

      if (validPositions.length !== positionIds.length) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to reorder departmental positions - Some positions don't belong to election: ${deptElectionId}`,
          req
        )
        const error = new Error("Some positions don't belong to this departmental election")
        error.statusCode = 400
        return next(error)
      }

      for (const { positionId, positionOrder } of positionOrders) {
        await Position.findByIdAndUpdate(positionId, { positionOrder: parseInt(positionOrder) })
      }

      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Reordered ${positionOrders.length} positions for departmental election: ${deptElection.title}`,
        req
      )

      res.json({
        success: true,
        message: "Departmental positions reordered successfully"
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Failed to reorder positions for departmental election ${req.params.deptElectionId}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get SSG position statistics
  static async getSSGPositionStats(req, res, next) {
    try {
      const { positionId } = req.params

      if (!mongoose.Types.ObjectId.isValid(positionId)) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to get SSG position stats - Invalid position ID: ${positionId}`,
          req
        )
        const error = new Error("Invalid position ID")
        error.statusCode = 400
        return next(error)
      }

      const position = await Position.findOne({ _id: positionId, ssgElectionId: { $ne: null } })
        .populate('ssgElectionId', 'title electionYear')
      
      if (!position) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to get SSG position stats - Position not found: ${positionId}`,
          req
        )
        const error = new Error("SSG position not found")
        error.statusCode = 404
        return next(error)
      }

      const candidateCount = await Candidate.countDocuments({ positionId })
      const voteCount = await Vote.countDocuments({ positionId })

      const candidates = await Candidate.find({ positionId })
        .populate('voterId', 'firstName middleName lastName schoolId')
        .populate('partylistId', 'partylistName')
        .lean()

      const candidatesWithVotes = await Promise.all(
        candidates.map(async (candidate) => {
          const candidateVotes = await Vote.countDocuments({ candidateId: candidate._id })
          return {
            ...candidate,
            voteCount: candidateVotes
          }
        })
      )

      const stats = {
        positionId,
        positionName: position.positionName,
        maxVotes: position.maxVotes,
        maxCandidates: position.maxCandidates,
        candidateCount,
        totalVotes: voteCount,
        candidates: candidatesWithVotes.sort((a, b) => b.voteCount - a.voteCount),
        election: position.ssgElectionId,
        electionType: 'ssg'
      }

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved stats for SSG position: ${position.positionName} (Candidates: ${candidateCount}, Votes: ${voteCount})`,
        req
      )

      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to retrieve SSG position stats for ${req.params.positionId}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get departmental position statistics
  static async getDepartmentalPositionStats(req, res, next) {
    try {
      const { positionId } = req.params

      if (!mongoose.Types.ObjectId.isValid(positionId)) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to get departmental position stats - Invalid position ID: ${positionId}`,
          req
        )
        const error = new Error("Invalid position ID")
        error.statusCode = 400
        return next(error)
      }

      const position = await Position.findOne({ _id: positionId, deptElectionId: { $ne: null } })
        .populate({
          path: 'deptElectionId',
          select: 'title electionYear departmentId',
          populate: {
            path: 'departmentId',
            select: 'departmentCode degreeProgram college'
          }
        })
      
      if (!position) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to get departmental position stats - Position not found: ${positionId}`,
          req
        )
        const error = new Error("Departmental position not found")
        error.statusCode = 404
        return next(error)
      }

      const candidateCount = await Candidate.countDocuments({ positionId })
      const voteCount = await Vote.countDocuments({ positionId })

      const candidates = await Candidate.find({ positionId })
        .populate('voterId', 'firstName middleName lastName schoolId')
        .lean()

      const candidatesWithVotes = await Promise.all(
        candidates.map(async (candidate) => {
          const candidateVotes = await Vote.countDocuments({ candidateId: candidate._id })
          return {
            ...candidate,
            voteCount: candidateVotes
          }
        })
      )

      const stats = {
        positionId,
        positionName: position.positionName,
        maxVotes: position.maxVotes,
        maxCandidates: position.maxCandidates,
        candidateCount,
        totalVotes: voteCount,
        candidates: candidatesWithVotes.sort((a, b) => b.voteCount - a.voteCount),
        election: position.deptElectionId,
        electionType: 'departmental'
      }

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved stats for departmental position: ${position.positionName} (Candidates: ${candidateCount}, Votes: ${voteCount})`,
        req
      )

      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to retrieve departmental position stats for ${req.params.positionId}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Check if SSG position can be deleted
  static async canDeleteSSGPosition(req, res, next) {
    try {
      const { positionId } = req.params

      if (!mongoose.Types.ObjectId.isValid(positionId)) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to check SSG position deletion - Invalid position ID: ${positionId}`,
          req
        )
        const error = new Error("Invalid position ID")
        error.statusCode = 400
        return next(error)
      }

      const position = await Position.findOne({ _id: positionId, ssgElectionId: { $ne: null } })
      if (!position) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to check SSG position deletion - Position not found: ${positionId}`,
          req
        )
        const error = new Error("SSG position not found")
        error.statusCode = 404
        return next(error)
      }

      const candidateCount = await Candidate.countDocuments({ positionId })
      const voteCount = await Vote.countDocuments({ positionId })
      
      const canDelete = candidateCount === 0 && voteCount === 0
      const reasons = []
      
      if (candidateCount > 0) {
        reasons.push(`${candidateCount} candidate(s) associated`)
      }
      if (voteCount > 0) {
        reasons.push(`${voteCount} vote(s) associated`)
      }

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Checked deletion eligibility for SSG position: ${position.positionName} (Can delete: ${canDelete}, Reasons: ${reasons.join(', ') || 'None'})`,
        req
      )

      res.json({
        success: true,
        data: {
          canDelete,
          reasons,
          candidateCount,
          voteCount
        }
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to check SSG position deletion eligibility for ${req.params.positionId}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Check if departmental position can be deleted
  static async canDeleteDepartmentalPosition(req, res, next) {
    try {
      const { positionId } = req.params

      if (!mongoose.Types.ObjectId.isValid(positionId)) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to check departmental position deletion - Invalid position ID: ${positionId}`,
          req
        )
        const error = new Error("Invalid position ID")
        error.statusCode = 400
        return next(error)
      }

      const position = await Position.findOne({ _id: positionId, deptElectionId: { $ne: null } })
      if (!position) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to check departmental position deletion - Position not found: ${positionId}`,
          req
        )
        const error = new Error("Departmental position not found")
        error.statusCode = 404
        return next(error)
      }

      const candidateCount = await Candidate.countDocuments({ positionId })
      const voteCount = await Vote.countDocuments({ positionId })
      
      const canDelete = candidateCount === 0 && voteCount === 0
      const reasons = []
      
      if (candidateCount > 0) {
        reasons.push(`${candidateCount} candidate(s) associated`)
      }
      if (voteCount > 0) {
        reasons.push(`${voteCount} vote(s) associated`)
      }

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Checked deletion eligibility for departmental position: ${position.positionName} (Can delete: ${canDelete}, Reasons: ${reasons.join(', ') || 'None'})`,
        req
      )

      res.json({
        success: true,
        data: {
          canDelete,
          reasons,
          candidateCount,
          voteCount
        }
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Failed to check departmental position deletion eligibility for ${req.params.positionId}: ${error.message}`,
        req
      )
      next(error)
    }
  }
}

module.exports = PositionController