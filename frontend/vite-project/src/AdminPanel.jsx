import React, { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

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
  profile: `${API_BASE_URL}/api/auth/profile`,
  changePassword: `${API_BASE_URL}/api/auth/change-password`,
};

const todayDate = new Date().toISOString().slice(0, 10);

const adminRoles = [
  "Super Admin",
  "Branch Manager",
  "Loan Officer",
  "Fraud Analyst",
  "Customer Support",
  "Report Analyst",
];

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
  { key: "settings", label: "Settings", icon: "⚙️" },
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
        defaultValue: "Customer Support Executive",
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
      { name: "joiningDate", label: "Date of Joining", type: "date" },
      { name: "branch", label: "Branch Name", required: true },
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
      ["email", "Email"],
      ["phone", "Phone"],
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
        defaultValue: "Savings Account",
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
      { name: "branch", label: "Branch", required: true },
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
        defaultValue: "Personal Loan",
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
      { name: "startDate", label: "Start Date", type: "date", required: true },
      { name: "endDate", label: "End Date", type: "date", required: true },
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
        defaultValue: "UPI Payment",
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
      { name: "date", label: "Date", type: "date", required: true },
      { name: "time", label: "Time", type: "time", required: true },
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
        defaultValue: "Customer",
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
      { name: "generatedDate", label: "Generated Date", type: "date", defaultValue: todayDate },
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

