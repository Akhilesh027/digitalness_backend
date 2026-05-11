const Customer = require("../models/Customer.js");

const populateCustomer = (query) => {
  return query
    .populate("assignedTo", "name email phone role department branchId status")
    .populate("createdBy", "name email role branchId")
    .populate("leadId");
};

exports.createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create({
      ...req.body,
      createdBy: req.user?._id,
    });

    const populatedCustomer = await populateCustomer(
      Customer.findById(customer._id)
    );

    res.status(201).json({
      message: "Customer created successfully",
      customer: populatedCustomer,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCustomers = async (req, res) => {
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

    const customers = await populateCustomer(
      Customer.find(filter).sort({ createdAt: -1 })
    );

    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await populateCustomer(Customer.findById(req.params.id));

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await populateCustomer(
      Customer.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      })
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({
      message: "Customer updated successfully",
      customer,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({
      message: "Customer deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};