// middleware/logActivity.js
const ActivityLog = require("../model/activityLog");

const logActivity = async ({ userId, action, role, details }) => {
  try {
    await ActivityLog.create({
      userId,
      action,
      role,
      details,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Error logging activity:", err.message);
  }
};

module.exports = logActivity;