function getStoredAdmin() {
  const possibleKeys = [
    "finsecure_admin",
    "admin",
    "adminData",
    "loggedInAdmin",
    "currentUser",
    "user",
  ];

  for (const key of possibleKeys) {
    try {
      const value = localStorage.getItem(key);
      if (!value) continue;

      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function getStoredToken() {
  return (
    localStorage.getItem("finsecure_token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    ""
  );
}

function getAuthHeaders() {
  const token = getStoredToken();

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

function normalizeAdminRole(role) {
  const text = String(role || "").trim();

  if (!text) return "Super Admin";
  if (text.toLowerCase() === "admin") return "Super Admin";
  if (text.toLowerCase() === "superadmin") return "Super Admin";

  return text;
}

function Badge({ value }) {
  const text = String(value || "Normal");
  const lower = text.toLowerCase();

  let style = styles.badgeNormal;

  if (
    ["active", "success", "verified", "ready", "normal", "closed"].includes(
      lower
    )
  ) {
    style = styles.badgeGood;
  }

  if (["pending", "review", "medium", "low"].includes(lower)) {
    style = styles.badgeWarn;
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
    style = styles.badgeBad;
  }

  return <span style={style}>{text}</span>;
}

export default function AdminPanel() {
  const [admin, setAdmin] = useState(() => getStoredAdmin());
  const [token, setToken] = useState(() => getStoredToken());
  const [activePage, setActivePage] = useState("dashboard");
  const [search, setSearch] = useState("");
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
  const [pageNotice, setPageNotice] = useState("");

  const [modal, setModal] = useState({
    open: false,
    type: "",
    mode: "add",
    item: null,
  });

  const adminRole = normalizeAdminRole(admin?.role);

  const allowedPages = useMemo(() => {
    return roleAccess[adminRole] || roleAccess["Super Admin"];
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

  const logout = () => {
    localStorage.removeItem("finsecure_admin");
    localStorage.removeItem("admin");
    localStorage.removeItem("adminData");
    localStorage.removeItem("loggedInAdmin");
    localStorage.removeItem("finsecure_token");
    localStorage.removeItem("adminToken");

    setAdmin(null);
    setToken("");
    window.location.href = "/";
  };

  const loadEntity = async (type) => {
    if (!configs[type]) return;

    try {
      setLoading((prev) => ({ ...prev, [type]: true }));

      const response = await fetch(configs[type].api, {
        headers: getAuthHeaders(),
      });

      let result = {};
      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (response.status === 401 || response.status === 403) {
        console.warn(`${type} access issue:`, result.message || response.status);
        setPageNotice(
          "Some admin data could not load because backend permissions or routes are not fully available yet. Your admin session is still active."
        );
        setData((prev) => ({ ...prev, [type]: [] }));
        return;
      }

      if (!response.ok) {
        console.warn(`${type} load issue:`, result.message || response.status);
        setData((prev) => ({ ...prev, [type]: [] }));
        return;
      }

      const rows = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
        ? result
        : [];

      setData((prev) => ({ ...prev, [type]: rows }));
    } catch (err) {
      console.error(`${type} load error:`, err);
      setData((prev) => ({ ...prev, [type]: [] }));
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const loadDashboard = async () => {
    try {
      const response = await fetch(API.dashboard, {
        headers: getAuthHeaders(),
      });

      let result = {};
      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (response.status === 401 || response.status === 403) {
        console.warn("Dashboard access issue:", result.message || response.status);
        setDashboardData({});
        return;
      }

      if (response.ok) {
        setDashboardData(result.data || result || {});
      } else {
        console.warn("Dashboard load issue:", result.message || response.status);
        setDashboardData({});
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      setDashboardData({});
    }
  };

  useEffect(() => {
    const savedAdmin = getStoredAdmin();
    const savedToken = getStoredToken();

    if (!savedAdmin || !savedToken) {
      setAdmin(null);
      setToken("");
      return;
    }

    setAdmin(savedAdmin);
    setToken(savedToken);
  }, []);

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
    if (!allowedPages.includes(activePage)) {
      setActivePage("dashboard");
    }
  }, [activePage, allowedPages]);

  const createEmptyForm = (type) => {
    const config = configs[type];
    const obj = {};

    config.fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        obj[field.name] = field.defaultValue;
      } else if (field.type === "number") {
        obj[field.name] = 0;
      } else if (field.type === "select") {
        obj[field.name] = field.options?.[0] || "";
      } else {
        obj[field.name] = "";
      }
    });

    return obj;
  };

  const saveEntity = async (form) => {
    try {
      const type = modal.type;
      const config = configs[type];
      const isEdit = modal.mode === "edit";
      const id = form._id || form.id;

      const response = await fetch(isEdit ? `${config.api}/${id}` : config.api, {
        method: isEdit ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });

      let result = {};
      try {
        result = await response.json();
      } catch {
        result = {};
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
    const label = item.name || item.customer || item.title || item.id || item._id;

    if (!window.confirm(`Delete ${label}?`)) return;

    try {
      const id = item._id || item.id;

      const response = await fetch(`${configs[type].api}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      let result = {};
      try {
        result = await response.json();
      } catch {
        result = {};
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

      if (!response.ok) {
        alert("Unable to clear audit logs");
        return;
      }

      await loadEntity("auditLog");
      await loadDashboard();
    } catch {
      alert("Unable to clear audit logs");
    }
  };

  if (!admin || !token) {
    return (
      <div style={styles.loginFallbackPage}>
        <div style={styles.loginFallbackCard}>
          <div style={styles.logoCircle}>FS</div>
          <h1>Admin Session Not Found</h1>
          <p>Please login from the main FinSecure AI login page.</p>
          <button style={styles.primaryBtn} onClick={() => (window.location.href = "/")}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    if (!allowedPages.includes(activePage)) {
      return (
        <div style={styles.panel}>
          <h2>Access Denied</h2>
          <p>
            Your role <strong>{adminRole}</strong> cannot access this page.
          </p>
        </div>
      );
    }

    if (activePage === "dashboard") {
      return (
        <DashboardPage
          admin={admin}
          adminRole={adminRole}
          dashboardData={dashboardData}
          counts={counts}
          data={data}
          setActivePage={setActivePage}
        />
      );
    }

    if (activePage === "auditLog") {
      return (
        <AuditLogsPage
          rows={data.auditLog}
          loading={loading.auditLog}
          search={search}
          onRefresh={() => loadEntity("auditLog")}
          onClear={clearAuditLogs}
        />
      );
    }

    if (activePage === "ai") {
      return (
        <AIInsights
          transactions={data.transaction}
          onRefresh={() => loadEntity("transaction")}
          onReviewTransactions={() => setActivePage("transaction")}
        />
      );
    }

    if (activePage === "settings") {
      return (
        <SettingsPage
          dark={dark}
          setDark={setDark}
          fontSize={fontSize}
          setFontSize={setFontSize}
          admin={admin}
          onLogout={logout}
        />
      );
    }

    return (
      <EntityPage
        config={configs[activePage]}
        rows={data[activePage] || []}
        search={search}
        loading={loading[activePage]}
        onAdd={() =>
          setModal({
            open: true,
            type: activePage,
            mode: "add",
            item: createEmptyForm(activePage),
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
    <div
      style={{
        ...styles.app,
        ...(dark ? styles.appDark : {}),
        fontSize:
          fontSize === "Small" ? "14px" : fontSize === "Large" ? "18px" : "16px",
      }}
    >
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandLogo}>F</div>
          <div>
            <h2 style={styles.brandTitle}>FinSecure AI</h2>
            <span style={styles.brandSub}>Admin Banking Panel</span>
          </div>
        </div>

        <nav style={styles.nav}>
          {allowedMenuItems.map((item) => (
            <button
              key={item.key}
              style={
                activePage === item.key
                  ? styles.navButtonActive
                  : styles.navButton
              }
              onClick={() => setActivePage(item.key)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={styles.premiumBox}>
          <p style={styles.premiumText}>Royal Banking Privileges</p>
          <strong>{adminRole}</strong>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.topbar}>
          <div style={styles.searchBox}>
            <span>🔍</span>
            <input
              style={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search admin, employee, customer, transaction..."
            />
          </div>

          <div style={styles.adminBox}>
            <div style={{ textAlign: "right" }}>
              <strong>{admin.name || "Admin"}</strong>
              <p style={styles.adminRole}>{adminRole}</p>
            </div>

            <div style={styles.avatar}>
              {(admin.name || "A").charAt(0).toUpperCase()}
            </div>

            <button style={styles.logoutBtn} onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        {pageNotice && (
          <div style={styles.notice}>
            {pageNotice}
            <button style={styles.noticeClose} onClick={() => setPageNotice("")}>
              ×
            </button>
          </div>
        )}

        <section style={styles.content}>{renderPage()}</section>
      </main>

      {modal.open && (
        <EntityModal
          config={configs[modal.type]}
          mode={modal.mode}
          item={modal.item}
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
    </div>
  );
}

function DashboardPage({ admin, adminRole, dashboardData, counts, data, setActivePage }) {
  const riskDistribution = dashboardData.riskDistribution || {
    normal: 0,
    low: 0,
    medium: 0,
    high: 0,
  };

  const cards = [
    ["Total Admins", dashboardData.totalAdmins || counts.admin, "Admin user accounts", "🛡️"],
    ["Total Customers", dashboardData.totalCustomers || counts.customer, "Customer records", "👥"],
    ["Total Employees", dashboardData.totalEmployees || counts.employee, "Bank staff records", "👨‍💼"],
    ["Total Branches", dashboardData.totalBranches || counts.branch, "Operational branches", "🏢"],
    ["Total Loans", dashboardData.totalLoans || counts.loan, "Loan records", "💰"],
    ["AI Risk Alerts", dashboardData.aiRiskAlerts || 0, "Fraud/risk monitoring", "🤖"],
  ];

  const moneyCards = [
    ["Customer Balance", dashboardData.totalBalance || "₹0", "Total customer balance"],
    ["Branch Balance", dashboardData.branchBalance || "₹0", "Total branch balance"],
    ["Loan Amount", dashboardData.totalLoanAmount || "₹0", "Total loan value"],
    ["Transaction Volume", dashboardData.transactionVolume || "₹0", "Total transaction value"],
  ];

  const recentTransactions =
    dashboardData.recentTransactions ||
    (data.transaction || []).slice(0, 5);

  return (
    <>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Admin Dashboard</h1>
          <p style={styles.pageText}>
            Welcome {admin.name || "Admin"} — Role: {adminRole}
          </p>
        </div>

        <button style={styles.primaryBtn} onClick={() => setActivePage("customer")}>
          View Customers
        </button>
      </div>

      <div style={styles.statsGrid}>
        {cards.map(([title, value, subtitle, icon]) => (
          <div style={styles.statCard} key={title}>
            <div style={styles.statIcon}>{icon}</div>
            <div>
              <p style={styles.statLabel}>{title}</p>
              <h2 style={styles.statValue}>{value}</h2>
              <span style={styles.statSub}>{subtitle}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.moneyGrid}>
        {moneyCards.map(([title, value, subtitle]) => (
          <div style={styles.moneyCard} key={title}>
            <p>{title}</p>
            <h2>{value}</h2>
            <span>{subtitle}</span>
          </div>
        ))}
      </div>

      <div style={styles.twoGrid}>
        <div style={styles.panel}>
          <h3>AI Risk Distribution</h3>

          {["normal", "low", "medium", "high"].map((key) => (
            <div key={key} style={styles.riskRow}>
              <div style={styles.riskTop}>
                <strong>{key.toUpperCase()}</strong>
                <span>{riskDistribution[key] || 0}</span>
              </div>
              <div style={styles.riskTrack}>
                <div
                  style={{
                    ...styles.riskFill,
                    width: `${Math.min((riskDistribution[key] || 0) * 10 + 5, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={styles.panel}>
          <h3>Recent Transactions</h3>

          {recentTransactions.length === 0 ? (
            <p>No recent transactions found.</p>
          ) : (
            <div style={styles.activityList}>
              {recentTransactions.map((item, index) => (
                <div style={styles.activityItem} key={item.id || item._id || index}>
                  <strong>{item.customer || item.description || "Transaction"}</strong>
                  <p>
                    {item.type || "-"} • {item.amount || "₹0"} • {item.date || ""}
                  </p>
                  <Badge value={item.risk || item.status || "Normal"} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function EntityPage({ config, rows, search, loading, onAdd, onView, onEdit, onDelete }) {
  const filteredRows = rows.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(search.toLowerCase())
  );

  const exportCsv = () => {
    if (filteredRows.length === 0) {
      alert("No records to export");
      return;
    }

    const headers = config.columns.map(([, label]) => label);
    const csvRows = [
      headers.join(","),
      ...filteredRows.map((row) =>
        config.columns
          .map(([key]) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${config.pageTitle.replace(/\s+/g, "_").toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>{config.pageTitle}</h1>
          <p style={styles.pageText}>Manage {config.title.toLowerCase()} records securely.</p>
        </div>

        <div style={styles.buttonRow}>
          <button style={styles.secondaryBtn} onClick={exportCsv}>
            Export CSV
          </button>

          {config.buttonText && (
            <button style={styles.primaryBtn} onClick={onAdd}>
              {config.buttonText}
            </button>
          )}
        </div>
      </div>

      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loadingBox}>Loading records...</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {config.columns.map(([key, label]) => (
                    <th style={styles.th} key={key}>
                      {label}
                    </th>
                  ))}
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={config.columns.length + 1}>
                      No records found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr key={row.id || row._id || index}>
                      {config.columns.map(([key]) => (
                        <td style={styles.td} key={key}>
                          {["status", "kyc", "risk"].includes(key) ? (
                            <Badge value={row[key]} />
                          ) : (
                            String(row[key] ?? "-")
                          )}
                        </td>
                      ))}

                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button style={styles.viewBtn} onClick={() => onView(row)}>
                            View
                          </button>
                          <button style={styles.editBtn} onClick={() => onEdit(row)}>
                            Edit
                          </button>
                          <button style={styles.deleteBtn} onClick={() => onDelete(row)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function AuditLogsPage({ rows, search, loading, onRefresh, onClear }) {
  const filteredRows = rows.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Audit Logs</h1>
          <p style={styles.pageText}>Track admin actions and security events.</p>
        </div>

        <div style={styles.buttonRow}>
          <button style={styles.secondaryBtn} onClick={onRefresh}>
            Refresh
          </button>
          <button style={styles.deleteBtn} onClick={onClear}>
            Clear Logs
          </button>
        </div>
      </div>

      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loadingBox}>Loading audit logs...</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {[
                    "Log ID",
                    "Action",
                    "Module",
                    "Admin",
                    "Email",
                    "Role",
                    "Description",
                    "Status",
                    "Date",
                  ].map((head) => (
                    <th style={styles.th} key={head}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan="9">
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr key={row.id || row._id || index}>
                      <td style={styles.td}>{row.id || row._id || "-"}</td>
                      <td style={styles.td}>{row.action || "-"}</td>
                      <td style={styles.td}>{row.module || "-"}</td>
                      <td style={styles.td}>{row.adminName || "-"}</td>
                      <td style={styles.td}>{row.adminEmail || "-"}</td>
                      <td style={styles.td}>{row.adminRole || "-"}</td>
                      <td style={styles.td}>{row.description || "-"}</td>
                      <td style={styles.td}>
                        <Badge value={row.status || "Success"} />
                      </td>
                      <td style={styles.td}>
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString("en-IN")
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

  return (
    <>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>AI Insights</h1>
          <p style={styles.pageText}>
            AI-powered fraud and risk monitoring for transactions.
          </p>
        </div>

        <div style={styles.buttonRow}>
          <button style={styles.secondaryBtn} onClick={onRefresh}>
            Refresh
          </button>
          <button style={styles.primaryBtn} onClick={onReviewTransactions}>
            Open Transactions
          </button>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🚨</div>
          <div>
            <p style={styles.statLabel}>Risky Transactions</p>
            <h2 style={styles.statValue}>{riskyTransactions.length}</h2>
            <span style={styles.statSub}>High / medium / flagged</span>
          </div>
        </div>
      </div>

      {riskyTransactions.length === 0 ? (
        <div style={styles.panel}>
          <h3>No risky transactions found</h3>
          <p>Add high-risk transactions to see AI insights here.</p>
        </div>
      ) : (
        <div style={styles.twoGrid}>
          {riskyTransactions.map((transaction, index) => (
            <div style={styles.panel} key={transaction.id || transaction._id || index}>
              <h3>{transaction.customer || "Transaction"}</h3>
              <p>Account: {transaction.accountNumber || "-"}</p>
              <p>Amount: {transaction.amount || "₹0"}</p>
              <p>Type: {transaction.type || "-"}</p>
              <Badge value={transaction.risk || transaction.status} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function SettingsPage({ dark, setDark, fontSize, setFontSize, admin, onLogout }) {
  return (
    <>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Settings</h1>
          <p style={styles.pageText}>Appearance, profile, and account settings.</p>
        </div>
      </div>

      <div style={styles.twoGrid}>
        <div style={styles.panel}>
          <h3>Admin Profile</h3>
          <p>Name: {admin.name || "Admin"}</p>
          <p>Email: {admin.email || "-"}</p>
          <p>Role: {normalizeAdminRole(admin.role)}</p>
        </div>

        <div style={styles.panel}>
          <h3>Appearance</h3>
          <button style={styles.primaryBtn} onClick={() => setDark(!dark)}>
            {dark ? "Switch Light Mode" : "Switch Dark Mode"}
          </button>
        </div>

        <div style={styles.panel}>
          <h3>Font Size</h3>
          <div style={styles.buttonRow}>
            {["Small", "Normal", "Large"].map((size) => (
              <button
                key={size}
                style={fontSize === size ? styles.primaryBtn : styles.secondaryBtn}
                onClick={() => setFontSize(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.panel}>
          <h3>Security</h3>
          <button style={styles.deleteBtn} onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </>
  );
}

function EntityModal({ config, mode, item, onClose, onSave }) {
  const [form, setForm] = useState(item || {});
  const viewOnly = mode === "view";

  const changeValue = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field.name]: field.type === "number" ? Number(value) : value,
    }));
  };

  const submit = (event) => {
    event.preventDefault();

    for (const field of config.fields) {
      const required = field.required || (mode === "add" && field.requiredOnAdd);
      if (required && !String(form[field.name] || "").trim()) {
        alert(`Please fill ${field.label}`);
        return;
      }
    }

    onSave(form);
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalTop}>
          <div>
            <h2 style={styles.modalTitle}>
              {viewOnly
                ? `View ${config.title}`
                : mode === "add"
                ? `Add ${config.title}`
                : `Edit ${config.title}`}
            </h2>
            <p style={styles.pageText}>FinSecure AI record details</p>
          </div>

          <button style={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {viewOnly ? (
          <>
            <div style={styles.detailGrid}>
              {[...config.columns, ...config.fields.map((f) => [f.name, f.label])]
                .filter(([key], index, arr) => arr.findIndex(([k]) => k === key) === index)
                .filter(([key]) => key !== "password")
                .map(([key, label]) => (
                  <div style={styles.detailItem} key={key}>
                    <span>{label}</span>
                    <strong>
                      {["status", "kyc", "risk"].includes(key) ? (
                        <Badge value={form[key]} />
                      ) : (
                        String(form[key] ?? "-")
                      )}
                    </strong>
                  </div>
                ))}
            </div>

            <div style={styles.modalActions}>
              <button style={styles.secondaryBtn} onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <div style={styles.formGrid}>
              {mode !== "add" && (
                <label style={styles.formLabel}>
                  ID
                  <input
                    style={styles.input}
                    value={form.id || form._id || ""}
                    disabled
                  />
                </label>
              )}

              {config.fields.map((field) => (
                <label style={styles.formLabel} key={field.name}>
                  {field.label}
                  {field.required || (mode === "add" && field.requiredOnAdd)
                    ? " *"
                    : ""}

                  {field.type === "select" ? (
                    <select
                      style={styles.input}
                      value={form[field.name] || field.defaultValue || ""}
                      onChange={(e) => changeValue(field, e.target.value)}
                    >
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      style={styles.input}
                      type={field.type || "text"}
                      value={form[field.name] ?? ""}
                      placeholder={field.placeholder || ""}
                      onChange={(e) => changeValue(field, e.target.value)}
                    />
                  )}
                </label>
              ))}
            </div>

            <div style={styles.modalActions}>
              <button type="button" style={styles.secondaryBtn} onClick={onClose}>
                Cancel
              </button>
              <button style={styles.primaryBtn}>Save {config.title}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    display: "flex",
    background: "#f4f7fb",
    color: "#0f172a",
    fontFamily: "Inter, Arial, sans-serif",
  },

  appDark: {
    background: "#020617",
    color: "#f8fafc",
  },

  sidebar: {
    width: "280px",
    minHeight: "100vh",
    background: "linear-gradient(180deg, #020617, #071326)",
    color: "#ffffff",
    padding: "24px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "22px",
    borderRight: "1px solid rgba(247,210,139,0.28)",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },

  brandLogo: {
    width: "54px",
    height: "54px",
    borderRadius: "16px",
    border: "2px solid #f7d28b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#f7d28b",
    fontSize: "26px",
    fontWeight: "900",
    fontFamily: "Georgia, serif",
  },

  brandTitle: {
    margin: 0,
    fontSize: "22px",
  },

  brandSub: {
    color: "#94a3b8",
    fontSize: "13px",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  navButton: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: "14px",
    border: "1px solid transparent",
    background: "transparent",
    color: "#cbd5e1",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontWeight: "800",
    cursor: "pointer",
    textAlign: "left",
  },

  navButtonActive: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: "14px",
    border: "1px solid rgba(247,210,139,0.65)",
    background: "rgba(247,210,139,0.14)",
    color: "#f7d28b",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontWeight: "900",
    cursor: "pointer",
    textAlign: "left",
  },

  premiumBox: {
    marginTop: "auto",
    padding: "18px",
    borderRadius: "18px",
    background: "rgba(247,210,139,0.12)",
    border: "1px solid rgba(247,210,139,0.48)",
    color: "#f7d28b",
  },

  premiumText: {
    margin: "0 0 8px",
    color: "#e5e7eb",
    fontSize: "13px",
  },

  main: {
    flex: 1,
    minWidth: 0,
  },

  topbar: {
    height: "84px",
    padding: "0 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
  },

  searchBox: {
    width: "min(560px, 100%)",
    height: "46px",
    borderRadius: "16px",
    border: "1px solid #dbe3ef",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "0 16px",
    background: "#f8fafc",
  },

  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: "15px",
  },

  adminBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },

  adminRole: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  avatar: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "#071326",
    color: "#f7d28b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
  },

  logoutBtn: {
    border: "none",
    background: "#ef4444",
    color: "#ffffff",
    padding: "10px 14px",
    borderRadius: "12px",
    fontWeight: "800",
    cursor: "pointer",
  },

  content: {
    padding: "34px",
  },

  notice: {
    margin: "18px 34px 0",
    padding: "14px 18px",
    borderRadius: "14px",
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    fontWeight: "700",
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
  },

  noticeClose: {
    border: "none",
    background: "transparent",
    fontSize: "20px",
    cursor: "pointer",
    color: "#9a3412",
  },

  pageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18px",
    marginBottom: "24px",
  },

  pageTitle: {
    margin: 0,
    fontSize: "34px",
    color: "#0f172a",
  },

  pageText: {
    margin: "8px 0 0",
    color: "#64748b",
  },

  buttonRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },

  primaryBtn: {
    border: "none",
    background: "linear-gradient(135deg, #f7d28b, #d4af37)",
    color: "#071326",
    padding: "12px 18px",
    borderRadius: "12px",
    fontWeight: "900",
    cursor: "pointer",
  },

  secondaryBtn: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    padding: "12px 18px",
    borderRadius: "12px",
    fontWeight: "800",
    cursor: "pointer",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "18px",
    marginBottom: "22px",
  },

  statCard: {
    padding: "22px",
    borderRadius: "22px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 16px 35px rgba(15,23,42,0.08)",
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  statIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "18px",
    background: "#eef4ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "26px",
  },

  statLabel: {
    margin: 0,
    color: "#64748b",
    fontWeight: "800",
  },

  statValue: {
    margin: "6px 0",
    fontSize: "30px",
  },

  statSub: {
    color: "#94a3b8",
    fontSize: "13px",
  },

  moneyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px",
    marginBottom: "22px",
  },

  moneyCard: {
    padding: "22px",
    borderRadius: "22px",
    background: "linear-gradient(135deg, #071326, #0f172a)",
    color: "#ffffff",
    border: "1px solid rgba(247,210,139,0.35)",
  },

  twoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
  },

  panel: {
    padding: "24px",
    borderRadius: "22px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 16px 35px rgba(15,23,42,0.08)",
  },

  riskRow: {
    marginBottom: "16px",
  },

  riskTop: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
  },

  riskTrack: {
    height: "10px",
    borderRadius: "999px",
    background: "#e5e7eb",
    overflow: "hidden",
  },

  riskFill: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #22c55e, #f59e0b)",
  },

  activityList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  activityItem: {
    padding: "14px",
    borderRadius: "14px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
  },

  tableCard: {
    borderRadius: "22px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 16px 35px rgba(15,23,42,0.08)",
    overflow: "hidden",
  },

  tableWrap: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "15px",
    background: "#f8fafc",
    color: "#64748b",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "15px",
    borderBottom: "1px solid #f1f5f9",
    color: "#0f172a",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },

  emptyCell: {
    padding: "30px",
    textAlign: "center",
    color: "#64748b",
  },

  loadingBox: {
    padding: "40px",
    textAlign: "center",
    color: "#2563eb",
    fontWeight: "900",
  },

  actions: {
    display: "flex",
    gap: "8px",
  },

  viewBtn: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "8px 12px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  editBtn: {
    border: "none",
    background: "#f59e0b",
    color: "#ffffff",
    padding: "8px 12px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  deleteBtn: {
    border: "none",
    background: "#ef4444",
    color: "#ffffff",
    padding: "8px 12px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  badgeGood: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#166534",
    fontWeight: "900",
    fontSize: "12px",
  },

  badgeWarn: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#fef3c7",
    color: "#92400e",
    fontWeight: "900",
    fontSize: "12px",
  },

  badgeBad: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: "900",
    fontSize: "12px",
  },

  badgeNormal: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#e0f2fe",
    color: "#075985",
    fontWeight: "900",
    fontSize: "12px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,8,23,0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    zIndex: 99999,
  },

  modal: {
    width: "min(920px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    borderRadius: "24px",
    background: "#ffffff",
    color: "#0f172a",
    padding: "26px",
    boxShadow: "0 30px 100px rgba(0,0,0,0.5)",
  },

  modalTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    marginBottom: "22px",
  },

  modalTitle: {
    margin: 0,
    fontSize: "26px",
  },

  closeBtn: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    border: "none",
    background: "#f1f5f9",
    fontSize: "24px",
    cursor: "pointer",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },

  formLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#334155",
    fontWeight: "800",
  },

  input: {
    width: "100%",
    height: "44px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    boxSizing: "border-box",
    outline: "none",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "22px",
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },

  detailItem: {
    padding: "16px",
    borderRadius: "14px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  loginFallbackPage: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #020617, #071326)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px",
    color: "#ffffff",
    fontFamily: "Inter, Arial, sans-serif",
  },

  loginFallbackCard: {
    width: "min(480px, 100%)",
    padding: "40px",
    borderRadius: "28px",
    textAlign: "center",
    background: "rgba(8,21,42,0.92)",
    border: "1px solid rgba(247,210,139,0.55)",
  },

  logoCircle: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    border: "2px solid #f7d28b",
    color: "#f7d28b",
    margin: "0 auto 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    fontWeight: "900",
    fontFamily: "Georgia, serif",
  },
};