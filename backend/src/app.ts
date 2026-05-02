const express = require("express");
const authRoutes = require("./routes/auth.routes");
const transactionRoutes = require("./routes/transaction.routes");

const app = express();
const dashboardRoutes = require("./routes/dashboard.routes");
app.use("/api/dashboard", dashboardRoutes);

app.use(express.json());

app.get("/", (req: any, res: any) => {
  res.send("FinSecure AI Backend Running 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);

module.exports = app;