import React, { useState } from "react";
import CustomerDashboard from "./Dashboard";
import AdminPanel from "./AdminPanel";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function App() {
  const path = window.location.pathname;

  if (path === "/customer") {
    return <CustomerDashboard />;
  }

  if (path === "/admin") {
    return <AdminPanel />;
  }

  return <UnifiedAuth />;
}

function UnifiedAuth() {
  const [mode, setMode] = useState("login");

  const [loginEmail, setLoginEmail] = useState("admin@finsecure.ai");
  const [loginPassword, setLoginPassword] = useState("admin123");

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const [registerForm, setRegisterForm] = useState({
    name: "",
    phone: "",
    aadhaarNumber: "",
    panNumber: "",
    email: "",
    password: "",
    role: "customer",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const saveCustomerSession = (user, token) => {
    localStorage.clear();
    localStorage.setItem("token", token);
    localStorage.setItem("role", user.role || "customer");
    localStorage.setItem("userName", user.name || user.customerName || "");
    localStorage.setItem("userEmail", user.email || "");
    localStorage.setItem("userPhone", user.phone || user.phoneNumber || "");
    localStorage.setItem("userAadhaar", user.aadhaarNumber || "");
    localStorage.setItem("userPan", user.panNumber || "");
  };

  const saveAdminSession = (user, token) => {
    localStorage.clear();
    localStorage.setItem("finsecure_admin", JSON.stringify(user));
    localStorage.setItem("finsecure_token", token);
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Login failed");
      }

      const user = result.user || result.data;
      const token = result.token;

      if (!user || !token) {
        throw new Error("Invalid login response from backend");
      }

      const role = String(user.role || "").toLowerCase();

      const isAdmin =
        role.includes("admin") ||
        role.includes("manager") ||
        role.includes("officer") ||
        role.includes("analyst") ||
        role.includes("support") ||
        user.email === "admin@finsecure.ai";

      if (isAdmin) {
        saveAdminSession(user, token);
        window.location.href = "/admin";
        return;
      }

      saveCustomerSession(user, token);
      window.location.href = "/customer";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (!registerForm.name.trim()) {
        throw new Error("Name is required");
      }

      if (!registerForm.email.trim()) {
        throw new Error("Email is required");
      }

      if (!registerForm.password || registerForm.password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: registerForm.name,
          email: registerForm.email,
          password: registerForm.password,
          role: "customer",
          phone: registerForm.phone,
          aadhaarNumber: registerForm.aadhaarNumber,
          panNumber: registerForm.panNumber,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Registration failed");
      }

      const user = result.user || result.data;
      const token = result.token;

      if (!user || !token) {
        throw new Error("Invalid registration response from backend");
      }

      saveCustomerSession(user, token);

      setSuccess("Customer registered successfully");
      window.location.href = "/customer";
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const updateRegisterForm = (field, value) => {
    setRegisterForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openRegister = () => {
    setMode("register");
    setError("");
    setSuccess("");
  };

  const openLogin = () => {
    setMode("login");
    setError("");
    setSuccess("");
  };

  const openAdminDirect = () => {
    window.location.href = "/admin";
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>FS</div>

        <p style={styles.badge}>AI-Powered FinTech Platform</p>

        <h1 style={styles.title}>FinSecure AI</h1>

        <p style={styles.subtitle}>
          {mode === "login"
            ? "One secure login for Admin and Customer banking portals."
            : "Create your customer account securely."}
        </p>

        {mode === "login" ? (
          <form onSubmit={handleLogin} style={styles.form}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Enter email"
              type="email"
              required
            />

            <label style={styles.label}>Password</label>

            <div style={styles.passwordWrap}>
              <input
                style={styles.passwordInput}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                type={showLoginPassword ? "text" : "password"}
                required
              />

              <button
                type="button"
                style={styles.eyeButton}
                onClick={() => setShowLoginPassword(!showLoginPassword)}
              >
                {showLoginPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.success}>{success}</div>}

            <button style={styles.loginButton} disabled={loading}>
              {loading ? "Please wait..." : "Login Securely"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={styles.form}>
            <label style={styles.label}>Full Name</label>
            <input
              style={styles.input}
              value={registerForm.name}
              onChange={(e) => updateRegisterForm("name", e.target.value)}
              placeholder="Enter customer name"
              required
            />

            <label style={styles.label}>Phone Number</label>
            <input
              style={styles.input}
              value={registerForm.phone}
              onChange={(e) => updateRegisterForm("phone", e.target.value)}
              placeholder="Enter phone number"
            />

            <label style={styles.label}>Aadhaar Number</label>
            <input
              style={styles.input}
              value={registerForm.aadhaarNumber}
              onChange={(e) =>
                updateRegisterForm("aadhaarNumber", e.target.value)
              }
              placeholder="Enter Aadhaar number"
            />

            <label style={styles.label}>PAN Number</label>
            <input
              style={styles.input}
              value={registerForm.panNumber}
              onChange={(e) =>
                updateRegisterForm("panNumber", e.target.value.toUpperCase())
              }
              placeholder="Enter PAN number"
            />

            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              value={registerForm.email}
              onChange={(e) => updateRegisterForm("email", e.target.value)}
              placeholder="Enter email"
              type="email"
              required
            />

            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrap}>
              <input
                style={styles.passwordInput}
                value={registerForm.password}
                onChange={(e) => updateRegisterForm("password", e.target.value)}
                placeholder="Minimum 6 characters"
                type={showRegisterPassword ? "text" : "password"}
                required
              />

              <button
                type="button"
                style={styles.eyeButton}
                onClick={() => setShowRegisterPassword(!showRegisterPassword)}
              >
                {showRegisterPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.success}>{success}</div>}

            <button style={styles.loginButton} disabled={loading}>
              {loading ? "Creating Account..." : "Create Secure Account"}
            </button>
          </form>
        )}

        <div style={styles.portalButtons}>
          {mode === "login" ? (
            <button style={styles.customerButton} onClick={openRegister}>
              Create Customer Account
            </button>
          ) : (
            <button style={styles.customerButton} onClick={openLogin}>
              Already Have Account? Login
            </button>
          )}

          <button style={styles.adminButton} onClick={openAdminDirect}>
            Admin Direct Login
          </button>
        </div>

        <p style={styles.note}>
          Admin users will go to Admin Portal. Customer users will go to Customer
          Dashboard automatically.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px",
    background:
      "radial-gradient(circle at top left, rgba(247,210,139,0.22), transparent 30%), radial-gradient(circle at bottom right, rgba(37,99,235,0.22), transparent 30%), linear-gradient(135deg, #020617 0%, #071326 45%, #020617 100%)",
    fontFamily: "Inter, Arial, sans-serif",
  },

  card: {
    width: "min(560px, 100%)",
    padding: "44px",
    borderRadius: "30px",
    border: "1px solid rgba(247,210,139,0.78)",
    background:
      "linear-gradient(145deg, rgba(8,21,42,0.94), rgba(2,8,23,0.88))",
    boxShadow: "0 45px 120px rgba(0,0,0,0.58)",
    color: "#ffffff",
    textAlign: "center",
  },

  logo: {
    width: "82px",
    height: "82px",
    margin: "0 auto 20px",
    borderRadius: "24px",
    border: "2px solid #f7d28b",
    color: "#f7d28b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    fontWeight: "900",
    fontFamily: "Georgia, serif",
  },

  badge: {
    display: "inline-block",
    margin: "0 0 14px",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "rgba(247,210,139,0.12)",
    border: "1px solid rgba(247,210,139,0.55)",
    color: "#f7d28b",
    fontWeight: "800",
    fontSize: "13px",
  },

  title: {
    margin: "0",
    fontSize: "44px",
    fontFamily: "Georgia, serif",
    color: "#fff7dc",
  },

  subtitle: {
    margin: "18px auto 28px",
    color: "#dbeafe",
    fontSize: "16px",
    lineHeight: "1.6",
  },

  form: {
    textAlign: "left",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    color: "#f8fafc",
    fontWeight: "800",
  },

  input: {
    width: "100%",
    height: "52px",
    marginBottom: "16px",
    padding: "0 16px",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.6)",
    background: "rgba(15,23,42,0.72)",
    color: "#ffffff",
    outline: "none",
    fontSize: "15px",
    boxSizing: "border-box",
  },

  passwordWrap: {
    width: "100%",
    height: "52px",
    marginBottom: "18px",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.6)",
    background: "rgba(15,23,42,0.72)",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    boxSizing: "border-box",
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    padding: "0 16px",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#ffffff",
    fontSize: "15px",
    boxSizing: "border-box",
  },

  eyeButton: {
    width: "54px",
    height: "100%",
    border: "none",
    background: "rgba(247,210,139,0.08)",
    color: "#f7d28b",
    cursor: "pointer",
    fontSize: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  error: {
    background: "rgba(239,68,68,0.14)",
    border: "1px solid rgba(248,113,113,0.55)",
    color: "#fecaca",
    padding: "12px",
    borderRadius: "12px",
    marginBottom: "16px",
    textAlign: "center",
    fontWeight: "800",
  },

  success: {
    background: "rgba(34,197,94,0.14)",
    border: "1px solid rgba(74,222,128,0.55)",
    color: "#bbf7d0",
    padding: "12px",
    borderRadius: "12px",
    marginBottom: "16px",
    textAlign: "center",
    fontWeight: "800",
  },

  loginButton: {
    width: "100%",
    height: "56px",
    borderRadius: "16px",
    border: "1px solid rgba(247,210,139,0.8)",
    background:
      "linear-gradient(135deg, #f7d28b 0%, #d4af37 45%, #f7d28b 100%)",
    color: "#071326",
    fontSize: "17px",
    fontWeight: "900",
    cursor: "pointer",
  },

  portalButtons: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
    marginTop: "18px",
  },

  customerButton: {
    minHeight: "52px",
    borderRadius: "14px",
    border: "1px solid rgba(247,210,139,0.75)",
    background: "rgba(247,210,139,0.1)",
    color: "#f7d28b",
    fontWeight: "900",
    cursor: "pointer",
  },

  adminButton: {
    minHeight: "52px",
    borderRadius: "14px",
    border: "1px solid rgba(96,165,250,0.75)",
    background: "rgba(37,99,235,0.16)",
    color: "#dbeafe",
    fontWeight: "900",
    cursor: "pointer",
  },

  note: {
    margin: "22px 0 0",
    color: "#94a3b8",
    fontSize: "13px",
    lineHeight: "1.5",
  },
};