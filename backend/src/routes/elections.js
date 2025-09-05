const express = require("express")
const Election = require("../models/Election")
const Candidate = require("../models/Candidate")
const Position = require("../models/Position")
const Partylist = require("../models/Partylist")
const router = express.Router()

// Get all elections
router.get("/", async (req, res, next) => {
  try {
    const elections = await Election.find().populate("createdBy", "username").sort({ createdAt: -1 })
    res.json(elections)
  } catch (error) {
    next(error)
  }
})

// Create new election
router.post("/", async (req, res, next) => {
  try {
    const {
      electionId,
      electionYear,
      title,
      electionType,
      department,
      status,
      electionDate,
      ballotOpenTime,
      ballotCloseTime,
    } = req.body

    // Check if election ID already exists
    const existingElection = await Election.findOne({ electionId })
    if (existingElection) {
      const error = new Error("Election ID already exists")
      error.statusCode = 400
      return next(error)
    }

    const election = new Election({
      electionId,
      electionYear,
      title,
      electionType,
      department,
      status,
      electionDate,
      ballotOpenTime,
      ballotCloseTime,
      createdBy: req.user?.userId || req.body.createdBy,
    })

    await election.save()
    await election.populate("createdBy", "username")

    res.status(201).json(election)
  } catch (error) {
    next(error)
  }
})

// Get election by ID
router.get("/:id", async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.id).populate("createdBy", "username")
    if (!election) {
      const error = new Error("Election not found")
      error.statusCode = 404
      return next(error)
    }
    res.json(election)
  } catch (error) {
    next(error)
  }
})

// Update election
router.put("/:id", async (req, res, next) => {
  try {
    const election = await Election.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "username")

    if (!election) {
      const error = new Error("Election not found")
      error.statusCode = 404
      return next(error)
    }

    res.json(election)
  } catch (error) {
    next(error)
  }
})

// Delete election
router.delete("/:id", async (req, res, next) => {
  try {
    const election = await Election.findByIdAndDelete(req.params.id)
    if (!election) {
      const error = new Error("Election not found")
      error.statusCode = 404
      return next(error)
    }

    // Also delete related candidates, positions, partylists
    await Candidate.deleteMany({ electionId: req.params.id })
    await Position.deleteMany({ electionId: req.params.id })
    await Partylist.deleteMany({ electionId: req.params.id })

    res.json({ message: "Election deleted successfully" })
  } catch (error) {
    next(error)
  }
})

module.exports = router