import React, { useEffect, useMemo, useState } from "react";

const rawApiBaseUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://finsecure-ai-backend.vercel.app";

const API_BASE_URL = String(rawApiBaseUrl).includes("onrender.com")
  ? "https://finsecure-ai-backend.vercel.app"
  : String(rawApiBaseUrl || "https://finsecure-ai-backend.vercel.app").replace(/\/$/, "");

const API = {
  admin: `${API_BASE_URL}/api/admins`,
  auditLog: `${API_BASE_URL}/api/audit-logs`,
  employee: `${API_BASE_URL}/api/employees`,
  branch: `${API_BASE_URL}/api/branches`,
  customer: `${API_BASE_URL}/api/customers`,
  loan: `${API_BASE_URL}/api/loans`,
  transaction: `${API_BASE_URL}/api/admin-transactions`,
  dashboard: `${API_BASE_URL}/api/dashboard`,
  report: `${API_BASE_URL}/api/reports`,
  login: `${API_BASE_URL}/api/auth/login`,
  profile: `${API_BASE_URL}/api/auth/profile`,
  changePassword: `${API_BASE_URL}/api/auth/change-password`,
};

const todayDate = new Date().toISOString().slice(0, 10);

const readJsonFromLocalStorage = (key) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const getStoredToken = () => {
  return (
    localStorage.getItem("finsecure_token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    ""
  );
};

const getStoredAdmin = () => {
  const keys = [
    "finsecure_admin",
    "admin",
    "adminData",
    "loggedInAdmin",
    "currentUser",
    "user",
  ];

  for (const key of keys) {
    const value = readJsonFromLocalStorage(key);
    if (value && typeof value === "object") {
      return value;
    }
  }

  return null;
};

const normalizeAdminRole = (role) => {
  const value = String(role || "").trim();
  const lower = value.toLowerCase();

  if (!value || lower === "admin" || lower === "superadmin") {
    return "Super Admin";
  }

  return value;
};

const buildAdminSession = (adminData) => {
  const rawRole =
    adminData?.role ||
    localStorage.getItem("role") ||
    localStorage.getItem("userRole") ||
    "Super Admin";

  return {
    ...adminData,
    role: normalizeAdminRole(rawRole),
    name: adminData?.name || "FinSecure Super Admin",
    email: adminData?.email || "admin@finsecure.ai",
  };
};

const saveAdminSession = (adminData, token) => {
  const safeAdmin = buildAdminSession(adminData || {});
  const safeToken = token || getStoredToken();

  localStorage.setItem("finsecure_admin", JSON.stringify(safeAdmin));
  localStorage.setItem("admin", JSON.stringify(safeAdmin));
  localStorage.setItem("adminData", JSON.stringify(safeAdmin));
  localStorage.setItem("loggedInAdmin", JSON.stringify(safeAdmin));
  localStorage.setItem("currentUser", JSON.stringify(safeAdmin));
  localStorage.setItem("user", JSON.stringify(safeAdmin));

  localStorage.setItem("finsecure_token", safeToken);
  localStorage.setItem("adminToken", safeToken);
  localStorage.setItem("authToken", safeToken);
  localStorage.setItem("accessToken", safeToken);
  localStorage.setItem("token", safeToken);

  localStorage.setItem("role", safeAdmin.role);
  localStorage.setItem("userRole", safeAdmin.role);
  localStorage.setItem("adminLoggedIn", "true");
  localStorage.setItem("isAuthenticated", "true");
  localStorage.setItem("isLoggedIn", "true");

  return safeAdmin;
};

const clearAdminSession = () => {
  [
    "finsecure_admin",
    "admin",
    "adminData",
    "loggedInAdmin",
    "currentUser",
    "user",
    "finsecure_token",
    "adminToken",
    "authToken",
    "accessToken",
    "token",
    "role",
    "userRole",
    "adminLoggedIn",
    "isAuthenticated",
    "isLoggedIn",
  ].forEach((key) => localStorage.removeItem(key));
};

const isAuthOrPermissionError = (response) => {
  return response.status === 401 || response.status === 403;
};


const getAuthHeaders = () => {
  const token = getStoredToken();

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: "🏦" },
  { key: "admin", label: "Admins", icon: "🛡️" },
  { key: "auditLog", label: "Audit Logs", icon: "📜" },
  { key: "employee", label: "Employees", icon: "👨‍💼" },
  { key: "branch", label: "Branches", icon: "🏢" },
  { key: "customer", label: "Customers", icon: "👥" },
  { key: "loan", label: "Loans", icon: "💰" },
  { key: "transaction", label: "Transactions", icon: "🔁" },
  { key: "ai", label: "AI Insights", icon: "🤖" },
  { key: "report", label: "Reports", icon: "📊" },
  { key: "settings", label: "Basic Settings", icon: "⚙️" },
];

const roleAccess = {
  "Super Admin": [
    "dashboard",
    "admin",
    "auditLog",
    "employee",
    "branch",
    "customer",
    "loan",
    "transaction",
    "ai",
    "report",
    "settings",
  ],
  "Branch Manager": [
    "dashboard",
    "branch",
    "customer",
    "loan",
    "report",
    "settings",
  ],
  "Loan Officer": ["dashboard", "customer", "loan", "settings"],
  "Fraud Analyst": ["dashboard", "transaction", "ai", "settings"],
  "Customer Support": ["dashboard", "customer", "settings"],
  "Report Analyst": ["dashboard", "report", "settings"],
};

const adminRoles = [
  "Super Admin",
  "Branch Manager",
  "Loan Officer",
  "Fraud Analyst",
  "Customer Support",
  "Report Analyst",
];

