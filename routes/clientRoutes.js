const express = require("express");
const router = express.Router();

const {
  createClientLogin,
} = require("../controllers/clientController.js");

const { protect } = require("../middleware/authMiddleware");

router.post("/create-login", protect, createClientLogin);

module.exports = router;