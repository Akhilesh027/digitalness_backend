const express = require("express");
const router = express.Router();

const {
  createWork,
  getAllWorks,
  getEmployeeWorks,
  updateWorkStatus,
  deleteWork,
  addWorkUpdate
} = require("../controllers/workController.js");

// AUTH MIDDLEWARE
const { protect } = require("../middleware/authMiddleware.js");

// CREATE WORK
router.post("/", protect, createWork);
router.post("/:id/update", protect, addWorkUpdate);
// GET ALL WORKS
router.get("/", protect, getAllWorks);

// GET EMPLOYEE WORKS
router.get("/employee/:employeeId", protect, getEmployeeWorks);

// UPDATE STATUS
router.put("/:id/status", protect, updateWorkStatus);

// DELETE WORK
router.delete("/:id", protect, deleteWork);

module.exports = router;