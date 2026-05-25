import { useMemo, useState } from "react";
import { Bot, Send, X, Crown } from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://finsecure-ai-backend.vercel.app";

function getStoredCustomer() {
  try {
    return (
      JSON.parse(localStorage.getItem("finsecure_user") || "null") ||
      JSON.parse(localStorage.getItem("user") || "null") ||
      JSON.parse(localStorage.getItem("customer") || "null") ||
      {}
    );
  } catch {
    return {};
  }
}

function getToken() {
  return (
    localStorage.getItem("finsecure_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

function formatMoney(value) {
  const numberValue = Number(String(value || 0).replace(/₹|,/g, ""));
  return `₹${Number.isNaN(numberValue) ? 0 : numberValue.toLocaleString("en-IN")}`;
}

function getLocalCustomerAnswer(question, customer) {
  const q = question.toLowerCase();

  if (q.includes("balance")) {
    return `Your available balance is ${formatMoney(customer.balance || 0)}.`;
  }

  if (q.includes("account number") || q.includes("account no")) {
    return `Your account number is ${customer.accountNumber || "not available"}.`;
  }

  if (q.includes("ifsc")) {
    return `Your IFSC code is ${customer.ifsc || customer.ifscCode || "not available"}.`;
  }

  if (q.includes("cif")) {
    return `Your CIF number is ${customer.cif || customer.cifNumber || "not available"}.`;
  }

  if (q.includes("branch")) {
    return `Your branch is ${customer.branch || customer.branchName || "not available"}.`;
  }

  if (q.includes("kyc")) {
    return `Your KYC status is ${customer.kyc || "Pending"}.`;
  }

  if (q.includes("name")) {
    return `Your registered name is ${customer.name || customer.customerName || "Customer"}.`;
  }

  if (q.includes("email")) {
    return `Your registered email is ${customer.email || "not available"}.`;
  }

  if (q.includes("phone") || q.includes("mobile")) {
    return `Your registered phone number is ${
      customer.phone || customer.phoneNumber || "not available"
    }.`;
  }

  if (q.includes("pan")) {
    return `Your PAN number is ${customer.panNumber || "not available"}.`;
  }

  if (q.includes("aadhaar") || q.includes("adhar")) {
    return `Your Aadhaar number is ${customer.aadhaarNumber || "not available"}.`;
  }

  if (q.includes("account details") || q.includes("my details")) {
    return [
      "Your Account Details",
      `Name: ${customer.name || customer.customerName || "Customer"}`,
      `Customer ID: ${customer.id || customer._id || customer.customerId || "N/A"}`,
      `Email: ${customer.email || "N/A"}`,
      `Phone: ${customer.phone || customer.phoneNumber || "N/A"}`,
      `Account Number: ${customer.accountNumber || "N/A"}`,
      `Account Type: ${customer.accountType || "Savings Account"}`,
      `IFSC: ${customer.ifsc || customer.ifscCode || "N/A"}`,
      `CIF: ${customer.cif || customer.cifNumber || "N/A"}`,
      `Branch: ${customer.branch || customer.branchName || "N/A"}`,
      `Balance: ${formatMoney(customer.balance || 0)}`,
      `KYC: ${customer.kyc || "Pending"}`,
      `Status: ${customer.status || "Active"}`,
    ].join("\n");
  }

  return [
    "I can help with your banking account details.",
    "You can ask:",
    "• What is my balance?",
    "• Show my account details",
    "• What is my account number?",
    "• What is my IFSC code?",
    "• What is my CIF number?",
    "• What is my KYC status?",
  ].join("\n");
}

function AIChatBox({ customer, user }) {
  const currentCustomer = useMemo(() => {
    return customer || user || getStoredCustomer();
  }, [customer, user]);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "Royal Customer AI is ready. Ask about your balance, account number, IFSC, CIF, branch, KYC, or account details.",
    },
  ]);

  const sendMessage = async () => {
    const question = input.trim();

    if (!question || loading) return;

    setMessages((prev) => [...prev, { from: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getToken() ? `Bearer ${getToken()}` : "",
        },
        body: JSON.stringify({
          message: question,
          customer: currentCustomer,
          role: "customer",
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result?.answer) {
        setMessages((prev) => [...prev, { from: "ai", text: result.answer }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { from: "ai", text: getLocalCustomerAnswer(question, currentCustomer) },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: "ai", text: getLocalCustomerAnswer(question, currentCustomer) },
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
                  <h3 style={styles.title}>FinSecure Customer AI</h3>
                  <p style={styles.subtitle}>Royal banking assistant</p>
                </div>
              </div>

              <button style={styles.closeButton} onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.messages}>
              {messages.map((message, index) => (
                <div
                  key={`${message.from}-${index}`}
                  style={message.from === "user" ? styles.userMessage : styles.aiMessage}
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
                placeholder="Ask: What is my balance?"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
              />

              <button style={styles.sendButton} onClick={sendMessage}>
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
    background: "linear-gradient(135deg, rgba(10,24,48,0.98), rgba(12,40,82,0.98))",
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
    padding: "24px",
  },
  chatBox: {
    width: "440px",
    height: "620px",
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
  },
};

export default AIChatBox;