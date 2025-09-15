const Position = require("../models/Position")
const Candidate = require("../models/Candidate")
const SSGElection = require("../models/SSGElection")
const DepartmentalElection = require("../models/DepartmentalElection")
const AuditLog = require("../models/AuditLog")
const mongoose = require("mongoose")

class PositionController {
  // SSG Position Controllers
  static async getAllSSGPositions(req, res) {
    try {
      const positions = await Position.find({ 
        ssgElectionId: { $ne: null },
        deptElectionId: null 
      })
      .populate('ssgElectionId', 'title electionYear status')
      .sort({ positionOrder: 1 })

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        "Retrieved all SSG positions",
        req
      )

      res.status(200).json({
        success: true,
        message: "SSG positions retrieved successfully",
        data: positions
      })
    } catch (error) {
      console.error("Error getting SSG positions:", error)
      res.status(500).json({
        success: false,
        message: "Failed to retrieve SSG positions",
        error: error.message
      })
    }
  }

  static async getSSGPositionById(req, res) {
    try {
      const { id } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid position ID format"
        })
      }

      const position = await Position.findOne({
        _id: id,
        ssgElectionId: { $ne: null },
        deptElectionId: null
      }).populate('ssgElectionId', 'title electionYear status')

      if (!position) {
        return res.status(404).json({
          success: false,
          message: "SSG position not found"
        })
      }

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved SSG position: ${position.positionName}`,
        req
      )

      res.status(200).json({
        success: true,
        message: "SSG position retrieved successfully",
        data: position
      })
    } catch (error) {
      console.error("Error getting SSG position:", error)
      res.status(500).json({
        success: false,
        message: "Failed to retrieve SSG position",
        error: error.message
      })
    }
  }

  static async createSSGPosition(req, res) {
  try {
    const { 
      ssgElectionId, 
      positionName, 
      positionOrder, 
      maxVotes, 
      maxCandidates, 
      maxCandidatesPerPartylist,  
      description 
    } = req.body

    // Validation
    if (!ssgElectionId || !positionName) {
      return res.status(400).json({
        success: false,
        message: "SSG Election ID and position name are required"
      })
    }

    // Validate maxCandidatesPerPartylist
    if (maxCandidatesPerPartylist !== undefined && 
        (!Number.isInteger(maxCandidatesPerPartylist) || maxCandidatesPerPartylist < 1)) {
      return res.status(400).json({
        success: false,
        message: "Maximum candidates per partylist must be a positive integer"
      })
    }

    // Check if SSG election exists
    const ssgElection = await SSGElection.findById(ssgElectionId)
    if (!ssgElection) {
      return res.status(404).json({
        success: false,
        message: "SSG election not found"
      })
    }

    // Check for duplicate position name ONLY in the same SSG election
    const existingPosition = await Position.findOne({
      ssgElectionId,
      deptElectionId: null,
      positionName: { $regex: new RegExp(`^${positionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    })

    if (existingPosition) {
      return res.status(400).json({
        success: false,
        message: "Position name already exists in this SSG election"
      })
    }

    // Get next position order if not provided
    let finalPositionOrder = positionOrder
    if (!finalPositionOrder) {
      const lastPosition = await Position.findOne({ 
        ssgElectionId,
        deptElectionId: null
      })
        .sort({ positionOrder: -1 })
      finalPositionOrder = lastPosition ? lastPosition.positionOrder + 1 : 1
    }

    const newPosition = new Position({
      ssgElectionId,
      deptElectionId: null,
      positionName: positionName.trim(),
      positionOrder: finalPositionOrder,
      maxVotes: maxVotes || 1,
      maxCandidates: maxCandidates || 10,
      maxCandidatesPerPartylist: maxCandidatesPerPartylist || 1,  // NEW FIELD
      description: description?.trim() || null
    })

    await newPosition.save()
    await newPosition.populate('ssgElectionId', 'title electionYear status')

    await AuditLog.logUserAction(
      "CREATE_POSITION",
      req.user,
      `Created SSG position: ${newPosition.positionName} (max ${newPosition.maxCandidatesPerPartylist} per partylist) for election ${ssgElection.title}`,
      req
    )

    res.status(201).json({
      success: true,
      message: "SSG position created successfully",
      data: newPosition
    })
  } catch (error) {
    console.error("Error creating SSG position:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create SSG position",
      error: error.message
    })
  }
}

  static async updateSSGPosition(req, res) {
  try {
    const { id } = req.params
    const { 
      positionName, 
      positionOrder, 
      maxVotes, 
      maxCandidates, 
      maxCandidatesPerPartylist,  // NEW FIELD
      description, 
      isActive 
    } = req.body


    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid position ID format"
      })
    }

    const position = await Position.findOne({
      _id: id,
      ssgElectionId: { $ne: null },
      deptElectionId: null
    })

    if (!position) {
      return res.status(404).json({
        success: false,
        message: "SSG position not found"
      })
    }

    // Check for duplicate position name ONLY within the same SSG election if name is being changed
    if (positionName && positionName !== position.positionName) {
      const existingPosition = await Position.findOne({
        ssgElectionId: position.ssgElectionId,
        deptElectionId: null,
        positionName: { $regex: new RegExp(`^${positionName}$`, 'i') },
        _id: { $ne: id }
      })

      if (existingPosition) {
        return res.status(400).json({
          success: false,
          message: "Position name already exists in this SSG election"
        })
      }
    }

    // Validate maxCandidatesPerPartylist if being updated
    if (maxCandidatesPerPartylist !== undefined) {
      if (!Number.isInteger(maxCandidatesPerPartylist) || maxCandidatesPerPartylist < 1) {
        return res.status(400).json({
          success: false,
          message: "Maximum candidates per partylist must be a positive integer"
        })
      }

      // Check if reducing the limit would affect existing candidates
      const Candidate = require("../models/Candidate")
      const maxCurrentCandidatesInAnyPartylist = await Candidate.aggregate([
        { 
          $match: { 
            positionId: position._id,
            partylistId: { $ne: null },
            isActive: true
          }
        },
        { 
          $group: { 
            _id: "$partylistId", 
            count: { $sum: 1 } 
          } 
        },
        { 
          $group: { 
            _id: null, 
            maxCount: { $max: "$count" } 
          } 
        }
      ])

      const currentMax = maxCurrentCandidatesInAnyPartylist[0]?.maxCount || 0
      
      if (currentMax > maxCandidatesPerPartylist) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce limit to ${maxCandidatesPerPartylist}. Some partylists currently have ${currentMax} candidates for this position.`
        })
      }
    }

    // Update fields
    if (positionName) position.positionName = positionName.trim()
    if (positionOrder !== undefined) position.positionOrder = positionOrder
    if (maxVotes !== undefined) position.maxVotes = maxVotes
    if (maxCandidates !== undefined) position.maxCandidates = maxCandidates
    if (maxCandidatesPerPartylist !== undefined) console.log('Setting maxCandidatesPerPartylist to:', maxCandidatesPerPartylist), position.maxCandidatesPerPartylist = maxCandidatesPerPartylist  // NEW
    if (maxCandidatesPerPartylist !== undefined) position.maxCandidatesPerPartylist = maxCandidatesPerPartylist
    if (description !== undefined) position.description = description?.trim() || null
    if (isActive !== undefined) position.isActive = isActive

    await position.save()
    await position.populate('ssgElectionId', 'title electionYear status')

    await AuditLog.logUserAction(
      "UPDATE_POSITION",
      req.user,
      `Updated SSG position: ${position.positionName} (max ${position.maxCandidatesPerPartylist} per partylist)`,
      req
    )

    res.status(200).json({
      success: true,
      message: "SSG position updated successfully",
      data: position
    })
  } catch (error) {
    console.error("Error updating SSG position:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update SSG position",
      error: error.message
    })
  }
}


static async getSSGPositionCandidateLimits(req, res) {
  try {
    const { ssgElectionId } = req.params

    if (!mongoose.Types.ObjectId.isValid(ssgElectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid SSG election ID format"
      })
    }

    // Check if SSG election exists
    const ssgElection = await SSGElection.findById(ssgElectionId)
    if (!ssgElection) {
      return res.status(404).json({
        success: false,
        message: "SSG election not found"
      })
    }

    // Get all positions for this SSG election
    const positions = await Position.find({
      ssgElectionId,
      isActive: true
    }).sort({ positionOrder: 1 })

    // Get candidate statistics for each position
    const Candidate = require("../models/Candidate")
    const Partylist = require("../models/Partylist")
    
    const positionsWithStats = await Promise.all(positions.map(async (position) => {
      // Get all partylists for this election
      const partylists = await Partylist.find({
        ssgElectionId,
        isActive: true
      }).select('_id partylistName')

      // Get candidate count per partylist for this position
      const partylistStats = await Promise.all(partylists.map(async (partylist) => {
        const candidateCount = await Candidate.countDocuments({
          positionId: position._id,
          partylistId: partylist._id,
          isActive: true
        })

        return {
          partylistId: partylist._id,
          partylistName: partylist.partylistName,
          currentCandidates: candidateCount,
          maxAllowed: position.maxCandidatesPerPartylist,
          canAddMore: candidateCount < position.maxCandidatesPerPartylist,
          remaining: Math.max(0, position.maxCandidatesPerPartylist - candidateCount),
          percentageFilled: position.maxCandidatesPerPartylist > 0 ? 
            Math.round((candidateCount / position.maxCandidatesPerPartylist) * 100) : 0
        }
      }))

      // Get total candidates (including independent)
      const totalCandidates = await Candidate.countDocuments({
        positionId: position._id,
        ssgElectionId,
        isActive: true
      })

      const independentCandidates = await Candidate.countDocuments({
        positionId: position._id,
        ssgElectionId,
        partylistId: null,
        isActive: true
      })

      return {
        positionId: position._id,
        positionName: position.positionName,
        positionOrder: position.positionOrder,
        maxCandidatesPerPartylist: position.maxCandidatesPerPartylist,
        totalCandidates,
        independentCandidates,
        partylistBreakdown: partylistStats,
        summary: {
          totalPartylists: partylists.length,
          partylistsAtCapacity: partylistStats.filter(p => !p.canAddMore).length,
          partylistsWithCandidates: partylistStats.filter(p => p.currentCandidates > 0).length
        }
      }
    }))

    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Retrieved position candidate limits for SSG election: ${ssgElection.title}`,
      req
    )

    res.status(200).json({
      success: true,
      message: "Position candidate limits retrieved successfully",
      data: {
        ssgElection: {
          _id: ssgElection._id,
          title: ssgElection.title,
          electionYear: ssgElection.electionYear,
          status: ssgElection.status
        },
        positions: positionsWithStats
      }
    })
  } catch (error) {
    console.error("Error getting position candidate limits:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve position candidate limits",
      error: error.message
    })
  }
}

