const express = require("express");
const {
  placeOrder,
  getOrdersByUser,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  getOrderTypeCounts,
  getCurrentlyReading,
  getOrderByPaymentIntent,
} = require("../controller/orderController");
const { authenticateToken } = require("../security/authorization");

const router = express.Router();

router.post("/", authenticateToken, placeOrder);
router.get("/user/:user_id", authenticateToken, getOrdersByUser);
router.get("/by-payment-intent/:paymentIntentId", authenticateToken, getOrderByPaymentIntent);
router.get("/", authenticateToken, getAllOrders);
router.patch("/status/:id", authenticateToken, updateOrderStatus);
router.delete("/:id", authenticateToken, deleteOrder);
router.get("/counts/:user_id", authenticateToken, getOrderTypeCounts);
router.get("/currently-reading/:user_id", authenticateToken, getCurrentlyReading);

module.exports = router;