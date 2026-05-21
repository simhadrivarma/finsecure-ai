const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const protectAdmin = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Login token is required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET || "finsecure_ai_default_secret"
    );

    const admin = await Admin.findOne({
      id: decoded.id,
      status: "Active",
    })
      .select("-_id -__v -password -createdAt -updatedAt")
      .lean();

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Admin not found.",
      });
    }

    req.admin = admin;
    next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please login again.",
      error: error.message,
    });
  }
};

module.exports = protectAdmin;