// Compatibility alias: use the central RBAC authentication middleware.
const auth = require("./authMiddleware");
module.exports = {
  authMiddleware: auth.protectAdmin || auth,
  protectAdmin: auth.protectAdmin || auth,
  authorizeRoles: auth.authorizeRoles || auth.requireRole,
  requirePermission: auth.requirePermission,
};