const configs = {
  admin: {
    title: "Admin",
    pageTitle: "Admin Management",
    buttonText: "Add Admin",
    api: API.admin,
    columns: [
      ["id", "Admin ID"],
      ["name", "Name"],
      ["email", "Email"],
      ["role", "Role"],
      ["status", "Status"],
    ],
    fields: [
      { name: "name", label: "Admin Name", required: true },
      { name: "email", label: "Email", required: true },
      {
        name: "password",
        label: "Password",
        type: "password",
        requiredOnAdd: true,
        placeholder: "Leave empty while editing if unchanged",
      },
      {
        name: "role",
        label: "Role",
        type: "select",
        required: true,
        defaultValue: "Branch Manager",
        options: adminRoles,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        defaultValue: "Active",
        options: ["Active", "Inactive"],
      },
    ],
  },

  auditLog: {
    title: "Audit Log",
    pageTitle: "Audit Logs",
    buttonText: "",
    api: API.auditLog,
    columns: [],
    fields: [],
  },

  employee: {
    title: "Employee",
    pageTitle: "Employee Management",
    buttonText: "Add Employee",
    api: API.employee,
    columns: [
      ["id", "Employee ID"],
      ["name", "Name"],
      ["role", "Role"],
      ["branch", "Branch"],
      ["ifsc", "IFSC"],
      ["joiningDate", "Joining Date"],
      ["customers", "Customers"],
      ["status", "Status"],
    ],
    fields: [
      { name: "name", label: "Employee Name", required: true },
      {
        name: "role",
        label: "Role",
        type: "select",
        required: true,
        options: [
          "Branch Manager",
          "Loan Officer",
          "Customer Support Executive",
          "Cashier",
          "Relationship Manager",
          "Admin Officer",
          "Fraud Analyst",
        ],
      },
      
      { name: "email", label: "Email", required: true },
      { name: "phone", label: "Phone Number", required: true },
      { name: "joiningDate", label: "Date of Joining" },
      {
        name: "branch",
        label: "Branch Name",
        type: "branchSelect",
        required: true,
      },
      { name: "ifsc", label: "IFSC Code", required: true },
      {
        name: "customers",
        label: "Customers Managed",
        type: "number",
        defaultValue: 0,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        defaultValue: "Active",
        options: ["Active", "Inactive"],
      },
    ],
  },

  branch: {
    title: "Branch",
    pageTitle: "Branch Management",
    buttonText: "Add Branch",
    api: API.branch,
    columns: [
      ["id", "Branch ID"],
      ["name", "Branch Name"],
      ["address", "Address"],
      ["ifsc", "IFSC Code"],
      ["manager", "Manager"],
      ["employees", "Employees"],
      ["customers", "Customers"],
      ["balance", "Total Balance"],
      ["loans", "Total Loans"],
      ["status", "Status"],
    ],
    fields: [
      { name: "name", label: "Branch Name", required: true },
      { name: "address", label: "Branch Address", required: true },
      { name: "ifsc", label: "IFSC Code", required: true },
      { name: "manager", label: "Branch Manager", required: true },
      { name: "employees", label: "Employees", type: "number", defaultValue: 0 },
      { name: "customers", label: "Customers", type: "number", defaultValue: 0 },
      { name: "balance", label: "Total Balance", defaultValue: "₹0" },
      { name: "loans", label: "Total Loans", defaultValue: "₹0" },
      {
        name: "status",
        label: "Status",
        type: "select",
        defaultValue: "Active",
        options: ["Active", "Inactive"],
      },
    ],
  },

  customer: {
    title: "Customer",
    pageTitle: "Customer Management",
    buttonText: "Add Customer",
    api: API.customer,
    columns: [
      ["id", "Customer ID"],
      ["name", "Name"],
      ["accountNumber", "Account Number"],
      ["accountType", "Account Type"],
      ["ifsc", "IFSC"],
      ["cif", "CIF"],
      ["balance", "Balance"],
      ["branch", "Branch"],
      ["kyc", "KYC"],
      ["status", "Status"],
    ],
    fields: [
      { name: "name", label: "Customer Name", required: true },
      { name: "email", label: "Email" },
      { name: "phone", label: "Phone Number" },
      { name: "accountNumber", label: "Account Number", required: true },
      {
        name: "accountType",
        label: "Account Type",
        type: "select",
        required: true,
        options: [
          "Savings Account",
          "Current Account",
          "Salary Account",
          "Fixed Deposit Account",
          "Loan Account",
        ],
      },
      { name: "ifsc", label: "IFSC Code", required: true },
      { name: "cif", label: "CIF Number", required: true },
      { name: "balance", label: "Balance", defaultValue: "₹0" },
      {
  name: "branch",
  label: "Branch Name",
  type: "branchSelect",
  required: true,
},
      { name: "employee", label: "Assigned Employee" },
      {
        name: "kyc",
        label: "KYC",
        type: "select",
        defaultValue: "Pending",
        options: ["Verified", "Pending", "Rejected"],
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        defaultValue: "Active",
        options: ["Active", "Inactive", "Review", "Blocked"],
      },
    ],
  },

  loan: {
    title: "Loan",
    pageTitle: "Loan Management",
    buttonText: "Add Loan",
    api: API.loan,
    columns: [
      ["id", "Loan ID"],
      ["customer", "Customer"],
      ["accountNumber", "Account Number"],
      ["type", "Loan Type"],
      ["amount", "Amount"],
      ["interest", "Interest"],
      ["startDate", "Start Date"],
      ["endDate", "End Date"],
      ["emi", "EMI"],
      ["paid", "Paid"],
      ["pending", "Pending"],
      ["status", "Status"],
    ],
    fields: [
      { name: "customer", label: "Customer Name", required: true },
      { name: "accountNumber", label: "Account Number", required: true },
      {
        name: "type",
        label: "Loan Type",
        type: "select",
        required: true,
        options: [
          "Home Loan",
          "Business Loan",
          "Personal Loan",
          "Vehicle Loan",
          "Education Loan",
          "Gold Loan",
        ],
      },
      { name: "amount", label: "Loan Amount", required: true },
      { name: "interest", label: "Interest Rate", required: true },
      { name: "startDate", label: "Start Date", required: true },
      { name: "endDate", label: "End Date", required: true },
      { name: "emi", label: "Monthly EMI", defaultValue: "₹0" },
      { name: "paid", label: "Paid Amount", defaultValue: "₹0" },
      { name: "pending", label: "Pending Amount", defaultValue: "₹0" },
      { name: "officer", label: "Loan Officer" },
      {
        name: "status",
        label: "Status",
        type: "select",
        defaultValue: "Active",
        options: ["Active", "Closed", "Review", "Defaulted"],
      },
    ],
  },

  transaction: {
    title: "Transaction",
    pageTitle: "Transactions",
    buttonText: "Add Transaction",
    api: API.transaction,
    columns: [
      ["id", "Transaction ID"],
      ["customer", "Customer"],
      ["accountNumber", "Account Number"],
      ["type", "Type"],
      ["amount", "Amount"],
      ["date", "Date"],
      ["time", "Time"],
      ["ref", "Reference"],
      ["status", "Status"],
      ["risk", "AI Risk"],
      ["riskScore", "Risk Score"],
    ],
    fields: [
      { name: "customer", label: "Customer Name", required: true },
      { name: "accountNumber", label: "Account Number", required: true },
      {
        name: "type",
        label: "Transaction Type",
        type: "select",
        required: true,
        options: [
          "UPI Payment",
          "NEFT",
          "RTGS",
          "IMPS",
          "EMI Payment",
          "Cash Deposit",
          "Cash Withdrawal",
          "Card Payment",
        ],
      },
      { name: "amount", label: "Amount", required: true },
      { name: "date", label: "Date", required: true },
      { name: "time", label: "Time", required: true },
      { name: "ref", label: "Reference Number", defaultValue: "" },
      {
        name: "status",
        label: "Status",
        type: "select",
        defaultValue: "Success",
        options: ["Success", "Pending", "Failed", "Flagged"],
      },
      {
        name: "risk",
        label: "Risk",
        type: "select",
        defaultValue: "Normal",
        options: ["Normal", "Low", "Medium", "High"],
      },
    ],
  },

  report: {
    title: "Report",
    pageTitle: "Reports",
    buttonText: "Generate Report",
    api: API.report,
    columns: [
      ["id", "Report ID"],
      ["title", "Title"],
      ["type", "Type"],
      ["totalRecords", "Records"],
      ["generatedBy", "Generated By"],
      ["generatedDate", "Generated Date"],
      ["status", "Status"],
    ],
    fields: [
      { name: "title", label: "Report Title", required: true },
      {
        name: "type",
        label: "Report Type",
        type: "select",
        required: true,
        options: [
          "Employee",
          "Branch",
          "Customer",
          "Loan",
          "Transaction",
          "AI Risk",
          "Monthly Financial",
        ],
      },
      {
        name: "totalRecords",
        label: "Total Records",
        type: "number",
        defaultValue: 0,
      },
      { name: "generatedBy", label: "Generated By", defaultValue: "Admin" },
      { name: "generatedDate", label: "Generated Date", defaultValue: todayDate },
      {
        name: "status",
        label: "Status",
        type: "select",
        defaultValue: "Ready",
        options: ["Ready", "Review", "Pending", "Archived"],
      },
    ],
  },
};

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("admin@finsecure.ai");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await fetch(API.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Login failed");
      }

      const adminData = result.user || result.data;
      const token = result.token;

      if (!adminData || !token) {
        throw new Error("Invalid admin login response from backend");
      }

      const savedAdmin = saveAdminSession(adminData, token);
      onLogin(savedAdmin, token);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={login}>
        <div className="login-logo">F</div>

        <h1>FinSecure AI</h1>
        <p>Admin Banking Panel Login</p>

        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <div className="error-box">{error}</div>}

        <button className="primary-btn" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <small>Only Super Admin can create new admin accounts.</small>
      </form>
    </div>
  );
}

function Badge({ value }) {
  const text = String(value || "Normal");
  const lower = text.toLowerCase();

  let type = "normal";

  if (
    ["active", "success", "verified", "ready", "normal", "closed"].includes(
      lower
    )
  ) {
    type = "good";
  }

  if (["pending", "review", "medium", "low"].includes(lower)) {
    type = "warn";
  }

  if (
    [
      "inactive",
      "flagged",
      "high",
      "blocked",
      "rejected",
      "defaulted",
      "failed",
    ].includes(lower)
  ) {
    type = "bad";
  }

  return <span className={`badge ${type}`}>{text}</span>;
}

