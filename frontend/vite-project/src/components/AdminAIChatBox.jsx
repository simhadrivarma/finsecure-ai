import { useMemo, useRef, useState, useEffect } from "react";
import { Bot, Send, X, Crown, Sparkles } from "lucide-react";

const rawApiBaseUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "http://127.0.0.1:5000"
    : "https://finsecure-ai-backend-09.onrender.com");

const API_BASE_URL = String(rawApiBaseUrl || "").replace(/\/$/, "");

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

  const adminName =
    admin?.name ||
    admin?.adminName ||
    "Admin";

  const welcomeMessage = useMemo(
    () => ({
      from: "ai",
      text:
        `Welcome ${adminName}. FinSecure Admin AI is ready.\n\n` +
        "I can securely retrieve live customers, employees, admins, branches, loans, transaction history and banking summaries according to your role permissions.\n\n" +
        "Type “Hi” for a professional greeting or select a quick question below.",
    }),
    [adminName]
  );

  const [messages, setMessages] = useState([welcomeMessage]);
  const messagesEndRef = useRef(null);

  const suggestedQuestions = [
    "Hi",
    "Show complete bank summary",
    "Show all customers with phone numbers",
    "Show all employees with phone numbers",
    "Show all admins",
    "Show all branches",
    "Show all loans with interest and EMI",
    "Show complete transaction history from start to end",
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const sendQuestion = async (rawQuestion) => {
    const question = String(rawQuestion || "").trim();

    if (!question || loading) return;

    setMessages((previous) => [
      ...previous,
      { from: "user", text: question },
    ]);

    setInput("");
    setLoading(true);

    try {
      const token = getToken();

      if (!token) {
        throw new Error(
          "Your admin login session is missing. Please log in again."
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/admin-ai/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: question,
            activePage,
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.message ||
            `Admin AI request failed (${response.status})`
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          from: "ai",
          text:
            result?.answer ||
            "No response was returned.",
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          from: "ai",
          text:
            error?.message ||
            "Unable to connect to FinSecure Admin AI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => {
    sendQuestion(input);
  };

  return (
    <>
      <button
        type="button"
        style={styles.floatingButton}
        onClick={() => setOpen(true)}
        aria-label="Open FinSecure Admin AI"
      >
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
                  <h3 style={styles.title}>
                    FinSecure Admin AI
                  </h3>
                  <p style={styles.subtitle}>
                    {role || "Admin"} • Live banking intelligence
                  </p>
                </div>
              </div>

              <button
                type="button"
                style={styles.closeButton}
                onClick={() => setOpen(false)}
                aria-label="Close Admin AI"
              >
                <X size={18} />
              </button>
            </div>

            <div style={styles.securityBanner}>
              <Sparkles size={15} />
              <span>
                Live MongoDB data • Role-based access • Security fields hidden
              </span>
            </div>

            <div style={styles.quickQuestions}>
              {suggestedQuestions.map((question) => (
                <button
                  type="button"
                  key={question}
                  style={styles.quickButton}
                  disabled={loading}
                  onClick={() => sendQuestion(question)}
                >
                  {question}
                </button>
              ))}
            </div>

            <div style={styles.messages}>
              {messages.map((message, index) => (
                <div
                  key={`${message.from}-${index}`}
                  style={
                    message.from === "user"
                      ? styles.userMessage
                      : styles.aiMessage
                  }
                >
                  <pre style={styles.messageText}>
                    {message.text}
                  </pre>
                </div>
              ))}

              {loading && (
                <div style={styles.aiMessage}>
                  <pre style={styles.messageText}>
                    Retrieving the latest permitted banking data...
                  </pre>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div style={styles.inputRow}>
              <textarea
                style={styles.input}
                value={input}
                rows={2}
                placeholder="Ask about customers, employees, transactions, branches..."
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <button
                type="button"
                style={{
                  ...styles.sendButton,
                  opacity: loading ? 0.65 : 1,
                }}
                onClick={sendMessage}
                disabled={loading}
                aria-label="Send question"
              >
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
    width: "min(520px, calc(100vw - 32px))",
    height: "min(760px, calc(100vh - 48px))",
    borderRadius: "24px",
    border: "1px solid rgba(245, 190, 80, 0.75)",
    background:
      "linear-gradient(145deg, #071326, #020617)",
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

  securityBanner: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    padding: "10px 16px",
    background: "rgba(16, 185, 129, 0.08)",
    borderBottom: "1px solid rgba(16, 185, 129, 0.18)",
    color: "#a7f3d0",
    fontSize: "11px",
    fontWeight: 700,
  },

  quickQuestions: {
    padding: "12px 14px",
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    borderBottom: "1px solid rgba(245, 190, 80, 0.14)",
  },

  quickButton: {
    flex: "0 0 auto",
    border: "1px solid rgba(245,190,80,0.32)",
    background: "rgba(245,190,80,0.08)",
    color: "#f7d28b",
    borderRadius: "999px",
    padding: "8px 11px",
    fontSize: "11px",
    fontWeight: 800,
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
    maxWidth: "88%",
    padding: "12px",
    borderRadius: "16px 16px 4px 16px",
    background:
      "linear-gradient(135deg, #2563eb, #06b6d4)",
    color: "#fff",
  },

  aiMessage: {
    marginRight: "auto",
    marginBottom: "12px",
    maxWidth: "94%",
    padding: "12px",
    borderRadius: "16px 16px 16px 4px",
    background: "rgba(15,23,42,0.95)",
    border: "1px solid rgba(245,190,80,0.22)",
    color: "#e5e7eb",
  },

  messageText: {
    margin: 0,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: "13px",
    lineHeight: 1.58,
  },

  inputRow: {
    padding: "16px",
    borderTop: "1px solid rgba(245,190,80,0.22)",
    display: "flex",
    gap: "10px",
    alignItems: "stretch",
  },

  input: {
    flex: 1,
    resize: "none",
    border: "1px solid rgba(148,163,184,0.45)",
    background: "rgba(15,23,42,0.92)",
    color: "#fff",
    borderRadius: "14px",
    padding: "11px 14px",
    outline: "none",
    fontWeight: 700,
    fontFamily: "Inter, Arial, sans-serif",
    lineHeight: 1.4,
  },

  sendButton: {
    width: "50px",
    border: "none",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg, #f7d28b, #d4af37)",
    color: "#111827",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
