const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const { sendEmail } = require("./src/services/emailService");

const contactRoutes = require("./src/routes/contactRoutes");
const supportRoutes = require("./src/routes/supportRoutes");

// ==================== MIDDLEWARE ====================

app.use(cors());
app.use(express.json());

// ==================== ROUTES ====================

app.use("/api/users", require("./src/routes/userRoutes"));
app.use("/api/posts", require("./src/routes/postRoutes"));
app.use("/api/reports", require("./src/routes/reportRoutes"));
app.use("/api/notifications", require("./src/routes/notificationRoutes"));
app.use("/api/chats", require("./src/routes/chatRoutes"));

app.use("/api/contact", contactRoutes);
app.use("/api/support", supportRoutes);

// ==================== SERVE UPLOADED FILES ====================

app.use("/uploads", express.static("uploads"));

// ==================== EXPORT APP ====================

module.exports = app;
