const mongoose = require("mongoose")
const Candidate = require("../models/Candidate")
const Election = require("../models/Election")
const Voter = require("../models/Voter")
const Position = require("../models/Position")
const Partylist = require("../models/Partylist")
const AuditLog = require("../models/AuditLog")

class CandidateController {
  // Get all candidates
  static async getAllCandidates(req, res, next) {
    try {
      const { electionId, positionId, partylistId, isActive } = req.query
      
      const filter = {}
      if (electionId) filter.electionId = electionId
      if (positionId) filter.positionId = positionId
      if (partylistId) filter.partylistId = partylistId
      if (isActive !== undefined) filter.isActive = isActive === 'true'
      
      const candidates = await Candidate.find(filter)
        .populate('electionId', 'title electionType status')
        .populate('voterId', 'firstName middleName lastName schoolId degreeId')
        .populate('positionId', 'positionName positionOrder')
        .populate('partylistId', 'partylistName')
        .sort({ candidateNumber: 1 })
      
      // Log system access
      await AuditLog.logUserAction(
        'SYSTEM_ACCESS',
        req.user,
        `Admin accessed candidates list - Filter: ${JSON.stringify(filter)}, Count: ${candidates.length}`,
        req
      )
      
      res.json({
        success: true,
        data: candidates,
        message: "Candidates retrieved successfully"
      })
    } catch (error) {
      console.error("Error fetching candidates:", error)
      
      await AuditLog.logUserAction(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        req.user || {},
        `Failed to fetch candidates: ${error.message}`,
        req
      )
      
      const err = new Error("Failed to fetch candidates")
      err.statusCode = 500
      next(err)
    }
  }

  // Get candidate by ID
  static async getCandidateById(req, res, next) {
    try {
      const { id } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Invalid candidate ID format: ${id}`,
          req
        )
        
        const error = new Error("Invalid candidate ID")
        error.statusCode = 400
        return next(error)
      }
      
      const candidate = await Candidate.findById(id)
        .populate('electionId', 'title electionType status')
        .populate('voterId', 'firstName middleName lastName schoolId degreeId email')
        .populate('positionId', 'positionName positionOrder maxVotes')
        .populate('partylistId', 'partylistName description')
      
      if (!candidate) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to access non-existent candidate: ${id}`,
          req
        )
        
        const error = new Error("Candidate not found")
        error.statusCode = 404
        return next(error)
      }
      
      // Log successful access
      await AuditLog.logUserAction(
        'SYSTEM_ACCESS',
        req.user,
        `Admin viewed candidate ${id} - ${candidate.voterId.firstName} ${candidate.voterId.lastName} (${candidate.voterId.schoolId})`,
        req
      )
      
