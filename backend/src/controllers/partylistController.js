const mongoose = require("mongoose")
const Partylist = require("../models/Partylist")
const SSGElection = require("../models/SSGElection")
const Candidate = require("../models/Candidate")
const AuditLog = require("../models/AuditLog")

class PartylistController {
  // Get all partylists
  static async getAllPartylists(req, res, next) {
    try {
      const { ssgElectionId, search, page = 1, limit = 50, status } = req.query

      // Build filter
      const filter = {}
      if (ssgElectionId) filter.ssgElectionId = ssgElectionId
      if (status) filter.isActive = status === 'active'
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
        .populate("ssgElectionId", "title ssgElectionId electionYear status electionDate")
        .sort({ partylistName: 1 })
        .skip(skip)
        .limit(Number.parseInt(limit))

      const total = await Partylist.countDocuments(filter)

      // Add candidate count for each partylist
      const partylistsWithStats = await Promise.all(partylists.map(async (partylist) => {
        const candidateCount = await Candidate.countDocuments({ 
          partylistId: partylist._id,
          ssgElectionId: partylist.ssgElectionId._id,
          isActive: true
        })
        
        const totalVotes = await Candidate.aggregate([
          { 
            $match: { 
              partylistId: partylist._id,
              ssgElectionId: partylist.ssgElectionId._id,
              isActive: true
            } 
          },
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
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Partylists accessed - ${partylists.length} partylists returned`,
        req
      )

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

  // Get partylists by SSG election
  static async getPartylistsBySSGElection(req, res, next) {
    try {
      const { ssgElectionId } = req.params

      // Validate SSG election exists
      const ssgElection = await SSGElection.findById(ssgElectionId)
      if (!ssgElection) {
        const error = new Error("SSG Election not found")
        error.statusCode = 404
        return next(error)
      }

      const partylists = await Partylist.find({ 
        ssgElectionId,
        isActive: true 
      }).sort({ partylistName: 1 })

      // Add candidate counts
      const partylistsWithCounts = await Promise.all(partylists.map(async (partylist) => {
        const candidateCount = await Candidate.countDocuments({ 
          partylistId: partylist._id,
          isActive: true
        })
        const totalVotes = await Candidate.aggregate([
          { 
            $match: { 
              partylistId: partylist._id,
              isActive: true
            } 
          },
          { $group: { _id: null, totalVotes: { $sum: "$voteCount" } } }
        ])
        
        return {
          ...partylist.toObject(),
          candidateCount,
          totalVotes: totalVotes[0]?.totalVotes || 0
        }
      }))

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved partylists for SSG election: ${ssgElection.title}`,
        req
      )

      res.json({
        ssgElection: {
          _id: ssgElection._id,
          title: ssgElection.title,
          ssgElectionId: ssgElection.ssgElectionId,
          status: ssgElection.status,
          electionDate: ssgElection.electionDate
        },
        partylists: partylistsWithCounts
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
        .populate("ssgElectionId", "title ssgElectionId electionYear status electionDate")

      if (!partylist) {
        const error = new Error("Partylist not found")
        error.statusCode = 404
        return next(error)
      }

      // Get candidates for this partylist
      const candidates = await Candidate.find({ 
        partylistId: id,
        isActive: true
      })
        .populate("voterId", "firstName middleName lastName schoolId departmentId yearLevel")
        .populate("positionId", "positionName positionOrder")
        .sort({ candidateNumber: 1 })

      // Calculate statistics
      const totalVotes = candidates.reduce((sum, candidate) => sum + (candidate.voteCount || 0), 0)

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved partylist: ${partylist.partylistName} (${partylist.partylistId})`,
        req
      )

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

  // Get partylist statistics
  static async getPartylistStatistics(req, res, next) {
    try {
      const { id } = req.params

      const partylist = await Partylist.findById(id)
        .populate("ssgElectionId", "title electionYear status electionDate")

      if (!partylist) {
        const error = new Error("Partylist not found")
        error.statusCode = 404
        return next(error)
      }

      // Get detailed candidate statistics
      const candidateStats = await Candidate.aggregate([
        { 
          $match: { 
            partylistId: new mongoose.Types.ObjectId(id),
            isActive: true
          } 
        },
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
          $lookup: {
            from: "voters",
            localField: "voterId",
            foreignField: "_id",
            as: "voter"
          }
        },
        { $unwind: "$voter" },
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
                voteCount: { $ifNull: ["$voteCount", 0] },
                voterName: {
                  $concat: [
                    "$voter.firstName",
                    " ",
                    { $ifNull: ["$voter.middleName", ""] },
                    " ",
                    "$voter.lastName"
                  ]
                },
                schoolId: "$voter.schoolId"
              }
            },
            totalVotes: { $sum: { $ifNull: ["$voteCount", 0] } },
            candidateCount: { $sum: 1 }
          }
        },
        { $sort: { "_id.positionOrder": 1 } }
      ])

      // Overall statistics
      const totalCandidates = await Candidate.countDocuments({ 
        partylistId: id,
        isActive: true
      })
      
      const totalVotes = await Candidate.aggregate([
        { 
          $match: { 
            partylistId: new mongoose.Types.ObjectId(id),
            isActive: true
          } 
        },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$voteCount", 0] } } } }
      ])

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved statistics for partylist: ${partylist.partylistName}`,
        req
      )

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

  // FIXED: Create new partylist with correct validation logic
  static async createPartylist(req, res, next) {
    try {
      const { partylistId, ssgElectionId, partylistName, description, logo } = req.body

      // Validation
      if (!partylistId || !ssgElectionId || !partylistName) {
        const error = new Error("Partylist ID, SSG election ID, and partylist name are required")
        error.statusCode = 400
        return next(error)
      }

      // Convert ssgElectionId to ObjectId if it's a string
      let electionObjectId
      try {
        electionObjectId = new mongoose.Types.ObjectId(ssgElectionId)
      } catch (err) {
        const error = new Error("Invalid SSG Election ID format")
        error.statusCode = 400
        return next(error)
      }

      // Validate SSG election exists and is not completed or cancelled
      const ssgElection = await SSGElection.findById(electionObjectId)
      if (!ssgElection) {
        const error = new Error("SSG Election not found")
        error.statusCode = 404
        return next(error)
      }

      if (ssgElection.status === "completed" || ssgElection.status === "cancelled") {
        const error = new Error("Cannot add partylists to completed or cancelled SSG elections")
        error.statusCode = 400
        return next(error)
      }

      // FIXED: Check partylist ID globally (across all elections)
      const existingPartylistId = await Partylist.findOne({ 
        partylistId: partylistId.trim().toUpperCase() 
      })
      if (existingPartylistId) {
        const error = new Error(`Partylist ID "${partylistId.trim().toUpperCase()}" already exists. Partylist IDs must be unique globally.`)
        error.statusCode = 400
        return next(error)
      }

      // FIXED: Check partylist name only within the specific SSG election
      const existingPartylistName = await Partylist.findOne({
        ssgElectionId: electionObjectId,
        partylistName: { $regex: new RegExp(`^${partylistName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      })
      
      if (existingPartylistName) {
        const error = new Error(`Partylist name "${partylistName.trim()}" already exists in this SSG election`)
        error.statusCode = 400
        return next(error)
      }

      // Process logo if provided
      let logoBuffer = null
      if (logo) {
        if (typeof logo === 'string' && logo.startsWith('data:image/')) {
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

      console.log('Creating partylist document...')
      const partylist = new Partylist({
        partylistId: partylistId.trim().toUpperCase(),
        ssgElectionId: electionObjectId,
        partylistName: partylistName.trim(),
        description: description?.trim() || null,
        logo: logoBuffer,
        isActive: true
      })

      console.log('Partylist document to save:', {
        partylistId: partylist.partylistId,
        ssgElectionId: partylist.ssgElectionId,
        partylistName: partylist.partylistName
      })

      await partylist.save()
      await partylist.populate("ssgElectionId", "title ssgElectionId electionYear")

      console.log('Partylist created successfully!')
      console.log('=== END DEBUG ===')

      // Log the creation
      await AuditLog.logUserAction(
        "CREATE_PARTYLIST",
        req.user,
        `Partylist created - ${partylist.partylistName} (${partylist.partylistId}) for SSG election ${ssgElection.title}`,
        req
      )

      res.status(201).json(partylist)
    } catch (error) {
      console.log('Error caught in createPartylist:', error.message)
      console.log('Error code:', error.code)
      console.log('Error keyPattern:', error.keyPattern)
      console.log('Error keyValue:', error.keyValue)
      console.log('=== END DEBUG ===')
      
      // Handle duplicate key errors with improved error messages
      if (error.code === 11000) {
        const keyPattern = error.keyPattern || {}
        const keyValue = error.keyValue || {}
        
        console.log('MongoDB duplicate key error details:', { keyPattern, keyValue })
        
        // Check the specific index that was violated
        if (keyPattern.partylistId === 1) {
          error.message = `Partylist ID "${keyValue.partylistId}" already exists globally`
          error.statusCode = 400
        } else if (keyPattern.ssgElectionId === 1 && keyPattern.partylistName === 1) {
          error.message = `Partylist name "${keyValue.partylistName}" already exists in this SSG election`
          error.statusCode = 400
        } else if (keyValue.partylistId) {
          error.message = `Partylist ID "${keyValue.partylistId}" already exists globally`
          error.statusCode = 400
        } else if (keyValue.partylistName) {
          error.message = `Partylist name "${keyValue.partylistName}" already exists in this SSG election`
          error.statusCode = 400
        } else {
          error.message = "Duplicate entry detected. Please check your input values."
          error.statusCode = 400
        }
      }
      next(error)
    }
  }

  // FIXED: Update partylist with correct validation logic
  static async updatePartylist(req, res, next) {
    try {
      const { id } = req.params
      const { partylistName, description, logo, isActive } = req.body

      const partylist = await Partylist.findById(id)
        .populate("ssgElectionId", "title status")

      if (!partylist) {
        const error = new Error("Partylist not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if SSG election allows modifications
      if (partylist.ssgElectionId.status === "completed") {
        const error = new Error("Cannot modify partylists in completed SSG elections")
        error.statusCode = 400
        return next(error)
      }

      // Check for candidates if trying to change critical info during active election
      const candidateCount = await Candidate.countDocuments({ 
        partylistId: id,
        isActive: true
      })
      
      if (partylist.ssgElectionId.status === "active" && candidateCount > 0 && partylistName) {
        const error = new Error("Cannot change partylist name during active SSG election with existing candidates")
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

        // FIXED: Check for duplicate name ONLY in same SSG election (excluding current partylist)
        const existingName = await Partylist.findOne({
          ssgElectionId: partylist.ssgElectionId._id,
          partylistName: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          _id: { $ne: id }
        })
        
        if (existingName) {
          const error = new Error(`Partylist name "${trimmedName}" already exists in this SSG election`)
          error.statusCode = 400
          return next(error)
        }

        updateData.partylistName = trimmedName
      }

      // Update description
      if (description !== undefined) {
        updateData.description = description?.trim() || null
      }

      // Update active status
      if (isActive !== undefined) {
        updateData.isActive = Boolean(isActive)
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
      }).populate("ssgElectionId", "title ssgElectionId electionYear status")

      // Log the update
      await AuditLog.logUserAction(
        "UPDATE_PARTYLIST",
        req.user,
        `Partylist updated - ${updatedPartylist.partylistName} (${updatedPartylist.partylistId})${candidateCount > 0 ? ` - ${candidateCount} candidates affected` : ""}`,
        req
      )

      res.json(updatedPartylist)
    } catch (error) {
      // Handle duplicate key errors
      if (error.code === 11000) {
        const keyPattern = error.keyPattern || {}
        const keyValue = error.keyValue || {}
        
        if ((keyPattern.ssgElectionId && keyPattern.partylistName) || keyValue.partylistName) {
          error.message = `Partylist name "${keyValue.partylistName || 'unknown'}" already exists in this SSG election`
          error.statusCode = 400
        } else {
          error.message = "Duplicate entry detected during update"
          error.statusCode = 400
        }
      }
      next(error)
    }
  }

  // Delete partylist
  static async deletePartylist(req, res, next) {
    try {
      const { id } = req.params
      const { force = false } = req.query

      const partylist = await Partylist.findById(id)
        .populate("ssgElectionId", "title status")

      if (!partylist) {
        const error = new Error("Partylist not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if SSG election allows deletions
      if (partylist.ssgElectionId.status === "completed" && !force) {
        const error = new Error("Cannot delete partylists from completed SSG elections. Use ?force=true to override.")
        error.statusCode = 400
        return next(error)
      }

      // Check for associated candidates
      const candidateCount = await Candidate.countDocuments({ 
        partylistId: id,
        isActive: true
      })
      
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
      await AuditLog.logUserAction(
        "DELETE_PARTYLIST",
        req.user,
        `Partylist deleted - ${partylist.partylistName} (${partylist.partylistId})${candidateCount > 0 ? ` - ${candidateCount} candidates unlinked` : ""}`,
        req
      )

      res.json({ 
        message: "Partylist deleted successfully",
        warning: candidateCount > 0 ? `${candidateCount} candidates were unlinked from this partylist` : null
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = PartylistController