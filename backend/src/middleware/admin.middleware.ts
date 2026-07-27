// Compatibility alias for older imports.
const auth = require("./authMiddleware");
module.exports = auth.requireRole("Admin", "Super Admin");
