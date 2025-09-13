const express = require("express")
const CandidateController = require("../controllers/candidateController")
const { authMiddleware, authorizeRoles, voterAuthMiddleware } = require("../middleware/authMiddleware")
const router = express.Router()

// Error handling wrapper for async routes
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// ===== EXPORT ROUTES (Must be first to avoid conflicts) =====
router.get("/export", 
  authMiddleware, 
  authorizeRoles("election_committee", "sao"), 
  asyncHandler(CandidateController.exportCandidates)
)

// ===== SSG SPECIFIC ROUTES =====
// Get all SSG candidates
router.get("/ssg", 
  authMiddleware, 
  authorizeRoles("election_committee", "sao", "voter"), 
  asyncHandler(CandidateController.getAllSSGCandidates)
)

// Create SSG candidate
router.post("/ssg", 
  authMiddleware, 
  authorizeRoles("election_committee"), 
  asyncHandler(CandidateController.createSSGCandidate)
)

// Get SSG candidates by election (MUST be before /ssg/:id)
router.get("/ssg/election/:electionId", 
  authMiddleware, 
  authorizeRoles("election_committee", "sao", "voter"), 
  asyncHandler(CandidateController.getCandidatesBySSGElection)
)

// Get SSG candidates for voter
router.get("/ssg/voter/election/:electionId", 
  voterAuthMiddleware, 
  asyncHandler(CandidateController.getCandidatesForVoter)
)

// Get SSG candidate by ID
router.get("/ssg/:id", 
  authMiddleware, 
  authorizeRoles("election_committee", "sao", "voter"), 
  asyncHandler(CandidateController.getSSGCandidateById)
)

// Update SSG candidate
router.put("/ssg/:id", 
  authMiddleware, 
  authorizeRoles("election_committee"), 
  asyncHandler(CandidateController.updateSSGCandidate)
)

// Delete SSG candidate
router.delete("/ssg/:id", 
  authMiddleware, 
  authorizeRoles("election_committee"), 
  asyncHandler(CandidateController.deleteSSGCandidate)
)

// ===== DEPARTMENTAL SPECIFIC ROUTES =====
// Get all departmental candidates
router.get("/departmental", 
  authMiddleware, 
  authorizeRoles("election_committee", "sao", "voter"), 
  asyncHandler(CandidateController.getAllDepartmentalCandidates)
)

// Create departmental candidate
router.post("/departmental", 
  authMiddleware, 
  authorizeRoles("election_committee"), 
  asyncHandler(CandidateController.createDepartmentalCandidate)
)

// Get departmental candidates by election (MUST be before /departmental/:id)
router.get("/departmental/election/:electionId", 
  authMiddleware, 
  authorizeRoles("election_committee", "sao", "voter"), 
  asyncHandler(CandidateController.getCandidatesByDepartmentalElection)
)

// Get departmental candidates for voter
router.get("/departmental/voter/election/:electionId", 
  voterAuthMiddleware, 
  asyncHandler(CandidateController.getCandidatesForVoter)
)

// Get departmental candidate by ID
router.get("/departmental/:id", 
  authMiddleware, 
  authorizeRoles("election_committee", "sao", "voter"), 
  asyncHandler(CandidateController.getDepartmentalCandidateById)
)

// Update departmental candidate
router.put("/departmental/:id", 
  authMiddleware, 
  authorizeRoles("election_committee"), 
  asyncHandler(CandidateController.updateDepartmentalCandidate)
)

// Delete departmental candidate
router.delete("/departmental/:id", 
  authMiddleware, 
  authorizeRoles("election_committee"), 
  asyncHandler(CandidateController.deleteDepartmentalCandidate)
)

// ===== GENERIC ELECTION ROUTES (After specific routes) =====
// Get candidates by election (generic - requires type parameter)
router.get("/election/:electionId", 
  authMiddleware, 
  authorizeRoles("election_committee", "sao", "voter"), 
  asyncHandler(CandidateController.getCandidatesByElection)
)

// Get candidates for voter (generic - requires type parameter)
router.get("/voter/election/:electionId", 
  voterAuthMiddleware, 
  asyncHandler(CandidateController.getCandidatesForVoter)
)

// ===== CAMPAIGN PICTURE ROUTES (SSG only) =====
// Upload campaign picture
router.put("/:id/campaign-picture", 
  authMiddleware, 
  authorizeRoles("election_committee"), 
  asyncHandler(CandidateController.uploadCampaignPicture)
)

// Get campaign picture
router.get("/:id/campaign-picture", 
  authMiddleware, 
  authorizeRoles("election_committee", "sao", "voter"), 
  asyncHandler(CandidateController.getCandidateCampaignPicture)
)

// ===== GENERIC ROUTES (MUST be at the bottom to avoid conflicts) =====
// Get all candidates
router.get("/", 
  authMiddleware, 
  authorizeRoles("election_committee", "sao", "voter"), 
  asyncHandler(CandidateController.getAllCandidates)
)

// Create candidate (generic)
router.post("/", 
  authMiddleware, 
  authorizeRoles("election_committee"), 
  asyncHandler(CandidateController.createCandidate)
)

// Get candidate by ID (generic - MUST be after all specific routes)
router.get("/:id", 
  authMiddleware, 
  authorizeRoles("election_committee", "sao", "voter"), 
  asyncHandler(CandidateController.getCandidateById)
)

// Update candidate (generic)
router.put("/:id", 
  authMiddleware, 
  authorizeRoles("election_committee"), 
  asyncHandler(CandidateController.updateCandidate)
)

// Delete candidate (generic)
router.delete("/:id", 
  authMiddleware, 
  authorizeRoles("election_committee"), 
  asyncHandler(CandidateController.deleteCandidate)
)

// ===== ERROR HANDLING MIDDLEWARE =====
router.use((error, req, res, next) => {
  console.error('Candidate Route Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    params: req.params,
    query: req.query
  })

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(error.errors).map(err => err.message)
    })
  }

  if (error.name === 'CastError' && error.kind === 'ObjectId') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    })
  }

  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry detected'
    })
  }

  // Default error response
  const statusCode = error.statusCode || error.status || 500
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  })
})

module.exports = router