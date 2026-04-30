const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const { authMiddleware, authorizeRoles } = require("../middleware/auth.middleware");

// Register & Login
router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected profile route
router.get("/profile", authMiddleware, (req: any, res: any) => {
  res.json({
    message: "Protected profile accessed successfully",
    user: req.user,
  });
});

// Admin-only route (RBAC)
router.get(
  "/admin",
  authMiddleware,
  authorizeRoles("admin"),
  (req: any, res: any) => {
    res.json({
      message: "Welcome Admin",
    });
  }
);

module.exports = router;