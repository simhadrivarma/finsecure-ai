import { useEffect, useMemo, useState } from "react";
import AIChatBox from "./components/AIChatBox";
import {
  LayoutDashboard,
  Landmark,
  WalletCards,
  TrendingUp,
  Send,
  FileText,
  BadgeIndianRupee,
  Settings,
  LogOut,
  Bell,
  Search,
  UserRound,
  Menu,
  PlusCircle,
  MinusCircle,
  Save,
  Eye,
  ShieldCheck,
  Headphones,
  UsersRound,
  BarChart3,
  PieChart,
  Wallet,
  CalendarDays,
  Trash2,
  Crown,
  BadgeCheck,
  Sparkles,
  Mail,
  Phone,
  LockKeyhole,
  IdCard,
  Fingerprint,
} from "lucide-react";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://finsecure-ai-backend.vercel.app"
).replace(/\/$/, "");

const API = API_BASE_URL.endsWith("/api")
  ? API_BASE_URL
  : `${API_BASE_URL}/api`;

const defaultBranches = [
  {
    id: "1",
    code: "BR001",
    name: "Main Branch",
    location: "123 Financial Street, New York",
    employees: 24,
    accounts: 1250,
  },
  {
    id: "2",
    code: "BR002",
    name: "Downtown Branch",
    location: "456 Central Avenue, Chicago",
    employees: 18,
    accounts: 876,
  },
  {
    id: "3",
    code: "BR003",
    name: "Westside Branch",
    location: "789 Westlake Drive, Los Angeles",
    employees: 15,
    accounts: 632,
  },
  {
    id: "4",
    code: "TU500",
    name: "Tirupati",
    location: "Tetagunta, Annavaram, Andhra Pradesh",
    employees: 0,
    accounts: 0,
  },
];

const safeJSON = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

const formatMoney = (amount) => {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
};

const formatDate = (date) => {
  if (!date) return "-";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStoredUser = () => {
  try {
    const saved =
      localStorage.getItem("finsecure_user") || localStorage.getItem("user");

    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore invalid saved JSON
  }

  return {
    name: localStorage.getItem("userName") || "Customer",
    email: localStorage.getItem("userEmail") || "customer@gmail.com",
    phone: localStorage.getItem("userPhone") || "",
    aadhaarNumber: localStorage.getItem("userAadhaar") || "",
    panNumber: localStorage.getItem("userPan") || "",
    role: localStorage.getItem("role") || "customer",
  };
};

const saveCustomerSession = (user = {}, tokenValue = "") => {
  const safeUser = {
    ...getStoredUser(),
    ...user,
    role: user.role || "customer",
  };

  if (tokenValue) {
    localStorage.setItem("token", tokenValue);
    localStorage.setItem("finsecure_token", tokenValue);
  }

  localStorage.setItem("role", safeUser.role || "customer");
  localStorage.setItem("userName", safeUser.name || safeUser.customerName || "");
  localStorage.setItem("userEmail", safeUser.email || "");
  localStorage.setItem("userPhone", safeUser.phone || safeUser.phoneNumber || "");
  localStorage.setItem("userAadhaar", safeUser.aadhaarNumber || "");
  localStorage.setItem("userPan", safeUser.panNumber || "");
  localStorage.setItem("user", JSON.stringify(safeUser));
  localStorage.setItem("finsecure_user", JSON.stringify(safeUser));

  return safeUser;
};

const cleanText = (value) => String(value || "").trim().toLowerCase();

const cleanNumber = (value) => {
  const numberValue = Number(
    String(value || "0")
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .trim()
  );

  return Number.isNaN(numberValue) ? 0 : numberValue;
};

const maskAccountNumber = (value) => {
  const raw = String(value || "").replace(/\s/g, "");

  if (!raw) return "N/A";
  if (raw.length <= 4) return raw;

  return `XXXX XXXX XXXX ${raw.slice(-4)}`;
};

const normalizeArrayResponse = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.rows)) return result.rows;
  return [];
};


