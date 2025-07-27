const Notification = require("../model/notification");
const mongoose = require("mongoose");

// Create a notification
const createNotification = async (userId, relatedId, message, type = "info", relatedModel = null) => {
  try {
    const newNotification = new Notification({
      userId,
      relatedId,
      message,
      type,
      relatedModel,
    });
    await newNotification.save();
    console.log("Notification created:", newNotification);
    return newNotification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// Get notifications by user ID
const getByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      console.error("No userId provided in request parameters");
      return res.status(400).json({ message: "User ID is required" });
    }

    // Optional: Verify userId matches token for security
    if (req.user?.userId && req.user.userId !== userId) {
      console.error("User ID in token does not match requested userId");
      return res.status(403).json({ message: "Unauthorized: User ID mismatch" });
    }

    console.log("Fetching notifications for userId:", userId);

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "relatedId",
        select: "prop_name items",
        match: { relatedModel: { $in: ["PropRequest", "Order"] } },
        populate: {
          path: "items.prop_id",
          select: "name",
        },
      });

    console.log("Notifications found:", notifications);

    if (notifications.length === 0) {
      console.log("No notifications found for userId:", userId);
    }

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    res.status(500).json({ message: "Error fetching user notifications", error: error.message });
  }
};

// Mark a notification as read
const patchMarkAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      console.error("No userId in token");
      return res.status(401).json({ message: "User ID not found in token" });
    }

    if (!mongoose.isValidObjectId(userId)) {
      console.error("Invalid userId format:", userId);
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    if (!mongoose.isValidObjectId(id)) {
      console.error("Invalid notificationId format:", id);
      return res.status(400).json({ message: "Invalid notification ID format" });
    }

    console.log("Marking notification as read - userId:", userId, "notificationId:", id);

    const userIdObject = new mongoose.Types.ObjectId(userId);
    const notificationIdObject = new mongoose.Types.ObjectId(id);
    const notification = await Notification.findOne({ _id: notificationIdObject, userId: userIdObject });

    if (!notification) {
      console.error("Notification not found or not authorized for id:", id, "userId:", userId);
      return res.status(404).json({ message: "Notification not found or not authorized" });
    }

    console.log("Found notification:", notification);

    if (notification.read) {
      console.log("Notification already marked as read:", id);
      return res.status(200).json({ message: "Notification already marked as read", notification });
    }

    notification.read = true;
    const savedNotification = await notification.save();
    console.log("Notification saved with read=true:", savedNotification);

    res.status(200).json({ message: "Notification marked as read", notification: savedNotification });
  } catch (error) {
    console.error("Error marking notification as read:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      message: "Error marking notification as read",
      error: error.message,
    });
  }
};

// Mark all notifications as read for a user
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      console.error("No userId in token");
      return res.status(401).json({ message: "User ID not found in token" });
    }

    if (!mongoose.isValidObjectId(userId)) {
      console.error("Invalid userId format:", userId);
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    console.log("Marking all notifications as read for userId:", userId);

    const userIdObject = new mongoose.Types.ObjectId(userId);
    const result = await Notification.updateMany(
      { userId: userIdObject },
      { $set: { read: true } }
    );

    console.log("Notifications updated:", {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });

    res.status(200).json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      message: "Error marking all notifications as read",
      error: error.message,
    });
  }
};

// Get all notifications for admin (only type: "warning")
const getAllForAdmin = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found in token" });
    }

    console.log("Fetching all notifications for admin userId:", userId, "role:", role);
    if (role !== "Admin") {
      return res.status(403).json({ message: "Access denied: Admin only" });
    }

    const notifications = await Notification.find({ type: "warning" })
      .sort({ createdAt: -1 })
      .populate("userId", "full_name username email")
      .populate({
        path: "relatedId",
        select: "prop_name items",
        match: { relatedModel: { $in: ["PropRequest", "Order"] } },
        populate: {
          path: "items.prop_id",
          select: "name",
        },
      });

    console.log("Admin notifications found:", notifications);

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching all notifications for admin:", error);
    res.status(500).json({ message: "Error fetching all notifications", error: error.message });
  }
};

module.exports = { createNotification, getByUserId, patchMarkAsRead, markAllAsRead, getAllForAdmin };