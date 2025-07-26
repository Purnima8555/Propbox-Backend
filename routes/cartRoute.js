const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../security/authorization");
const {
  addToCart,
  getCartByUser,
  updateCartItem,
  removeFromCart,
  clearCart
} = require("../controller/cartController");

router.post("/add", authenticateToken, addToCart);
router.get("/:user_id", authenticateToken, getCartByUser);
router.patch("/update/:id", authenticateToken, updateCartItem);
router.delete("/remove/:id", authenticateToken, removeFromCart);
router.delete("/clear/:user_id", authenticateToken, clearCart);

module.exports = router;