function Dashboard() {
  const [isLogin, setIsLogin] = useState(true);
  const [token, setToken] = useState(() => {
  const savedRole = localStorage.getItem("role");
  const savedToken = localStorage.getItem("token");

  if (window.location.pathname === "/customer" && savedRole === "admin") {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userPhone");
    localStorage.removeItem("userAadhaar");
    localStorage.removeItem("userPan");
    return null;
  }

  return savedToken;
});
  const [message, setMessage] = useState("");

  const [dashboard, setDashboard] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });

  const [transactions, setTransactions] = useState([]);
  const [branches, setBranches] = useState(defaultBranches);
  const [branchCustomers, setBranchCustomers] = useState([]);
  const [branchEmployees, setBranchEmployees] = useState([]);
  const [customerProfile, setCustomerProfile] = useState(() => getStoredUser());
  const [selectedPage, setSelectedPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const customer = useMemo(() => {
    return {
      ...getStoredUser(),
      ...customerProfile,
    };
  }, [customerProfile, token]);

  const userName = customer.name || customer.customerName || "Customer";
  const userEmail = customer.email || "customer@gmail.com";
  const customerId = customer.id || customer._id || "N/A";
  const customerPhone = customer.phone || customer.phoneNumber || "N/A";
  const customerBranch = customer.branch || "N/A";
  const customerAccountType =
    customer.accountType || customer.type || "FinSecure Royal Account";
  const customerAccountNumber = customer.accountNumber || "";
  const customerIFSC = customer.ifsc || customer.ifscCode || "N/A";
  const customerCIF = customer.cif || customer.cifNumber || "N/A";
  const customerKYC = customer.kyc || "Pending";
  const customerStatus = customer.status || "Active";
  const customerPan = customer.panNumber || "N/A";
  const customerAadhaar = customer.aadhaarNumber || "N/A";

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer",
    phone: "",
    aadhaarNumber: "",
    panNumber: "",
    branch: "",
  });

  const [profileForm, setProfileForm] = useState({
    name: localStorage.getItem("userName") || "",
    email: localStorage.getItem("userEmail") || "",
    phone: localStorage.getItem("userPhone") || "",
    aadhaarNumber: localStorage.getItem("userAadhaar") || "",
    panNumber: localStorage.getItem("userPan") || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [entryForm, setEntryForm] = useState({
    amount: "",
    type: "income",
    category: "",
    description: "",
    paymentMethod: "Bank Transfer",
    date: new Date().toISOString().split("T")[0],
  });

  const [transferForm, setTransferForm] = useState({
    beneficiaryName: "",
    beneficiaryAccount: "",
    ifsc: "",
    bankName: "",
    amount: "",
    transferType: "IMPS",
    remarks: "",
  });

  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferHistory, setTransferHistory] = useState(
    safeJSON("transferHistory", [])
  );

  const [loanForm, setLoanForm] = useState({
    fullName: localStorage.getItem("userName") || "",
    email: localStorage.getItem("userEmail") || "",
    phone: "",
    loanType: "Personal Loan",
    amount: "",
    monthlyIncome: "",
    employmentType: "Salaried",
    tenure: "",
    purpose: "",
    address: "",
    existingLoan: "No",
  });

  const [loanApplications, setLoanApplications] = useState(
    safeJSON("loanApplications", [])
  );

  const [investmentForm, setInvestmentForm] = useState({
    investmentType: "Fixed Deposit",
    amount: "",
    duration: "",
    riskLevel: "Low",
    expectedReturn: "",
    nomineeName: "",
    notes: "",
  });

  const [investments, setInvestments] = useState(safeJSON("investments", []));

  const currentInvestments = useMemo(() => {
    return investments.filter((item) => item.userEmail === userEmail);
  }, [investments, userEmail]);

  const totalInvestmentValue = currentInvestments.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const totalExpectedReturns = currentInvestments.reduce(
    (sum, item) => sum + Number(item.expectedReturn || 0),
    0
  );

  const currentLoanApplications = loanApplications.filter(
    (loan) => loan.userEmail === userEmail || loan.email === userEmail
  );

  const currentTransfers = transferHistory.filter(
    (transfer) => transfer.userEmail === userEmail
  );

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 2600);
  };

  const handleAuthChange = (e) => {
    setAuthForm({ ...authForm, [e.target.name]: e.target.value });
  };

  const handleEntryChange = (e) => {
    setEntryForm({ ...entryForm, [e.target.name]: e.target.value });
  };

  const handleTransferChange = (e) => {
    setTransferForm({ ...transferForm, [e.target.name]: e.target.value });
  };

  const handleLoanChange = (e) => {
    setLoanForm({ ...loanForm, [e.target.name]: e.target.value });
  };

  const handleInvestmentChange = (e) => {
    setInvestmentForm({ ...investmentForm, [e.target.name]: e.target.value });
  };

  const loginOrRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    const url = isLogin ? `${API}/auth/login` : `${API}/auth/register`;

    const body = isLogin
      ? {
          email: authForm.email,
          password: authForm.password,
        }
      : {
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
          role: authForm.role,
          phone: authForm.phone,
          aadhaarNumber: authForm.aadhaarNumber,
          panNumber: authForm.panNumber.toUpperCase(),
          branch: authForm.branch || "Main Branch",
        };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Something went wrong");
        return;
      }

      if (isLogin) {
        const loggedUser = data.user || data.data || {};
        const savedUser = saveCustomerSession(loggedUser, data.token);

        setCustomerProfile(savedUser);
        setToken(data.token);

        if (String(savedUser.role || "").toLowerCase().includes("admin")) {
          window.location.href = "/admin";
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        const registeredUser = data.user || data.data || null;

        if (data.token && registeredUser) {
          const savedUser = saveCustomerSession(registeredUser, data.token);
          setCustomerProfile(savedUser);
          setToken(data.token);
          window.location.href = "/dashboard";
          return;
        }

        setMessage("Registered successfully. Please login.");
        setIsLogin(true);
      }
    } catch {
      setMessage("Cannot connect to backend");
    }
  };

  const getAuthHeaders = () => {
    const currentToken =
      localStorage.getItem("finsecure_token") || localStorage.getItem("token") || "";

    return {
      "Content-Type": "application/json",
      Authorization: currentToken ? `Bearer ${currentToken}` : "",
    };
  };

  const loadBranches = async () => {
    try {
      const headers = getAuthHeaders();

      const [branchResponse, customerResponse, employeeResponse] =
        await Promise.all([
          fetch(`${API}/branches`, { headers }),
          fetch(`${API}/customers`, { headers }),
          fetch(`${API}/employees`, { headers }),
        ]);

      const branchResult = await branchResponse.json();
      const customerResult = await customerResponse.json();
      const employeeResult = await employeeResponse.json();

      const liveBranches = normalizeArrayResponse(branchResult);
      const liveCustomers = normalizeArrayResponse(customerResult);
      const liveEmployees = normalizeArrayResponse(employeeResult);

      setBranchCustomers(liveCustomers);
      setBranchEmployees(liveEmployees);

      if (!liveBranches.length) {
        setBranches(defaultBranches);
        return;
      }

      const normalizedBranches = liveBranches.map((branch, index) => {
        const branchName =
          branch.name || branch.branchName || `Branch ${index + 1}`;
        const branchCode =
          branch.ifsc || branch.ifscCode || branch.code || branch.id || `BR${index + 1}`;
        const branchAddress =
          branch.address || branch.location || "Address not available";

        const normalizedName = cleanText(branchName);
        const normalizedCode = cleanText(branchCode);

        const employeesCount = liveEmployees.filter((employee) => {
          return (
            cleanText(employee.branch) === normalizedName ||
            cleanText(employee.ifsc || employee.ifscCode) === normalizedCode
          );
        }).length;

        const customersCount = liveCustomers.filter((customerItem) => {
          return (
            cleanText(customerItem.branch) === normalizedName ||
            cleanText(customerItem.ifsc || customerItem.ifscCode) === normalizedCode
          );
        }).length;

        return {
          ...branch,
          id: branch.id || branch._id || branchCode || `BR${index + 1}`,
          code: branchCode,
          name: branchName,
          location: branchAddress,
          employees: employeesCount || cleanNumber(branch.employees),
          accounts: customersCount || cleanNumber(branch.customers || branch.accounts),
        };
      });

      setBranches(normalizedBranches);
    } catch (error) {
      console.error("Failed to load live branches:", error);

      const savedBranches = localStorage.getItem("branches");

      if (savedBranches) {
        try {
          setBranches(JSON.parse(savedBranches));
          return;
        } catch {
          // Continue to default branches
        }
      }

      setBranches(defaultBranches);
    }
  };

  const loadDashboard = async () => {
    try {
      const res = await fetch(`${API}/dashboard`, {
        headers: getAuthHeaders(),
      });

      const result = await res.json();
      const data = result?.data || result || {};

      setDashboard({
        totalIncome: cleanNumber(
          data?.totalIncome ?? customerProfile?.totalIncome ?? customer?.totalIncome
        ),
        totalExpense: cleanNumber(
          data?.totalExpense ?? customerProfile?.totalExpense ?? customer?.totalExpense
        ),
        balance: cleanNumber(
          data?.balance ?? customerProfile?.balance ?? customer?.balance
        ),
      });
    } catch {
      setDashboard({
        totalIncome: cleanNumber(customerProfile?.totalIncome || customer?.totalIncome),
        totalExpense: cleanNumber(customerProfile?.totalExpense || customer?.totalExpense),
        balance: cleanNumber(customerProfile?.balance || customer?.balance),
      });
    }
  };

  const recalculateDashboardFromTransactions = (rows = []) => {
  const toNumber = (value) => {
    const clean = String(value || "")
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .replace(/\+/g, "")
      .trim();

    const numberValue = Number(clean);
    return Number.isNaN(numberValue) ? 0 : numberValue;
  };

  const safeRows = Array.isArray(rows) ? rows : [];

  const totalIncome = safeRows.reduce((sum, item) => {
    const type = String(item.type || item.transactionType || "").toLowerCase();

    if (type.includes("income") || type.includes("credit") || type.includes("deposit")) {
      return sum + toNumber(item.amount);
    }

    return sum;
  }, 0);

  const totalExpense = safeRows.reduce((sum, item) => {
    const type = String(item.type || item.transactionType || "").toLowerCase();

    if (
      type.includes("expense") ||
      type.includes("debit") ||
      type.includes("withdraw") ||
      type.includes("transfer")
    ) {
      return sum + toNumber(item.amount);
    }

    return sum;
  }, 0);

  const balance = Math.max(totalIncome - totalExpense, 0);

  setDashboard((prev) => ({
    ...prev,
    totalIncome,
    totalExpense,
    balance,
  }));
};

  const loadTransactions = async () => {
  try {
    const res = await fetch(`${API}/transactions`, {
      headers: getAuthHeaders(),
    });

    const result = await res.json();
    const data = normalizeArrayResponse(result);

    setTransactions(data);
    recalculateDashboardFromTransactions(data);
  } catch {
    setTransactions([]);
    recalculateDashboardFromTransactions([]);
  }
};

  const loadProfile = async () => {
    try {
      const headers = getAuthHeaders();
      const email = userEmail || localStorage.getItem("userEmail") || "";
      const urls = [
        `${API}/customer/profile?email=${encodeURIComponent(email)}`,
        `${API}/profile/me`,
      ];

      let loadedUser = null;

      for (const url of urls) {
        try {
          const res = await fetch(url, { headers });
          const result = await res.json();

          if (!res.ok) continue;

          loadedUser = result.user || result.data || result.customer || null;
          if (loadedUser) break;
        } catch {
          // Try next profile URL
        }
      }

      if (!loadedUser) return;

      const savedUser = saveCustomerSession(loadedUser);
      setCustomerProfile(savedUser);

      setProfileForm({
        name: savedUser.name || savedUser.customerName || "",
        email: savedUser.email || "",
        phone: savedUser.phone || savedUser.phoneNumber || "",
        aadhaarNumber: savedUser.aadhaarNumber || "",
        panNumber: savedUser.panNumber || "",
      });

      setDashboard((prev) => ({
        ...prev,
        totalIncome: cleanNumber(savedUser.totalIncome ?? prev.totalIncome),
        totalExpense: cleanNumber(savedUser.totalExpense ?? prev.totalExpense),
        balance: cleanNumber(savedUser.balance ?? prev.balance),
      }));
    } catch {
      console.log("Profile loading failed");
    }
  };

  const saveTransaction = async (transactionType) => {
  const amount = Number(entryForm.amount || 0);
  const currentBalance = cleanNumber(dashboard.balance);

  if (!entryForm.amount || !entryForm.category) {
    alert("Please enter amount and category");
    return;
  }

  if (amount <= 0) {
    alert("Please enter a valid amount");
    return;
  }

  if (transactionType === "expense" && amount > currentBalance) {
    alert(
      `Transaction failed due to insufficient balance.\n\nAvailable Balance: ${formatMoney(
        currentBalance
      )}\nTransaction Amount: ${formatMoney(amount)}`
    );

    showToast("Transaction failed: Insufficient balance");
    return;
  }

  const customerName =
    customerProfile?.name ||
    customerProfile?.customerName ||
    localStorage.getItem("userName") ||
    userName ||
    "Customer";

  const accountNo =
    customerProfile?.accountNumber ||
    localStorage.getItem("accountNumber") ||
    customerAccountNumber ||
    "";

  try {
    const res = await fetch(`${API}/transactions`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        customer: customerName,
        customerName: customerName,
        userEmail,
        email: userEmail,

        accountNumber: accountNo,
        customerId,
        branch: customerBranch,
        ifsc: customerIFSC,
        cif: customerCIF,

        amount,
        type: transactionType,
        category: entryForm.category,
        description:
          entryForm.description ||
          `${transactionType === "income" ? "Income" : "Expense"} entry`,
        paymentMethod: entryForm.paymentMethod,
        date: entryForm.date,
        time: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "Success",
        risk: "Normal",
        riskScore: 0,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.message || "Transaction not saved");
      return;
    }

    setDashboard((prev) => ({
      ...prev,
      totalIncome:
        transactionType === "income"
          ? cleanNumber(prev.totalIncome) + amount
          : cleanNumber(prev.totalIncome),
      totalExpense:
        transactionType === "expense"
          ? cleanNumber(prev.totalExpense) + amount
          : cleanNumber(prev.totalExpense),
      balance:
        transactionType === "income"
          ? cleanNumber(prev.balance) + amount
          : cleanNumber(prev.balance) - amount,
    }));

    setEntryForm({
      amount: "",
      type: "income",
      category: "",
      description: "",
      paymentMethod: "Bank Transfer",
      date: new Date().toISOString().split("T")[0],
    });

    showToast("Transaction saved successfully");
    loadDashboard();
    loadTransactions();
  } catch {
    alert("Cannot connect to backend");
  }
};

  const deleteTransaction = async (id) => {
    try {
      const res = await fetch(`${API}/transactions/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        alert("Unable to delete transaction");
        return;
      }

      showToast("Transaction deleted");
      loadDashboard();
      loadTransactions();
    } catch {
      alert("Cannot connect to backend");
    }
  };

  const submitTransfer = async (e) => {
  e.preventDefault();

  if (
    !transferForm.beneficiaryName ||
    !transferForm.beneficiaryAccount ||
    !transferForm.ifsc ||
    !transferForm.bankName ||
    !transferForm.amount
  ) {
    alert("Please fill all transfer details");
    return;
  }

  const transferAmount = Number(transferForm.amount || 0);
  const currentBalance = cleanNumber(dashboard.balance);

  if (transferAmount <= 0) {
    alert("Please enter a valid transfer amount");
    return;
  }

  const baseTransfer = {
    id: Date.now().toString(),
    userEmail,
    customerId,
    customerName: userName,
    fromAccount: customerAccountNumber,
    branch: customerBranch,
    ifsc: customerIFSC,
    ...transferForm,
    amount: transferAmount,
    date: new Date().toLocaleDateString("en-IN"),
    time: new Date().toLocaleTimeString("en-IN"),
  };

  if (transferAmount > currentBalance) {
    const failedTransfer = {
      ...baseTransfer,
      status: "Failed",
      reason: "Insufficient balance",
    };

    const updatedTransfers = [...transferHistory, failedTransfer];
    setTransferHistory(updatedTransfers);
    localStorage.setItem("transferHistory", JSON.stringify(updatedTransfers));

    alert(
      `Transfer failed due to insufficient balance.\n\nAvailable Balance: ${formatMoney(
        currentBalance
      )}\nTransfer Amount: ${formatMoney(transferAmount)}`
    );

    showToast("Transfer failed: Insufficient balance");
    return;
  }

  try {
    const res = await fetch(`${API}/transactions`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        amount: transferAmount,
        type: "expense",
        category: "Fund Transfer",
        description:
          transferForm.remarks ||
          `Transfer to ${transferForm.beneficiaryName}`,
        paymentMethod: transferForm.transferType,
        date: new Date().toISOString().split("T")[0],
        status: "Completed",
        beneficiaryName: transferForm.beneficiaryName,
        beneficiaryAccount: transferForm.beneficiaryAccount,
        beneficiaryIfsc: transferForm.ifsc,
        bankName: transferForm.bankName,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.message || "Transfer not saved");
      return;
    }

    const successTransfer = {
      ...baseTransfer,
      status: "Success",
    };

    const updatedTransfers = [...transferHistory, successTransfer];
    setTransferHistory(updatedTransfers);
    localStorage.setItem("transferHistory", JSON.stringify(updatedTransfers));

    setDashboard((prev) => ({
      ...prev,
      totalExpense: cleanNumber(prev.totalExpense) + transferAmount,
      balance: cleanNumber(prev.balance) - transferAmount,
    }));

    setTransferForm({
      beneficiaryName: "",
      beneficiaryAccount: "",
      ifsc: "",
      bankName: "",
      amount: "",
      transferType: "IMPS",
      remarks: "",
    });

    setShowTransferForm(false);
    showToast("Fund transfer successful");
    loadDashboard();
    loadTransactions();
  } catch {
    alert("Cannot connect to backend");
  }
};

  const loadLoanApplications = async () => {
  try {
    const res = await fetch(`${API}/loans`, {
      headers: getAuthHeaders(),
    });

    const result = await res.json();
    const allLoans = normalizeArrayResponse(result);

    const myLoans = allLoans.filter((loan) => {
      const loanEmail =
        loan.userEmail || loan.email || loan.customerEmail || loan.applicantEmail;

      const loanCustomerId =
        loan.customerId || loan.customerID || loan.customer_id || "";

      return (
        cleanText(loanEmail) === cleanText(userEmail) ||
        cleanText(loanCustomerId) === cleanText(customerId)
      );
    });

    setLoanApplications(myLoans.length ? myLoans : allLoans);
  } catch (err) {
    console.error("Failed to load loans:", err);
    setLoanApplications(safeJSON("loanApplications", []));
  }
};

  const submitLoanApplication = async (e) => {
  e.preventDefault();

  if (
    !loanForm.fullName ||
    !loanForm.email ||
    !loanForm.phone ||
    !loanForm.amount ||
    !loanForm.monthlyIncome ||
    !loanForm.tenure ||
    !loanForm.purpose ||
    !loanForm.address
  ) {
    alert("Please fill all loan application details");
    return;
  }

  const loanAmount = Number(loanForm.amount || 0);

  if (loanAmount <= 0) {
    alert("Please enter a valid loan amount");
    return;
  }

  const tenureText = String(loanForm.tenure || "");
  const tenureMonths = tenureText.includes("Year")
    ? Number(tenureText.replace(/\D/g, "")) * 12
    : Number(tenureText.replace(/\D/g, "")) || 12;

  const interestRate = 10.5;
  const totalInterest = Math.round((loanAmount * interestRate * tenureMonths) / (12 * 100));
  const totalPayable = loanAmount + totalInterest;
  const emi = Math.ceil(totalPayable / tenureMonths);

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + tenureMonths);

  const loanPayload = {
    customer: userName,
    customerName: loanForm.fullName,
    fullName: loanForm.fullName,
    userEmail,
    email: loanForm.email,
    customerEmail: loanForm.email,
    phone: loanForm.phone,

    customerId,
    accountNumber: customerAccountNumber,
    accountType: customerAccountType,
    branch: customerBranch,
    ifsc: customerIFSC,
    cif: customerCIF,

    loanType: loanForm.loanType,
    amount: loanAmount,
    loanAmount,
    monthlyIncome: Number(loanForm.monthlyIncome || 0),
    employmentType: loanForm.employmentType,
    tenure: loanForm.tenure,
    tenureMonths,
    purpose: loanForm.purpose,
    address: loanForm.address,
    existingLoan: loanForm.existingLoan,

    interest: `${interestRate}%`,
    interestRate,
    emi,
    paid: 0,
    pending: totalPayable,
    totalPayable,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    appliedDate: startDate.toLocaleDateString("en-IN"),
    status: "Pending",
  };

  try {
    const res = await fetch(`${API}/loans`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(loanPayload),
    });

    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(result.message || "Loan application not saved");
    }

    const savedLoan = result.data || result.loan || result.record || loanPayload;

    const updatedApplications = [...loanApplications, savedLoan];

    setLoanApplications(updatedApplications);
    localStorage.setItem("loanApplications", JSON.stringify(updatedApplications));

    setLoanForm({
      fullName: localStorage.getItem("userName") || "",
      email: localStorage.getItem("userEmail") || "",
      phone: "",
      loanType: "Personal Loan",
      amount: "",
      monthlyIncome: "",
      employmentType: "Salaried",
      tenure: "",
      purpose: "",
      address: "",
      existingLoan: "No",
    });

    showToast("Loan application submitted to admin successfully");
    await loadLoanApplications();
  } catch (err) {
    alert(err.message || "Cannot submit loan application to backend");
  }
};

  const submitInvestment = (e) => {
    e.preventDefault();

    if (
      !investmentForm.investmentType ||
      !investmentForm.amount ||
      !investmentForm.duration ||
      !investmentForm.expectedReturn
    ) {
      alert("Please fill all required investment details");
      return;
    }

    if (Number(investmentForm.amount) <= 0) {
      alert("Please enter a valid investment amount");
      return;
    }

    const newInvestment = {
      id: Date.now().toString(),
      userEmail,
      ...investmentForm,
      amount: Number(investmentForm.amount),
      expectedReturn: Number(investmentForm.expectedReturn),
      status: "Active",
      date: new Date().toLocaleDateString(),
    };

    const updatedInvestments = [...investments, newInvestment];

    setInvestments(updatedInvestments);
    localStorage.setItem("investments", JSON.stringify(updatedInvestments));

    setInvestmentForm({
      investmentType: "Fixed Deposit",
      amount: "",
      duration: "",
      riskLevel: "Low",
      expectedReturn: "",
      nomineeName: "",
      notes: "",
    });

    showToast("Investment added successfully");
  };

  const handleProfileChange = (e) => {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value,
    });
  };

  const updateProfile = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API}/profile/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...profileForm,
          panNumber: profileForm.panNumber.toUpperCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Profile update failed");
        return;
      }

      localStorage.setItem("userName", data.user.name || "");
      localStorage.setItem("userEmail", data.user.email || "");
      localStorage.setItem("userPhone", data.user.phone || "");
      localStorage.setItem("userAadhaar", data.user.aadhaarNumber || "");
      localStorage.setItem("userPan", data.user.panNumber || "");

      showToast("Profile updated successfully");
    } catch {
      alert("Cannot connect to backend");
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value,
    });
  };

  const resetPassword = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API}/profile/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(passwordForm),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Password reset failed");
        return;
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      showToast("Password reset successfully");
    } catch {
      alert("Cannot connect to backend");
    }
  };

  const handleSearch = () => {
    const value = searchTerm.toLowerCase().trim();

    if (!value) {
      showToast("Please type something to search");
      return;
    }

    if (value.includes("transaction") || value.includes("statement")) {
      setSelectedPage("statements");
      showToast("Opening statements");
      return;
    }

    if (value.includes("loan")) {
      setSelectedPage("loan");
      showToast("Opening loan section");
      return;
    }

    if (value.includes("investment")) {
      setSelectedPage("investments");
      showToast("Opening investments");
      return;
    }

    if (value.includes("transfer")) {
      setSelectedPage("transfer");
      showToast("Opening fund transfer");
      return;
    }

    if (value.includes("branch")) {
      setSelectedPage("branches");
      showToast("Opening branches");
      return;
    }

    if (value.includes("account") || value.includes("balance")) {
      setSelectedPage("accounts");
      showToast("Opening accounts");
      return;
    }

    if (value.includes("setting") || value.includes("password")) {
      setSelectedPage("settings");
      showToast("Opening settings");
      return;
    }

    if (value.includes("dashboard") || value.includes("home")) {
      setSelectedPage("dashboard");
      showToast("Opening dashboard");
      return;
    }

    showToast("No matching section found");
  };

  const openNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowProfileMenu(false);
  };

  const openProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
    setShowNotifications(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userPhone");
    localStorage.removeItem("userAadhaar");
    localStorage.removeItem("userPan");

    setToken(null);
    window.location.href = "/";
  };

  useEffect(() => {
    loadBranches();

    const timer = setInterval(loadBranches, 15000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (token) {
      const role = localStorage.getItem("role");

      if (role === "admin" && window.location.pathname !== "/customer") {
        window.location.href = "/admin";
        return;
      }

      loadBranches();
      loadDashboard();
      loadTransactions();
      loadProfile();
      loadLoanApplications();
    }
  }, [token]);

  if (!token) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginLeft}>
          <div style={styles.loginHeroContent}>
            <div style={styles.loginLogoBox}>
              <Crown size={44} />
              <div style={styles.loginLogoText}>FS</div>
            </div>

            <h2 style={styles.loginBrand}>FinSecure AI</h2>

            <div style={styles.loginDivider}>
              <span style={styles.loginDividerLine}></span>
              <Sparkles size={16} />
              <span style={styles.loginDividerLine}></span>
            </div>

            <h1 style={styles.loginTitle}>
              Royal Digital
              <br />
              Banking
              <br />
              <span style={styles.loginTitleGold}>Experience</span>
            </h1>

            <p style={styles.loginSubtitle}>
              Secure, prestigious, and intelligent banking crafted for modern
              financial excellence.
            </p>

            <div style={styles.loginFeatureGrid}>
              <div style={styles.loginFeatureCard}>
                <ShieldCheck size={34} />
                <h3 style={styles.loginFeatureTitle}>Bank-Grade Security</h3>
                <p style={styles.loginFeatureText}>Your safety is our priority</p>
              </div>

              <div style={styles.loginFeatureCard}>
                <Sparkles size={34} />
                <h3 style={styles.loginFeatureTitle}>AI Intelligence</h3>
                <p style={styles.loginFeatureText}>Smarter insights for wealth</p>
              </div>

              <div style={styles.loginFeatureCard}>
                <Crown size={34} />
                <h3 style={styles.loginFeatureTitle}>Trusted Excellence</h3>
                <p style={styles.loginFeatureText}>Trusted by thousands</p>
              </div>

              <div style={styles.loginFeatureCard}>
                <LockKeyhole size={34} />
                <h3 style={styles.loginFeatureTitle}>Privacy Assured</h3>
                <p style={styles.loginFeatureText}>Your privacy is guaranteed</p>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.loginRight}>
          <div style={styles.loginRightGlow}></div>

          <div style={styles.loginCard}>
            <div style={styles.formTopIcon}>
              <Crown size={42} />
            </div>

            <h2 style={styles.loginHeading}>
              {isLogin ? "Welcome Back" : "Create Royal Account"}
            </h2>

            <p style={styles.loginSmallText}>
              {isLogin
                ? "Access your secure financial command center"
                : "Join FinSecure AI with verified digital banking details"}
            </p>

            <form onSubmit={loginOrRegister}>
              {!isLogin && (
                <>
                  <AuthInput icon={UserRound}>
                    <input
                      name="name"
                      value={authForm.name}
                      onChange={handleAuthChange}
                      placeholder="Full Name"
                      style={styles.authInput}
                      required
                    />
                  </AuthInput>

                  <AuthInput icon={Phone}>
                    <input
                      name="phone"
                      value={authForm.phone}
                      onChange={(e) => {
                        const onlyNumbers = e.target.value.replace(/\D/g, "");
                        setAuthForm({ ...authForm, phone: onlyNumbers });
                      }}
                      placeholder="Phone Number"
                      style={styles.authInput}
                      required
                      maxLength="10"
                    />
                  </AuthInput>

                  <AuthInput icon={Fingerprint}>
                    <input
                      name="aadhaarNumber"
                      value={authForm.aadhaarNumber}
                      onChange={(e) => {
                        const onlyNumbers = e.target.value.replace(/\D/g, "");
                        setAuthForm({
                          ...authForm,
                          aadhaarNumber: onlyNumbers,
                        });
                      }}
                      placeholder="Aadhaar Card Number"
                      style={styles.authInput}
                      required
                      maxLength="12"
                    />
                  </AuthInput>

                  <AuthInput icon={IdCard}>
                    <input
                      name="panNumber"
                      value={authForm.panNumber}
                      onChange={(e) => {
                        setAuthForm({
                          ...authForm,
                          panNumber: e.target.value.toUpperCase(),
                        });
                      }}
                      placeholder="PAN Card Number"
                      style={styles.authInput}
                      required
                      maxLength="10"
                    />
                  </AuthInput>

                  <AuthInput icon={Landmark}>
                    <select
                      name="branch"
                      value={authForm.branch}
                      onChange={handleAuthChange}
                      style={styles.authInput}
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map((branch) => (
                        <option
                          key={branch.id || branch.code || branch.name}
                          value={branch.name}
                        >
                          {branch.name}
                          {branch.code ? ` - ${branch.code}` : ""}
                        </option>
                      ))}
                    </select>
                  </AuthInput>
                </>
              )}

              <AuthInput icon={Mail}>
                <input
                  name="email"
                  value={authForm.email}
                  onChange={handleAuthChange}
                  placeholder="Email Address"
                  style={styles.authInput}
                  required
                />
              </AuthInput>

              <AuthInput icon={LockKeyhole}>
                <input
                  name="password"
                  type="password"
                  value={authForm.password}
                  onChange={handleAuthChange}
                  placeholder="Password"
                  style={styles.authInput}
                  required
                />
              </AuthInput>

              {!isLogin && (
                <AuthInput icon={Crown}>
                  <select
                    name="role"
                    value={authForm.role}
                    onChange={handleAuthChange}
                    style={styles.authInput}
                  >
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                </AuthInput>
              )}

              <button style={styles.loginBtn} type="submit">
                {isLogin ? "Enter Secure Banking" : "Create Secure Account"}
              </button>
            </form>

            {message && <p style={styles.message}>{message}</p>}

            <div style={styles.loginOrBox}>
              <span style={styles.loginOrLine}></span>
              <span style={styles.loginOrText}>or</span>
              <span style={styles.loginOrLine}></span>
            </div>

            <button
              style={styles.linkBtn}
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage("");
              }}
            >
              {isLogin
                ? "Create new royal account"
                : "Already have account? Login"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    ["dashboard", LayoutDashboard, "Dashboard"],
    ["branches", Landmark, "Branches"],
    ["accounts", WalletCards, "My Accounts"],
    ["investments", TrendingUp, "Investments"],
    ["transfer", Send, "Fund Transfer"],
    ["statements", FileText, "Statements"],
    ["loan", BadgeIndianRupee, "Apply for Loan"],
    ["settings", Settings, "Settings"],
  ];

  return (
    <div style={styles.page}>
      <aside style={sidebarOpen ? styles.sidebar : styles.sidebarClosed}>
        <div style={styles.logoBox}>
          <div style={styles.logoCrest}>FS</div>

          <div>
            <h2 style={styles.logoText}>FinSecure</h2>
            <p style={styles.logoSub}>Private Banking</p>
          </div>
        </div>

        <div style={styles.userBox}>
          <div style={styles.avatar}>
            <UserRound size={23} />
          </div>

          <div>
            <h3 style={styles.userName}>{userName}</h3>
            <p style={styles.userRole}>Customer</p>
          </div>
        </div>

        <div style={styles.ornament}>◇────◇</div>

        <nav style={styles.nav}>
          {navItems.map(([key, Icon, label]) => (
            <button
              key={key}
              style={
                selectedPage === key ? styles.navButtonActive : styles.navButton
              }
              onClick={() => setSelectedPage(key)}
            >
              <Icon size={20} style={styles.navIcon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div style={styles.sidebarCard}>
          <Crown size={32} />
          <strong>{userName}</strong>
          <p>Exclusive Banking Privileges</p>
        </div>

        <button style={styles.logoutBtn} onClick={logout}>
          <LogOut size={18} /> Logout
        </button>
      </aside>

      <main style={styles.main}>
        <header style={styles.topbar}>
          <div style={styles.topLeft}>
            <button
              style={styles.menuBtn}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={20} />
            </button>

            <div>
              <h1 style={styles.pageTitle}>
                Good Evening, {userName} <Crown size={22} />
              </h1>

              <p style={styles.pageSubtitle}>
                Welcome back to your Financial Command Center
              </p>
            </div>
          </div>

          <div style={styles.topIcons}>
            <div style={styles.searchBox}>
              <Search size={18} />

              <input
                placeholder="Search anything..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                style={styles.searchInput}
              />

              <button style={styles.searchBtn} onClick={handleSearch}>
                Go
              </button>
            </div>

            <div style={styles.topButtonWrap}>
              <button style={styles.circleBtn} onClick={openNotifications}>
                <Bell size={18} />
              </button>

              {showNotifications && (
                <div style={styles.dropdownBox}>
                  <h3>Notifications</h3>
                  <p>✅ Welcome back, {userName}</p>
                  <p>🔐 Your account is secure</p>
                  <p>💰 Balance: {formatMoney(dashboard.balance)}</p>
                  <p>📊 Transactions: {transactions.length}</p>
                  <p>💎 Investments: {currentInvestments.length}</p>
                </div>
              )}
            </div>

            <div style={styles.topButtonWrap}>
              <button style={styles.circleBtn} onClick={openProfileMenu}>
                <UserRound size={18} />
              </button>

              {showProfileMenu && (
                <div style={styles.dropdownBox}>
                  <h3>Profile</h3>
                  <p>Name: {userName}</p>
                  <p>Email: {userEmail}</p>

                  <button
                    style={styles.dropdownBtn}
                    onClick={() => {
                      setSelectedPage("settings");
                      setShowProfileMenu(false);
                    }}
                  >
                    Open Settings
                  </button>

                  <button style={styles.dropdownDangerBtn} onClick={logout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section style={styles.content}>
          {selectedPage === "dashboard" && (
            <>
              <div style={styles.summaryGrid}>
                <SummaryCard
                  title="Total Income"
                  value={formatMoney(dashboard.totalIncome)}
                  trend="▲ This Month"
                  icon={BarChart3}
                  variant="green"
                />

                <SummaryCard
                  title="Total Expense"
                  value={formatMoney(dashboard.totalExpense)}
                  trend="▼ This Month"
                  icon={PieChart}
                  variant="red"
                />

                <SummaryCard
                  title="Balance"
                  value={formatMoney(dashboard.balance)}
                  trend="Available Balance"
                  icon={Wallet}
                  variant="blue"
                />

                <SummaryCard
                  title="Investments"
                  value={formatMoney(totalInvestmentValue)}
                  trend="Total Value"
                  icon={TrendingUp}
                  variant="purple"
                />
              </div>

              <div style={styles.dashboardGrid}>
                <div style={styles.cardLarge}>
                  <h2 style={styles.cardTitle}>Add New Entry</h2>

                  <p style={styles.desc}>
                    Enter your transaction details below to add income or
                    expense.
                  </p>

                  <div style={styles.formGrid}>
                    <Field label="Amount">
                      <input
                        name="amount"
                        value={entryForm.amount}
                        onChange={handleEntryChange}
                        type="number"
                        placeholder="₹ 0.00"
                        style={styles.input}
                      />
                    </Field>

                    <Field label="Type">
                      <select
                        name="type"
                        value={entryForm.type}
                        onChange={handleEntryChange}
                        style={styles.input}
                      >
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                    </Field>

                    <Field label="Category">
                      <select
                        name="category"
                        value={entryForm.category}
                        onChange={handleEntryChange}
                        style={styles.input}
                      >
                        <option value="">Select Category</option>
                        <option>Salary</option>
                        <option>Business</option>
                        <option>Freelance</option>
                        <option>Rent</option>
                        <option>Food</option>
                        <option>Shopping</option>
                        <option>Travel</option>
                        <option>Medical</option>
                        <option>Other</option>
                      </select>
                    </Field>

                    <Field label="Date">
                      <input
                        name="date"
                        type="date"
                        value={entryForm.date}
                        onChange={handleEntryChange}
                        style={styles.input}
                      />
                    </Field>

                    <Field label="Payment Method">
                      <select
                        name="paymentMethod"
                        value={entryForm.paymentMethod}
                        onChange={handleEntryChange}
                        style={styles.input}
                      >
                        <option>Bank Transfer</option>
                        <option>UPI</option>
                        <option>Cash</option>
                        <option>Debit Card</option>
                        <option>Credit Card</option>
                      </select>
                    </Field>

                    <div style={{ gridColumn: "span 3" }}>
                      <Field label="Notes / Description">
                        <input
                          name="description"
                          value={entryForm.description}
                          onChange={handleEntryChange}
                          placeholder="Enter notes or description"
                          style={styles.input}
                        />
                      </Field>
                    </div>
                  </div>

                  <div style={styles.actionGrid}>
                    <button
                      style={styles.incomeBtn}
                      onClick={() => saveTransaction("income")}
                    >
                      <PlusCircle size={18} /> Add Income
                    </button>

                    <button
                      style={styles.expenseBtn}
                      onClick={() => saveTransaction("expense")}
                    >
                      <MinusCircle size={18} /> Add Expense
                    </button>

                    <button
                      style={styles.saveBtn}
                      onClick={() => saveTransaction(entryForm.type)}
                    >
                      <Save size={18} /> Save Entry
                    </button>
                  </div>
                </div>

                <div style={styles.accountCard}>
                  <h2 style={styles.cardTitle}>Account Overview</h2>

                  <div style={styles.accountInner}>
                    <div>
                      <p style={styles.labelGold}>Primary Account</p>
                      <h3>{customerAccountType}</h3>
                      <p>{maskAccountNumber(customerAccountNumber)}</p>

                      <p style={styles.labelGold}>Available Balance</p>

                      <h1 style={styles.goldAmount}>
                        {formatMoney(dashboard.balance)}
                      </h1>

                      <button
                        style={styles.goldBtn}
                        onClick={() => setShowAccountDetails(true)}
                      >
                        <Eye size={17} /> View Account Details
                      </button>
                    </div>

                    <div style={styles.lionBadge}>
                      <Crown size={38} />
                      <strong>FS</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.dashboardGrid}>
                <TransactionsTable
                  transactions={transactions.slice(0, 5)}
                  deleteTransaction={deleteTransaction}
                  onViewAll={() => setSelectedPage("statements")}
                />

                <div style={styles.cardSmall}>
                  <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>Spending Overview</h2>

                    <button
                      style={styles.goldMiniBtn}
                      onClick={() =>
                        showToast("Showing this month's spending overview")
                      }
                    >
                      This Month
                    </button>
                  </div>

                  <div style={styles.chartCircle}>
                    <Crown size={34} />
                    <strong>{formatMoney(dashboard.totalExpense)}</strong>
                    <small>Total Spent</small>
                  </div>

                  <div style={styles.legend}>
                    <p>
                      <span style={styles.dotRed}></span> Shopping 20%
                    </p>
                    <p>
                      <span style={styles.dotPurple}></span> Food & Dining 21%
                    </p>
                    <p>
                      <span style={styles.dotGold}></span> Bills & Utilities 18%
                    </p>
                    <p>
                      <span style={styles.dotBlue}></span> Transport 12%
                    </p>
                  </div>

                  <button
                    style={styles.goldBtn}
                    onClick={() => setShowReportModal(true)}
                  >
                    <TrendingUp size={16} /> View Full Report
                  </button>
                </div>
              </div>
            </>
          )}

          {selectedPage === "branches" && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Branches</h2>
                  <p style={styles.desc}>
                    Live branch records from the admin portal. New branches added
                    by admin will appear here automatically.
                  </p>
                </div>

                <button style={styles.goldMiniBtn} onClick={loadBranches}>
                  Refresh Branches
                </button>
              </div>

              <div style={styles.branchGrid}>
                {branches.length === 0 ? (
                  <div style={styles.branchCard}>
                    <div style={styles.branchTop}>
                      <h3>No branches found</h3>
                      <span>--</span>
                    </div>

                    <p>Add branches from Admin Portal → Branches.</p>
                  </div>
                ) : (
                  branches.map((branch) => (
                    <div key={branch.id || branch.code} style={styles.branchCard}>
                      <div style={styles.branchTop}>
                        <h3>{branch.name}</h3>
                        <span>{branch.code}</span>
                      </div>

                      <p>{branch.location}</p>

                      <div style={styles.branchStats}>
                        <div>
                          <small>Employees</small>
                          <strong>{branch.employees}</strong>
                        </div>

                        <div>
                          <small>Active Accounts</small>
                          <strong>{branch.accounts}</strong>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedPage === "accounts" && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>My Accounts</h2>

              <div style={styles.summaryGridThree}>
                <SummaryCard
                  title="Total Income"
                  value={formatMoney(dashboard.totalIncome)}
                  trend="Income Summary"
                  icon={BarChart3}
                  variant="green"
                />

                <SummaryCard
                  title="Total Expense"
                  value={formatMoney(dashboard.totalExpense)}
                  trend="Expense Summary"
                  icon={PieChart}
                  variant="red"
                />

                <SummaryCard
                  title="Balance"
                  value={formatMoney(dashboard.balance)}
                  trend="Royal Account"
                  icon={Wallet}
                  variant="blue"
                />
              </div>

              <div style={styles.subCard}>
                <h2>Account Details</h2>
                <p>Name: {userName}</p>
                <p>Customer ID: {customerId}</p>
                <p>Email: {userEmail}</p>
                <p>Phone: {customerPhone}</p>
                <p>Branch: {customerBranch}</p>
                <p>Account Type: {customerAccountType}</p>
                <p>Account Number: {maskAccountNumber(customerAccountNumber)}</p>
                <p>IFSC Code: {customerIFSC}</p>
                <p>CIF Number: {customerCIF}</p>

                <button
                  style={styles.goldBtn}
                  onClick={() => setShowAccountDetails(true)}
                >
                  <Eye size={17} /> View Full Account Details
                </button>
              </div>
            </div>
          )}

          {selectedPage === "investments" && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Investments</h2>

              <p style={styles.desc}>
                Manage your deposits, mutual funds, gold, stocks, and other
                investment plans.
              </p>

              <div style={styles.summaryGrid}>
                <SummaryCard
                  title="Total Investment"
                  value={formatMoney(totalInvestmentValue)}
                  trend="Total Value"
                  icon={TrendingUp}
                  variant="purple"
                />

                <SummaryCard
                  title="Expected Returns"
                  value={formatMoney(totalExpectedReturns)}
                  trend="Projected Growth"
                  icon={BarChart3}
                  variant="green"
                />

                <SummaryCard
                  title="Active Investments"
                  value={currentInvestments.length}
                  trend="Active Plans"
                  icon={BadgeCheck}
                  variant="blue"
                />

                <SummaryCard
                  title="Status"
                  value={
                    currentInvestments.length > 0 ? "Growing" : "Not Started"
                  }
                  trend="Portfolio"
                  icon={Sparkles}
                  variant="purple"
                />
              </div>

              <form onSubmit={submitInvestment} style={styles.subCard}>
                <h2>Add New Investment</h2>

                <div style={styles.formGrid}>
                  <Field label="Investment Type">
                    <select
                      name="investmentType"
                      value={investmentForm.investmentType}
                      onChange={handleInvestmentChange}
                      style={styles.input}
                    >
                      <option>Fixed Deposit</option>
                      <option>Recurring Deposit</option>
                      <option>Mutual Fund</option>
                      <option>Gold Investment</option>
                      <option>Stocks</option>
                      <option>Government Bonds</option>
                      <option>Insurance Plan</option>
                      <option>Other</option>
                    </select>
                  </Field>

                  <Field label="Investment Amount">
                    <input
                      name="amount"
                      type="number"
                      value={investmentForm.amount}
                      onChange={handleInvestmentChange}
                      placeholder="Enter amount"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Duration">
                    <select
                      name="duration"
                      value={investmentForm.duration}
                      onChange={handleInvestmentChange}
                      style={styles.input}
                    >
                      <option value="">Select duration</option>
                      <option>6 Months</option>
                      <option>1 Year</option>
                      <option>2 Years</option>
                      <option>3 Years</option>
                      <option>5 Years</option>
                      <option>10 Years</option>
                    </select>
                  </Field>

                  <Field label="Risk Level">
                    <select
                      name="riskLevel"
                      value={investmentForm.riskLevel}
                      onChange={handleInvestmentChange}
                      style={styles.input}
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </Field>

                  <Field label="Expected Return">
                    <input
                      name="expectedReturn"
                      type="number"
                      value={investmentForm.expectedReturn}
                      onChange={handleInvestmentChange}
                      placeholder="Enter expected return"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Nominee Name">
                    <input
                      name="nomineeName"
                      value={investmentForm.nomineeName}
                      onChange={handleInvestmentChange}
                      placeholder="Enter nominee name"
                      style={styles.input}
                    />
                  </Field>

                  <div style={{ gridColumn: "span 4" }}>
                    <Field label="Notes">
                      <textarea
                        name="notes"
                        value={investmentForm.notes}
                        onChange={handleInvestmentChange}
                        placeholder="Example: Long term savings, retirement plan, child education..."
                        style={styles.textArea}
                      />
                    </Field>
                  </div>
                </div>

                <button type="submit" style={styles.investBtn}>
                  <PlusCircle size={18} /> Add Investment
                </button>
              </form>

              <div style={styles.subCard}>
                <h2>Investment History</h2>

                {currentInvestments.length === 0 ? (
                  <p>No investments added yet.</p>
                ) : (
                  currentInvestments.map((investment) => (
                    <div key={investment.id} style={styles.historyItem}>
                      <div>
                        <h3>{investment.investmentType}</h3>

                        <p>
                          Amount: {formatMoney(investment.amount)} | Expected
                          Return: {formatMoney(investment.expectedReturn)}
                        </p>

                        <p>
                          Duration: {investment.duration} | Risk:{" "}
                          {investment.riskLevel}
                        </p>

                        <small>
                          Nominee: {investment.nomineeName || "Not added"} |
                          Date: {investment.date}
                        </small>
                      </div>

                      <span style={styles.activeBadge}>
                        {investment.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedPage === "transfer" && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Fund Transfer</h2>

                  <p style={styles.desc}>
                    Transfer money securely to another account.
                  </p>
                </div>

                <button
                  style={styles.saveBtn}
                  onClick={() => setShowTransferForm(!showTransferForm)}
                >
                  <Send size={18} />
                  {showTransferForm ? "Close Form" : "Start Transfer"}
                </button>
              </div>

              {showTransferForm && (
                <form onSubmit={submitTransfer} style={styles.subCard}>
                  <div style={styles.formGrid}>
                    <input
                      name="beneficiaryName"
                      value={transferForm.beneficiaryName}
                      onChange={handleTransferChange}
                      placeholder="Beneficiary Name"
                      style={styles.input}
                    />

                    <input
                      name="beneficiaryAccount"
                      value={transferForm.beneficiaryAccount}
                      onChange={handleTransferChange}
                      placeholder="Account Number"
                      style={styles.input}
                    />

                    <input
                      name="ifsc"
                      value={transferForm.ifsc}
                      onChange={handleTransferChange}
                      placeholder="IFSC Code"
                      style={styles.input}
                    />

                    <input
                      name="bankName"
                      value={transferForm.bankName}
                      onChange={handleTransferChange}
                      placeholder="Bank Name"
                      style={styles.input}
                    />

                    <input
                      name="amount"
                      type="number"
                      value={transferForm.amount}
                      onChange={handleTransferChange}
                      placeholder="Amount"
                      style={styles.input}
                    />

                    <select
                      name="transferType"
                      value={transferForm.transferType}
                      onChange={handleTransferChange}
                      style={styles.input}
                    >
                      <option>IMPS</option>
                      <option>NEFT</option>
                      <option>RTGS</option>
                      <option>UPI</option>
                    </select>

                    <textarea
                      name="remarks"
                      value={transferForm.remarks}
                      onChange={handleTransferChange}
                      placeholder="Remarks"
                      style={styles.textArea}
                    />
                  </div>

                  <button type="submit" style={styles.primaryFullBtn}>
                    <Send size={18} /> Submit Transfer
                  </button>
                </form>
              )}

              <div style={styles.subCard}>
                <h2>Transfer History</h2>

                {currentTransfers.length === 0 ? (
                  <p>No transfers made yet.</p>
                ) : (
                  currentTransfers.map((transfer) => (
                    <div key={transfer.id} style={styles.historyItem}>
                      <div>
                        <h3>{transfer.beneficiaryName}</h3>

                        <p>
                          {formatMoney(transfer.amount)} |{" "}
                          {transfer.transferType} | {transfer.bankName}
                        </p>

                        <small>
                          A/C: {transfer.beneficiaryAccount} | IFSC:{" "}
                          {transfer.ifsc}
                        </small>
                      </div>

                      <span style={styles.activeBadge}>{transfer.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedPage === "statements" && (
            <TransactionsTable
              transactions={transactions}
              deleteTransaction={deleteTransaction}
              onViewAll={() => showToast("All transactions are already shown")}
            />
          )}

          {selectedPage === "loan" && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Apply for Loan</h2>

              <p style={styles.desc}>
                Fill the details below and submit your loan request.
              </p>

              <form onSubmit={submitLoanApplication} style={styles.subCard}>
                <div style={styles.formGrid}>
                  <input
                    name="fullName"
                    value={loanForm.fullName}
                    onChange={handleLoanChange}
                    placeholder="Full Name"
                    style={styles.input}
                  />

                  <input
                    name="email"
                    value={loanForm.email}
                    onChange={handleLoanChange}
                    placeholder="Email"
                    style={styles.input}
                  />

                  <input
                    name="phone"
                    value={loanForm.phone}
                    onChange={handleLoanChange}
                    placeholder="Phone Number"
                    style={styles.input}
                  />

                  <select
                    name="loanType"
                    value={loanForm.loanType}
                    onChange={handleLoanChange}
                    style={styles.input}
                  >
                    <option>Personal Loan</option>
                    <option>Home Loan</option>
                    <option>Vehicle Loan</option>
                    <option>Education Loan</option>
                    <option>Business Loan</option>
                  </select>

                  <input
                    name="amount"
                    type="number"
                    value={loanForm.amount}
                    onChange={handleLoanChange}
                    placeholder="Loan Amount"
                    style={styles.input}
                  />

                  <input
                    name="monthlyIncome"
                    type="number"
                    value={loanForm.monthlyIncome}
                    onChange={handleLoanChange}
                    placeholder="Monthly Income"
                    style={styles.input}
                  />

                  <select
                    name="employmentType"
                    value={loanForm.employmentType}
                    onChange={handleLoanChange}
                    style={styles.input}
                  >
                    <option>Salaried</option>
                    <option>Self Employed</option>
                    <option>Business Owner</option>
                    <option>Student</option>
                  </select>

                  <select
                    name="tenure"
                    value={loanForm.tenure}
                    onChange={handleLoanChange}
                    style={styles.input}
                  >
                    <option value="">Select Tenure</option>
                    <option>6 Months</option>
                    <option>1 Year</option>
                    <option>2 Years</option>
                    <option>5 Years</option>
                    <option>10 Years</option>
                  </select>

                  <select
                    name="existingLoan"
                    value={loanForm.existingLoan}
                    onChange={handleLoanChange}
                    style={styles.input}
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>

                  <textarea
                    name="purpose"
                    value={loanForm.purpose}
                    onChange={handleLoanChange}
                    placeholder="Loan Purpose"
                    style={styles.textArea}
                  />

                  <textarea
                    name="address"
                    value={loanForm.address}
                    onChange={handleLoanChange}
                    placeholder="Address"
                    style={styles.textArea}
                  />
                </div>

                <button type="submit" style={styles.primaryFullBtn}>
                  <BadgeIndianRupee size={18} /> Submit Loan Application
                </button>
              </form>

              <div style={styles.subCard}>
                <h2>My Loan Applications</h2>

                {currentLoanApplications.length === 0 ? (
                  <p>No loan applications submitted yet.</p>
                ) : (
                  currentLoanApplications.map((loan) => (
                    <div key={loan.id} style={styles.historyItem}>
                      <div>
                        <h3>{loan.loanType}</h3>

                        <p>
                          Amount: {formatMoney(loan.amount)} | Tenure:{" "}
                          {loan.tenure}
                        </p>

                        <small>Applied Date: {loan.appliedDate}</small>
                      </div>

                      <span style={styles.pendingBadge}>{loan.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedPage === "settings" && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Settings</h2>

              <p style={styles.desc}>
                Edit your registered details and reset your account password.
              </p>

              <div style={styles.settingsGrid}>
                <form onSubmit={updateProfile} style={styles.subCard}>
                  <h2>Edit Profile Details</h2>

                  <label style={styles.label}>Full Name</label>
                  <input
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    placeholder="Full Name"
                    style={styles.input}
                    required
                  />

                  <label style={styles.label}>Email</label>
                  <input
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    placeholder="Email"
                    style={styles.input}
                    required
                  />

                  <label style={styles.label}>Phone Number</label>
                  <input
                    name="phone"
                    value={profileForm.phone}
                    onChange={(e) => {
                      const onlyNumbers = e.target.value.replace(/\D/g, "");
                      setProfileForm({ ...profileForm, phone: onlyNumbers });
                    }}
                    placeholder="Phone Number"
                    style={styles.input}
                    required
                    maxLength="10"
                  />

                  <label style={styles.label}>Aadhaar Card Number</label>
                  <input
                    name="aadhaarNumber"
                    value={profileForm.aadhaarNumber}
                    onChange={(e) => {
                      const onlyNumbers = e.target.value.replace(/\D/g, "");
                      setProfileForm({
                        ...profileForm,
                        aadhaarNumber: onlyNumbers,
                      });
                    }}
                    placeholder="Aadhaar Card Number"
                    style={styles.input}
                    required
                    maxLength="12"
                  />

                  <label style={styles.label}>PAN Card Number</label>
                  <input
                    name="panNumber"
                    value={profileForm.panNumber}
                    onChange={(e) => {
                      setProfileForm({
                        ...profileForm,
                        panNumber: e.target.value.toUpperCase(),
                      });
                    }}
                    placeholder="PAN Card Number"
                    style={styles.input}
                    required
                    maxLength="10"
                  />

                  <button type="submit" style={styles.primaryFullBtn}>
                    <Save size={18} /> Save Profile Details
                  </button>
                </form>

                <form onSubmit={resetPassword} style={styles.subCard}>
                  <h2>Reset Password</h2>

                  <label style={styles.label}>Current Password</label>
                  <input
                    name="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    style={styles.input}
                    required
                  />

                  <label style={styles.label}>New Password</label>
                  <input
                    name="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                    style={styles.input}
                    required
                  />

                  <label style={styles.label}>Confirm New Password</label>
                  <input
                    name="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    style={styles.input}
                    required
                  />

                  <button type="submit" style={styles.investBtn}>
                    <ShieldCheck size={18} /> Reset Password
                  </button>

                  <div style={styles.securityNote}>
                    <strong>Security Note</strong>
                    <p>
                      Do not share your password, OTP, Aadhaar, PAN, or banking
                      details with anyone.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>

        <footer style={styles.footer}>
          <div style={styles.footerItem}>
            <ShieldCheck size={30} />

            <div>
              <strong>Bank Grade Security</strong>
              <p>256-bit Encrypted</p>
            </div>
          </div>

          <div style={styles.footerItem}>
            <Headphones size={30} />

            <div>
              <strong>24/7 Premium Support</strong>
              <p>We are here for you</p>
            </div>
          </div>

          <div style={styles.footerItem}>
            <UsersRound size={30} />

            <div>
              <strong>Trusted by 10M+ Customers</strong>
              <p>Across India</p>
            </div>
          </div>
        </footer>

        {showAccountDetails && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalBox}>
              <h2 style={styles.cardTitle}>Account Details</h2>

              <p>
                <strong>Name:</strong> {userName}
              </p>
              <p>
                <strong>Customer ID:</strong> {customerId}
              </p>
              <p>
                <strong>Email:</strong> {userEmail}
              </p>
              <p>
                <strong>Phone:</strong> {customerPhone}
              </p>
              <p>
                <strong>Branch:</strong> {customerBranch}
              </p>
              <p>
                <strong>Account Type:</strong> {customerAccountType}
              </p>
              <p>
                <strong>Account Number:</strong>{" "}
                {maskAccountNumber(customerAccountNumber)}
              </p>
              <p>
                <strong>IFSC Code:</strong> {customerIFSC}
              </p>
              <p>
                <strong>CIF Number:</strong> {customerCIF}
              </p>
              <p>
                <strong>KYC Status:</strong> {customerKYC}
              </p>
              <p>
                <strong>Account Status:</strong> {customerStatus}
              </p>
              <p>
                <strong>PAN Number:</strong> {customerPan}
              </p>
              <p>
                <strong>Aadhaar Number:</strong> {customerAadhaar}
              </p>
              <p>
                <strong>Total Income:</strong>{" "}
                {formatMoney(dashboard.totalIncome)}
              </p>
              <p>
                <strong>Total Expense:</strong>{" "}
                {formatMoney(dashboard.totalExpense)}
              </p>
              <p>
                <strong>Balance:</strong> {formatMoney(dashboard.balance)}
              </p>
              <p>
                <strong>Investments:</strong>{" "}
                {formatMoney(totalInvestmentValue)}
              </p>

              <button
                style={styles.goldBtn}
                onClick={() => setShowAccountDetails(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showReportModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalBox}>
              <h2 style={styles.cardTitle}>Financial Report</h2>

              <p>
                <strong>Total Income:</strong>{" "}
                {formatMoney(dashboard.totalIncome)}
              </p>
              <p>
                <strong>Total Expense:</strong>{" "}
                {formatMoney(dashboard.totalExpense)}
              </p>
              <p>
                <strong>Available Balance:</strong>{" "}
                {formatMoney(dashboard.balance)}
              </p>
              <p>
                <strong>Total Investments:</strong>{" "}
                {formatMoney(totalInvestmentValue)}
              </p>
              <p>
                <strong>Expected Returns:</strong>{" "}
                {formatMoney(totalExpectedReturns)}
              </p>
              <p>
                <strong>Total Transactions:</strong> {transactions.length}
              </p>
              <p>
                <strong>Loan Applications:</strong>{" "}
                {currentLoanApplications.length}
              </p>
              <p>
                <strong>Fund Transfers:</strong> {currentTransfers.length}
              </p>

              <button
                style={styles.goldBtn}
                onClick={() => setShowReportModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {toast && <div style={styles.toast}>{toast}</div>}

        <AIChatBox role="customer" page={selectedPage} userName={userName} />
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function AuthInput({ icon: Icon, children }) {
  return (
    <div style={styles.authInputWrap}>
      <Icon size={22} style={styles.authInputIcon} />
      {children}
    </div>
  );
}

function SummaryCard({ title, value, trend, icon: Icon, variant }) {
  const cardStyle =
    variant === "green"
      ? styles.summaryCardGreen
      : variant === "red"
      ? styles.summaryCardRed
      : variant === "blue"
      ? styles.summaryCardBlue
      : styles.summaryCardPurple;

  const iconStyle =
    variant === "green"
      ? styles.roundIconGreen
      : variant === "red"
      ? styles.roundIconRed
      : variant === "blue"
      ? styles.roundIconBlue
      : styles.roundIconPurple;

  const textStyle =
    variant === "green"
      ? styles.greenText
      : variant === "red"
      ? styles.redText
      : variant === "blue"
      ? styles.blueText
      : styles.goldText;

  return (
    <div style={cardStyle}>
      <div style={iconStyle}>
        <Icon size={34} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={styles.cardLabel}>{title}</p>
        <h2 style={textStyle}>{value}</h2>
        <small style={styles.smallGold}>{trend}</small>
      </div>

      <span style={styles.dots}>⋮</span>
    </div>
  );
}

function TransactionsTable({ transactions, deleteTransaction, onViewAll }) {
  return (
    <div style={styles.cardSmallWide}>
      <div style={styles.tableHeader}>
        <div>
          <h2 style={styles.cardTitle}>Recent Transactions</h2>
          <p style={styles.desc}>Your latest income and expense entries.</p>
        </div>

        <button style={styles.viewAllBtn} onClick={onViewAll}>
          View All
        </button>
      </div>

      {transactions.length === 0 ? (
        <p style={styles.emptyText}>No transactions found.</p>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((t) => (
                <tr key={t._id || t.id}>
                  <td style={styles.td}>
                    <div style={styles.tableCellFlex}>
                      <CalendarDays size={15} />
                      {formatDate(t.date || t.createdAt)}
                    </div>
                  </td>

                  <td style={styles.td}>{t.description || "Transaction"}</td>

                  <td style={styles.td}>
                    <span style={styles.categoryBadge}>
                      {t.category || "Other"}
                    </span>
                  </td>

                  <td style={styles.td}>
                    <span
                      style={
                        t.type === "income"
                          ? styles.incomeBadge
                          : styles.expenseBadge
                      }
                    >
                      {t.type}
                    </span>
                  </td>

                  <td
                    style={{
                      ...styles.td,
                      color: t.type === "income" ? "#22c55e" : "#ef4444",
                      fontWeight: "900",
                    }}
                  >
                    {t.type === "income" ? "+" : "-"} {formatMoney(t.amount)}
                  </td>

                  <td style={styles.td}>
                    <span style={styles.activeBadge}>Completed</span>
                  </td>

                  <td style={styles.td}>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => deleteTransaction(t._id || t.id)}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const royalFont = "'Cinzel', Georgia, 'Times New Roman', serif";
const bodyFont = "'Inter', Arial, sans-serif";

const styles = {
  loginPage: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "58% 42%",
    background: "#020617",
    fontFamily: bodyFont,
    overflow: "hidden",
  },

  background:
  "linear-gradient(rgba(2,8,23,0.78), rgba(2,8,23,0.88)), url('/royal-dashboard-bg.png')",
backgroundSize: "cover",
backgroundPosition: "center",
backgroundAttachment: "fixed",

  loginLeft: {
    minHeight: "100vh",
    position: "relative",
    backgroundImage:
      "linear-gradient(90deg, rgba(2,8,23,0.46), rgba(2,8,23,0.24), rgba(2,8,23,0.10)), url('/royal-login-bg.png')",
    backgroundSize: "cover",
    backgroundPosition: "center center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    alignItems: "center",
    padding: "70px 70px 70px 90px",
    boxSizing: "border-box",
  },

  loginHeroContent: {
    maxWidth: "700px",
    color: "#ffffff",
    position: "relative",
    zIndex: 2,
  },

  loginLogoBox: {
    width: "118px",
    height: "118px",
    borderRadius: "14px",
    border: "2px solid rgba(247,210,139,0.95)",
    color: "#f7d28b",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "rgba(2,8,23,0.48)",
    boxShadow: "0 0 45px rgba(212,175,55,0.28)",
    marginBottom: "24px",
  },

  loginLogoText: {
    fontFamily: royalFont,
    fontSize: "38px",
    fontWeight: "900",
    lineHeight: "32px",
  },

  loginBrand: {
    margin: "0",
    fontFamily: royalFont,
    fontSize: "42px",
    color: "#f7d28b",
    fontWeight: "900",
    textShadow: "0 8px 28px rgba(0,0,0,0.8)",
  },

  loginDivider: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    color: "#f7d28b",
    margin: "30px 0",
  },

  loginDividerLine: {
    width: "140px",
    height: "1px",
    display: "block",
    background:
      "linear-gradient(90deg, rgba(247,210,139,0.05), rgba(247,210,139,0.85), rgba(247,210,139,0.05))",
  },

  loginTitle: {
    margin: "0 0 26px",
    fontFamily: royalFont,
    fontSize: "72px",
    lineHeight: "0.98",
    color: "#ffffff",
    fontWeight: "900",
    letterSpacing: "-1px",
    textShadow: "0 10px 40px rgba(0,0,0,0.85)",
  },

  loginTitleGold: {
    color: "#f7d28b",
  },

  loginSubtitle: {
    maxWidth: "640px",
    color: "#f8fafc",
    fontSize: "22px",
    lineHeight: "1.55",
    margin: "0 0 56px",
    textShadow: "0 8px 28px rgba(0,0,0,0.8)",
  },

  loginFeatureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "22px",
    maxWidth: "760px",
  },

  loginFeatureCard: {
    minHeight: "180px",
    borderRadius: "16px",
    border: "1px solid rgba(247,210,139,0.75)",
    background:
      "linear-gradient(180deg, rgba(8,21,42,0.72), rgba(2,8,23,0.72))",
    color: "#f7d28b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "18px 14px",
    boxSizing: "border-box",
    boxShadow: "0 18px 42px rgba(0,0,0,0.42)",
    backdropFilter: "blur(3px)",
  },

  loginFeatureTitle: {
    margin: "14px 0 8px",
    fontSize: "17px",
    lineHeight: "1.25",
  },

  loginFeatureText: {
    margin: 0,
    color: "#e5e7eb",
    fontSize: "14px",
    lineHeight: "1.35",
  },

  loginRight: {
    minHeight: "100vh",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px",
    boxSizing: "border-box",
    background:
      "radial-gradient(circle at 78% 18%, rgba(212,175,55,0.16), transparent 28%), radial-gradient(circle at 12% 90%, rgba(247,210,139,0.13), transparent 30%), linear-gradient(135deg, #020617 0%, #071326 45%, #020617 100%)",
    overflow: "hidden",
  },

  loginRightGlow: {
    position: "absolute",
    width: "850px",
    height: "460px",
    right: "-180px",
    bottom: "-80px",
    opacity: 0.48,
    background:
      "repeating-linear-gradient(165deg, transparent 0px, transparent 12px, rgba(212,175,55,0.25) 13px, transparent 15px)",
    borderRadius: "50%",
    transform: "rotate(-10deg)",
  },

  loginCard: {
    width: "560px",
    position: "relative",
    zIndex: 2,
    padding: "46px 42px",
    borderRadius: "34px",
    border: "1px solid rgba(247,210,139,0.85)",
    background:
      "linear-gradient(145deg, rgba(8,21,42,0.92), rgba(2,8,23,0.86))",
    boxShadow:
      "0 42px 110px rgba(0,0,0,0.56), inset 0 1px 0 rgba(255,255,255,0.08)",
    color: "#ffffff",
    backdropFilter: "blur(10px)",
    boxSizing: "border-box",
  },

  formTopIcon: {
    width: "96px",
    height: "96px",
    margin: "0 auto 26px",
    borderRadius: "50%",
    border: "1px solid rgba(247,210,139,0.7)",
    color: "#f7d28b",
    background: "rgba(2,8,23,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 45px rgba(212,175,55,0.22)",
  },

  loginHeading: {
    margin: "0 0 14px",
    color: "#ffffff",
    textAlign: "center",
    fontSize: "40px",
    fontFamily: royalFont,
    fontWeight: "900",
  },

  loginSmallText: {
    margin: "0 0 46px",
    color: "#dbeafe",
    textAlign: "center",
    fontSize: "18px",
  },

  authInputWrap: {
    width: "100%",
    height: "72px",
    borderRadius: "16px",
    border: "1px solid rgba(148,163,184,0.55)",
    background: "rgba(15,23,42,0.58)",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    padding: "0 22px",
    marginBottom: "24px",
    boxSizing: "border-box",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
  },

  authInputIcon: {
    color: "#f7d28b",
    flexShrink: 0,
  },

  authInput: {
    flex: 1,
    height: "100%",
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#f8fafc",
    fontSize: "18px",
    fontWeight: "600",
  },

  loginBtn: {
    width: "100%",
    height: "72px",
    borderRadius: "16px",
    border: "1px solid rgba(247,210,139,0.8)",
    background:
      "linear-gradient(135deg, #f7d28b 0%, #d4af37 45%, #f7d28b 100%)",
    color: "#071326",
    fontSize: "18px",
    fontWeight: "900",
    cursor: "pointer",
    boxShadow: "0 18px 42px rgba(212,175,55,0.26)",
    marginTop: "14px",
  },

  message: {
    color: "#fca5a5",
    textAlign: "center",
    fontWeight: "800",
    marginTop: "18px",
  },

  loginOrBox: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    margin: "38px 0 24px",
  },

  loginOrLine: {
    flex: 1,
    height: "1px",
    background:
      "linear-gradient(90deg, transparent, rgba(148,163,184,0.55), transparent)",
  },

  loginOrText: {
    color: "#e5e7eb",
    fontSize: "18px",
  },

  linkBtn: {
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#f7d28b",
    fontSize: "20px",
    fontWeight: "800",
    cursor: "pointer",
  },

  page: {
  minHeight: "100vh",
  display: "flex",
  backgroundImage:
  "linear-gradient(rgba(2, 8, 23, 0.28), rgba(2, 8, 23, 0.48)), url('/royal-dashboard-bg.png')",
  backgroundSize: "cover",
  backgroundPosition: "center center",
  backgroundRepeat: "no-repeat",
  backgroundAttachment: "fixed",
  fontFamily: bodyFont,
  color: "#f8fafc",
},

  sidebar: {
    width: "270px",
    minWidth: "270px",
    background:
      "linear-gradient(180deg, rgba(3,10,25,0.98), rgba(8,26,52,0.98))",
    color: "#ffffff",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid rgba(212, 175, 55, 0.7)",
    boxShadow: "10px 0 35px rgba(0,0,0,0.45)",
  },

  sidebarClosed: {
    width: "0",
    minWidth: "0",
    overflow: "hidden",
    background: "#06152c",
  },

  logoBox: {
    height: "92px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "0 20px",
    borderBottom: "1px solid rgba(212,175,55,0.32)",
    boxSizing: "border-box",
  },

  logoCrest: {
    width: "58px",
    height: "58px",
    minWidth: "58px",
    borderRadius: "16px",
    border: "2px solid #d4af37",
    background: "radial-gradient(circle, #132b55, #030712)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#f7d28b",
    fontWeight: "900",
    fontSize: "21px",
    boxShadow: "0 0 25px rgba(212,175,55,0.42)",
    fontFamily: royalFont,
  },

  logoText: {
    margin: 0,
    color: "#f7d28b",
    fontFamily: royalFont,
    fontSize: "28px",
    lineHeight: 1,
  },

  logoSub: {
    margin: "5px 0 0",
    color: "#d1d5db",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "1.6px",
  },

  userBox: {
    height: "110px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "0 22px",
    boxSizing: "border-box",
  },

  avatar: {
    width: "50px",
    height: "50px",
    minWidth: "50px",
    borderRadius: "50%",
    border: "1px solid #d4af37",
    background: "rgba(37,99,235,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#f7d28b",
  },

  userName: {
    margin: 0,
    color: "#ffffff",
    textTransform: "capitalize",
    lineHeight: 1.2,
  },

  userRole: {
    margin: "4px 0 0",
    color: "#f7d28b",
    fontSize: "13px",
    fontWeight: "800",
  },

  ornament: {
    color: "#d4af37",
    textAlign: "center",
    opacity: 0.85,
    marginBottom: "10px",
  },

  nav: {
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "9px",
  },

  navButton: {
    height: "50px",
    padding: "0 16px",
    borderRadius: "12px",
    border: "1px solid transparent",
    background: "transparent",
    color: "#e5e7eb",
    textAlign: "left",
    fontWeight: "800",
    display: "flex",
    gap: "12px",
    alignItems: "center",
    cursor: "pointer",
    boxSizing: "border-box",
  },

  navButtonActive: {
    height: "50px",
    padding: "0 16px",
    borderRadius: "12px",
    border: "1px solid #d4af37",
    background:
      "linear-gradient(135deg, rgba(212,175,55,0.24), rgba(37,99,235,0.16))",
    color: "#f7d28b",
    textAlign: "left",
    fontWeight: "900",
    display: "flex",
    gap: "12px",
    alignItems: "center",
    cursor: "pointer",
    boxShadow: "0 0 22px rgba(212,175,55,0.22)",
    boxSizing: "border-box",
  },

  navIcon: {
    color: "#f7d28b",
    minWidth: "20px",
  },

  sidebarCard: {
  margin: "auto 18px 28px",
  minHeight: "140px",
  padding: "20px",
  borderRadius: "18px",
  border: "1px solid rgba(212,175,55,0.55)",
  background: "rgba(212,175,55,0.08)",
  color: "#f7d28b",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
},

  logoutBtn: {
  margin: "0 18px 26px",
  height: "48px",
  borderRadius: "12px",
  border: "1px solid #d4af37",
  background:
    "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(2,8,23,0.95))",
  color: "#f7d28b",
  cursor: "pointer",
  fontWeight: "900",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
},

  main: {
  flex: 1,
  minWidth: 0,
  background: "transparent",
},

  topbar: {
  height: "92px",
  background: "rgba(3, 10, 25, 0.72)",
  borderBottom: "1px solid rgba(212,175,55,0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 28px",
  backdropFilter: "blur(14px)",
  gap: "22px",
  boxSizing: "border-box",
  position: "sticky",
  top: 0,
  zIndex: 5000,
},

  topLeft: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    minWidth: "360px",
  },

  menuBtn: {
    width: "44px",
    height: "44px",
    minWidth: "44px",
    borderRadius: "50%",
    border: "1px solid #d4af37",
    background: "#071326",
    color: "#f7d28b",
    cursor: "pointer",
    fontWeight: "900",
    boxShadow: "0 0 20px rgba(212,175,55,0.22)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  pageTitle: {
    color: "#f7d28b",
    fontSize: "30px",
    margin: 0,
    fontFamily: royalFont,
    letterSpacing: "0.4px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    lineHeight: 1.1,
  },

  pageSubtitle: {
    color: "#f7d28b",
    margin: "6px 0 0",
    fontSize: "14px",
  },

  topIcons: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  topButtonWrap: {
  position: "relative",
  zIndex: 6000,
},

  searchBox: {
    width: "420px",
    height: "48px",
    borderRadius: "999px",
    border: "1px solid rgba(212,175,55,0.65)",
    background: "rgba(2,8,23,0.78)",
    color: "#f7d28b",
    display: "grid",
    gridTemplateColumns: "22px 1fr 82px",
    alignItems: "center",
    gap: "10px",
    padding: "0 12px 0 16px",
    boxSizing: "border-box",
  },

  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#f7d28b",
    fontWeight: "700",
    minWidth: 0,
  },

  searchBtn: {
    height: "32px",
    width: "78px",
    border: "1px solid #d4af37",
    background: "rgba(212,175,55,0.15)",
    color: "#f7d28b",
    borderRadius: "999px",
    cursor: "pointer",
    fontWeight: "900",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  circleBtn: {
    width: "48px",
    height: "48px",
    minWidth: "48px",
    borderRadius: "50%",
    border: "1px solid #d4af37",
    background: "rgba(2,8,23,0.85)",
    color: "#f7d28b",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  dropdownBox: {
  position: "absolute",
  top: "58px",
  right: "0",
  width: "300px",
  background:
    "linear-gradient(145deg, rgba(4,15,34,0.98), rgba(2,8,23,0.98))",
  border: "1px solid rgba(212,175,55,0.75)",
  borderRadius: "16px",
  padding: "18px",
  color: "#f8fafc",
  zIndex: 99999,
  boxShadow: "0 22px 60px rgba(0,0,0,0.75)",
  backdropFilter: "blur(16px)",
},

  dropdownBtn: {
    width: "100%",
    height: "40px",
    borderRadius: "10px",
    border: "1px solid #d4af37",
    background: "rgba(212,175,55,0.18)",
    color: "#f7d28b",
    cursor: "pointer",
    fontWeight: "900",
    marginTop: "10px",
  },

  dropdownDangerBtn: {
    width: "100%",
    height: "40px",
    borderRadius: "10px",
    border: "1px solid rgba(239,68,68,0.7)",
    background: "rgba(127,29,29,0.8)",
    color: "#fee2e2",
    cursor: "pointer",
    fontWeight: "900",
    marginTop: "10px",
  },

  content: {
  padding: "24px",
  background: "transparent",
},

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "18px",
    marginBottom: "20px",
    alignItems: "stretch",
  },

  summaryGridThree: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "18px",
  },

  summaryCardGreen: {
    minHeight: "115px",
    background:
      "linear-gradient(145deg, rgba(2,68,45,0.9), rgba(3,10,25,0.95))",
    borderRadius: "18px",
    padding: "22px",
    border: "1px solid rgba(212,175,55,0.52)",
    boxShadow: "0 18px 38px rgba(0,0,0,0.32)",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    position: "relative",
    boxSizing: "border-box",
  },

  summaryCardRed: {
    minHeight: "115px",
    background:
      "linear-gradient(145deg, rgba(90,15,20,0.88), rgba(3,10,25,0.95))",
    borderRadius: "18px",
    padding: "22px",
    border: "1px solid rgba(212,175,55,0.52)",
    boxShadow: "0 18px 38px rgba(0,0,0,0.32)",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    position: "relative",
    boxSizing: "border-box",
  },

  summaryCardBlue: {
    minHeight: "115px",
    background:
      "linear-gradient(145deg, rgba(8,50,95,0.9), rgba(3,10,25,0.95))",
    borderRadius: "18px",
    padding: "22px",
    border: "1px solid rgba(212,175,55,0.52)",
    boxShadow: "0 18px 38px rgba(0,0,0,0.32)",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    position: "relative",
    boxSizing: "border-box",
  },

  summaryCardPurple: {
    minHeight: "115px",
    background:
      "linear-gradient(145deg, rgba(68,25,95,0.9), rgba(3,10,25,0.95))",
    borderRadius: "18px",
    padding: "22px",
    border: "1px solid rgba(212,175,55,0.52)",
    boxShadow: "0 18px 38px rgba(0,0,0,0.32)",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    position: "relative",
    boxSizing: "border-box",
  },

  roundIconGreen: {
    width: "66px",
    height: "66px",
    minWidth: "66px",
    borderRadius: "50%",
    border: "1px solid #22c55e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#f7d28b",
    background: "rgba(2,8,23,0.7)",
  },

  roundIconRed: {
    width: "66px",
    height: "66px",
    minWidth: "66px",
    borderRadius: "50%",
    border: "1px solid #ef4444",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#f7d28b",
    background: "rgba(2,8,23,0.7)",
  },

  roundIconBlue: {
    width: "66px",
    height: "66px",
    minWidth: "66px",
    borderRadius: "50%",
    border: "1px solid #38bdf8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#38bdf8",
    background: "rgba(2,8,23,0.7)",
  },

  roundIconPurple: {
    width: "66px",
    height: "66px",
    minWidth: "66px",
    borderRadius: "50%",
    border: "1px solid #a855f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#c084fc",
    background: "rgba(2,8,23,0.7)",
  },

  dots: {
    position: "absolute",
    top: "18px",
    right: "18px",
    color: "#fff",
    fontSize: "25px",
    lineHeight: 1,
  },

  cardLabel: {
    margin: 0,
    color: "#e5e7eb",
    fontWeight: "900",
    textTransform: "uppercase",
    fontSize: "13px",
    letterSpacing: "0.7px",
  },

  greenText: {
    color: "#ffffff",
    margin: "7px 0",
    fontSize: "30px",
    fontFamily: royalFont,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  redText: {
    color: "#ffffff",
    margin: "7px 0",
    fontSize: "30px",
    fontFamily: royalFont,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  blueText: {
    color: "#ffffff",
    margin: "7px 0",
    fontSize: "30px",
    fontFamily: royalFont,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  goldText: {
    color: "#ffffff",
    margin: "7px 0",
    fontSize: "30px",
    fontFamily: royalFont,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  smallGold: {
    color: "#86efac",
  },

  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1.15fr",
    gap: "20px",
    marginBottom: "20px",
    alignItems: "stretch",
  },

  card: {
  background:
    "linear-gradient(145deg, rgba(4,15,34,0.58), rgba(2,8,23,0.66))",
  borderRadius: "18px",
  padding: "24px",
  border: "1px solid rgba(212,175,55,0.58)",
  boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
  marginBottom: "24px",
  color: "#f8fafc",
  boxSizing: "border-box",
  backdropFilter: "blur(7px)",
},

  cardLarge: {
    background:
      "linear-gradient(145deg, rgba(4,15,34,0.92), rgba(2,8,23,0.94))",
    borderRadius: "18px",
    padding: "24px",
    border: "1px solid rgba(212,175,55,0.52)",
    boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
    color: "#f8fafc",
    boxSizing: "border-box",
  },

  cardSmall: {
    background:
      "linear-gradient(145deg, rgba(4,15,34,0.92), rgba(2,8,23,0.94))",
    borderRadius: "18px",
    padding: "24px",
    border: "1px solid rgba(212,175,55,0.52)",
    boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
    color: "#f8fafc",
    boxSizing: "border-box",
  },

  cardSmallWide: {
    background:
      "linear-gradient(145deg, rgba(4,15,34,0.92), rgba(2,8,23,0.94))",
    borderRadius: "18px",
    padding: "24px",
    border: "1px solid rgba(212,175,55,0.52)",
    boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
    color: "#f8fafc",
    boxSizing: "border-box",
  },

  accountCard: {
    background:
      "linear-gradient(145deg, rgba(4,15,34,0.93), rgba(2,8,23,0.94))",
    borderRadius: "18px",
    padding: "24px",
    border: "1px solid rgba(212,175,55,0.6)",
    boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
    color: "#f8fafc",
    boxSizing: "border-box",
  },

  accountInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
  },

  lionBadge: {
    width: "150px",
    height: "150px",
    minWidth: "150px",
    borderRadius: "28px",
    border: "1px solid rgba(212,175,55,0.75)",
    color: "#f7d28b",
    background:
      "radial-gradient(circle, rgba(212,175,55,0.25), rgba(2,8,23,0.92))",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: royalFont,
    fontSize: "34px",
    boxShadow: "0 0 35px rgba(212,175,55,0.2)",
  },

  cardTitle: {
    marginTop: 0,
    marginBottom: "10px",
    color: "#f7d28b",
    fontFamily: royalFont,
    lineHeight: 1.1,
  },

  desc: {
    color: "#cbd5e1",
    marginTop: 0,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
  },

  label: {
    display: "block",
    fontWeight: "900",
    marginBottom: "8px",
    color: "#f7d28b",
  },

  input: {
    width: "100%",
    height: "42px",
    boxSizing: "border-box",
    padding: "0 13px",
    borderRadius: "10px",
    border: "1px solid rgba(212,175,55,0.45)",
    outline: "none",
    marginBottom: "14px",
    background: "rgba(2,8,23,0.78)",
    color: "#f8fafc",
    fontWeight: "700",
  },

  textArea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "10px",
    border: "1px solid rgba(212,175,55,0.45)",
    outline: "none",
    minHeight: "86px",
    resize: "vertical",
    marginBottom: "14px",
    background: "rgba(2,8,23,0.78)",
    color: "#f8fafc",
    gridColumn: "span 4",
  },

  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
    marginTop: "14px",
    alignItems: "center",
  },

  incomeBtn: {
    height: "52px",
    borderRadius: "10px",
    border: "1px solid rgba(34,197,94,0.8)",
    background: "linear-gradient(135deg, #064e3b, #052e1f)",
    color: "#dcfce7",
    fontWeight: "900",
    cursor: "pointer",
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },

  expenseBtn: {
    height: "52px",
    borderRadius: "10px",
    border: "1px solid rgba(239,68,68,0.8)",
    background: "linear-gradient(135deg, #7f1d1d, #450a0a)",
    color: "#fee2e2",
    fontWeight: "900",
    cursor: "pointer",
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },

  saveBtn: {
    height: "52px",
    borderRadius: "10px",
    border: "1px solid rgba(59,130,246,0.8)",
    background: "linear-gradient(135deg, #1d4ed8, #0f172a)",
    color: "#dbeafe",
    fontWeight: "900",
    cursor: "pointer",
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },

  investBtn: {
    width: "100%",
    height: "48px",
    borderRadius: "10px",
    border: "1px solid #d4af37",
    background: "linear-gradient(135deg, #071326, #92400e)",
    color: "#f7d28b",
    fontWeight: "900",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },

  primaryFullBtn: {
    width: "100%",
    height: "48px",
    borderRadius: "10px",
    border: "1px solid #d4af37",
    background: "linear-gradient(135deg, #071326, #12325c)",
    color: "#f7d28b",
    fontWeight: "900",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },

  goldBtn: {
    height: "44px",
    padding: "0 18px",
    borderRadius: "10px",
    border: "1px solid #d4af37",
    background:
      "linear-gradient(135deg, rgba(212,175,55,0.25), rgba(2,8,23,0.9))",
    color: "#f7d28b",
    fontWeight: "900",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
  },

  goldMiniBtn: {
    height: "40px",
    minWidth: "120px",
    padding: "0 18px",
    borderRadius: "999px",
    border: "1px solid #d4af37",
    background: "rgba(2,8,23,0.75)",
    color: "#f7d28b",
    fontWeight: "900",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  labelGold: {
    color: "#f7d28b",
    fontWeight: "900",
  },

  goldAmount: {
    color: "#f7d28b",
    fontFamily: royalFont,
  },

  branchGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "18px",
  },

  branchCard: {
    background: "rgba(2,8,23,0.75)",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid rgba(212,175,55,0.45)",
    boxShadow: "0 10px 28px rgba(0,0,0,0.25)",
  },

  branchTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#f7d28b",
  },

  branchStats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    background: "rgba(15,23,42,0.8)",
    padding: "14px",
    borderRadius: "12px",
    marginTop: "14px",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "14px",
  },

  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
    marginBottom: "16px",
  },

  viewAllBtn: {
    width: "110px",
    height: "40px",
    minWidth: "110px",
    borderRadius: "999px",
    border: "1px solid #d4af37",
    background: "rgba(2,8,23,0.75)",
    color: "#f7d28b",
    fontWeight: "900",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },

  th: {
    textAlign: "left",
    padding: "13px 14px",
    background: "rgba(212,175,55,0.12)",
    color: "#f7d28b",
    borderBottom: "1px solid rgba(212,175,55,0.35)",
    textTransform: "uppercase",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "14px",
    borderBottom: "1px solid rgba(212,175,55,0.18)",
    color: "#e5e7eb",
    verticalAlign: "middle",
  },

  tableCellFlex: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    whiteSpace: "nowrap",
  },

  incomeBadge: {
    background: "rgba(34,197,94,0.18)",
    color: "#86efac",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "800",
    textTransform: "capitalize",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  expenseBadge: {
    background: "rgba(239,68,68,0.18)",
    color: "#fca5a5",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "800",
    textTransform: "capitalize",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  categoryBadge: {
    background: "rgba(37,99,235,0.2)",
    color: "#bfdbfe",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "800",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteBtn: {
    height: "36px",
    minWidth: "92px",
    background: "#7f1d1d",
    color: "#ffffff",
    border: "1px solid rgba(239,68,68,0.55)",
    padding: "0 12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "800",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
  },

  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(2,8,23,0.72)",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid rgba(212,175,55,0.3)",
    marginBottom: "12px",
  },

  activeBadge: {
    background: "rgba(34,197,94,0.16)",
    color: "#86efac",
    padding: "7px 12px",
    borderRadius: "999px",
    fontWeight: "900",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  pendingBadge: {
    background: "rgba(245,158,11,0.16)",
    color: "#fde68a",
    padding: "8px 14px",
    borderRadius: "999px",
    fontWeight: "900",
  },

  subCard: {
  background: "rgba(2,8,23,0.48)",
  borderRadius: "16px",
  padding: "20px",
  border: "1px solid rgba(212,175,55,0.40)",
  marginTop: "22px",
  backdropFilter: "blur(8px)",
},

  settingsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    marginTop: "24px",
  },

  securityNote: {
    marginTop: "18px",
    padding: "16px",
    borderRadius: "12px",
    background: "rgba(146,64,14,0.18)",
    border: "1px solid rgba(251,191,36,0.35)",
    color: "#fde68a",
  },

  chartCircle: {
    width: "190px",
    height: "190px",
    margin: "20px auto",
    borderRadius: "50%",
    border: "24px solid rgba(212,175,55,0.75)",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    alignItems: "center",
    justifyContent: "center",
    color: "#f7d28b",
    boxShadow: "inset 0 0 30px rgba(0,0,0,0.45)",
  },

  legend: {
    color: "#e5e7eb",
  },

  dotRed: {
    display: "inline-block",
    width: "10px",
    height: "10px",
    background: "#ef4444",
    borderRadius: "50%",
    marginRight: "8px",
  },

  dotPurple: {
    display: "inline-block",
    width: "10px",
    height: "10px",
    background: "#a855f7",
    borderRadius: "50%",
    marginRight: "8px",
  },

  dotGold: {
    display: "inline-block",
    width: "10px",
    height: "10px",
    background: "#f59e0b",
    borderRadius: "50%",
    marginRight: "8px",
  },

  dotBlue: {
    display: "inline-block",
    width: "10px",
    height: "10px",
    background: "#3b82f6",
    borderRadius: "50%",
    marginRight: "8px",
  },

  footer: {
  margin: "0 28px 28px",
  minHeight: "88px",
  padding: "18px 42px",
  borderRadius: "32px 32px 0 0",
  border: "1px solid rgba(212,175,55,0.42)",
  background: "rgba(4,15,34,0.48)",
  backdropFilter: "blur(8px)",
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "22px",
  alignItems: "center",
},

  footerItem: {
    color: "#f7d28b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "14px",
    minHeight: "52px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },

  modalBox: {
    width: "520px",
    maxWidth: "90vw",
    background:
      "linear-gradient(145deg, rgba(4,15,34,0.98), rgba(2,8,23,0.98))",
    border: "1px solid rgba(212,175,55,0.65)",
    borderRadius: "18px",
    padding: "26px",
    color: "#f8fafc",
    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
  },

  emptyText: {
    color: "#e5e7eb",
  },

  toast: {
    position: "fixed",
    right: "28px",
    bottom: "28px",
    background: "#071326",
    color: "#f7d28b",
    border: "1px solid #d4af37",
    padding: "18px 24px",
    borderRadius: "14px",
    boxShadow: "0 12px 35px rgba(0,0,0,0.25)",
    zIndex: 10000,
    fontWeight: "900",
  },
};

export default Dashboard;