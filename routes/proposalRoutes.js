const express = require("express");
const router = express.Router();

const {
  getProposals,
  createProposal,           // new
  updateProposal,           // new
  deleteProposal,           // new
  updateProposalStatus,
} = require("../controllers/proposalController.js");

const { protect } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(protect);

// GET    /api/proposals        – list proposals
// POST   /api/proposals        – create new proposal
router.route("/")
  .get(getProposals)
  .post(createProposal);

// GET    /api/proposals/:id    – (optional) get single proposal
// PUT    /api/proposals/:id    – update full proposal
// DELETE /api/proposals/:id    – delete proposal
router.route("/:id")
  .put(updateProposal)
  .delete(deleteProposal);

// PATCH  /api/proposals/:id/status – update only status (specialised)
router.patch("/:id/status", updateProposalStatus);

module.exports = router;