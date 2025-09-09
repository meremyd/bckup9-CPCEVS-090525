const express = require("express");
const ElectionController = require("../controllers/electionController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const router = express.Router();

router.use(authMiddleware);

router.get("/departmental", authorizeRoles("election_committee", "sao", "voter"), ElectionController.getDepartmentalElections);
router.get("/ssg", authorizeRoles("election_committee", "sao", "voter"), ElectionController.getSSGElections);
router.get("/departments", authorizeRoles("election_committee", "sao"), ElectionController.getAvailableDepartments);
router.get("/departments/:department", authorizeRoles("election_committee", "sao"), ElectionController.getElectionsByDepartment);
router.get("/comparison", authorizeRoles("election_committee", "sao"), ElectionController.getElectionComparison);
router.get("/upcoming", authorizeRoles("election_committee", "sao", "voter"), ElectionController.getUpcomingElections);

router.get("/dashboard/summary", authorizeRoles("election_committee"), ElectionController.getDashboardSummary);
router.get("/", authorizeRoles("election_committee", "sao"), ElectionController.getAllElections);
router.post("/", authorizeRoles("election_committee"), ElectionController.createElection);
router.get("/:id/statistics", authorizeRoles("election_committee", "sao"), ElectionController.getElectionStatistics);
router.get("/:id/results", authorizeRoles("election_committee", "sao"), ElectionController.getElectionResults);
router.get("/:id", authorizeRoles("election_committee", "sao"), ElectionController.getElection); //
router.put("/:id", authorizeRoles("election_committee"), ElectionController.updateElection);
router.delete("/:id", authorizeRoles("election"), ElectionController.deleteElection);
router.patch("/:id/toggle-status", authorizeRoles("election_committee"), ElectionController.toggleElectionStatus);

module.exports = router;