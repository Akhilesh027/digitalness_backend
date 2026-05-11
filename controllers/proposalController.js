const Proposal = require("../models/Proposal.js");

exports.getProposals = async (req, res) => {
  try {
    const user = req.user;

    let filter = {};

    if (user.role === "Admin") {
      filter = {};
    } else if (user.role === "Operational Manager") {
      filter = { branchId: user.branchId };
    } else {
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

exports.updateProposalStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const proposal = await Proposal.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate("dealId")
      .populate("assignedTo", "name email role department");

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: "Proposal not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Proposal status updated",
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