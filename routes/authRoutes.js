// src/routes/authRoutes.js
const express = require("express");
const {
  registerUser,
  loginUser,
  getUsers,
    updateUser,
    deleteUser,
} = require("../controllers/authController.js");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
const { protect } = require("../middleware/authMiddleware.js");

router.get("/", protect, getUsers);
router.put("/:id", protect, updateUser);
router.delete("/:id", protect, deleteUser);

module.exports = router;