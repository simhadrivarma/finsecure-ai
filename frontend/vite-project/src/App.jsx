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

  return <UnifiedLogin />;
}

function UnifiedLogin() {
  const [email, setEmail] = useState("admin@finsecure.ai");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email, password }),
});

let result = null;
let rawText = "";

try {
  rawText = await response.text();
  result = rawText ? JSON.parse(rawText) : {};
} catch {
  throw new Error(
    `Backend returned non-JSON response. Status: ${response.status}. Response: ${rawText.slice(
      0,
      120
    )}`
  );
}

if (!response.ok) {
  throw new Error(result.message || `Login failed with status ${response.status}`);
}

      const user = result.user || result.data;
      const token = result.token;

      if (!user || !token) {
        throw new Error("Invalid login response from backend");
      }

      const role = String(user.role || "").toLowerCase();

      localStorage.clear();

      const isAdmin =
        role.includes("admin") ||
        role.includes("manager") ||
        role.includes("officer") ||
        role.includes("analyst") ||
        role.includes("support");

      if (isAdmin) {
        localStorage.setItem("finsecure_admin", JSON.stringify(user));
        localStorage.setItem("finsecure_token", token);
        window.location.href = "/admin";
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role || "customer");
      localStorage.setItem("userName", user.name || "");
      localStorage.setItem("userEmail", user.email || "");
      localStorage.setItem("userPhone", user.phone || "");
      localStorage.setItem("userAadhaar", user.aadhaarNumber || "");
      localStorage.setItem("userPan", user.panNumber || "");

      window.location.href = "/customer";
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const openCustomerRegister = () => {
    localStorage.clear();
    window.location.href = "/customer";
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>FS</div>

        <p style={styles.badge}>AI-Powered FinTech Platform</p>

        <h1 style={styles.title}>FinSecure AI</h1>

        <p style={styles.subtitle}>
          One secure login for Admin and Customer banking portals.
        </p>

        <form onSubmit={login} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            type="email"
            required
          />

          <label style={styles.label}>Password</label>

          <div style={styles.passwordWrap}>
            <input
              style={styles.passwordInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              type={showPassword ? "text" : "password"}
              required
            />

            <button
              type="button"
              style={styles.eyeButton}
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.loginButton} disabled={loading}>
            {loading ? "Logging in..." : "Login Securely"}
          </button>
        </form>

        <div style={styles.portalButtons}>
          <button style={styles.customerButton} onClick={openCustomerRegister}>
            Create Customer Account
          </button>

          <button
            style={styles.adminButton}
            onClick={() => (window.location.href = "/admin")}
          >
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
    width: "min(520px, 100%)",
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
    marginBottom: "18px",
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