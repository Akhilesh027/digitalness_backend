const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    businessType: { type: String, required: true, trim: true },
    contactNumbers: { type: [String], required: true }, // array of phone numbers
    email: { type: String, default: "", trim: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },

    // Client login reference (if you have a separate Client/ClientLogin model)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client", // or "ClientLogin" – adjust to your actual model name
      default: null,
    },

    branchId: { type: String, required: true }, // which branch this customer belongs to

    // Employee (User) assigned to this customer
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Optional: from which lead this customer was converted
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    // List of selected services/requirements
    requirements: { type: [String], default: [] },

    // Package / plan name
    package: { type: String, default: "" },

    // Related projects (if you have a separate Project model)
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],

    // Financials
    totalPaid: { type: Number, default: 0 },
    totalPending: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    // Who created this customer (Admin/Manager)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // should always be set
    },
  },
  { timestamps: true }
);

// Indexes for faster queries (role‑based filtering)
customerSchema.index({ branchId: 1 });
customerSchema.index({ assignedTo: 1 });
customerSchema.index({ status: 1 });

module.exports = mongoose.model("Customer", customerSchema);