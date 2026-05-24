// @ts-nocheck
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const looseSchema = new mongoose.Schema(
  {},
  {
    strict: false,
    timestamps: true,
  }
);

const getLooseModel = (modelName: string, collectionName: string) => {
  return (
    mongoose.models[modelName] ||
    mongoose.model(modelName, looseSchema, collectionName)
  );
};

const cleanMoney = (value: any) => {
  if (value === undefined || value === null || value === "") return 0;

  const numberValue = Number(
    String(value).replace(/₹/g, "").replace(/,/g, "").trim()
  );

  return Number.isNaN(numberValue) ? value : numberValue;
};

const makeId = (prefix: string) => {
  return `${prefix}${Date.now().toString().slice(-8)}`;
};

const idPrefix = {
  admin: "ADM",
  employee: "EMP",
  branch: "BR",
  customer: "CUS",
  loan: "LOAN",
  transaction: "TXN",
  report: "REP",
  auditLog: "LOG",
};

const normalizeRecord = async (entity: string, body: any, oldRecord: any = {}) => {
  const data = {
    ...oldRecord,
    ...body,
  };

  if (!data.id) {
    data.id = makeId(idPrefix[entity] || "REC");
  }

  if (entity === "admin") {
    data.name = data.name || "Admin";
    data.email = data.email ? String(data.email).toLowerCase().trim() : "";
    data.role = data.role || "Branch Manager";
    data.status = data.status || "Active";

    if (data.password && !String(data.password).startsWith("$2")) {
      data.password = await bcrypt.hash(String(data.password), 10);
    }
  }

  if (entity === "employee") {
    data.name = data.name || "";
    data.email = data.email ? String(data.email).toLowerCase().trim() : "";
    data.phone = data.phone || "";
    data.role = data.role || "Customer Support Executive";
    data.branch = data.branch || "Main Branch";
    data.ifsc = data.ifsc || "";
    data.customers = Number(data.customers || 0);
    data.status = data.status || "Active";
  }

  if (entity === "branch") {
    data.name = data.name || "";
    data.address = data.address || "";
    data.ifsc = data.ifsc || "";
    data.manager = data.manager || "";
    data.employees = Number(data.employees || 0);
    data.customers = Number(data.customers || 0);
    data.balance = cleanMoney(data.balance);
    data.loans = cleanMoney(data.loans);
    data.status = data.status || "Active";
  }

  if (entity === "customer") {
    data.name = data.name || data.customerName || "";
    data.customerName = data.customerName || data.name || "";
    data.email = data.email ? String(data.email).toLowerCase().trim() : "";
    data.phone = data.phone || data.phoneNumber || "";
    data.phoneNumber = data.phoneNumber || data.phone || "";
    data.accountNumber = String(data.accountNumber || "").trim();
    data.accountType = data.accountType || "Savings Account";
    data.ifsc = data.ifsc || data.ifscCode || "";
    data.ifscCode = data.ifscCode || data.ifsc || "";
    data.cif = data.cif || data.cifNumber || "";
    data.cifNumber = data.cifNumber || data.cif || "";
    data.balance = cleanMoney(data.balance);
    data.totalIncome = cleanMoney(data.totalIncome);
    data.totalExpense = cleanMoney(data.totalExpense);
    data.branch = data.branch || "Main Branch";
    data.assignedEmployee =
      data.assignedEmployee || data.employee || data.assignedEmployeeName || "";
    data.employee = data.employee || data.assignedEmployee || "";
    data.kyc = data.kyc || "Pending";
    data.status = data.status || "Active";
  }

  if (entity === "loan") {
    data.customer = data.customer || data.customerName || "";
    data.accountNumber = data.accountNumber || "";
    data.type = data.type || "Personal Loan";
    data.amount = cleanMoney(data.amount);
    data.interest = data.interest || "";
    data.emi = cleanMoney(data.emi);
    data.paid = cleanMoney(data.paid);
    data.pending = cleanMoney(data.pending);
    data.status = data.status || "Active";
  }

  if (entity === "transaction") {
    data.customer = data.customer || "";
    data.accountNumber = data.accountNumber || "";
    data.type = data.type || "UPI Payment";
    data.amount = cleanMoney(data.amount);
    data.date = data.date || new Date().toISOString().slice(0, 10);
    data.time =
      data.time ||
      new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    data.ref = data.ref || `REF${Date.now()}`;
    data.status = data.status || "Success";
    data.risk = data.risk || "Normal";
    data.riskScore = data.riskScore || 0;
  }

  if (entity === "report") {
    data.title = data.title || "Admin Report";
    data.type = data.type || "Customer";
    data.totalRecords = Number(data.totalRecords || 0);
    data.generatedBy = data.generatedBy || "Admin";
    data.generatedDate =
      data.generatedDate || new Date().toISOString().slice(0, 10);
    data.status = data.status || "Ready";
  }

  if (entity === "auditLog") {
    data.action = data.action || "System";
    data.module = data.module || "Admin";
    data.description = data.description || "Admin action recorded";
    data.status = data.status || "Success";
  }

  return data;
};

const formatRecord = (record: any) => {
  const obj = record.toObject ? record.toObject() : { ...record };

  return {
    ...obj,
    id: obj.id || String(obj._id),
  };
};

