// src/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      required: true,
      enum: [
        "Admin",
        "Operational Manager",
        "Performance Marketer",
        "Content Writer",
        "Graphic Designer",
        "UI/UX",
        "Telecaller",
        "Frontend Dev",
        "Backend Dev",
        "BDE",
        "Support",
      ],
    },

    department: {
      type: String,
      required: true,
      enum: [
        "Management",
        "Sales",
        "Marketing",
        "Creative",
        "Technical",
        "Support",
      ],
    },

    salary: {
      type: Number,
      default: 0,
    },

    address: {
      type: String,
      default: "",
    },

    dateOfJoining: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    branchId: {
  type: String,
  enum: ["BR001", "BR002", "BR003"],
  default: "BR001",
},
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};// Compare password for login

module.exports = mongoose.model("User", userSchema);