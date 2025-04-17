// routes/transaction.js
const express = require("express");
const router = express.Router();
const authenticate = require('../../middleware/authenticate')
const isAdmin = require('../../middleware/admin');
const Transaction = require("../../models/transaction");
const User = require('../../models/user');

// Get paginated transactions
router.get("/transaction", authenticate, isAdmin,async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filters = {};
    if (req.query.userId) filters.userId = req.query.userId;
    if (req.query.status) filters.status = req.query.status;

    const total = await Transaction.countDocuments(filters);

    const transactions = await Transaction.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId")// Optional: enrich with user data

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      totalTransactions: total,
      transactions,
    });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
