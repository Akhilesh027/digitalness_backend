const express = require("express");

const router = express.Router();

const {
  getApprovals,
  reviewApproval,
} = require("../controllers/workApprovalController.js");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getApprovals);

router.put("/:id/review", protect, reviewApproval);

module.exports = router;