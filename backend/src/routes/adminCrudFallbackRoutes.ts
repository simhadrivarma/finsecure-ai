// @ts-nocheck
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const waitForDatabase = async () => {
  if (mongoose.connection.readyState === 1) return;

  if (mongoose.connection.asPromise) {
    await mongoose.connection.asPromise();
  }
};

const makeId = (prefix: string) => {
  return `${prefix}${Date.now().toString().slice(-8)}`;
};

const cleanMoney = (value: any) => {
  if (value === undefined || value === null || value === "") return 0;

  const numberValue = Number(
    String(value).replace(/₹/g, "").replace(/,/g, "").trim()
  );

  return Number.isNaN(numberValue) ? value : numberValue;
};

const idPrefix: any = {
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
  const data: any = {
    ...oldRecord,
    ...body,
  };

  delete data._id;

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

    data.aadhaarNumber = data.aadhaarNumber || "";
    data.panNumber = data.panNumber ? String(data.panNumber).toUpperCase() : "";

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

  data.updatedAt = new Date();

  if (!data.createdAt) {
    data.createdAt = new Date();
  }

  return data;
};

const formatRecord = (record: any) => {
  const obj = { ...record };

  if (obj._id) {
    obj._id = String(obj._id);
  }

  return {
    ...obj,
    id: obj.id || String(obj._id || ""),
  };
};

const buildIdQuery = (id: string) => {
  const or: any[] = [{ id }, { accountNumber: id }];

  if (mongoose.Types.ObjectId.isValid(id)) {
    or.push({ _id: new mongoose.Types.ObjectId(id) });
  }

  return { $or: or };
};

const getCollection = async (collectionName: string) => {
  await waitForDatabase();

  if (!mongoose.connection.db) {
    throw new Error("MongoDB connection is not ready");
  }

  return mongoose.connection.db.collection(collectionName);
};

const createCrudRouter = (entity: string, collectionName: string) => {
  const router = express.Router();

  router.get("/", async (req: any, res: any) => {
    try {
      const collection = await getCollection(collectionName);

      const rows = await collection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        count: rows.length,
        data: rows.map(formatRecord),
      });
    } catch (error: any) {
      console.error(`${entity} GET failed:`, error);
      return res.status(500).json({
        success: false,
        message: error.message || `Failed to load ${entity}`,
      });
    }
  });

  router.post("/", async (req: any, res: any) => {
    try {
      const collection = await getCollection(collectionName);
      const payload = await normalizeRecord(entity, req.body);

      if (entity === "customer" && !payload.name) {
        return res.status(400).json({
          success: false,
          message: "Customer name is required",
        });
      }

      if (entity === "customer" && !payload.accountNumber) {
        return res.status(400).json({
          success: false,
          message: "Account number is required",
        });
      }

      const inserted = await collection.insertOne(payload);

      const created = await collection.findOne({
        _id: inserted.insertedId,
      });

      return res.status(201).json({
        success: true,
        message: `${entity} created successfully`,
        data: formatRecord(created || payload),
      });
    } catch (error: any) {
      console.error(`${entity} POST failed:`, error);
      return res.status(500).json({
        success: false,
        message: error.message || `Failed to create ${entity}`,
      });
    }
  });

  router.get("/:id", async (req: any, res: any) => {
    try {
      const collection = await getCollection(collectionName);

      const record = await collection.findOne(buildIdQuery(req.params.id));

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
      console.error(`${entity} GET ONE failed:`, error);
      return res.status(500).json({
        success: false,
        message: error.message || `Failed to load ${entity}`,
      });
    }
  });

  router.put("/:id", async (req: any, res: any) => {
    try {
      const collection = await getCollection(collectionName);

      const existing = await collection.findOne(buildIdQuery(req.params.id));

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: `${entity} not found`,
        });
      }

      const payload = await normalizeRecord(entity, req.body, existing);

      await collection.updateOne(buildIdQuery(req.params.id), {
        $set: payload,
      });

      const updated = await collection.findOne(buildIdQuery(req.params.id));

      return res.status(200).json({
        success: true,
        message: `${entity} updated successfully`,
        data: formatRecord(updated || payload),
      });
    } catch (error: any) {
      console.error(`${entity} PUT failed:`, error);
      return res.status(500).json({
        success: false,
        message: error.message || `Failed to update ${entity}`,
      });
    }
  });

  router.delete("/", async (req: any, res: any) => {
    try {
      const collection = await getCollection(collectionName);

      await collection.deleteMany({});

      return res.status(200).json({
        success: true,
        message: `${entity} records cleared successfully`,
      });
    } catch (error: any) {
      console.error(`${entity} DELETE ALL failed:`, error);
      return res.status(500).json({
        success: false,
        message: error.message || `Failed to clear ${entity}`,
      });
    }
  });

  router.delete("/:id", async (req: any, res: any) => {
    try {
      const collection = await getCollection(collectionName);

      const result = await collection.deleteOne(buildIdQuery(req.params.id));

      if (!result.deletedCount) {
        return res.status(404).json({
          success: false,
          message: `${entity} not found`,
        });
      }

      return res.status(200).json({
        success: true,
        message: `${entity} deleted successfully`,
      });
    } catch (error: any) {
      console.error(`${entity} DELETE failed:`, error);
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

  router.get("/", async (req: any, res: any) => {
    try {
      const customersCollection = await getCollection("customers");
      const employeesCollection = await getCollection("employees");
      const branchesCollection = await getCollection("branches");
      const loansCollection = await getCollection("loans");
      const transactionsCollection = await getCollection("admintransactions");
      const reportsCollection = await getCollection("reports");
      const auditLogsCollection = await getCollection("auditlogs");

      const [
        customers,
        employees,
        branches,
        loans,
        transactions,
        reports,
        auditLogs,
      ] = await Promise.all([
        customersCollection.find({}).toArray(),
        employeesCollection.find({}).toArray(),
        branchesCollection.find({}).toArray(),
        loansCollection.find({}).toArray(),
        transactionsCollection.find({}).sort({ createdAt: -1 }).limit(5).toArray(),
        reportsCollection.find({}).toArray(),
        auditLogsCollection.find({}).toArray(),
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
          activeCustomers: customers.filter((c: any) => c.status === "Active").length,
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
      console.error("dashboard GET failed:", error);
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