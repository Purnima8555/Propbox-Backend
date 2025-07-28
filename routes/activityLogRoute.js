const express = require("express");
const router = express.Router();
const { getActivityLogs } = require("../controller/activityLogController");
const { authenticateToken, authorizeRole  } = require("../security/authorization");

router.get("/", authenticateToken, authorizeRole("admin"), getActivityLogs);

module.exports = router;
