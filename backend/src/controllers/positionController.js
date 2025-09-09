const mongoose = require("mongoose")
const Position = require("../models/Position")
const Election = require("../models/Election")
const Candidate = require("../models/Candidate")
const Vote = require("../models/Vote")
const AuditLog = require("../models/AuditLog")

class PositionController {
  // Get all positions
  static async getAllPositions(req, res, next) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        electionId, 
        isActive, 
        sortBy = 'positionOrder',
        sortOrder = 'asc',
        search 
      } = req.query

      const query = {}
      
      if (electionId) {
        if (!mongoose.Types.ObjectId.isValid(electionId)) {
          await AuditLog.logUserAction(
            "SYSTEM_ACCESS",
            req.user,
            `Failed to retrieve positions - Invalid election ID: ${electionId}`,
            req
          )
          const error = new Error("Invalid election ID")
          error.statusCode = 400
          return next(error)
        }
        query.electionId = electionId
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
      const limitNum = Math.min(Number.parseInt(limit), 100) // Max 100 items per page

      const positions = await Position.find(query)
        .populate('electionId', 'title electionType electionYear status')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean()

      const total = await Position.countDocuments(query)
      const totalPages = Math.ceil(total / limitNum)

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved ${positions.length} positions with filters: ${JSON.stringify({ electionId, isActive, page, limit, search })}`,
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
        `Failed to retrieve positions: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get position by ID
  static async getPositionById(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to retrieve position - Invalid position ID: ${id}`,
          req
        )
        const error = new Error("Invalid position ID")
        error.statusCode = 400
        return next(error)
      }

      const position = await Position.findById(id)
        .populate('electionId', 'title electionType electionYear status department')
        .lean()

      if (!position) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Attempted to access non-existent position: ${id}`,
          req
        )
        
        const error = new Error("Position not found")
        error.statusCode = 404
        return next(error)
      }

      // Get candidate count for this position
      const candidateCount = await Candidate.countDocuments({ positionId: id })
      const voteCount = await Vote.countDocuments({ positionId: id })

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved position: ${position.positionName} (${id}) - Candidates: ${candidateCount}, Votes: ${voteCount}`,
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
        `Failed to retrieve position ${req.params.id}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Create new position
  static async createPosition(req, res, next) {
    try {
      const { 
        electionId, 
        positionName, 
        positionOrder = 1,
        maxVotes = 1,
        description 
      } = req.body

      // Validation
      if (!electionId || !positionName) {
        await AuditLog.logUserAction(
          "CREATE_POSITION",
          req.user,
          `Failed to create position - Missing required fields: electionId=${!!electionId}, positionName=${!!positionName}`,
          req
        )
        
        const error = new Error("Election ID and position name are required")
        error.statusCode = 400
        return next(error)
      }

      if (!mongoose.Types.ObjectId.isValid(electionId)) {
        await AuditLog.logUserAction(
          "CREATE_POSITION",
          req.user,
          `Failed to create position - Invalid election ID: ${electionId}`,
          req
        )
        
        const error = new Error("Invalid election ID")
        error.statusCode = 400
        return next(error)
      }

      // Check if election exists
      const election = await Election.findById(electionId)
      if (!election) {
        await AuditLog.logUserAction(
          "CREATE_POSITION",
          req.user,
          `Failed to create position - Election not found: ${electionId}`,
          req
        )
        
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if position already exists for this election
      const existingPosition = await Position.findOne({ 
        electionId, 
        positionName: { $regex: new RegExp(`^${positionName.trim()}$`, 'i') }
      })
      
      if (existingPosition) {
        await AuditLog.logUserAction(
          "CREATE_POSITION",
          req.user,
          `Failed to create position - Position already exists: ${positionName.trim()} for election ${election.title}`,
          req
        )
        
        const error = new Error("Position already exists for this election")
        error.statusCode = 400
        return next(error)
      }

      // Validate maxVotes
      if (maxVotes < 1) {
        const error = new Error("Maximum votes must be at least 1")
        error.statusCode = 400
        return next(error)
      }

      // Create position
      const position = new Position({
        electionId,
        positionName: positionName.trim(),
        positionOrder: parseInt(positionOrder),
        maxVotes: parseInt(maxVotes),
        description: description?.trim() || null
      })

      await position.save()

      // Populate election data for response
      await position.populate('electionId', 'title electionType electionYear')

      await AuditLog.logUserAction(
        "CREATE_POSITION",
        req.user,
        `Created position: ${position.positionName} for election ${election.title} (Order: ${position.positionOrder}, Max Votes: ${position.maxVotes})`,
        req
      )

      res.status(201).json({
        success: true,
        message: "Position created successfully",
        data: position
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "CREATE_POSITION",
        req.user,
        `Failed to create position: ${error.message}`,
        req
      )
      
      if (error.code === 11000) {
        error.message = "Position already exists for this election"
        error.statusCode = 400
      }
      next(error)
    }
  }

  // Update position
  static async updatePosition(req, res, next) {
    try {
      const { id } = req.params
      const updates = req.body

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to update position - Invalid position ID: ${id}`,
          req
        )
        const error = new Error("Invalid position ID")
        error.statusCode = 400
        return next(error)
      }

      const position = await Position.findById(id).populate('electionId', 'title')
      if (!position) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to update position - Position not found: ${id}`,
          req
        )
        
        const error = new Error("Position not found")
        error.statusCode = 404
        return next(error)
      }

      // Store original data for audit log
      const originalData = {
        positionName: position.positionName,
        positionOrder: position.positionOrder,
        maxVotes: position.maxVotes,
        description: position.description,
        isActive: position.isActive
      }

      // Apply updates
      const allowedUpdates = ['positionName', 'positionOrder', 'maxVotes', 'description', 'isActive']
      const actualUpdates = {}

      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          if (field === 'positionName' && updates[field]) {
            actualUpdates[field] = updates[field].trim()
          } else if (field === 'positionOrder' || field === 'maxVotes') {
            const numValue = parseInt(updates[field])
            if (field === 'maxVotes' && numValue < 1) {
              throw new Error("Maximum votes must be at least 1")
            }
            actualUpdates[field] = numValue
          } else if (field === 'description') {
            actualUpdates[field] = updates[field]?.trim() || null
          } else {
            actualUpdates[field] = updates[field]
          }
        }
      })

      // Check for duplicate position name if updating name
      if (actualUpdates.positionName && actualUpdates.positionName !== position.positionName) {
        const existingPosition = await Position.findOne({
          electionId: position.electionId,
          positionName: { $regex: new RegExp(`^${actualUpdates.positionName}$`, 'i') },
          _id: { $ne: id }
        })

        if (existingPosition) {
          await AuditLog.logUserAction(
            "UPDATE_POSITION",
            req.user,
            `Failed to update position - Name already exists: ${actualUpdates.positionName} in election ${position.electionId.title}`,
            req
          )
          
          const error = new Error("Position name already exists for this election")
          error.statusCode = 400
          return next(error)
        }
      }

      const updatedPosition = await Position.findByIdAndUpdate(
        id,
        actualUpdates,
        { new: true, runValidators: true }
      ).populate('electionId', 'title electionType electionYear')

      // Create audit log with change details
      const changes = []
      Object.keys(actualUpdates).forEach(key => {
        if (originalData[key] !== actualUpdates[key]) {
          changes.push(`${key}: "${originalData[key]}" → "${actualUpdates[key]}"`)
        }
      })

      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Updated position: ${updatedPosition.positionName} in election ${position.electionId.title}. Changes: ${changes.join(', ')}`,
        req
      )

      res.json({
        success: true,
        message: "Position updated successfully",
        data: updatedPosition
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Failed to update position ${req.params.id}: ${error.message}`,
        req
      )
      
      if (error.code === 11000) {
        error.message = "Position name already exists for this election"
        error.statusCode = 400
      }
      next(error)
    }
  }

  // Delete position
  static async deletePosition(req, res, next) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          "DELETE_POSITION",
          req.user,
          `Failed to delete position - Invalid position ID: ${id}`,
          req
        )
        const error = new Error("Invalid position ID")
        error.statusCode = 400
        return next(error)
      }

      const position = await Position.findById(id).populate('electionId', 'title')
      if (!position) {
        await AuditLog.logUserAction(
          "DELETE_POSITION",
          req.user,
          `Failed to delete position - Position not found: ${id}`,
          req
        )
        
        const error = new Error("Position not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if position has candidates
      const candidateCount = await Candidate.countDocuments({ positionId: id })
      
      if (candidateCount > 0) {
        await AuditLog.logUserAction(
          "DELETE_POSITION",
          req.user,
          `Failed to delete position - Has ${candidateCount} candidates: ${position.positionName} in election ${position.electionId.title}`,
          req
        )
        
        const error = new Error(`Cannot delete position. It has ${candidateCount} candidate(s) associated with it.`)
        error.statusCode = 400
        return next(error)
      }

      // Check if position has votes
      const voteCount = await Vote.countDocuments({ positionId: id })
      
      if (voteCount > 0) {
        await AuditLog.logUserAction(
          "DELETE_POSITION",
          req.user,
          `Failed to delete position - Has ${voteCount} votes: ${position.positionName} in election ${position.electionId.title}`,
          req
        )
        
        const error = new Error(`Cannot delete position. It has ${voteCount} vote(s) associated with it.`)
        error.statusCode = 400
        return next(error)
      }

      await Position.findByIdAndDelete(id)

      await AuditLog.logUserAction(
        "DELETE_POSITION",
        req.user,
        `Deleted position: ${position.positionName} from election ${position.electionId.title} (Order: ${position.positionOrder})`,
        req
      )

      res.json({
        success: true,
        message: "Position deleted successfully"
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "DELETE_POSITION",
        req.user,
        `Failed to delete position ${req.params.id}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get positions by election
  static async getPositionsByElection(req, res, next) {
    try {
      const { electionId } = req.params
      const { isActive, sortBy = 'positionOrder', sortOrder = 'asc' } = req.query

      if (!mongoose.Types.ObjectId.isValid(electionId)) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user || { username: "anonymous" },
          `Failed to retrieve positions - Invalid election ID: ${electionId}`,
          req
        )
        const error = new Error("Invalid election ID")
        error.statusCode = 400
        return next(error)
      }

      // Check if election exists
      const election = await Election.findById(electionId)
      if (!election) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user || { username: "anonymous" },
          `Failed to retrieve positions - Election not found: ${electionId}`,
          req
        )
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }

      const query = { electionId }
      if (isActive !== undefined) {
        query.isActive = isActive === 'true'
      }

      const sortOptions = {}
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1

      const positions = await Position.find(query)
        .sort(sortOptions)
        .lean()

      // Get candidate counts for each position
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
        `Retrieved ${positions.length} positions for election: ${election.title} (${electionId})`,
        req
      )

      res.json({
        success: true,
        data: positionsWithCounts,
        election: {
          id: election._id,
          title: election.title,
          electionType: election.electionType,
          status: election.status
        }
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user || { username: "anonymous" },
        `Failed to retrieve positions for election ${req.params.electionId}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Reorder positions within an election
  static async reorderPositions(req, res, next) {
    try {
      const { electionId } = req.params
      const { positionOrders } = req.body

      if (!mongoose.Types.ObjectId.isValid(electionId)) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to reorder positions - Invalid election ID: ${electionId}`,
          req
        )
        const error = new Error("Invalid election ID")
        error.statusCode = 400
        return next(error)
      }

      if (!Array.isArray(positionOrders) || positionOrders.length === 0) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to reorder positions - Invalid position orders format for election: ${electionId}`,
          req
        )
        const error = new Error("Position orders must be a non-empty array")
        error.statusCode = 400
        return next(error)
      }

      const election = await Election.findById(electionId)
      if (!election) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to reorder positions - Election not found: ${electionId}`,
          req
        )
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }

      // Validate all position IDs belong to this election
      const positionIds = positionOrders.map(po => po.positionId)
      const validPositions = await Position.find({ 
        _id: { $in: positionIds }, 
        electionId 
      })

      if (validPositions.length !== positionIds.length) {
        await AuditLog.logUserAction(
          "UPDATE_POSITION",
          req.user,
          `Failed to reorder positions - Some positions don't belong to election: ${electionId}`,
          req
        )
        const error = new Error("Some positions don't belong to this election")
        error.statusCode = 400
        return next(error)
      }

      const bulkOps = positionOrders.map(({ positionId, positionOrder }) => ({
        updateOne: {
          filter: { _id: positionId, electionId },
          update: { positionOrder: parseInt(positionOrder) }
        }
      }))

      await Position.bulkWrite(bulkOps)

      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Reordered ${positionOrders.length} positions for election: ${election.title}`,
        req
      )

      res.json({
        success: true,
        message: "Positions reordered successfully"
      })
    } catch (error) {
      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Failed to reorder positions for election ${req.params.electionId}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Get position statistics
  static async getPositionStats(req, res, next) {
    try {
      const { positionId } = req.params

      if (!mongoose.Types.ObjectId.isValid(positionId)) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to get position stats - Invalid position ID: ${positionId}`,
          req
        )
        const error = new Error("Invalid position ID")
        error.statusCode = 400
        return next(error)
      }

      const position = await Position.findById(positionId).populate('electionId', 'title')
      if (!position) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to get position stats - Position not found: ${positionId}`,
          req
        )
        const error = new Error("Position not found")
        error.statusCode = 404
        return next(error)
      }

      const candidateCount = await Candidate.countDocuments({ positionId })
      const voteCount = await Vote.countDocuments({ positionId })

      // Get candidate details with vote counts
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
        candidateCount,
        totalVotes: voteCount,
        candidates: candidatesWithVotes.sort((a, b) => b.voteCount - a.voteCount),
        election: position.electionId
      }

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved stats for position: ${position.positionName} (Candidates: ${candidateCount}, Votes: ${voteCount})`,
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
        `Failed to retrieve position stats for ${req.params.positionId}: ${error.message}`,
        req
      )
      next(error)
    }
  }

  // Check if position can be deleted
  static async canDeletePosition(req, res, next) {
    try {
      const { positionId } = req.params

      if (!mongoose.Types.ObjectId.isValid(positionId)) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to check position deletion - Invalid position ID: ${positionId}`,
          req
        )
        const error = new Error("Invalid position ID")
        error.statusCode = 400
        return next(error)
      }

      const position = await Position.findById(positionId)
      if (!position) {
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          req.user,
          `Failed to check position deletion - Position not found: ${positionId}`,
          req
        )
        const error = new Error("Position not found")
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
        `Checked deletion eligibility for position: ${position.positionName} (Can delete: ${canDelete}, Reasons: ${reasons.join(', ') || 'None'})`,
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
        `Failed to check position deletion eligibility for ${req.params.positionId}: ${error.message}`,
        req
      )
      next(error)
    }
  }
}

module.exports = PositionController