const findByAnyId = async (Model: any, id: string) => {
  let record = null;

  if (mongoose.Types.ObjectId.isValid(id)) {
    record = await Model.findById(id);
  }

  if (!record) {
    record = await Model.findOne({ id });
  }

  if (!record) {
    record = await Model.findOne({ accountNumber: id });
  }

  return record;
};

const createCrudRouter = (entity: string, collectionName: string) => {
  const router = express.Router();
  const Model = getLooseModel(`Fallback_${entity}`, collectionName);

  router.get("/", async (req: any, res: any) => {
    try {
      const rows = await Model.find({}).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: rows.length,
        data: rows.map(formatRecord),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || `Failed to load ${entity}`,
      });
    }
  });

  router.post("/", async (req: any, res: any) => {
    try {
      const payload = await normalizeRecord(entity, req.body);

      const record = await Model.create(payload);

      return res.status(201).json({
        success: true,
        message: `${entity} created successfully`,
        data: formatRecord(record),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || `Failed to create ${entity}`,
      });
    }
  });

  router.get("/:id", async (req: any, res: any) => {
    try {
      const record = await findByAnyId(Model, req.params.id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: `${entity} not found`,
        });
      }

      return res.status(200).json({
        success: true,
        data: formatRecord(record),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || `Failed to load ${entity}`,
      });
    }
  });

  router.put("/:id", async (req: any, res: any) => {
    try {
      const record = await findByAnyId(Model, req.params.id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: `${entity} not found`,
        });
      }

      const payload = await normalizeRecord(entity, req.body, record.toObject());

      Object.assign(record, payload);
      await record.save();

      return res.status(200).json({
        success: true,
        message: `${entity} updated successfully`,
        data: formatRecord(record),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || `Failed to update ${entity}`,
      });
    }
  });

  router.delete("/", async (req: any, res: any) => {
    try {
      await Model.deleteMany({});

      return res.status(200).json({
        success: true,
        message: `${entity} records cleared successfully`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || `Failed to clear ${entity}`,
      });
    }
  });

  router.delete("/:id", async (req: any, res: any) => {
    try {
      const record = await findByAnyId(Model, req.params.id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: `${entity} not found`,
        });
      }

      await record.deleteOne();

      return res.status(200).json({
        success: true,
        message: `${entity} deleted successfully`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || `Failed to delete ${entity}`,
      });
    }
  });

  return router;
};

const createDashboardRouter = () => {
  const router = express.Router();

  const Customer = getLooseModel("Fallback_dashboard_customers", "customers");
  const Employee = getLooseModel("Fallback_dashboard_employees", "employees");
  const Branch = getLooseModel("Fallback_dashboard_branches", "branches");
  const Loan = getLooseModel("Fallback_dashboard_loans", "loans");
  const Transaction = getLooseModel(
    "Fallback_dashboard_admin_transactions",
    "admintransactions"
  );
  const Report = getLooseModel("Fallback_dashboard_reports", "reports");
  const AuditLog = getLooseModel("Fallback_dashboard_auditlogs", "auditlogs");

  router.get("/", async (req: any, res: any) => {
    try {
      const [
        customers,
        employees,
        branches,
        loans,
        transactions,
        reports,
        auditLogs,
      ] = await Promise.all([
        Customer.find({}),
        Employee.find({}),
        Branch.find({}),
        Loan.find({}),
        Transaction.find({}).sort({ createdAt: -1 }).limit(5),
        Report.find({}),
        AuditLog.find({}),
      ]);

      const totalBalance = customers.reduce(
        (sum: number, item: any) => sum + Number(item.balance || 0),
        0
      );

      const totalLoanAmount = loans.reduce(
        (sum: number, item: any) => sum + Number(item.amount || 0),
        0
      );

      const transactionVolume = transactions.reduce(
        (sum: number, item: any) => sum + Number(item.amount || 0),
        0
      );

      return res.status(200).json({
        success: true,
        data: {
          totalCustomers: customers.length,
          activeCustomers: customers.filter((c: any) => c.status === "Active")
            .length,
          totalEmployees: employees.length,
          totalBranches: branches.length,
          totalLoans: loans.length,
          activeLoans: loans.filter((l: any) => l.status === "Active").length,
          totalReports: reports.length,
          totalAuditLogs: auditLogs.length,
          totalBalance: `₹${totalBalance.toLocaleString("en-IN")}`,
          branchBalance: `₹${totalBalance.toLocaleString("en-IN")}`,
          totalLoanAmount: `₹${totalLoanAmount.toLocaleString("en-IN")}`,
          transactionVolume: `₹${transactionVolume.toLocaleString("en-IN")}`,
          aiRiskAlerts: transactions.filter((t: any) =>
            ["High", "Medium", "Flagged"].includes(t.risk || t.status)
          ).length,
          riskDistribution: {
            normal: transactions.filter((t: any) => t.risk === "Normal").length,
            low: transactions.filter((t: any) => t.risk === "Low").length,
            medium: transactions.filter((t: any) => t.risk === "Medium").length,
            high: transactions.filter((t: any) => t.risk === "High").length,
          },
          recentTransactions: transactions.map(formatRecord),
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Dashboard failed",
      });
    }
  });

  return router;
};

module.exports = createCrudRouter;
module.exports.createDashboardRouter = createDashboardRouter;