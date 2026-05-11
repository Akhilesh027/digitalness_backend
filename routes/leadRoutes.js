const express = require("express");
const {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  assignLead,
  addCallLog,
  pushToPipeline,
  convertLeadToCustomer,
} = require("../controllers/leadController.js");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createLead);
router.get("/", protect, getLeads);
router.get("/:id", protect, getLeadById);
router.put("/:id", protect, updateLead);
router.delete("/:id", protect, deleteLead);

router.patch("/:id/assign", protect, assignLead);
router.post("/:id/call-log", protect, addCallLog);
router.post("/:id/push-to-pipeline", protect, pushToPipeline);
router.post("/:id/convert", protect, convertLeadToCustomer);

module.exports = router;