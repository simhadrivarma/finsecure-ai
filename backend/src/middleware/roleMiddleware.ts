const allowRoles = (...allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    const admin = req.admin;

    if (!admin || !admin.role) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role not found.",
      });
    }

    if (!allowedRoles.includes(admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${admin.role} is not allowed to access this route.`,
      });
    }

    next();
  };
};

module.exports = allowRoles;