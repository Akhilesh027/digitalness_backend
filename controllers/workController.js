const Work = require("../models/Work.js");
const Customer = require("../models/Customer.js");
const createNotification = require("../utils/createNotification");
const WorkApproval = require("../models/WorkApproval.js");
const User = require("../models/User");
const getUserId = (user) => user?._id || user?.id || user;

const allowedStatuses = [
  "Pending",
  "Not Started",
  "In Progress",
  "Review",
  "Completed",
  "Revision",
  "Failed",
];

const notifyUser = async ({
  title,
  message,
  type = "work",
  moduleId,
  moduleModel = "Work",
  recipient,
  createdBy,
  link = "/works",
}) => {
  if (!recipient) return;

  await createNotification({
    title,
    message,
    type,
    moduleId,
    moduleModel,
    recipient,
    createdBy,
    link,
  });
};

const notifyMany = async (recipients = [], payload) => {
  const uniqueRecipients = [
    ...new Set(
      recipients
        .filter(Boolean)
        .map((recipient) => String(getUserId(recipient)))
    ),
  ];

  await Promise.all(
    uniqueRecipients.map((recipient) =>
      notifyUser({
        ...payload,
        recipient,
      })
    )
  );
};

const populateWork = async (id) => {
  return await Work.findById(id)
    .populate({
      path: "customer",
      select: "name customerName clientName companyName email phone",
    })
    .populate({
      path: "assignedTo",
      select: "name fullName username email role department",
    })
    .populate({
      path: "createdBy",
      select: "name fullName username email role",
    });
};

exports.createWork = async (req, res) => {
  try {
    const {
      title,
      workType,
      type,
      customer,
      customerId,
      assignedTo,
      priority,
      dueDate,
      description,
      deliverables,
      completedDeliverables,
      templateId,
    } = req.body;

    const finalWorkType = workType || type;
    const finalCustomer = customer || customerId;

    if (!title || !finalWorkType || !finalCustomer || !assignedTo) {
      return res.status(400).json({
        success: false,
        message: "Title, work type, customer and employee are required",
      });
    }

    const customerExists = await Customer.findById(finalCustomer);

    if (!customerExists) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const finalAssignedTo = Array.isArray(assignedTo)
      ? assignedTo
      : [assignedTo];

    const newWork = await Work.create({
      title,
      workType: finalWorkType,
      customer: finalCustomer,
      assignedTo: finalAssignedTo,
      priority: priority || "Medium",
      dueDate,
      description,
      deliverables: deliverables || 1,
      completedDeliverables: completedDeliverables || 0,
      templateId,
      createdBy: req.user?._id || req.user?.id,
      status: "Not Started",
    });

    await Customer.findByIdAndUpdate(
      finalCustomer,
      {
        $push: {
          works: {
            work: newWork._id,
            title: newWork.title,
            workType: newWork.workType,
            assignedTo: newWork.assignedTo,
            status: newWork.status,
            priority: newWork.priority,
            dueDate: newWork.dueDate,
          },
        },
      },
      { new: true }
    );

    await notifyMany(finalAssignedTo, {
      title: "New Work Assigned",
      message: `${newWork.title} has been assigned to you for ${customerExists.name || customerExists.companyName || "customer"}.`,
      type: "work",
      moduleId: newWork._id,
      moduleModel: "Work",
      createdBy: req.user?._id,
      link: "/works",
    });

    const populatedWork = await populateWork(newWork._id);

    res.status(201).json({
      success: true,
      message: "Work created, assigned and saved to customer successfully",
      data: populatedWork,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create work",
      error: error.message,
    });
  }
};

exports.getAllWorks = async (req, res) => {
  try {
    let query = {};

    if (req.user.role !== "admin" && req.user.role !== "Admin") {
      query = {
        assignedTo: { $in: [req.user._id] },
      };
    }

    const works = await Work.find(query)
      .populate({
        path: "customer",
        select: "name customerName clientName companyName email phone",
      })
      .populate({
        path: "assignedTo",
        select: "name fullName username email role department",
      })
      .populate({
        path: "createdBy",
        select: "name fullName username email role",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: works.length,
      data: works,
    });
  } catch (error) {
    console.log("GET WORKS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch works",
      error: error.message,
    });
  }
};

exports.getEmployeeWorks = async (req, res) => {
  try {
    const works = await Work.find({
      assignedTo: { $in: [req.params.employeeId] },
    })
      .populate("customer")
      .populate("assignedTo", "-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: works,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch employee works",
      error: error.message,
    });
  }
};

