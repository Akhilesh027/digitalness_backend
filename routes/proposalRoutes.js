const express = require("express");
const router = express.Router();

const {
  getProposals,
  updateProposalStatus,
} = require("../controllers/proposalController.js");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getProposals);
router.patch("/:id/status", protect, updateProposalStatus);

module.exports = router;