const mongoose = require("mongoose")
const Candidate = require("../models/Candidate")
const SSGElection = require("../models/SSGElection")
const DepartmentalElection = require("../models/DepartmentalElection")
const Voter = require("../models/Voter")
const Position = require("../models/Position")
const Partylist = require("../models/Partylist")
const AuditLog = require("../models/AuditLog")

class CandidateController {
  // Get all candidates (SSG and Departmental)
  static async getAllCandidates(req, res, next) {
    try {
      const { page = 1, limit = 10, type, electionId, positionId, status } = req.query
      
      const query = {}
      
      // Filter by election type
      if (type === 'ssg') {
        query.ssgElectionId = { $ne: null }
        query.deptElectionId = null
      } else if (type === 'departmental') {
        query.deptElectionId = { $ne: null }
        query.ssgElectionId = null
      }
      
      // Filter by specific election
      if (electionId) {
        if (!mongoose.Types.ObjectId.isValid(electionId)) {
          await AuditLog.logUserAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            req.user || {},
            `Invalid election ID format: ${electionId}`,
            req
          )
          
          const error = new Error("Invalid election ID format")
          error.statusCode = 400
          return next(error)
        }
        
        if (type === 'ssg') {
          query.ssgElectionId = electionId
        } else if (type === 'departmental') {
          query.deptElectionId = electionId
        }
      }
      
      // Filter by position
      if (positionId) {
        if (!mongoose.Types.ObjectId.isValid(positionId)) {
          await AuditLog.logUserAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            req.user || {},
            `Invalid position ID format: ${positionId}`,
            req
          )
          
          const error = new Error("Invalid position ID format")
          error.statusCode = 400
          return next(error)
        }
        query.positionId = positionId
      }
      
      // Filter by status
      if (status) query.isActive = status === 'active'

      const candidates = await Candidate.find(query)
        .populate('voterId', 'schoolId firstName middleName lastName departmentId yearLevel')
        .populate('voterId.departmentId', 'departmentCode degreeProgram college')
        .populate('ssgElectionId', 'title electionDate status')
        .populate('deptElectionId', 'title electionDate status department')
        .populate('positionId', 'positionName positionOrder maxVotes')
        .populate('partylistId', 'partylistName')
        .sort({ candidateNumber: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)

      const total = await Candidate.countDocuments(query)

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved ${candidates.length} candidates (type: ${type || 'all'})`,
        req
      )

      res.json({
        success: true,
        data: {
          candidates,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          total
        },
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

  // Get candidate by ID (SSG and Departmental)
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
        .populate('voterId', 'schoolId firstName middleName lastName departmentId yearLevel email')
        .populate('voterId.departmentId', 'departmentCode degreeProgram college')
        .populate('ssgElectionId', 'title electionDate status ballotOpenTime ballotCloseTime')
        .populate('deptElectionId', 'title electionDate status ballotOpenTime ballotCloseTime department')
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

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved candidate ${id} - ${candidate.voterId.firstName} ${candidate.voterId.lastName}`,
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

  // Create candidate (SSG and Departmental)
  static async createCandidate(req, res, next) {
    try {
      const {
        voterId,
        ssgElectionId,
        deptElectionId,
        positionId,
        partylistId,
        candidateNumber,
        platform,
        isActive = true
      } = req.body

      // Validation
      if (!voterId || !positionId) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Invalid candidate creation attempt - missing required fields`,
          req
        )
        
        const error = new Error("Voter ID and Position ID are required")
        error.statusCode = 400
        return next(error)
      }

      // Must specify either SSG or Departmental election, not both
      if ((!ssgElectionId && !deptElectionId) || (ssgElectionId && deptElectionId)) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Invalid candidate creation attempt - must specify either SSG or Departmental election`,
          req
        )
        
        const error = new Error("Must specify either SSG Election or Departmental Election, not both")
        error.statusCode = 400
        return next(error)
      }

      // Validate ObjectIds
      if (!mongoose.Types.ObjectId.isValid(voterId) ||
          !mongoose.Types.ObjectId.isValid(positionId) ||
          (ssgElectionId && !mongoose.Types.ObjectId.isValid(ssgElectionId)) ||
          (deptElectionId && !mongoose.Types.ObjectId.isValid(deptElectionId)) ||
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

      // Verify voter exists and is registered
      const voter = await Voter.findById(voterId).populate('departmentId')
      if (!voter) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to create candidate with invalid voter: ${voterId}`,
          req
        )
        
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      if (!voter.isRegistered || !voter.isPasswordActive) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to create candidate with unregistered voter: ${voter.schoolId}`,
          req
        )
        
        const error = new Error("Only registered voters can be candidates")
        error.statusCode = 400
        return next(error)
      }

