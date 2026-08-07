import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Send,
  X,
  Crown,
  ShieldCheck,
  Headphones,
  WalletCards,
  FileText,
  BadgeIndianRupee,
  UserRound,
} from "lucide-react";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "http://127.0.0.1:5000"
    : "https://finsecure-ai-backend-09.onrender.com")
).replace(/\/$/, "");

const API = API_BASE_URL.endsWith("/api")
  ? API_BASE_URL
  : `${API_BASE_URL}/api`;

function getToken() {
  return (
    localStorage.getItem("finsecure_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function isGreeting(text) {
  const q = normalizeText(text);
  return [
    "hi",
    "hello",
    "hey",
    "hii",
    "hiii",
    "good morning",
    "good afternoon",
    "good evening",
  ].includes(q);
}

function isThanks(text) {
  const q = normalizeText(text);
  return (
    q === "thanks" ||
    q === "thank you" ||
    q === "thankyou" ||
    q === "thx"
  );
}

function wantsTickets(text) {
  const q = normalizeText(text);
  return (
    q.includes("my ticket") ||
    q.includes("my complaint") ||
    q.includes("track ticket") ||
    q.includes("track complaint") ||
    q.includes("support status") ||
    q.includes("ticket status")
  );
}

function wantsNewSupport(text) {
  const q = normalizeText(text);
  return (
    q.includes("create support ticket") ||
    q.includes("raise support ticket") ||
    q.includes("raise complaint") ||
    q.includes("create complaint") ||
    q === "customer care" ||
    q === "support" ||
    q.includes("i need help")
  );
}

function isFraudRequest(text) {
  const q = normalizeText(text);
  return (
    q.includes("fraud") ||
    q.includes("unauthorized") ||
    q.includes("not mine") ||
    q.includes("scam") ||
    q.includes("hacked") ||
    q.includes("suspicious transaction")
  );
}

function inferTicketDetails(description, forcedCategory = "") {
  const q = normalizeText(description);

  if (forcedCategory) {
    return {
      category: forcedCategory,
      priority:
        forcedCategory === "Fraud / Unauthorized Transaction"
          ? "Urgent"
          : "High",
    };
  }

  if (
    q.includes("fraud") ||
    q.includes("unauthorized") ||
    q.includes("hacked") ||
    q.includes("scam")
  ) {
    return {
      category: "Fraud / Unauthorized Transaction",
      priority: "Urgent",
    };
  }

  if (
    q.includes("transfer") ||
    q.includes("transaction") ||
    q.includes("payment") ||
    q.includes("money deducted")
  ) {
    return {
      category: "Transaction Issue",
      priority: "High",
    };
  }

  if (q.includes("loan") || q.includes("emi")) {
    return {
      category: "Loan Assistance",
      priority: "Medium",
    };
  }

  if (
    q.includes("kyc") ||
    q.includes("account") ||
    q.includes("branch") ||
    q.includes("ifsc")
  ) {
    return {
      category: "Account & KYC",
      priority: "Medium",
    };
  }

  if (
    q.includes("login") ||
    q.includes("security") ||
    q.includes("password")
  ) {
    return {
      category: "Login & Security",
      priority: "High",
    };
  }

  return {
    category: "General Query",
    priority: "Medium",
  };
}

function AIChatBox({ userName = "Customer" }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [supportDraft, setSupportDraft] = useState(null);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      from: "ai",
      text:
        "Welcome to FinSecure Customer AI 👋\n\n" +
        "I am your secure personal banking and customer-care assistant.\n\n" +
        "I can help with your balance, masked account details, transactions, fund transfers, loans, KYC, branch details and support tickets.\n\n" +
        "Your banking information is retrieved only for your authenticated FinSecure account.",
    },
  ]);

  const addMessage = (from, text) => {
    setMessages((prev) => [...prev, { from, text }]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  const secureHeaders = () => {
    const token = getToken();

    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  const createSupportTicket = async (description, forcedCategory = "") => {
    const { category, priority } = inferTicketDetails(
      description,
      forcedCategory
    );

    const subject =
      description.length > 75
        ? `${description.slice(0, 72)}...`
        : description;

    const response = await fetch(`${API}/support-tickets`, {
      method: "POST",
      headers: secureHeaders(),
      body: JSON.stringify({
        category,
        subject: subject || "Customer AI support request",
        description,
        priority,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.message || "Unable to create the support ticket."
      );
    }

    const ticket = result.data || result.ticket || result.record || {};

    return {
      ticketId: ticket.ticketId || ticket.id || "Created",
      category: ticket.category || category,
      priority: ticket.priority || priority,
      status: ticket.status || "Open",
    };
  };

  const showSupportTickets = async () => {
    const response = await fetch(`${API}/support-tickets`, {
      headers: secureHeaders(),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.message || "Unable to load your support tickets."
      );
    }

    const tickets = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
      ? result.data
      : [];

    if (!tickets.length) {
      return (
        "You currently have no support tickets.\n\n" +
        'If you need help, type "Create support ticket" and describe the issue.'
      );
    }

    return [
      "Here are your latest support requests:",
      "",
      ...tickets.slice(0, 5).map((ticket, index) => {
        const created = ticket.createdAt
          ? new Date(ticket.createdAt).toLocaleString("en-IN")
          : "-";

        return (
          `${index + 1}. ${ticket.ticketId || ticket.id || "Ticket"}\n` +
          `Issue: ${ticket.subject || ticket.category || "Support request"}\n` +
          `Priority: ${ticket.priority || "Medium"}\n` +
          `Status: ${ticket.status || "Open"}\n` +
          `Created: ${created}`
        );
      }),
      "",
      "I can also help you create a new support request.",
    ].join("\n");
  };

  const callSecureCustomerAI = async (question) => {
    const response = await fetch(`${API}/customer-ai/chat`, {
      method: "POST",
      headers: secureHeaders(),
      body: JSON.stringify({
        message: question,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "Your secure banking session has expired. Please log in again to continue."
        );
      }

      throw new Error(
        result.message ||
          "I could not retrieve your banking information right now."
      );
    }

    return (
      result.answer ||
      result.reply ||
      "I received your request, but no banking response was returned."
    );
  };

  const beginSupportFlow = (forcedCategory = "") => {
    setSupportDraft({
      forcedCategory,
    });

    if (forcedCategory === "Fraud / Unauthorized Transaction") {
      addMessage(
        "ai",
        "I can help you report this securely.\n\nPlease describe the suspicious or unauthorized transaction. Do not share your OTP, PIN, CVV, password or complete card number.\n\nType “cancel” if you do not want to continue."
      );
      return;
    }

    addMessage(
      "ai",
      "Certainly. I can create a customer-care support request for you.\n\nPlease describe the issue in your own words. For example:\n“Money was deducted but the receiver did not receive it.”\n\nType “cancel” if you do not want to continue."
    );
  };

  const sendMessage = async (presetMessage = "") => {
    const question = String(presetMessage || input).trim();

    if (!question || loading) return;

    addMessage("user", question);
    setInput("");
    setLoading(true);

    try {
      if (supportDraft) {
        if (normalizeText(question) === "cancel") {
          setSupportDraft(null);
          addMessage(
            "ai",
            "No problem. I cancelled the support-ticket request. How else can I assist you?"
          );
          return;
        }

        const ticket = await createSupportTicket(
          question,
          supportDraft.forcedCategory
        );

        setSupportDraft(null);

        addMessage(
          "ai",
          `Your support request has been created successfully ✅\n\n` +
            `Ticket ID: ${ticket.ticketId}\n` +
            `Category: ${ticket.category}\n` +
            `Priority: ${ticket.priority}\n` +
            `Status: ${ticket.status}\n\n` +
            `You can ask “Track my ticket” anytime to check your latest support requests.`
        );
        return;
      }

      if (isGreeting(question)) {
        addMessage(
          "ai",
          `Hey ${userName || "there"}! 👋\n\nHow can I assist you today?\n\n` +
            "I can securely help with your account balance, account details, recent transactions, fund transfers, loan status, KYC, branch information and customer-care support."
        );
        return;
      }

      if (isThanks(question)) {
        addMessage(
          "ai",
          "You're welcome! 😊 I’m here whenever you need help with your FinSecure account or customer-care support."
        );
        return;
      }

      if (wantsTickets(question)) {
        const ticketText = await showSupportTickets();
        addMessage("ai", ticketText);
        return;
      }

      if (isFraudRequest(question)) {
        beginSupportFlow("Fraud / Unauthorized Transaction");
        return;
      }

      if (wantsNewSupport(question)) {
        beginSupportFlow();
        return;
      }

      const answer = await callSecureCustomerAI(question);
      addMessage("ai", answer);
    } catch (error) {
      addMessage(
        "ai",
        `${error.message || "I could not complete that request."}\n\n` +
          "Your banking data has not been changed. Please try again shortly."
      );
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      label: "Balance",
      icon: WalletCards,
      message: "What is my current balance?",
    },
    {
      label: "My Account",
      icon: UserRound,
      message: "Show my account details",
    },
    {
      label: "Transactions",
      icon: FileText,
      message: "Show my recent transactions",
    },
    {
      label: "Loans",
      icon: BadgeIndianRupee,
      message: "Show my loan status",
    },
    {
      label: "My Tickets",
      icon: Headphones,
      message: "Track my support tickets",
    },
    {
      label: "Customer Care",
      icon: Headphones,
      message: "Create support ticket",
    },
  ];

  return (
    <>
      <button
        type="button"
        style={styles.floatingButton}
        onClick={() => setOpen(true)}
        aria-label="Open FinSecure Customer AI"
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
                  <h3 style={styles.title}>FinSecure Customer AI</h3>
                  <p style={styles.subtitle}>
                    Personal Banking + Customer Care
                  </p>
                </div>
              </div>

              <button
                type="button"
                style={styles.closeButton}
                onClick={() => setOpen(false)}
                aria-label="Close Customer AI"
              >
                <X size={18} />
              </button>
            </div>

            <div style={styles.securityBar}>
              <ShieldCheck size={15} />
              <span>Secure • Customer-only authenticated data</span>
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
                  <pre style={styles.messageText}>{message.text}</pre>
                </div>
              ))}

              {loading && (
                <div style={styles.aiMessage}>
                  <div style={styles.thinkingRow}>
                    <Bot size={16} />
                    <span>Checking your secure banking data...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div style={styles.quickActions}>
              {quickActions.map(({ label, icon: Icon, message }) => (
                <button
                  key={label}
                  type="button"
                  style={styles.quickButton}
                  onClick={() => sendMessage(message)}
                  disabled={loading}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            <div style={styles.inputRow}>
              <input
                style={styles.input}
                value={input}
                placeholder={
                  supportDraft
                    ? "Describe your issue..."
                    : "Ask about your FinSecure account..."
                }
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
                disabled={loading}
              />

              <button
                type="button"
                style={styles.sendButton}
                onClick={() => sendMessage()}
                disabled={loading}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>

            <div style={styles.footerNote}>
              Never share OTP, PIN, CVV or passwords in chat.
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
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 18px 46px rgba(0,0,0,0.45)",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 10000,
    background: "rgba(2,8,23,0.55)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: "12px",
  },

  chatBox: {
    width: "min(460px, calc(100vw - 24px))",
    height: "min(720px, calc(100vh - 24px))",
    borderRadius: "24px",
    border: "1px solid rgba(245, 190, 80, 0.75)",
    background: "linear-gradient(145deg, #071326, #020617)",
    boxShadow: "0 28px 90px rgba(0,0,0,0.65)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  header: {
    padding: "16px 18px",
    borderBottom: "1px solid rgba(245, 190, 80, 0.22)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
  },

  botIcon: {
    width: "44px",
    height: "44px",
    flexShrink: 0,
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
    fontSize: "17px",
    fontWeight: 900,
  },

  subtitle: {
    margin: "4px 0 0",
    color: "#cbd5e1",
    fontSize: "11px",
  },

  closeButton: {
    border: "none",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    padding: "10px",
    cursor: "pointer",
  },

  securityBar: {
    minHeight: "34px",
    padding: "7px 16px",
    background: "rgba(16,185,129,0.08)",
    borderBottom: "1px solid rgba(16,185,129,0.18)",
    color: "#a7f3d0",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "11px",
    fontWeight: 800,
  },

  messages: {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
  },

  userMessage: {
    marginLeft: "auto",
    marginBottom: "12px",
    maxWidth: "85%",
    padding: "11px 12px",
    borderRadius: "16px 16px 4px 16px",
    background: "linear-gradient(135deg, #2563eb, #06b6d4)",
    color: "#fff",
  },

  aiMessage: {
    marginRight: "auto",
    marginBottom: "12px",
    maxWidth: "92%",
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

  thinkingRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: "12px",
    color: "#cbd5e1",
  },

  quickActions: {
    padding: "10px 12px",
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    borderTop: "1px solid rgba(245,190,80,0.12)",
  },

  quickButton: {
    minWidth: "max-content",
    height: "34px",
    padding: "0 11px",
    borderRadius: "999px",
    border: "1px solid rgba(245,190,80,0.38)",
    background: "rgba(15,23,42,0.92)",
    color: "#f7d28b",
    fontSize: "11px",
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
  },

  inputRow: {
    padding: "12px",
    borderTop: "1px solid rgba(245,190,80,0.22)",
    display: "flex",
    gap: "10px",
  },

  input: {
    flex: 1,
    minWidth: 0,
    height: "46px",
    border: "1px solid rgba(148,163,184,0.45)",
    background: "rgba(15,23,42,0.92)",
    color: "#fff",
    borderRadius: "14px",
    padding: "0 14px",
    outline: "none",
    fontWeight: 700,
  },

  sendButton: {
    width: "46px",
    height: "46px",
    flexShrink: 0,
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #f7d28b, #d4af37)",
    color: "#111827",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  footerNote: {
    padding: "0 14px 10px",
    color: "#64748b",
    fontSize: "10px",
    textAlign: "center",
  },
};

export default AIChatBox;