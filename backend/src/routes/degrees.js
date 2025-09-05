const express = require("express")
const Degree = require("../models/Degree")
const router = express.Router()

// Get all degrees
router.get("/", async (req, res, next) => {
  try {
    const degrees = await Degree.find().sort({ degreeCode: 1 })
    res.json(degrees)
  } catch (error) {
    next(error)
  }
})

// Create new degree
router.post("/", async (req, res, next) => {
  try {
    const { degreeCode, degreeName, department } = req.body

    const existingDegree = await Degree.findOne({ degreeCode })
    if (existingDegree) {
      const error = new Error("Degree code already exists")
      error.statusCode = 400
      return next(error)
    }

    const degree = new Degree({
      degreeCode,
      degreeName,
      department,
    })

    await degree.save()
    res.status(201).json(degree)
  } catch (error) {
    next(error)
  }
})

module.exports = router