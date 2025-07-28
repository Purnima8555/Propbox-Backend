const ActivityLog = require("../model/activityLog");
const Customer = require("../model/customer");

// GET /api/activity-logs
const getActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .sort({ timestamp: -1 })
      .populate("userId", "username email role");

    res.status(200).json(logs);
  } catch (err) {
    console.error("Error fetching activity logs:", err);
    res.status(500).json({ message: "Failed to fetch activity logs", error: err.message });
  }
};

module.exports = { getActivityLogs };
