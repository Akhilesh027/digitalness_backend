const Customer = require("../models/Customer.js");

// Helper to populate customer references (including optional userId for client login)
const populateCustomer = (query) => {
  return query
    .populate("assignedTo", "name email phone role department branchId status")
    .populate("createdBy", "name email role branchId")
    .populate("leadId", "name businessType status")
    .populate("userId", "name email status"); // if you have a ClientLogin model linked via userId
};

// --------------------------------------------------------------
// CREATE a new customer
// --------------------------------------------------------------
exports.createCustomer = async (req, res) => {
  try {
    const customerData = {
      ...req.body,
      createdBy: req.user?._id,
    };

    // If contactNumbers is sent as a string, convert to array
    if (customerData.contactNumber && !customerData.contactNumbers) {
      customerData.contactNumbers = [customerData.contactNumber];
      delete customerData.contactNumber;
    }

    const customer = await Customer.create(customerData);
    const populatedCustomer = await populateCustomer(
      Customer.findById(customer._id)
    );

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: populatedCustomer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.message,
    });
  }
};

// --------------------------------------------------------------
// GET all customers (with role‑based filtering)
// --------------------------------------------------------------
exports.getCustomers = async (req, res) => {
  try {
    const user = req.user;
    let filter = {};

    if (user.role === "Admin") {
      filter = {};
    } else if (user.role === "Operational Manager") {
      filter = { branchId: user.branchId };
    } else {
      // Telecaller, Sales Rep – only see customers assigned to them
      filter = { assignedTo: user._id };
    }

    const customers = await populateCustomer(
      Customer.find(filter).sort({ createdAt: -1 })
    );

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};

// --------------------------------------------------------------
// GET single customer by ID
// --------------------------------------------------------------
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await populateCustomer(Customer.findById(req.params.id));

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
      error: error.message,
    });
  }
};

// --------------------------------------------------------------
// UPDATE a customer
// --------------------------------------------------------------
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent overwriting system fields
    delete updates._id;
    delete updates.createdBy;
    delete updates.createdAt;

    // Normalize contact field
    if (updates.contactNumber && !updates.contactNumbers) {
      updates.contactNumbers = [updates.contactNumber];
      delete updates.contactNumber;
    }

    const customer = await populateCustomer(
      Customer.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      })
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update customer",
      error: error.message,
    });
  }
};

// --------------------------------------------------------------
// DELETE a customer
// --------------------------------------------------------------
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete customer",
      error: error.message,
    });
  }
};

// --------------------------------------------------------------
// GET customers by branch (for managers / dashboards)
// --------------------------------------------------------------
exports.getCustomersByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const customers = await populateCustomer(
      Customer.find({ branchId }).sort({ createdAt: -1 })
    );

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers by branch",
      error: error.message,
    });
  }
};