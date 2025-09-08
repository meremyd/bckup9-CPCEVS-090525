const express = require("express");
const ElectionController = require("../controllers/electionController");
const router = express.Router();

// Specific routes first
router.get("/dashboard/summary", ElectionController.getDashboardSummary);

// General routes
router.get("/", ElectionController.getAllElections);
router.post("/", ElectionController.createElection);

// Parameterized routes last
router.get("/:id/statistics", ElectionController.getElectionStatistics);
router.get("/:id/results", ElectionController.getElectionResults);
router.get("/:id", ElectionController.getElection);
router.put("/:id", ElectionController.updateElection);
router.delete("/:id", ElectionController.deleteElection);
router.patch("/:id/toggle-status", ElectionController.toggleElectionStatus);

module.exports = router;