const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    branchId: {
      type: String,
      required: true,
      unique: true,
      enum: ["BR001", "BR002", "BR003"],
    },
    name: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Branch", branchSchema);