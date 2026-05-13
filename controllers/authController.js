// src/controllers/authController.js
const User = require("../models/User.js");
const jwt = require("jsonwebtoken");

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, department, salary, address, dateOfJoining, branchId } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({
      name, email, password, phone, role, department, salary, address, dateOfJoining, branchId,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: { id: user._id, name, email, role },
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIN USER
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user with password
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getUsers = async (req, res) => {
  try {
    const user = req.user;
    let filter = {};

    // Role-based filtering
    if (user.role === "Admin") {
      filter = {}; // Admin sees all users
    } else if (user.role === "Operational Manager") {
      filter = { branchId: user.branchId }; // Manager sees only users in their branch
    } else {
      // For Telecaller, Sales Rep etc. – they see only themselves
      filter = { _id: user._id };
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// UPDATE USER
exports.updateUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      role,
      department,
      salary,
      address,
      dateOfJoining,
      status,
      branchId,          // <-- added
    } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email,
        phone,
        role,
        department,
        salary,
        address,
        dateOfJoining,
        status,
        branchId,        // <-- added
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};