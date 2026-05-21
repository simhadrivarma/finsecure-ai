const adminMiddleware = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only access" });
  }

  next();
};

module.exports = adminMiddleware;