      // Verify election exists and is in correct status
      let election
      if (ssgElectionId) {
        election = await SSGElection.findById(ssgElectionId)
        if (!election) {
          await AuditLog.logUserAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            req.user || {},
            `Attempted to create candidate for non-existent SSG election: ${ssgElectionId}`,
            req
          )
          
          const error = new Error("SSG Election not found")
          error.statusCode = 404
          return next(error)
        }
      } else {
        election = await DepartmentalElection.findById(deptElectionId).populate('departmentId')
        if (!election) {
          await AuditLog.logUserAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            req.user || {},
            `Attempted to create candidate for non-existent Departmental election: ${deptElectionId}`,
            req
          )
          
          const error = new Error("Departmental Election not found")
          error.statusCode = 404
          return next(error)
        }
        
        // For departmental elections, verify voter's department matches
        if (voter.departmentId._id.toString() !== election.departmentId._id.toString()) {
          await AuditLog.logUserAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            req.user || {},
            `Voter's department (${voter.departmentId.departmentCode}) does not match election department (${election.departmentId.departmentCode})`,
            req
          )
          
          const error = new Error("Voter's department does not match election department")
          error.statusCode = 400
          return next(error)
        }
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

      // Verify position exists and belongs to the election
      const position = await Position.findOne({
        _id: positionId,
        $or: [
          { ssgElectionId: ssgElectionId },
          { deptElectionId: deptElectionId }
        ],
        isActive: true
      })
      if (!position) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to create candidate with invalid position: ${positionId}`,
          req
        )
        
        const error = new Error("Position not found or not active for this election")
        error.statusCode = 404
        return next(error)
      }

      // Check if voter is already a candidate in this election
      const existingCandidate = await Candidate.findOne({
        voterId,
        $or: [
          { ssgElectionId: ssgElectionId },
          { deptElectionId: deptElectionId }
        ]
      })
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

      // Verify partylist if provided
      if (partylistId) {
        const partylist = await Partylist.findOne({
          _id: partylistId,
          ssgElectionId: ssgElectionId // Only SSG elections have partylists
        })
        if (!partylist) {
          await AuditLog.logUserAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            req.user || {},
            `Attempted to create candidate with invalid partylist: ${partylistId}`,
            req
          )
          
          const error = new Error("Partylist not found or not valid for this election")
          error.statusCode = 404
          return next(error)
        }
      }

      // Generate candidate number if not provided
      let finalCandidateNumber = candidateNumber
      if (!finalCandidateNumber) {
        const lastCandidate = await Candidate.findOne({
          positionId
        }).sort({ candidateNumber: -1 })
        finalCandidateNumber = lastCandidate ? lastCandidate.candidateNumber + 1 : 1
      }

      // Check if candidate number is already taken for this position
      const existingNumber = await Candidate.findOne({
        positionId,
        candidateNumber: finalCandidateNumber
      })
      if (existingNumber) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to use duplicate candidate number ${finalCandidateNumber} for position ${position.positionName}`,
          req
        )
        
        const error = new Error("Candidate number already exists for this position")
        error.statusCode = 400
        return next(error)
      }

      // Create candidate
      const candidate = new Candidate({
        voterId,
        ssgElectionId,
        deptElectionId,
        positionId,
        partylistId,
        candidateNumber: finalCandidateNumber,
        platform,
        isActive
      })

      await candidate.save()

      // Populate for response
      await candidate.populate([
        { path: 'voterId', select: 'schoolId firstName middleName lastName departmentId yearLevel' },
        { path: 'ssgElectionId', select: 'title electionDate' },
        { path: 'deptElectionId', select: 'title electionDate department' },
        { path: 'positionId', select: 'positionName positionOrder' },
        { path: 'partylistId', select: 'partylistName' }
      ])

      const electionType = ssgElectionId ? 'SSG' : 'Departmental'
      await AuditLog.logUserAction(
        "CREATE_CANDIDATE",
        req.user,
        `Created ${electionType} candidate: ${voter.firstName} ${voter.lastName} (${voter.schoolId}) for position ${position.positionName}`,
        req
      )

      res.status(201).json({
        success: true,
        data: candidate,
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

  // Update candidate (SSG and Departmental)
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
        .populate('voterId', 'firstName lastName schoolId')
        .populate('ssgElectionId', 'title status')
        .populate('deptElectionId', 'title status')
        .populate('positionId', 'positionName')

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
      const election = candidate.ssgElectionId || candidate.deptElectionId
      if (election.status === 'completed' || election.status === 'cancelled') {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to modify candidate in ${election.status} election: ${election.title}`,
          req
        )
        
        const error = new Error("Cannot modify candidates in completed or cancelled elections")
        error.statusCode = 400
        return next(error)
      }

      const updateData = {}

      // If updating position, verify it belongs to the same election
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

        const position = await Position.findOne({
          _id: positionId,
          $or: [
            { ssgElectionId: candidate.ssgElectionId },
            { deptElectionId: candidate.deptElectionId }
          ],
          isActive: true
        })
        if (!position) {
          await AuditLog.logUserAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            req.user || {},
            `Attempted to update candidate with invalid position: ${positionId}`,
            req
          )
          
          const error = new Error("Position not found or not active for this election")
          error.statusCode = 404
          return next(error)
        }

        updateData.positionId = positionId
      }

      // If updating partylist, verify it belongs to the same election (SSG only)
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
          const partylist = await Partylist.findOne({
            _id: partylistId,
            ssgElectionId: candidate.ssgElectionId
          })
          if (!partylist) {
            await AuditLog.logUserAction(
              'UNAUTHORIZED_ACCESS_ATTEMPT',
              req.user || {},
              `Attempted to update candidate with invalid partylist: ${partylistId}`,
              req
            )
            
            const error = new Error("Partylist not found or not valid for this election")
            error.statusCode = 404
            return next(error)
          }
        }

        updateData.partylistId = partylistId || null
      }

      // If updating candidate number, check for conflicts
      if (candidateNumber && candidateNumber !== candidate.candidateNumber) {
        const existingNumber = await Candidate.findOne({
          positionId: updateData.positionId || candidate.positionId,
          candidateNumber,
          _id: { $ne: candidate._id }
        })
        if (existingNumber) {
          await AuditLog.logUserAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            req.user || {},
            `Attempted to use duplicate candidate number ${candidateNumber} for position update`,
            req
          )
          
          const error = new Error("Candidate number already exists for this position")
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
      ).populate([
        { path: 'voterId', select: 'schoolId firstName middleName lastName departmentId yearLevel' },
        { path: 'ssgElectionId', select: 'title electionDate' },
        { path: 'deptElectionId', select: 'title electionDate department' },
        { path: 'positionId', select: 'positionName positionOrder' },
        { path: 'partylistId', select: 'partylistName' }
      ])

      const electionType = candidate.ssgElectionId ? 'SSG' : 'Departmental'
      await AuditLog.logUserAction(
        "UPDATE_CANDIDATE",
        req.user,
        `Updated ${electionType} candidate: ${candidate.voterId.firstName} ${candidate.voterId.lastName} (${candidate.voterId.schoolId})`,
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

  // Delete candidate (SSG and Departmental)
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
        .populate('voterId', 'firstName lastName schoolId')
        .populate('ssgElectionId', 'title status')
        .populate('deptElectionId', 'title status')
        .populate('positionId', 'positionName')

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
      const election = candidate.ssgElectionId || candidate.deptElectionId
      if (election.status === 'active' || election.status === 'completed') {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to delete candidate from ${election.status} election: ${election.title}`,
          req
        )
        
        const error = new Error("Cannot delete candidates from active or completed elections")
        error.statusCode = 400
        return next(error)
      }

      // Check if candidate has votes (if election was active before)
      const Vote = require("../models/Vote")
      const voteCount = await Vote.countDocuments({ candidateId: candidate._id })
      if (voteCount > 0) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to delete candidate with votes: ${candidate.voterId.firstName} ${candidate.voterId.lastName} (${voteCount} votes)`,
          req
        )
        
        const error = new Error("Cannot delete candidate with existing votes")
        error.statusCode = 400
        return next(error)
      }

      await Candidate.findByIdAndDelete(id)

      const electionType = candidate.ssgElectionId ? 'SSG' : 'Departmental'
      await AuditLog.logUserAction(
        "DELETE_CANDIDATE",
        req.user,
        `Deleted ${electionType} candidate: ${candidate.voterId.firstName} ${candidate.voterId.lastName} (${candidate.voterId.schoolId}) from position ${candidate.positionId.positionName}`,
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

  // Upload campaign picture (SSG only)
  static async uploadCampaignPicture(req, res, next) {
    try {
      const { id } = req.params
      const { campaignPicture } = req.body

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

      if (!campaignPicture) {
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
        .populate('ssgElectionId', 'title status')

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

      // Only SSG candidates can have campaign pictures
      if (!candidate.ssgElectionId) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to upload campaign picture for non-SSG candidate: ${candidate.voterId.schoolId}`,
          req
        )
        
        const error = new Error("Campaign pictures are only allowed for SSG candidates")
        error.statusCode = 400
        return next(error)
      }

      // Check if election allows modifications
      if (candidate.ssgElectionId.status === 'completed' || candidate.ssgElectionId.status === 'cancelled') {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to upload campaign picture for candidate in ${candidate.ssgElectionId.status} election`,
          req
        )
        
        const error = new Error("Cannot modify campaign pictures in completed or cancelled elections")
        error.statusCode = 400
        return next(error)
      }

      // Convert base64 to buffer if needed
      let pictureBuffer
      try {
        if (typeof campaignPicture === 'string') {
          // Remove data URL prefix if present
          const base64Data = campaignPicture.replace(/^data:image\/[a-z]+;base64,/, '')
          pictureBuffer = Buffer.from(base64Data, 'base64')
        } else {
          pictureBuffer = campaignPicture
        }

        // Basic validation - check if buffer is not empty
        if (pictureBuffer.length === 0) {
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
      candidate.campaignPicture = pictureBuffer
      await candidate.save()

      await AuditLog.logUserAction(
        "CAMPAIGN_PICTURE_UPDATE",
        req.user,
        `Updated campaign picture for SSG candidate: ${candidate.voterId.firstName} ${candidate.voterId.lastName} (${candidate.voterId.schoolId})`,
        req
      )

      res.json({
        success: true,
        data: {
          _id: candidate._id,
          candidateNumber: candidate.candidateNumber,
          hasCampaignPicture: true
        },
        message: "Campaign picture uploaded successfully"
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

  // Get candidates by election (SSG and Departmental)
  static async getCandidatesByElection(req, res, next) {
    try {
      const { electionId } = req.params
      const { type, positionId, partylistId, status } = req.query

      if (!type || (type !== 'ssg' && type !== 'departmental')) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Invalid election type specified: ${type}`,
          req
        )
        
        const error = new Error("Election type (ssg or departmental) is required")
        error.statusCode = 400
        return next(error)
      }

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

      // Verify election exists
      let election
      const query = { isActive: true }
      
      if (type === 'ssg') {
        election = await SSGElection.findById(electionId)
        query.ssgElectionId = electionId
        query.deptElectionId = null
      } else {
        election = await DepartmentalElection.findById(electionId).populate('departmentId')
        query.deptElectionId = electionId
        query.ssgElectionId = null
      }

      if (!election) {
        await AuditLog.logUserAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Attempted to get candidates for non-existent election: ${electionId}`,
          req
        )
        
        const error = new Error(`${type.toUpperCase()} Election not found`)
        error.statusCode = 404
        return next(error)
      }

      // Additional filters
      if (positionId) {
        if (!mongoose.Types.ObjectId.isValid(positionId)) {
          await AuditLog.logUserAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            req.user || {},
            `Invalid position ID format: ${positionId}`,
            req
          )
          
          const error = new Error("Invalid position ID")
          error.statusCode = 400
          return next(error)
        }
        query.positionId = positionId
      }
      if (partylistId) {
        if (!mongoose.Types.ObjectId.isValid(partylistId)) {
          await AuditLog.logUserAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            req.user || {},
            `Invalid partylist ID format: ${partylistId}`,
            req
          )
          
          const error = new Error("Invalid partylist ID")
          error.statusCode = 400
          return next(error)
        }
        query.partylistId = partylistId
      }
      if (status) query.isActive = status === 'active'

      const candidates = await Candidate.find(query)
        .populate('voterId', 'schoolId firstName middleName lastName departmentId yearLevel')
        .populate('voterId.departmentId', 'departmentCode degreeProgram college')
        .populate('positionId', 'positionName positionOrder maxVotes')
        .populate('partylistId', 'partylistName description')
        .sort({ 'positionId.positionOrder': 1, candidateNumber: 1 })

      // Group candidates by position for better organization
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

      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        req.user,
        `Retrieved ${candidates.length} candidates for ${type.toUpperCase()} election: ${election.title}`,
        req
      )

      res.json({
        success: true,
        data: {
          election: {
            _id: election._id,
            title: election.title,
            electionDate: election.electionDate,
            status: election.status,
            type: type.toUpperCase(),
            ...(type === 'departmental' && { 
              department: election.departmentId.departmentCode,
              departmentName: election.departmentId.degreeProgram,
              college: election.departmentId.college
            })
          },
          candidates,
          candidatesByPosition: Object.values(candidatesByPosition),
          totalCandidates: candidates.length
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

  // Get candidates for voter view (with voting eligibility check)
  static async getCandidatesForVoter(req, res, next) {
    try {
      const { electionId } = req.params
      const { type } = req.query
      const voterId = req.user.voterId

      if (!type || (type !== 'ssg' && type !== 'departmental')) {
        await AuditLog.logVoterAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Invalid election type specified: ${type}`,
          req
        )
        
        const error = new Error("Election type (ssg or departmental) is required")
        error.statusCode = 400
        return next(error)
      }

      if (!mongoose.Types.ObjectId.isValid(electionId)) {
        await AuditLog.logVoterAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Invalid election ID format: ${electionId}`,
          req
        )
        
        const error = new Error("Invalid election ID")
        error.statusCode = 400
        return next(error)
      }

      // Get voter info
      const voter = await Voter.findById(voterId).populate('departmentId')
      if (!voter) {
        await AuditLog.logVoterAction(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          req.user || {},
          `Voter not found: ${voterId}`,
          req
        )
        
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      // Verify election exists and check voting eligibility
      let election
      let canVote = false
      let eligibilityMessage = ""
      
      if (type === 'ssg') {
        election = await SSGElection.findById(electionId)
        if (!election) {
          await AuditLog.logVoterAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            voter,
            `Attempted to access non-existent SSG election: ${electionId}`,
            req
          )
          
          const error = new Error("SSG Election not found")
          error.statusCode = 404
          return next(error)
        }
        // Only registered voters can vote in SSG elections
        canVote = voter.isRegistered && voter.isPasswordActive
        eligibilityMessage = canVote ? 
          "You are eligible to vote in this SSG election" : 
          "You must be a registered voter to participate in SSG elections"
      } else {
        election = await DepartmentalElection.findById(electionId).populate('departmentId')
        if (!election) {
          await AuditLog.logVoterAction(
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            voter,
            `Attempted to access non-existent Departmental election: ${electionId}`,
            req
          )
          
          const error = new Error("Departmental Election not found")
          error.statusCode = 404
          return next(error)
        }
        // For departmental elections: registered voters and class officers can vote
        // Others can only view statistics and results
        const departmentMatch = voter.departmentId._id.toString() === election.departmentId._id.toString()
        canVote = voter.isRegistered && voter.isPasswordActive && voter.isClassOfficer && departmentMatch
        
        if (!voter.isRegistered) {
          eligibilityMessage = "You must be a registered voter to access departmental elections"
        } else if (!voter.isClassOfficer) {
          eligibilityMessage = "Only registered class officers can vote in departmental elections. You can view statistics and results."
        } else if (!departmentMatch) {
          eligibilityMessage = "You can only vote in elections for your department"
        } else {
          eligibilityMessage = "You are eligible to vote in this departmental election"
        }
      }

      // Get candidates
      const query = { isActive: true }
      if (type === 'ssg') {
        query.ssgElectionId = electionId
        query.deptElectionId = null
      } else {
        query.deptElectionId = electionId
        query.ssgElectionId = null
      }

      const candidates = await Candidate.find(query)
        .populate('voterId', 'schoolId firstName middleName lastName departmentId yearLevel')
        .populate('voterId.departmentId', 'departmentCode degreeProgram college')
        .populate('positionId', 'positionName positionOrder maxVotes')
        .populate('partylistId', 'partylistName description')
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

      await AuditLog.logVoterAction(
        "BALLOT_ACCESSED",
        voter,
        `Viewed candidates for ${type.toUpperCase()} election: ${election.title} - Can vote: ${canVote}`,
        req
      )

      res.json({
        success: true,
        data: {
          election: {
            _id: election._id,
            title: election.title,
            electionDate: election.electionDate,
            status: election.status,
            type: type.toUpperCase(),
            ...(type === 'departmental' && { 
              department: election.departmentId.departmentCode,
              departmentName: election.departmentId.degreeProgram,
              college: election.departmentId.college
            })
          },
          candidates,
          candidatesByPosition: Object.values(candidatesByPosition),
          totalCandidates: candidates.length,
          voterEligibility: {
            canVote,
            canViewResults: true, // All registered voters can view results
            isRegistered: voter.isRegistered,
            isClassOfficer: voter.isClassOfficer,
            departmentMatch: type === 'departmental' ? 
              voter.departmentId._id.toString() === election.departmentId._id.toString() : 
              true,
            message: eligibilityMessage
          }
        },
        message: "Candidates retrieved successfully"
      })
    } catch (error) {
      console.error("Error fetching candidates for voter:", error)

      await AuditLog.logVoterAction(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        req.user || {},
        `Failed to fetch candidates for voter: ${error.message}`,
        req
      )

      const err = new Error("Failed to fetch candidates")
      err.statusCode = 500
      next(err)
    }
  }
}

module.exports = CandidateController