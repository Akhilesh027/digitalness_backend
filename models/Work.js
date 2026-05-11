const mongoose = require("mongoose");

const workSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    workType: {
      type: String,
      required: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: ["Pending", "Not Started", "In Progress", "Review", "Completed", "Revision", "Failed"],
      default: "Pending",
    },

    dueDate: {
      type: Date,
    },

    description: {
      type: String,
    },
slaDays: {
  type: Number,
  default: 2,
},

updates: [
  {
    message: String,
    files: [String],
    timeSpent: Number,
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    byName: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
],

progressNote: String,
attachments: [String],
timeSpent: {
  type: Number,
  default: 0,
},

managerReviewNote: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Work", workSchema);