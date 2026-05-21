const parseAmount = (amount: any) => {
  if (typeof amount === "number") return amount;

  const cleaned = String(amount || "")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .trim();

  const value = Number(cleaned);

  return Number.isNaN(value) ? 0 : value;
};

const calculateTransactionRisk = (transaction: any) => {
  let score = 0;
  const reasons: string[] = [];

  const amount = parseAmount(transaction.amount);
  const type = String(transaction.type || "").toLowerCase();
  const status = String(transaction.status || "").toLowerCase();
  const time = String(transaction.time || "");

  if (amount >= 1000000) {
    score += 45;
    reasons.push("Very high transaction amount");
  } else if (amount >= 500000) {
    score += 35;
    reasons.push("High transaction amount");
  } else if (amount >= 100000) {
    score += 20;
    reasons.push("Above normal transaction amount");
  } else if (amount >= 50000) {
    score += 10;
    reasons.push("Medium value transaction");
  }

  if (type.includes("rtgs")) {
    score += 15;
    reasons.push("RTGS high-value transfer");
  }

  if (type.includes("cash withdrawal")) {
    score += 15;
    reasons.push("Cash withdrawal transaction");
  }

  if (type.includes("card payment") && amount >= 100000) {
    score += 20;
    reasons.push("Large card payment");
  }

  if (status === "flagged") {
    score += 40;
    reasons.push("Transaction status is flagged");
  }

  if (status === "failed") {
    score += 25;
    reasons.push("Failed transaction attempt");
  }

  if (status === "pending") {
    score += 10;
    reasons.push("Pending transaction needs review");
  }

  if (time) {
    const hour = Number(time.split(":")[0]);

    if (!Number.isNaN(hour) && (hour >= 22 || hour <= 5)) {
      score += 15;
      reasons.push("Unusual night-time transaction");
    }
  }

  let risk = "Normal";

  if (score >= 70) {
    risk = "High";
  } else if (score >= 40) {
    risk = "Medium";
  } else if (score >= 15) {
    risk = "Low";
  }

  if (reasons.length === 0) {
    reasons.push("No major risk factors detected");
  }

  return {
    risk,
    riskScore: score,
    riskReasons: reasons,
  };
};

module.exports = calculateTransactionRisk;