import React, { useEffect, useMemo, useState } from "react";
import AdminPanel from "./AdminPanel";
import Dashboard from "./Dashboard";
import "./App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "http://127.0.0.1:5000"
    : "https://finsecure-ai-backend.vercel.app")
).replace(/\/$/, "");

const normalizeRole = (role = "") => {
  return String(role || "")
    .toLowerCase()
    .trim()
    .replace(/_/g, " ")
    .replace(/-/g, " ");
};

const isAdminRole = (role = "") => {
  const normalizedRole = normalizeRole(role);

  const adminRoles = [
    "admin",
    "super",
    "super admin",
    "superadmin",
    "super administrator",
    "branch manager",
    "manager",
    "staff",
    "cashier",
    "loan officer",
    "loan manager",
    "customer support",
    "customer support executive",
    "support executive",
    "relationship manager",
    "admin officer",
    "fraud analyst",
    "report analyst",
    "reports analyst",
  ];

  return adminRoles.includes(normalizedRole);
};

const isCustomerRole = (role = "") => {
  return normalizeRole(role) === "customer";
};

const getUserFromResult = (result) => {
  return (
    result?.user ||
    result?.data ||
    result?.account ||
    result?.customer ||
    result?.admin ||
    null
  );
};

export default function App() {
  const [mode, setMode] = useState("login");
  const [page, setPage] = useState("auth");
  const [branches, setBranches] = useState([]);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    phone: "",
    aadhaarNumber: "",
    panNumber: "",
    branch: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentUser = useMemo(() => {
    try {
      const saved =
        localStorage.getItem("finsecure_user") ||
        localStorage.getItem("finsecure_admin") ||
        localStorage.getItem("finsecure_customer") ||
        localStorage.getItem("user");

      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [page]);

  const clearSession = () => {
    localStorage.removeItem("finsecure_token");
    localStorage.removeItem("token");

    localStorage.removeItem("finsecure_user");
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");

    localStorage.removeItem("finsecure_admin");
    localStorage.removeItem("admin");
    localStorage.removeItem("adminData");
    localStorage.removeItem("loggedInAdmin");
    localStorage.removeItem("adminToken");

    localStorage.removeItem("finsecure_customer");
    localStorage.removeItem("customer");
    localStorage.removeItem("customerData");

    localStorage.removeItem("role");
    localStorage.removeItem("userRole");
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("isLoggedIn");

    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userPhone");
    localStorage.removeItem("userAadhaar");
    localStorage.removeItem("userPan");
  };

  const goTo = (newPage) => {
    setPage(newPage);

    if (newPage === "admin") {
      window.history.pushState({}, "", "/admin");
      return;
    }

    if (newPage === "customer") {
      window.history.pushState({}, "", "/dashboard");
      return;
    }

    window.history.pushState({}, "", "/");
  };

  const saveSession = (result) => {
    const user = getUserFromResult(result);
    const token = result?.token;

    if (!user || !token) {
      throw new Error("Invalid login response from backend");
    }

    const role =
      user.role ||
      user.accountRole ||
      user.userRole ||
      user.type ||
      "customer";

    const safeUser = {
      ...user,
      role,
    };

    localStorage.setItem("finsecure_token", token);
    localStorage.setItem("token", token);

    localStorage.setItem("finsecure_user", JSON.stringify(safeUser));
    localStorage.setItem("user", JSON.stringify(safeUser));
    localStorage.setItem("currentUser", JSON.stringify(safeUser));

    localStorage.setItem("role", role);
    localStorage.setItem("userRole", role);

    localStorage.setItem("userName", safeUser.name || "Customer");
    localStorage.setItem("userEmail", safeUser.email || "");
    localStorage.setItem("userPhone", safeUser.phone || safeUser.phoneNumber || "");
    localStorage.setItem("userAadhaar", safeUser.aadhaarNumber || "");
    localStorage.setItem("userPan", safeUser.panNumber || "");

    if (isAdminRole(role)) {
      localStorage.setItem("finsecure_admin", JSON.stringify(safeUser));
      localStorage.setItem("admin", JSON.stringify(safeUser));
      localStorage.setItem("adminData", JSON.stringify(safeUser));
      localStorage.setItem("loggedInAdmin", JSON.stringify(safeUser));
      localStorage.setItem("adminToken", token);
      localStorage.setItem("adminLoggedIn", "true");
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("isLoggedIn", "true");

      localStorage.removeItem("finsecure_customer");
      localStorage.removeItem("customer");
      localStorage.removeItem("customerData");
    }

    if (isCustomerRole(role)) {
      localStorage.setItem("finsecure_customer", JSON.stringify(safeUser));
      localStorage.setItem("customer", JSON.stringify(safeUser));
      localStorage.setItem("customerData", JSON.stringify(safeUser));

      localStorage.removeItem("finsecure_admin");
      localStorage.removeItem("admin");
      localStorage.removeItem("adminData");
      localStorage.removeItem("loggedInAdmin");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminLoggedIn");
    }

    return safeUser;
  };

  const redirectByRole = (user) => {
    const role =
      user?.role ||
      user?.accountRole ||
      user?.userRole ||
      user?.type ||
      "customer";

    if (isAdminRole(role)) {
      goTo("admin");
      return;
    }

    if (isCustomerRole(role)) {
      goTo("customer");
      return;
    }

    throw new Error(`Unknown user role: ${role}`);
  };

  useEffect(() => {
    const savedUser =
      localStorage.getItem("finsecure_user") ||
      localStorage.getItem("finsecure_admin") ||
      localStorage.getItem("finsecure_customer") ||
      localStorage.getItem("user");

    const savedToken =
      localStorage.getItem("finsecure_token") ||
      localStorage.getItem("adminToken") ||
      localStorage.getItem("token");

    const path = window.location.pathname;

    if (savedUser && savedToken) {
      try {
        const user = JSON.parse(savedUser);
        const role =
          user?.role ||
          user?.accountRole ||
          user?.userRole ||
          user?.type ||
          "";

        if (path.includes("/admin")) {
          if (isAdminRole(role)) {
            setPage("admin");
            return;
          }

          clearSession();
          setPage("auth");
          setMode("login");
          return;
        }

        if (path.includes("/dashboard")) {
          if (isCustomerRole(role)) {
            setPage("customer");
            return;
          }

          if (isAdminRole(role)) {
            setPage("admin");
            window.history.replaceState({}, "", "/admin");
            return;
          }
        }

        if (isAdminRole(role)) {
          setPage("admin");
          window.history.replaceState({}, "", "/admin");
          return;
        }

        if (isCustomerRole(role)) {
          setPage("customer");
          window.history.replaceState({}, "", "/dashboard");
          return;
        }
      } catch {
        clearSession();
      }
    }

    setPage("auth");
    setMode("login");
  }, []);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/branches`);
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setBranches(result.data);
      } else {
        setBranches([]);
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
      setBranches([]);
    }
  };

  const handleLoginChange = (field, value) => {
    setError("");
    setSuccess("");
    setLoginForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRegisterChange = (field, value) => {
    setError("");
    setSuccess("");
    setRegisterForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!loginForm.email || !loginForm.password) {
      setError("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Invalid email or password");
      }

      const user = saveSession(result);

      setSuccess("Login successful");
      redirectByRole(user);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminDirectLogin = async () => {
    setLoginForm({
      email: "admin@finsecure.ai",
      password: "admin123",
    });

    setError("");
    setSuccess("");

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "admin@finsecure.ai",
          password: "admin123",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Admin login failed");
      }

      const user = saveSession(result);

      if (!isAdminRole(user?.role)) {
        throw new Error("This account is not an admin account");
      }

      goTo("admin");
    } catch (err) {
      setError(err.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!registerForm.name.trim()) {
      setError("Full name is required");
      return;
    }

    if (!registerForm.phone.trim()) {
      setError("Phone number is required");
      return;
    }

    if (!registerForm.email.trim()) {
      setError("Email is required");
      return;
    }

    if (!registerForm.password || registerForm.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const selectedBranch = registerForm.branch || "Main Branch";

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: registerForm.name,
          phone: registerForm.phone,
          aadhaarNumber: registerForm.aadhaarNumber,
          panNumber: registerForm.panNumber,
          branch: selectedBranch,
          email: registerForm.email,
          password: registerForm.password,
          role: "customer",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Registration failed");
      }

      const user = saveSession(result);
      setSuccess("Customer registered successfully");

      if (isCustomerRole(user?.role)) {
        goTo("customer");
      } else {
        goTo("customer");
      }
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();

    setLoginForm({
      email: "",
      password: "",
    });

    setRegisterForm({
      name: "",
      phone: "",
      aadhaarNumber: "",
      panNumber: "",
      branch: "",
      email: "",
      password: "",
    });

    setMode("login");
    setPage("auth");
    window.history.pushState({}, "", "/");
  };

  if (page === "admin") {
    return <AdminPanel user={currentUser} onLogout={logout} />;
  }

  if (page === "customer") {
    return <Dashboard user={currentUser} onLogout={logout} />;
  }

  return (
    <div style={styles.page}>
      <div style={styles.backgroundGlowOne} />
      <div style={styles.backgroundGlowTwo} />

      <div style={styles.card}>
        <div style={styles.logoBox}>FS</div>

        <div style={styles.badge}>AI-Powered FinTech Platform</div>

        <h1 style={styles.title}>FinSecure AI</h1>

        <p style={styles.subtitle}>
          {mode === "login"
            ? "One secure login for Admin and Customer banking portals."
            : "Create your customer account securely on the same page."}
        </p>

        {mode === "login" ? (
          <form onSubmit={handleLogin} style={styles.form}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="Enter email"
              value={loginForm.email}
              onChange={(e) => handleLoginChange("email", e.target.value)}
            />

            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrap}>
              <input
                style={styles.passwordInput}
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={loginForm.password}
                onChange={(e) => handleLoginChange("password", e.target.value)}
              />

              <button
                type="button"
                style={styles.eyeButton}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                👁️
              </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.success}>{success}</div>}

            <button type="submit" style={styles.loginButton} disabled={loading}>
              {loading ? "Please wait..." : "Login Securely"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={styles.form}>
            <label style={styles.label}>Full Name</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter customer full name"
              value={registerForm.name}
              onChange={(e) => handleRegisterChange("name", e.target.value)}
            />

            <label style={styles.label}>Phone Number</label>
            <input
              style={styles.input}
              type="tel"
              placeholder="Enter phone number"
              value={registerForm.phone}
              onChange={(e) => handleRegisterChange("phone", e.target.value)}
            />

            <label style={styles.label}>Aadhaar Number</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter Aadhaar number"
              value={registerForm.aadhaarNumber}
              onChange={(e) =>
                handleRegisterChange(
                  "aadhaarNumber",
                  e.target.value.replace(/\D/g, "")
                )
              }
              maxLength={12}
            />

            <label style={styles.label}>PAN Number</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter PAN number"
              value={registerForm.panNumber}
              onChange={(e) =>
                handleRegisterChange("panNumber", e.target.value.toUpperCase())
              }
              maxLength={10}
            />

            <label style={styles.label}>Select Branch</label>
            <select
  value={adminForm.branch || ""}
  onChange={(e) => {
    const selectedBranchName = e.target.value;

    const selectedBranch = branches.find(
      (branch) =>
        branch.branchName === selectedBranchName ||
        branch.name === selectedBranchName ||
        branch.branch === selectedBranchName
    );

    setAdminForm({
      ...adminForm,
      branch: selectedBranchName,
      branchName: selectedBranchName,
      branchCode:
        selectedBranch?.branchCode ||
        selectedBranch?.code ||
        "",
      ifsc:
        selectedBranch?.ifsc ||
        selectedBranch?.ifscCode ||
        "",
      ifscCode:
        selectedBranch?.ifsc ||
        selectedBranch?.ifscCode ||
        "",
    });
  }}
  required
>
  <option value="">Select Branch</option>

  {branches.map((branch) => {
    const branchName =
      branch.branchName ||
      branch.name ||
      branch.branch ||
      "";

    const ifscCode =
      branch.ifsc ||
      branch.ifscCode ||
      "";

    return (
      <option key={branch._id || branch.id || branchName} value={branchName}>
        {branchName} {ifscCode ? `- ${ifscCode}` : ""}
      </option>
    );
  })}
</select>

            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="Enter email"
              value={registerForm.email}
              onChange={(e) => handleRegisterChange("email", e.target.value)}
            />

            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrap}>
              <input
                style={styles.passwordInput}
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 characters"
                value={registerForm.password}
                onChange={(e) =>
                  handleRegisterChange("password", e.target.value)
                }
              />

              <button
                type="button"
                style={styles.eyeButton}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                👁️
              </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.success}>{success}</div>}

            <button type="submit" style={styles.loginButton} disabled={loading}>
              {loading ? "Creating Account..." : "Create Secure Account"}
            </button>
          </form>
        )}

        <div style={styles.portalButtons}>
          {mode === "login" ? (
            <button
              type="button"
              style={styles.customerButton}
              onClick={() => {
                setMode("register");
                setError("");
                setSuccess("");
                loadBranches();
              }}
            >
              Create Customer Account
            </button>
          ) : (
            <button
              type="button"
              style={styles.customerButton}
              onClick={() => {
                setMode("login");
                setError("");
                setSuccess("");
              }}
            >
              Already Have Account? Login
            </button>
          )}

          <button
            type="button"
            style={styles.adminButton}
            onClick={handleAdminDirectLogin}
            disabled={loading}
          >
            Admin Direct Login
          </button>
        </div>

        <p style={styles.footerText}>
          Admin, Super Admin, Branch Manager, Loan Officer, Customer Support
          and Staff users will go to Admin Portal. Customer users will go to Customer Dashboard automatically.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "radial-gradient(circle at top left, #111827 0%, #071326 35%, #020817 100%)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
    boxSizing: "border-box",
    position: "relative",
    overflow: "auto",
  },

  backgroundGlowOne: {
    position: "fixed",
    top: "8%",
    left: "10%",
    width: "260px",
    height: "260px",
    borderRadius: "999px",
    background: "rgba(245, 197, 91, 0.08)",
    filter: "blur(60px)",
    pointerEvents: "none",
  },

  backgroundGlowTwo: {
    position: "fixed",
    bottom: "8%",
    right: "10%",
    width: "320px",
    height: "320px",
    borderRadius: "999px",
    background: "rgba(37, 99, 235, 0.12)",
    filter: "blur(70px)",
    pointerEvents: "none",
  },

  card: {
    width: "100%",
    maxWidth: "540px",
    border: "1px solid rgba(245, 197, 91, 0.65)",
    borderRadius: "28px",
    padding: "36px",
    background: "rgba(3, 12, 28, 0.86)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
    backdropFilter: "blur(14px)",
    position: "relative",
    zIndex: 5,
  },

  logoBox: {
    width: "70px",
    height: "70px",
    borderRadius: "18px",
    border: "1px solid #f5c55b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 18px",
    fontSize: "28px",
    fontWeight: "900",
    color: "#f7d477",
    fontFamily: "Georgia, serif",
  },

  badge: {
    width: "fit-content",
    margin: "0 auto 14px",
    padding: "7px 16px",
    borderRadius: "999px",
    border: "1px solid rgba(245, 197, 91, 0.7)",
    background: "rgba(245, 197, 91, 0.12)",
    color: "#f7d477",
    fontSize: "13px",
    fontWeight: "800",
  },

  title: {
    margin: 0,
    textAlign: "center",
    fontSize: "42px",
    lineHeight: 1,
    fontFamily: "Georgia, serif",
    color: "#fff4d8",
    textShadow: "0 3px 16px rgba(245, 197, 91, 0.22)",
  },

  subtitle: {
    margin: "18px 0 28px",
    textAlign: "center",
    color: "#dbeafe",
    fontSize: "15px",
    lineHeight: 1.5,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  label: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: "14px",
    marginTop: "6px",
  },

  input: {
    width: "100%",
    height: "46px",
    borderRadius: "12px",
    border: "1px solid rgba(148, 163, 184, 0.6)",
    background: "rgba(15, 23, 42, 0.94)",
    color: "#ffffff",
    padding: "0 14px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },

  passwordWrap: {
    width: "100%",
    height: "46px",
    borderRadius: "12px",
    border: "1px solid rgba(148, 163, 184, 0.6)",
    background: "rgba(15, 23, 42, 0.94)",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    boxSizing: "border-box",
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#ffffff",
    padding: "0 14px",
    fontSize: "14px",
  },

  eyeButton: {
    width: "54px",
    height: "100%",
    border: "none",
    background: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    cursor: "pointer",
  },

  branchInfo: {
    color: "#93c5fd",
    fontSize: "12px",
    marginTop: "-4px",
    marginBottom: "4px",
  },

  error: {
    marginTop: "8px",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(248, 113, 113, 0.65)",
    background: "rgba(127, 29, 29, 0.35)",
    color: "#fecaca",
    fontWeight: "800",
    textAlign: "center",
    fontSize: "14px",
  },

  success: {
    marginTop: "8px",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(74, 222, 128, 0.65)",
    background: "rgba(20, 83, 45, 0.35)",
    color: "#bbf7d0",
    fontWeight: "800",
    textAlign: "center",
    fontSize: "14px",
  },

  loginButton: {
    width: "100%",
    height: "52px",
    border: "none",
    borderRadius: "14px",
    marginTop: "10px",
    background: "linear-gradient(135deg, #f7d477, #d5a928)",
    color: "#020817",
    fontSize: "15px",
    fontWeight: "950",
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(245, 197, 91, 0.22)",
  },

  portalButtons: {
    marginTop: "16px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },

  customerButton: {
    height: "48px",
    borderRadius: "12px",
    border: "1px solid rgba(245, 197, 91, 0.7)",
    background: "rgba(245, 197, 91, 0.08)",
    color: "#f7d477",
    fontWeight: "900",
    cursor: "pointer",
  },

  adminButton: {
    height: "48px",
    borderRadius: "12px",
    border: "1px solid rgba(59, 130, 246, 0.8)",
    background: "rgba(30, 64, 175, 0.35)",
    color: "#dbeafe",
    fontWeight: "900",
    cursor: "pointer",
  },

  footerText: {
    marginTop: "20px",
    color: "#93c5fd",
    fontSize: "12px",
    lineHeight: 1.5,
    textAlign: "center",
  },
};