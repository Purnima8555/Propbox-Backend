const PropRequest = require("../model/propRequest");
const Customer = require("../model/customer");
const Notification = require("../model/notification");

// Submit a new prop request
const submitPropRequest = async (req, res) => {
  const { user_id, prop_name, description, urgency, reason, additional_info } = req.body;

  try {
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!prop_name || prop_name.trim() === "") {
      return res.status(400).json({ message: "Prop name is required" });
    }

    const propRequest = new PropRequest({
      user_id,
      prop_name: prop_name.trim(),
      description: description || "",
      urgency: urgency || "normal",
      reason: reason || "not-in-system",
      additional_info: additional_info || "",
    });

    await propRequest.save();

    const user = await Customer.findById(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userNotification = new Notification({
      userId: user_id,
      message: `Your request for "${prop_name}" has been submitted and is awaiting admin approval.`,
      type: "info",
      relatedId: propRequest._id,
    });

    const admins = await Customer.find({ role: "Admin" });

    const adminNotifications = admins.map((admin) => new Notification({
      userId: admin._id,
      message: `New prop request: "${prop_name}" by ${user.full_name || user.username}.`,
      type: "warning",
      relatedId: propRequest._id,
    }));

    await Promise.all([
      userNotification.save(),
      ...adminNotifications.map((notification) => notification.save()),
    ]);

    res.status(201).json({
      message: "Prop request submitted successfully",
      requestId: propRequest._id.toString(),
      propRequest,
    });
  } catch (error) {
    console.error("Error submitting prop request:", error);
    res.status(500).json({ message: "Error submitting prop request", error: error.message });
  }
};

// Count of pending requests
const getPendingPropRequestCount = async (req, res) => {
  try {
    const count = await PropRequest.countDocuments({ status: "pending" });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error fetching count", error: error.message });
  }
};

// Get all prop requests (Admin)
const getAllPropRequests = async (req, res) => {
  try {
    if (req.user?.role !== "Admin") {
      return res.status(403).json({ message: "Access denied: Admin only" });
    }

    const propRequests = await PropRequest.find()
      .sort({ createdAt: -1 })
      .populate("user_id", "full_name username email");

    res.status(200).json(propRequests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching prop requests", error: error.message });
  }
};

// Update prop request status (Admin)
const updatePropRequest = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    if (req.user?.role !== "Admin") {
      return res.status(403).json({ message: "Access denied: Admin only" });
    }

    if (!status || !["pending", "approved", "rejected", "fulfilled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const propRequest = await PropRequest.findById(id);
    if (!propRequest) {
      return res.status(404).json({ message: "Prop request not found" });
    }

    propRequest.status = status;
    await propRequest.save();

    const user = await Customer.findById(propRequest.user_id);
    if (user) {
      const userNotification = new Notification({
        userId: propRequest.user_id,
        message: `Your request for "${propRequest.prop_name}" has been ${status}.`,
        type: ["approved", "fulfilled"].includes(status) ? "success" : "error",
        relatedId: propRequest._id,
      });

      await userNotification.save();
    }

    res.status(200).json({ message: "Prop request updated", propRequest });
  } catch (error) {
    res.status(500).json({ message: "Error updating prop request", error: error.message });
  }
};

module.exports = {
  submitPropRequest,
  getPendingPropRequestCount,
  getAllPropRequests,
  updatePropRequest,
};
