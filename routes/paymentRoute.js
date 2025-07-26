const express = require("express");
const Stripe = require("stripe");
const dotenv = require("dotenv");
const { authenticateToken } = require("../security/authorization");
const Prop = require("../model/prop");
const Order = require("../model/order");
const Cart = require("../model/cart");

dotenv.config();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

router.post("/create-checkout-session", authenticateToken, async (req, res) => {
  try {
    const { user_id, items, deliveryFee, total_price } = req.body;
    const tokenUser = req.user;

    if (tokenUser.userId !== user_id) {
      return res.status(403).json({ message: "Unauthorized user" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }

    let calculatedSubtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const { prop_id, quantity, type, rentalDays } = item;
      if (!prop_id || !quantity || !type) {
        return res.status(400).json({ message: "Missing required item fields" });
      }
      if (!["purchase", "rental"].includes(type)) {
        return res.status(400).json({ message: `Invalid type for item ${prop_id}` });
      }
      if (type === "rental" && (!rentalDays || rentalDays <= 0)) {
        return res.status(400).json({ message: `Invalid rentalDays for item ${prop_id}` });
      }

      const prop = await Prop.findById(prop_id);
      if (!prop) {
        return res.status(404).json({ message: `Prop ${prop_id} not found` });
      }

      const price = type === "purchase" ? prop.purchase_price : prop.rental_price * (rentalDays / 7);
      const unitAmount = Math.round(price * 100); // Convert to paisa

      calculatedSubtotal += price * quantity;

      lineItems.push({
        price_data: {
          currency: "npr",
          product_data: {
            name: prop.name,
            metadata: { prop_id, type, rentalDays: rentalDays || 0 },
          },
          unit_amount: unitAmount,
        },
        quantity,
      });
    }

    if (deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: "npr",
          product_data: { name: "Delivery Fee" },
          unit_amount: Math.round(deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    const calculatedTotal = calculatedSubtotal + (deliveryFee || 0);
    if (Math.round(calculatedTotal * 100) / 100 !== Math.round(total_price * 100) / 100) {
      console.log(`Calculated Total: ${calculatedTotal}, Sent Total: ${total_price}`);
      return res.status(400).json({ message: "Total mismatch. Possible tampering detected." });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: 'http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: `http://localhost:5173/cancel`,
      metadata: {
        user_id,
        items: JSON.stringify(items),
        deliveryFee: deliveryFee.toString(),
        total_price: total_price.toString(),
      },
    });

    res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ message: "Checkout session creation failed", error: err.message });
  }
});

router.get("/session/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const tokenUser = req.user;

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata.user_id !== tokenUser.userId) {
      return res.status(403).json({ message: "Unauthorized access to session" });
    }

    res.status(200).json({
      metadata: session.metadata,
      payment_intent: session.payment_intent,
    });
  } catch (err) {
    console.error("Stripe session retrieval error:", err);
    res.status(500).json({ message: "Failed to retrieve session", error: err.message });
  }
});

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      const { user_id, items, deliveryFee, total_price } = session.metadata;
      const parsedItems = JSON.parse(items);

      // Check if order already exists to avoid duplicates
      const existingOrder = await Order.findOne({ paymentIntentId: session.payment_intent });
      if (existingOrder) {
        console.log(`Order already exists for paymentIntentId: ${session.payment_intent}`);
        return res.json({ received: true });
      }

      // Create order
      const orderData = {
        user_id,
        items: parsedItems.map((item) => ({
          prop_id: item.prop_id,
          quantity: item.quantity,
          type: item.type,
          rentalDays: item.rentalDays || 0,
        })),
        deliveryFee: parseFloat(deliveryFee),
        total_price: parseFloat(total_price),
        paymentMethod: "online",
        paymentStatus: "done",
        paymentIntentId: session.payment_intent,
        orderStatus: "pending",
      };

      const order = new Order(orderData);
      await order.save();

      // Clear cart
      await Cart.findOneAndUpdate({ user_id }, { items: [] });

      console.log(`Order created via webhook: ${order._id}`);
      res.json({ received: true });
    } catch (err) {
      console.error("Webhook order creation failed:", err);
      res.status(500).json({ message: "Webhook order creation failed", error: err.message });
    }
  } else {
    res.json({ received: true });
  }
});

module.exports = router;