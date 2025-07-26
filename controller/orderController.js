const Order = require("../model/order");
const Cart = require("../model/cart");
const Customer = require("../model/customer");
const Prop = require("../model/prop");
const Notification = require("../model/notification");
const mongoose = require("mongoose");

// Place an order
const placeOrder = async (req, res) => {
  try {
    const { user_id, items, deliveryFee, total_price, paymentMethod, paymentIntentId } = req.body;
    const tokenUser = req.user;

    if (tokenUser.userId !== user_id) {
      return res.status(403).json({ message: "Unauthorized user" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }

    if (!["cod", "online"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    let calculatedSubtotal = 0;
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
      calculatedSubtotal += price * quantity;
    }

    const calculatedTotal = calculatedSubtotal + (deliveryFee || 0);
    if (Math.round(calculatedTotal * 100) / 100 !== Math.round(total_price * 100) / 100) {
      console.log(`Calculated Total: ${calculatedTotal}, Sent Total: ${total_price}`);
      return res.status(400).json({ message: "Total mismatch. Possible tampering detected." });
    }

    const newOrder = new Order({
      user_id,
      items,
      deliveryFee: deliveryFee || 0,
      total_price,
      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "not done" : "done",
      paymentIntentId,
    });

    await newOrder.save();
    console.log("Order saved successfully:", newOrder._id);

    let firstPropName;
    try {
      const prop = await Prop.findById(items[0].prop_id);
      firstPropName = prop ? prop.name : "Unknown Prop";
    } catch (err) {
      console.error("Error fetching prop name for notification:", err);
      firstPropName = "Unknown Prop";
    }

    const userMessage =
      items.length === 1
        ? `Your order for "${firstPropName}" has been placed successfully. We'll notify you once it is shipped.`
        : `Your order for "${firstPropName}" and ${items.length - 1} other prop(s) has been placed successfully. We'll notify you once it is shipped.`;
    const userNotification = new Notification({
      userId: user_id,
      message: userMessage,
      type: "success",
      relatedId: newOrder._id,
      relatedModel: "Order",
    });
    await userNotification.save();
    console.log("User notification saved");

    const adminMessage =
      items.length === 1
        ? `An order for prop "${firstPropName}" has been placed.`
        : `An order for "${firstPropName}" and ${items.length - 1} other prop(s) has been placed.`;
    let adminUsers;
    try {
      adminUsers = await Customer.find({ role: "Admin" });
      if (!adminUsers || adminUsers.length === 0) {
        console.warn("No admin users found");
        adminUsers = [];
      }
    } catch (err) {
      console.error("Error fetching admin users:", err);
      adminUsers = [];
    }

    const adminNotifications = adminUsers.map(admin => new Notification({
      userId: admin._id,
      message: adminMessage,
      type: "warning",
      relatedId: newOrder._id,
      relatedModel: "Order",
    }));
    if (adminNotifications.length > 0) {
      await Notification.insertMany(adminNotifications);
      console.log("Admin notifications saved");
    } else {
      console.log("No admin notifications to save");
    }

    res.status(201).json({
      _id: newOrder._id,
      user_id: newOrder.user_id,
      items: newOrder.items.map(item => ({
        prop_id: item.prop_id,
        quantity: item.quantity,
        type: item.type,
        rentalDays: item.rentalDays,
      })),
      deliveryFee: newOrder.deliveryFee,
      total_price: newOrder.total_price,
      paymentMethod: newOrder.paymentMethod,
      paymentStatus: newOrder.paymentStatus,
      paymentIntentId: newOrder.paymentIntentId,
      status: newOrder.status || "Pending",
      order_date: newOrder.order_date || new Date(),
    });
  } catch (err) {
    console.error("Error in placeOrder:", err);
    res.status(500).json({ message: "Error placing order", error: err.message });
  }
};

// Get All Orders for a User
const getOrdersByUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    const orders = await Order.find({ user_id })
      .populate("items.prop_id", "name purchase_price rental_price")
      .sort({ order_date: -1 });

    res.status(200).json(orders.length > 0 ? orders.map(order => ({
      id: order._id,
      user_id: order.user_id,
      items: order.items,
      deliveryFee: order.deliveryFee,
      total_price: order.total_price,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      order_date: order.order_date,
    })) : []);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Error fetching orders", error: err.message });
  }
};

// Get All Orders (Admin)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user_id", "full_name email")
      .populate("items.prop_id", "name purchase_price rental_price")
      .sort({ order_date: -1 });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }

    const ordersWithDetails = orders.map(order => ({
      id: order._id,
      user: order.user_id,
      items: order.items,
      deliveryFee: order.deliveryFee,
      total_price: order.total_price,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      order_date: order.order_date,
    }));

    res.status(200).json(ordersWithDetails);
  } catch (err) {
    console.error("Error fetching all orders:", err);
    res.status(500).json({ message: "Error fetching all orders", error: err.message });
  }
};

// Update Order Status (and optionally Payment Status)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const validStatuses = ["Pending", "Processing", "Shipped", "Delivered"];
    const validPaymentStatuses = ["done", "not done"];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order updated successfully", order: updatedOrder });
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

// Delete an Order
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedOrder = await Order.findByIdAndDelete(id);

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ message: "Error deleting order", error: err.message });
  }
};

// Get count of purchased and rented items for a user
const getOrderTypeCounts = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const orders = await Order.find({ user_id });

    let purchaseCount = 0;
    let rentCount = 0;

    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.type === "purchase") {
          purchaseCount += item.quantity;
        } else if (item.type === "rental") {
          rentCount += item.quantity;
        }
      });
    });

    res.status(200).json({ purchaseCount, rentCount });
  } catch (err) {
    console.error("Error fetching order type counts:", err);
    res.status(500).json({ message: "Error fetching order type counts", error: err.message });
  }
};

// Get currently rented props with status "Delivered"
const getCurrentlyReading = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const orders = await Order.find({
      user_id,
      status: "Delivered",
      "items.type": "rental"
    }).populate("items.prop_id", "name purchase_price rental_price image");

    let currentlyReading = [];
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.type === "rental") {
          currentlyReading.push({
            prop_id: item.prop_id._id,
            name: item.prop_id.name,
            quantity: item.quantity,
            rental_price: item.prop_id.rental_price,
            image: item.prop_id.image
          });
        }
      });
    });

    const count = currentlyReading.reduce((total, item) => total + item.quantity, 0);

    res.status(200).json({
      count,
      props: currentlyReading
    });
  } catch (err) {
    console.error("Error fetching currently rented props:", err);
    res.status(500).json({ message: "Error fetching currently rented props", error: err.message });
  }
};

// Get order by paymentIntentId
const getOrderByPaymentIntent = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const tokenUser = req.user;

    const order = await Order.findOne({ paymentIntentId });
    if (!order) {
      return res.status(404).json({ order: null });
    }

    // Ensure the requesting user has access to the order
    if (order.user_id.toString() !== tokenUser.userId) {
      return res.status(403).json({ message: "Unauthorized access to order" });
    }

    res.status(200).json({
      order: {
        id: order._id,
        user_id: order.user_id,
        items: order.items,
        deliveryFee: order.deliveryFee,
        total_price: order.total_price,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paymentIntentId: order.paymentIntentId,
        status: order.status,
        order_date: order.order_date,
      },
    });
  } catch (err) {
    console.error("Error fetching order by paymentIntentId:", err);
    res.status(500).json({ message: "Error fetching order", error: err.message });
  }
};

module.exports = {
  placeOrder,
  getOrdersByUser,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  getOrderTypeCounts,
  getCurrentlyReading,
  getOrderByPaymentIntent,
};