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
const Order = require("../model/order");

const router = express.Router();

router.post("/", authenticateToken, placeOrder);
router.get("/user/:user_id", authenticateToken, getOrdersByUser);

router.get("/check/:paymentIntentId", authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const order = await Order.findOne({ paymentIntentId });
    res.status(200).json({ exists: !!order });
  } catch (err) {
    console.error("Error checking order existence:", err);
    res.status(500).json({ message: "Failed to check order existence", error: err.message });
  }
});


router.get("/", authenticateToken, getAllOrders);
router.patch("/status/:id", authenticateToken, updateOrderStatus);
router.delete("/:id", authenticateToken, deleteOrder);
router.get("/counts/:user_id", authenticateToken, getOrderTypeCounts);
router.get("/currently-reading/:user_id", authenticateToken, getCurrentlyReading);

module.exports = router;