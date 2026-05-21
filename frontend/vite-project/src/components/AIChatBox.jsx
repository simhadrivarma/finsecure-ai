import { useState } from "react";
import {
  Send,
  X,
  Minimize2,
  Crown,
  Sparkles,
  Paperclip,
  Bot,
} from "lucide-react";

const API = "http://127.0.0.1:5000/api";

const safeJSON = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

function AIChatBox({ role = "customer", page = "dashboard", userName = "User" }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: `✨ Hello ${userName}, I am FinSecure AI. Ask me about your balance, income, expenses, transactions, loan, transfer, investments, branches, or general knowledge.`,
    },
  ]);

  const buildContext = async () => {
    let dashboard = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
    };

    let transactions = [];

    try {
      const token = localStorage.getItem("token");

      const dashRes = await fetch(`${API}/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      dashboard = await dashRes.json();

      const txnRes = await fetch(`${API}/transactions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const txnData = await txnRes.json();
      transactions = Array.isArray(txnData) ? txnData : [];
    } catch {
      console.log("AI context backend data not loaded");
    }

    const userEmail = localStorage.getItem("userEmail") || "";

    const allInvestments = safeJSON("investments", []);
    const allTransfers = safeJSON("transferHistory", []);
    const allLoans = safeJSON("loanApplications", []);
    const branches = safeJSON("branches", []);

    return {
      dashboard,
      transactions,
      investments: allInvestments.filter((item) => item.userEmail === userEmail),
      transfers: allTransfers.filter((item) => item.userEmail === userEmail),
      loans: allLoans.filter(
        (item) => item.userEmail === userEmail || item.email === userEmail
      ),
      branches,
      profile: {
        name: localStorage.getItem("userName") || "",
        email: localStorage.getItem("userEmail") || "",
        phone: localStorage.getItem("userPhone") || "",
        aadhaarNumber: localStorage.getItem("userAadhaar") || "",
        panNumber: localStorage.getItem("userPan") || "",
      },
    };
  };

  const askAI = async () => {
    const question = input.trim();

    if (!question) return;

    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: question,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const context = await buildContext();

      const res = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
          page,
          role,
          userName,
          context,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.reply || "Sorry, I could not answer that.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Backend is not connected. Please start backend with npm run dev.",
        },
      ]);
    }

    setLoading(false);
  };

  const handleAttach = () => {
    alert("Attachment option clicked. You can connect file upload later.");
  };

  if (!open) {
    return (
      <button style={styles.floatingButton} onClick={() => setOpen(true)}>
        <div style={styles.floatingCrown}>
          <Crown size={20} />
        </div>
        <span>AI</span>
      </button>
    );
  }

  return (
    <div style={styles.chatBox}>
      <div style={styles.header}>
        <div style={styles.logoWrap}>
          <div style={styles.royalLogo}>
            <Crown size={28} />
            <span>AI</span>
          </div>

          <div>
            <h2 style={styles.title}>FinSecure AI</h2>
            <p style={styles.subtitle}>Live Banking Assistant</p>
          </div>
        </div>

        <div style={styles.headerActions}>
          <button
            style={styles.headerBtn}
            onClick={() => setMinimized(!minimized)}
            title="Minimize"
          >
            <Minimize2 size={18} />
          </button>

          <button
            style={styles.closeBtn}
            onClick={() => setOpen(false)}
            title="Close"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <div style={styles.ornament}>
            <span></span>
            <Sparkles size={18} />
            <span></span>
          </div>

          <div style={styles.messagesArea}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={msg.sender === "ai" ? styles.aiMessage : styles.userMessage}
              >
                {msg.text}
              </div>
            ))}

            {loading && (
              <div style={styles.aiMessage}>
                <Bot size={16} /> Thinking...
              </div>
            )}
          </div>

          <div style={styles.inputArea}>
            <button style={styles.attachBtn} onClick={handleAttach} title="Attach">
              <Paperclip size={24} />
            </button>

            <input
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              onKeyDown={(e) => {
                if (e.key === "Enter") askAI();
              }}
            />

            <button style={styles.sendBtn} onClick={askAI}>
              <Send size={17} />
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  floatingButton: {
    position: "fixed",
    right: "28px",
    bottom: "28px",
    width: "76px",
    height: "76px",
    borderRadius: "50%",
    border: "2px solid #f7d28b",
    background:
      "radial-gradient(circle at top, #1e3a8a, #071326 55%, #020617)",
    color: "#f7d28b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    fontWeight: "900",
    cursor: "pointer",
    boxShadow:
      "0 0 28px rgba(247,210,139,0.65), inset 0 0 18px rgba(255,255,255,0.08)",
    zIndex: 99999,
  },

  floatingCrown: {
    width: "32px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  chatBox: {
    position: "fixed",
    right: "26px",
    bottom: "26px",
    width: "430px",
    height: "620px",
    borderRadius: "26px",
    overflow: "hidden",
    border: "2px solid rgba(247,210,139,0.95)",
    background:
      "linear-gradient(160deg, #020617 0%, #06152c 48%, #10051f 100%)",
    boxShadow:
      "0 25px 90px rgba(0,0,0,0.65), 0 0 45px rgba(212,175,55,0.22)",
    color: "#ffffff",
    zIndex: 99999,
  },

  header: {
    height: "118px",
    padding: "18px 22px",
    boxSizing: "border-box",
    background:
      "linear-gradient(135deg, #020617 0%, #08215a 48%, #06152c 100%)",
    borderBottom: "1px solid rgba(247,210,139,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  royalLogo: {
    width: "82px",
    height: "82px",
    borderRadius: "50%",
    border: "2px solid #f7d28b",
    background:
      "radial-gradient(circle at 35% 25%, #ffffff33, #102a63 28%, #020617 75%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#f7d28b",
    boxShadow:
      "0 0 28px rgba(247,210,139,0.6), inset 0 0 22px rgba(59,130,246,0.35)",
    position: "relative",
    fontFamily: "Georgia, serif",
  },

  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "900",
    color: "#fff7dc",
    letterSpacing: "0.5px",
    fontFamily: "Georgia, serif",
  },

  subtitle: {
    margin: "6px 0 0",
    fontSize: "15px",
    color: "#e5e7eb",
    fontWeight: "700",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  headerBtn: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border: "1px solid rgba(247,210,139,0.55)",
    background: "rgba(255,255,255,0.08)",
    color: "#f7d28b",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  closeBtn: {
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    border: "1px solid rgba(247,210,139,0.6)",
    background: "rgba(255,255,255,0.12)",
    color: "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  ornament: {
    height: "34px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    color: "#f7d28b",
  },

  messagesArea: {
    height: "370px",
    padding: "20px",
    boxSizing: "border-box",
    overflowY: "auto",
  },

  aiMessage: {
    maxWidth: "92%",
    minHeight: "86px",
    padding: "22px",
    borderRadius: "22px",
    background:
      "linear-gradient(135deg, rgba(83,36,122,0.92), rgba(5,16,43,0.95))",
    border: "1px solid rgba(247,210,139,0.85)",
    color: "#fff7ed",
    fontSize: "16px",
    lineHeight: "1.6",
    whiteSpace: "pre-line",
    boxShadow:
      "0 16px 35px rgba(0,0,0,0.35), inset 0 0 28px rgba(247,210,139,0.06)",
    marginBottom: "14px",
  },

  userMessage: {
    maxWidth: "86%",
    marginLeft: "auto",
    padding: "16px 18px",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #0f3b85, #111827)",
    border: "1px solid rgba(96,165,250,0.6)",
    color: "#ffffff",
    fontSize: "15px",
    lineHeight: "1.5",
    whiteSpace: "pre-line",
    marginBottom: "14px",
  },

  inputArea: {
    height: "98px",
    padding: "16px",
    boxSizing: "border-box",
    borderTop: "1px solid rgba(247,210,139,0.35)",
    background: "rgba(2,8,23,0.8)",
    display: "grid",
    gridTemplateColumns: "58px 1fr 86px",
    gap: "12px",
    alignItems: "center",
  },

  attachBtn: {
    height: "58px",
    width: "58px",
    borderRadius: "14px",
    border: "1px solid rgba(247,210,139,0.8)",
    background: "rgba(255,255,255,0.06)",
    color: "#f7d28b",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    height: "58px",
    borderRadius: "16px",
    border: "1px solid rgba(247,210,139,0.7)",
    background: "rgba(15,23,42,0.78)",
    color: "#ffffff",
    outline: "none",
    padding: "0 18px",
    fontSize: "15px",
    boxSizing: "border-box",
  },

  sendBtn: {
    height: "54px",
    borderRadius: "14px",
    border: "1px solid rgba(247,210,139,0.85)",
    background: "linear-gradient(135deg, #172554, #08215a)",
    color: "#f7d28b",
    cursor: "pointer",
    fontWeight: "900",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    boxShadow: "0 0 18px rgba(247,210,139,0.25)",
  },
};

export default AIChatBox;