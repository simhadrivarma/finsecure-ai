const express = require("express");
const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(express.json());

app.get("/", (req: any, res: any) => {
  res.send("FinSecure AI Backend Running 🚀");
});

app.use("/api/auth", authRoutes);

module.exports = app;