      res.json({
        success: true,
        data: candidate,
        message: "Candidate retrieved successfully"
      })
    } catch (error) {
      console.error("Error fetching candidate:", error)
      
      await AuditLog.logUserAction(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        req.user || {},
        `Failed to fetch candidate ${req.params.id}: ${error.message}`,
        req
      )
      
      const err = new Error("Failed to fetch candidate")
      err.statusCode = 500
      next(err)
    }
  }

  // Create new candidate
  static async createCandidate(req, res, next) {
    try {
      const {
        electionId,
        voterId,
        positionId,
        partylistId,
        candidateNumber,
        platform
      } = req.body
      
      // Validate required fields
      if (!electionId || !voterId || !positionId || !candidateNumber) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Invalid candidate creation attempt - missing required fields`,
          req
        )
        
        const error = new Error("Election ID, Voter ID, Position ID, and Candidate Number are required")
        error.statusCode = 400
        return next(error)
      }
      
      // Validate ObjectIds
      if (!mongoose.Types.ObjectId.isValid(electionId) ||
          !mongoose.Types.ObjectId.isValid(voterId) ||
          !mongoose.Types.ObjectId.isValid(positionId) ||
          (partylistId && !mongoose.Types.ObjectId.isValid(partylistId))) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Invalid candidate creation attempt - invalid ID formats`,
          req
        )
        
        const error = new Error("Invalid ID format")
        error.statusCode = 400
        return next(error)
      }
      
      // Check if election exists and is not completed
      const election = await Election.findById(electionId)
      if (!election) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to create candidate for non-existent election: ${electionId}`,
          req
        )
        
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }
      
      if (election.status === 'completed' || election.status === 'cancelled') {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to add candidate to ${election.status} election: ${election.title}`,
          req
        )
        
        const error = new Error("Cannot add candidates to completed or cancelled elections")
        error.statusCode = 400
        return next(error)
      }
      
      // Check if voter exists and is active
      const voter = await Voter.findById(voterId)
      if (!voter || !voter.isActive) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to create candidate with invalid voter: ${voterId}`,
          req
        )
        
        const error = new Error("Voter not found or inactive")
        error.statusCode = 404
        return next(error)
      }
      
      // Check if position exists
      const position = await Position.findById(positionId)
      if (!position || !position.isActive) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to create candidate with invalid position: ${positionId}`,
          req
        )
        
        const error = new Error("Position not found or inactive")
        error.statusCode = 404
        return next(error)
      }
      
      // Check if partylist exists (if provided)
      if (partylistId) {
        const partylist = await Partylist.findById(partylistId)
        if (!partylist) {
          await AuditLog.logUserAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            req.user || {},
            `Attempted to create candidate with invalid partylist: ${partylistId}`,
            req
          )
          
          const error = new Error("Partylist not found")
          error.statusCode = 404
          return next(error)
        }
      }
      
      // Check if voter is already a candidate in this election
      const existingCandidate = await Candidate.findOne({ electionId, voterId })
      if (existingCandidate) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to create duplicate candidate for voter ${voter.schoolId} in election ${election.title}`,
          req
        )
        
        const error = new Error("Voter is already a candidate in this election")
        error.statusCode = 400
        return next(error)
      }
      
      // Check if candidate number is already taken for this position
      const existingNumber = await Candidate.findOne({
        electionId,
        positionId,
        candidateNumber
      })
      if (existingNumber) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to use duplicate candidate number ${candidateNumber} for position ${position.positionName}`,
          req
        )
        
        const error = new Error("Candidate number already taken for this position")
        error.statusCode = 400
        return next(error)
      }
      
      // Generate unique candidate ID
      const candidateId = `CAND-${election.electionYear}-${String(candidateNumber).padStart(3, '0')}-${Date.now()}`
      
      // Create candidate
      const candidate = new Candidate({
        candidateId,
        electionId,
        voterId,
        positionId,
        partylistId: partylistId || null,
        candidateNumber,
        platform: platform || null
      })
      
      await candidate.save()
      
      // Populate the created candidate for response
      const populatedCandidate = await Candidate.findById(candidate._id)
        .populate('electionId', 'title electionType')
        .populate('voterId', 'firstName middleName lastName schoolId')
        .populate('positionId', 'positionName')
        .populate('partylistId', 'partylistName')
      
      // Log the action
      await AuditLog.logUserAction(
        'CREATE_CANDIDATE',
        req.user,
        `Created candidate: ${voter.firstName} ${voter.lastName} (${voter.schoolId}) for position ${position.positionName} in election ${election.title}`,
        req
      )
      
      res.status(201).json({
        success: true,
        data: populatedCandidate,
        message: "Candidate created successfully"
      })
    } catch (error) {
      console.error("Error creating candidate:", error)
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0]
        
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Duplicate candidate creation attempt - ${field}: ${error.keyValue[field]}`,
          req
        )
        
        const err = new Error(`Duplicate ${field}: ${error.keyValue[field]}`)
        err.statusCode = 400
        return next(err)
      }
      
      await AuditLog.logUserAction(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        req.user || {},
        `Failed to create candidate: ${error.message}`,
        req
      )
      
      const err = new Error("Failed to create candidate")
      err.statusCode = 500
      next(err)
    }
  }

  // Update candidate
  static async updateCandidate(req, res, next) {
    try {
      const { id } = req.params
      const {
        positionId,
        partylistId,
        candidateNumber,
        platform,
        isActive
      } = req.body
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Invalid candidate ID format for update: ${id}`,
          req
        )
        
        const error = new Error("Invalid candidate ID")
        error.statusCode = 400
        return next(error)
      }
      
      const candidate = await Candidate.findById(id)
        .populate('electionId', 'title status')
        .populate('voterId', 'firstName lastName schoolId')
      
      if (!candidate) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to update non-existent candidate: ${id}`,
          req
        )
        
        const error = new Error("Candidate not found")
        error.statusCode = 404
        return next(error)
      }
      
      // Check if election allows modifications
      if (candidate.electionId.status === 'active' || 
          candidate.electionId.status === 'completed' || 
          candidate.electionId.status === 'cancelled') {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to modify candidate in ${candidate.electionId.status} election: ${candidate.electionId.title}`,
          req
        )
        
        const error = new Error("Cannot modify candidates in active, completed, or cancelled elections")
        error.statusCode = 400
        return next(error)
      }
      
      const updateData = {}
      
      // Validate and update position if provided
      if (positionId && positionId !== candidate.positionId.toString()) {
        if (!mongoose.Types.ObjectId.isValid(positionId)) {
          await AuditLog.logUserAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            req.user || {},
            `Invalid position ID format for candidate update: ${positionId}`,
            req
          )
          
          const error = new Error("Invalid position ID")
          error.statusCode = 400
          return next(error)
        }
        
        const position = await Position.findById(positionId)
        if (!position || !position.isActive) {
          await AuditLog.logUserAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            req.user || {},
            `Attempted to update candidate with invalid position: ${positionId}`,
            req
          )
          
          const error = new Error("Position not found or inactive")
          error.statusCode = 404
          return next(error)
        }
        
        updateData.positionId = positionId
      }
      
      // Validate and update partylist if provided
      if (partylistId !== undefined) {
        if (partylistId && !mongoose.Types.ObjectId.isValid(partylistId)) {
          await AuditLog.logUserAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            req.user || {},
            `Invalid partylist ID format for candidate update: ${partylistId}`,
            req
          )
          
          const error = new Error("Invalid partylist ID")
          error.statusCode = 400
          return next(error)
        }
        
        if (partylistId) {
          const partylist = await Partylist.findById(partylistId)
          if (!partylist) {
            await AuditLog.logUserAction(
              'UNAUTHORIZED_ACCESS_ATTEMPT',
              req.user || {},
              `Attempted to update candidate with invalid partylist: ${partylistId}`,
              req
            )
            
            const error = new Error("Partylist not found")
            error.statusCode = 404
            return next(error)
          }
        }
        
        updateData.partylistId = partylistId || null
      }
      
      // Update candidate number if provided
      if (candidateNumber && candidateNumber !== candidate.candidateNumber) {
        // Check if new number is already taken
        const existingNumber = await Candidate.findOne({
          electionId: candidate.electionId._id,
          positionId: updateData.positionId || candidate.positionId,
          candidateNumber,
          _id: { $ne: id }
        })
        
        if (existingNumber) {
          await AuditLog.logUserAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            req.user || {},
            `Attempted to use duplicate candidate number ${candidateNumber} for position update`,
            req
          )
          
          const error = new Error("Candidate number already taken for this position")
          error.statusCode = 400
          return next(error)
        }
        
        updateData.candidateNumber = candidateNumber
      }
      
      // Update other fields
      if (platform !== undefined) updateData.platform = platform
      if (isActive !== undefined) updateData.isActive = isActive
      
      // Update candidate
      const updatedCandidate = await Candidate.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('electionId', 'title electionType')
       .populate('voterId', 'firstName middleName lastName schoolId')
       .populate('positionId', 'positionName')
       .populate('partylistId', 'partylistName')
      
      // Log the action
      await AuditLog.logUserAction(
        'UPDATE_CANDIDATE',
        req.user,
        `Updated candidate: ${candidate.voterId.firstName} ${candidate.voterId.lastName} (${candidate.voterId.schoolId}) in election ${candidate.electionId.title}`,
        req
      )
      
      res.json({
        success: true,
        data: updatedCandidate,
        message: "Candidate updated successfully"
      })
    } catch (error) {
      console.error("Error updating candidate:", error)
      
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0]
        
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Duplicate candidate update attempt - ${field}: ${error.keyValue[field]}`,
          req
        )
        
        const err = new Error(`Duplicate ${field}: ${error.keyValue[field]}`)
        err.statusCode = 400
        return next(err)
      }
      
      await AuditLog.logUserAction(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        req.user || {},
        `Failed to update candidate ${req.params.id}: ${error.message}`,
        req
      )
      
      const err = new Error("Failed to update candidate")
      err.statusCode = 500
      next(err)
    }
  }

  // Delete candidate
  static async deleteCandidate(req, res, next) {
    try {
      const { id } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Invalid candidate ID format for deletion: ${id}`,
          req
        )
        
        const error = new Error("Invalid candidate ID")
        error.statusCode = 400
        return next(error)
      }
      
      const candidate = await Candidate.findById(id)
        .populate('electionId', 'title status')
        .populate('voterId', 'firstName lastName schoolId')
      
      if (!candidate) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to delete non-existent candidate: ${id}`,
          req
        )
        
        const error = new Error("Candidate not found")
        error.statusCode = 404
        return next(error)
      }
      
      // Check if election allows deletion
      if (candidate.electionId.status === 'active' || 
          candidate.electionId.status === 'completed') {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to delete candidate from ${candidate.electionId.status} election: ${candidate.electionId.title}`,
          req
        )
        
        const error = new Error("Cannot delete candidates from active or completed elections")
        error.statusCode = 400
        return next(error)
      }
      
      // Check if candidate has votes (additional safety check)
      if (candidate.voteCount > 0) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to delete candidate with votes: ${candidate.voterId.firstName} ${candidate.voterId.lastName} (${candidate.voteCount} votes)`,
          req
        )
        
        const error = new Error("Cannot delete candidate with existing votes")
        error.statusCode = 400
        return next(error)
      }
      
      await Candidate.findByIdAndDelete(id)
      
      // Log the action
      await AuditLog.logUserAction(
        'DELETE_CANDIDATE',
        req.user,
        `Deleted candidate: ${candidate.voterId.firstName} ${candidate.voterId.lastName} (${candidate.voterId.schoolId}) from election ${candidate.electionId.title}`,
        req
      )
      
      res.json({
        success: true,
        message: "Candidate deleted successfully"
      })
    } catch (error) {
      console.error("Error deleting candidate:", error)
      
      await AuditLog.logUserAction(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        req.user || {},
        `Failed to delete candidate ${req.params.id}: ${error.message}`,
        req
      )
      
      const err = new Error("Failed to delete candidate")
      err.statusCode = 500
      next(err)
    }
  }

  // Upload campaign picture
  static async uploadCampaignPicture(req, res, next) {
    try {
      const { id } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Invalid candidate ID format for campaign picture upload: ${id}`,
          req
        )
        
        const error = new Error("Invalid candidate ID")
        error.statusCode = 400
        return next(error)
      }
      
      if (!req.body.campaignPicture) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Campaign picture upload attempted without image data for candidate: ${id}`,
          req
        )
        
        const error = new Error("Campaign picture is required")
        error.statusCode = 400
        return next(error)
      }
      
      const candidate = await Candidate.findById(id)
        .populate('voterId', 'firstName lastName schoolId')
      
      if (!candidate) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to upload campaign picture for non-existent candidate: ${id}`,
          req
        )
        
        const error = new Error("Candidate not found")
        error.statusCode = 404
        return next(error)
      }
      
      // Convert base64 to buffer
      let campaignPictureBuffer
      try {
        const base64Data = req.body.campaignPicture.replace(/^data:image\/[a-z]+;base64,/, '')
        campaignPictureBuffer = Buffer.from(base64Data, 'base64')
        
        // Basic validation - check if buffer is not empty
        if (campaignPictureBuffer.length === 0) {
          throw new Error("Invalid image data")
        }
      } catch (error) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Invalid campaign picture format for candidate ${id}: ${error.message}`,
          req
        )
        
        const err = new Error("Invalid campaign picture format")
        err.statusCode = 400
        return next(err)
      }
      
      // Update candidate with campaign picture
      candidate.campaignPicture = campaignPictureBuffer
      await candidate.save()
      
      // Log the action
      await AuditLog.logUserAction(
        'CAMPAIGN_PICTURE_UPDATE',
        req.user,
        `Updated campaign picture for candidate: ${candidate.voterId.firstName} ${candidate.voterId.lastName} (${candidate.voterId.schoolId})`,
        req
      )
      
      res.json({
        success: true,
        message: "Campaign picture updated successfully"
      })
    } catch (error) {
      console.error("Error uploading campaign picture:", error)
      
      await AuditLog.logUserAction(
        'FILE_UPLOAD',
        req.user || {},
        `Failed to upload campaign picture for candidate ${req.params.id}: ${error.message}`,
        req
      )
      
      const err = new Error("Failed to upload campaign picture")
      err.statusCode = 500
      next(err)
    }
  }

  // Get candidates by election
  static async getCandidatesByElection(req, res, next) {
    try {
      const { electionId } = req.params
      
      if (!mongoose.Types.ObjectId.isValid(electionId)) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Invalid election ID format for candidates query: ${electionId}`,
          req
        )
        
        const error = new Error("Invalid election ID")
        error.statusCode = 400
        return next(error)
      }
      
      const election = await Election.findById(electionId)
      if (!election) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to get candidates for non-existent election: ${electionId}`,
          req
        )
        
        const error = new Error("Election not found")
        error.statusCode = 404
        return next(error)
      }
      
      const candidates = await Candidate.find({ electionId, isActive: true })
        .populate('voterId', 'firstName middleName lastName schoolId degreeId')
        .populate('positionId', 'positionName positionOrder')
        .populate('partylistId', 'partylistName')
        .sort({ 'positionId.positionOrder': 1, candidateNumber: 1 })
      
      // Group candidates by position
      const candidatesByPosition = candidates.reduce((acc, candidate) => {
        const positionId = candidate.positionId._id.toString()
        if (!acc[positionId]) {
          acc[positionId] = {
            position: candidate.positionId,
            candidates: []
          }
        }
        acc[positionId].candidates.push(candidate)
        return acc
      }, {})
      
      // Log successful access
      await AuditLog.logUserAction(
        'SYSTEM_ACCESS',
        req.user,
        `Admin accessed candidates for election: ${election.title} (${candidates.length} candidates found)`,
        req
      )
      
      res.json({
        success: true,
        data: {
          election,
          candidatesByPosition: Object.values(candidatesByPosition)
        },
        message: "Election candidates retrieved successfully"
      })
    } catch (error) {
      console.error("Error fetching election candidates:", error)
      
      await AuditLog.logUserAction(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        req.user || {},
        `Failed to fetch candidates for election ${req.params.electionId}: ${error.message}`,
        req
      )
      
      const err = new Error("Failed to fetch election candidates")
      err.statusCode = 500
      next(err)
    }
  }
}

module.exports = CandidateController