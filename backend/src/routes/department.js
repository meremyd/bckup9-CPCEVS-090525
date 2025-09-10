const express = require("express");
const DepartmentController = require("../controllers/departmentController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", DepartmentController.getAllDepartments);
router.get("/search", DepartmentController.searchDepartments);
router.get("/colleges/all", DepartmentController.getColleges);
router.get("/:id", DepartmentController.getDepartment);

// Voter-related endpoints
router.get("/:id/voters/registered", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), DepartmentController.getRegisteredVoters);
router.get("/:id/officers", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), DepartmentController.getClassOfficers);

router.get("/statistics/overview", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), DepartmentController.getDepartmentStatistics);

router.post("/", authMiddleware, authorizeRoles("admin"), DepartmentController.createDepartment);
router.put("/:id", authMiddleware, authorizeRoles("admin"), DepartmentController.updateDepartment);
router.delete("/:id", authMiddleware, authorizeRoles("admin"), DepartmentController.deleteDepartment);
router.post("/bulk", authMiddleware, authorizeRoles("admin"), DepartmentController.bulkCreateDepartments);

module.exports = router;