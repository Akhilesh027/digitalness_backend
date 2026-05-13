// src/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes.js");
const leadRoutes = require("./routes/leadRoutes.js");
const dealRoutes = require("./routes/dealRoutes.js");
const branchRoutes = require("./routes/branchRoutes.js");
const customerRoutes = require("./routes/customerRoutes.js");
const workRoutes = require("./routes/workRoutes.js");
const proposalRoutes = require("./routes/proposalRoutes.js");
const notificationRoutes = require("./routes/notificationRoutes.js");
const workApprovalRoutes = require("./routes/workApprovalRoutes.js");
const communicationRoutes = require("./routes/communicationRoutes.js");
const clientRoutes = require("./routes/clientRoutes.js");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
  "exp://10.77.15.28:8081",
  "https://chic-pony-e330ef.netlify.app",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join_customer_room", (customerId) => {
    socket.join(`customer_${customerId}`);
    console.log(`Joined room: customer_${customerId}`);
  });

  socket.on("leave_customer_room", (customerId) => {
    socket.leave(`customer_${customerId}`);
    console.log(`Left room: customer_${customerId}`);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("Digitalness CRM Backend is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/works", workRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/work-approvals", workApprovalRoutes);
app.use("/api/communications", communicationRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/tickets", require("./routes/ticketRoutes.js"));app.use(
  '/api/templates',
  require('./routes/templateRoutes.js')
);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });