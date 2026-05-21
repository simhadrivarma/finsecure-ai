const express = require("express");
const { getCustomerDetails } = require("../controllers/admin.controller");

const router = express.Router();

router.get("/customers", getCustomerDetails);

module.exports = router;