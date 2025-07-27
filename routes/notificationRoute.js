const express = require("express");
const router = express.Router();
const { getByUserId, patchMarkAsRead, markAllAsRead, getAllForAdmin } = require("../controller/notificationController");
const { authenticateToken } = require("../security/authorization");

router.get("/user/:userId", getByUserId);
router.patch("/:id", authenticateToken, patchMarkAsRead);
router.patch("/mark-all-read", authenticateToken, markAllAsRead);
router.get("/all", authenticateToken, getAllForAdmin);

module.exports = router;