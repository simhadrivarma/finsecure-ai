const createAuditLog = require("../utils/createAuditLog");

const getActionName = (method: string, moduleName: string) => {
  const moduleKey = String(moduleName || "Module")
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (method === "POST") return `${moduleKey}_CREATED`;
  if (method === "PUT" || method === "PATCH") return `${moduleKey}_UPDATED`;
  if (method === "DELETE") return `${moduleKey}_DELETED`;

  return `${moduleKey}_ACTION`;
};

const getTargetName = (body: any, data: any) => {
  return (
    data?.name ||
    data?.customer ||
    data?.title ||
    data?.branch ||
    data?.email ||
    body?.name ||
    body?.customer ||
    body?.title ||
    body?.branch ||
    body?.email ||
    body?.accountNumber ||
    ""
  );
};

const getTargetId = (req: any, data: any) => {
  return data?.id || req?.params?.id || req?.body?.id || "";
};

const auditActionMiddleware = (moduleName: string) => {
  return async (req: any, res: any, next: any) => {
    const method = req.method;

    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return next();
    }

    const originalJson = res.json.bind(res);

    res.json = async (body: any) => {
      try {
        const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
        const action = getActionName(method, moduleName);
        const data = body?.data || {};

        const targetId = getTargetId(req, data);
        const targetName = getTargetName(req.body, data);

        let operation = "performed action on";

        if (method === "POST") operation = "created";
        if (method === "PUT" || method === "PATCH") operation = "updated";
        if (method === "DELETE") operation = "deleted";

        await createAuditLog({
          req,
          action,
          module: moduleName,
          description: `${req.admin?.name || "Admin"} ${operation} ${moduleName}${
            targetName ? `: ${targetName}` : ""
          }`,
          targetId,
          targetName,
          status: isSuccess ? "Success" : "Failed",
        });
      } catch (error: any) {
        console.log("Audit action middleware failed:", error.message);
      }

      return originalJson(body);
    };

    next();
  };
};

module.exports = auditActionMiddleware;