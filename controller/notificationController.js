const Notification = require("../model/notification");

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
      return res.status(401).json({ message: "User ID not found in token" });
    }

    console.log("Marking notification as read for userId:", userId, "notificationId:", id);
    const notification = await Notification.findOne({ _id: id, userId });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found or not authorized" });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Error marking notification as read", error: error.message });
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

module.exports = { createNotification, getByUserId, patchMarkAsRead, getAllForAdmin };