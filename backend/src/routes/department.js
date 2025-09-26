const express = require("express");
const DepartmentController = require("../controllers/departmentController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const router = express.Router();

// Public routes (no authentication required)
router.get("/", DepartmentController.getAllDepartments);
router.get("/search", DepartmentController.searchDepartments);
router.get("/colleges/all", DepartmentController.getColleges);
router.get("/degree-programs", DepartmentController.getDegreePrograms);
router.get("/department-codes", DepartmentController.getDepartmentCodes);

// Total count routes (public)
router.get("/counts/all", DepartmentController.getTotalCounts);
router.get("/counts/departments", DepartmentController.getTotalDepartments);
router.get("/counts/colleges", DepartmentController.getTotalColleges);
router.get("/counts/degree-programs", DepartmentController.getTotalDegreePrograms);

router.get("/code/:code", DepartmentController.getDepartmentByCode);
router.get("/:id", DepartmentController.getDepartment);

// Protected routes (require authentication and specific roles)
router.get("/statistics/overview", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), DepartmentController.getDepartmentStatistics);
router.get("/:id/voters/registered", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), DepartmentController.getRegisteredVoters);
router.get("/:id/officers", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), DepartmentController.getClassOfficers);

// Admin-only routes
router.post("/", authMiddleware, authorizeRoles("admin"), DepartmentController.createDepartment);
router.put("/:id", authMiddleware, authorizeRoles("admin"), DepartmentController.updateDepartment);
router.delete("/:id", authMiddleware, authorizeRoles("admin"), DepartmentController.deleteDepartment);
router.post("/bulk", authMiddleware, authorizeRoles("admin"), DepartmentController.bulkCreateDepartments);

module.exports = router;