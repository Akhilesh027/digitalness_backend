const Deal = require("../models/Deal");
const Lead = require("../models/Lead");
const Proposal = require("../models/Proposal");
const Customer = require("../models/Customer");

const getLeadStatusFromDealStage = (stage) => {
  const map = {
    New: "New",
    Contacted: "Call Back",
    Discovery: "Follow Up",
    Qualified: "Demo Completed",
    Proposal: "Follow Up",
    Negotiation: "Follow Up",
    Won: "Own Close",
    Lost: "Own Loss",
  };

  return map[stage] || "New";
};

const getProbabilityFromStage = (stage) => {
  const map = {
    New: 20,
    Contacted: 30,
    Discovery: 45,
    Qualified: 60,
    Proposal: 75,
    Negotiation: 85,
    Won: 100,
    Lost: 0,
  };

  return map[stage] ?? 50;
};

const populateDeal = async (id) => {
  return await Deal.findById(id)
    .populate("leadId")
    .populate("proposalId")
    .populate("customerId")
    .populate("assignedTo", "name email phone role department branchId status");
};

exports.getDeals = async (req, res) => {
  try {
    const user = req.user;

    let filter = {};

    if (user.role === "Admin" || user.role === "admin") {
      filter = {};
    } else if (user.role === "Operational Manager") {
      filter = { branchId: user.branchId };
    } else {
      filter = { assignedTo: user._id };
    }

    const deals = await Deal.find(filter)
      .populate("leadId")
      .populate("proposalId")
      .populate("customerId")
      .populate("assignedTo", "name email phone role department branchId status")
      .sort({ createdAt: -1 });

    res.status(200).json(deals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createDeal = async (req, res) => {
  try {
    const {
      leadId,
      title,
      customerName,
      contactNumber,
      businessType,
      branchId,
      stage,
      dealValue,
      probability,
      expectedCloseDate,
      assignedTo,
      notes,
    } = req.body;

    if (!leadId || !title || !customerName || !contactNumber) {
      return res.status(400).json({
        message: "Lead, title, customer name and contact number are required",
      });
    }

    const lead = await Lead.findById(leadId);

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found",
      });
    }

    const dealStage = stage || "New";

    const deal = await Deal.create({
      leadId,
      title,
      customerName,
      contactNumber,
      businessType: businessType || lead.businessType || "",
      branchId: branchId || lead.branchId || "BR001",
      stage: dealStage,
      dealValue: Number(dealValue || 0),
      probability: probability ?? getProbabilityFromStage(dealStage),
      expectedCloseDate,
      assignedTo: assignedTo || lead.assignedTo,
      notes: notes || "",
    });

    lead.inPipeline = true;
    lead.status = getLeadStatusFromDealStage(dealStage);
    lead.probability = deal.probability;
    lead.expectedClosingDate = expectedCloseDate || lead.expectedClosingDate;
    lead.lastContactDate = new Date();

    lead.notes.push(`Deal created: ${title}`);

    await lead.save();

    const populatedDeal = await populateDeal(deal._id);

    res.status(201).json({
      message: "Deal created successfully",
      deal: populatedDeal,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateDeal = async (req, res) => {
  try {
    const deal = await Deal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    if (deal.leadId) {
      await Lead.findByIdAndUpdate(deal.leadId, {
        probability: deal.probability,
        expectedClosingDate: deal.expectedCloseDate,
        assignedTo: deal.assignedTo,
        branchId: deal.branchId,
        lastContactDate: new Date(),
      });
    }

    const populatedDeal = await populateDeal(deal._id);

    res.status(200).json({
      message: "Deal updated successfully",
      deal: populatedDeal,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.moveDealStage = async (req, res) => {
  try {
    const { stage, lostReason } = req.body;

    const allowedStages = [
      "New",
      "Contacted",
      "Discovery",
      "Qualified",
      "Proposal",
      "Negotiation",
      "Won",
      "Lost",
    ];

    if (!allowedStages.includes(stage)) {
      return res.status(400).json({
        message: "Invalid deal stage",
      });
    }

    const deal = await Deal.findById(req.params.id).populate("leadId");

    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    deal.stage = stage;
    deal.probability = getProbabilityFromStage(stage);

    const leadStatus = getLeadStatusFromDealStage(stage);

    if (deal.leadId) {
      const lead = await Lead.findById(deal.leadId._id || deal.leadId);

      if (lead) {
        lead.status = leadStatus;
        lead.probability = deal.probability;
        lead.inPipeline = true;
        lead.lastContactDate = new Date();

        if (stage === "Won") {
          lead.convertedToCustomer = true;
          lead.notes.push("Deal marked as Won. Customer created.");
        } else if (stage === "Lost") {
          lead.notes.push(`Deal marked as Lost. Reason: ${lostReason || "Other"}`);
        } else if (stage === "Proposal") {
          lead.notes.push("Deal moved to Proposal. Proposal created.");
        } else {
          lead.notes.push(`Deal moved to ${stage}.`);
        }

        await lead.save();
      }
    }

    if (stage === "Won") {
      deal.wonOn = new Date();

      if (!deal.customerCreated) {
        const existingCustomer = await Customer.findOne({
          $or: [
            { contactNumbers: deal.contactNumber },
            { phone: deal.contactNumber },
          ],
        });

        if (existingCustomer) {
          deal.customerId = existingCustomer._id;
          deal.customerCreated = true;
        } else {
          const customer = await Customer.create({
            name: deal.customerName,
            businessType: deal.businessType,
            contactNumbers: [deal.contactNumber],
            phone: deal.contactNumber,
            branchId: deal.branchId,
            assignedTo: deal.assignedTo,
            requirements: deal.leadId?.requirements?.length
              ? deal.leadId.requirements
              : [deal.businessType || "Service"],
            package: deal.title,
            totalPaid: 0,
            totalPending: deal.dealValue || 0,
            status: "Active",
          });

          deal.customerId = customer._id;
          deal.customerCreated = true;
        }
      }
    }

    if (stage === "Lost") {
      deal.lostReason = lostReason || "Other";
    }

    if (stage === "Proposal" && !deal.proposalCreated) {
      const proposal = await Proposal.create({
        dealId: deal._id,
        leadId: deal.leadId?._id || deal.leadId,
        customerName: deal.customerName,
        contactNumber: deal.contactNumber,
        businessType: deal.businessType,
        branchId: deal.branchId,
        title: `${deal.customerName} Proposal`,
        proposalValue: deal.dealValue,
        services: [
          {
            name: deal.businessType || "Service Package",
            price: deal.dealValue,
            description: deal.notes || "Proposal created from sales pipeline",
          },
        ],
        assignedTo: deal.assignedTo,
        notes: deal.notes,
        createdBy: req.user._id,
        status: "Draft",
      });

      deal.proposalId = proposal._id;
      deal.proposalCreated = true;
    }

    await deal.save();

    const updatedDeal = await populateDeal(deal._id);

    res.status(200).json({
      message:
        stage === "Proposal"
          ? "Deal moved to Proposal, lead updated and proposal created"
          : stage === "Won"
          ? "Deal won, lead converted and customer created"
          : "Deal stage and lead status updated successfully",
      deal: updatedDeal,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addDealCallLog = async (req, res) => {
  try {
    const { notes } = req.body;

    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    deal.callLogs.push({
      notes,
      by: req.user._id,
      date: new Date(),
    });

    await deal.save();

    if (deal.leadId) {
      await Lead.findByIdAndUpdate(deal.leadId, {
        $push: {
          callLogs: {
            callStatus: getLeadStatusFromDealStage(deal.stage),
            notes: notes || "",
            calledBy: req.user._id,
            calledAt: new Date(),
          },
          notes: notes || "Deal call log added",
        },
        lastContactDate: new Date(),
      });
    }

    const updatedDeal = await populateDeal(deal._id);

    res.status(200).json({
      message: "Call log added successfully",
      deal: updatedDeal,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteDeal = async (req, res) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);

    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    if (deal.leadId) {
      await Lead.findByIdAndUpdate(deal.leadId, {
        inPipeline: false,
        status: "New",
        probability: 30,
        $push: {
          notes: "Deal deleted from pipeline",
        },
      });
    }

    res.status(200).json({ message: "Deal deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};