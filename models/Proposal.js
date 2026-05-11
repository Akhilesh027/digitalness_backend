const mongoose = require("mongoose");

const proposalSchema = new mongoose.Schema(
  {
    dealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
      required: true,
    },

    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },

    customerName: {
      type: String,
      required: true,
    },

    contactNumber: String,
    businessType: String,
    branchId: String,

    title: {
      type: String,
      required: true,
    },

    proposalValue: {
      type: Number,
      default: 0,
    },

    services: [
      {
        name: String,
        price: Number,
        description: String,
      },
    ],

    status: {
      type: String,
      enum: ["Draft", "Sent", "Accepted", "Rejected"],
      default: "Draft",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    notes: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Proposal", proposalSchema);