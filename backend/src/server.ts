const express = require("express");
const app = express();

const authRoutes = require("./routes/auth.routes");

app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/", (req:any,res:any)=>{
 res.send("FinSecure AI Backend Running 🚀");
});

app.listen(5000,()=>{
 console.log("Server running on port 5000");
});