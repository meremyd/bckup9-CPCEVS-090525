const Position = require("../models/Position")
const Candidate = require("../models/Candidate")
const SSGElection = require("../models/SSGElection")
const DepartmentalElection = require("../models/DepartmentalElection")
const AuditLog = require("../models/AuditLog")
const mongoose = require("mongoose")

class PositionController {

//   static async checkDuplicatePositionName(positionName, ssgElectionId = null, deptElectionId = null, excludePositionId = null) {
//   try {
//     console.log('=== DUPLICATE CHECK DEBUG ===')
//     console.log('Position Name:', positionName)
//     console.log('SSG Election ID:', ssgElectionId, 'Type:', typeof ssgElectionId)
//     console.log('Dept Election ID:', deptElectionId, 'Type:', typeof deptElectionId)
//     console.log('Exclude Position ID:', excludePositionId, 'Type:', typeof excludePositionId)
    
//     const query = {
//       positionName: { 
//         $regex: new RegExp(`^${positionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') 
//       }
//     }

//     console.log('Base query:', JSON.stringify(query, null, 2))

//     // Handle SSG election filtering - ONLY check within the SAME SSG election
//     if (ssgElectionId) {
//       console.log('Filtering for specific SSG election only')
      
//       // Ensure we have a proper ObjectId
//       let ssgObjectId
//       if (mongoose.Types.ObjectId.isValid(ssgElectionId)) {
//         if (typeof ssgElectionId === 'string') {
//           ssgObjectId = new mongoose.Types.ObjectId(ssgElectionId)
//         } else {
//           ssgObjectId = ssgElectionId
//         }
//       } else {
//         console.error('Invalid SSG Election ID:', ssgElectionId)
//         return null
//       }
      
//       // ✅ KEY CHANGE: Only check within the SAME SSG election (like partylist logic)
//       query.ssgElectionId = ssgObjectId
//       query.deptElectionId = null
//     } 
//     // Handle departmental election filtering - ONLY check within the SAME dept election
//     else if (deptElectionId) {
//       console.log('Filtering for specific departmental election only')
      
//       // Ensure we have a proper ObjectId
//       let deptObjectId
//       if (mongoose.Types.ObjectId.isValid(deptElectionId)) {
//         if (typeof deptElectionId === 'string') {
//           deptObjectId = new mongoose.Types.ObjectId(deptElectionId)
//         } else {
//           deptObjectId = deptElectionId
//         }
//       } else {
//         console.error('Invalid Dept Election ID:', deptElectionId)
//         return null
//       }
      
//       // ✅ KEY CHANGE: Only check within the SAME dept election
//       query.deptElectionId = deptObjectId
//       query.ssgElectionId = null
//     } else {
//       console.log('⚠️ WARNING: No election ID provided - will search ALL elections!')
//       // If no election ID is provided, we might want to return null or handle differently
//       // For now, keeping the original behavior but this should probably be an error
//     }

//     // Handle exclusion of current position (for updates)
//     if (excludePositionId) {
//       console.log('Excluding position ID:', excludePositionId)
      
//       let excludeObjectId
//       if (mongoose.Types.ObjectId.isValid(excludePositionId)) {
//         if (typeof excludePositionId === 'string') {
//           excludeObjectId = new mongoose.Types.ObjectId(excludePositionId)
//         } else {
//           excludeObjectId = excludePositionId
//         }
//       } else {
//         console.error('Invalid exclude Position ID:', excludePositionId)
//         return null
//       }
      
//       query._id = { $ne: excludeObjectId }
//     }

//     console.log('Final query:', JSON.stringify(query, null, 2))

//     const existingPosition = await Position.findOne(query)
    
//     console.log('Query result:', existingPosition ? {
//       id: existingPosition._id,
//       name: existingPosition.positionName,
//       ssgElectionId: existingPosition.ssgElectionId,
//       deptElectionId: existingPosition.deptElectionId
//     } : null)
    
//     console.log('=== END DUPLICATE CHECK DEBUG ===')
    
//     return existingPosition
//   } catch (error) {
//     console.error('Error in checkDuplicatePositionName:', error)
//     return null
//   }
// }
  // SSG Position Controllers
  static async getAllSSGPositions(req, res) {
    try {
      const { search, status, ssgElectionId } = req.query
      
      // Build query
      const query = { 
        ssgElectionId: { $ne: null },
        deptElectionId: null 
      }

      // Add search functionality
      if (search) {
        query.$or = [
          { positionName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }

      // Filter by status
      if (status !== undefined) {
        query.isActive = status === 'active'
      }

      // Filter by specific SSG election
      if (ssgElectionId) {
        query.ssgElectionId = ssgElectionId
      }

      const positions = await Position.find(query)
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

  static async debugSSGPositions(req, res) {
  try {
    const { ssgElectionId } = req.params;
    
    console.log('=== DEBUG DATABASE STATE ===');
    console.log('Requested SSG Election ID:', ssgElectionId);
    
    // Get all positions for this election
    const positions = await Position.find({
      ssgElectionId: ssgElectionId
    }).select('positionName ssgElectionId deptElectionId createdAt');
    
    console.log('Positions in database for this election:', positions.map(p => ({
      id: p._id.toString(),
      name: p.positionName,
      ssgElectionId: p.ssgElectionId?.toString(),
      deptElectionId: p.deptElectionId?.toString(),
      created: p.createdAt
    })));
    
    // Get all positions with similar names across ALL elections
    const { positionName } = req.query;
    if (positionName) {
      const allSimilar = await Position.find({
        positionName: { $regex: new RegExp(`^${positionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }).select('positionName ssgElectionId deptElectionId');
      
      console.log(`All positions with name "${positionName}" across all elections:`, allSimilar.map(p => ({
        id: p._id.toString(),
        name: p.positionName,
        ssgElectionId: p.ssgElectionId?.toString(),
        deptElectionId: p.deptElectionId?.toString()
      })));
    }
    
    res.json({
      success: true,
      data: {
        positionsInElection: positions,
        allSimilarPositions: positionName ? allSimilar : []
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
}
static async debugPositionState(req, res) {
  try {
    const { ssgElectionId, positionName } = req.query;
    
    console.log('=== POSITION DEBUG REQUEST ===');
    console.log('SSG Election ID:', ssgElectionId);
    console.log('Position Name:', positionName);
    
    // Check all positions in this specific election
    const positionsInElection = await Position.find({
      ssgElectionId: ssgElectionId
    }).select('positionName ssgElectionId deptElectionId createdAt');
    
    console.log('Positions in this election:', positionsInElection.length);
    
    // Check for exact matches
    const exactMatch = await Position.findOne({
      ssgElectionId: ssgElectionId,
      positionName: { $regex: new RegExp(`^${positionName}$`, 'i') }
    });
    
    console.log('Exact match found:', !!exactMatch);
    
    // Check all positions with this name across all elections
    const allWithName = await Position.find({
      positionName: { $regex: new RegExp(`^${positionName}$`, 'i') }
    }).select('positionName ssgElectionId deptElectionId createdAt');
    
    res.json({
      success: true,
      data: {
        ssgElectionId,
        positionName,
        positionsInElection: positionsInElection.map(p => ({
          id: p._id.toString(),
          name: p.positionName,
          ssgElectionId: p.ssgElectionId?.toString(),
          deptElectionId: p.deptElectionId?.toString(),
          created: p.createdAt
        })),
        exactMatch: exactMatch ? {
          id: exactMatch._id.toString(),
          name: exactMatch.positionName,
          ssgElectionId: exactMatch.ssgElectionId?.toString(),
          deptElectionId: exactMatch.deptElectionId?.toString(),
          created: exactMatch.createdAt
        } : null,
        allWithSameName: allWithName.map(p => ({
          id: p._id.toString(),
          name: p.positionName,
          ssgElectionId: p.ssgElectionId?.toString(),
          deptElectionId: p.deptElectionId?.toString(),
          created: p.createdAt
        }))
      }
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
}

  static async createSSGPosition(req, res) {
  let trimmedPositionName = ''; // Declare outside try block for error handling
  
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

    console.log('=== CREATE SSG POSITION START ===')
    console.log('Raw request body:', JSON.stringify(req.body, null, 2))
    console.log('SSG Election ID (raw):', ssgElectionId)
    console.log('Position Name:', positionName)

    // Basic validation
    if (!ssgElectionId || !positionName) {
      return res.status(400).json({
        success: false,
        message: "SSG Election ID and position name are required"
      })
    }

    if (!mongoose.Types.ObjectId.isValid(ssgElectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid SSG Election ID format"
      })
    }

    // Convert ssgElectionId to ObjectId if it's a string
    let electionObjectId
    try {
      electionObjectId = new mongoose.Types.ObjectId(ssgElectionId)
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid SSG Election ID format"
      })
    }

    trimmedPositionName = positionName.trim()
    if (!trimmedPositionName) {
      return res.status(400).json({
        success: false,
        message: "Position name cannot be empty"
      })
    }

    // Parse and validate numbers
    let parsedPositionOrder = 1
    let parsedMaxVotes = 1
    let parsedMaxCandidates = 10
    let parsedMaxCandidatesPerPartylist = 1

    if (positionOrder !== undefined && positionOrder !== null) {
      parsedPositionOrder = parseInt(positionOrder, 10)
      if (isNaN(parsedPositionOrder) || parsedPositionOrder < 1) {
        return res.status(400).json({
          success: false,
          message: "Position order must be a positive integer"
        })
      }
    }

    if (maxVotes !== undefined && maxVotes !== null) {
      parsedMaxVotes = parseInt(maxVotes, 10)
      if (isNaN(parsedMaxVotes) || parsedMaxVotes < 1) {
        return res.status(400).json({
          success: false,
          message: "Max votes must be a positive integer"
        })
      }
    }

    if (maxCandidates !== undefined && maxCandidates !== null) {
      parsedMaxCandidates = parseInt(maxCandidates, 10)
      if (isNaN(parsedMaxCandidates) || parsedMaxCandidates < 1) {
        return res.status(400).json({
          success: false,
          message: "Max candidates must be a positive integer"
        })
      }
    }

    if (maxCandidatesPerPartylist !== undefined && maxCandidatesPerPartylist !== null) {
      parsedMaxCandidatesPerPartylist = parseInt(maxCandidatesPerPartylist, 10)
      if (isNaN(parsedMaxCandidatesPerPartylist) || parsedMaxCandidatesPerPartylist < 1) {
        return res.status(400).json({
          success: false,
          message: "Max candidates per partylist must be a positive integer"
        })
      }
    }

    console.log('Parsed numbers:', {
      positionOrder: parsedPositionOrder,
      maxVotes: parsedMaxVotes,
      maxCandidates: parsedMaxCandidates,
      maxCandidatesPerPartylist: parsedMaxCandidatesPerPartylist
    })

    // Check if SSG election exists
    const ssgElection = await SSGElection.findById(electionObjectId)
    if (!ssgElection) {
      return res.status(404).json({
        success: false,
        message: "SSG election not found"
      })
    }

    console.log('SSG Election found:', ssgElection.title)

    // Add this right before the duplicate check in createSSGPosition
console.log('=== COMPREHENSIVE DATABASE CHECK ===')

// Check ALL positions in database for this election (ignore filters)
const allPositionsAnyStatus = await Position.find({
  ssgElectionId: electionObjectId
}).select('positionName ssgElectionId deptElectionId isActive createdAt')

console.log(`Found ${allPositionsAnyStatus.length} total positions for this election (any status):`)
allPositionsAnyStatus.forEach((pos, index) => {
  console.log(`  ${index + 1}. "${pos.positionName}" - Active: ${pos.isActive} - Dept: ${pos.deptElectionId} - Created: ${pos.createdAt}`)
})

// Check specifically for President positions anywhere
const allPresidentPositions = await Position.find({
  positionName: { $regex: new RegExp('^President$', 'i') }
}).select('positionName ssgElectionId deptElectionId isActive createdAt')

console.log(`Found ${allPresidentPositions.length} "President" positions anywhere in database:`)
allPresidentPositions.forEach((pos, index) => {
  console.log(`  ${index + 1}. Election: ${pos.ssgElectionId} - Dept: ${pos.deptElectionId} - Active: ${pos.isActive}`)
})

    // ✅ DIRECT DUPLICATE CHECK - Same logic as partylist controller
    console.log('=== CHECKING FOR DUPLICATE POSITION NAME ===')
    console.log('Checking position name:', trimmedPositionName)
    console.log('In SSG election:', electionObjectId.toString())

    // Check position name ONLY within the specific SSG election (same logic as partylist)
    const existingPositionName = await Position.findOne({
      ssgElectionId: electionObjectId,
      deptElectionId: null,
      positionName: { $regex: new RegExp(`^${trimmedPositionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    })

    if (existingPositionName) {
      console.log('DUPLICATE POSITION NAME FOUND in same SSG election:', {
        id: existingPositionName._id.toString(),
        name: existingPositionName.positionName,
        ssgElectionId: existingPositionName.ssgElectionId.toString()
      })

      return res.status(400).json({
        success: false,
        message: `Position name "${trimmedPositionName}" already exists in this SSG election`
      })
    }

    console.log('No duplicate position name found within this SSG election')

    // Auto-assign position order if not provided or is default value
    let finalPositionOrder = parsedPositionOrder
    if (positionOrder === undefined || positionOrder === null || parsedPositionOrder === 1) {
      const lastPosition = await Position.findOne({ 
        ssgElectionId: electionObjectId,
        deptElectionId: null
      }).sort({ positionOrder: -1 }).select('positionOrder')

      if (lastPosition) {
        finalPositionOrder = lastPosition.positionOrder + 1
      } else {
        finalPositionOrder = 1
      }
      console.log('Auto-assigned position order:', finalPositionOrder)
    }

    const positionData = {
      ssgElectionId: electionObjectId,
      deptElectionId: null,
      positionName: trimmedPositionName,
      positionOrder: finalPositionOrder,
      maxVotes: parsedMaxVotes,
      maxCandidates: parsedMaxCandidates,
      maxCandidatesPerPartylist: parsedMaxCandidatesPerPartylist,
      description: description?.trim() || null
    }

    console.log('Creating position with data:', positionData)

    const newPosition = new Position(positionData)
    await newPosition.save()

    await newPosition.populate('ssgElectionId', 'title electionYear status')

    await AuditLog.logUserAction(
      "CREATE_POSITION",
      req.user,
      `Created SSG position: ${newPosition.positionName} (max ${newPosition.maxCandidatesPerPartylist} per partylist) for election ${ssgElection.title}`,
      req
    )

    console.log('=== POSITION CREATED SUCCESSFULLY ===')

    return res.status(201).json({
      success: true,
      message: "SSG position created successfully",
      data: newPosition
    })

  } catch (saveError) {
    console.error('SAVE ERROR:', saveError)

    // Handle duplicate key errors from database constraints
    if (saveError.code === 11000) {
      const keyPattern = saveError.keyPattern || {}
      const keyValue = saveError.keyValue || {}
      
      // Check the specific index that was violated
      if (keyPattern.ssgElectionId === 1 && keyPattern.positionName === 1) {
        return res.status(400).json({
          success: false,
          message: `Position name "${keyValue.positionName}" already exists in this SSG election`
        })
      } else if (keyValue.positionName) {
        return res.status(400).json({
          success: false,
          message: `Position name "${keyValue.positionName}" already exists in this SSG election`
        })
      } else {
        return res.status(400).json({
          success: false,
          message: "Duplicate entry detected. Please check your input values."
        })
      }
    }

    console.error("Error creating SSG position:", saveError)
    return res.status(500).json({
      success: false,
      message: "Failed to create SSG position",
      error: saveError.message
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
      maxCandidatesPerPartylist,
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

    // Check for duplicate position name if name is being changed
    if (positionName && positionName.trim() !== position.positionName) {
      const trimmedPositionName = positionName.trim()
      if (!trimmedPositionName) {
        return res.status(400).json({
          success: false,
          message: "Position name cannot be empty"
        })
      }

      // ✅ DIRECT DUPLICATE CHECK - Same logic as partylist controller
      console.log('=== CHECKING FOR DUPLICATE ON UPDATE ===')
      console.log('New position name:', trimmedPositionName)
      console.log('Current position ID:', id)
      console.log('SSG Election ID:', position.ssgElectionId.toString())

      // Check for duplicate name ONLY in same SSG election (excluding current position)
      const existingPositionName = await Position.findOne({
        ssgElectionId: position.ssgElectionId,
        deptElectionId: null,
        positionName: { $regex: new RegExp(`^${trimmedPositionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        _id: { $ne: id }
      })

      if (existingPositionName) {
        console.log('DUPLICATE POSITION NAME FOUND during update:', {
          id: existingPositionName._id.toString(),
          name: existingPositionName.positionName
        })

        return res.status(400).json({
          success: false,
          message: "Position name already exists in this SSG election"
        })
      }

      console.log('No duplicate position name found for update')
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
    // Handle duplicate key errors
    if (error.code === 11000) {
      const keyPattern = error.keyPattern || {}
      const keyValue = error.keyValue || {}
      
      if ((keyPattern.ssgElectionId && keyPattern.positionName) || keyValue.positionName) {
        error.message = `Position name "${keyValue.positionName || 'unknown'}" already exists in this SSG election`
        error.statusCode = 400
      } else {
        error.message = "Duplicate entry detected during update"
        error.statusCode = 400
      }
      
      return res.status(400).json({
        success: false,
        message: error.message
      })
    }

    console.error("Error updating SSG position:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update SSG position",
      error: error.message
    })
  }
}

static async debugDatabaseState(req, res) {
  try {
    const { ssgElectionId } = req.params;
    
    console.log('=== DATABASE STATE DEBUG ===');
    console.log('SSG Election ID:', ssgElectionId);
    
    // Get all positions for this SSG election
    const positionsInThisElection = await Position.find({
      ssgElectionId: ssgElectionId,
      deptElectionId: null
    }).select('positionName ssgElectionId createdAt updatedAt');
    
    console.log(`Found ${positionsInThisElection.length} positions in this SSG election`);
    
    // Get all positions with name "President" across all elections
    const allPresidentPositions = await Position.find({
      positionName: { $regex: new RegExp('^President$', 'i') }
    }).select('positionName ssgElectionId deptElectionId createdAt');
    
    console.log(`Found ${allPresidentPositions.length} positions named "President" across all elections`);
    
    // Get all SSG elections
    const allSSGElections = await SSGElection.find({})
      .select('_id title electionYear')
      .sort({ electionYear: -1 });
    
    console.log(`Found ${allSSGElections.length} SSG elections total`);
    
    res.json({
      success: true,
      debug: {
        requestedElection: ssgElectionId,
        positionsInThisElection: positionsInThisElection.map(p => ({
          id: p._id.toString(),
          name: p.positionName,
          ssgElectionId: p.ssgElectionId.toString(),
          created: p.createdAt,
          updated: p.updatedAt
        })),
        allPresidentPositions: allPresidentPositions.map(p => ({
          id: p._id.toString(),
          name: p.positionName,
          ssgElectionId: p.ssgElectionId?.toString(),
          deptElectionId: p.deptElectionId?.toString(),
          created: p.createdAt
        })),
        allSSGElections: allSSGElections.map(e => ({
          id: e._id.toString(),
          title: e.title,
          year: e.electionYear
        }))
      }
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
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
      const { search, status, deptElectionId } = req.query
      
      // Build query
      const query = { 
        deptElectionId: { $ne: null },
        ssgElectionId: null 
      }

      // Add search functionality
      if (search) {
        query.$or = [
          { positionName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }

      // Filter by status
      if (status !== undefined) {
        query.isActive = status === 'active'
      }

      // Filter by specific departmental election
      if (deptElectionId) {
        query.deptElectionId = deptElectionId
      }

      const positions = await Position.find(query)
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

      // Trim and validate position name
      const trimmedPositionName = positionName.trim()
      if (!trimmedPositionName) {
        return res.status(400).json({
          success: false,
          message: "Position name cannot be empty"
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

      // Check for duplicate position name using helper method
      const existingPosition = await PositionController.checkDuplicatePositionName(
  trimmedPositionName, 
  null,           
  deptElectionId 
)

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
        positionName: trimmedPositionName,
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

      // Check for duplicate position name if name is being changed
      if (positionName && positionName.trim() !== position.positionName) {
        const trimmedPositionName = positionName.trim()
        if (!trimmedPositionName) {
          return res.status(400).json({
            success: false,
            message: "Position name cannot be empty"
          })
        }

        const existingPosition = await PositionController.checkDuplicatePositionName(
  trimmedPositionName, 
  null,                   
  position.deptElectionId, 
  position._id             
)


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