exports.updateWorkStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid work status",
      });
    }

    const oldWork = await Work.findById(req.params.id);

    if (!oldWork) {
      return res.status(404).json({
        success: false,
        message: "Work not found",
      });
    }

    const updatedWork = await Work.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    await Customer.updateOne(
      {
        _id: updatedWork.customer,
        "works.work": updatedWork._id,
      },
      {
        $set: {
          "works.$.status": status,
        },
      }
    );

    const assignedUsers = Array.isArray(updatedWork.assignedTo)
      ? updatedWork.assignedTo
      : [updatedWork.assignedTo];

    const changedBy = req.user?._id;

    const recipients = assignedUsers.filter(
      (userId) => String(userId) !== String(changedBy)
    );

    let title = "Work Status Updated";
    let message = `${updatedWork.title} status changed to ${status}.`;

   if (status === "Review") {
  title = "Work Submitted For Review";
  message = `${updatedWork.title} has been submitted for review.`;

  // CREATE APPROVAL ENTRY
  const approval = await WorkApproval.create({
    work: updatedWork._id,
    customer: updatedWork.customer,
    submittedBy: req.user._id,
    assignedTo: updatedWork.assignedTo,
    reviewMessage:
      updatedWork.progressNote ||
      `${updatedWork.title} submitted for approval`,
  });

  // FIND ADMINS
  const admins = await User.find({
    role: { $in: ["Admin", "admin"] },
  });

  // SEND NOTIFICATIONS TO ADMINS
  await Promise.all(
    admins.map(async (admin) => {
      await notifyUser({
        title: "Work Approval Required",
        message: `${updatedWork.title} submitted by ${
          req.user.name || req.user.email
        } requires approval.`,
        type: "approval",
        moduleId: approval._id,
        moduleModel: "Work",
        recipient: admin._id,
        createdBy: req.user._id,
        link: "/work-approvals",
      });
    })
  );
}
    if (status === "Completed") {
      title = "Work Completed";
      message = `${updatedWork.title} has been marked as completed.`;
    }

    if (status === "Revision") {
      title = "Revision Requested";
      message = `Revision requested for ${updatedWork.title}.`;
    }

    if (status === "Failed") {
      title = "Work Failed";
      message = `${updatedWork.title} has been marked as failed.`;
    }

    await notifyMany(recipients, {
      title,
      message,
      type: "work",
      moduleId: updatedWork._id,
      moduleModel: "Work",
      createdBy: changedBy,
      link: "/works",
    });

    if (
      updatedWork.createdBy &&
      String(updatedWork.createdBy) !== String(changedBy)
    ) {
      await notifyUser({
        title,
        message,
        type: "work",
        moduleId: updatedWork._id,
        moduleModel: "Work",
        recipient: updatedWork.createdBy,
        createdBy: changedBy,
        link: "/works",
      });
    }

    const populatedWork = await populateWork(updatedWork._id);

    res.status(200).json({
      success: true,
      message: "Work status updated successfully",
      data: populatedWork,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update work status",
      error: error.message,
    });
  }
};

exports.deleteWork = async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);

    if (!work) {
      return res.status(404).json({
        success: false,
        message: "Work not found",
      });
    }

    const assignedUsers = Array.isArray(work.assignedTo)
      ? work.assignedTo
      : [work.assignedTo];

    await Customer.findByIdAndUpdate(work.customer, {
      $pull: {
        works: {
          work: work._id,
        },
      },
    });

    await Work.findByIdAndDelete(req.params.id);

    await notifyMany(assignedUsers, {
      title: "Work Deleted",
      message: `${work.title} has been deleted.`,
      type: "work",
      moduleId: work._id,
      moduleModel: "Work",
      createdBy: req.user?._id,
      link: "/works",
    });

    res.status(200).json({
      success: true,
      message: "Work deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete work",
      error: error.message,
    });
  }
};

exports.addWorkUpdate = async (req, res) => {
  try {
    const { message, files, timeSpent } = req.body;

    const work = await Work.findById(req.params.id);

    if (!work) {
      return res.status(404).json({
        success: false,
        message: "Work not found",
      });
    }

    const update = {
      message,
      files: files || [],
      timeSpent: Number(timeSpent) || 0,
      by: req.user._id,
      byName: req.user.name || req.user.email,
      createdAt: new Date(),
    };

    work.updates.push(update);
    work.progressNote = message;
    work.attachments = [...(work.attachments || []), ...(files || [])];
    work.timeSpent = (work.timeSpent || 0) + (Number(timeSpent) || 0);

    await work.save();

    const assignedUsers = Array.isArray(work.assignedTo)
      ? work.assignedTo
      : [work.assignedTo];

    const recipients = assignedUsers.filter(
      (userId) => String(userId) !== String(req.user._id)
    );

    await notifyMany(recipients, {
      title: "Work Update Added",
      message: `${req.user.name || req.user.email} added an update on ${work.title}.`,
      type: "work",
      moduleId: work._id,
      moduleModel: "Work",
      createdBy: req.user._id,
      link: "/works",
    });

    if (work.createdBy && String(work.createdBy) !== String(req.user._id)) {
      await notifyUser({
        title: "Work Update Added",
        message: `${req.user.name || req.user.email} added an update on ${work.title}.`,
        type: "work",
        moduleId: work._id,
        moduleModel: "Work",
        recipient: work.createdBy,
        createdBy: req.user._id,
        link: "/works",
      });
    }

    const populatedWork = await populateWork(work._id);

    res.status(200).json({
      success: true,
      message: "Work update added successfully",
      data: populatedWork,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add work update",
      error: error.message,
    });
  }
};