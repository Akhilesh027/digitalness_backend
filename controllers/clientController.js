const Client = require("../models/Client.js");
const Customer = require("../models/Customer");

exports.createClientLogin = async (req, res) => {
  try {
    const { customerId, email, password } = req.body;

    if (!customerId || !email) {
      return res.status(400).json({
        message: "Customer and email are required",
      });
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    let client = await Client.findOne({ email });

    // Existing client
    if (client) {
      customer.userId = client._id;
      customer.email = email;

      await customer.save();

      return res.status(200).json({
        message: "Existing client linked successfully",
        client,
        customer,
      });
    }

    // New client
    if (!password) {
      return res.status(400).json({
        message: "Password required",
        needsPassword: true,
      });
    }

    client = await Client.create({
      customerId: customer._id,
      name: customer.name,
      email,
      password,
      phone: customer.contactNumbers?.[0] || "",
      businessType: customer.businessType,
      branchId: customer.branchId,
      createdBy: req.user._id,
    });

    customer.userId = client._id;
    customer.email = email;

    await customer.save();

    res.status(201).json({
      message: "Client login created successfully",
      client,
      customer,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};