// NEW: Validate if position can be deleted based on candidate limits
static async validateSSGPositionDeletion(req, res) {
  try {
    const { positionId } = req.params

    if (!mongoose.Types.ObjectId.isValid(positionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid position ID format"
      })
    }

    const position = await Position.findOne({
      _id: positionId,
      ssgElectionId: { $ne: null },
      deptElectionId: null
    })

    if (!position) {
      return res.status(404).json({
        success: false,
        message: "SSG position not found"
      })
    }

    const Candidate = require("../models/Candidate")
    const candidateCount = await Candidate.countDocuments({ 
      positionId,
      isActive: true 
    })

    const canDelete = candidateCount === 0
    
    // Get partylist breakdown if there are candidates
    let partylistBreakdown = []
    if (candidateCount > 0) {
      const breakdown = await Candidate.aggregate([
        { 
          $match: { 
            positionId: new mongoose.Types.ObjectId(positionId),
            isActive: true 
          } 
        },
        {
          $group: {
            _id: "$partylistId",
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: "partylists",
            localField: "_id",
            foreignField: "_id",
            as: "partylist"
          }
        },
        {
          $project: {
            partylistName: {
              $cond: {
                if: { $eq: ["$_id", null] },
                then: "Independent",
                else: { $arrayElemAt: ["$partylist.partylistName", 0] }
              }
            },
            candidateCount: "$count"
          }
        }
      ])
      
      partylistBreakdown = breakdown
    }

    res.status(200).json({
      success: true,
      message: "Position deletion validation completed",
      data: {
        positionName: position.positionName,
        maxCandidatesPerPartylist: position.maxCandidatesPerPartylist,
        canDelete,
        candidateCount,
        partylistBreakdown,
        reason: canDelete ? 
          "Position can be deleted safely" : 
          `Position has ${candidateCount} active candidate(s) assigned`
      }
    })
  } catch (error) {
    console.error("Error validating position deletion:", error)
    res.status(500).json({
      success: false,
      message: "Failed to validate position deletion",
      error: error.message
    })
  }
}

  static async deleteSSGPosition(req, res) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid position ID format"
        })
      }

      const position = await Position.findOne({
        _id: id,
        ssgElectionId: { $ne: null },
        deptElectionId: null
      })

      if (!position) {
        return res.status(404).json({
          success: false,
          message: "SSG position not found"
        })
      }

      // Check if position has candidates
      const candidateCount = await Candidate.countDocuments({ positionId: id })
      if (candidateCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete position. It has ${candidateCount} candidate(s) assigned.`
        })
      }

      const positionName = position.positionName
      await Position.findByIdAndDelete(id)

      await AuditLog.logUserAction(
        "DELETE_POSITION",
        req.user,
        `Deleted SSG position: ${positionName}`,
        req
      )

      res.status(200).json({
        success: true,
        message: "SSG position deleted successfully"
      })
    } catch (error) {
      console.error("Error deleting SSG position:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete SSG position",
        error: error.message
      })
    }
  }

  static async getPositionsBySSGElection(req, res) {
  try {
    const { ssgElectionId } = req.params

    if (!mongoose.Types.ObjectId.isValid(ssgElectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid SSG election ID format"
      })
    }

    // Check if SSG election exists
    const ssgElection = await SSGElection.findById(ssgElectionId)
    if (!ssgElection) {
      return res.status(404).json({
        success: false,
        message: "SSG election not found"
      })
    }

    // Get positions ONLY for the specific SSG election
    const ssgPositions = await Position.find({ 
      ssgElectionId: ssgElectionId,
      deptElectionId: null 
    })
    .populate('ssgElectionId', 'title electionYear status')
    .sort({ positionOrder: 1 })

    // For each position, count candidates
    const positionsWithCandidateCounts = await Promise.all(
      ssgPositions.map(async (position) => {
        // Count total candidates for this position
        const totalCandidates = await Candidate.countDocuments({ 
          positionId: position._id,
          ssgElectionId: position.ssgElectionId._id,
          isActive: true
        })

        return {
          _id: position._id,
          positionName: position.positionName,
          description: position.description,
          positionOrder: position.positionOrder,
          maxVotes: position.maxVotes,
          maxCandidates: position.maxCandidates,
          maxCandidatesPerPartylist: position.maxCandidatesPerPartylist,
          ssgElectionId: position.ssgElectionId,
          candidateCount: totalCandidates,
          isActive: position.isActive,
          createdAt: position.createdAt,
          updatedAt: position.updatedAt
        }
      })
    )
    // Calculate summary statistics
    const totalCandidates = positionsWithCandidateCounts
      .reduce((sum, position) => sum + position.candidateCount, 0)

    await AuditLog.logUserAction(
      "SYSTEM_ACCESS",
      req.user,
      `Retrieved SSG positions for election: ${ssgElection.title}`,
      req
    )

    res.status(200).json({
      success: true,
      message: "SSG positions retrieved successfully for selected election",
      data: {
        ssgElection: {
          _id: ssgElection._id,
          title: ssgElection.title,
          electionYear: ssgElection.electionYear,
          status: ssgElection.status
        },
        positions: positionsWithCandidateCounts,
        summary: {
          totalPositions: positionsWithCandidateCounts.length,
          totalCandidates: totalCandidates
        }
      }
    })
  } catch (error) {
    console.error("Error getting SSG election positions:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve SSG election positions",
      error: error.message
    })
  }
}

  static async getSSGPositionStats(req, res) {
    try {
      const { positionId } = req.params

      if (!mongoose.Types.ObjectId.isValid(positionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid position ID format"
        })
      }

      const position = await Position.findOne({
        _id: positionId,
        ssgElectionId: { $ne: null },
        deptElectionId: null
      }).populate('ssgElectionId', 'title electionYear status')

      if (!position) {
        return res.status(404).json({
          success: false,
          message: "SSG position not found"
        })
      }

      // Get candidate statistics
      const candidateStats = await Candidate.aggregate([
        { $match: { positionId: new mongoose.Types.ObjectId(positionId) } },
        {
          $group: {
            _id: null,
            totalCandidates: { $sum: 1 },
            activeCandidates: { $sum: { $cond: ["$isActive", 1, 0] } },
            inactiveCandidates: { $sum: { $cond: ["$isActive", 0, 1] } }
          }
        }
      ])

      const stats = candidateStats[0] || {
        totalCandidates: 0,
        activeCandidates: 0,
        inactiveCandidates: 0
      }

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved stats for SSG position: ${position.positionName}`,
        req
      )

      res.status(200).json({
        success: true,
        message: "SSG position statistics retrieved successfully",
        data: {
          position,
          statistics: stats
        }
      })
    } catch (error) {
      console.error("Error getting SSG position stats:", error)
      res.status(500).json({
        success: false,
        message: "Failed to retrieve SSG position statistics",
        error: error.message
      })
    }
  }

  static async canDeleteSSGPosition(req, res) {
    try {
      const { positionId } = req.params

      if (!mongoose.Types.ObjectId.isValid(positionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid position ID format"
        })
      }

      const position = await Position.findOne({
        _id: positionId,
        ssgElectionId: { $ne: null },
        deptElectionId: null
      })

      if (!position) {
        return res.status(404).json({
          success: false,
          message: "SSG position not found"
        })
      }

      const candidateCount = await Candidate.countDocuments({ positionId })
      const canDelete = candidateCount === 0

      res.status(200).json({
        success: true,
        message: "Delete eligibility checked successfully",
        data: {
          canDelete,
          candidateCount,
          reason: canDelete ? "Position can be deleted" : `Position has ${candidateCount} candidate(s) assigned`
        }
      })
    } catch (error) {
      console.error("Error checking SSG position delete eligibility:", error)
      res.status(500).json({
        success: false,
        message: "Failed to check delete eligibility",
        error: error.message
      })
    }
  }

  // Departmental Position Controllers
  static async getAllDepartmentalPositions(req, res) {
    try {
      const positions = await Position.find({ 
        deptElectionId: { $ne: null },
        ssgElectionId: null 
      })
      .populate({
        path: 'deptElectionId',
        select: 'title electionYear status departmentId',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })
      .sort({ positionOrder: 1 })

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        "Retrieved all departmental positions",
        req
      )

      res.status(200).json({
        success: true,
        message: "Departmental positions retrieved successfully",
        data: positions
      })
    } catch (error) {
      console.error("Error getting departmental positions:", error)
      res.status(500).json({
        success: false,
        message: "Failed to retrieve departmental positions",
        error: error.message
      })
    }
  }

  static async getDepartmentalPositionById(req, res) {
    try {
      const { id } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid position ID format"
        })
      }

      const position = await Position.findOne({
        _id: id,
        deptElectionId: { $ne: null },
        ssgElectionId: null
      }).populate({
        path: 'deptElectionId',
        select: 'title electionYear status departmentId',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })

      if (!position) {
        return res.status(404).json({
          success: false,
          message: "Departmental position not found"
        })
      }

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved departmental position: ${position.positionName}`,
        req
      )

      res.status(200).json({
        success: true,
        message: "Departmental position retrieved successfully",
        data: position
      })
    } catch (error) {
      console.error("Error getting departmental position:", error)
      res.status(500).json({
        success: false,
        message: "Failed to retrieve departmental position",
        error: error.message
      })
    }
  }

  static async createDepartmentalPosition(req, res) {
    try {
      const { deptElectionId, positionName, positionOrder, maxVotes, maxCandidates, description } = req.body

      // Validation
      if (!deptElectionId || !positionName) {
        return res.status(400).json({
          success: false,
          message: "Departmental Election ID and position name are required"
        })
      }

      // Check if departmental election exists
      const deptElection = await DepartmentalElection.findById(deptElectionId)
        .populate('departmentId', 'departmentCode degreeProgram')
      if (!deptElection) {
        return res.status(404).json({
          success: false,
          message: "Departmental election not found"
        })
      }

      // Check for duplicate position name ONLY in the same departmental election
      const existingPosition = await Position.findOne({
        deptElectionId,
        ssgElectionId: null,
        positionName: { $regex: new RegExp(`^${positionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      })

      if (existingPosition) {
        return res.status(400).json({
          success: false,
          message: "Position name already exists in this departmental election"
        })
      }

      // Get next position order if not provided
      let finalPositionOrder = positionOrder
      if (!finalPositionOrder) {
        const lastPosition = await Position.findOne({ 
          deptElectionId,
          ssgElectionId: null
        })
          .sort({ positionOrder: -1 })
        finalPositionOrder = lastPosition ? lastPosition.positionOrder + 1 : 1
      }

      const newPosition = new Position({
        deptElectionId,
        ssgElectionId: null,
        positionName: positionName.trim(),
        positionOrder: finalPositionOrder,
        maxVotes: maxVotes || 1,
        maxCandidates: maxCandidates || 10,
        description: description?.trim() || null
      })

      await newPosition.save()
      await newPosition.populate({
        path: 'deptElectionId',
        select: 'title electionYear status departmentId',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })

      await AuditLog.logUserAction(
        "CREATE_POSITION",
        req.user,
        `Created departmental position: ${newPosition.positionName} for election ${deptElection.title}`,
        req
      )

      res.status(201).json({
        success: true,
        message: "Departmental position created successfully",
        data: newPosition
      })
    } catch (error) {
      console.error("Error creating departmental position:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create departmental position",
        error: error.message
      })
    }
  }

  static async updateDepartmentalPosition(req, res) {
    try {
      const { id } = req.params
      const { positionName, positionOrder, maxVotes, maxCandidates, description, isActive } = req.body

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid position ID format"
        })
      }

      const position = await Position.findOne({
        _id: id,
        deptElectionId: { $ne: null },
        ssgElectionId: null
      })

      if (!position) {
        return res.status(404).json({
          success: false,
          message: "Departmental position not found"
        })
      }

      // Check for duplicate position name ONLY within the same departmental election if name is being changed
      if (positionName && positionName !== position.positionName) {
        const existingPosition = await Position.findOne({
          deptElectionId: position.deptElectionId,
          ssgElectionId: null,
          positionName: { $regex: new RegExp(`^${positionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          _id: { $ne: id }
        })

        if (existingPosition) {
          return res.status(400).json({
            success: false,
            message: "Position name already exists in this departmental election"
          })
        }
      }

      // Update fields
      if (positionName) position.positionName = positionName.trim()
      if (positionOrder !== undefined) position.positionOrder = positionOrder
      if (maxVotes !== undefined) position.maxVotes = maxVotes
      if (maxCandidates !== undefined) position.maxCandidates = maxCandidates
      if (description !== undefined) position.description = description?.trim() || null
      if (isActive !== undefined) position.isActive = isActive

      await position.save()
      await position.populate({
        path: 'deptElectionId',
        select: 'title electionYear status departmentId',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })

      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Updated departmental position: ${position.positionName}`,
        req
      )

      res.status(200).json({
        success: true,
        message: "Departmental position updated successfully",
        data: position
      })
    } catch (error) {
      console.error("Error updating departmental position:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update departmental position",
        error: error.message
      })
    }
  }

  static async deleteDepartmentalPosition(req, res) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid position ID format"
        })
      }

      const position = await Position.findOne({
        _id: id,
        deptElectionId: { $ne: null },
        ssgElectionId: null
      })

      if (!position) {
        return res.status(404).json({
          success: false,
          message: "Departmental position not found"
        })
      }

      // Check if position has candidates
      const candidateCount = await Candidate.countDocuments({ positionId: id })
      if (candidateCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete position. It has ${candidateCount} candidate(s) assigned.`
        })
      }

      const positionName = position.positionName
      await Position.findByIdAndDelete(id)

      await AuditLog.logUserAction(
        "DELETE_POSITION",
        req.user,
        `Deleted departmental position: ${positionName}`,
        req
      )

      res.status(200).json({
        success: true,
        message: "Departmental position deleted successfully"
      })
    } catch (error) {
      console.error("Error deleting departmental position:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete departmental position",
        error: error.message
      })
    }
  }

  static async getPositionsByDepartmentalElection(req, res) {
    try {
      const { deptElectionId } = req.params

      if (!mongoose.Types.ObjectId.isValid(deptElectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid departmental election ID format"
        })
      }

      const deptElection = await DepartmentalElection.findById(deptElectionId)
        .populate('departmentId', 'departmentCode degreeProgram')
      if (!deptElection) {
        return res.status(404).json({
          success: false,
          message: "Departmental election not found"
        })
      }

      // Get positions ONLY for the specific departmental election
      const deptPositions = await Position.find({ 
        deptElectionId,
        ssgElectionId: null 
      })
      .populate({
        path: 'deptElectionId',
        select: 'title electionYear status departmentId',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })
      .sort({ positionOrder: 1 })

      // For each position, count candidates
      const positionsWithCandidateCounts = await Promise.all(
        deptPositions.map(async (position) => {
          // Count total candidates for this position
          const totalCandidates = await Candidate.countDocuments({ 
            positionId: position._id,
            deptElectionId: position.deptElectionId._id,
            isActive: true
          })

          return {
            _id: position._id,
            positionName: position.positionName,
            description: position.description,
            positionOrder: position.positionOrder,
            maxVotes: position.maxVotes,
            maxCandidates: position.maxCandidates,
            deptElectionId: position.deptElectionId,
            candidateCount: totalCandidates,
            isActive: position.isActive,
            createdAt: position.createdAt,
            updatedAt: position.updatedAt
          }
        })
      )

      // Calculate summary statistics
      const totalCandidates = positionsWithCandidateCounts
        .reduce((sum, position) => sum + position.candidateCount, 0)
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved positions for departmental election: ${deptElection.title}`,
        req
      )

      res.status(200).json({
        success: true,
        message: "Departmental election positions retrieved successfully",
        data: {
          deptElection: {
            _id: deptElection._id,
            title: deptElection.title,
            electionYear: deptElection.electionYear,
            status: deptElection.status,
            departmentId: deptElection.departmentId
          },
          positions: positionsWithCandidateCounts,
          summary: {
            totalPositions: positionsWithCandidateCounts.length,
            totalCandidates: totalCandidates
          }
        }
      })
    } catch (error) {
      console.error("Error getting departmental election positions:", error)
      res.status(500).json({
        success: false,
        message: "Failed to retrieve departmental election positions",
        error: error.message
      })
    }
  }

  static async getDepartmentalPositionStats(req, res) {
    try {
      const { positionId } = req.params

      if (!mongoose.Types.ObjectId.isValid(positionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid position ID format"
        })
      }

      const position = await Position.findOne({
        _id: positionId,
        deptElectionId: { $ne: null },
        ssgElectionId: null
      }).populate({
        path: 'deptElectionId',
        select: 'title electionYear status departmentId',
        populate: {
          path: 'departmentId',
          select: 'departmentCode degreeProgram college'
        }
      })

      if (!position) {
        return res.status(404).json({
          success: false,
          message: "Departmental position not found"
        })
      }

      // Get candidate statistics
      const candidateStats = await Candidate.aggregate([
        { $match: { positionId: new mongoose.Types.ObjectId(positionId) } },
        {
          $group: {
            _id: null,
            totalCandidates: { $sum: 1 },
            activeCandidates: { $sum: { $cond: ["$isActive", 1, 0] } },
            inactiveCandidates: { $sum: { $cond: ["$isActive", 0, 1] } }
          }
        }
      ])

      const stats = candidateStats[0] || {
        totalCandidates: 0,
        activeCandidates: 0,
        inactiveCandidates: 0
      }

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved stats for departmental position: ${position.positionName}`,
        req
      )

      res.status(200).json({
        success: true,
        message: "Departmental position statistics retrieved successfully",
        data: {
          position,
          statistics: stats
        }
      })
    } catch (error) {
      console.error("Error getting departmental position stats:", error)
      res.status(500).json({
        success: false,
        message: "Failed to retrieve departmental position statistics",
        error: error.message
      })
    }
  }

  static async canDeleteDepartmentalPosition(req, res) {
    try {
      const { positionId } = req.params

      if (!mongoose.Types.ObjectId.isValid(positionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid position ID format"
        })
      }

      const position = await Position.findOne({
        _id: positionId,
        deptElectionId: { $ne: null },
        ssgElectionId: null
      })

      if (!position) {
        return res.status(404).json({
          success: false,
          message: "Departmental position not found"
        })
      }

      const candidateCount = await Candidate.countDocuments({ positionId })
      const canDelete = candidateCount === 0

      res.status(200).json({
        success: true,
        message: "Delete eligibility checked successfully",
        data: {
          canDelete,
          candidateCount,
          reason: canDelete ? "Position can be deleted" : `Position has ${candidateCount} candidate(s) assigned`
        }
      })
    } catch (error) {
      console.error("Error checking departmental position delete eligibility:", error)
      res.status(500).json({
        success: false,
        message: "Failed to check delete eligibility",
        error: error.message
      })
    }
  }

  // Utility methods for reordering positions
  static async reorderSSGPositions(req, res) {
    try {
      const { ssgElectionId } = req.params
      const { positions } = req.body // Array of { id, positionOrder }

      if (!mongoose.Types.ObjectId.isValid(ssgElectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid SSG election ID format"
        })
      }

      if (!Array.isArray(positions)) {
        return res.status(400).json({
          success: false,
          message: "Positions array is required"
        })
      }

      // Update position orders
      const updatePromises = positions.map(({ id, positionOrder }) => 
        Position.findOneAndUpdate(
          { _id: id, ssgElectionId, deptElectionId: null },
          { positionOrder },
          { new: true }
        )
      )

      await Promise.all(updatePromises)

      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Reordered SSG positions for election ID: ${ssgElectionId}`,
        req
      )

      res.status(200).json({
        success: true,
        message: "SSG positions reordered successfully"
      })
    } catch (error) {
      console.error("Error reordering SSG positions:", error)
      res.status(500).json({
        success: false,
        message: "Failed to reorder SSG positions",
        error: error.message
      })
    }
  }

  static async reorderDepartmentalPositions(req, res) {
    try {
      const { deptElectionId } = req.params
      const { positions } = req.body // Array of { id, positionOrder }

      if (!mongoose.Types.ObjectId.isValid(deptElectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid departmental election ID format"
        })
      }

      if (!Array.isArray(positions)) {
        return res.status(400).json({
          success: false,
          message: "Positions array is required"
        })
      }

      // Update position orders
      const updatePromises = positions.map(({ id, positionOrder }) => 
        Position.findOneAndUpdate(
          { _id: id, deptElectionId, ssgElectionId: null },
          { positionOrder },
          { new: true }
        )
      )

      await Promise.all(updatePromises)

      await AuditLog.logUserAction(
        "UPDATE_POSITION",
        req.user,
        `Reordered departmental positions for election ID: ${deptElectionId}`,
        req
      )

      res.status(200).json({
        success: true,
        message: "Departmental positions reordered successfully"
      })
    } catch (error) {
      console.error("Error reordering departmental positions:", error)
      res.status(500).json({
        success: false,
        message: "Failed to reorder departmental positions",
        error: error.message
      })
    }
  }
}

module.exports = PositionController