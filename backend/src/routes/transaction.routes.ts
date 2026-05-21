const express = require("express");

const {
  getTransactions,
  addTransaction,
  deleteTransaction,
} = require("../controllers/transaction.controller");

const { authMiddleware } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", authMiddleware, getTransactions);
router.post("/", authMiddleware, addTransaction);
router.delete("/:id", authMiddleware, deleteTransaction);

module.exports = router;