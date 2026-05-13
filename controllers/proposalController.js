const Proposal = require("../models/Proposal.js");
const Customer = require("../models/Customer.js");
const Deal = require("../models/Deal.js"); // optional, to update linked deal

// Helper to generate a unique proposal number
const generateProposalNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Proposal.countDocuments();
  const seq = String(count + 1).padStart(4, "0");
  return `PR-${year}-${seq}`;
};

// --------------------------------------------------------------
// GET all proposals (with role‑based filtering)
// --------------------------------------------------------------
exports.getProposals = async (req, res) => {
  try {
    const user = req.user;
    let filter = {};

    if (user.role === "Admin") {
      filter = {};
    } else if (user.role === "Operational Manager") {
      filter = { branchId: user.branchId };
    } else {
      // Telecaller, Sales Rep, etc. – only see their own assigned proposals
      filter = { assignedTo: user._id };
    }

    const proposals = await Proposal.find(filter)
      .populate("dealId")
      .populate("leadId")
      .populate("assignedTo", "name email phone role department branchId")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: proposals.length,
      data: proposals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch proposals",
      error: error.message,
    });
  }
};

// --------------------------------------------------------------
// GET single proposal by ID
// --------------------------------------------------------------
exports.getProposalById = async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id)
      .populate("dealId")
      .populate("leadId")
      .populate("assignedTo", "name email phone role department branchId")
      .populate("createdBy", "name email role");

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: "Proposal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: proposal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch proposal",
      error: error.message,
    });
  }
};

// --------------------------------------------------------------
// CREATE a new proposal
// --------------------------------------------------------------
exports.createProposal = async (req, res) => {
  try {
    // Generate a unique proposal number if not provided
    let proposalNumber = req.body.proposalNumber;
    if (!proposalNumber) {
      proposalNumber = await generateProposalNumber();
    }

    const proposalData = {
      ...req.body,
      proposalNumber,
      createdBy: req.user._id,
      // If assignedTo is not provided, default to the creator
      assignedTo: req.body.assignedTo || req.user._id,
    };

    const proposal = new Proposal(proposalData);
    await proposal.save();

    // Populate references for response
    await proposal.populate("dealId");
    await proposal.populate("leadId");
    await proposal.populate("assignedTo", "name email role department branchId");

    res.status(201).json({
      success: true,
      data: proposal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create proposal",
      error: error.message,
    });
  }
};

// --------------------------------------------------------------
// UPDATE a proposal (full update)
// --------------------------------------------------------------
exports.updateProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent overwriting system fields
    delete updates._id;
    delete updates.createdBy;
    delete updates.createdAt;
    delete updates.proposalNumber; // optional: allow updating? Usually keep as is

    const proposal = await Proposal.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("dealId")
      .populate("leadId")
      .populate("assignedTo", "name email role department branchId");

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: "Proposal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: proposal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update proposal",
      error: error.message,
    });
  }
};

// --------------------------------------------------------------
// DELETE a proposal
// --------------------------------------------------------------
exports.deleteProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = await Proposal.findByIdAndDelete(id);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: "Proposal not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Proposal deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete proposal",
      error: error.message,
    });
  }
};

// --------------------------------------------------------------
// UPDATE only the status of a proposal (used by pipeline)
// Now also creates a customer when status becomes "Accepted"
// --------------------------------------------------------------
exports.updateProposalStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const proposalId = req.params.id;

    // Fetch the proposal before updating (to have old data if needed)
    const oldProposal = await Proposal.findById(proposalId)
      .populate("leadId")
      .populate("dealId")
      .populate("assignedTo");

    if (!oldProposal) {
      return res.status(404).json({
        success: false,
        message: "Proposal not found",
      });
    }

    // Update the status
    const proposal = await Proposal.findByIdAndUpdate(
      proposalId,
      { status },
      { new: true }
    )
      .populate("dealId")
      .populate("leadId")
      .populate("assignedTo", "name email role department branchId");

    // If status is "Accepted", create or link a customer
    if (status === "Accepted") {
      // Check if a customer already exists with same email or contact number
      const email = proposal.email || proposal.customerEmail;
      const contactNumber = proposal.contactNumber;

      let existingCustomer = null;
      if (email) {
        existingCustomer = await Customer.findOne({ email });
      }
      if (!existingCustomer && contactNumber) {
        existingCustomer = await Customer.findOne({
          $or: [
            { contactNumbers: contactNumber },
            { phone: contactNumber },
          ],
        });
      }

      if (existingCustomer) {
        // Link existing customer to this proposal
        await Customer.findByIdAndUpdate(existingCustomer._id, {
          $addToSet: { proposals: proposal._id },
        });
        proposal.customerId = existingCustomer._id;
        proposal.customerCreated = true;
        await proposal.save();
      } else {
        // Create a new customer from proposal data
        const customerData = {
          name: proposal.customerName,
          businessType: proposal.businessType,
          contactNumbers: proposal.contactNumber ? [proposal.contactNumber] : [],
          email: email || "",
          branchId: proposal.branchId,
          assignedTo: proposal.assignedTo?._id || proposal.assignedTo,
          leadId: proposal.leadId?._id || proposal.leadId,
          requirements: proposal.services?.map(s => s.name) || [],
          package: proposal.title,
          totalPaid: 0,
          totalPending: proposal.proposalValue || 0,
          status: "Active",
          createdBy: req.user._id,
        };
        const newCustomer = await Customer.create(customerData);
        proposal.customerId = newCustomer._id;
        proposal.customerCreated = true;
        await proposal.save();
      }

      // Optional: If this proposal is linked to a deal, update the deal
      if (proposal.dealId) {
        await Deal.findByIdAndUpdate(proposal.dealId, {
          customerCreated: true,
          customerId: proposal.customerId,
          stage: "Won", // optionally auto‑move deal to Won
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Proposal status updated",
      data: proposal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update proposal status",
      error: error.message,
    });
  }
};