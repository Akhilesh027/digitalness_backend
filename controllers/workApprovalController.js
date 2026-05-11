const WorkApproval = require("../models/WorkApproval");
const Work = require("../models/Work");
const createNotification = require("../utils/createNotification");

exports.getApprovals = async (req, res) => {
  try {
    let filter = {};

    if (
      req.user.role !== "Admin" &&
      req.user.role !== "admin"
    ) {
      filter = {
        submittedBy: req.user._id,
      };
    }

    const approvals = await WorkApproval.find(filter)
      .populate("work")
      .populate("customer")
      .populate("submittedBy", "name email role")
      .populate("reviewedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: approvals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.reviewApproval = async (req, res) => {
  try {
    const { status, adminRemark } = req.body;

    const approval = await WorkApproval.findById(req.params.id)
      .populate("work")
      .populate("submittedBy");

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: "Approval not found",
      });
    }

    approval.status = status;
    approval.adminRemark = adminRemark;
    approval.reviewedBy = req.user._id;
    approval.reviewedAt = new Date();

    await approval.save();

    // UPDATE WORK STATUS
    if (status === "Approved") {
      approval.work.status = "Completed";
    }

    if (
      status === "Rejected" ||
      status === "Revision Requested"
    ) {
      approval.work.status = "Revision";
    }

    await approval.work.save();

    // NOTIFY EMPLOYEE
    await createNotification({
      title:
        status === "Approved"
          ? "Work Approved"
          : "Revision Requested",

      message:
        status === "Approved"
          ? `${approval.work.title} approved by admin`
          : `${approval.work.title} requires revision`,

      type: "approval",

      moduleId: approval._id,

      moduleModel: "Work",

      recipient: approval.submittedBy._id,

      createdBy: req.user._id,

      link: "/works",
    });

    res.status(200).json({
      success: true,
      message: "Approval updated successfully",
      data: approval,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};