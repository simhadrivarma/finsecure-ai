import { useState } from "react";
import { Bot, Send, X, Crown } from "lucide-react";

const rawApiBaseUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://finsecure-ai-backend.vercel.app";

const API_BASE_URL = String(rawApiBaseUrl).includes("onrender.com")
  ? "https://finsecure-ai-backend.vercel.app"
  : String(rawApiBaseUrl || "https://finsecure-ai-backend.vercel.app").replace(/\/$/, "");

function getToken() {
  return (
    localStorage.getItem("finsecure_token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    ""
  );
}

export default function AdminAIChatBox({ admin, role, activePage }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text:
        "Royal Admin AI is ready. Ask about customers, employees, admins, branches, loans, transactions, interest, EMI, audit logs, or complete bank summary.",
    },
  ]);

  const suggestedQuestions = [
  "How many customers do we have?",
  "How many employees do we have?",
  "How many branches do we have?",
  "How many loans do we have?",
  "Show complete bank summary",
  "Show customer Teja details",
  "Show branch Gajuwaka details",
  "Show latest transactions",
  "Show audit logs",
  "Calculate EMI for 500000 loan at 12% for 5 years",
];

  const sendMessage = async () => {
    const question = input.trim();

    if (!question || loading) return;

    setMessages((prev) => [...prev, { from: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/admin-ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          message: question,
          activePage,
          adminName: admin?.name,
          adminEmail: admin?.email,
          role,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "AI request failed");
      }

      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: result.answer || "No answer found.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text:
            error.message ||
            "Cannot connect to Admin AI. Please check backend deployment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button style={styles.floatingButton} onClick={() => setOpen(true)}>
        <Crown size={20} />
        <span>AI</span>
      </button>

      {open && (
        <div style={styles.overlay}>
          <div style={styles.chatBox}>
            <div style={styles.header}>
              <div style={styles.headerLeft}>
                <div style={styles.botIcon}>
                  <Bot size={22} />
                </div>
                <div>
                  <h3 style={styles.title}>FinSecure Admin AI</h3>
                  <p style={styles.subtitle}>
                    {role || "Admin"} banking command assistant
                  </p>
                </div>
              </div>

              <button style={styles.closeButton} onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.messages}>
              {messages.map((message, index) => (
                <div
                  key={index}
                  style={
                    message.from === "user" ? styles.userMessage : styles.aiMessage
                  }
                >
                  <pre style={styles.messageText}>{message.text}</pre>
                </div>
              ))}

              {loading && (
                <div style={styles.aiMessage}>
                  <pre style={styles.messageText}>Thinking...</pre>
                </div>
              )}
            </div>

            <div style={styles.inputRow}>
              <input
                style={styles.input}
                value={input}
                placeholder="Ask: Show customer Teja details..."
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
              />

              <button style={styles.sendButton} onClick={sendMessage} disabled={loading}>
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  floatingButton: {
    position: "fixed",
    right: "26px",
    bottom: "26px",
    zIndex: 9999,
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    border: "1px solid rgba(245, 190, 80, 0.95)",
    background:
      "linear-gradient(135deg, rgba(10,24,48,0.98), rgba(12,40,82,0.98))",
    color: "#f7d28b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "3px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 18px 46px rgba(0,0,0,0.45)",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 10000,
    background: "rgba(2,8,23,0.50)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: "24px",
  },

  chatBox: {
    width: "460px",
    height: "650px",
    borderRadius: "24px",
    border: "1px solid rgba(245, 190, 80, 0.75)",
    background: "linear-gradient(145deg, #071326, #020617)",
    boxShadow: "0 28px 90px rgba(0,0,0,0.65)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  header: {
    padding: "18px",
    borderBottom: "1px solid rgba(245, 190, 80, 0.22)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  botIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "14px",
    background: "rgba(245, 190, 80, 0.12)",
    color: "#f7d28b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    margin: 0,
    color: "#f7d28b",
    fontSize: "18px",
    fontWeight: 900,
  },

  subtitle: {
    margin: "4px 0 0",
    color: "#cbd5e1",
    fontSize: "12px",
  },

  closeButton: {
    border: "none",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    padding: "10px",
    cursor: "pointer",
  },

  messages: {
    flex: 1,
    padding: "18px",
    overflowY: "auto",
  },

  userMessage: {
    marginLeft: "auto",
    marginBottom: "12px",
    maxWidth: "85%",
    padding: "12px",
    borderRadius: "16px 16px 4px 16px",
    background: "linear-gradient(135deg, #2563eb, #06b6d4)",
    color: "#fff",
  },

  aiMessage: {
    marginRight: "auto",
    marginBottom: "12px",
    maxWidth: "90%",
    padding: "12px",
    borderRadius: "16px 16px 16px 4px",
    background: "rgba(15,23,42,0.95)",
    border: "1px solid rgba(245,190,80,0.22)",
    color: "#e5e7eb",
  },

  messageText: {
    margin: 0,
    whiteSpace: "pre-wrap",
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: "13px",
    lineHeight: 1.55,
  },

  inputRow: {
    padding: "16px",
    borderTop: "1px solid rgba(245,190,80,0.22)",
    display: "flex",
    gap: "10px",
  },

  input: {
    flex: 1,
    border: "1px solid rgba(148,163,184,0.45)",
    background: "rgba(15,23,42,0.92)",
    color: "#fff",
    borderRadius: "14px",
    padding: "0 14px",
    outline: "none",
    fontWeight: 700,
  },

  sendButton: {
    width: "48px",
    height: "48px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #f7d28b, #d4af37)",
    color: "#111827",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
