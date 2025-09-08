const express = require("express");
const DegreeController = require("../controllers/degreeController");
const router = express.Router();

// Specific routes MUST come before parameterized routes
router.get("/statistics/overview", DegreeController.getDegreeStatistics);
router.get("/departments/all", DegreeController.getDepartments);
router.get("/search", DegreeController.searchDegrees);
router.post("/bulk", DegreeController.bulkCreateDegrees);

// General CRUD routes
router.get("/", DegreeController.getAllDegrees);
router.post("/", DegreeController.createDegree);

// Parameterized routes should come last
router.get("/:id", DegreeController.getDegree);
router.put("/:id", DegreeController.updateDegree);
router.delete("/:id", DegreeController.deleteDegree);

module.exports = router;