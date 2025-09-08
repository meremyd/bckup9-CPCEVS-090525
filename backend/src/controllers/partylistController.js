const mongoose = require("mongoose")
const Partylist = require("../models/Partylist")
const Election = require("../models/Election")
const Candidate = require("../models/Candidate")
const AuditLog = require("../models/AuditLog")

class PartylistController {
  // Get all partylists
  static async getAllPartylists(req, res, next) {
    try {
      const { electionId, search, page = 1, limit = 50 } = req.query

      // Build filter
      const filter = {}
      if (electionId) filter.electionId = electionId
      if (search) {
        filter.$or = [
          { partylistId: { $regex: search, $options: "i" } },
          { partylistName: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } }
        ]
      }

      // Pagination
      const skip = (page - 1) * limit

      const partylists = await Partylist.find(filter)
        .populate("electionId", "title electionId electionYear status")
        .sort({ partylistName: 1 })
        .skip(skip)
        .limit(Number.parseInt(limit))

      const total = await Partylist.countDocuments(filter)

      // Add candidate count for each partylist
      const partylistsWithStats = await Promise.all(partylists.map(async (partylist) => {
        const candidateCount = await Candidate.countDocuments({ partylistId: partylist._id })
        const totalVotes = await Candidate.aggregate([
          { $match: { partylistId: partylist._id } },
          { $group: { _id: null, totalVotes: { $sum: "$voteCount" } } }
        ])
        
        return {
          ...partylist.toObject(),
          statistics: {
            candidateCount,
            totalVotes: totalVotes[0]?.totalVotes || 0
          }
        }
      }))

      // Log the access
      await AuditLog.create({
        action: "SYSTEM_ACCESS",
        username: req.user?.username || "system",
        details: `Partylists accessed - ${partylists.length} partylists returned`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        partylists: partylistsWithStats,
        pagination: {
          current: Number.parseInt(page),
          total: Math.ceil(total / limit),
          count: partylists.length,
          totalPartylists: total,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // Get single partylist
  static async getPartylist(req, res, next) {
    try {
      const { id } = req.params

      const partylist = await Partylist.findById(id)
        .populate("electionId", "title electionId electionYear status electionType department")

      if (!partylist) {
        const error = new Error("Partylist not found")
        error.statusCode = 404
        return next(error)
      }

      // Get candidates for this partylist
      const candidates = await Candidate.find({ partylistId: id })
        .populate("voterId", "firstName middleName lastName schoolId")
        .populate("positionId", "positionName positionOrder")
        .sort({ candidateNumber: 1 })

      // Calculate statistics
      const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0)

      res.json({
        partylist,
        candidates,
        statistics: {
          candidateCount: candidates.length,
          totalVotes,
          averageVotesPerCandidate: candidates.length > 0 ? (totalVotes / candidates.length).toFixed(2) : 0
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Create new partylist
  static async createPartylist(req, res, next) {
    try {
      const { partylistId, electionId, partylistName, description, logo } = req.body

      // Validation
      if (!partylistId || !electionId || !partylistName) {
        const error = new Error("Partylist ID, election ID, and partylist name are required")
        error.statusCode = 400
        return next(error)
      }

      // Validate election exists and is not completed or cancelled
      const election = await Election.findById(electionId)
      if (!election) {
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }

      if (election.status === "completed" || election.status === "cancelled") {
        const error = new Error("Cannot add partylists to completed or cancelled elections")
        error.statusCode = 400
        return next(error)
      }

      // Check if partylist ID already exists globally
      const existingPartylistId = await Partylist.findOne({ partylistId })
      if (existingPartylistId) {
        const error = new Error("Partylist ID already exists")
        error.statusCode = 400
        return next(error)
      }

      // Check if partylist name exists in this election
      const existingPartylistName = await Partylist.findOne({ 
        electionId, 
        partylistName: partylistName.trim() 
      })
      if (existingPartylistName) {
        const error = new Error("Partylist name already exists in this election")
        error.statusCode = 400
        return next(error)
      }

      // Process logo if provided
      let logoBuffer = null
      if (logo) {
        if (typeof logo === 'string' && logo.startsWith('data:image/')) {
          // Handle base64 image
          const base64Data = logo.replace(/^data:image\/\w+;base64,/, '')
          logoBuffer = Buffer.from(base64Data, 'base64')
          
          // Validate file size (max 2MB)
          if (logoBuffer.length > 2 * 1024 * 1024) {
            const error = new Error("Logo file size must be less than 2MB")
            error.statusCode = 400
            return next(error)
          }
        } else {
          const error = new Error("Invalid logo format. Must be base64 encoded image.")
          error.statusCode = 400
          return next(error)
        }
      }

      const partylist = new Partylist({
        partylistId: partylistId.trim().toUpperCase(),
        electionId,
        partylistName: partylistName.trim(),
        description: description?.trim() || null,
        logo: logoBuffer,
      })

      await partylist.save()
      await partylist.populate("electionId", "title electionId electionYear")

      // Log the creation
      await AuditLog.create({
        action: "CREATE_PARTYLIST",
        username: req.user?.username || "system",
        details: `Partylist created - ${partylist.partylistName} (${partylist.partylistId}) for election ${election.title}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.status(201).json(partylist)
    } catch (error) {
      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0]
        if (field === 'partylistName') {
          error.message = "Partylist name already exists in this election"
          error.statusCode = 400
        }
      }
      next(error)
    }
  }

  // Update partylist
  static async updatePartylist(req, res, next) {
    try {
      const { id } = req.params
      const { partylistName, description, logo } = req.body

      const partylist = await Partylist.findById(id)
        .populate("electionId", "title status")

      if (!partylist) {
        const error = new Error("Partylist not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if election allows modifications
      if (partylist.electionId.status === "completed") {
        const error = new Error("Cannot modify partylists in completed elections")
        error.statusCode = 400
        return next(error)
      }

      // Check for candidates if trying to change critical info during active election
      const candidateCount = await Candidate.countDocuments({ partylistId: id })
      if (partylist.electionId.status === "active" && candidateCount > 0 && partylistName) {
        const error = new Error("Cannot change partylist name during active election with existing candidates")
        error.statusCode = 400
        return next(error)
      }

      const updateData = {}

      // Validate and update partylist name
      if (partylistName !== undefined) {
        const trimmedName = partylistName.trim()
        if (!trimmedName) {
          const error = new Error("Partylist name cannot be empty")
          error.statusCode = 400
          return next(error)
        }

        // Check for duplicate name in same election (excluding current)
        const existingName = await Partylist.findOne({
          electionId: partylist.electionId._id,
          partylistName: trimmedName,
          _id: { $ne: id }
        })
        
        if (existingName) {
          const error = new Error("Partylist name already exists in this election")
          error.statusCode = 400
          return next(error)
        }

        updateData.partylistName = trimmedName
      }

      // Update description
      if (description !== undefined) {
        updateData.description = description?.trim() || null
      }

      // Process logo update
      if (logo !== undefined) {
        if (logo === null) {
          updateData.logo = null
        } else if (typeof logo === 'string' && logo.startsWith('data:image/')) {
          const base64Data = logo.replace(/^data:image\/\w+;base64,/, '')
          const logoBuffer = Buffer.from(base64Data, 'base64')
          
          if (logoBuffer.length > 2 * 1024 * 1024) {
            const error = new Error("Logo file size must be less than 2MB")
            error.statusCode = 400
            return next(error)
          }
          
          updateData.logo = logoBuffer
        } else {
          const error = new Error("Invalid logo format. Must be base64 encoded image or null.")
          error.statusCode = 400
          return next(error)
        }
      }

      const updatedPartylist = await Partylist.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
      }).populate("electionId", "title electionId electionYear status")

      // Log the update
      await AuditLog.create({
        action: "UPDATE_PARTYLIST",
        username: req.user?.username || "system",
        details: `Partylist updated - ${updatedPartylist.partylistName} (${updatedPartylist.partylistId})${candidateCount > 0 ? ` - ${candidateCount} candidates affected` : ""}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json(updatedPartylist)
    } catch (error) {
      next(error)
    }
  }

  // Delete partylist
  static async deletePartylist(req, res, next) {
    try {
      const { id } = req.params
      const { force = false } = req.query

      const partylist = await Partylist.findById(id)
        .populate("electionId", "title status")

      if (!partylist) {
        const error = new Error("Partylist not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if election allows deletions
      if (partylist.electionId.status === "completed" && !force) {
        const error = new Error("Cannot delete partylists from completed elections. Use ?force=true to override.")
        error.statusCode = 400
        return next(error)
      }

      // Check for associated candidates
      const candidateCount = await Candidate.countDocuments({ partylistId: id })
      if (candidateCount > 0 && !force) {
        const error = new Error(`Cannot delete partylist. ${candidateCount} candidates are associated with it. Use ?force=true to delete anyway.`)
        error.statusCode = 400
        return next(error)
      }

      // If force delete, update candidates to remove partylist association
      if (candidateCount > 0 && force) {
        await Candidate.updateMany(
          { partylistId: id },
          { $unset: { partylistId: 1 } }
        )
      }

      await Partylist.findByIdAndDelete(id)

      // Log the deletion
      await AuditLog.create({
        action: "DELETE_PARTYLIST",
        username: req.user?.username || "system",
        details: `Partylist deleted - ${partylist.partylistName} (${partylist.partylistId})${candidateCount > 0 ? ` - ${candidateCount} candidates unlinked` : ""}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({ 
        message: "Partylist deleted successfully",
        warning: candidateCount > 0 ? `${candidateCount} candidates were unlinked from this partylist` : null
      })
    } catch (error) {
      next(error)
    }
  }

  // Get partylist statistics
  static async getPartylistStatistics(req, res, next) {
    try {
      const { id } = req.params

      const partylist = await Partylist.findById(id)
        .populate("electionId", "title electionYear status")

      if (!partylist) {
        const error = new Error("Partylist not found")
        error.statusCode = 404
        return next(error)
      }

      // Get detailed candidate statistics
      const candidateStats = await Candidate.aggregate([
        { $match: { partylistId: new mongoose.Types.ObjectId(id) } },
        {
          $lookup: {
            from: "positions",
            localField: "positionId",
            foreignField: "_id",
            as: "position"
          }
        },
        { $unwind: "$position" },
        {
          $group: {
            _id: {
              positionId: "$position._id",
              positionName: "$position.positionName",
              positionOrder: "$position.positionOrder"
            },
            candidates: {
              $push: {
                candidateNumber: "$candidateNumber",
                voteCount: "$voteCount",
                voterName: "$voterId"
              }
            },
            totalVotes: { $sum: "$voteCount" },
            candidateCount: { $sum: 1 }
          }
        },
        { $sort: { "_id.positionOrder": 1 } }
      ])

      // Overall statistics
      const totalCandidates = await Candidate.countDocuments({ partylistId: id })
      const totalVotes = await Candidate.aggregate([
        { $match: { partylistId: new mongoose.Types.ObjectId(id) } },
        { $group: { _id: null, total: { $sum: "$voteCount" } } }
      ])

      res.json({
        partylist,
        statistics: {
          totalCandidates,
          totalVotes: totalVotes[0]?.total || 0,
          averageVotesPerCandidate: totalCandidates > 0 ? ((totalVotes[0]?.total || 0) / totalCandidates).toFixed(2) : 0,
          byPosition: candidateStats
        }
      })
    } catch (error) {
      next(error)
    }
  }

  // Get partylists by election
  static async getPartylistsByElection(req, res, next) {
    try {
      const { electionId } = req.params

      // Validate election exists
      const election = await Election.findById(electionId)
      if (!election) {
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }

      const partylists = await Partylist.find({ electionId })
        .sort({ partylistName: 1 })

      // Add candidate counts
      const partylistsWithCounts = await Promise.all(partylists.map(async (partylist) => {
        const candidateCount = await Candidate.countDocuments({ partylistId: partylist._id })
        return {
          ...partylist.toObject(),
          candidateCount
        }
      }))

      res.json({
        election: {
          _id: election._id,
          title: election.title,
          electionId: election.electionId,
          status: election.status
        },
        partylists: partylistsWithCounts
      })
    } catch (error) {
      next(error)
    }
  }

  // Bulk operations
  static async bulkCreatePartylists(req, res, next) {
    try {
      const { partylists, electionId } = req.body

      if (!Array.isArray(partylists) || partylists.length === 0) {
        const error = new Error("Partylists array is required and must not be empty")
        error.statusCode = 400
        return next(error)
      }

      if (!electionId) {
        const error = new Error("Election ID is required for bulk creation")
        error.statusCode = 400
        return next(error)
      }

      // Validate election
      const election = await Election.findById(electionId)
      if (!election) {
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }

      if (election.status === "completed" || election.status === "cancelled") {
        const error = new Error("Cannot add partylists to completed or cancelled elections")
        error.statusCode = 400
        return next(error)
      }

      // Validate and prepare partylists
      const validatedPartylists = partylists.map((partylist, index) => {
        if (!partylist.partylistId || !partylist.partylistName) {
          throw new Error(`Partylist at index ${index} must have partylistId and partylistName`)
        }
        
        return {
          partylistId: partylist.partylistId.trim().toUpperCase(),
          electionId,
          partylistName: partylist.partylistName.trim(),
          description: partylist.description?.trim() || null,
          logo: null // Bulk creation doesn't support logos
        }
      })

      const createdPartylists = await Partylist.insertMany(validatedPartylists, { ordered: false })

      // Log the bulk creation
      await AuditLog.create({
        action: "BULK_CREATE_PARTYLISTS",
        username: req.user?.username || "system",
        details: `Bulk created ${createdPartylists.length} partylists for election ${election.title}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.status(201).json({
        message: `Successfully created ${createdPartylists.length} partylists`,
        partylists: createdPartylists
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = PartylistController