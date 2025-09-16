const express = require("express");
const DepartmentController = require("../controllers/departmentController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", DepartmentController.getAllDepartments);
router.get("/search", DepartmentController.searchDepartments);
router.get("/colleges/all", DepartmentController.getColleges);
router.get("/statistics/overview", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), DepartmentController.getDepartmentStatistics);
router.get("/code/:code", DepartmentController.getDepartmentByCode); // NEW ROUTE
router.get("/:id", DepartmentController.getDepartment);
router.get("/:id/voters/registered", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), DepartmentController.getRegisteredVoters);
router.get("/:id/officers", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), DepartmentController.getClassOfficers);
router.post("/", authMiddleware, authorizeRoles("admin"), DepartmentController.createDepartment);
router.put("/:id", authMiddleware, authorizeRoles("admin"), DepartmentController.updateDepartment);
router.delete("/:id", authMiddleware, authorizeRoles("admin"), DepartmentController.deleteDepartment);
router.post("/bulk", authMiddleware, authorizeRoles("admin"), DepartmentController.bulkCreateDepartments);

module.exports = router;