function Dashboard({ dashboardData, counts }) {
  const riskDistribution = dashboardData.riskDistribution || {
    normal: 0,
    low: 0,
    medium: 0,
    high: 0,
  };

  const recentTransactions = dashboardData.recentTransactions || [];

  const maxRiskValue = Math.max(
    riskDistribution.normal || 0,
    riskDistribution.low || 0,
    riskDistribution.medium || 0,
    riskDistribution.high || 0,
    1
  );

  const cards = [
    [
      "Total Admins",
      dashboardData.totalAdmins || counts.admin,
      "Admin user accounts",
      "🛡️",
    ],
    [
      "Total Customers",
      dashboardData.totalCustomers || counts.customer,
      `${dashboardData.activeCustomers || 0} active customers`,
      "👥",
    ],
    [
      "Total Employees",
      dashboardData.totalEmployees || counts.employee,
      "Banking staff records",
      "👨‍💼",
    ],
    [
      "Total Branches",
      dashboardData.totalBranches || counts.branch,
      "Operational branches",
      "🏢",
    ],
    [
      "Total Loans",
      dashboardData.totalLoans || counts.loan,
      `${dashboardData.activeLoans || 0} active loans`,
      "💰",
    ],
    [
      "AI Risk Alerts",
      dashboardData.aiRiskAlerts || 0,
      "High / medium / flagged alerts",
      "🤖",
    ],
  ];

  const moneyCards = [
    [
      "Customer Balance",
      dashboardData.totalBalance || "₹0",
      "Total customer balance",
    ],
    [
      "Branch Balance",
      dashboardData.branchBalance || "₹0",
      "Total branch balance",
    ],
    ["Loan Amount", dashboardData.totalLoanAmount || "₹0", "Total loan value"],
    [
      "Transaction Volume",
      dashboardData.transactionVolume || "₹0",
      "Total transaction value",
    ],
  ];

  const riskBars = [
    ["Normal", riskDistribution.normal || 0],
    ["Low", riskDistribution.low || 0],
    ["Medium", riskDistribution.medium || 0],
    ["High", riskDistribution.high || 0],
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>
            Real-time overview of admins, branches, customers, loans,
            transactions and AI banking risks.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        {cards.map(([title, value, subtitle, icon]) => (
          <div className="stat-card" key={title}>
            <div className="stat-icon">{icon}</div>
            <div>
              <p>{title}</p>
              <h2>{value}</h2>
              <span>{subtitle}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="money-grid">
        {moneyCards.map(([title, value, subtitle]) => (
          <div className="money-card" key={title}>
            <p>{title}</p>
            <h2>{value}</h2>
            <span>{subtitle}</span>
          </div>
        ))}
      </div>

      <div className="two-grid">
        <div className="panel">
          <h3>AI Risk Distribution</h3>

          <div className="risk-bars">
            {riskBars.map(([label, value]) => (
              <div className="risk-row" key={label}>
                <div className="risk-row-top">
                  <strong>{label}</strong>
                  <span>{value}</span>
                </div>

                <div className="risk-track">
                  <div
                    className={`risk-fill ${String(label).toLowerCase()}`}
                    style={{
                      width: `${Math.max(
                        (Number(value) / maxRiskValue) * 100,
                        4
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Recent Transactions</h3>

          <div className="activity-list">
            {recentTransactions.length === 0 ? (
              <div>No recent transactions found.</div>
            ) : (
              recentTransactions.map((item) => (
                <div key={item.id}>
                  <strong>{item.customer}</strong>
                  <p>
                    {item.type} • {item.amount} • {item.date} {item.time}
                  </p>
                  <Badge value={item.risk} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="two-grid dashboard-bottom">
        <div className="panel">
          <h3>Security Summary</h3>

          <div className="activity-list">
            <div>
              <strong>Audit Logs</strong>
              <p>
                {dashboardData.totalAuditLogs || counts.auditLog} security
                action records saved.
              </p>
            </div>

            <div>
              <strong>Reports</strong>
              <p>
                {dashboardData.totalReports || counts.report} reports generated.
              </p>
            </div>

            <div>
              <strong>Risk Alerts</strong>
              <p>{dashboardData.aiRiskAlerts || 0} alerts need manual review.</p>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Banking AI Status</h3>

          <div className="activity-list">
            <div>
              <strong>Risk Scoring Active</strong>
              <p>Transactions are checked by amount, status, type and time.</p>
            </div>

            <div>
              <strong>Role Security Active</strong>
              <p>Pages are protected by admin role permissions.</p>
            </div>

            <div>
              <strong>Audit Monitoring Active</strong>
              <p>Admin actions are tracked automatically.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function EntityModal({ config, mode, item, onClose, onSave, branches = [] }) {
  const createEmpty = () => {
    const obj = {};

    config.fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        obj[field.name] = field.defaultValue;
      } else if (field.type === "number") {
        obj[field.name] = 0;
      } else if (field.type === "select") {
        obj[field.name] = field.options[0];
      } else {
        obj[field.name] = "";
      }
    });

    return obj;
  };

  const [form, setForm] = useState(item || createEmpty());
  const [formError, setFormError] = useState("");
  const viewOnly = mode === "view";
  const branchOptions = Array.isArray(branches) ? branches : [];

  const getBranchName = (branch) => {
    return branch?.name || branch?.branchName || branch?.title || "";
  };

  const getBranchIfsc = (branch) => {
    return branch?.ifsc || branch?.ifscCode || "";
  };

  const handleBranchSelect = (branchName) => {
    const selectedBranch = branchOptions.find(
      (branch) => getBranchName(branch) === branchName
    );

    setForm({
      ...form,
      branch: branchName,
      ifsc: getBranchIfsc(selectedBranch) || form.ifsc || "",
    });
  };


  const getInputType = (field) => {
    if (field.type) return field.type;

    const name = String(field.name || "").toLowerCase();

    if (name.includes("email")) return "email";
    if (name.includes("phone")) return "tel";

    if (
      name.includes("date") ||
      ["joiningdate", "startdate", "enddate", "generateddate"].includes(name)
    ) {
      return "date";
    }

    if (name === "time") return "time";

    return "text";
  };

  const getPlaceholder = (field) => {
    if (field.placeholder) return field.placeholder;
    if (field.name === "ifsc") return "Example: FINS0001001";
    if (field.name === "phone") return "10 digit mobile number";
    if (field.name === "accountNumber") return "9 to 18 digit account number";
    return "";
  };

  const normalizeMoney = (value) => {
    const clean = String(value || "")
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .trim();

    if (clean === "") return "";

    const numberValue = Number(clean);

    if (Number.isNaN(numberValue)) return value;

    return `₹${numberValue.toLocaleString("en-IN")}`;
  };

  const validateForm = () => {
    for (const field of config.fields) {
      const value = form[field.name];
      const required = field.required || (mode === "add" && field.requiredOnAdd);

      if (required && !String(value || "").trim()) {
        return `Please fill ${field.label}`;
      }
    }

    for (const field of config.fields) {
      const key = String(field.name || "").toLowerCase();
      const value = String(form[field.name] || "").trim();

      if (!value) continue;

      if (key.includes("email")) {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        if (!ok) return "Please enter a valid email address";
      }

      if (key.includes("phone")) {
        const digits = value.replace(/\D/g, "");
        if (digits.length !== 10) {
          return "Phone number must be exactly 10 digits";
        }
      }

      if (key === "accountnumber") {
        const digits = value.replace(/\D/g, "");
        if (digits.length < 9 || digits.length > 18) {
          return "Account number must be 9 to 18 digits";
        }
      }

      if (key === "ifsc") {
        const ok = /^FINS0[A-Z0-9]{6}$/.test(value.toUpperCase());
        if (!ok) return "IFSC code must be like FINS0001001";
      }

      if (key === "cif") {
        const ok = /^[A-Z0-9]{6,20}$/i.test(value);
        if (!ok) return "CIF number must be 6 to 20 letters/numbers";
      }

      if (key === "password" && mode === "add" && value.length < 6) {
        return "Password must be at least 6 characters";
      }

      if (key === "password" && mode === "edit" && value && value.length < 6) {
        return "Password must be at least 6 characters";
      }

      if (
        ["amount", "balance", "emi", "paid", "pending", "loans"].includes(key)
      ) {
        const clean = value.replace(/₹/g, "").replace(/,/g, "").trim();

        if (clean && Number.isNaN(Number(clean))) {
          return `${field.label} must be a valid number`;
        }

        if (key === "amount" && Number(clean) <= 0) {
          return "Amount must be greater than 0";
        }
      }
    }

    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);

      if (end < start) {
        return "End date cannot be before start date";
      }
    }

    return "";
  };

  const submit = (event) => {
    event.preventDefault();
    setFormError("");

    const error = validateForm();

    if (error) {
      setFormError(error);
      return;
    }

    const cleanedForm = { ...form };

    if (mode === "edit" && cleanedForm.password === "") {
      delete cleanedForm.password;
    }

    ["amount", "balance", "emi", "paid", "pending", "loans"].forEach((key) => {
      if (cleanedForm[key] !== undefined && cleanedForm[key] !== "") {
        cleanedForm[key] = normalizeMoney(cleanedForm[key]);
      }
    });

    if (cleanedForm.ifsc) {
      cleanedForm.ifsc = String(cleanedForm.ifsc).toUpperCase().trim();
    }

    if (cleanedForm.cif) {
      cleanedForm.cif = String(cleanedForm.cif).toUpperCase().trim();
    }

    if (cleanedForm.email) {
      cleanedForm.email = String(cleanedForm.email).toLowerCase().trim();
    }

    if (cleanedForm.phone) {
      cleanedForm.phone = String(cleanedForm.phone).replace(/\D/g, "");
    }

    if (cleanedForm.accountNumber) {
      cleanedForm.accountNumber = String(cleanedForm.accountNumber).replace(
        /\D/g,
        ""
      );
    }

    onSave(cleanedForm);
  };

  const getTitleValue = () => {
    return (
      item?.name ||
      item?.customer ||
      item?.title ||
      item?.branch ||
      item?.manager ||
      item?.id ||
      config.title
    );
  };

  const getSubtitleValue = () => {
    return (
      item?.email ||
      item?.accountNumber ||
      item?.ifsc ||
      item?.role ||
      item?.type ||
      item?.status ||
      "FinSecure AI Record"
    );
  };

  const getIcon = () => {
    const title = String(config.title || "").toLowerCase();

    if (title.includes("customer")) return "👤";
    if (title.includes("loan")) return "💰";
    if (title.includes("transaction")) return "🔁";
    if (title.includes("admin")) return "🛡️";
    if (title.includes("employee")) return "👨‍💼";
    if (title.includes("branch")) return "🏢";
    if (title.includes("report")) return "📊";

    return "🏦";
  };

  const getDetailRows = () => {
    const rows = [];

    if (item?.id) {
      rows.push(["id", "Record ID"]);
    }

    config.columns.forEach(([key, label]) => {
      if (!rows.some(([existingKey]) => existingKey === key)) {
        rows.push([key, label]);
      }
    });

    config.fields.forEach((field) => {
      if (!rows.some(([existingKey]) => existingKey === field.name)) {
        rows.push([field.name, field.label]);
      }
    });

    return rows.filter(([key]) => key !== "password");
  };

  const renderDetailValue = (key) => {
    const value = item?.[key];

    if (value === undefined || value === null || value === "") {
      return "-";
    }

    if (["status", "kyc", "risk"].includes(key)) {
      return <Badge value={value} />;
    }

    return String(value);
  };

  if (viewOnly) {
    return (
      <div className="modal-bg">
        <div className="modal detail-modal">
          <div className="modal-top">
            <div>
              <h2>View {config.title}</h2>
              <p>Professional banking record details</p>
            </div>

            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="detail-hero">
            <div className="detail-icon">{getIcon()}</div>

            <div>
              <h2>{getTitleValue()}</h2>
              <p>{getSubtitleValue()}</p>
            </div>
          </div>

          <div className="detail-section-title">Record Information</div>

          <div className="detail-grid">
            {getDetailRows().map(([key, label]) => (
              <div className="detail-item" key={key}>
                <span className="detail-label">{label}</span>
                <strong className="detail-value">{renderDetailValue(key)}</strong>
              </div>
            ))}
          </div>

          <div className="detail-actions">
            <button className="secondary-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-bg">
      <div className="modal">
        <div className="modal-top">
          <div>
            <h2>{mode === "add" ? `Add ${config.title}` : `Edit ${config.title}`}</h2>
            <p>{config.title} details</p>
          </div>

          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {formError && <div className="error-box form-error">{formError}</div>}

        <form className="form-grid" onSubmit={submit}>
          {mode !== "add" && (
            <label>
              ID
              <input value={form.id || ""} disabled />
            </label>
          )}

          {config.fields.map((field) => {
            const inputType = getInputType(field);

            return (
              <label key={field.name}>
                {field.label}
                {field.required || (mode === "add" && field.requiredOnAdd)
                  ? " *"
                  : ""}

                {field.type === "branchSelect" ? (
                  <select
                    value={form[field.name] || ""}
                    onChange={(e) => handleBranchSelect(e.target.value)}
                    disabled={viewOnly}
                  >
                    <option value="">Select Branch</option>

                    {branchOptions.map((branch) => {
                      const branchName = getBranchName(branch);
                      const branchIfsc = getBranchIfsc(branch);

                      if (!branchName) return null;

                      return (
                        <option
                          key={branch._id || branch.id || branchName}
                          value={branchName}
                        >
                          {branchName}
                          {branchIfsc ? ` - ${branchIfsc}` : ""}
                        </option>
                      );
                    })}
                  </select>
                ) : field.type === "select" ? (
                  <select
                    value={form[field.name] || ""}
                    onChange={(e) =>
                      setForm({ ...form, [field.name]: e.target.value })
                    }
                  >
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={inputType}
                    value={form[field.name] ?? ""}
                    placeholder={getPlaceholder(field)}
                    onChange={(e) => {
                      let value = e.target.value;

                      if (field.type === "number") {
                        value = Number(value);
                      }

                      if (field.name === "ifsc" || field.name === "cif") {
                        value = value.toUpperCase();
                      }

                      setForm({ ...form, [field.name]: value });
                    }}
                  />
                )}
              </label>
            );
          })}

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>

            <button className="primary-btn">Save {config.title}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProfileModal({ admin, onClose, onSave }) {
  const [name, setName] = useState(admin?.name || "");
  const [email, setEmail] = useState(admin?.email || "");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();

    if (!name.trim() || !email.trim()) {
      alert("Name and email are required");
      return;
    }

    setLoading(true);
    await onSave({ name, email });
    setLoading(false);
  };

  return (
    <div className="modal-bg">
      <div className="modal small-modal">
        <div className="modal-top">
          <div>
            <h2>Profile Settings</h2>
            <p>Update your admin name and email.</p>
          </div>

          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="single-form" onSubmit={submit}>
          <label>
            Admin Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>

            <button className="primary-btn" disabled={loading}>
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordModal({ onClose, onSave }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Please fill all password fields");
      return;
    }

    if (newPassword.length < 6) {
      alert("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match");
      return;
    }

    setLoading(true);
    await onSave({ currentPassword, newPassword });
    setLoading(false);
  };

  return (
    <div className="modal-bg">
      <div className="modal small-modal">
        <div className="modal-top">
          <div>
            <h2>Change Password</h2>
            <p>Update your login password securely.</p>
          </div>

          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="single-form" onSubmit={submit}>
          <label>
            Current Password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>

          <label>
            New Password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>

          <label>
            Confirm New Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>

            <button className="primary-btn" disabled={loading}>
              {loading ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function EntityTable(props) {
  const {
    config = {},
    loading = false,
    onView,
    onEdit,
    onDelete,
  } = props;

  const tableData =
    Array.isArray(props.data)
      ? props.data
      : Array.isArray(props.rows)
      ? props.rows
      : Array.isArray(props.items)
      ? props.items
      : [];

  const columns = Array.isArray(config.columns) ? config.columns : [];
  const title = config.title || "Records";

  const getCellValue = (item, key) => {
    const value = item?.[key];

    if (value === undefined || value === null || value === "") {
      return "-";
    }

    if (Array.isArray(value)) {
      return value.length ? value.join(", ") : "-";
    }

    return String(value);
  };

  const shouldShowBadge = (key) => {
    return ["status", "kyc", "risk"].includes(String(key).toLowerCase());
  };

  const renderCell = (item, key) => {
    const value = getCellValue(item, key);

    if (shouldShowBadge(key) && value !== "-" && typeof Badge === "function") {
      return <Badge value={value} />;
    }

    return <span className="table-cell-text">{value}</span>;
  };

  if (loading) {
    return (
      <div className="table-shell polished-table-shell">
        <div className="table-loading-state">
          <div className="loader-orb"></div>
          <h3>Loading {title}</h3>
          <p>Please wait while FinSecure AI fetches secure banking records.</p>

          <div className="skeleton-table">
            {[1, 2, 3, 4].map((row) => (
              <div className="skeleton-row" key={row}>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-shell polished-table-shell">
      <div className="table-scroll">
        <table className="data-table polished-data-table">
          <thead>
            <tr>
              {columns.map(([key, label]) => (
                <th key={key}>{label}</th>
              ))}

              <th className="actions-head">Actions</th>
            </tr>
          </thead>

          <tbody>
            {tableData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1}>
                  <div className="empty-state-box">
                    <div className="empty-state-icon">🏦</div>
                    <h3>No {title} Found</h3>
                    <p>
                      There are no records available right now. Add a new record
                      or clear filters to view banking data.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              tableData.map((item, index) => (
                <tr key={item.id || item._id || index}>
                  {columns.map(([key]) => (
                    <td key={key}>{renderCell(item, key)}</td>
                  ))}

                  <td>
                    <div className="table-actions">
                      {onView && (
                        <button
                          type="button"
                          className="action-btn view-action"
                          onClick={() => onView(item)}
                        >
                          View
                        </button>
                      )}

                      {onEdit && (
                        <button
                          type="button"
                          className="action-btn edit-action"
                          onClick={() => onEdit(item)}
                        >
                          Edit
                        </button>
                      )}

                      {onDelete && (
                        <button
                          type="button"
                          className="action-btn delete-action"
                          onClick={() => onDelete(item)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EntityPage({
  config,
  rows,
  search,
  loading,
  filters,
  setFilters,
  onAdd,
  onView,
  onEdit,
  onDelete,
}) {
  const filterableKeys = [
    "status",
    "role",
    "branch",
    "kyc",
    "risk",
    "type",
    "accountType",
  ];

  const filterFields = config.columns.filter(([key]) =>
    filterableKeys.includes(key)
  );

  const getOptions = (key) => {
    return [
      ...new Set(
        rows
          .map((row) => row[key])
          .filter((value) => value !== undefined && value !== null && value !== "")
          .map((value) => String(value))
      ),
    ].sort();
  };

  const updateFilter = (key, value) => {
    setFilters({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const filteredRows = rows.filter((row) => {
    const searchMatch = JSON.stringify(row)
      .toLowerCase()
      .includes(search.toLowerCase());

    const filterMatch = Object.entries(filters).every(([key, value]) => {
      if (!value) return true;

      return (
        String(row[key] || "").toLowerCase() === String(value).toLowerCase()
      );
    });

    return searchMatch && filterMatch;
  });

  const getFileName = () => {
    return config.pageTitle.replace(/\s+/g, "_").toLowerCase();
  };

  const cleanValue = (value) => {
    if (value === undefined || value === null) return "";
    return String(value).replace(/"/g, '""');
  };

  const exportExcel = () => {
    if (filteredRows.length === 0) {
      alert("No records available to export");
      return;
    }

    const headers = config.columns.map(([, label]) => label);

    const csvRows = [
      headers.join(","),
      ...filteredRows.map((row) =>
        config.columns.map(([key]) => `"${cleanValue(row[key])}"`).join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${getFileName()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPDF = () => {
    if (filteredRows.length === 0) {
      alert("No records available to export");
      return;
    }

    const tableHeaders = config.columns
      .map(([, label]) => `<th>${label}</th>`)
      .join("");

    const tableRows = filteredRows
      .map(
        (row) => `
          <tr>
            ${config.columns
              .map(([key]) => `<td>${cleanValue(row[key])}</td>`)
              .join("")}
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Popup blocked. Please allow popups to export PDF.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${config.pageTitle}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #111827;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 12px;
            }

            th,
            td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              text-align: left;
            }

            th {
              background: #f1f5f9;
            }
          </style>
        </head>

        <body>
          <h1>${config.pageTitle}</h1>
          <p>Generated from FinSecure AI Admin Panel</p>

          <table>
            <thead>
              <tr>${tableHeaders}</tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{config.pageTitle}</h1>
          <p>Manage {config.title.toLowerCase()} records securely.</p>
        </div>

        <div className="button-row">
          <button className="secondary-btn" onClick={exportExcel}>
            Export Excel
          </button>

          <button className="secondary-btn" onClick={exportPDF}>
            Export PDF
          </button>

          {config.buttonText && (
            <button className="primary-btn" onClick={onAdd}>
              {config.buttonText}
            </button>
          )}
        </div>
      </div>

      {filterFields.length > 0 && (
        <div className="filter-card">
          <div className="filter-header">
            <div>
              <h3>Advanced Filters</h3>
              <p>Filter records by status, role, branch, risk or type.</p>
            </div>

            <button className="secondary-btn" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>

          <div className="filter-grid">
            {filterFields.map(([key, label]) => (
              <label key={key}>
                {label}
                <select
                  value={filters[key] || ""}
                  onChange={(e) => updateFilter(key, e.target.value)}
                >
                  <option value="">All {label}</option>

                  {getOptions(key).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="filter-result">
            Showing <strong>{filteredRows.length}</strong> of{" "}
            <strong>{rows.length}</strong> records
          </div>
        </div>
      )}

      <div className="table-card">
        {loading ? (
          <div className="loading-box">Loading from backend...</div>
        ) : (
          <table>
            <thead>
              <tr>
                {config.columns.map(([key, label]) => (
                  <th key={key}>{label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  {config.columns.map(([key]) => (
                    <td key={key}>
                      {["status", "kyc", "risk"].includes(key) ? (
                        <Badge value={row[key]} />
                      ) : (
                        row[key]
                      )}
                    </td>
                  ))}

                  <td>
                    <div className="actions">
                      <button onClick={() => onView(row)}>View</button>
                      <button onClick={() => onEdit(row)}>Edit</button>
                      <button
                        className="danger-btn"
                        onClick={() => onDelete(row)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={config.columns.length + 1}>
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function AuditLogsPage({
  rows,
  search,
  loading,
  filters,
  setFilters,
  onRefresh,
  onClear,
}) {
  const columns = [
    ["id", "Log ID"],
    ["action", "Action"],
    ["module", "Module"],
    ["adminName", "Admin"],
    ["adminEmail", "Email"],
    ["adminRole", "Role"],
    ["description", "Description"],
    ["targetName", "Target"],
    ["status", "Status"],
    ["createdAt", "Date & Time"],
  ];

  const filterFields = [
    ["status", "Status"],
    ["module", "Module"],
    ["action", "Action"],
    ["adminRole", "Admin Role"],
  ];

  const getOptions = (key) => {
    return [
      ...new Set(
        rows
          .map((row) => row[key])
          .filter((value) => value !== undefined && value !== null && value !== "")
          .map((value) => String(value))
      ),
    ].sort();
  };

  const updateFilter = (key, value) => {
    setFilters({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const formatDate = (value) => {
    if (!value) return "-";

    try {
      return new Date(value).toLocaleString("en-IN");
    } catch {
      return value;
    }
  };

  const filteredRows = rows.filter((row) => {
    const searchMatch = JSON.stringify(row)
      .toLowerCase()
      .includes(search.toLowerCase());

    const filterMatch = Object.entries(filters).every(([key, value]) => {
      if (!value) return true;

      return (
        String(row[key] || "").toLowerCase() === String(value).toLowerCase()
      );
    });

    return searchMatch && filterMatch;
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Audit Logs</h1>
          <p>Track admin login, profile, password and management actions.</p>
        </div>

        <div className="button-row">
          <button className="secondary-btn" onClick={onRefresh}>
            Refresh Logs
          </button>

          <button className="danger-main-btn" onClick={onClear}>
            Clear Logs
          </button>
        </div>
      </div>

      <div className="filter-card">
        <div className="filter-header">
          <div>
            <h3>Advanced Filters</h3>
            <p>Filter audit logs by status, module, action or admin role.</p>
          </div>

          <button className="secondary-btn" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>

        <div className="filter-grid">
          {filterFields.map(([key, label]) => (
            <label key={key}>
              {label}
              <select
                value={filters[key] || ""}
                onChange={(e) => updateFilter(key, e.target.value)}
              >
                <option value="">All {label}</option>

                {getOptions(key).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="filter-result">
          Showing <strong>{filteredRows.length}</strong> of{" "}
          <strong>{rows.length}</strong> logs
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="loading-box">Loading audit logs...</div>
        ) : (
          <table>
            <thead>
              <tr>
                {columns.map(([key, label]) => (
                  <th key={key}>{label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.action}</td>
                  <td>{row.module}</td>
                  <td>{row.adminName || "-"}</td>
                  <td>{row.adminEmail || "-"}</td>
                  <td>{row.adminRole || "-"}</td>
                  <td>{row.description}</td>
                  <td>{row.targetName || "-"}</td>
                  <td>
                    <Badge value={row.status} />
                  </td>
                  <td>{formatDate(row.createdAt)}</td>
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan="10">No audit logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function AIInsights({ transactions, onRefresh, onReviewTransactions }) {
  const riskyTransactions = transactions.filter((transaction) => {
    const risk = String(transaction.risk || "").toLowerCase();
    const status = String(transaction.status || "").toLowerCase();

    return (
      risk === "high" ||
      risk === "medium" ||
      status === "flagged" ||
      status === "failed"
    );
  });

  const highRiskTransactions = riskyTransactions.filter(
    (transaction) => String(transaction.risk || "").toLowerCase() === "high"
  );

  const mediumRiskTransactions = riskyTransactions.filter(
    (transaction) => String(transaction.risk || "").toLowerCase() === "medium"
  );

  const flaggedTransactions = riskyTransactions.filter((transaction) =>
    ["flagged", "failed"].includes(
      String(transaction.status || "").toLowerCase()
    )
  );

  const getReasons = (transaction) => {
    if (Array.isArray(transaction.riskReasons)) {
      return transaction.riskReasons;
    }

    return ["AI risk reasons not available"];
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>AI Insights</h1>
          <p>Real AI-powered fraud detection based on transaction risk scoring.</p>
        </div>

        <div className="button-row">
          <button className="secondary-btn" onClick={onRefresh}>
            Refresh AI Insights
          </button>

          <button className="primary-btn" onClick={onReviewTransactions}>
            Open Transactions
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🚨</div>
          <div>
            <p>High Risk</p>
            <h2>{highRiskTransactions.length}</h2>
            <span>Needs urgent review</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div>
            <p>Medium Risk</p>
            <h2>{mediumRiskTransactions.length}</h2>
            <span>Needs monitoring</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚩</div>
          <div>
            <p>Flagged / Failed</p>
            <h2>{flaggedTransactions.length}</h2>
            <span>Transaction status alerts</span>
          </div>
        </div>
      </div>

      {riskyTransactions.length === 0 ? (
        <div className="panel">
          <h3>No risky transactions found</h3>
          <p>
            Add a high-value, failed, flagged, or night-time transaction to see
            AI insights here.
          </p>
        </div>
      ) : (
        <div className="two-grid">
          {riskyTransactions.map((transaction) => (
            <div className="panel" key={transaction.id}>
              <div className="risk-card-top">
                <div>
                  <h3>{transaction.customer}</h3>
                  <p>{transaction.accountNumber}</p>
                </div>

                <Badge value={transaction.risk} />
              </div>

              <div className="activity-list">
                <div>
                  <strong>Transaction Type</strong>
                  <p>{transaction.type}</p>
                </div>

                <div>
                  <strong>Amount</strong>
                  <p>{transaction.amount}</p>
                </div>

                <div>
                  <strong>Date & Time</strong>
                  <p>
                    {transaction.date} {transaction.time}
                  </p>
                </div>

                <div>
                  <strong>AI Risk Score</strong>
                  <p>{transaction.riskScore || 0}</p>
                </div>

                <div>
                  <strong>Risk Reasons</strong>
                  <ul>
                    {getReasons(transaction).map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <button className="primary-btn" onClick={onReviewTransactions}>
                Review Transaction
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Settings({
  dark,
  setDark,
  fontSize,
  setFontSize,
  onLogout,
  onOpenProfile,
  onOpenPassword,
}) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Basic Settings</h1>
          <p>Normal settings for appearance, profile, password and logout.</p>
        </div>
      </div>

      <div className="two-grid">
        <div className="panel">
          <h3>Appearance</h3>
          <p>Switch theme mode.</p>
          <button className="primary-btn" onClick={() => setDark(!dark)}>
            {dark ? "Dark Mode" : "Light Mode"}
          </button>
        </div>

        <div className="panel">
          <h3>Font Size</h3>
          <div className="button-row">
            {["Small", "Normal", "Large"].map((size) => (
              <button
                key={size}
                className={fontSize === size ? "primary-btn" : "secondary-btn"}
                onClick={() => setFontSize(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Account</h3>
          <p>Update profile details and login password.</p>

          <div className="button-row">
            <button className="secondary-btn" onClick={onOpenProfile}>
              Profile Settings
            </button>

            <button className="secondary-btn" onClick={onOpenPassword}>
              Change Password
            </button>
          </div>
        </div>

        <div className="panel">
          <h3>Security</h3>
          <p>Logout from admin dashboard.</p>
          <button className="danger-main-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </>
  );
}

function AccessDenied({ role }) {
  return (
    <div className="panel">
      <h2>Access Denied</h2>
      <p>
        Your current role <strong>{role}</strong> is not allowed to access this
        page.
      </p>
      <p>Please contact Super Admin for permission.</p>
    </div>
  );
}

export default function App() {
  const [admin, setAdmin] = useState(() => getStoredAdmin());
  const [token, setToken] = useState(() => getStoredToken());

  const [activePage, setActivePage] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [dark, setDark] = useState(false);
  const [fontSize, setFontSize] = useState("Normal");

  const [data, setData] = useState({
    admin: [],
    auditLog: [],
    employee: [],
    branch: [],
    customer: [],
    loan: [],
    transaction: [],
    report: [],
  });

  const [loading, setLoading] = useState({});
  const [dashboardData, setDashboardData] = useState({});
  const [modal, setModal] = useState({
    open: false,
    type: "",
    mode: "add",
    item: null,
  });

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const adminRole = normalizeAdminRole(admin?.role);

  const allowedPages = useMemo(() => {
    return roleAccess[adminRole] || ["dashboard", "settings"];
  }, [adminRole]);

  const allowedMenuItems = useMemo(() => {
    return menuItems.filter((item) => allowedPages.includes(item.key));
  }, [allowedPages]);

  const counts = useMemo(
    () => ({
      admin: data.admin.length,
      auditLog: data.auditLog.length,
      employee: data.employee.length,
      branch: data.branch.length,
      customer: data.customer.length,
      loan: data.loan.length,
      transaction: data.transaction.length,
      report: data.report.length,
    }),
    [data]
  );

  const cleanNumber = (value) => {
  const numberValue = Number(
    String(value || "0")
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .trim()
  );

  return Number.isNaN(numberValue) ? 0 : numberValue;
};

const cleanText = (value) => {
  return String(value || "").trim().toLowerCase();
};

const formatMoney = (value) => {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
};

const branchRows = useMemo(() => {
  return (data.branch || []).map((branch) => {
    const branchName = cleanText(branch.name || branch.branchName);
    const branchIfsc = cleanText(branch.ifsc || branch.ifscCode);

    const branchEmployees = (data.employee || []).filter((employee) => {
      return (
        cleanText(employee.branch) === branchName ||
        cleanText(employee.ifsc || employee.ifscCode) === branchIfsc
      );
    });

    const branchCustomers = (data.customer || []).filter((customer) => {
      return (
        cleanText(customer.branch) === branchName ||
        cleanText(customer.ifsc || customer.ifscCode) === branchIfsc
      );
    });

    const customerAccountNumbers = new Set(
      branchCustomers
        .map((customer) => String(customer.accountNumber || "").trim())
        .filter(Boolean)
    );

    const branchLoans = (data.loan || []).filter((loan) => {
      return (
        cleanText(loan.branch) === branchName ||
        cleanText(loan.ifsc || loan.ifscCode) === branchIfsc ||
        customerAccountNumbers.has(String(loan.accountNumber || "").trim())
      );
    });

    const totalBalance = branchCustomers.reduce((sum, customer) => {
      return sum + cleanNumber(customer.balance);
    }, 0);

    const totalLoans = branchLoans.reduce((sum, loan) => {
      return sum + cleanNumber(loan.amount || loan.loans || loan.pending);
    }, 0);

    return {
      ...branch,
      employees: branchEmployees.length,
      customers: branchCustomers.length,
      balance: formatMoney(totalBalance),
      loans: formatMoney(totalLoans),
    };
  });
}, [data.branch, data.employee, data.customer, data.loan]);


  useEffect(() => {
    const storedAdmin = getStoredAdmin();
    const storedToken = getStoredToken();

    if (storedAdmin && storedToken && (!admin || !token)) {
      const safeAdmin = saveAdminSession(storedAdmin, storedToken);
      setAdmin(safeAdmin);
      setToken(storedToken);
    }
  }, [admin, token]);

  const logout = (manual = false) => {
    if (!manual) {
      console.warn("Blocked automatic admin logout from API error");
      return;
    }

    clearAdminSession();
    setAdmin(null);
    setToken("");
    setActivePage("dashboard");
    window.location.href = "/";
  };

  const loadEntity = async (type) => {
    try {
      setLoading((prev) => ({ ...prev, [type]: true }));

      const response = await fetch(configs[type].api, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (isAuthOrPermissionError(response)) {
        console.warn(
          `${type} access issue:`,
          result.message || "Access denied, keeping admin logged in"
        );
        setData((prev) => ({ ...prev, [type]: [] }));
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || `Failed to load ${type}`);
      }

      setData((prev) => ({ ...prev, [type]: result.data || [] }));
    } catch (err) {
      console.error(`${type} load error:`, err);
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const loadDashboard = async () => {
    try {
      const response = await fetch(API.dashboard, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (isAuthOrPermissionError(response)) {
        console.warn(
          "Dashboard access issue:",
          result.message || "Access denied, keeping admin logged in"
        );
        setDashboardData({});
        return;
      }

      if (response.ok) {
        setDashboardData(result.data || {});
      } else {
        console.warn(result.message || "Dashboard load failed");
        setDashboardData({});
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      setDashboardData({});
    }
  };

  useEffect(() => {
    if (!admin || !token) return;

    allowedPages.forEach((type) => {
      if (configs[type]) {
        loadEntity(type);
      }
    });

    loadDashboard();
  }, [admin, token, allowedPages]);

  useEffect(() => {
    if (!admin || !token) return;

    if (!allowedPages.includes(activePage)) {
      setActivePage("dashboard");
    }
  }, [admin, token, activePage, allowedPages]);

  useEffect(() => {
  if (!admin || !token || activePage !== "branch") return;

  const refreshBranchStats = () => {
    loadEntity("branch");
    loadEntity("employee");
    loadEntity("customer");
    loadEntity("loan");
  };

  refreshBranchStats();

  const timer = setInterval(refreshBranchStats, 15000);

  return () => clearInterval(timer);
}, [admin, token, activePage]);


  const saveEntity = async (form) => {
    try {
      const type = modal.type;
      const config = configs[type];
      const isEdit = modal.mode === "edit";

      const response = await fetch(
        isEdit ? `${config.api}/${form.id}` : config.api,
        {
          method: isEdit ? "PUT" : "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(form),
        }
      );

      const result = await response.json();

      if (isAuthOrPermissionError(response)) {
        throw new Error(
          result.message || "Access denied or session check failed. Please try again."
        );
      }

      if (!response.ok) {
        throw new Error(result.message || "Save failed");
      }

      await loadEntity(type);
      await loadDashboard();

      setModal({
        open: false,
        type: "",
        mode: "add",
        item: null,
      });
    } catch (err) {
      alert(err.message || "Save failed");
    }
  };

  const deleteEntity = async (type, item) => {
    const label = item.name || item.customer || item.title || item.id;

    if (!window.confirm(`Delete ${label}?`)) return;

    try {
      const response = await fetch(`${configs[type].api}/${item.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (isAuthOrPermissionError(response)) {
        throw new Error(
          result.message || "Access denied or session check failed. Please try again."
        );
      }

      if (!response.ok) {
        throw new Error(result.message || "Delete failed");
      }

      await loadEntity(type);
      await loadDashboard();
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  const clearAuditLogs = async () => {
    if (!window.confirm("Clear all audit logs?")) return;

    try {
      const response = await fetch(API.auditLog, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (isAuthOrPermissionError(response)) {
        throw new Error(
          result.message || "Access denied or session check failed. Please try again."
        );
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to clear audit logs");
      }

      await loadEntity("auditLog");
      await loadDashboard();

      alert("Audit logs cleared successfully");
    } catch (err) {
      alert(err.message || "Failed to clear audit logs");
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await fetch(API.profile, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData),
      });

      const result = await response.json();

      if (isAuthOrPermissionError(response)) {
        throw new Error(
          result.message || "Access denied or session check failed. Please try again."
        );
      }

      if (!response.ok) {
        throw new Error(result.message || "Profile update failed");
      }

      const updatedAdmin = saveAdminSession(result.data || profileData, result.token || token);

      setAdmin(updatedAdmin);
      setToken(result.token || token);
      setProfileModalOpen(false);

      alert("Profile updated successfully");
    } catch (err) {
      alert(err.message || "Profile update failed");
    }
  };

  const changePassword = async (passwordData) => {
    try {
      const response = await fetch(API.changePassword, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(passwordData),
      });

      const result = await response.json();

      if (isAuthOrPermissionError(response)) {
        throw new Error(
          result.message || "Access denied or session check failed. Please try again."
        );
      }

      if (!response.ok) {
        throw new Error(result.message || "Password change failed");
      }

      setPasswordModalOpen(false);
      alert("Password changed successfully. Please login again.");
      logout(true);
    } catch (err) {
      alert(err.message || "Password change failed");
    }
  };

  if (!admin || !token) {
    return (
      <>
        <style>{styles}</style>
        <LoginPage
          onLogin={(adminData, loginToken) => {
            setAdmin(adminData);
            setToken(loginToken);
          }}
        />
      </>
    );
  }

  const renderPage = () => {
    if (!allowedPages.includes(activePage)) {
      return <AccessDenied role={adminRole} />;
    }

    if (activePage === "dashboard") {
      return <Dashboard dashboardData={dashboardData} counts={counts} />;
    }

    if (activePage === "auditLog") {
      return (
        <AuditLogsPage
          rows={data.auditLog || []}
          search={search}
          loading={loading.auditLog}
          filters={filters.auditLog || {}}
          setFilters={(nextFilters) =>
            setFilters((prev) => ({
              ...prev,
              auditLog: nextFilters,
            }))
          }
          onRefresh={() => loadEntity("auditLog")}
          onClear={clearAuditLogs}
        />
      );
    }

    if (activePage === "ai") {
      return (
        <AIInsights
          transactions={data.transaction || []}
          onRefresh={() => loadEntity("transaction")}
          onReviewTransactions={() => setActivePage("transaction")}
        />
      );
    }

    if (activePage === "settings") {
      return (
        <Settings
          dark={dark}
          setDark={setDark}
          fontSize={fontSize}
          setFontSize={setFontSize}
          onLogout={() => logout(true)}
          onOpenProfile={() => setProfileModalOpen(true)}
          onOpenPassword={() => setPasswordModalOpen(true)}
        />
      );
    }

    return (
      <EntityPage
        config={configs[activePage]}
        rows={activePage === "branch" ? branchRows : data[activePage] || []}
        search={search}
        loading={loading[activePage]}
        filters={filters[activePage] || {}}
        setFilters={(nextFilters) =>
          setFilters((prev) => ({
            ...prev,
            [activePage]: nextFilters,
          }))
        }
        onAdd={() =>
          setModal({
            open: true,
            type: activePage,
            mode: "add",
            item: null,
          })
        }
        onView={(item) =>
          setModal({
            open: true,
            type: activePage,
            mode: "view",
            item,
          })
        }
        onEdit={(item) =>
          setModal({
            open: true,
            type: activePage,
            mode: "edit",
            item,
          })
        }
        onDelete={(item) => deleteEntity(activePage, item)}
      />
    );
  };

  return (
    <div className={`app ${dark ? "dark" : ""} font-${fontSize.toLowerCase()}`}>
      <style>{styles}</style>

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">F</div>
          <div>
            <h2>FinSecure AI</h2>
            <span>Admin Banking Panel</span>
          </div>
        </div>

        <nav>
          {allowedMenuItems.map((item) => (
            <button
              key={item.key}
              className={activePage === item.key ? "active" : ""}
              onClick={() => setActivePage(item.key)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="premium-box">
          <p>Royal Exclusive Banking Privileges</p>
          <strong>{adminRole}</strong>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="search-box">
            <span>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search admin, audit log, employee, customer..."
            />
          </div>

          <div className="admin-box">
            <div>
              <strong>{admin.name || "Admin"}</strong>
              <p>{admin.role || "Super Admin"}</p>
            </div>

            <div className="avatar">{(admin.name || "A").charAt(0)}</div>

            <button className="top-logout" onClick={() => logout(true)}>
              Logout
            </button>
          </div>
        </header>

        <section className="content">{renderPage()}</section>
      </main>

      {modal.open && (
        <EntityModal
          config={configs[modal.type]}
          mode={modal.mode}
          item={modal.item}
          branches={data.branch || []}
          onClose={() =>
            setModal({
              open: false,
              type: "",
              mode: "add",
              item: null,
            })
          }
          onSave={saveEntity}
        />
      )}

      {profileModalOpen && (
        <ProfileModal
          admin={admin}
          onClose={() => setProfileModalOpen(false)}
          onSave={updateProfile}
        />
      )}

      {passwordModalOpen && (
        <PasswordModal
          onClose={() => setPasswordModalOpen(false)}
          onSave={changePassword}
        />
      )}
    </div>
  );
}

const styles = `
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #eef2f7;
}

.detail-modal {
  width: min(980px, 100%);
}

.detail-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(135deg, #eef4ff, #f8fafc);
  border: 1px solid #dbe4f0;
  margin-bottom: 18px;
}

.dark .detail-hero {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.12);
}

.detail-icon {
  width: 64px;
  height: 64px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
  font-size: 30px;
}

.detail-hero h2,
.detail-hero p {
  margin: 0;
}

.detail-hero p {
  margin-top: 6px;
  color: #64748b;
}

.dark .detail-hero p {
  color: #cbd5e1;
}

.detail-section-title {
  font-weight: 900;
  margin: 10px 0 14px;
  color: #334155;
}

.dark .detail-section-title {
  color: #e5e7eb;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.detail-item {
  padding: 14px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: grid;
  gap: 8px;
}

.dark .detail-item {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.1);
}

.detail-label {
  color: #64748b;
  font-size: 12px;
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.dark .detail-label {
  color: #cbd5e1;
}

.detail-value {
  color: #0f172a;
  overflow-wrap: anywhere;
}

.dark .detail-value {
  color: #f8fafc;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

@media (max-width: 950px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-hero {
    align-items: flex-start;
    flex-direction: column;
  }
}

button,
input,
select {
  font-family: inherit;
}

.app {
  min-height: 100vh;
  display: flex;
  background: #eef2f7;
  color: #0f172a;
}

.app.dark {
  background: #0f172a;
  color: #e5e7eb;
}

.font-small {
  font-size: 13px;
}

.font-normal {
  font-size: 15px;
}

.font-large {
  font-size: 17px;
}

.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #07122f, #111827);
  padding: 20px;
}

.login-card {
  width: min(470px, 100%);
  display: grid;
  gap: 14px;
  background: white;
  padding: 30px;
  border-radius: 28px;
  box-shadow: 0 30px 80px rgba(0,0,0,0.35);
}

.login-logo {
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  margin: 0 auto;
  border-radius: 20px;
  color: white;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
  font-size: 30px;
  font-weight: 900;
}

.login-card h1,
.login-card p {
  text-align: center;
  margin: 0;
}

.login-card label {
  display: grid;
  gap: 7px;
  font-weight: 800;
}

.login-card input,
.login-card select,
.form-grid input,
.form-grid select,
.single-form input {
  width: 100%;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  outline: none;
}

.error-box {
  padding: 10px;
  border-radius: 12px;
  background: #fee2e2;
  color: #991b1b;
  font-weight: 800;
}

.form-error {
  margin-bottom: 14px;
}

.sidebar {
  width: 290px;
  min-height: 100vh;
  padding: 24px 18px;
  background: linear-gradient(180deg, #07122f, #111827);
  color: white;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
}

.brand {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 25px;
}

.brand-logo,
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
  color: white;
  font-weight: 900;
}

.brand h2,
.brand span {
  margin: 0;
}

.brand span {
  color: #cbd5e1;
  font-size: 12px;
}

.sidebar nav {
  display: grid;
  gap: 8px;
}

.sidebar nav button {
  border: 0;
  background: transparent;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 800;
  text-align: left;
}

.sidebar nav button.active,
.sidebar nav button:hover {
  background: rgba(255,255,255,0.12);
  color: white;
}

.premium-box {
  margin-top: auto;
  padding: 16px;
  border-radius: 20px;
  background: rgba(37, 99, 235, 0.25);
  border: 1px solid rgba(255,255,255,0.12);
}

.premium-box p {
  margin: 0 0 8px;
}

.main {
  flex: 1;
  min-width: 0;
}

.topbar {
  height: 82px;
  padding: 18px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  background: rgba(255,255,255,0.75);
  border-bottom: 1px solid #dbe4f0;
  position: sticky;
  top: 0;
  z-index: 5;
  backdrop-filter: blur(16px);
}

.dark .topbar {
  background: rgba(15,23,42,0.75);
  border-color: rgba(255,255,255,0.1);
}

.search-box {
  flex: 1;
  max-width: 560px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  border: 1px solid #dbe4f0;
  border-radius: 18px;
  padding: 12px 16px;
}

.dark .search-box {
  background: #111827;
  border-color: rgba(255,255,255,0.1);
}

.search-box input {
  border: 0;
  outline: 0;
  flex: 1;
  background: transparent;
  color: inherit;
}

.admin-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255,255,255,0.75);
  padding: 8px 12px;
  border-radius: 18px;
}

.dark .admin-box {
  background: rgba(255,255,255,0.08);
}

.admin-box p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
}

.dark .admin-box p {
  color: #cbd5e1;
}

.content {
  padding: 28px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  margin-bottom: 22px;
}

.page-header h1 {
  margin: 0;
  font-size: 32px;
}

.page-header p {
  margin: 8px 0 0;
  color: #64748b;
}

.dark .page-header p {
  color: #cbd5e1;
}

.primary-btn,
.secondary-btn,
.danger-main-btn,
.top-logout,
.actions button {
  border: 0;
  padding: 10px 14px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 900;
}

.primary-btn {
  color: white;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
}

.primary-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.secondary-btn {
  background: white;
  color: #0f172a;
  border: 1px solid #cbd5e1;
}

.danger-main-btn,
.top-logout,
.danger-btn {
  background: #fee2e2 !important;
  color: #991b1b !important;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 22px;
}

.money-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 22px;
}

.stat-card,
.money-card,
.panel,
.table-card,
.filter-card {
  background: white;
  border: 1px solid #dbe4f0;
  border-radius: 24px;
  box-shadow: 0 16px 40px rgba(15,23,42,0.06);
}

.dark .stat-card,
.dark .money-card,
.dark .panel,
.dark .table-card,
.dark .filter-card {
  background: #111827;
  border-color: rgba(255,255,255,0.1);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
}

.money-card {
  padding: 18px;
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: #eef4ff;
  font-size: 24px;
}

.dark .stat-icon {
  background: rgba(255,255,255,0.08);
}

.stat-card p,
.stat-card h2,
.stat-card span,
.money-card p,
.money-card h2,
.money-card span {
  margin: 0;
}

.money-card h2 {
  margin: 8px 0;
}

.stat-card p,
.stat-card span,
.money-card p,
.money-card span {
  color: #64748b;
}

.dark .stat-card p,
.dark .stat-card span,
.dark .money-card p,
.dark .money-card span {
  color: #cbd5e1;
}

.two-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.panel {
  padding: 20px;
}

.dashboard-bottom {
  margin-top: 18px;
}

.activity-list {
  display: grid;
  gap: 12px;
}

.activity-list div {
  padding: 13px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.dark .activity-list div {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.08);
}

.activity-list ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

.risk-bars {
  display: grid;
  gap: 16px;
}

.risk-row-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.risk-track {
  height: 12px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.dark .risk-track {
  background: rgba(255,255,255,0.12);
}

.risk-fill {
  height: 100%;
  border-radius: 999px;
}

.risk-fill.normal {
  background: #22c55e;
}

.risk-fill.low {
  background: #eab308;
}

.risk-fill.medium {
  background: #f97316;
}

.risk-fill.high {
  background: #ef4444;
}

.risk-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 14px;
}

.risk-card-top h3,
.risk-card-top p {
  margin: 0;
}

.risk-card-top p {
  color: #64748b;
}

.dark .risk-card-top p {
  color: #cbd5e1;
}

.filter-card {
  padding: 18px;
  margin-bottom: 20px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.filter-header h3,
.filter-header p {
  margin: 0;
}

.filter-header p {
  margin-top: 6px;
  color: #64748b;
}

.dark .filter-header p {
  color: #cbd5e1;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.filter-grid label {
  display: grid;
  gap: 7px;
  font-weight: 800;
}

.filter-grid select {
  width: 100%;
  padding: 11px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  outline: none;
  background: white;
}

.dark .filter-grid select {
  background: #0f172a;
  color: #e5e7eb;
  border-color: rgba(255,255,255,0.14);
}

.filter-result {
  margin-top: 14px;
  color: #64748b;
}

.dark .filter-result {
  color: #cbd5e1;
}

.table-card {
  overflow: auto;
}

.loading-box {
  padding: 20px;
  font-weight: 900;
}

table {
  width: 100%;
  min-width: 1200px;
  border-collapse: collapse;
}

th,
td {
  padding: 14px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

.dark th,
.dark td {
  border-color: rgba(255,255,255,0.08);
}

th {
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  text-transform: uppercase;
}

.dark th {
  background: rgba(255,255,255,0.04);
  color: #cbd5e1;
}

.actions {
  display: flex;
  gap: 8px;
}

.badge {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
}

.badge.good {
  background: #dcfce7;
  color: #166534;
}

.badge.warn {
  background: #fef3c7;
  color: #92400e;
}

.badge.bad {
  background: #fee2e2;
  color: #991b1b;
}

.badge.normal {
  background: #e0e7ff;
  color: #3730a3;
}

.modal-bg {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(2,6,23,0.65);
  z-index: 20;
}

.modal {
  width: min(900px, 100%);
  max-height: 92vh;
  overflow: auto;
  background: white;
  color: #0f172a;
  border-radius: 26px;
  padding: 22px;
}

.small-modal {
  width: min(520px, 100%);
}

.modal-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.modal-top h2,
.modal-top p {
  margin: 0;
}

.close-btn {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 12px;
  font-size: 24px;
  cursor: pointer;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-grid label,
.single-form label {
  display: grid;
  gap: 7px;
  font-weight: 800;
}

.single-form {
  display: grid;
  gap: 14px;
}

.modal-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.button-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 950px) {
  .app {
    display: block;
  }

  .sidebar {
    width: 100%;
    min-height: auto;
    position: relative;
  }

  .stats-grid,
  .money-grid,
  .two-grid,
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .filter-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .topbar {
    height: auto;
    flex-direction: column;
    align-items: stretch;
  }

  .admin-box {
    flex-wrap: wrap;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
  .polished-table-shell {
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid #dbe4f0;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.dark .polished-table-shell {
  background: rgba(15, 23, 42, 0.92);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.polished-data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.polished-data-table th {
  background: #f8fafc;
  color: #334155;
  font-size: 13px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  white-space: nowrap;
}

.dark .polished-data-table th {
  background: rgba(255, 255, 255, 0.06);
  color: #e5e7eb;
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.polished-data-table td {
  padding: 16px;
  border-bottom: 1px solid #edf2f7;
  color: #0f172a;
  vertical-align: middle;
  white-space: nowrap;
}

.dark .polished-data-table td {
  color: #f8fafc;
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.polished-data-table tbody tr {
  transition: background 0.2s ease, transform 0.2s ease;
}

.polished-data-table tbody tr:hover {
  background: #f8fafc;
}

.dark .polished-data-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.04);
}

.table-cell-text {
  font-weight: 650;
}

.actions-head {
  text-align: center !important;
}

.table-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.action-btn {
  border: 0;
  outline: none;
  cursor: pointer;
  padding: 10px 14px;
  border-radius: 14px;
  font-weight: 900;
  font-size: 13px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
}

.view-action {
  background: #f1f5f9;
  color: #020617;
}

.edit-action {
  background: #eef6ff;
  color: #075985;
}

.delete-action {
  background: #fee2e2;
  color: #991b1b;
}

.dark .view-action {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.dark .edit-action {
  background: rgba(56, 189, 248, 0.18);
  color: #7dd3fc;
}

.dark .delete-action {
  background: rgba(248, 113, 113, 0.18);
  color: #fecaca;
}

.empty-state-box {
  min-height: 220px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 42px 20px;
}

.empty-state-icon {
  width: 70px;
  height: 70px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  margin-bottom: 14px;
  font-size: 32px;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
  box-shadow: 0 16px 30px rgba(37, 99, 235, 0.25);
}

.empty-state-box h3 {
  margin: 0;
  font-size: 22px;
  color: #0f172a;
}

.empty-state-box p {
  max-width: 520px;
  margin: 8px auto 0;
  color: #64748b;
  line-height: 1.6;
}

.dark .empty-state-box h3 {
  color: #f8fafc;
}

.dark .empty-state-box p {
  color: #cbd5e1;
}

.table-loading-state {
  min-height: 280px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 36px 20px;
}

.loader-orb {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: 6px solid #dbeafe;
  border-top-color: #2563eb;
  animation: spinLoader 1s linear infinite;
  margin-bottom: 14px;
}

.table-loading-state h3 {
  margin: 0;
  font-size: 22px;
  color: #0f172a;
}

.table-loading-state p {
  margin: 8px 0 18px;
  color: #64748b;
}

.dark .table-loading-state h3 {
  color: #f8fafc;
}

.dark .table-loading-state p {
  color: #cbd5e1;
}

.skeleton-table {
  width: min(720px, 100%);
  display: grid;
  gap: 10px;
}

.skeleton-row {
  display: grid;
  grid-template-columns: 1fr 1.2fr 0.8fr 0.7fr;
  gap: 12px;
}

.skeleton-row span {
  height: 14px;
  border-radius: 999px;
  background: linear-gradient(90deg, #e2e8f0, #f8fafc, #e2e8f0);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.dark .skeleton-row span {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.08),
    rgba(255, 255, 255, 0.18),
    rgba(255, 255, 255, 0.08)
  );
  background-size: 200% 100%;
}

@keyframes spinLoader {
  to {
    transform: rotate(360deg);
  }
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

@media (max-width: 800px) {
  .table-actions {
    justify-content: flex-start;
  }

  .action-btn {
    padding: 9px 12px;
    font-size: 12px;
  }
}
  /* ================================
   PREMIUM DASHBOARD POLISH
================================ */

.dashboard-page,
.page-content {
  animation: pageFadeIn 0.35s ease;
}

.dashboard-hero,
.dashboard-header,
.page-hero {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  padding: 28px;
  margin-bottom: 24px;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.22), transparent 34%),
    radial-gradient(circle at top right, rgba(6, 182, 212, 0.18), transparent 32%),
    linear-gradient(135deg, #071630 0%, #102653 48%, #07111f 100%);
  color: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.dashboard-hero::before,
.dashboard-header::before,
.page-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.08), transparent),
    radial-gradient(circle at 15% 20%, rgba(255, 255, 255, 0.14), transparent 14%);
  pointer-events: none;
}

.dashboard-hero h1,
.dashboard-header h1,
.page-hero h1 {
  position: relative;
  font-size: clamp(30px, 4vw, 48px);
  font-weight: 950;
  letter-spacing: -0.04em;
  margin: 0 0 8px;
  color: #ffffff;
}

.dashboard-hero p,
.dashboard-header p,
.page-hero p {
  position: relative;
  max-width: 760px;
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 16px;
  line-height: 1.6;
}

.stats-grid,
.dashboard-grid,
.summary-grid,
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 18px;
  margin-bottom: 24px;
}

.stat-card,
.dashboard-card,
.summary-card,
.kpi-card,
.metric-card {
  position: relative;
  overflow: hidden;
  border-radius: 26px;
  padding: 22px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.92));
  border: 1px solid rgba(203, 213, 225, 0.9);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
}

.stat-card::before,
.dashboard-card::before,
.summary-card::before,
.kpi-card::before,
.metric-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.12), transparent 38%),
    linear-gradient(135deg, rgba(6, 182, 212, 0.08), transparent 42%);
  opacity: 0;
  transition: opacity 0.22s ease;
}

.stat-card:hover,
.dashboard-card:hover,
.summary-card:hover,
.kpi-card:hover,
.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 26px 56px rgba(15, 23, 42, 0.14);
  border-color: rgba(37, 99, 235, 0.28);
}

.stat-card:hover::before,
.dashboard-card:hover::before,
.summary-card:hover::before,
.kpi-card:hover::before,
.metric-card:hover::before {
  opacity: 1;
}

.stat-icon,
.card-icon,
.metric-icon,
.kpi-icon {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  margin-bottom: 16px;
  font-size: 24px;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.28);
}

.stat-card h3,
.dashboard-card h3,
.summary-card h3,
.kpi-card h3,
.metric-card h3 {
  position: relative;
  margin: 0 0 6px;
  color: #475569;
  font-size: 14px;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.035em;
}

.stat-card .value,
.dashboard-card .value,
.summary-card .value,
.kpi-card .value,
.metric-card .value,
.stat-value,
.card-value,
.metric-value,
.kpi-value {
  position: relative;
  color: #020617;
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 950;
  letter-spacing: -0.04em;
  line-height: 1;
  margin-top: 8px;
}

.stat-card p,
.dashboard-card p,
.summary-card p,
.kpi-card p,
.metric-card p,
.stat-subtitle,
.card-subtitle,
.metric-subtitle {
  position: relative;
  color: #64748b;
  font-size: 14px;
  margin: 10px 0 0;
  line-height: 1.55;
}

.dashboard-section,
.chart-card,
.insight-card,
.recent-card,
.activity-card {
  border-radius: 28px;
  padding: 24px;
  background: #ffffff;
  border: 1px solid #dbe4f0;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
  margin-bottom: 22px;
}

.dashboard-section h2,
.chart-card h2,
.insight-card h2,
.recent-card h2,
.activity-card h2 {
  margin: 0 0 14px;
  font-size: 22px;
  font-weight: 950;
  color: #0f172a;
  letter-spacing: -0.03em;
}

.dashboard-mini-badge,
.trend-badge,
.growth-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: 12px;
  font-weight: 900;
}

/* Dark mode dashboard polish */

.dark .dashboard-hero,
.dark .dashboard-header,
.dark .page-hero {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.25), transparent 35%),
    radial-gradient(circle at top right, rgba(34, 211, 238, 0.18), transparent 34%),
    linear-gradient(135deg, #020617 0%, #0f172a 54%, #111827 100%);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.42);
}

.dark .stat-card,
.dark .dashboard-card,
.dark .summary-card,
.dark .kpi-card,
.dark .metric-card {
  background:
    linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.86));
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 52px rgba(0, 0, 0, 0.32);
}

.dark .stat-card h3,
.dark .dashboard-card h3,
.dark .summary-card h3,
.dark .kpi-card h3,
.dark .metric-card h3 {
  color: #cbd5e1;
}

.dark .stat-card .value,
.dark .dashboard-card .value,
.dark .summary-card .value,
.dark .kpi-card .value,
.dark .metric-card .value,
.dark .stat-value,
.dark .card-value,
.dark .metric-value,
.dark .kpi-value {
  color: #ffffff;
}

.dark .stat-card p,
.dark .dashboard-card p,
.dark .summary-card p,
.dark .kpi-card p,
.dark .metric-card p,
.dark .stat-subtitle,
.dark .card-subtitle,
.dark .metric-subtitle {
  color: #94a3b8;
}

.dark .dashboard-section,
.dark .chart-card,
.dark .insight-card,
.dark .recent-card,
.dark .activity-card {
  background: rgba(15, 23, 42, 0.92);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 22px 56px rgba(0, 0, 0, 0.34);
}

.dark .dashboard-section h2,
.dark .chart-card h2,
.dark .insight-card h2,
.dark .recent-card h2,
.dark .activity-card h2 {
  color: #f8fafc;
}

@keyframes pageFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
  /* ================================
   REPORTS + FINAL PAGE POLISH
================================ */

.page-header {
  position: relative;
  overflow: hidden;
  border-radius: 26px;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.14), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
  border: 1px solid rgba(203, 213, 225, 0.85);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
}

.page-header h1 {
  font-size: clamp(28px, 3vw, 40px);
  font-weight: 950;
  letter-spacing: -0.04em;
  color: #020617;
}

.page-header p {
  color: #64748b;
  font-size: 15px;
  line-height: 1.6;
}

.filter-card {
  border-radius: 24px;
  padding: 20px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
  border: 1px solid rgba(203, 213, 225, 0.9);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.07);
}

.filter-header h3 {
  font-size: 20px;
  font-weight: 950;
  color: #0f172a;
  letter-spacing: -0.03em;
}

.filter-header p {
  color: #64748b;
  line-height: 1.5;
}

.filter-grid label {
  font-weight: 850;
  color: #334155;
}

.filter-grid select,
.form-grid input,
.form-grid select,
.single-form input {
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.filter-grid select:focus,
.form-grid input:focus,
.form-grid select:focus,
.single-form input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.filter-result {
  padding: 12px 14px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-weight: 700;
}

.primary-btn,
.secondary-btn,
.danger-main-btn,
.top-logout {
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.primary-btn:hover,
.secondary-btn:hover,
.danger-main-btn:hover,
.top-logout:hover {
  transform: translateY(-1px);
}

.primary-btn {
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.22);
}

.secondary-btn:hover {
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
}

.table-card {
  border-radius: 26px;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
}

.modal {
  box-shadow: 0 30px 90px rgba(2, 6, 23, 0.38);
}

.modal-top {
  padding-bottom: 14px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-top h2 {
  font-size: 26px;
  font-weight: 950;
  letter-spacing: -0.035em;
}

.modal-top p {
  margin-top: 6px;
  color: #64748b;
}

.close-btn {
  background: #f1f5f9;
  color: #0f172a;
  transition: transform 0.2s ease, background 0.2s ease;
}

.close-btn:hover {
  transform: rotate(90deg);
  background: #e2e8f0;
}

/* Dark mode final polish */

.dark .page-header,
.dark .filter-card {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 34%),
    linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.9));
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 22px 52px rgba(0, 0, 0, 0.34);
}

.dark .page-header h1,
.dark .filter-header h3 {
  color: #f8fafc;
}

.dark .page-header p,
.dark .filter-header p {
  color: #cbd5e1;
}

.dark .filter-grid label {
  color: #e5e7eb;
}

.dark .filter-result {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
}

.dark .modal-top {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.dark .modal-top p {
  color: #cbd5e1;
}

.dark .close-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.dark .close-btn:hover {
  background: rgba(255, 255, 255, 0.16);
}
`;