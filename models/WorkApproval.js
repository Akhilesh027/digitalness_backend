const mongoose = require("mongoose");

const workApprovalSchema = new mongoose.Schema(
  {
    work: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Work",
      required: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    reviewMessage: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "Pending Approval",
        "Approved",
        "Rejected",
        "Revision Requested",
      ],
      default: "Pending Approval",
    },

    adminRemark: {
      type: String,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WorkApproval", workApprovalSchema);