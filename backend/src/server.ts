// @ts-nocheck

const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const appModule = require("./app");
const app = appModule.default || appModule;
const connectDatabase = appModule.connectDatabase;

const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

const startServer = async () => {
  try {
    await connectDatabase();
    console.log("MongoDB Connected ✅");

    app.listen(PORT, HOST, () => {
      console.log(`FinSecure AI backend running on port ${PORT}`);
    });
  } catch (error: any) {
    console.error("Backend startup failed ❌");
    console.error(error?.message || error);
    process.exit(1);
  }
};

startServer();

process.on("unhandledRejection", (error: any) => {
  console.error("Unhandled Rejection ❌", error);
});

process.on("uncaughtException", (error: any) => {
  console.error("Uncaught Exception ❌", error);
});
