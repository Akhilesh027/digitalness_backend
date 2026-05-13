const express = require("express");
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomersByBranch, // optional – for branch‑wise filtering
} = require("../controllers/customerController.js");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All customer routes require authentication
router.use(protect);

// Main CRUD routes
router.route("/")
  .get(getCustomers)      // GET /api/customers
  .post(createCustomer);  // POST /api/customers

router.route("/:id")
  .get(getCustomerById)   // GET /api/customers/:id
  .put(updateCustomer)    // PUT /api/customers/:id
  .delete(deleteCustomer); // DELETE /api/customers/:id

// Get customers by branch (useful for dashboards / Operational Managers)
router.get("/branch/:branchId", getCustomersByBranch);

module.exports = router;