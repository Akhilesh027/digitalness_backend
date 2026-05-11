const Lead = require("../models/Lead.js");
const Deal = require("../models/Deal.js");
const Customer = require("../models/Customer");
const Branch = require("../models/Branch"); // optional – create if you have a Branch model
const createNotification = require("../utils/createNotification");

const getDealValueFromBudget = (budgetRange = "") => {
  if (budgetRange.includes("3L+")) return 300000;
  if (budgetRange.includes("1L - ₹3L")) return 200000;
  if (budgetRange.includes("50K - ₹1L")) return 75000;
  if (budgetRange.includes("25K - ₹50K")) return 35000;
  if (budgetRange.includes("10K - ₹25K")) return 18000;
  return 50000;
};

const getUserId = (user) => user?._id || user?.id || user;

const notifyUser = async ({
  title,
  message,
  type,
  moduleId,
  moduleModel,
  recipient,
  createdBy,
  link,
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

const populateLead = async (id) => {
  return await Lead.findById(id)
    .populate("assignedTo", "name email phone role department branchId status")
    .populate("createdBy", "name email role branchId")
    .populate("callLogs.calledBy", "name email role");
};

// ========== CREATE LEAD ==========
exports.createLead = async (req, res) => {
  try {
    const lead = await Lead.create({
      ...req.body,
      createdBy: req.user?._id,
      lastContactDate: new Date(),
    });
    const populatedLead = await populateLead(lead._id);
    const assignedUserId = getUserId(populatedLead.assignedTo);
    if (assignedUserId) {
      await notifyUser({
        title: "New Lead Assigned",
        message: `${populatedLead.name} has been assigned to you. Contact: ${populatedLead.contactNumber}, Business: ${populatedLead.businessType}`,
        type: "lead",
        moduleId: populatedLead._id,
        moduleModel: "Lead",
        recipient: assignedUserId,
        createdBy: req.user?._id,
        link: `/leads/${populatedLead._id}`,
      });
    }
    res.status(201).json({ message: "Lead created successfully", lead: populatedLead });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== GET LEADS (Role‑based filtering) ==========
exports.getLeads = async (req, res) => {
  try {
    const loggedUser = req.user;
    let filter = {};
    if (loggedUser.role === "Admin") {
      filter = {};
    } else if (loggedUser.role === "Operational Manager") {
      filter = { branchId: loggedUser.branchId };
    } else {
      filter = { assignedTo: loggedUser._id };
    }
    const leads = await Lead.find(filter)
      .populate("assignedTo", "name email phone role department branchId status")
      .populate("createdBy", "name email role branchId")
      .populate("callLogs.calledBy", "name email role")
      .sort({ createdAt: -1 });
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== GET SINGLE LEAD ==========
exports.getLeadById = async (req, res) => {
  try {
    const lead = await populateLead(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.status(200).json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== UPDATE LEAD ==========
exports.updateLead = async (req, res) => {
  try {
    const oldLead = await Lead.findById(req.params.id);
    if (!oldLead) return res.status(404).json({ message: "Lead not found" });
    const oldAssignedTo = oldLead.assignedTo ? String(oldLead.assignedTo) : null;
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("assignedTo", "name email phone role department status")
      .populate("createdBy", "name email role")
      .populate("callLogs.calledBy", "name email role");
    const newAssignedTo = lead.assignedTo ? String(getUserId(lead.assignedTo)) : null;
    if (newAssignedTo && oldAssignedTo !== newAssignedTo) {
      await notifyUser({
        title: "Lead Assigned To You",
        message: `${lead.name} lead has been assigned to you. Contact: ${lead.contactNumber}`,
        type: "lead",
        moduleId: lead._id,
        moduleModel: "Lead",
        recipient: newAssignedTo,
        createdBy: req.user?._id,
        link: `/leads/${lead._id}`,
      });
    }
    res.status(200).json({ message: "Lead updated successfully", lead });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== DELETE LEAD ==========
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.status(200).json({ message: "Lead deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== ASSIGN LEAD ==========
exports.assignLead = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const oldLead = await Lead.findById(req.params.id);
    if (!oldLead) return res.status(404).json({ message: "Lead not found" });
    const oldAssignedTo = oldLead.assignedTo ? String(oldLead.assignedTo) : null;
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { assignedTo },
      { new: true, runValidators: true }
    )
      .populate("assignedTo", "name email phone role department status")
      .populate("createdBy", "name email role")
      .populate("callLogs.calledBy", "name email role");
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    const newAssignedTo = assignedTo ? String(assignedTo) : null;
    if (newAssignedTo && oldAssignedTo !== newAssignedTo) {
      await notifyUser({
        title: "New Lead Assigned",
        message: `${lead.name} has been assigned to you. Contact: ${lead.contactNumber}, Business: ${lead.businessType}`,
        type: "lead",
        moduleId: lead._id,
        moduleModel: "Lead",
        recipient: newAssignedTo,
        createdBy: req.user?._id,
        link: `/leads/${lead._id}`,
      });
    }
    res.status(200).json({ message: "Lead assigned successfully", lead });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== ADD CALL LOG + NOTES ==========
exports.addCallLog = async (req, res) => {
  try {
    const { callStatus, notes, requirements, followUpDate } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    const callLog = {
      callStatus,
      notes,
      requirements: requirements || [],
      followUpDate,
      calledBy: req.user?._id,
      calledAt: new Date(),
    };
    lead.callLogs.push(callLog);
    if (notes) lead.notes.push(notes);
    lead.status = callStatus;
    lead.lastContactDate = new Date();
    if (requirements?.length) lead.requirements = requirements;
    if (callStatus === "Call Back" || callStatus === "Follow Up") {
      lead.followUpDate = followUpDate;
      lead.nextFollowUpDate = followUpDate;
    }
    if (callStatus === "Own Close") lead.convertedToCustomer = true;
    await lead.save();
    const updatedLead = await populateLead(lead._id);
    const assignedUserId = getUserId(updatedLead.assignedTo);
    if (assignedUserId && String(assignedUserId) !== String(req.user?._id)) {
      await notifyUser({
        title: "Lead Call Log Updated",
        message: `${updatedLead.name} status updated to ${callStatus}. ${notes || ""}`,
        type: "lead",
        moduleId: updatedLead._id,
        moduleModel: "Lead",
        recipient: assignedUserId,
        createdBy: req.user?._id,
        link: `/leads/${updatedLead._id}`,
      });
    }
    res.status(200).json({ message: "Call log added successfully", lead: updatedLead });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== PUSH LEAD TO PIPELINE ==========
exports.pushToPipeline = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    if (lead.leadScore === "Cold") {
      return res.status(400).json({ message: "Cold leads cannot be moved to pipeline" });
    }
    const existingDeal = await Deal.findOne({ leadId: lead._id });
    if (existingDeal) {
      return res.status(400).json({ message: "Lead already exists in sales pipeline", deal: existingDeal });
    }
    const deal = await Deal.create({
      leadId: lead._id,
      title: `${lead.name} - ${lead.requirements?.length ? lead.requirements.join(", ") : "Discovery"}`,
      customerName: lead.name,
      contactNumber: lead.contactNumber,
      businessType: lead.businessType,
      branchId: lead.branchId,
      stage: "New",
      dealValue: getDealValueFromBudget(lead.budgetRange),
      probability: lead.probability || 50,
      expectedCloseDate: lead.expectedClosingDate,
      assignedTo: lead.assignedTo,
      notes: lead.notes.join("\n"),
      callLogs: lead.callLogs,
    });
    lead.inPipeline = true;
    await lead.save();
    if (lead.assignedTo) {
      await notifyUser({
        title: "Lead Moved To Pipeline",
        message: `${lead.name} has been moved to Sales Pipeline as a deal.`,
        type: "deal",
        moduleId: deal._id,
        moduleModel: "Deal",
        recipient: lead.assignedTo,
        createdBy: req.user?._id,
        link: `/sales-pipeline`,
      });
    }
    res.status(201).json({ message: "Lead moved to pipeline successfully", deal, lead });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== CONVERT LEAD TO CUSTOMER ==========
exports.convertLeadToCustomer = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    const existingCustomer = await Customer.findOne({ leadId: lead._id });
    if (existingCustomer) {
      return res.status(400).json({ message: "Customer already exists for this lead", customer: existingCustomer });
    }
    const customer = await Customer.create({
      name: lead.name,
      businessType: lead.businessType,
      contactNumbers: [lead.contactNumber],
      city: lead.city,
      branchId: lead.branchId,
      assignedTo: lead.assignedTo,
      leadId: lead._id,
      requirements: lead.requirements,
      package: lead.budgetRange,
      totalPaid: 0,
      totalPending: 0,
      createdBy: req.user?._id,
    });
    lead.convertedToCustomer = true;
    lead.status = "Own Close";
    await lead.save();
    if (lead.assignedTo) {
      await notifyUser({
        title: "Lead Converted To Customer",
        message: `${lead.name} has been converted into a customer.`,
        type: "customer",
        moduleId: customer._id,
        moduleModel: "Customer",
        recipient: lead.assignedTo,
        createdBy: req.user?._id,
        link: `/customers`,
      });
    }
    res.status(201).json({ message: "Lead converted to customer successfully", lead, customer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== GET BRANCHES (for dropdown) ==========
exports.getBranches = async (req, res) => {
  try {
    // If you have a Branch model, use it:
    if (Branch) {
      const branches = await Branch.find().select("_id name code");
      return res.status(200).json(branches);
    }

    // Fallback: extract unique branch IDs from leads and users
    const leads = await Lead.find().select("branchId").lean();
    const users = await require("../models/User").find().select("branchId").lean();
    const allIds = [...leads.map(l => l.branchId), ...users.map(u => u.branchId)].filter(Boolean);
    const uniqueIds = [...new Set(allIds.map(id => id.toString()))];
    const branches = uniqueIds.map(id => ({
      _id: id,
      name: `Branch ${id.slice(-4)}`,
    }));
    res.status(200).json(branches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};