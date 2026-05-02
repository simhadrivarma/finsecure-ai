const express = require("express");
const router = express.Router();

const transactionController = require("../controllers/transaction.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

router.post("/", authMiddleware, transactionController.addTransaction);
router.get("/", authMiddleware, transactionController.getTransactions);

module.exports = router;