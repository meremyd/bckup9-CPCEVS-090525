const express = require("express");
const DegreeController = require("../controllers/degreeController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", DegreeController.getAllDegrees);
router.get("/search", DegreeController.searchDegrees);
router.get("/departments/all", DegreeController.getDepartments);
router.get("/:id", DegreeController.getDegree);

router.get("/statistics/overview", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), DegreeController.getDegreeStatistics);

router.post("/", authMiddleware, authorizeRoles("admin"), DegreeController.createDegree);
router.put("/:id", authMiddleware, authorizeRoles("admin"), DegreeController.updateDegree);
router.delete("/:id", authMiddleware, authorizeRoles("admin"), DegreeController.deleteDegree);
router.post("/bulk", authMiddleware, authorizeRoles("admin"), DegreeController.bulkCreateDegrees);

module.exports = router;