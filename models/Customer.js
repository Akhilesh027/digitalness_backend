const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    businessType: { type: String, required: true, trim: true },
    contactNumbers: { type: [String], required: true },
    email: { type: String, default: "", trim: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Client",
},
    branchId: {
      type: String,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    requirements: { type: [String], default: [] },
    package: { type: String, default: "" },

    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],

    totalPaid: { type: Number, default: 0 },
    totalPending: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
works: [
  {
    work: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Work",
    },

    title: String,
    workType: String,

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },

    status: {
      type: String,
      default: "Pending",
    },

    priority: String,
    dueDate: Date,
  },
],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);