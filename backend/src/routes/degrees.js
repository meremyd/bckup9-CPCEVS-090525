const express = require("express");
const DegreeController = require("../controllers/degreeController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const router = express.Router();

// Public routes (no authentication required)
router.get("/", DegreeController.getAllDegrees);
router.get("/search", DegreeController.searchDegrees);
router.get("/departments/all", DegreeController.getDepartments);
router.get("/:id", DegreeController.getDegree);

// Protected routes requiring authentication and specific roles
// Statistics routes - require admin or election committee access
router.get("/statistics/overview", authMiddleware, authorizeRoles("admin", "election_committee"), DegreeController.getDegreeStatistics);

// Create, Update, Delete routes - require admin access only
router.post("/", authMiddleware, authorizeRoles("admin"), DegreeController.createDegree);

router.put("/:id", authMiddleware, authorizeRoles("admin"), DegreeController.updateDegree);

router.delete("/:id", authMiddleware, authorizeRoles("admin"), DegreeController.deleteDegree);

// Bulk operations - require admin access only
router.post("/bulk", authMiddleware, authorizeRoles("admin"), DegreeController.bulkCreateDegrees);

module.exports = router;