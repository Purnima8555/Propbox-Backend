const express = require("express");
const path = require("path");
const connectDb = require("./config/db");
const paymentRouter = require("./routes/paymentRoute");
const bodyParser = require("body-parser");

const customerRouter = require("./routes/customerRoute");
const authRouter = require("./routes/authRoute");
const propRouter = require("./routes/propRoute");
const feedbackRouter = require("./routes/feedbackRoute");
const favoriteRouter = require("./routes/favoriteRoute");
const cartRouter = require("./routes/cartRoute");
const orderRouter = require("./routes/orderRoute");
const propRequestRouter = require("./routes/propRequestRoute");
const notificationRouter = require("./routes/notificationRoute");
const activityLogRouter = require("./routes/activityLogRoute");

const app = express();
connectDb();

const cors = require("cors");
app.use(cors({
  origin: "https://localhost:5173",
  methods: "GET,POST,PUT,PATCH,DELETE",
  allowedHeaders: "Content-Type,Authorization"
}));

// ✅ Handle Stripe webhook BEFORE express.json middleware
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

// ✅ After webhook, now add express.json() for all other routes
app.use(express.json());

// Static files
app.use("/prop_images", express.static(path.join(__dirname, "prop_images")));
app.use("/profilePicture", express.static("public/profilePicture"));

// Routes
app.use("/api/payments", paymentRouter); // Must come after webhook raw handler
app.use("/api/customer", customerRouter);
app.use("/api/auth", authRouter);
app.use("/api/props", propRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/favorites", favoriteRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", orderRouter);
app.use("/api/prop-requests", propRequestRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/activity-logs", activityLogRouter);

module.exports = app;
