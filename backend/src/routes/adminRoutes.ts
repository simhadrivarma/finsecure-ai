const express = require("express");

const {
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} = require("../controllers/adminController");

const router = express.Router();

router.get("/", getAdmins);
router.post("/", createAdmin);
router.put("/:id", updateAdmin);
router.delete("/:id", deleteAdmin);

module.exports = router;