import { useEffect, useState } from "react";

const CUSTOMERS_API = "http://localhost:5000/api/admin/customers";

const defaultBranches = [
  {
    id: "1",
    code: "BR001",
    name: "Main Branch",
    location: "123 Financial Street, New York",
    contact: "212-555-1234",
    email: "main@finsecure.com",
    employees: 24,
    accounts: 1250,
  },
  {
    id: "2",
    code: "BR002",
    name: "Downtown Branch",
    location: "456 Central Avenue, Chicago",
    contact: "312-555-6789",
    email: "downtown@finsecure.com",
    employees: 18,
    accounts: 876,
  },
  {
    id: "3",
    code: "BR003",
    name: "Westside Branch",
    location: "789 Westlake Drive, Los Angeles",
    contact: "213-555-4321",
    email: "westside@finsecure.com",
    employees: 15,
    accounts: 632,
  },
  {
    id: "4",
    code: "TU500",
    name: "Tirupati",
    location: "Tetagunta, Annavaram, Andhra Pradesh",
    contact: "09618823271",
    email: "tirupati@finsecure.com",
    employees: 0,
    accounts: 0,
  },
];

export default function AdminDashboard() {
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedPage, setSelectedPage] = useState("dashboard");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState(null);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [toast, setToast] = useState("");

  const adminName = localStorage.getItem("userName") || "Admin User";
  const adminEmail = localStorage.getItem("userEmail") || "Admin";

  const [branchForm, setBranchForm] = useState({
    code: "",
    name: "",
    location: "",
    contact: "",
    email: "",
    employees: "",
    accounts: "",
  });

  const totalIncome = customers.reduce(
    (sum, customer) => sum + Number(customer.totalIncome || 0),
    0
  );

  const totalExpense = customers.reduce(
    (sum, customer) => sum + Number(customer.totalExpense || 0),
    0
  );

  const totalBalance = customers.reduce(
    (sum, customer) => sum + Number(customer.balance || 0),
    0
  );

  const totalTransactions = customers.reduce(
    (sum, customer) => sum + Number(customer.transactionsCount || 0),
    0
  );

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(CUSTOMERS_API);

      if (!res.ok) {
        throw new Error("Backend API error");
      }

      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Admin fetch error:", err);
      setError("Cannot connect to backend");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = () => {
    const savedBranches = localStorage.getItem("branches");

    if (savedBranches) {
      setBranches(JSON.parse(savedBranches));
    } else {
      setBranches(defaultBranches);
      localStorage.setItem("branches", JSON.stringify(defaultBranches));
    }
  };

  const saveBranches = (updatedBranches) => {
    setBranches(updatedBranches);
    localStorage.setItem("branches", JSON.stringify(updatedBranches));
  };

  useEffect(() => {
    fetchCustomers();
    loadBranches();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");

    window.location.href = "/";
  };

  const handlePageChange = (page) => {
    setSelectedPage(page);
    setSelectedCustomer(null);
    setShowNotifications(false);
    setShowHelp(false);
  };

  const openCustomerDetails = (customer) => {
    setSelectedCustomer(customer);
    setSelectedPage("customerDetails");
  };

  const resetBranchForm = () => {
    setBranchForm({
      code: "",
      name: "",
      location: "",
      contact: "",
      email: "",
      employees: "",
      accounts: "",
    });

    setEditingBranchId(null);
    setShowBranchForm(false);
  };

  const handleBranchChange = (e) => {
    setBranchForm({
      ...branchForm,
      [e.target.name]: e.target.value,
    });
  };

  const openAddBranchForm = () => {
    setBranchForm({
      code: "",
      name: "",
      location: "",
      contact: "",
      email: "",
      employees: "",
      accounts: "",
    });

    setEditingBranchId(null);
    setShowBranchForm(true);
  };

  const openEditBranchForm = (branch) => {
    setBranchForm({
      code: branch.code,
      name: branch.name,
      location: branch.location,
      contact: branch.contact,
      email: branch.email,
      employees: branch.employees,
      accounts: branch.accounts,
    });

    setEditingBranchId(branch.id);
    setShowBranchForm(true);
  };

  const saveBranch = (e) => {
    e.preventDefault();

    if (
      !branchForm.code ||
      !branchForm.name ||
      !branchForm.location ||
      !branchForm.contact ||
      !branchForm.email
    ) {
      alert("Please fill all branch details");
      return;
    }

    if (editingBranchId) {
      const updatedBranches = branches.map((branch) =>
        branch.id === editingBranchId
          ? {
              ...branch,
              code: branchForm.code,
              name: branchForm.name,
              location: branchForm.location,
              contact: branchForm.contact,
              email: branchForm.email,
              employees: Number(branchForm.employees || 0),
              accounts: Number(branchForm.accounts || 0),
            }
          : branch
      );

      saveBranches(updatedBranches);
      resetBranchForm();
      showToast("Branch updated successfully");
    } else {
      const newBranch = {
        id: Date.now().toString(),
        code: branchForm.code,
        name: branchForm.name,
        location: branchForm.location,
        contact: branchForm.contact,
        email: branchForm.email,
        employees: Number(branchForm.employees || 0),
        accounts: Number(branchForm.accounts || 0),
      };

      saveBranches([...branches, newBranch]);
      resetBranchForm();
      showToast("Branch added successfully");
    }
  };

  const deleteBranch = (branchId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this branch?"
    );

    if (!confirmDelete) return;

    const updatedBranches = branches.filter((branch) => branch.id !== branchId);
    saveBranches(updatedBranches);
    showToast("Branch deleted successfully");
  };

  const resetBranches = () => {
    localStorage.setItem("branches", JSON.stringify(defaultBranches));
    setBranches(defaultBranches);
    showToast("Branches reset successfully");
  };

  return (
    <div style={styles.page}>
      {sidebarOpen && (
        <aside style={styles.sidebar}>
          <div style={styles.logoBox}>
            <span style={styles.logoIcon}>FS</span>
            <span style={styles.logoText}>FinSecure</span>
          </div>

          <div style={styles.userBox}>
            <div style={styles.avatar}>👤</div>

            <div>
              <h3 style={styles.userName}>{adminName}</h3>
              <p style={styles.userRole}>{adminEmail}</p>
            </div>
          </div>

          <nav style={styles.nav}>
            <button
              style={
                selectedPage === "dashboard"
                  ? styles.navButtonActive
                  : styles.navButton
              }
              onClick={() => handlePageChange("dashboard")}
            >
              🏠 Dashboard
            </button>

            <button
              style={
                selectedPage === "customers" ||
                selectedPage === "customerDetails"
                  ? styles.navButtonActive
                  : styles.navButton
              }
              onClick={() => handlePageChange("customers")}
            >
              👥 Customers
            </button>

            <button
              style={
                selectedPage === "branches"
                  ? styles.navButtonActive
                  : styles.navButton
              }
              onClick={() => handlePageChange("branches")}
            >
              🏦 Branches
            </button>

            <button
              style={
                selectedPage === "transactions"
                  ? styles.navButtonActive
                  : styles.navButton
              }
              onClick={() => handlePageChange("transactions")}
            >
              💰 Transactions
            </button>

            <button
              style={
                selectedPage === "reports"
                  ? styles.navButtonActive
                  : styles.navButton
              }
              onClick={() => handlePageChange("reports")}
            >
              📊 Reports
            </button>

            <button
              style={
                selectedPage === "logs" ? styles.navButtonActive : styles.navButton
              }
              onClick={() => handlePageChange("logs")}
            >
              🧾 System Logs
            </button>

            <button
              style={
                selectedPage === "settings"
                  ? styles.navButtonActive
                  : styles.navButton
              }
              onClick={() => handlePageChange("settings")}
            >
              ⚙️ Settings
            </button>
          </nav>

          <button onClick={logout} style={styles.logoutBtn}>
            🚪 Logout
          </button>
        </aside>
      )}

      <main style={styles.main}>
        <header style={styles.topbar}>
          <div style={styles.topLeft}>
            <button
              style={styles.menuButton}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>

            <h2 style={styles.pageTitle}>
              {selectedPage === "dashboard" && "Admin Dashboard"}
              {selectedPage === "customers" && "Customer Management"}
              {selectedPage === "customerDetails" && "Customer Details"}
              {selectedPage === "branches" && "Branch Management"}
              {selectedPage === "transactions" && "Transaction Overview"}
              {selectedPage === "reports" && "Reports"}
              {selectedPage === "logs" && "System Logs"}
              {selectedPage === "settings" && "Settings"}
            </h2>
          </div>

          <div style={styles.topIcons}>
            <div style={styles.dropdownBox}>
              <button
                style={styles.iconButton}
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowHelp(false);
                }}
              >
                🔔
              </button>

              {showNotifications && (
                <div style={styles.dropdown}>
                  <h3 style={styles.dropdownTitle}>Notifications</h3>
                  <p style={styles.dropdownItem}>✅ Admin dashboard opened</p>
                  <p style={styles.dropdownItem}>👥 Customers loaded</p>
                  <p style={styles.dropdownItem}>🏦 Branch management active</p>

                  <button
                    style={styles.closeSmallBtn}
                    onClick={() => setShowNotifications(false)}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

            <div style={styles.dropdownBox}>
              <button
                style={styles.helpButton}
                onClick={() => {
                  setShowHelp(!showHelp);
                  setShowNotifications(false);
                }}
              >
                ?
              </button>

              {showHelp && (
                <div style={styles.dropdown}>
                  <h3 style={styles.dropdownTitle}>Help</h3>
                  <p style={styles.dropdownItem}>
                    Use Customers to view customer financial details.
                  </p>
                  <p style={styles.dropdownItem}>
                    Use Branches to add, edit, or delete branch records.
                  </p>
                  <p style={styles.dropdownItem}>
                    Use Reports to see total customers, income, expense, and
                    transactions.
                  </p>

                  <button
                    style={styles.closeSmallBtn}
                    onClick={() => setShowHelp(false)}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section style={styles.content}>
          {selectedPage === "dashboard" && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h1 style={styles.cardTitle}>Overview</h1>

                <button onClick={fetchCustomers} style={styles.primaryBtn}>
                  🔄 Refresh Data
                </button>
              </div>

              <div style={styles.detailGrid}>
                <div style={styles.detailCard}>
                  <h3>Total Customers</h3>
                  <p>{customers.length}</p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Total Branches</h3>
                  <p>{branches.length}</p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Total Income</h3>
                  <p style={{ color: "#16a34a" }}>₹{totalIncome}</p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Total Expense</h3>
                  <p style={{ color: "#dc2626" }}>₹{totalExpense}</p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Total Balance</h3>
                  <p style={{ color: "#001f5c" }}>₹{totalBalance}</p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Total Transactions</h3>
                  <p>{totalTransactions}</p>
                </div>
              </div>

              <div style={styles.quickActions}>
                <button
                  style={styles.primaryBtn}
                  onClick={() => handlePageChange("customers")}
                >
                  View Customers
                </button>

                <button
                  style={styles.primaryBtn}
                  onClick={() => handlePageChange("branches")}
                >
                  Manage Branches
                </button>

                <button
                  style={styles.primaryBtn}
                  onClick={() => handlePageChange("reports")}
                >
                  View Reports
                </button>
              </div>
            </div>
          )}

          {selectedPage === "customers" && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h1 style={styles.cardTitle}>Customers</h1>

                <button onClick={fetchCustomers} style={styles.primaryBtn}>
                  🔄 Refresh Data
                </button>
              </div>

              {loading && (
                <p style={{ color: "#2563eb", fontWeight: "bold" }}>
                  Loading customers...
                </p>
              )}

              {error && (
                <p style={{ color: "red", fontWeight: "bold" }}>{error}</p>
              )}

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Total Income</th>
                      <th style={styles.th}>Total Expense</th>
                      <th style={styles.th}>Balance</th>
                      <th style={styles.th}>Transactions</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {customers.length === 0 && !loading ? (
                      <tr>
                        <td colSpan="7" style={styles.emptyCell}>
                          No customers found
                        </td>
                      </tr>
                    ) : (
                      customers.map((customer) => (
                        <tr key={customer.id} style={styles.tr}>
                          <td style={styles.td}>
                            <strong>{customer.name}</strong>
                          </td>
                          <td style={styles.td}>{customer.email}</td>
                          <td style={styles.tdIncome}>
                            ₹{customer.totalIncome}
                          </td>
                          <td style={styles.tdExpense}>
                            ₹{customer.totalExpense}
                          </td>
                          <td style={styles.tdBalance}>₹{customer.balance}</td>
                          <td style={styles.td}>
                            {customer.transactionsCount}
                          </td>
                          <td style={styles.td}>
                            <button
                              style={styles.viewBtn}
                              onClick={() => openCustomerDetails(customer)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedPage === "customerDetails" && selectedCustomer && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h1 style={styles.cardTitle}>Customer Details</h1>

                <button
                  style={styles.primaryBtn}
                  onClick={() => handlePageChange("customers")}
                >
                  ← Back to Customers
                </button>
              </div>

              <div style={styles.detailGrid}>
                <div style={styles.detailCard}>
                  <h3>Name</h3>
                  <p>{selectedCustomer.name}</p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Email</h3>
                  <p>{selectedCustomer.email}</p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Total Income</h3>
                  <p style={{ color: "#16a34a" }}>
                    ₹{selectedCustomer.totalIncome}
                  </p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Total Expense</h3>
                  <p style={{ color: "#dc2626" }}>
                    ₹{selectedCustomer.totalExpense}
                  </p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Balance</h3>
                  <p style={{ color: "#001f5c" }}>
                    ₹{selectedCustomer.balance}
                  </p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Transactions</h3>
                  <p>{selectedCustomer.transactionsCount}</p>
                </div>
              </div>
            </div>
          )}

          {selectedPage === "branches" && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h1 style={styles.cardTitle}>Branches</h1>

                <button onClick={openAddBranchForm} style={styles.primaryBtn}>
                  ➕ Add New Branch
                </button>
              </div>

              {showBranchForm && (
                <form onSubmit={saveBranch} style={styles.branchForm}>
                  <h2 style={styles.formTitle}>
                    {editingBranchId ? "Edit Branch" : "Add New Branch"}
                  </h2>

                  <div style={styles.formGrid}>
                    <input
                      name="code"
                      placeholder="Branch Code"
                      value={branchForm.code}
                      onChange={handleBranchChange}
                      style={styles.input}
                    />

                    <input
                      name="name"
                      placeholder="Branch Name"
                      value={branchForm.name}
                      onChange={handleBranchChange}
                      style={styles.input}
                    />

                    <input
                      name="location"
                      placeholder="Location"
                      value={branchForm.location}
                      onChange={handleBranchChange}
                      style={styles.input}
                    />

                    <input
                      name="contact"
                      placeholder="Contact Number"
                      value={branchForm.contact}
                      onChange={handleBranchChange}
                      style={styles.input}
                    />

                    <input
                      name="email"
                      placeholder="Branch Email"
                      value={branchForm.email}
                      onChange={handleBranchChange}
                      style={styles.input}
                    />

                    <input
                      name="employees"
                      type="number"
                      placeholder="Employees"
                      value={branchForm.employees}
                      onChange={handleBranchChange}
                      style={styles.input}
                    />

                    <input
                      name="accounts"
                      type="number"
                      placeholder="Accounts"
                      value={branchForm.accounts}
                      onChange={handleBranchChange}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formActions}>
                    <button type="submit" style={styles.saveBtn}>
                      {editingBranchId ? "Update Branch" : "Save Branch"}
                    </button>

                    <button
                      type="button"
                      onClick={resetBranchForm}
                      style={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Branch Code</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Location</th>
                      <th style={styles.th}>Contact</th>
                      <th style={styles.th}>Employees</th>
                      <th style={styles.th}>Accounts</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {branches.map((branch) => (
                      <tr key={branch.id} style={styles.tr}>
                        <td style={styles.td}>{branch.code}</td>
                        <td style={styles.td}>
                          <strong>{branch.name}</strong>
                        </td>
                        <td style={styles.td}>{branch.location}</td>
                        <td style={styles.td}>
                          <strong>{branch.contact}</strong>
                          <br />
                          <small style={{ color: "#64748b" }}>
                            {branch.email}
                          </small>
                        </td>
                        <td style={styles.td}>{branch.employees}</td>
                        <td style={styles.td}>{branch.accounts}</td>
                        <td style={styles.td}>
                          <button
                            style={styles.editBtn}
                            onClick={() => openEditBranchForm(branch)}
                          >
                            Edit
                          </button>

                          <button
                            style={styles.deleteBtn}
                            onClick={() => deleteBranch(branch.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedPage === "transactions" && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h1 style={styles.cardTitle}>Transaction Overview</h1>

                <button onClick={fetchCustomers} style={styles.primaryBtn}>
                  🔄 Refresh
                </button>
              </div>

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Customer</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Transactions Count</th>
                      <th style={styles.th}>Balance</th>
                    </tr>
                  </thead>

                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id}>
                        <td style={styles.td}>{customer.name}</td>
                        <td style={styles.td}>{customer.email}</td>
                        <td style={styles.td}>{customer.transactionsCount}</td>
                        <td style={styles.tdBalance}>₹{customer.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedPage === "reports" && (
            <div style={styles.card}>
              <h1 style={styles.cardTitle}>Reports</h1>

              <div style={styles.detailGrid}>
                <div style={styles.detailCard}>
                  <h3>Total Customers</h3>
                  <p>{customers.length}</p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Total Branches</h3>
                  <p>{branches.length}</p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Total Income</h3>
                  <p style={{ color: "#16a34a" }}>₹{totalIncome}</p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Total Expense</h3>
                  <p style={{ color: "#dc2626" }}>₹{totalExpense}</p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Total Balance</h3>
                  <p style={{ color: "#001f5c" }}>₹{totalBalance}</p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Total Transactions</h3>
                  <p>{totalTransactions}</p>
                </div>
              </div>
            </div>
          )}

          {selectedPage === "logs" && (
            <div style={styles.card}>
              <h1 style={styles.cardTitle}>System Logs</h1>
              <p style={styles.normalText}>✅ Admin dashboard opened.</p>
              <p style={styles.normalText}>✅ Customer data loaded from backend.</p>
              <p style={styles.normalText}>✅ Branch management enabled.</p>
              <p style={styles.normalText}>✅ All admin buttons are active.</p>
            </div>
          )}

          {selectedPage === "settings" && (
            <div style={styles.card}>
              <h1 style={styles.cardTitle}>Settings</h1>

              <div style={styles.detailGrid}>
                <div style={styles.detailCard}>
                  <h3>Admin Name</h3>
                  <p>{adminName}</p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Admin Email</h3>
                  <p>{adminEmail}</p>
                </div>

                <div style={styles.detailCard}>
                  <h3>Saved Branches</h3>
                  <p>{branches.length}</p>
                </div>
              </div>

              <div style={styles.quickActions}>
                <button
                  style={styles.primaryBtn}
                  onClick={() => showToast("Settings saved successfully")}
                >
                  Save Settings
                </button>

                <button style={styles.deleteBtn} onClick={resetBranches}>
                  Reset Branches
                </button>
              </div>
            </div>
          )}
        </section>

        {toast && (
          <div style={styles.toast}>
            <div style={styles.toastIcon}>✓</div>
            <div>
              <strong>{toast}</strong>
              <p style={styles.toastText}>Action completed successfully.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    background: "#f4f7fb",
    fontFamily: "Inter, Arial, Helvetica, sans-serif",
  },

  sidebar: {
    width: "270px",
    background: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    padding: "28px 22px",
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
  },

  logoBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "40px",
  },

  logoIcon: {
    fontSize: "26px",
    fontWeight: "900",
    color: "#001f5c",
  },

  logoText: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#111827",
  },

  userBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    paddingBottom: "25px",
    borderBottom: "1px solid #e5e7eb",
    marginBottom: "25px",
  },

  avatar: {
    width: "58px",
    height: "58px",
    borderRadius: "50%",
    background: "#eef3fb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
  },

  userName: {
    margin: 0,
    fontSize: "17px",
    color: "#111827",
  },

  userRole: {
    margin: "4px 0 0",
    color: "#6b7280",
    fontSize: "14px",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  navButton: {
    padding: "14px 16px",
    borderRadius: "12px",
    color: "#4b5563",
    background: "transparent",
    border: "none",
    fontSize: "16px",
    cursor: "pointer",
    textAlign: "left",
  },

  navButtonActive: {
    padding: "14px 16px",
    borderRadius: "12px",
    background: "#eef4ff",
    color: "#2563eb",
    fontSize: "16px",
    fontWeight: "700",
    border: "none",
    borderLeft: "4px solid #2563eb",
    cursor: "pointer",
    textAlign: "left",
  },

  logoutBtn: {
    marginTop: "auto",
    padding: "13px 16px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#374151",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "15px",
    textAlign: "left",
  },

  main: {
    flex: 1,
    minHeight: "100vh",
  },

  topbar: {
    height: "84px",
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 34px",
  },

  topLeft: {
    display: "flex",
    alignItems: "center",
    gap: "22px",
  },

  menuButton: {
    border: "none",
    background: "transparent",
    fontSize: "24px",
    cursor: "pointer",
    color: "#374151",
  },

  pageTitle: {
    margin: 0,
    fontSize: "24px",
    color: "#111827",
  },

  topIcons: {
    display: "flex",
    gap: "15px",
    alignItems: "center",
  },

  dropdownBox: {
    position: "relative",
  },

  iconButton: {
    border: "none",
    background: "transparent",
    fontSize: "22px",
    cursor: "pointer",
  },

  helpButton: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: "2px solid #9ca3af",
    background: "white",
    cursor: "pointer",
    fontWeight: "bold",
    color: "#374151",
  },

  dropdown: {
    position: "absolute",
    top: "42px",
    right: "0",
    width: "300px",
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    padding: "16px",
    zIndex: 1000,
  },

  dropdownTitle: {
    margin: "0 0 12px",
    fontSize: "16px",
    color: "#111827",
  },

  dropdownItem: {
    margin: "10px 0",
    color: "#374151",
    fontSize: "14px",
  },

  closeSmallBtn: {
    marginTop: "10px",
    width: "100%",
    padding: "9px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    fontWeight: "700",
    cursor: "pointer",
  },

  content: {
    padding: "42px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "30px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e5e7eb",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "24px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "28px",
    color: "#111827",
  },

  primaryBtn: {
    background: "#001f5c",
    color: "#ffffff",
    border: "none",
    padding: "14px 22px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "15px",
  },

  quickActions: {
    marginTop: "24px",
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
  },

  branchForm: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "24px",
  },

  formTitle: {
    marginTop: 0,
    color: "#111827",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "14px",
  },

  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
  },

  formActions: {
    marginTop: "18px",
    display: "flex",
    gap: "12px",
  },

  saveBtn: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "12px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  cancelBtn: {
    background: "#6b7280",
    color: "white",
    border: "none",
    padding: "12px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  viewBtn: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    fontWeight: "700",
    cursor: "pointer",
  },

  editBtn: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "8px",
    fontWeight: "700",
    cursor: "pointer",
    marginRight: "8px",
  },

  deleteBtn: {
    background: "#ef4444",
    color: "#ffffff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "8px",
    fontWeight: "700",
    cursor: "pointer",
  },

  tableWrapper: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#ffffff",
  },

  th: {
    textAlign: "left",
    background: "#f8fafc",
    color: "#64748b",
    padding: "16px",
    fontSize: "14px",
    borderBottom: "1px solid #e5e7eb",
  },

  tr: {
    borderBottom: "1px solid #e5e7eb",
  },

  td: {
    padding: "18px 16px",
    color: "#111827",
    fontSize: "15px",
  },

  tdIncome: {
    padding: "18px 16px",
    color: "#16a34a",
    fontWeight: "700",
  },

  tdExpense: {
    padding: "18px 16px",
    color: "#dc2626",
    fontWeight: "700",
  },

  tdBalance: {
    padding: "18px 16px",
    color: "#001f5c",
    fontWeight: "800",
  },

  emptyCell: {
    textAlign: "center",
    padding: "25px",
    color: "#6b7280",
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
  },

  detailCard: {
    background: "#f8fafc",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    color: "#111827",
  },

  normalText: {
    color: "#374151",
    fontSize: "16px",
  },

  toast: {
    position: "fixed",
    right: "32px",
    bottom: "28px",
    background: "#ffffff",
    color: "#111827",
    padding: "18px 22px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow: "0 12px 35px rgba(15, 23, 42, 0.18)",
    borderLeft: "5px solid #22c55e",
    zIndex: 1000,
  },

  toastIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "#22c55e",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "20px",
  },

  toastText: {
    margin: "4px 0 0",
    color: "#6b7280",
  },
};