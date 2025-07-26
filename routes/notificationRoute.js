const express = require("express");
const router = express.Router();
const { getByUserId, patchMarkAsRead, getAllForAdmin } = require("../controller/notificationController");
const { authenticateToken } = require("../security/authorization");

router.get("/user/:userId", getByUserId);
router.patch("/:id", authenticateToken, patchMarkAsRead);
router.get("/all", authenticateToken, getAllForAdmin);

module.exports = router;